import { findValueByKeyRecursively, formatTime, getRoundedNumber, isEmptyObject } from '@/components/shared';
import { getLocalizedErrorMessage } from '@/constants/backend-error-messages';
import { config } from '@/external/bot-skeleton/constants';
import { localize } from '@deriv-com/translations';
import { observer as globalObserver } from '../../../utils/observer';
import { getSymbolRequestField, removeUndefinedFields } from '../../api/legacy-request';
import { error as logError } from './broadcast';

export const tradeOptionToProposal = (trade_option, purchase_reference) =>
    trade_option.contractTypes.map(type => {
        const proposal = {
            amount: trade_option.amount,
            basis: trade_option.basis,
            contract_type: type,
            currency: trade_option.currency,
            duration: trade_option.duration,
            duration_unit: trade_option.duration_unit,
            multiplier: trade_option.multiplier,
            ...getSymbolRequestField(trade_option.symbol),
            passthrough: {
                contract_type: type,
                purchase_reference,
            },
            proposal: 1,
        };
        if (trade_option.prediction !== undefined) {
            proposal.selected_tick = trade_option.prediction;
        }
        if (!['TICKLOW', 'TICKHIGH'].includes(type) && trade_option.prediction !== undefined) {
            proposal.barrier = trade_option.prediction;
        } else if (trade_option.barrierOffset !== undefined) {
            proposal.barrier = trade_option.barrierOffset;
        }
        if (trade_option.secondBarrierOffset !== undefined) {
            proposal.barrier2 = trade_option.secondBarrierOffset;
        }
        if (['MULTUP', 'MULTDOWN'].includes(type)) {
            proposal.duration = undefined;
            proposal.duration_unit = undefined;
        }
        if (['ACCU'].includes(type)) {
            proposal.duration = undefined;
            proposal.duration_unit = undefined;
            proposal.growth_rate = trade_option.growth_rate;
        }
        if (!isEmptyObject(trade_option.limit_order)) {
            proposal.limit_order = trade_option.limit_order;
        }
        return removeUndefinedFields(proposal);
    });

export const tradeOptionToBuy = (contract_type, trade_option) => {
    const buy = {
        buy: '1',
        price: trade_option.amount,
        parameters: {
            amount: trade_option.amount,
            basis: trade_option.basis,
            contract_type,
            currency: trade_option.currency,
            duration: trade_option.duration,
            duration_unit: trade_option.duration_unit,
            multiplier: trade_option.multiplier,
            ...getSymbolRequestField(trade_option.symbol),
        },
    };
    if (trade_option.prediction !== undefined) {
        buy.parameters.selected_tick = trade_option.prediction;
    }
    if (!['TICKLOW', 'TICKHIGH'].includes(contract_type) && trade_option.prediction !== undefined) {
        buy.parameters.barrier = trade_option.prediction;
    } else if (trade_option.barrierOffset !== undefined) {
        buy.parameters.barrier = trade_option.barrierOffset;
    }
    if (trade_option.secondBarrierOffset !== undefined) {
        buy.parameters.barrier2 = trade_option.secondBarrierOffset;
    }
    if (!isEmptyObject(trade_option.app_markup_percentage)) {
        buy.parameters.app_markup_percentage = trade_option.app_markup_percentage;
    }
    if (!isEmptyObject(trade_option.barrier_range)) {
        buy.parameters.barrier_range = trade_option.barrier_range;
    }
    if (!isEmptyObject(trade_option.date_expiry)) {
        buy.parameters.date_expiry = trade_option.date_expiry;
    }
    if (!isEmptyObject(trade_option.date_start)) {
        buy.parameters.date_start = trade_option.date_start;
    }
    if (!isEmptyObject(trade_option.product_type)) {
        buy.parameters.product_type = trade_option.product_type;
    }
    if (!isEmptyObject(trade_option.trading_period_start)) {
        buy.parameters.trading_period_start = trade_option.trading_period_start;
    }
    // This will be required only in the case of multiplier & accumulator contracts
    if (!isEmptyObject(trade_option.limit_order)) {
        buy.parameters.limit_order = trade_option.limit_order;
    }
    // This will be required only in the case of multiplier contracts
    if (['MULTUP', 'MULTDOWN'].includes(contract_type)) {
        buy.parameters.duration = undefined;
        buy.parameters.duration_unit = undefined;

        buy.parameters.multiplier = trade_option.multiplier;
    }
    // This will be required only in the case of accumulator contracts
    if (['ACCU'].includes(contract_type)) {
        buy.parameters.duration = undefined;
        buy.parameters.duration_unit = undefined;
        buy.parameters.growth_rate = trade_option.growth_rate;
    }
    return removeUndefinedFields(buy);
};

export const getDirection = ticks => {
    const { length } = ticks;
    const [tickOld, tickNew] = ticks.slice(-2);

    let direction = '';
    if (length >= 2) {
        direction = tickOld.quote < tickNew.quote ? 'rise' : direction;
        direction = tickOld.quote > tickNew.quote ? 'fall' : direction;
    }

    return direction;
};

export const getLastDigit = tick => {
    let number_string = tick;
    if (typeof number_string === 'number') {
        number_string = String(number_string);
    }
    return Number(number_string[number_string.length - 1]);
};

export const getLastDigitForList = (tick, pip_size = 0) => {
    const value = Number(tick).toFixed(pip_size);
    return value[value.length - 1];
};

const getBackoffDelayInMs = (error_obj, delay_index, execution_config = null) => {
    const base_delay = execution_config?.backoffBaseDelay ?? 2.5;
    const max_delay = execution_config?.backoffMaxDelay ?? 15;
    const next_delay_in_seconds = Math.min(base_delay * delay_index, max_delay);

    const { error = {}, msg_type = '', echo_req = {} } = error_obj;
    const { code = '', message = '' } = error;
    let message_to_print = '';
    const trade_type_block = Blockly.derivWorkspace
        .getAllBlocks(true)
        .find(block => block.type === 'trade_definition_tradetype');
    const selected_trade_type = trade_type_block?.getFieldValue('TRADETYPECAT_LIST') || '';
    const { TRADE_TYPE_CATEGORY_NAMES } = config();

    if (code) {
        const error_details = {
            message_type: error.msg_type,
            delay: next_delay_in_seconds,
            request: echo_req?.req_id,
            message: message || localize('The market is closed'),
            trade_type: TRADE_TYPE_CATEGORY_NAMES?.[selected_trade_type] ?? '',
        };

        switch (code) {
            case 'RateLimit':
                message_to_print = getLocalizedErrorMessage('RateLimit', error_details);
                break;
            case 'DisconnectError':
                message_to_print = getLocalizedErrorMessage('DisconnectError', error_details);
                break;
            case 'MarketIsClosed':
                message_to_print = getLocalizedErrorMessage('MarketIsClosed', error_details);
                break;

            default:
                message_to_print = getLocalizedErrorMessage('RequestFailed', {
                    message_type: msg_type || localize('unknown'),
                    delay: next_delay_in_seconds,
                });
                break;
        }
    } else {
        message_to_print = getLocalizedErrorMessage('RequestFailed', {
            message_type: msg_type || localize('unknown'),
            delay: next_delay_in_seconds,
        });
    }

    logError(message_to_print);

    return next_delay_in_seconds * 1000;
};

export const updateErrorMessage = error => {
    if (error.error?.code === 'InputValidationFailed') {
        if (error.error.details?.duration) {
            error.error.message = getLocalizedErrorMessage('DurationValidationFailed');
        }
        if (error.error.details?.amount) {
            error.error.message = getLocalizedErrorMessage('AmountValidationFailed');
        }
    }
};

export const shouldThrowError = (error, errors_to_ignore = []) => {
    if (!error.error) {
        return false;
    }

    const default_errors_to_ignore = [
        'CallError',
        'WrongResponse',
        'GetProposalFailure',
        'RateLimit',
        'DisconnectError',
        'MarketIsClosed',
    ];
    updateErrorMessage(error);
    const is_ignorable_error = errors_to_ignore
        .concat(default_errors_to_ignore)
        .includes(error?.error?.code ?? error?.name);

    return !is_ignorable_error;
};

export const recoverFromError = (promiseFn, recoverFn, errors_to_ignore, delay_index, api_base) => {
    return new Promise((resolve, reject) => {
        const promise = promiseFn();

        if (promise) {
            promise.then(resolve).catch(error => {
                if (shouldThrowError(error, errors_to_ignore) || (api_base && !api_base.is_running)) {
                    if (error?.error?.code === 'OpenPositionLimitExceeded') {
                        setTimeout(() => {
                            globalObserver.emit('bot.stop_button_click');
                        }, 500);
                    }

                    reject(error);
                    return;
                }
                recoverFn(
                    error?.error?.code ?? error?.name,
                    () =>
                        new Promise(recoverResolve => {
                            const getGlobalTimeouts = () => globalObserver.getState('global_timeouts') ?? [];

                            const executionConfig = api_base?.execution_config ?? null;

                            const timeout = setTimeout(
                                () => {
                                    const global_timeouts = getGlobalTimeouts();
                                    delete global_timeouts[timeout];
                                    globalObserver.setState(global_timeouts);
                                    recoverResolve();
                                },
                                getBackoffDelayInMs(error, delay_index, executionConfig)
                            );

                            const global_timeouts = getGlobalTimeouts();
                            const cancellable_timeouts = ['buy'];
                            const msg_type = findValueByKeyRecursively(error, 'msg_type');

                            global_timeouts[timeout] = {
                                is_cancellable: cancellable_timeouts.includes(msg_type),
                                msg_type,
                            };

                            globalObserver.setState({ global_timeouts });
                        })
                );
            });
        } else {
            resolve();
        }
    });
};

/**
 * @param {*} promiseFn api call - it could be api call or subscription
 * @param {*} errors_to_ignore list of errors to ignore
 * @param {*} api_base instance of APIBase class to check if the bot is running or not
 * @returns a new promise
 */
export const doUntilDone = (promiseFn, errors_to_ignore, api_base) => {
    let delay_index = 1;

    return new Promise((resolve, reject) => {
        const recoverFn = (error_code, makeDelay) => {
            delay_index++;
            makeDelay().then(repeatFn);
        };

        const repeatFn = () => {
            recoverFromError(promiseFn, recoverFn, errors_to_ignore, delay_index, api_base).then(resolve).catch(reject);
        };

        repeatFn();
    });
};

export const createDetails = (contract = {}) => {
    const { sell_price: sellPrice, buy_price: buyPrice, currency } = contract || {};
    const hasFinalPrices =
        sellPrice !== undefined &&
        sellPrice !== null &&
        sellPrice !== '' &&
        buyPrice !== undefined &&
        buyPrice !== null &&
        buyPrice !== '' &&
        Number.isFinite(Number(sellPrice)) &&
        Number.isFinite(Number(buyPrice));
    const profit = hasFinalPrices ? getRoundedNumber(Number(sellPrice) - Number(buyPrice), currency) : 0;
    const result = hasFinalPrices ? (profit < 0 ? 'loss' : 'win') : '';
    const formatContractTime = timestamp =>
        timestamp === undefined || timestamp === null || timestamp === ''
            ? ''
            : formatTime(parseInt(`${timestamp}000`), 'HH:mm:ss');

    return [
        contract.transaction_ids?.buy ?? contract.contract_id ?? '',
        Number(contract.buy_price) || 0,
        Number(contract.sell_price) || 0,
        profit,
        contract.contract_type || '',
        formatContractTime(contract.entry_tick_time),
        Number(contract.entry_tick) || 0,
        formatContractTime(contract.exit_tick_time),
        Number(contract.exit_tick) || 0,
        +(contract.barrier ? contract.barrier : 0),
        result,
    ];
};

export const getUUID = () => `${new Date().getTime() * Math.random()}`;

const hasBlockOfType = (targetType, workspace) => {
    const allBlocks = workspace.getAllBlocks();
    return allBlocks.some(block => block.type === targetType && !!block.parentBlock_);
};

export const checkBlocksForProposalRequest = () => {
    const workspace = window.Blockly.derivWorkspace;
    const has_payout_block = hasBlockOfType('payout', workspace);
    const has_smart_dynamic_purchase = hasBlockOfType('smart_purchase_contract', workspace);

    // Code for the future for case when basis: 'payout':
    // * Since basis : '${block.type === 'trade_definition_tradeoptions' ? 'stake' : 'payout'}'
    // * basis: 'payout' when contract_type: "MULTUP"
    // Uncomment next line later:
    // const is_basis_payout = !hasBlockOfType('trade_definition_tradeoptions', workspace);

    return {
        has_payout_block: has_payout_block || has_smart_dynamic_purchase,
        is_basis_payout: false,
    };
};

export const socket_state = {
    [WebSocket.CONNECTING]: 'Connecting',
    [WebSocket.OPEN]: 'Connected',
    [WebSocket.CLOSING]: 'Closing',
    [WebSocket.CLOSED]: 'Closed',
};
