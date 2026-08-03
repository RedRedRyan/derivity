import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { ToastContainer } from 'react-toastify';
import AuthLoadingWrapper from '@/components/auth-loading-wrapper';
import useLiveChat from '@/components/chat/useLiveChat';
import ChunkLoader from '@/components/loader/chunk-loader';
import { getUrlBase } from '@/components/shared';
import TransactionDetailsModal from '@/components/transaction-details';
import { api_base, ApiHelpers, ServerTime } from '@/external/bot-skeleton';
import { CONNECTION_STATUS } from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import { useApiBase } from '@/hooks/useApiBase';
import useDevMode from '@/hooks/useDevMode';
import { useStore } from '@/hooks/useStore';
import useThemeSwitcher from '@/hooks/useThemeSwitcher';
import { ThemeProvider } from '@deriv-com/quill-ui';
import { setSmartChartsPublicPath } from '@deriv-com/smartcharts-champion';
import { localize } from '@deriv-com/translations';
import Audio from '../components/audio';
import BlocklyLoading from '../components/blockly-loading';
import BotStopped from '../components/bot-stopped';
import BotBuilder from '../pages/bot-builder';
import Main from '../pages/main';
import './app.scss';
import 'react-toastify/dist/ReactToastify.css';
import '../components/bot-notification/bot-notification.scss';

const AppContent = observer(() => {
    const [is_api_initialized, setIsApiInitialized] = React.useState(false);
    const initialization_fallback_timer = React.useRef(null);

    const store = useStore();
    const { app, transactions, common, client } = store;
    const { is_dark_mode_on } = useThemeSwitcher();

    const { recovered_transactions, recoverPendingContracts } = transactions;
    const is_subscribed_to_msg_listener = React.useRef(false);
    const msg_listener = React.useRef(null);
    const symbols_loaded = React.useRef(false);
    const { connectionStatus } = useApiBase();

    // Initialize dev mode keyboard shortcuts
    useDevMode();

    const livechat_client_information = {
        is_client_store_initialized: client?.is_logged_in ? true : !!client,
        is_logged_in: client?.is_logged_in,
        loginid: client?.loginid,
        currency: client?.currency,
        residence: client?.residence,
        email: '',
        first_name: '',
        last_name: '',
    };

    useLiveChat(livechat_client_information);

    useEffect(() => {
        if (connectionStatus === CONNECTION_STATUS.OPENED) {
            setIsApiInitialized(true);
            common.setSocketOpened(true);
            if (initialization_fallback_timer.current) {
                clearTimeout(initialization_fallback_timer.current);
                initialization_fallback_timer.current = null;
            }
        } else if (connectionStatus !== CONNECTION_STATUS.OPENED) {
            common.setSocketOpened(false);
        }
    }, [common, connectionStatus]);

    useEffect(() => {
        if (!connectionStatus || connectionStatus === CONNECTION_STATUS.UNKNOWN) {
            setIsApiInitialized(true);
        }
    }, [connectionStatus]);

    useEffect(() => {
        if (is_api_initialized || connectionStatus === CONNECTION_STATUS.OPENED) {
            return undefined;
        }

        // Avoid trapping the entire app behind the auth loader when the WebSocket
        // stays in "unknown" or transitions to "closed" during local development.
        initialization_fallback_timer.current = setTimeout(() => {
            setIsApiInitialized(true);
        }, 3000);

        return () => {
            if (initialization_fallback_timer.current) {
                clearTimeout(initialization_fallback_timer.current);
                initialization_fallback_timer.current = null;
            }
        };
    }, [connectionStatus, is_api_initialized]);

    const { current_language } = common;
    const html = document.documentElement;
    React.useEffect(() => {
        html?.setAttribute('lang', current_language.toLowerCase());
        html?.setAttribute('dir', current_language.toLowerCase() === 'ar' ? 'rtl' : 'ltr');
    }, [current_language, html]);

    const handleMessage = React.useCallback(
        ({ data }) => {
            if (data?.msg_type === 'proposal_open_contract' && !data?.error) {
                const { proposal_open_contract } = data;
                if (
                    proposal_open_contract?.status !== 'open' &&
                    !recovered_transactions?.includes(proposal_open_contract?.contract_id)
                ) {
                    recoverPendingContracts(proposal_open_contract);
                }
            }
        },
        [recovered_transactions, recoverPendingContracts]
    );

    React.useEffect(() => {
        setSmartChartsPublicPath(getUrlBase('/js/smartcharts/'));
    }, []);

    React.useEffect(() => {
        if (!is_subscribed_to_msg_listener.current && client.is_logged_in && is_api_initialized && api_base?.api) {
            is_subscribed_to_msg_listener.current = true;
            msg_listener.current = api_base.api.onMessage()?.subscribe(handleMessage);
        }
        return () => {
            if (is_subscribed_to_msg_listener.current && msg_listener.current) {
                is_subscribed_to_msg_listener.current = false;
                msg_listener.current.unsubscribe?.();
            }
        };
    }, [is_api_initialized, client.is_logged_in, client.loginid, handleMessage, connectionStatus]);

    React.useEffect(() => {
        if (!is_api_initialized) return undefined;

        // Initialize core services
        ServerTime.init(common);
        app.setDBotEngineStores();
        ApiHelpers.setInstance(app.api_helpers_store);
        import('@/utils/gtm').then(({ default: GTM }) => {
            GTM.init(store);
        });

        // Load active symbols in the background — does not block UI
        if (!symbols_loaded.current) {
            symbols_loaded.current = true;
            const waitForHelpers = setInterval(() => {
                if (ApiHelpers?.instance?.active_symbols) {
                    clearInterval(waitForHelpers);
                    // eslint-disable-next-line no-console
                    console.log('[AppContent] Loading active symbols in background...');
                    ApiHelpers.instance.active_symbols
                        .retrieveActiveSymbols(true)
                        .then(() => {
                            // eslint-disable-next-line no-console
                            console.log('[AppContent] Active symbols loaded successfully');
                        })
                        .catch(err => {
                            // eslint-disable-next-line no-console
                            console.warn('[AppContent] Active symbols fetch error (non-blocking):', err?.message);
                        });
                }
            }, 100);
            // Give up after 15s
            setTimeout(() => clearInterval(waitForHelpers), 15000);
        }

        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [is_api_initialized]);

    if (common?.error) return null;

    if (!is_api_initialized && connectionStatus) {
        return <ChunkLoader message={localize('Initializing Deriv Bot account...')} />;
    }

    return (
        <AuthLoadingWrapper>
            <ThemeProvider theme={is_dark_mode_on ? 'dark' : 'light'}>
                <BlocklyLoading />
                <div className='bot-dashboard bot' data-testid='dt_bot_dashboard'>
                    <Audio />
                    <Main />
                    <BotBuilder />
                    <BotStopped />
                    <TransactionDetailsModal />
                    <ToastContainer limit={3} draggable={false} />
                </div>
            </ThemeProvider>
        </AuthLoadingWrapper>
    );
});

export default AppContent;
