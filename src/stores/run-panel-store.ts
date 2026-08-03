import { action, computed, makeObservable, observable, reaction, runInAction } from 'mobx';
import { botNotification } from '@/components/bot-notification/bot-notification';
import { notification_message } from '@/components/bot-notification/bot-notification-utils';
import { isSafari, mobileOSDetect } from '@/components/shared';
import { generateOAuthURL } from '@/components/shared/utils/config/config';
import { standalone_routes } from '@/components/shared/utils/routes/routes';
import { contract_stages, TContractStage } from '@/constants/contract-stage';
import { TExecutionMode } from '@/constants/execution-modes';
import { run_panel } from '@/constants/run-panel';
import { ErrorTypes, MessageTypes, observer, unrecoverable_errors } from '@/external/bot-skeleton';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { getSelectedTradeType } from '@/external/bot-skeleton/scratch/utils';
import { recordDiagnosticEvent } from '@/utils/diagnostics';
import { handleBackendError, isBackendError } from '@/utils/error-handler';
import { getSetting, storeSetting } from '@/utils/settings';
// import { journalError, switch_account_notification } from '@/utils/bot-notifications';
import GTM from '@/utils/gtm';
import { helpers } from '@/utils/store-helpers';
import { generateUrlWithRedirect } from '@/utils/url-redirect-utils';
import { Buy, ProposalOpenContract } from '@deriv/api-types';
import { TStores } from '@deriv/stores/types';
import { localize } from '@deriv-com/translations';
import { TDbot } from 'Types';
import RootStore from './root-store';

export type TContractState = {
    buy?: Buy;
    contract?: ProposalOpenContract;
    data: number;
    id: string;
};

const CLOSED_CONTRACT_STATUSES = new Set(['sold', 'won', 'lost', 'cancelled']);

export default class RunPanelStore {
    root_store: RootStore;
    dbot: TDbot;
    core: TStores;
    disposeReactionsFn: () => void;
    timer: NodeJS.Timeout | null;
    private is_bot_listeners_registered = false;
    private readonly handleUiLogError = (errorMessage: string) => {
        // Check if this is a stake/payout error message first
        if (
            typeof errorMessage === 'string' &&
            errorMessage.includes('Minimum stake') &&
            errorMessage.includes('maximum payout')
        ) {
            const { getLocalizedErrorMessage } = require('@/constants/backend-error-messages');

            // Extract parameter values from the message
            const stakeMatch = errorMessage.match(/Minimum stake of ([\d.]+)/);
            const payoutMatch = errorMessage.match(/maximum payout of ([\d.]+)/);
            const currentMatch = errorMessage.match(/Current (?:payout|stake) is ([\d.]+)/);

            if (stakeMatch && payoutMatch && currentMatch) {
                const details = {
                    param1: stakeMatch[1],
                    param2: payoutMatch[1],
                    param3: currentMatch[1],
                };

                // Determine which error code to use based on the message content
                let errorCode = 'InvalidtoBuy'; // default
                if (errorMessage.includes('Current payout')) {
                    errorCode = errorMessage.includes('stake') ? 'StakeLimits' : 'PayoutLimits';
                } else if (errorMessage.includes('Current stake')) {
                    errorCode = 'StakeLimits';
                }

                const processedMessage = getLocalizedErrorMessage(errorCode, details);
                this.showErrorMessage(processedMessage);
                return;
            }
        }

        // If errorMessage is a string with placeholder patterns, try to extract the error code
        if (typeof errorMessage === 'string' && errorMessage.includes('[_')) {
            const { getLocalizedErrorMessage, getBackendErrorMessages } = require('@/constants/backend-error-messages');
            const errorMessages = getBackendErrorMessages();

            let matchedErrorCode: string | null = null;
            const normalizedMessage = errorMessage.replace(/\[_(\d+)\]/g, '{{param$1}}');
            for (const [errorCode, errorTemplate] of Object.entries(errorMessages)) {
                if (typeof errorTemplate === 'string' && errorTemplate === normalizedMessage) {
                    matchedErrorCode = errorCode;
                    break;
                }
            }

            if (matchedErrorCode) {
                const localizedMessage = getLocalizedErrorMessage(matchedErrorCode);
                this.showErrorMessage(localizedMessage);
                return;
            }
        }

        this.showErrorMessage(errorMessage);
    };
    private readonly handleExecutionConditionFailed = ({ message }: { message?: string }) => {
        this.showExecutionConditionDialog(message);
    };

    constructor(root_store: RootStore, core: TStores) {
        makeObservable(this, {
            active_index: observable,
            contract_stage: observable,
            dialog_options: observable,
            has_open_contract: observable,
            is_running: observable,
            is_paused: observable,
            is_statistics_info_modal_open: observable,
            is_drawer_open: observable,
            is_dialog_open: observable,
            is_sell_requested: observable,
            run_id: observable,
            error_type: observable,
            show_bot_stop_message: observable,
            execution_mode: observable,
            is_stop_button_visible: computed,
            is_stop_button_disabled: computed,
            is_clear_stat_disabled: computed,
            toggleDrawer: action,
            onBotSellEvent: action,
            setContractStage: action,
            setHasOpenContract: action,
            setIsRunning: action,
            setRunId: action,
            setExecutionMode: action,
            onRunButtonClick: action,
            onPauseButtonClick: action,
            onResumeButtonClick: action,
            is_contract_buying_in_progress: observable,
            SetpurchaseInProgress: action,
            onStopButtonClick: action,
            onClearStatClick: action,
            clearStat: action,
            toggleStatisticsInfoModal: action,
            setActiveTabIndex: action,
            onCloseDialog: action,
            stopMyBot: action,
            closeMultiplierContract: action,
            showStopMultiplierContractDialog: action,
            showLoginDialog: action,
            showRealAccountDialog: action,
            showClearStatDialog: action,
            showIncompatibleStrategyDialog: action,
            showContractUpdateErrorDialog: action,
            showExecutionConditionDialog: action,
            registerBotListeners: action,
            registerReactions: action,
            onBotRunningEvent: action,
            onBotStopEvent: action,
            onBotReadyEvent: action,
            onBotTradeAgain: action,
            onContractStatusEvent: action,
            onClickSell: action,
            clear: action,
            onBotContractEvent: action,
            onError: action,
            showErrorMessage: action,
            switchToJournal: action,
            unregisterBotListeners: action,
            handleInvalidToken: action,
            preloadAudio: action,
            onMount: action,
            onUnmount: action,
        });

        this.root_store = root_store;
        this.dbot = this.root_store.dbot;
        this.core = core;
        this.disposeReactionsFn = this.registerReactions();
        this.timer = null;
    }

    active_index = 0;
    contract_stage: TContractStage = contract_stages.NOT_RUNNING;
    dialog_options = {};
    has_open_contract = false;
    is_running = false;
    is_paused = false;
    is_statistics_info_modal_open = false;
    is_drawer_open = true;
    is_dialog_open = false;
    is_sell_requested = false;
    show_bot_stop_message = false;
    is_contract_buying_in_progress = false;
    execution_mode: TExecutionMode = 'slow';

    run_id = '';
    onOkButtonClick: (() => void) | null = null;
    onCancelButtonClick: (() => void) | null = null;

    // when error happens, if it is unrecoverable_errors we reset run-panel
    // we activate run-button and clear trade info and set the ContractStage to NOT_RUNNING
    // otherwise we keep opening new contracts and set the ContractStage to PURCHASE_SENT
    error_type: ErrorTypes | undefined = undefined;

    get is_stop_button_visible() {
        return this.is_running || this.has_open_contract;
    }

    get is_stop_button_disabled() {
        if (this.is_contract_buying_in_progress) {
            return false;
        }
        return [contract_stages.PURCHASE_SENT as number, contract_stages.IS_STOPPING as number].includes(
            this.contract_stage
        );
    }

    get is_clear_stat_disabled() {
        const { journal, transactions } = this.root_store;

        return (
            this.is_running ||
            this.has_open_contract ||
            (journal.unfiltered_messages.length === 0 && transactions?.transactions?.length === 0)
        );
    }

    setShowBotStopMessage = (show_bot_stop_message: boolean) => {
        this.show_bot_stop_message = show_bot_stop_message;
        if (!show_bot_stop_message) return;
        const handleNotificationClick = () => {
            const contract_type = getSelectedTradeType();
            const baseUrl = `${standalone_routes.positions}?contract_type_bots=${contract_type}`;

            // Use generateUrlWithRedirect to add redirect parameter and account_type from localStorage
            const urlWithRedirect = generateUrlWithRedirect(baseUrl);
            window.location.assign(urlWithRedirect);
        };

        botNotification(notification_message().bot_stop, {
            label: localize('Reports'),
            onClick: handleNotificationClick,
        });
    };

    onRunButtonClick = async () => {
        let timer_counter = 1;
        if (window.sendRequestsStatistic) {
            performance.clearMeasures();
            // Log is sent every 10 seconds for 5 minutes
            this.timer = setInterval(() => {
                window.sendRequestsStatistic(true);
                performance.clearMeasures();
                if (timer_counter === 12) {
                    clearInterval(this.timer as NodeJS.Timeout);
                } else {
                    timer_counter++;
                }
            }, 10000);
        }
        const { summary_card } = this.root_store;
        const { client, ui } = this.core;
        const is_ios = mobileOSDetect() === 'iOS';
        this.dbot.saveRecentWorkspace();
        this.dbot.unHighlightAllBlocks();
        if (!client.is_logged_in) {
            this.showLoginDialog();
            return;
        }

        api_base.setExecutionMode(this.execution_mode);
        try {
            await api_base.ensureConnectionReady();
        } catch (connection_error) {
            this.unregisterBotListeners();
            this.showErrorMessage(
                connection_error instanceof Error
                    ? connection_error.message
                    : localize('Unable to establish a stable API connection. Please try again.')
            );
            return;
        }

        /**
         * Due to Apple's policy on cellular data usage in ios audioElement.play() should be initially called on
         * user action(e.g click/touch) to be downloaded, otherwise throws an error. Also it should be called
         * syncronously, so keep above await.
         */
        if (is_ios || isSafari()) this.preloadAudio();

        this.registerBotListeners();

        if (!this.dbot.shouldRunBot()) {
            this.unregisterBotListeners();
            return;
        }

        if (this.dbot.symbol && this.dbot.interpreter?.bot?.tradeEngine) {
            try {
                await this.dbot.interpreter.bot.tradeEngine.watchTicks(this.dbot.symbol);
            } catch (tick_error) {
                this.unregisterBotListeners();
                this.showErrorMessage(
                    tick_error instanceof Error
                        ? tick_error.message
                        : localize('Unable to prepare market data. Please try again.')
                );
                return;
            }
        }

        ui?.setAccountSwitcherDisabledMessage(
            localize(
                'Account switching is disabled while your bot is running. Please stop your bot before switching accounts.'
            )
        );
        runInAction(() => {
            this.is_paused = false;
            this.setIsRunning(true);
            ui.setPromptHandler(true);
            this.toggleDrawer(true);
            this.run_id = `run-${Date.now()}`;

            summary_card.clear();
            this.setContractStage(contract_stages.STARTING);
            this.dbot.runBot();
        });
        this.setShowBotStopMessage(false);
    };

    onPauseButtonClick = () => {
        if (!this.is_running || this.is_paused) return;

        this.dbot.pauseBot();
        this.is_paused = true;
    };

    onResumeButtonClick = async () => {
        if (!this.is_running || !this.is_paused) return;

        try {
            await api_base.ensureConnectionReady();
            if (this.dbot.symbol && this.dbot.interpreter?.bot?.tradeEngine) {
                await this.dbot.interpreter.bot.tradeEngine.watchTicks(this.dbot.symbol);
            }
        } catch (connection_error) {
            this.showErrorMessage(
                connection_error instanceof Error
                    ? connection_error.message
                    : localize('Unable to restore market data. Please try again.')
            );
            return;
        }

        this.dbot.resumeBot();
        this.is_paused = false;
    };

    onStopButtonClick = () => {
        this.is_contract_buying_in_progress = false;
        observer.emit('bot.manual_stop');
        const { is_multiplier } = this.root_store.summary_card;

        if (is_multiplier) {
            this.showStopMultiplierContractDialog();
        } else {
            void this.stopBot();
        }
    };

    onStopBotClick = () => {
        this.is_contract_buying_in_progress = false;
        observer.emit('bot.manual_stop');

        const { is_multiplier } = this.root_store.summary_card;
        const { summary_card } = this.root_store;

        if (is_multiplier) {
            this.showStopMultiplierContractDialog();
        } else {
            void this.stopBot();
            summary_card.clear();
            this.setShowBotStopMessage(true);
        }
    };

    stopBot = async () => {
        const { ui } = this.core;

        this.is_paused = false;
        await this.dbot.stopBot();

        ui.setPromptHandler(false);

        this.setIsRunning(false);
        this.setHasOpenContract(false);
        this.setContractStage(contract_stages.NOT_RUNNING);

        if (this.error_type) {
            this.error_type = undefined;
        }

        if (this.timer) {
            clearInterval(this.timer as NodeJS.Timeout);
            this.timer = null;
        }
        if (window.sendRequestsStatistic) {
            window.sendRequestsStatistic(true);
            performance.clearMeasures();
        }
        this.unregisterBotListeners();
        ui.setAccountSwitcherDisabledMessage();
    };

    onClearStatClick = () => {
        this.showClearStatDialog();
    };

    clearStat = () => {
        const { summary_card, journal, transactions } = this.root_store;

        this.is_paused = false;
        this.setIsRunning(false);
        this.setHasOpenContract(false);
        this.clear();
        journal.clear();
        summary_card.clear();
        transactions.clear();
        this.setContractStage(contract_stages.NOT_RUNNING);
    };

    toggleStatisticsInfoModal = () => {
        this.is_statistics_info_modal_open = !this.is_statistics_info_modal_open;
    };

    toggleDrawer = (is_open: boolean) => {
        this.is_drawer_open = is_open;
    };

    setActiveTabIndex = (index: number) => {
        this.active_index = index;
    };

    onCloseDialog = () => {
        this.is_dialog_open = false;
    };

    stopMyBot = () => {
        const { summary_card, quick_strategy } = this.root_store;
        const { ui } = this.core;
        const { toggleStopBotDialog } = quick_strategy;

        ui.setPromptHandler(false);
        this.dbot.terminateBot();
        this.onCloseDialog();
        summary_card.clear();
        toggleStopBotDialog();
        if (this.timer) {
            clearInterval(this.timer);
        }
        if (window.sendRequestsStatistic) {
            window.sendRequestsStatistic(true);
            performance.clearMeasures();
        }
    };

    closeMultiplierContract = () => {
        const { quick_strategy } = this.root_store;
        const { toggleStopBotDialog } = quick_strategy;

        this.onClickSell();
        this.stopBot();
        this.onCloseDialog();
        toggleStopBotDialog();
    };

    showStopMultiplierContractDialog = () => {
        const { summary_card } = this.root_store;
        const { ui } = this.core;

        this.onOkButtonClick = () => {
            ui.setPromptHandler(false);
            this.dbot.terminateBot();
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
            if (window.sendRequestsStatistic) {
                window.sendRequestsStatistic(true);
                performance.clearMeasures();
            }
            this.onCloseDialog();
            summary_card.clear();
            this.setIsRunning(false);
            this.setHasOpenContract(false);
            this.setContractStage(contract_stages.NOT_RUNNING);
            this.unregisterBotListeners();
            ui.setAccountSwitcherDisabledMessage();
        };
        this.onCancelButtonClick = () => {
            this.onClickSell();
            this.stopBot();
            this.onCloseDialog();
        };
        this.dialog_options = {
            title: localize('Keep your current contract?'),
            message: helpers.keep_current_contract,
            ok_button_text: localize('Keep my contract'),
            cancel_button_text: localize('Close my contract'),
        };
        this.is_dialog_open = true;
    };

    showLoginDialog = () => {
        // Only allow closing through the buttons
        this.onOkButtonClick = () => {
            generateOAuthURL('registration').then(url => {
                if (url) window.location.replace(url);
            });
            this.is_dialog_open = false;
        };
        this.onCancelButtonClick = () => {
            this.is_dialog_open = false;
        };
        this.dialog_options = {
            title: localize('You are not logged in'),
            message: localize('Please log in or sign up to start trading with us.'),
            ok_button_text: localize('Sign up'),
            cancel_button_text: localize('Log in'),
            dismissable: false,
            is_closed_on_cancel: false,
        };
        this.is_dialog_open = true;
    };

    showRealAccountDialog = () => {
        this.onOkButtonClick = this.onCloseDialog;
        this.onCancelButtonClick = null;
        this.dialog_options = {
            title: localize("Deriv Bot isn't quite ready for real accounts"),
            message: localize('Please switch to your demo account to run your Deriv Bot.'),
        };
        this.is_dialog_open = true;
    };

    showClearStatDialog = () => {
        this.onOkButtonClick = () => {
            this.clearStat();
            this.onCloseDialog();
        };
        this.onCancelButtonClick = this.onCloseDialog;
        this.dialog_options = {
            title: localize('Are you sure?'),
            message: localize(
                'This will clear all data in the summary, transactions, and journal panels. All counters will be reset to zero.'
            ),
        };
        this.is_dialog_open = true;
    };

    showIncompatibleStrategyDialog = () => {
        this.onOkButtonClick = this.onCloseDialog;
        this.onCancelButtonClick = null;
        this.dialog_options = {
            title: localize('Import error'),
            message: localize('This strategy is currently not compatible with Deriv Bot.'),
        };
        this.is_dialog_open = true;
    };

    showContractUpdateErrorDialog = (message?: string) => {
        this.onOkButtonClick = this.onCloseDialog;
        this.onCancelButtonClick = null;
        this.dialog_options = {
            title: localize('Contract Update Error'),
            message,
        };
        this.is_dialog_open = true;
    };

    showExecutionConditionDialog = (message?: string) => {
        if (this.is_dialog_open) return;

        this.onOkButtonClick = () => {
            this.onCloseDialog();
            this.onStopButtonClick();
        };
        this.onCancelButtonClick = null;
        this.dialog_options = {
            title: localize('Market does not meet requirement'),
            message: message || localize('Market does not meet the preset execution requirement.'),
        };
        this.is_dialog_open = true;
    };

    registerBotListeners = () => {
        if (this.is_bot_listeners_registered) return;
        const { summary_card, transactions } = this.root_store;

        observer.register('bot.running', this.onBotRunningEvent);
        observer.register('bot.sell', this.onBotSellEvent);
        observer.register('bot.stop', this.onBotStopEvent);
        observer.register('bot.bot_ready', this.onBotReadyEvent);
        observer.register('bot.click_stop', this.onStopButtonClick);
        observer.register('bot.trade_again', this.onBotTradeAgain);
        observer.register('contract.status', this.onContractStatusEvent);
        observer.register('bot.contract', this.onBotContractEvent);
        observer.register('bot.contract', summary_card.onBotContractEvent);
        observer.register('bot.contract', transactions.onBotContractEvent);
        observer.register('bot.execution_condition_failed', this.handleExecutionConditionFailed);
        observer.register('bot.stop_button_click', this.onStopBotClick);
        observer.register('Error', this.onError);
        observer.register('bot.setPurchaseInProgress', this.SetpurchaseInProgress);
        this.is_bot_listeners_registered = true;
    };

    SetpurchaseInProgress = () => {
        return (this.is_contract_buying_in_progress = true);
    };

    registerReactions = () => {
        const { client, common } = this.core;
        // eslint-disable-next-line prefer-const
        let disposeIsSocketOpenedListener: (() => void) | undefined, disposeLogoutListener: (() => void) | undefined;

        const registerIsSocketOpenedListener = () => {
            // TODO: fix notifications
            if (common.is_socket_opened) {
                disposeIsSocketOpenedListener = reaction(
                    () => client.loginid,
                    loginid => {
                        if (loginid && this.is_running) {
                            // TODO: fix notifications
                            // notifications.addNotificationMessage(switch_account_notification());
                        }
                        this.dbot.terminateBot();
                        this.unregisterBotListeners();
                    }
                );
            } else if (typeof disposeLogoutListener === 'function') {
                disposeLogoutListener();
            }
        };

        registerIsSocketOpenedListener();

        disposeLogoutListener = reaction(
            () => common.is_socket_opened,
            () => registerIsSocketOpenedListener()
        );

        const disposeStopBotListener = reaction(
            () => !this.is_running,
            () => {
                if (!this.is_running) this.setContractStage(contract_stages.NOT_RUNNING);
            }
        );

        return () => {
            if (typeof disposeIsSocketOpenedListener === 'function') {
                disposeIsSocketOpenedListener();
            }

            if (typeof disposeLogoutListener === 'function') {
                disposeLogoutListener();
            }

            if (typeof disposeStopBotListener === 'function') {
                disposeStopBotListener();
            }
        };
    };

    onBotRunningEvent = () => {
        this.setHasOpenContract(true);

        // prevent new version update
        const ignore_new_version = new Event('IgnorePWAUpdate');
        document.dispatchEvent(ignore_new_version);
    };

    onBotSellEvent = () => {
        this.is_sell_requested = true;
    };

    onBotStopEvent = () => {
        const { summary_card } = this.root_store;
        const { ui } = this.core;
        const indicateBotStopped = () => {
            this.error_type = undefined;
            this.is_paused = false;
            this.setContractStage(contract_stages.NOT_RUNNING);
            ui.setAccountSwitcherDisabledMessage();
            this.unregisterBotListeners();
        };
        if (this.error_type === ErrorTypes.RECOVERABLE_ERRORS) {
            const { shouldRestartOnError = false, timeMachineEnabled = false } =
                this.dbot?.interpreter?.bot?.tradeEngine?.options ?? {};
            const is_bot_recoverable = shouldRestartOnError || timeMachineEnabled;

            if (is_bot_recoverable) {
                this.error_type = undefined;
                this.setContractStage(contract_stages.PURCHASE_SENT);
            } else {
                this.setIsRunning(false);
                indicateBotStopped();
            }
        } else if (this.error_type === ErrorTypes.UNRECOVERABLE_ERRORS) {
            this.setIsRunning(false);
            indicateBotStopped();
        } else if (this.has_open_contract) {
            this.error_type = undefined;
            this.is_sell_requested = false;
            this.setContractStage(contract_stages.CONTRACT_CLOSED);
            this.setHasOpenContract(false);
            this.is_paused = false;
            ui.setAccountSwitcherDisabledMessage();
            this.unregisterBotListeners();
        }

        summary_card.clearContractUpdateConfigValues();

        const listen_new_version = new Event('ListenPWAUpdate');
        document.dispatchEvent(listen_new_version);
    };

    onBotReadyEvent = () => {
        if (!this.is_running) {
            api_base.toggleRunButton(false);
        }
        observer.unregister('bot.bot_ready', this.onBotReadyEvent);
    };

    onBotTradeAgain = (is_trade_again: boolean) => {
        if (!is_trade_again) {
            this.stopBot();
        }
    };

    onContractStatusEvent = (contract_status: TContractState) => {
        switch (contract_status.id) {
            case 'contract.purchase_sent': {
                this.setContractStage(contract_stages.PURCHASE_SENT);
                this.setHasOpenContract(true);
                break;
            }
            case 'contract.purchase_received': {
                this.is_contract_buying_in_progress = false;
                this.setContractStage(contract_stages.PURCHASE_RECEIVED);
                this.setHasOpenContract(true);
                const { buy } = contract_status;
                const { is_virtual } = this.core.client;

                if (!is_virtual && buy) {
                    GTM?.pushDataLayer?.({ event: 'dbot_purchase', buy_price: buy.buy_price });
                }

                break;
            }
            case 'contract.settlement_recovery': {
                this.is_contract_buying_in_progress = false;
                this.setContractStage(contract_stages.SETTLEMENT_RECOVERY);
                this.setHasOpenContract(true);
                break;
            }
            case 'contract.sold': {
                this.is_sell_requested = false;
                this.setContractStage(contract_stages.CONTRACT_CLOSED);
                this.setHasOpenContract(false);
                if (contract_status.contract) GTM.onTransactionClosed(contract_status.contract);
                break;
            }
            default:
                break;
        }
    };

    onClickSell = () => {
        const { is_multiplier } = this.root_store.summary_card;

        if (is_multiplier) {
            this.setContractStage(contract_stages.IS_STOPPING);
        }

        this.dbot.interpreter.bot.getInterface().sellAtMarket();
    };

    clear = () => {
        observer.emit('statistics.clear');
    };

    onBotContractEvent = (data: { is_sold?: boolean; status?: string; contract_id?: string }) => {
        const is_closed_contract =
            !!data?.is_sold || CLOSED_CONTRACT_STATUSES.has(String(data?.status || '').toLowerCase());

        if (is_closed_contract) {
            this.is_sell_requested = false;
            this.setContractStage(contract_stages.CONTRACT_CLOSED);
            this.setHasOpenContract(false);
        }
    };

    onError = (data: { error: any }) => {
        // data.error for API errors, data for code errors
        // Normalize the payload so we never attempt to access properties on undefined/null
        const error = (data as any)?.error ?? (data as any) ?? {};
        const error_message_text = String(error?.message ?? error?.code ?? '').toLowerCase();

        recordDiagnosticEvent('run_panel.error', {
            code: error?.code ?? null,
            message: error?.message ?? String(error ?? ''),
        });

        if (error_message_text.includes('interrupted')) return;

        if (unrecoverable_errors.includes((error as any).code)) {
            this.root_store.summary_card.clear();
            this.error_type = ErrorTypes.UNRECOVERABLE_ERRORS;
        } else {
            this.error_type = ErrorTypes.RECOVERABLE_ERRORS;
        }

        // Check if this error has subcode and code_args for proper mapping
        if (error.subcode && error.code_args) {
            const { getLocalizedErrorMessage } = require('@/constants/backend-error-messages');

            const localizedMessage = getLocalizedErrorMessage(error.subcode, error);
            this.showErrorMessage(localizedMessage, error);
            return;
        }

        // Use localized error message if it's a backend error, otherwise fallback to original message
        let error_message = error?.message;
        if (isBackendError(error)) {
            error_message = handleBackendError(error);
        } else if (error?.code && typeof error.code === 'string') {
            // Handle errors that have a code but might not be structured as BackendError
            // This covers cases like "InvalidtoBuy" errors from bot-skeleton
            const backendError = {
                code: error.code,
                message: error.message,
                details: error.code_args ? { code_args: error.code_args } : error.details,
            };
            error_message = handleBackendError(backendError);
        }

        this.showErrorMessage(error_message, error);
    };

    showErrorMessage = (data: string | Error, originalError?: any) => {
        let processedMessage = data;

        // If it's a string with placeholder patterns, try to process it
        if (typeof data === 'string' && data.includes('[_')) {
            const { getLocalizedErrorMessage, getBackendErrorMessages } = require('@/constants/backend-error-messages');
            const errorMessages = getBackendErrorMessages();

            // Convert placeholders from [_1], [_2] format to {{param1}}, {{param2}} format for comparison
            const normalizedMessage = data.replace(/\[_(\d+)\]/g, '{{param$1}}');

            // Search through all error codes to find a match

            let matchedErrorCode: string | null = null;
            for (const [errorCode, errorTemplate] of Object.entries(errorMessages)) {
                if (typeof errorTemplate === 'string' && errorTemplate === normalizedMessage) {
                    matchedErrorCode = errorCode;
                    break;
                }
            }

            if (matchedErrorCode) {
                // If we have the original error with code_args, use those values
                if (originalError?.code_args && Array.isArray(originalError.code_args)) {
                    const details = {
                        param1: originalError.code_args[0],
                        param2: originalError.code_args[1],
                        param3: originalError.code_args[2],
                        param4: originalError.code_args[3],
                        param5: originalError.code_args[4],
                    };
                    processedMessage = getLocalizedErrorMessage(matchedErrorCode, details);
                } else {
                    processedMessage = getLocalizedErrorMessage(matchedErrorCode);
                }
            }
        }

        const { journal } = this.root_store;
        const { ui } = this.core;
        journal.onError(processedMessage);
        if (journal.journal_filters.some(filter => filter === MessageTypes.ERROR)) {
            this.toggleDrawer(true);
            this.setActiveTabIndex(run_panel.JOURNAL);
            ui.setPromptHandler(false);
        } else {
            // TODO: fix notifications
            // notifications.addNotificationMessage(journalError(this.switchToJournal));
            // notifications.removeNotificationMessage({ key: 'bot_error' });
        }
    };

    switchToJournal = () => {
        const { journal } = this.root_store;
        journal.journal_filters.push(MessageTypes.ERROR);
        this.setActiveTabIndex(run_panel.JOURNAL);
        this.toggleDrawer(true);

        // TODO: fix notifications
        // notifications.toggleNotificationsModal();
        // notifications.removeNotificationByKey({ key: 'bot_error' });
    };

    unregisterBotListeners = () => {
        if (!this.is_bot_listeners_registered) return;

        const { summary_card, transactions } = this.root_store;

        observer.unregister('bot.running', this.onBotRunningEvent);
        observer.unregister('bot.sell', this.onBotSellEvent);
        observer.unregister('bot.stop', this.onBotStopEvent);
        observer.unregister('bot.bot_ready', this.onBotReadyEvent);
        observer.unregister('bot.click_stop', this.onStopButtonClick);
        observer.unregister('bot.trade_again', this.onBotTradeAgain);
        observer.unregister('contract.status', this.onContractStatusEvent);
        observer.unregister('bot.contract', this.onBotContractEvent);
        observer.unregister('bot.contract', summary_card.onBotContractEvent);
        observer.unregister('bot.contract', transactions.onBotContractEvent);
        observer.unregister('bot.execution_condition_failed', this.handleExecutionConditionFailed);
        observer.unregister('bot.stop_button_click', this.onStopBotClick);
        observer.unregister('Error', this.onError);
        observer.unregister('bot.setPurchaseInProgress', this.SetpurchaseInProgress);
        this.is_bot_listeners_registered = false;
    };

    setContractStage = (contract_stage: TContractStage) => {
        this.contract_stage = contract_stage;
    };

    setHasOpenContract = (has_open_contract: boolean) => {
        this.has_open_contract = has_open_contract;
    };

    setIsRunning = (is_running: boolean) => {
        this.is_running = is_running;
    };

    setRunId = (run_id: string) => {
        this.run_id = run_id;
    };

    setExecutionMode = (mode: TExecutionMode) => {
        this.execution_mode = mode;
        api_base.setExecutionMode(mode);
        storeSetting('execution_mode', mode);
    };

    onMount = () => {
        const { journal } = this.root_store;
        const stored_execution_mode = getSetting('execution_mode') as TExecutionMode | null;
        if (stored_execution_mode === 'fast' || stored_execution_mode === 'slow') {
            this.execution_mode = stored_execution_mode;
        }
        api_base.setExecutionMode(this.execution_mode);
        observer.register('ui.log.error', this.handleUiLogError);
        observer.register('ui.log.notify', journal.onNotify);
        observer.register('ui.log.success', journal.onLogSuccess);
        observer.register('client.invalid_token', this.handleInvalidToken);
    };

    onUnmount = () => {
        const { journal, summary_card, transactions } = this.root_store;

        if (!this.is_running) {
            this.unregisterBotListeners();
            this.disposeReactionsFn();
            journal.disposeReactionsFn();
            summary_card.disposeReactionsFn();
            transactions.disposeReactionsFn();
        }

        observer.unregister('ui.log.error', this.handleUiLogError);
        observer.unregister('ui.log.notify', journal.onNotify);
        observer.unregister('ui.log.success', journal.onLogSuccess);
        observer.unregister('client.invalid_token', this.handleInvalidToken);
    };

    handleInvalidToken = async () => {
        this.setActiveTabIndex(run_panel.SUMMARY);
    };

    preloadAudio = () => {
        const strategy_sounds = this.dbot.getStrategySounds() as string[];

        strategy_sounds.forEach((sound: string) => {
            const audioElement = document.getElementById(sound) as HTMLAudioElement | null;
            if (!audioElement) return;
            audioElement.muted = true;
            audioElement.play().catch(() => {
                // suppressing abort error, thrown on immediate .pause()
            });
            audioElement.pause();
            audioElement.muted = false;
        });
    };
}
