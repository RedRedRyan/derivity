import { getSocketURL } from '@/components/shared';
import { assertApiTokenScope, getPendingApiToken, isApiTokenSession } from '@/utils/api-token-permissions';
import DerivAPIBasic from '@deriv/deriv-api/dist/DerivAPIBasic';
import APIMiddleware from './api-middleware';
import { setRequestWebSocketURL } from './legacy-request';

/**
 * Singleton instance management for DerivAPI
 */
let derivApiInstance = null;
let derivApiPromise = null;
let currentWebSocketURL = null;

/**
 * Clears the singleton instance (useful for logout or forced reconnection)
 */
export const clearDerivApiInstance = () => {
    if (derivApiInstance?.connection) {
        try {
            derivApiInstance.connection.close();
        } catch (error) {
            console.error('[DerivAPI] Error closing WebSocket:', error);
        }
    }
    derivApiInstance = null;
    derivApiPromise = null;
    currentWebSocketURL = null;
    setRequestWebSocketURL(null);
};

/**
 * Generates a Deriv API instance with WebSocket connection using singleton pattern
 * Prevents multiple WebSocket connections by reusing existing instance
 * Now supports async WebSocket URL fetching with authenticated flow
 * @param {boolean} forceNew - Force creation of new instance (default: false)
 * @returns Promise with DerivAPIBasic instance
 */
export const generateDerivApiInstance = async (forceNew = false) => {
    // If forcing new instance, clear existing one
    if (forceNew) {
        console.log('[DerivAPI] Forcing new instance creation');
        clearDerivApiInstance();
    }

    // If there's already an instance, check its state
    if (derivApiInstance) {
        const readyState = derivApiInstance.connection?.readyState;
        // Return existing instance if it's connecting or open
        if (readyState === WebSocket.CONNECTING || readyState === WebSocket.OPEN) {
            console.log('[DerivAPI] Reusing existing instance (state:', readyState, ')');
            return derivApiInstance;
        } else {
            // Connection is closed or closing, clear it
            console.log('[DerivAPI] Existing instance not usable (state:', readyState, '), creating new');
            clearDerivApiInstance();
        }
    }

    // If there's already a creation in progress, return that promise
    if (derivApiPromise) {
        console.log('[DerivAPI] Reusing existing creation promise');
        return derivApiPromise;
    }

    // Create new instance
    derivApiPromise = (async () => {
        try {
            // Await the async getSocketURL() function
            const wsURL = await getSocketURL();

            // Check if URL changed (account switch scenario)
            if (currentWebSocketURL && currentWebSocketURL !== wsURL) {
                console.log('[DerivAPI] WebSocket URL changed, clearing old instance');
                clearDerivApiInstance();
            }

            currentWebSocketURL = wsURL;
            setRequestWebSocketURL(wsURL);

            console.log('[DerivAPI] Creating new WebSocket connection to:', wsURL);
            const deriv_socket = new WebSocket(wsURL);
            const deriv_api = new DerivAPIBasic({
                connection: deriv_socket,
                middleware: new APIMiddleware({}),
            });

            const rawSend = deriv_api.send.bind(deriv_api);
            deriv_api.send = request => {
                if (isApiTokenSession() && request && typeof request === 'object') {
                    if ('balance' in request) assertApiTokenScope('read');
                    if ('buy' in request || 'sell' in request || 'proposal' in request) {
                        // Keep strict local checks for trade-mutating requests, but let
                        // contract-monitoring reads reach the API. Some accounts can buy
                        // successfully yet report incomplete/legacy scopes for follow-up
                        // reads like proposal_open_contract or transaction.
                        assertApiTokenScope('trade');
                    }
                }
                return rawSend(request);
            };

            // Store the instance immediately (don't wait for connection)
            derivApiInstance = deriv_api;

            // Set up close handler to clear instance
            deriv_socket.addEventListener('close', () => {
                console.log('[DerivAPI] WebSocket connection closed');
                if (derivApiInstance === deriv_api) {
                    derivApiInstance = null;
                    currentWebSocketURL = null;
                    setRequestWebSocketURL(null);
                }
            });

            // Log when connection opens
            deriv_socket.addEventListener('open', () => {
                console.log('[DerivAPI] WebSocket connection established');
            });

            deriv_socket.addEventListener('error', error => {
                console.error('[DerivAPI] WebSocket connection error:', error);
            });

            return deriv_api;
        } catch (error) {
            console.error('[DerivAPI] Error creating instance:', error);
            derivApiPromise = null;
            derivApiInstance = null;
            throw error;
        } finally {
            // Clear the promise after a short delay to allow reuse during concurrent calls
            setTimeout(() => {
                derivApiPromise = null;
            }, 100);
        }
    })();

    return derivApiPromise;
};

export const getLoginId = () => {
    const login_id = localStorage.getItem('active_loginid');
    if (login_id && login_id !== 'null') return login_id;
    return null;
};

export const V2GetActiveAccountId = () => {
    const account_id = localStorage.getItem('active_loginid');
    if (account_id && account_id !== 'null') return account_id;
    return null;
};

export const getToken = () => {
    const active_loginid = getLoginId();
    const pending_api_token = getPendingApiToken();

    if (pending_api_token && !active_loginid) {
        return {
            token: pending_api_token,
            account_id: undefined,
        };
    }

    const accountsList_raw = localStorage.getItem('accountsList');
    let client_accounts;

    try {
        client_accounts = accountsList_raw ? JSON.parse(accountsList_raw) : undefined;
    } catch (e) {
        console.error('[getToken] Failed to parse accountsList:', e);
        client_accounts = undefined;
    }

    const active_account = (client_accounts && client_accounts[active_loginid]) || undefined;

    console.log('[getToken] Debug info:', {
        active_loginid,
        accountsList_raw: accountsList_raw ? 'Present' : 'MISSING',
        client_accounts_keys: client_accounts ? Object.keys(client_accounts) : 'N/A',
        active_account_type: typeof active_account,
        active_account_value: active_account ? 'Present' : 'MISSING',
        has_token: !!active_account,
    });

    return {
        token: active_account ?? undefined,
        account_id: active_loginid ?? undefined,
    };
};
