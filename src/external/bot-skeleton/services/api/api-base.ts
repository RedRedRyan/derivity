import { TExecutionMode, getExecutionConfig, IExecutionConfig } from '@/constants/execution-modes';
import { getAccountId, getAccountType, isDemoAccount, removeUrlParameter } from '@/utils/account-helpers';
/* [/AI] */
import CommonStore from '@/stores/common-store';
import { DerivWSAccountsService } from '@/services/derivws-accounts.service';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import { TAuthData } from '@/types/api-types';
import {
    buildApiTokenAccountDetails,
    canAccessApiTokenBalance,
    canTradeWithApiToken,
    completeApiTokenSession,
    getApiTokenPermissionError,
    getPendingApiToken,
    isApiTokenSession,
    normalizeScopes,
    setApiTokenLoginError,
    storeApiTokenAccountDetails,
} from '@/utils/api-token-permissions';
import { clearAuthData } from '@/utils/auth-utils';
import { handleBackendError, isBackendError } from '@/utils/error-handler';
import { activeSymbolsProcessorService } from '../../../../services/active-symbols-processor.service';
import { observer as globalObserver } from '../../utils/observer';
import { doUntilDone, socket_state } from '../tradeEngine/utils/helpers';
import {
    CONNECTION_STATUS,
    setAccountList,
    setAuthData,
    setConnectionStatus,
    setIsAuthorized,
    setIsAuthorizing,
} from './observables/connection-status-stream';
import ApiHelpers from './api-helpers';
import { generateDerivApiInstance, V2GetActiveAccountId, getToken } from './appId';
import chart_api from './chart-api';

type CurrentSubscription = {
    id: string;
    unsubscribe: () => void;
};

type SubscriptionPromise = Promise<{
    subscription: CurrentSubscription;
}>;

type TApiBaseApi = {
    connection: {
        readyState: keyof typeof socket_state;
        addEventListener: (event: string, callback: () => void) => void;
        removeEventListener: (event: string, callback: () => void) => void;
    };
    send: (data: unknown) => void;
    disconnect: () => void;
    authorize: (token: string) => Promise<{ authorize: TAuthData; error: unknown }>;

    onMessage: () => {
        subscribe: (callback: (message: unknown) => void) => {
            unsubscribe: () => void;
        };
    };
} & ReturnType<typeof generateDerivApiInstance>;

class APIBase {
    api: TApiBaseApi | null = null;
    token: string = '';
    account_id: string = '';
    pip_sizes = {};
    account_info = {};
    is_running = false;
    subscriptions: CurrentSubscription[] = [];
    time_interval: ReturnType<typeof setInterval> | null = null;
    has_active_symbols = false;
    is_stopping = false;
    active_symbols: any[] = [];
    current_auth_subscriptions: SubscriptionPromise[] = [];
    is_authorized = false;
    active_symbols_promise: Promise<any[] | undefined> | null = null;
    common_store: CommonStore | undefined;
    reconnection_attempts: number = 0;
    execution_config: IExecutionConfig = getExecutionConfig('slow');
    execution_mode: TExecutionMode = 'slow';

    // Constants for timeouts - extracted magic numbers for better maintainability
    private readonly ACTIVE_SYMBOLS_TIMEOUT_MS = 10000; // 10 seconds
    private readonly ENRICHMENT_TIMEOUT_MS = 10000; // 10 seconds
    private readonly MAX_RECONNECTION_ATTEMPTS = 5; // Maximum number of reconnection attempts before session reset

    is_initializing = false;

    setExecutionMode(mode: TExecutionMode) {
        this.execution_mode = mode;
        this.execution_config = getExecutionConfig(mode);
    }

    async ensureConnectionReady() {
        const timeout_ms = this.execution_config.connectionTimeout;

        if (!this.api || this.api?.connection?.readyState !== WebSocket.OPEN) {
            await this.init();
        }

        if (!this.api) {
            throw new Error('Trading API is unavailable.');
        }

        if (this.api.connection.readyState !== WebSocket.OPEN) {
            await new Promise<void>((resolve, reject) => {
                let timeout_id: ReturnType<typeof setTimeout> | null = null;

                const cleanup = () => {
                    if (timeout_id) {
                        clearTimeout(timeout_id);
                        timeout_id = null;
                    }
                    this.api?.connection?.removeEventListener('open', handleOpen);
                    this.api?.connection?.removeEventListener('close', handleClose);
                };

                const handleOpen = () => {
                    cleanup();
                    resolve();
                };

                const handleClose = () => {
                    cleanup();
                    reject(new Error('Trading API connection closed before it became ready.'));
                };

                timeout_id = setTimeout(() => {
                    cleanup();
                    reject(new Error('Trading API connection timed out.'));
                }, timeout_ms);

                this.api?.connection?.addEventListener('open', handleOpen);
                this.api?.connection?.addEventListener('close', handleClose);
            });
        }

        if (!this.is_authorized && getAccountId()) {
            const auth_result = await this.authorizeAndSubscribe();
            if ((auth_result as any)?.error) {
                throw new Error((auth_result as any)?.localizedMessage || 'Trading authorization failed.');
            }
        }

        return true;
    }

    unsubscribeAllSubscriptions = () => {
        this.current_auth_subscriptions?.forEach(subscription_promise => {
            subscription_promise.then(({ subscription }) => {
                if (subscription?.id) {
                    this.api?.send({
                        forget: subscription.id,
                    });
                }
            });
        });
        this.current_auth_subscriptions = [];
    };

    onsocketopen() {
        setConnectionStatus(CONNECTION_STATUS.OPENED);

        // Reset reconnection attempts on successful connection
        this.reconnection_attempts = 0;

        const currentClientStore = globalObserver.getState('client.store');
        if (currentClientStore) {
            currentClientStore.setIsAccountRegenerating(false);
        }

        this.handleTokenExchangeIfNeeded();
    }

    private async handleTokenExchangeIfNeeded() {
        console.log('[handleTokenExchangeIfNeeded] 🔌 WebSocket opened - checking for stored accounts/tokens...');

        const urlParams = new URLSearchParams(window.location.search);
        const account_id = urlParams.get('account_id');
        const accountType = urlParams.get('account_type');

        if (account_id) {
            console.log('[handleTokenExchangeIfNeeded] Found account_id in URL:', account_id);
            localStorage.setItem('active_loginid', account_id);
            // Remove account_id from URL after storing
            removeUrlParameter('account_id');
        }
        if (accountType) {
            console.log('[handleTokenExchangeIfNeeded] Found account_type in URL:', accountType);
            localStorage.setItem('account_type', accountType);
            // Remove account_type from URL after storing
            removeUrlParameter('account_type');
        }

        // Check if we have an account_id from URL or localStorage
        let activeAccountId: string | null = getAccountId();
        console.log('[handleTokenExchangeIfNeeded] Active account ID:', activeAccountId);

        // If no account_id in localStorage, check sessionStorage for accounts
        if (!activeAccountId) {
            try {
                const storedAccounts = sessionStorage.getItem('deriv_accounts');
                console.log(
                    '[handleTokenExchangeIfNeeded] Checking sessionStorage for deriv_accounts:',
                    !!storedAccounts
                );
                if (storedAccounts) {
                    const accounts = JSON.parse(storedAccounts);
                    if (accounts && accounts.length > 0 && accounts[0].account_id) {
                        // Use the first account as default
                        const accountId = accounts[0].account_id as string;
                        activeAccountId = accountId;
                        localStorage.setItem('active_loginid', accountId);

                        // Set account type based on account_id prefix
                        const isDemo = isDemoAccount(accountId);
                        localStorage.setItem('account_type', isDemo ? 'demo' : 'real');
                        console.log('[handleTokenExchangeIfNeeded] Set account from sessionStorage:', {
                            accountId,
                            isDemo,
                        });
                    }
                }
            } catch (error) {
                console.error('[handleTokenExchangeIfNeeded] Error reading accounts from sessionStorage:', error);
            }
        }

        // Check for legacy token in localStorage
        const accountsList = localStorage.getItem('accountsList');
        console.log('[handleTokenExchangeIfNeeded] Legacy accountsList present:', !!accountsList);

        // Now proceed with normal authorization if we have an account_id
        if (activeAccountId) {
            console.log('[handleTokenExchangeIfNeeded] ✅ Account ID found - calling authorizeAndSubscribe');
            setIsAuthorizing(true);
            await this.authorizeAndSubscribe();
        } else {
            // No account found — user is logged out, stop the authorizing spinner
            console.warn('[handleTokenExchangeIfNeeded] ❌ No account ID found - user appears to be logged out');
            setIsAuthorizing(false);
        }
    }

    onsocketclose() {
        if (this.is_stopping) return;
        setConnectionStatus(CONNECTION_STATUS.CLOSED);
        this.reconnectIfNotConnected();
    }

    async init(force_create_connection = false) {
        if (this.is_initializing) return;
        this.is_initializing = true;
        this.is_stopping = false;

        try {
            await this._doInit(force_create_connection);
        } finally {
            this.is_initializing = false;
        }
    }

    private async _doInit(force_create_connection = false) {
        this.toggleRunButton(true);

        if (this.api) {
            this.unsubscribeAllSubscriptions();
        }

        // Reset reconnection attempts counter on successful connection initialization
        if (!force_create_connection) {
            this.reconnection_attempts = 0;
        }

        if (!this.api || this.api?.connection.readyState !== 1 || force_create_connection) {
            if (this.api?.connection) {
                ApiHelpers.disposeInstance();
                setConnectionStatus(CONNECTION_STATUS.CLOSED);
                this.api.disconnect();
                this.api.connection.removeEventListener('open', this.onsocketopen.bind(this));
                this.api.connection.removeEventListener('close', this.onsocketclose.bind(this));
            }

            this.api = await generateDerivApiInstance();

            this.api?.connection.addEventListener('open', this.onsocketopen.bind(this));
            this.api?.connection.addEventListener('close', this.onsocketclose.bind(this));

            // Store the current account ID used for this WebSocket connection
            // This will be used to check if we need to regenerate the connection when the tab becomes active
            const currentClientStore = globalObserver.getState('client.store');
            if (currentClientStore) {
                const active_login_id = getAccountId();
                if (active_login_id) {
                    currentClientStore.setWebSocketLoginId(active_login_id);
                }
            }
        }

        const hasAccountID = V2GetActiveAccountId();

        if (!this.has_active_symbols && !hasAccountID) {
            this.active_symbols_promise = this.getActiveSymbols().then(() => undefined);
        }

        this.initEventListeners();

        if (this.time_interval) clearInterval(this.time_interval);
        this.time_interval = null;

        chart_api.init(force_create_connection);
    }

    getConnectionStatus() {
        if (this.api?.connection) {
            const ready_state = this.api.connection.readyState;
            return socket_state[ready_state as keyof typeof socket_state] || 'Unknown';
        }
        return 'Socket not initialized';
    }

    terminate() {
        this.is_stopping = true;
        if (this.api) this.api.disconnect();
    }

    initEventListeners() {
        if (window) {
            window.addEventListener('online', this.reconnectIfNotConnected);
            window.addEventListener('focus', this.reconnectIfNotConnected);
        }
    }

    async createNewInstance(account_id: string) {
        if (this.account_id !== account_id) {
            await this.init();
        }
    }

    reconnectIfNotConnected = () => {
        if (this.is_initializing || this.is_stopping) return;
        if (this.api?.connection?.readyState && this.api?.connection?.readyState > 1) {
            this.reconnection_attempts += 1;

            if (this.reconnection_attempts >= this.MAX_RECONNECTION_ATTEMPTS) {
                // Reset reconnection counter
                this.reconnection_attempts = 0;

                // Properly handle logout through the API
                setIsAuthorized(false);
                setAccountList([]);
                setAuthData(null);

                // Keep stored auth/account data intact. A temporary reconnect failure
                // should not force the user to log in again; explicit logout handles clearing.
            }

            this.init(true);
        }
    };

    private getLegacyAccountList(balance?: any, allBalance?: any): TAuthData['account_list'] {
        const accountsListRaw = localStorage.getItem('accountsList');
        const clientAccountsRaw = localStorage.getItem('clientAccounts');

        if (!accountsListRaw) return [];

        try {
            const accountsList = JSON.parse(accountsListRaw) as Record<string, string>;
            const clientAccounts = clientAccountsRaw
                ? (JSON.parse(clientAccountsRaw) as Record<string, { currency?: string; token?: string }>)
                : {};
            const allBalanceAccounts = allBalance?.accounts || {};

            return Object.keys(accountsList).map(loginid => {
                const accountBalance = allBalanceAccounts[loginid];
                const amount =
                    typeof accountBalance === 'number'
                        ? accountBalance
                        : Number(accountBalance?.balance ?? (loginid === balance?.loginid ? balance?.balance : 0));
                const currency =
                    accountBalance?.currency ||
                    clientAccounts[loginid]?.currency ||
                    (loginid === balance?.loginid ? balance?.currency : 'USD');

                return {
                    balance: Number.isFinite(amount) ? amount : 0,
                    currency,
                    is_virtual: isDemoAccount(loginid) ? 1 : 0,
                    loginid,
                };
            });
        } catch (error) {
            console.error('[authorizeAndSubscribe] Error building legacy account list:', error);
            return [];
        }
    }

    async authorizeAndSubscribe() {
        if (!this.api) return;

        this.account_id = getAccountId() || '';
        setIsAuthorizing(true);

        try {
            // Get the stored token for legacy API authentication
            const { token: storedToken, account_id: accountId } = getToken();

            console.log('[authorizeAndSubscribe] ⚙️ Starting authorization flow:', {
                has_token: !!storedToken,
                token_type: typeof storedToken,
                token_length: storedToken ? storedToken.length : 0,
                token_first_10_chars: storedToken ? storedToken.substring(0, 10) : 'N/A',
                accountId,
                api_ready: !!this.api,
                ws_ready_state: this.api?.connection?.readyState,
            });

            // Authorize with the token first (required for legacy API)
            let authorizeData: TAuthData | undefined;
            if (storedToken) {
                try {
                    console.log('[authorizeAndSubscribe] 🔐 Calling api.authorize() with legacy token...');
                    const authResult = await this.api.authorize(storedToken);

                    console.log('[authorizeAndSubscribe] 📨 api.authorize() raw result:', authResult);

                    const { authorize, error: authError } = authResult as any;

                    console.log('[authorizeAndSubscribe] 📨 api.authorize() parsed response:', {
                        has_authorize: !!authorize,
                        authorize_loginid: authorize?.loginid,
                        authorize_email: authorize?.email,
                        has_error: !!authError,
                        error_code: (authError as any)?.code,
                        error_message: (authError as any)?.message,
                        error_full: authError,
                    });

                    if (authError) {
                        const errorMessage = isBackendError(authError)
                            ? handleBackendError(authError)
                            : (authError as any)?.message || 'Authorization failed';

                        console.error('❌ [authorizeAndSubscribe] Token authorization error:', {
                            message: errorMessage,
                            error_code: (authError as any)?.code,
                            token_was: storedToken ? `Present (${storedToken.length} chars)` : 'MISSING',
                        });
                        setIsAuthorizing(false);
                        return { ...authError, localizedMessage: errorMessage };
                    }
                    authorizeData = authorize as TAuthData;
                    const pendingApiToken = getPendingApiToken();
                    if (pendingApiToken && authorize?.loginid) {
                        const scopes = normalizeScopes(authorize?.scopes || (authorize as any)?.scope);
                        completeApiTokenSession({
                            loginid: authorize.loginid,
                            token: pendingApiToken,
                            currency: authorize.currency,
                            scopes,
                        });
                    }
                    console.log('✅ [authorizeAndSubscribe] Authorization successful!');
                } catch (authException: any) {
                    console.error('❌ [authorizeAndSubscribe] Exception during api.authorize():', {
                        exception_message: authException?.message,
                        exception_type: authException?.constructor?.name,
                        exception_full: authException,
                    });
                    setIsAuthorizing(false);
                    return { error: authException, localizedMessage: 'Authorization exception' };
                }
            } else {
                const hasPkceAuth = !!OAuthTokenExchangeService.getAuthInfo();
                const logPayload = {
                    active_loginid: accountId,
                    accountsList: localStorage.getItem('accountsList') ? 'Present' : 'MISSING',
                    deriv_accounts: DerivWSAccountsService.getStoredAccounts()?.length ? 'Present' : 'MISSING',
                };
                if (hasPkceAuth) {
                    console.info(
                        '[authorizeAndSubscribe] Using authenticated WebSocket session without legacy token',
                        logPayload
                    );
                } else {
                    console.warn('⚠️ [authorizeAndSubscribe] No token available for authorization', logPayload);
                }
            }

            if (isApiTokenSession() && !canAccessApiTokenBalance()) {
                const localizedMessage = getApiTokenPermissionError('read');
                console.error('❌ [authorizeAndSubscribe] API token missing balance scope:', localizedMessage);
                setApiTokenLoginError(localizedMessage);
                setIsAuthorizing(false);
                return { error: { code: 'TokenScopeMissing', message: localizedMessage }, localizedMessage };
            }

            // Now fetch balance after successful authorization
            console.log('[authorizeAndSubscribe] Calling api.balance()...');
            let balance, error, allBalance;
            try {
                const balanceResult = await (this.api as any).balance();
                balance = balanceResult?.balance;
                error = balanceResult?.error;

                console.log('[authorizeAndSubscribe] api.balance() raw result:', balanceResult);

                const hasLegacyAccounts = !!localStorage.getItem('accountsList');
                if (hasLegacyAccounts) {
                    try {
                        const allBalanceResult = await (this.api as any).balance({ account: 'all' });
                        allBalance = allBalanceResult?.balance;
                        console.log(
                            '[authorizeAndSubscribe] api.balance({ account: all }) raw result:',
                            allBalanceResult
                        );
                    } catch (allBalanceError) {
                        console.warn(
                            '[authorizeAndSubscribe] Could not fetch all legacy account balances:',
                            allBalanceError
                        );
                    }
                }
            } catch (balanceException: any) {
                console.error('❌ [authorizeAndSubscribe] Exception during api.balance():', {
                    exception_message: balanceException?.message,
                    exception_type: balanceException?.constructor?.name,
                    exception_full: balanceException,
                });
                setIsAuthorizing(false);
                return { error: balanceException, localizedMessage: 'Balance fetch exception' };
            }

            console.log('[authorizeAndSubscribe] api.balance() returned:', {
                has_balance: !!balance,
                balance_loginid: balance?.loginid,
                balance_amount: balance?.balance,
                has_error: !!error,
                error_message: (error as any)?.message,
            });

            if (error) {
                const errorMessage = isBackendError(error)
                    ? handleBackendError(error)
                    : error.message || 'Authorization failed';

                // Authorization error
                console.error('❌ Balance fetch error:', errorMessage);

                setIsAuthorizing(false);
                return { ...error, localizedMessage: errorMessage };
            }
            console.log('✅ Balance fetched successfully');

            this.account_info = {
                balance: balance?.balance,
                currency: balance?.currency,
                loginid: balance?.loginid,
            };
            this.token = balance?.loginid;

            const account_type = getAccountType(balance?.loginid);
            const apiTokenAccountDetails =
                isApiTokenSession() && balance?.loginid
                    ? buildApiTokenAccountDetails({
                          loginid: balance.loginid,
                          balance: Number(balance.balance ?? 0),
                          currency: balance.currency || 'USD',
                          status: (authorizeData as any)?.status || (authorizeData as any)?.account_status,
                      })
                    : null;
            if (apiTokenAccountDetails) {
                storeApiTokenAccountDetails(apiTokenAccountDetails);
            }
            const currentAccount = balance?.loginid
                ? {
                      balance: balance.balance,
                      currency: balance.currency || 'USD',
                      is_virtual: account_type === 'real' ? 0 : 1,
                      loginid: balance.loginid,
                      account_type: account_type === 'real' ? 'real' : 'demo',
                      status: apiTokenAccountDetails?.status || 'active',
                  }
                : null;

            // Build full account list from sessionStorage (PKCE flow) or localStorage (legacy flow).
            // Legacy OAuth redirects provide all login IDs/tokens in `accountsList` and `clientAccounts`,
            // so use those to keep the dropdown populated with every available real/demo account.
            const storedAccounts = DerivWSAccountsService.getStoredAccounts();
            const legacyAccountList = this.getLegacyAccountList(balance, allBalance);
            const accountList =
                legacyAccountList.length > 0
                    ? legacyAccountList
                    : storedAccounts && storedAccounts.length > 0
                      ? storedAccounts
                            .filter(a => !a.status || a.status === 'active')
                            .map(a => ({
                                balance: parseFloat(a.balance) || 0,
                                currency: a.currency || 'USD',
                                is_virtual: a.account_type === 'demo' ? 1 : 0,
                                loginid: a.account_id,
                            }))
                      : currentAccount
                        ? [currentAccount]
                        : [];

            setAccountList(accountList); // Observable stream
            setAuthData({
                balance: balance?.balance,
                currency: balance?.currency,
                loginid: balance?.loginid,
                is_virtual: account_type === 'real' ? 0 : 1,
                account_list: accountList,
                scopes: normalizeScopes(authorizeData?.scopes || (authorizeData as any)?.scope),
                token: storedToken,
            });

            // // Set account_type in localStorage based on loginid prefix using centralized utility
            const loginid = balance?.loginid || '';
            const isDemo = isDemoAccount(loginid);

            if (isDemo) {
                localStorage.setItem('account_type', 'demo');
            } else {
                localStorage.setItem('account_type', 'real');
            }

            globalObserver.emit('api.authorize', {
                account_list: accountList,
                current_account: {
                    loginid: balance?.loginid,
                    currency: balance?.currency || 'USD',
                    is_virtual: account_type === 'real' ? 0 : 1,
                    balance: typeof balance?.balance === 'number' ? balance.balance : undefined,
                },
            });

            // Update the WebSocket login ID in the client store
            const currentClientStore = globalObserver.getState('client.store');
            if (currentClientStore && balance?.loginid) {
                currentClientStore.setWebSocketLoginId(balance.loginid);
            }

            setIsAuthorized(true);
            this.is_authorized = true;
            localStorage.setItem('client_account_details', JSON.stringify(accountList));
            localStorage.setItem('client.country', balance?.country);

            if (balance?.loginid) {
                localStorage.setItem('active_loginid', balance.loginid);
            }

            console.log('🎉 [authorizeAndSubscribe] ✅ FULLY AUTHORIZED:', {
                loginid: balance?.loginid,
                currency: balance?.currency,
                balance: balance?.balance,
                setIsAuthorized_called: true,
            });

            if (this.has_active_symbols) {
                this.toggleRunButton(false);
            } else {
                this.active_symbols_promise = this.getActiveSymbols();
            }
            this.subscribe();
            return (
                apiTokenAccountDetails || {
                    account_id: balance?.loginid,
                    balance: balance?.balance,
                    currency: balance?.currency,
                    account_type: account_type === 'real' ? 'real' : 'demo',
                    status: 'active',
                }
            );
        } catch (e) {
            console.error('❌ [authorizeAndSubscribe] Exception:', e);
            this.is_authorized = false;
            clearAuthData();
            setIsAuthorized(false);
            globalObserver.emit('Error', e);
        } finally {
            setIsAuthorizing(false);
        }
    }

    async subscribe() {
        const subscribeToStream = (streamName: string) => {
            return doUntilDone(
                () => {
                    const subscription = this.api?.send({
                        [streamName]: 1,
                        subscribe: 1,
                    });

                    if (subscription) {
                        this.current_auth_subscriptions.push(subscription);
                    }
                    return subscription;
                },
                [],
                this
            );
        };

        const streamsToSubscribe = [
            ...(canAccessApiTokenBalance() ? ['balance'] : []),
            ...(canTradeWithApiToken() ? ['transaction', 'proposal_open_contract'] : []),
        ];

        await Promise.all(streamsToSubscribe.map(subscribeToStream));
    }

    getActiveSymbols = async () => {
        if (!this.api) {
            throw new Error('API connection not available for fetching active symbols');
        }

        try {
            // Add timeout to prevent hanging
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Active symbols fetch timeout')), this.ACTIVE_SYMBOLS_TIMEOUT_MS)
            );

            const activeSymbolsPromise = doUntilDone(() => this.api?.send({ active_symbols: 'brief' }), [], this);

            const apiResult = await Promise.race([activeSymbolsPromise, timeout]);

            const { active_symbols = [], error = {} } = apiResult as any;

            if (error && Object.keys(error).length > 0) {
                throw new Error(`Active symbols API error: ${error.message || 'Unknown error'}`);
            }

            if (!active_symbols.length) {
                throw new Error('No active symbols received from API');
            }

            this.has_active_symbols = true;

            // Process active symbols using the dedicated service with fallback
            try {
                const enrichmentTimeout = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Enrichment timeout')), this.ENRICHMENT_TIMEOUT_MS)
                );

                const enrichmentPromise = activeSymbolsProcessorService.processActiveSymbols(active_symbols);
                const processedResult = await Promise.race([enrichmentPromise, enrichmentTimeout]);

                this.active_symbols = processedResult.enrichedSymbols;
                this.pip_sizes = processedResult.pipSizes;
            } catch (enrichmentError) {
                console.warn('Symbol enrichment failed, using raw symbols:', enrichmentError);
                // Fallback to raw symbols if enrichment fails
                this.active_symbols = active_symbols;
                this.pip_sizes = {};
            }

            this.toggleRunButton(false);
            return this.active_symbols;
        } catch (error) {
            console.warn('Failed to fetch and process active symbols. Falling back to cached symbols:', error);
            return this.active_symbols ?? [];
        }
    };

    toggleRunButton = (toggle: boolean) => {
        const run_button = document.querySelector('#db-animation__run-button');
        if (!run_button) return;
        (run_button as HTMLButtonElement).disabled = toggle;
    };

    setIsRunning(toggle = false) {
        this.is_running = toggle;
    }

    pushSubscription(subscription: CurrentSubscription) {
        this.subscriptions.push(subscription);
    }

    clearSubscriptions() {
        this.subscriptions.forEach(s => s.unsubscribe());
        this.subscriptions = [];

        // Resetting timeout resolvers
        const global_timeouts = globalObserver.getState('global_timeouts') ?? [];

        global_timeouts.forEach((_: unknown, i: number) => {
            clearTimeout(i);
        });
    }
}

export const api_base = new APIBase();
