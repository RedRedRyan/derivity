import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useLocation, useNavigate } from 'react-router-dom';
import RiskDisclaimerFloating from '@/components/risk-disclaimer-floating';
import { generateOAuthURL, getDomainRedirectUrl, isDomainFeatureEnabled } from '@/components/shared';
import DesktopWrapper from '@/components/shared_ui/desktop-wrapper';
import Dialog from '@/components/shared_ui/dialog';
import {
    LabelPairedChartLineCaptionRegularIcon,
    LabelPairedChartMixedCaptionRegularIcon,
    LabelPairedChartTrendUpCaptionRegularIcon,
    LabelPairedCircleStarCaptionRegularIcon,
    LabelPairedLightbulbCaptionRegularIcon,
    LabelPairedObjectsColumnCaptionRegularIcon,
    LabelPairedPlaceholderCaptionRegularIcon,
    LabelPairedPuzzlePieceTwoCaptionBoldIcon,
    LabelPairedSearchCaptionRegularIcon,
} from '@/components/shared_ui/figma-icons/LabelPaired';
import MobileWrapper from '@/components/shared_ui/mobile-wrapper';
import Tabs from '@/components/shared_ui/tabs/tabs';
import TradeTypeConfirmationModal from '@/components/trade-type-confirmation-modal';
import { DBOT_TABS, TAB_IDS } from '@/constants/bot-contents';
import { api_base, updateWorkspaceName } from '@/external/bot-skeleton';
import { CONNECTION_STATUS } from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import { isDbotRTL } from '@/external/bot-skeleton/utils/workspace';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import {
    disableUrlParameterApplication,
    enableUrlParameterApplication,
    setupTradeTypeChangeListener,
} from '@/utils/blockly-url-param-handler';
import { recordDiagnosticEvent } from '@/utils/diagnostics';
import {
    checkAndShowTradeTypeModal,
    getModalState,
    handleTradeTypeCancel,
    handleTradeTypeConfirm,
    resetUrlParamProcessing,
    setModalStateChangeCallback,
} from '@/utils/trade-type-modal-handler';
import { Localize, localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import RunPanel from '../../components/run-panel';
import Accumilatoirs from '../accumilatoirs';
import Analysistool from '../analysistool';
import AutoTrades from '../auto-trades/auto-trades';
import BestBots from '../best-bots';
import BotIdeas from '../bot-ideas';
import ChartModal from '../chart/chart-modal';
import ChartWrapper from '../chart/chart-wrapper';
import Dashboard from '../dashboard';
import RunStrategy from '../dashboard/run-strategy';
import ManualTrading from '../manual-trading';
import Scanner from '../scanner';
import TradingView from '../tradingview';
import UpAndDown from '../up-and-down';
import { Search, Lightbulb, Star, TrendingUp, LayoutGrid, Puzzle, LineChart, BarChart3, Bot } from 'lucide-react';
import './main.scss';

const AppWrapper = observer(() => {
    const isRiskManagersDomain =
        window.location.hostname === 'riskmanagers.site' || window.location.hostname === 'www.riskmanagers.site';
    const { connectionStatus } = useApiBase();
    const { dashboard, load_modal, run_panel, quick_strategy, summary_card, blockly_store } = useStore();
    const { is_loading } = blockly_store;
    const {
        active_tab,
        active_tour,
        active_trading_module,
        cancelPendingTradingNavigation,
        confirmPendingTradingNavigation,
        is_leave_trading_dialog_open,
        navigation_stop_in_progress,
        setActiveTab,
        setWebSocketState,
        setActiveTour,
        setTourDialogVisibility,
    } = dashboard;
    const { dashboard_strategies } = load_modal;
    const {
        is_dialog_open,
        is_drawer_open,
        dialog_options,
        onCancelButtonClick,
        onCloseDialog,
        onOkButtonClick,
        stopBot,
    } = run_panel;
    const { is_open } = quick_strategy;
    const { cancel_button_text, ok_button_text, title, message, dismissable, is_closed_on_cancel } = dialog_options as {
        [key: string]: string;
    };
    const { clear } = summary_card;
    const {
        BOT_BUILDER,
        BOT_IDEAS,
        DASHBOARD,
        AUTO_TRADES,
        MANUAL_TRADING,
        SCANNER,
        CHART,
        TRADING_VIEW,
        UP_AND_DOWN,
    } = DBOT_TABS;
    const init_render = React.useRef(true);
    const hash = [
        'bot_ideas',
        'best_bots',
        'up_and_down',
        'dashboard',
        'bot_builder',
        'auto_trades',
        'manual_trading',
        'scanner',
        'accumilatoirs',
        'analysistool',
        'chart',
        'tradingview',
    ];
    const show_bot_ideas = isDomainFeatureEnabled('botIdeas');
    const show_auto_trades = isDomainFeatureEnabled('autoTrades');
    const show_manual_trading = isDomainFeatureEnabled('manualTrading');
    const show_scanner = isDomainFeatureEnabled('scanner');
    const show_accumilatoirs = isDomainFeatureEnabled('accumilatoirs');
    const show_chart = isDomainFeatureEnabled('chart');
    const show_trading_view = isDomainFeatureEnabled('tradingView');
    const isMainTabVisible = (tab_index: number) => {
        if (tab_index === BOT_IDEAS) return show_bot_ideas;
        if (tab_index === AUTO_TRADES) return show_auto_trades;
        if (tab_index === MANUAL_TRADING) return show_manual_trading;
        if (tab_index === SCANNER) return show_scanner;
        if (tab_index === DBOT_TABS.ACCUMILATOIRS) return show_accumilatoirs;
        if (tab_index === CHART) return show_chart;
        if (tab_index === TRADING_VIEW) return show_trading_view;
        return true;
    };
    const { isDesktop } = useDevice();
    const location = useLocation();
    const navigate = useNavigate();
    const [left_tab_shadow, setLeftTabShadow] = useState<boolean>(false);
    const [right_tab_shadow, setRightTabShadow] = useState<boolean>(false);

    React.useEffect(() => {
        const redirect_url = getDomainRedirectUrl();
        if (redirect_url) {
            window.location.replace(redirect_url);
        }
    }, []);

    // Trade type modal state
    const [tradeTypeModalState, setTradeTypeModalState] = useState(getModalState());

    /**
     * Helper function to get modal props with enhanced type safety and clear documentation
     *
     * Props serve distinct purposes:
     * - current_trade_type: Technical identifier for API/internal use (format: "category/type")
     * - current_trade_type_display_name: Human-readable name for UI display
     *
     * This separation ensures proper data flow between technical systems and user interface
     */
    const getTradeTypeModalProps = () => {
        const { tradeTypeData } = tradeTypeModalState;

        return {
            is_visible: tradeTypeModalState.isVisible,
            trade_type_display_name: tradeTypeData?.displayName || '',

            // Technical identifier for internal/API use (e.g., "callput/callput")
            // Used by backend systems and technical integrations
            current_trade_type: tradeTypeData?.currentTradeType
                ? `${tradeTypeData.currentTradeType.tradeTypeCategory}/${tradeTypeData.currentTradeType.tradeType}`
                : 'N/A',

            // Human-readable display name for UI (e.g., "Rise/Fall")
            // Used for user-facing text and modal content
            current_trade_type_display_name: tradeTypeData?.currentTradeTypeDisplayName || 'N/A',

            onConfirm: handleTradeTypeConfirm,
            onCancel: handleTradeTypeCancel,
        };
    };

    let tab_value: number | string = active_tab;
    const getDefaultLandingTab = () => {
        return DBOT_TABS.BEST_BOTS;
    };
    const GetHashedValue = (tab: number) => {
        tab_value = location.hash?.split('#')[1];
        if (!tab_value) return tab === MANUAL_TRADING && isMainTabVisible(tab) ? tab : getDefaultLandingTab();
        const hash_tab_index = Number(hash.indexOf(String(tab_value)));
        return hash_tab_index >= 0 && isMainTabVisible(hash_tab_index) ? hash_tab_index : getDefaultLandingTab();
    };
    const active_hash_tab = GetHashedValue(active_tab);
    const should_show_run_panel = active_tab !== UP_AND_DOWN;

    // Set up modal state change listener
    React.useEffect(() => {
        setModalStateChangeCallback(new_state => {
            setTradeTypeModalState(new_state);
        });
    }, [is_loading]);

    // Reset URL parameter processing when location changes
    React.useEffect(() => {
        resetUrlParamProcessing();
    }, [location.search]);

    React.useEffect(() => {
        const first_visible_tab_id = show_bot_ideas ? 'id-bot-ideas' : 'id-best-bots';
        const el_dashboard = document.getElementById(first_visible_tab_id);
        const last_visible_tab_id = show_trading_view ? 'id-tradingview' : 'id-analysistool';
        const el_last_tab = document.getElementById(last_visible_tab_id);

        const observer_dashboard = new window.IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setLeftTabShadow(false);
                    return;
                }
                setLeftTabShadow(true);
            },
            {
                root: null,
                threshold: 0.5, // set offset 0.1 means trigger if atleast 10% of element in viewport
            }
        );

        const observer_last_tab = new window.IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setRightTabShadow(false);
                    return;
                }
                setRightTabShadow(true);
            },
            {
                root: null,
                threshold: 0.5, // set offset 0.1 means trigger if atleast 10% of element in viewport
            }
        );
        if (el_dashboard) observer_dashboard.observe(el_dashboard);
        if (el_last_tab) observer_last_tab.observe(el_last_tab);

        return () => {
            observer_dashboard.disconnect();
            observer_last_tab.disconnect();
        };
    }, [show_bot_ideas, show_trading_view]);

    React.useEffect(() => {
        const is_recoverable_trading_module = active_trading_module === 'auto_trades';

        if (connectionStatus === CONNECTION_STATUS.OPENED) {
            setWebSocketState(true);
            if (is_recoverable_trading_module) {
                run_panel.setShowBotStopMessage?.(false);
                recordDiagnosticEvent('dashboard.trading_connection_recovered', {
                    activeModule: active_trading_module,
                    activeTab: active_tab,
                });
            }
            return;
        }

        if (is_recoverable_trading_module) {
            run_panel.setShowBotStopMessage?.(false);
            setWebSocketState(true);
            recordDiagnosticEvent('dashboard.trading_connection_recovering', {
                activeModule: active_trading_module,
                activeTab: active_tab,
                connectionStatus,
            });
            return;
        }

        if (connectionStatus !== CONNECTION_STATUS.OPENED) {
            const is_bot_running = document.getElementById('db-animation__stop-button') !== null;
            if (!is_bot_running) return;

            clear();
            stopBot();
            api_base.setIsRunning(false);
            setWebSocketState(false);
        }
    }, [active_tab, active_trading_module, clear, connectionStatus, run_panel, setWebSocketState, stopBot]);

    // Update tab shadows height to match bot builder height
    const updateTabShadowsHeight = () => {
        const botBuilderEl = document.getElementById('id-bot-builder');
        const leftShadow = document.querySelector('.tabs-shadow--left') as HTMLElement;
        const rightShadow = document.querySelector('.tabs-shadow--right') as HTMLElement;

        if (botBuilderEl && leftShadow && rightShadow) {
            const height = botBuilderEl.offsetHeight;
            leftShadow.style.height = `${height}px`;
            rightShadow.style.height = `${height}px`;
        }
    };

    React.useEffect(() => {
        let pollTimeoutId: ReturnType<typeof setTimeout> | null = null;

        // Handle URL trade type parameters when switching to Bot Builder tab
        if (active_tab === BOT_BUILDER) {
            // Use requestAnimationFrame to ensure Blockly workspace is fully initialized
            requestAnimationFrame(() => {
                // Disable automatic URL parameter application to prevent changes before modal
                disableUrlParameterApplication();

                // Set up listener for manual trade type changes (only once)
                setupTradeTypeChangeListener();

                // Create unified handler for both immediate and delayed execution
                const handleTradeTypeModal = () => {
                    checkAndShowTradeTypeModal(
                        // onConfirm: Changes are now handled by the modal component
                        () => {
                            // Re-enable URL parameter application for future parameters
                            enableUrlParameterApplication();
                        },
                        // onCancel: URL parameter removal is now handled by the modal component
                        () => {}
                    );
                };

                // Wait for Blockly to finish loading before checking for URL parameters
                if (!blockly_store.is_loading) {
                    // Blockly is loaded, but add longer delay to ensure workspace is fully initialized
                    // and trade type fields are populated
                    setTimeout(() => {
                        handleTradeTypeModal();
                    }, 500);
                } else {
                    // Blockly is still loading, wait for it to finish with optimized polling
                    let pollAttempts = 0;
                    const maxPollAttempts = 10; // Maximum 5 seconds (10 * 500ms) - optimized performance

                    const checkBlocklyLoaded = () => {
                        if (!blockly_store.is_loading) {
                            handleTradeTypeModal();
                            return; // Exit polling once loaded
                        }

                        if (pollAttempts < maxPollAttempts) {
                            pollAttempts++;
                            // Use 500ms intervals for better performance (5x improvement from 100ms)
                            pollTimeoutId = setTimeout(checkBlocklyLoaded, 500);
                        } else {
                            console.warn(
                                'Blockly loading timeout after 5 seconds - proceeding without URL parameter check'
                            );
                        }
                    };

                    checkBlocklyLoaded();
                }
            });
        }

        // Cleanup function to prevent memory leaks
        return () => {
            if (pollTimeoutId) {
                clearTimeout(pollTimeoutId);
                pollTimeoutId = null;
            }
        };
    }, [active_tab, is_loading]);

    React.useEffect(() => {
        // Run on mount and when active tab changes
        updateTabShadowsHeight();

        if (is_open) {
            setTourDialogVisibility(false);
        }
        if (init_render.current) {
            setActiveTab(Number(active_hash_tab));
            if (!isDesktop) handleTabChange(Number(active_hash_tab));
            init_render.current = false;
        } else {
            // Preserve URL parameters when navigating
            const currentSearch = window.location.search;
            navigate(`${currentSearch}#${hash[active_tab] || hash[0]}`);
        }
        if (active_tour !== '') {
            setActiveTour('');
        }

        // Keep tab content scrollable. Older tutorial handling added a page-level
        // scroll lock, which can make every tab feel unscrollable.
        const mainElement = document.querySelector('.main__container');
        if (document.body.style.overflow === 'hidden') {
            document.body.style.overflow = '';
        }
        if (mainElement instanceof HTMLElement) {
            mainElement.classList.remove('no-scroll');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active_tab]);

    React.useEffect(() => {
        const trashcan_init_id = setTimeout(() => {
            if (active_tab === BOT_BUILDER && Blockly?.derivWorkspace?.trashcan) {
                const trashcanY = window.innerHeight - 250;
                let trashcanX;
                if (is_drawer_open) {
                    trashcanX = isDbotRTL() ? 380 : window.innerWidth - 460;
                } else {
                    trashcanX = isDbotRTL() ? 20 : window.innerWidth - 100;
                }
                Blockly?.derivWorkspace?.trashcan?.setTrashcanPosition(trashcanX, trashcanY);
            }
        }, 100);

        return () => {
            clearTimeout(trashcan_init_id); // Clear the timeout on unmount
        };
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active_tab, is_drawer_open]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!active_trading_module) return;
            recordDiagnosticEvent('window.beforeunload_blocked', {
                activeModule: active_trading_module,
                activeTab: active_tab,
            });
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [active_trading_module]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (dashboard_strategies.length > 0) {
            // Needed to pass this to the Callback Queue as on tab changes
            // document title getting override by 'Bot | Deriv' only
            timer = setTimeout(() => {
                updateWorkspaceName();
            });
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [dashboard_strategies, active_tab]);

    const handleTabChange = React.useCallback(
        (tab_index: number) => {
            setActiveTab(tab_index);
            if (dashboard.active_tab !== tab_index) return;
            const el_id = TAB_IDS[tab_index];
            if (el_id) {
                const el_tab = document.getElementById(el_id);
                setTimeout(() => {
                    el_tab?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }, 10);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [dashboard, setActiveTab]
    );

    // [AI]
    const handleLoginGeneration = async () => {
        const oauthUrl = await generateOAuthURL();
        if (oauthUrl) {
            window.location.replace(oauthUrl);
        } else {
            console.error('Failed to generate OAuth URL');
        }
    };
    // [/AI]
    return (
        <React.Fragment>
            <div className={classNames('main', { 'main--risk-managers': isRiskManagersDomain })}>
                <div
                    className={classNames('main__container', {
                        'main__container--active': active_tour && active_tab === DASHBOARD && !isDesktop,
                        'main__container--with-open-run-panel': should_show_run_panel && isDesktop && is_drawer_open,
                        'main__container--with-open-mobile-run-panel':
                            should_show_run_panel && !isDesktop && is_drawer_open,
                    })}
                >
                    <div>
                        {!isDesktop && left_tab_shadow && <span className='tabs-shadow tabs-shadow--left' />}{' '}
                        <Tabs active_index={active_tab} className='main__tabs' onTabItemClick={handleTabChange} top>
                            {show_bot_ideas && (
                                <div
                                    label={
                                        <>
                                            <Lightbulb size={24} color='#F0050C' />
                                            <Localize i18n_default_text='Dashboard' />
                                        </>
                                    }
                                    id='id-bot-ideas'
                                >
                                    <BotIdeas />
                                </div>
                            )}
                            <div
                                label={
                                    <>
                                        <Bot color='#f0050c' />
                                        <Localize i18n_default_text='Free Bots' />
                                    </>
                                }
                                id='id-best-bots'
                            >
                                <BestBots />
                            </div>
                            <div
                                label={
                                    <>
                                        <LabelPairedChartTrendUpCaptionRegularIcon
                                            height='24px'
                                            width='24px'
                                            fill='#F0050C'
                                        />
                                        <Localize i18n_default_text='Signal AI' />
                                    </>
                                }
                                id='id-up-and-down'
                            >
                                <UpAndDown />
                            </div>
                            <div
                                label={
                                    <>
                                        <LabelPairedObjectsColumnCaptionRegularIcon
                                            height='24px'
                                            width='24px'
                                            fill='#F0050C'
                                        />
                                        <Localize i18n_default_text='Quick Bot' />
                                    </>
                                }
                                id='id-dbot-dashboard'
                            >
                                <Dashboard handleTabChange={handleTabChange} />
                            </div>
                            <div
                                label={
                                    <>
                                        <LabelPairedPuzzlePieceTwoCaptionBoldIcon
                                            height='24px'
                                            width='24px'
                                            fill='#F0050C'
                                        />

                                        <Localize i18n_default_text='Bot Builder' />
                                    </>
                                }
                                id='id-bot-builder'
                            />
                            {show_auto_trades && (
                                <div
                                    label={
                                        <>
                                            <LabelPairedChartTrendUpCaptionRegularIcon
                                                height='24px'
                                                width='24px'
                                                fill='#F0050C'
                                            />
                                            <Localize i18n_default_text='Auto Trader' />
                                        </>
                                    }
                                    id='id-auto-trades'
                                >
                                    <AutoTrades />
                                </div>
                            )}
                            {show_manual_trading && (
                                <div
                                    label={
                                        <>
                                            <LabelPairedChartMixedCaptionRegularIcon
                                                height='24px'
                                                width='24px'
                                                fill='#F0050C'
                                            />
                                            <Localize i18n_default_text='Manual Trading' />
                                        </>
                                    }
                                    id='id-manual-trading'
                                >
                                    <ManualTrading />
                                </div>
                            )}
                            {show_scanner ? (
                                <div
                                    label={
                                        <>
                                            <LabelPairedSearchCaptionRegularIcon
                                                height='24px'
                                                width='24px'
                                                fill='#F0050C'
                                            />
                                            <Localize i18n_default_text='Speedbot' />
                                        </>
                                    }
                                    id='id-scanner'
                                >
                                    <Scanner />
                                </div>
                            ) : null}
                            {show_accumilatoirs && (
                                <div
                                    label={
                                        <>
                                            <LabelPairedPlaceholderCaptionRegularIcon
                                                height='24px'
                                                width='24px'
                                                fill='#F0050C'
                                            />
                                            <Localize i18n_default_text='Pro AI' />
                                        </>
                                    }
                                    id='id-accumilatoirs'
                                >
                                    <Accumilatoirs />
                                </div>
                            )}
                            <div
                                label={
                                    <>
                                        <LabelPairedChartLineCaptionRegularIcon
                                            height='24px'
                                            width='24px'
                                            fill='#F0050C'
                                        />
                                        <Localize i18n_default_text='Analysistools' />
                                    </>
                                }
                                id='id-analysistool'
                            >
                                <Analysistool />
                            </div>
                            {show_chart && (
                                <div
                                    label={
                                        <>
                                            <LabelPairedChartLineCaptionRegularIcon
                                                height='24px'
                                                width='24px'
                                                fill='#F0050C'
                                                stroke='#F0050C'
                                            />
                                            <Localize i18n_default_text='Chart' />
                                        </>
                                    }
                                    id='id-chart'
                                >
                                    <div className='main__chart-page'>
                                        <ChartWrapper prefix='main-chart' show_digits_stats={false} />
                                    </div>
                                </div>
                            )}
                            {show_trading_view && (
                                <div
                                    label={
                                        <>
                                            <LabelPairedChartMixedCaptionRegularIcon
                                                height='24px'
                                                width='24px'
                                                fill='#F0050C'
                                                stroke='#F0050C'
                                            />
                                            <Localize i18n_default_text='DTrader' />
                                        </>
                                    }
                                    id='id-tradingview'
                                >
                                    <TradingView />
                                </div>
                            )}
                        </Tabs>
                        {!isDesktop && right_tab_shadow && <span className='tabs-shadow tabs-shadow--right' />}{' '}
                    </div>
                </div>
            </div>
            <RiskDisclaimerFloating />
            <DesktopWrapper>
                {should_show_run_panel && (
                    <div className='main__run-strategy-wrapper'>
                        <RunStrategy />
                        <RunPanel />
                    </div>
                )}
                {show_chart && <ChartModal />}
            </DesktopWrapper>
            <MobileWrapper>{should_show_run_panel && !is_open && <RunPanel />}</MobileWrapper>
            <Dialog
                cancel_button_text={navigation_stop_in_progress ? undefined : localize('Stay')}
                className='dc-dialog__wrapper--fixed'
                confirm_button_text={
                    navigation_stop_in_progress ? localize('Stopping trades...') : localize('Stop and switch')
                }
                has_close_icon={!navigation_stop_in_progress}
                is_mobile_full_width={false}
                is_visible={is_leave_trading_dialog_open}
                onCancel={navigation_stop_in_progress ? undefined : cancelPendingTradingNavigation}
                onClose={navigation_stop_in_progress ? undefined : cancelPendingTradingNavigation}
                onConfirm={() => {
                    if (!navigation_stop_in_progress) {
                        void confirmPendingTradingNavigation();
                    }
                }}
                portal_element_id='modal_root'
                title={localize('Active trading is running')}
                login={handleLoginGeneration}
                dismissable={!navigation_stop_in_progress}
                is_closed_on_cancel={false}
                is_closed_on_confirm={false}
            >
                <Localize i18n_default_text='Leaving this page now can interrupt live executions. Stop the active trades and switch tabs, or stay here and keep the session running.' />
            </Dialog>
            <Dialog
                cancel_button_text={cancel_button_text || localize('Cancel')}
                className='dc-dialog__wrapper--fixed'
                confirm_button_text={ok_button_text || localize('Ok')}
                has_close_icon
                is_mobile_full_width={false}
                is_visible={is_dialog_open}
                onCancel={onCancelButtonClick}
                onClose={onCloseDialog}
                onConfirm={onOkButtonClick || onCloseDialog}
                portal_element_id='modal_root'
                title={title}
                login={handleLoginGeneration}
                dismissable={dismissable} // Prevents closing on outside clicks
                is_closed_on_cancel={is_closed_on_cancel}
            >
                {message}
            </Dialog>

            {/* Trade Type Confirmation Modal */}
            {(() => {
                const modalProps = getTradeTypeModalProps();
                return (
                    <TradeTypeConfirmationModal
                        is_visible={modalProps.is_visible}
                        trade_type_display_name={modalProps.trade_type_display_name}
                        current_trade_type={modalProps.current_trade_type}
                        current_trade_type_display_name={modalProps.current_trade_type_display_name}
                        onConfirm={modalProps.onConfirm}
                        onCancel={modalProps.onCancel}
                    />
                );
            })()}
        </React.Fragment>
    );
});

export default AppWrapper;
