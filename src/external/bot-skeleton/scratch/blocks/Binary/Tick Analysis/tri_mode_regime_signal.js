import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.tri_mode_regime_signal = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Six-contract sequence trigger analysis'),
            message1: localize(
                'pull the latest {{ history }} ticks directly from Deriv before purchase; sequence step {{ sequence_step }}',
                {
                    history: '%1',
                    sequence_step: '%2',
                }
            ),
            args1: [
                { type: 'input_value', name: 'HISTORY', check: 'Number' },
                { type: 'input_value', name: 'SEQUENCE_STEP', check: 'Number' },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize(
                'Analyses fresh Deriv history and only triggers the current sequence contract after its required opposite pattern appears three times in a row.'
            ),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Six-contract sequence trigger analysis'),
            description: localize(
                'Pulls fresh tick history before every purchase and advances the fixed Over, Under, Even, Odd, Rise, Fall sequence only after each step gets its three-in-a-row trigger.'
            ),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

const valueToCode = (block, input_name, fallback) =>
    window.Blockly.JavaScript.javascriptGenerator.valueToCode(
        block,
        input_name,
        window.Blockly.JavaScript.javascriptGenerator.ORDER_NONE
    ) || fallback;

window.Blockly.JavaScript.javascriptGenerator.forBlock.tri_mode_regime_signal = block => {
    const history = valueToCode(block, 'HISTORY', '100');
    const sequence_step = valueToCode(block, 'SEQUENCE_STEP', '0');

    window.Blockly.JavaScript.javascriptGenerator.definitions_.tri_mode_recovery_state = `var BinaryBotPrivateTriModeRecoveryState = {
        baseStake: 1,
        consecutiveLosses: 0,
        cumulativeLoss: 0,
        lastProcessedReference: '',
        activeRecoveryStake: 0
    };`;

    return [
        `(function () {
            var historySize = Math.min(5000, Math.max(10, Math.floor(Number(${history}) || 100)));
            var historyData = Bot.getRecentTickAnalysisData(historySize);
            var digits = historyData && historyData.digits ? historyData.digits : [];
            var ticks = historyData && historyData.ticks ? historyData.ticks : [];
            var sequenceSignals = [20, 21, 22, 23, 30, 31];
            var sequenceNames = ['OVER 4', 'UNDER 5', 'EVEN', 'ODD', 'RISE', 'FALL'];
            var sequenceIndex = Math.floor(Math.max(0, Number(${sequence_step}) || 0)) % 6;
            var signal = sequenceSignals[sequenceIndex];
            var overCount = 0;
            var underCount = 0;
            var evenCount = 0;
            var oddCount = 0;
            var riseCount = 0;
            var fallCount = 0;
            var validDigitCount = 0;
            var movementCount = 0;
            var index = 0;
            var digit = 0;
            var previousTick = 0;
            var currentTick = 0;
            var latestDigits = [];
            var latestMovements = [];
            var shouldTrade = false;
            var triggerSummary = '';
            var recoverySummary = '';
            var lastContractReference = '';
            var lastContractProfit = 0;
            var lastContractResult = '';
            var percentage = function (count, total) {
                return total ? Math.round((count / total) * 10000) / 100 : 0;
            };
            var hasConsecutiveDigits = function (predicate) {
                if (latestDigits.length < 3) {
                    return false;
                }
                return predicate(latestDigits[0]) && predicate(latestDigits[1]) && predicate(latestDigits[2]);
            };
            var hasConsecutiveMovements = function (movement) {
                if (latestMovements.length < 3) {
                    return false;
                }
                return latestMovements[0] === movement && latestMovements[1] === movement && latestMovements[2] === movement;
            };

            try {
                lastContractReference = String(Bot.readDetails(1) || '');
                lastContractProfit = Number(Bot.readDetails(4)) || 0;
                lastContractResult = String(Bot.readDetails(11) || '');
            } catch (error) {
                lastContractReference = '';
                lastContractProfit = 0;
                lastContractResult = '';
            }

            if (
                lastContractReference &&
                BinaryBotPrivateTriModeRecoveryState.lastProcessedReference !== lastContractReference
            ) {
                BinaryBotPrivateTriModeRecoveryState.lastProcessedReference = lastContractReference;
                if (lastContractResult === 'loss' || lastContractProfit < 0) {
                    BinaryBotPrivateTriModeRecoveryState.consecutiveLosses += 1;
                    BinaryBotPrivateTriModeRecoveryState.cumulativeLoss =
                        Math.round(
                            (BinaryBotPrivateTriModeRecoveryState.cumulativeLoss + Math.abs(lastContractProfit)) * 100000000
                        ) / 100000000;
                    BinaryBotPrivateTriModeRecoveryState.activeRecoveryStake = 0;
                    recoverySummary =
                        ' Loss tracker: consecutive losses ' +
                        BinaryBotPrivateTriModeRecoveryState.consecutiveLosses +
                        ', cumulative recovery target ' +
                        BinaryBotPrivateTriModeRecoveryState.cumulativeLoss +
                        '.';
                    Bot.notify({
                        className: 'journal__text--warn',
                        message:
                            'Tri-Mode recovery updated after loss. Consecutive losses: ' +
                            BinaryBotPrivateTriModeRecoveryState.consecutiveLosses +
                            '. Recovery target now ' +
                            BinaryBotPrivateTriModeRecoveryState.cumulativeLoss +
                            '.',
                        sound: '',
                    });
                } else if (lastContractResult === 'win' || lastContractProfit > 0) {
                    BinaryBotPrivateTriModeRecoveryState.consecutiveLosses = 0;
                    BinaryBotPrivateTriModeRecoveryState.cumulativeLoss = 0;
                    BinaryBotPrivateTriModeRecoveryState.activeRecoveryStake = 0;
                    recoverySummary = ' Recovery tracker reset after a win.';
                    Bot.notify({
                        className: 'journal__text--success',
                        message: 'Tri-Mode recovery reset after a winning trade. Returning to the base stake.',
                        sound: '',
                    });
                }
            }

            if (digits.length < 10 || ticks.length < 2) {
                Bot.notify({
                    className: 'journal__text--warn',
                    message:
                        'Sequence analysis stopped: Deriv returned ' +
                        digits.length +
                        ' digits and ' +
                        ticks.length +
                        ' ticks; at least 10 digits and 2 ticks are required before purchase.',
                    sound: '',
                });
                return 0;
            }

            for (index = 0; index < digits.length; index += 1) {
                digit = Number(digits[index]);
                if (digit >= 0 && digit <= 9) {
                    validDigitCount += 1;
                    if (digit > 4) {
                        overCount += 1;
                    } else {
                        underCount += 1;
                    }
                    if (digit % 2 === 0) {
                        evenCount += 1;
                    } else {
                        oddCount += 1;
                    }
                }
            }

            for (index = digits.length - 3; index < digits.length; index += 1) {
                digit = Number(digits[index]);
                if (digit >= 0 && digit <= 9) {
                    latestDigits.push(digit);
                }
            }

            for (index = 1; index < ticks.length; index += 1) {
                previousTick = Number(ticks[index - 1]);
                currentTick = Number(ticks[index]);
                if (currentTick > previousTick) {
                    riseCount += 1;
                    latestMovements.push('RISE');
                } else if (currentTick < previousTick) {
                    fallCount += 1;
                    latestMovements.push('FALL');
                } else {
                    latestMovements.push('FLAT');
                }
                movementCount += 1;
            }

            latestMovements = latestMovements.slice(-3);

            if (validDigitCount < 10) {
                Bot.notify({
                    className: 'journal__text--warn',
                    message: 'Sequence analysis stopped: valid digit history is incomplete. No contract was purchased.',
                    sound: '',
                });
                return 0;
            }

            if (signal === 20) {
                shouldTrade = hasConsecutiveDigits(function (value) {
                    return value < 4;
                });
                triggerSummary = shouldTrade
                    ? 'Trigger matched: last three digits were all below 4, so OVER 4 is ready now.'
                    : 'Waiting for OVER 4 trigger: need the latest three digits to all stay below 4.';
            } else if (signal === 21) {
                shouldTrade = hasConsecutiveDigits(function (value) {
                    return value > 5;
                });
                triggerSummary = shouldTrade
                    ? 'Trigger matched: last three digits were all above 5, so UNDER 5 is ready now.'
                    : 'Waiting for UNDER 5 trigger: need the latest three digits to all stay above 5.';
            } else if (signal === 22) {
                shouldTrade = hasConsecutiveDigits(function (value) {
                    return value % 2 !== 0;
                });
                triggerSummary = shouldTrade
                    ? 'Trigger matched: three consecutive odd digits appeared, so EVEN is ready now.'
                    : 'Waiting for EVEN trigger: need three consecutive odd digits first.';
            } else if (signal === 23) {
                shouldTrade = hasConsecutiveDigits(function (value) {
                    return value % 2 === 0;
                });
                triggerSummary = shouldTrade
                    ? 'Trigger matched: three consecutive even digits appeared, so ODD is ready now.'
                    : 'Waiting for ODD trigger: need three consecutive even digits first.';
            } else if (signal === 30) {
                shouldTrade = hasConsecutiveMovements('FALL');
                triggerSummary = shouldTrade
                    ? 'Trigger matched: the last three tick moves all fell, so RISE is ready now with 3-tick duration.'
                    : 'Waiting for RISE trigger: need the last three tick moves to all fall first.';
            } else if (signal === 31) {
                shouldTrade = hasConsecutiveMovements('RISE');
                triggerSummary = shouldTrade
                    ? 'Trigger matched: the last three tick moves all rose, so FALL is ready now with 3-tick duration.'
                    : 'Waiting for FALL trigger: need the last three tick moves to all rise first.';
            }

            Bot.notify({
                className: 'journal__text--analysis',
                message:
                    'Direct Deriv analysis before purchase: ' +
                    validDigitCount +
                    ' digits; Over 4 ' +
                    percentage(overCount, validDigitCount) +
                    '%, Under 5 ' +
                    percentage(underCount, validDigitCount) +
                    '%, Even ' +
                    percentage(evenCount, validDigitCount) +
                    '%, Odd ' +
                    percentage(oddCount, validDigitCount) +
                    '%, Rise ' +
                    percentage(riseCount, movementCount) +
                    '%, Fall ' +
                    percentage(fallCount, movementCount) +
                    '%. Latest digits: ' +
                    latestDigits.join(', ') +
                    '. Latest tick moves: ' +
                    latestMovements.join(', ') +
                    '. Next contract: ' +
                    sequenceNames[sequenceIndex] +
                    ' (step ' +
                    (sequenceIndex + 1) +
                    ' of 6). ' +
                    triggerSummary +
                    recoverySummary,
                sound: '',
            });

            return shouldTrade ? signal : 0;
        })()`,
        window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL,
    ];
};
