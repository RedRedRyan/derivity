import React from 'react';
import classnames from 'classnames';
import { observer } from 'mobx-react-lite';
import ContractResultOverlay from '@/components/contract-result-overlay';
import { LabelPairedPlayLgFillIcon, LabelPairedSquareLgFillIcon } from '@/components/shared_ui/figma-icons/LabelPaired';
import { DBOT_TABS } from '@/constants/bot-contents';
import { contract_stages } from '@/constants/contract-stage';
import { useStore } from '@/hooks/useStore';
import { Localize, localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import Button from '../shared_ui/button';
import ToggleSwitch from '../shared_ui/toggle-switch';
import Tooltip from '../shared_ui/tooltip/tooltip';
import CircularWrapper from './circular-wrapper';
import ContractStageText from './contract-stage-text';
import './run-panel-tooltip.scss';
import './trade-animation.scss';

type TTradeAnimation = {
    className?: string;
    should_show_overlay?: boolean;
};

const TradeAnimation = observer(({ className, should_show_overlay }: TTradeAnimation) => {
    const { dashboard, run_panel, summary_card, blockly_store } = useStore();
    const { active_tab } = dashboard;
    const { has_active_bot, has_saved_bots } = blockly_store;
    const { isMobile } = useDevice();

    const { is_contract_completed, profit } = summary_card;
    const {
        contract_stage,
        execution_mode,
        is_paused,
        is_stop_button_visible,
        is_stop_button_disabled,
        onRunButtonClick,
        onStopBotClick,
        onPauseButtonClick,
        onResumeButtonClick,
        setExecutionMode,
    } = run_panel;
    const [shouldDisable, setShouldDisable] = React.useState(false);
    const is_unavailable_for_payment_agent = false;

    const { load_modal } = useStore();
    const { dashboard_strategies, is_delete_modal_open } = load_modal;

    const prevDeleteModalOpen = React.useRef(is_delete_modal_open);

    React.useEffect(() => {
        const checkBots = async () => {
            await blockly_store.checkForSavedBots();
        };
        checkBots();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dashboard_strategies, is_delete_modal_open, is_stop_button_visible]);

    React.useEffect(() => {
        if (prevDeleteModalOpen.current && !is_delete_modal_open) {
            const checkBotsAfterDelete = async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                await blockly_store.checkForSavedBots();
                if (!is_stop_button_visible) {
                    setShouldDisable(true);
                    setTimeout(() => setShouldDisable(false), 0);
                }
            };
            checkBotsAfterDelete();
        }
        prevDeleteModalOpen.current = is_delete_modal_open;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [is_delete_modal_open, is_stop_button_visible]);

    React.useEffect(() => {
        if (shouldDisable) {
            setTimeout(() => {
                setShouldDisable(false);
            }, 1000);
        }
    }, [shouldDisable, is_stop_button_visible]);

    const status_classes = ['', '', ''];
    const is_purchase_sent = contract_stage === (contract_stages.PURCHASE_SENT as unknown);
    const is_purchase_received = contract_stage === (contract_stages.PURCHASE_RECEIVED as unknown);

    let progress_status = contract_stage - (is_purchase_sent || is_purchase_received ? 2 : 3);

    if (progress_status >= 0) {
        if (progress_status < status_classes.length) {
            status_classes[progress_status] = 'active';
        }

        if (is_contract_completed) {
            progress_status += 1;
        }

        for (let i = 0; i < progress_status - 1; i++) {
            status_classes[i] = 'completed';
        }
    }

    const has_no_bots = !has_active_bot && !has_saved_bots;
    const is_bot_builder_tab = active_tab === DBOT_TABS.BOT_BUILDER;
    const should_disable_run = has_no_bots && !is_bot_builder_tab;
    const is_disabled = is_stop_button_visible ? false : shouldDisable || should_disable_run;
    const should_show_tooltip = !is_stop_button_visible && !is_bot_builder_tab && has_no_bots;
    const show_overlay = should_show_overlay && is_contract_completed;
    const show_execution_mode = !is_stop_button_visible;

    const determineTooltipAlignment = (): string => {
        if (isMobile) {
            return 'top';
        }

        try {
            const runPanelElement = document.querySelector('.run__button_wrapper');
            if (runPanelElement) {
                const rect = runPanelElement.getBoundingClientRect();
                const rectBottom = typeof rect.bottom === 'number' ? rect.bottom : 0;
                const windowHeight = typeof window.innerHeight === 'number' ? window.innerHeight : 0;
                const isNearBottom = rectBottom > windowHeight - 150;

                return isNearBottom ? 'top' : 'left';
            }
        } catch (error) {
            console.error('Error determining tooltip position:', error);
        }

        return 'left';
    };

    const renderRunButton = (disabled = false) => (
        <Button
            is_disabled={disabled || contract_stage === 3}
            className='animation__run-button'
            id='db-animation__run-button'
            icon={<LabelPairedPlayLgFillIcon fill='#fff' />}
            onClick={() => {
                setShouldDisable(true);
                onRunButtonClick();
            }}
            has_effect
            {...(!is_unavailable_for_payment_agent ? { green: true } : { primary: true })}
        >
            <Localize i18n_default_text='Run' />
        </Button>
    );

    const renderActiveControls = () => (
        <div className='animation__controls'>
            <Button
                is_disabled={is_stop_button_disabled}
                className='animation__stop-button'
                id='db-animation__stop-button'
                icon={<LabelPairedSquareLgFillIcon fill='#fff' />}
                onClick={() => {
                    setShouldDisable(true);
                    onStopBotClick();
                }}
                has_effect
                primary
            >
                <Localize i18n_default_text='Stop' />
            </Button>
            {is_paused ? (
                <Button
                    className='animation__resume-button'
                    id='db-animation__resume-button'
                    onClick={() => {
                        void onResumeButtonClick();
                    }}
                    has_effect
                    secondary
                >
                    <Localize i18n_default_text='Resume' />
                </Button>
            ) : (
                <Button
                    className='animation__pause-button'
                    id='db-animation__pause-button'
                    onClick={onPauseButtonClick}
                    has_effect
                    secondary
                >
                    <Localize i18n_default_text='Pause' />
                </Button>
            )}
        </div>
    );

    return (
        <div className={classnames('animation__wrapper', className)}>
            {should_show_tooltip ? (
                <div className='run__button_wrapper'>
                    <Tooltip
                        alignment={determineTooltipAlignment()}
                        message={localize('The Run button is disabled because no Bot has been created yet.')}
                        icon='info'
                        className='qs__tooltip'
                    />
                    <div style={{ opacity: 0.5, marginLeft: '8px' }}>{renderRunButton(true)}</div>
                </div>
            ) : is_stop_button_visible ? (
                renderActiveControls()
            ) : (
                <Button
                    is_disabled={(is_disabled && !is_unavailable_for_payment_agent) || contract_stage === 3}
                    className='animation__run-button'
                    id='db-animation__run-button'
                    icon={<LabelPairedPlayLgFillIcon fill='#fff' />}
                    onClick={() => {
                        setShouldDisable(true);
                        onRunButtonClick();
                    }}
                    has_effect
                    {...(!is_unavailable_for_payment_agent ? { green: true } : { primary: true })}
                >
                    <Localize i18n_default_text='Run' />
                </Button>
            )}
            <div
                className={classnames('animation__container', className, {
                    'animation--running': contract_stage > 0 && !is_paused,
                    'animation--paused': is_paused,
                    'animation--completed': show_overlay,
                    'animation--disabled': is_disabled,
                    'animation__container--with-execution': show_execution_mode,
                })}
            >
                {show_execution_mode && (
                    <div className='animation__execution-mode'>
                        <div className='animation__execution-mode-copy'>
                            <span className='animation__execution-mode-label'>{localize('Execution')}</span>
                            <span className='animation__execution-mode-value'>
                                {execution_mode === 'fast' ? localize('FAST') : localize('SLOW')}
                            </span>
                        </div>
                        <ToggleSwitch
                            id='db-animation__execution-toggle'
                            name='execution_mode'
                            is_enabled={execution_mode === 'fast'}
                            handleToggle={() => setExecutionMode(execution_mode === 'fast' ? 'slow' : 'fast')}
                            classNameLabel='animation__execution-mode-toggle'
                            classNameButton='animation__execution-mode-toggle-button'
                        />
                    </div>
                )}
                {show_overlay && <ContractResultOverlay profit={profit} />}
                <span
                    className={classnames('animation__text', {
                        'animation__text--with-execution': show_execution_mode,
                    })}
                >
                    <ContractStageText contract_stage={contract_stage} />
                    {is_paused ? ` · ${localize('Paused')}` : ''}
                </span>
                <div className='animation__progress'>
                    <div className='animation__progress-line'>
                        <div className={`animation__progress-bar animation__progress-${contract_stage}`} />
                    </div>
                    {status_classes.map((status_class, i) => (
                        <CircularWrapper key={`status_class-${status_class}-${i}`} className={status_class} />
                    ))}
                </div>
            </div>
        </div>
    );
});

export default TradeAnimation;
