import { getDecimalPlaces } from '@/components/shared';
import { localize } from '@deriv-com/translations';
import DBotStore from '../../../dbot-store';
import { excludeOptionFromContextMenu, modifyContextMenu } from '../../../utils';

const DURATION_TYPE_OPTIONS = [
    [localize('ticks'), 't'],
    [localize('seconds'), 's'],
    [localize('minutes'), 'm'],
    [localize('hours'), 'h'],
];

window.Blockly.Blocks.smart_purchase_contract = {
    purchase_capability: true,
    init() {
        this.jsonInit(this.definition());
        this.setNextStatement(false);
    },
    definition() {
        return {
            message0: localize('Smart purchase contract {{ contract_type }}', { contract_type: '%1' }),
            message1: localize('Stake {{ amount }} Duration {{ duration }} {{ duration_unit }}', {
                amount: '%1',
                duration: '%2',
                duration_unit: '%3',
            }),
            message2: localize('Prediction {{ prediction }}', { prediction: '%1' }),
            message3: localize('Start exact recovery after {{ loss_count }} consecutive losses', {
                loss_count: '%1',
            }),
            args0: [
                {
                    type: 'input_value',
                    name: 'CONTRACT_TYPE',
                },
            ],
            args1: [
                {
                    type: 'input_value',
                    name: 'AMOUNT',
                    check: 'Number',
                },
                {
                    type: 'input_value',
                    name: 'DURATION',
                    check: 'Number',
                },
                {
                    type: 'field_dropdown',
                    name: 'DURATIONTYPE_LIST',
                    options: DURATION_TYPE_OPTIONS,
                },
            ],
            args2: [
                {
                    type: 'input_value',
                    name: 'PREDICTION',
                    check: 'Number',
                },
            ],
            args3: [
                {
                    type: 'input_value',
                    name: 'RECOVERY_AFTER',
                    check: 'Number',
                },
            ],
            previousStatement: null,
            colour: window.Blockly.Colours.Special1.colour,
            colourSecondary: window.Blockly.Colours.Special1.colourSecondary,
            colourTertiary: window.Blockly.Colours.Special1.colourTertiary,
            tooltip: localize('Purchases Over, Under, Even, Odd, Rise, or Fall using the supplied fixed stake.'),
            category: window.Blockly.Categories.Before_Purchase,
        };
    },
    meta() {
        return {
            display_name: localize('Smart purchase contract'),
            description: localize(
                'Purchases the next contract in a runtime-selected Over, Under, Even, Odd, Rise, or Fall sequence.'
            ),
            key_words: localize('buy, dynamic, contract'),
        };
    },
    customContextMenu(menu) {
        const menu_items = [localize('Enable Block'), localize('Disable Block')];
        excludeOptionFromContextMenu(menu, menu_items);
        modifyContextMenu(menu);
    },
    restricted_parents: ['before_purchase'],
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.smart_purchase_contract = block => {
    if (!DBotStore?.instance?.client) return '';

    const { currency } = DBotStore.instance.client;
    const decimal_places = getDecimalPlaces(currency);
    const contract_type =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'CONTRACT_TYPE',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || "''";
    const amount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'AMOUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '0';
    const duration =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'DURATION',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '1';
    const prediction =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'PREDICTION',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '0';
    const duration_type = block.getFieldValue('DURATIONTYPE_LIST') || 't';
    const recovery_after =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'RECOVERY_AFTER',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '2';

    window.Blockly.JavaScript.javascriptGenerator.definitions_.tri_mode_recovery_state = `var BinaryBotPrivateTriModeRecoveryState = {
        baseStake: 1,
        consecutiveLosses: 0,
        cumulativeLoss: 0,
        lastProcessedReference: '',
        activeRecoveryStake: 0
    };`;

    return `
        (function () {
            var contractType = String(${contract_type} || 'DIGITOVER').toUpperCase();
            var supportedContractTypes = [
                'DIGITOVER',
                'DIGITUNDER',
                'DIGITEVEN',
                'DIGITODD',
                'CALL',
                'PUT'
            ];
            if (supportedContractTypes.indexOf(contractType) === -1) {
                Bot.notify({
                    className: 'journal__text--warn',
                    message: 'Unknown contract type "' + contractType + '". Falling back to DIGITOVER.',
                    sound: '',
                });
                contractType = 'DIGITOVER';
            }
            var baseStakeValue = +(Number(${amount}).toFixed(${decimal_places}));
            var durationValue = Number(${duration}) || 1;
            var predictionValue = Number(${prediction});
            var predictionContractTypes = ['DIGITOVER', 'DIGITUNDER'];
            var requiresPrediction = predictionContractTypes.indexOf(contractType) !== -1;
            var proposalAttemptLimit = 20;
            var proposalWaitSeconds = 0.25;
            var decimalFactor = Math.pow(10, ${decimal_places});
            var recoveryState = BinaryBotPrivateTriModeRecoveryState;
            var recoveryAfterLosses = Math.max(2, Math.floor(Number(${recovery_after}) || 2));
            var useRecovery =
                recoveryState.consecutiveLosses >= recoveryAfterLosses && recoveryState.cumulativeLoss > 0;
            recoveryState.baseStake = baseStakeValue;
            var createTradeOptions = function (stakeValue) {
                return {
                    limitations        : BinaryBotPrivateLimitations,
                    contractTypes      : [contractType],
                    duration           : durationValue,
                    duration_unit      : '${duration_type}',
                    currency           : '${currency}',
                    amount             : stakeValue,
                    prediction         : requiresPrediction ? predictionValue : undefined,
                    barrierOffset      : undefined,
                    secondBarrierOffset: undefined,
                    basis              : 'stake',
                    preserve_duration  : true,
                };
            };
            var requestProposalAndMaybeRecover = function (attempt) {
                var askPrice = 0;
                var payoutValue = 0;
                var profitRatio = 0;
                var requiredStake = 0;

                try {
                    askPrice = Number(Bot.getAskPrice(contractType));
                    payoutValue = Number(Bot.getPayout(contractType));
                } catch (error) {
                    askPrice = 0;
                    payoutValue = 0;
                }

                if (!(askPrice > 0) || !(payoutValue > askPrice)) {
                    if (attempt >= proposalAttemptLimit) {
                        Bot.notify({
                            className: 'journal__text--warn',
                            message:
                                'Proposal data was not ready for ' +
                                contractType +
                                '. Skipping this purchase cycle so the next tick can try again safely.',
                            sound: '',
                        });
                        return;
                    }
                    sleep(proposalWaitSeconds);
                    requestProposalAndMaybeRecover(attempt + 1);
                    return;
                }

                if (useRecovery) {
                    profitRatio = (payoutValue - askPrice) / askPrice;
                    if (!(profitRatio > 0)) {
                        Bot.notify({
                            className: 'journal__text--warn',
                            message:
                                'Recovery mode could not calculate a valid payout ratio for ' +
                                contractType +
                                '. Falling back to the base stake.',
                            sound: '',
                        });
                        useRecovery = false;
                    } else {
                        requiredStake = recoveryState.cumulativeLoss / profitRatio;
                        requiredStake = Math.ceil(requiredStake * decimalFactor) / decimalFactor;
                        recoveryState.activeRecoveryStake = requiredStake;
                        Bot.notify({
                            className: 'journal__text--info',
                            message:
                                'Recovery mode active after ' +
                                recoveryState.consecutiveLosses +
                                ' consecutive losses. Target recovery ' +
                                recoveryState.cumulativeLoss +
                                ' ${currency}; next stake ' +
                                requiredStake +
                                ' ${currency} on ' +
                                contractType +
                                '.',
                            sound: '',
                        });
                        Bot.start(createTradeOptions(requiredStake));
                        confirmFinalProposalAndPurchase(0, requiredStake);
                        return;
                    }
                }

                recoveryState.activeRecoveryStake = 0;
                Bot.notify({
                    className: 'journal__text--info',
                    message:
                        'Purchase request: ' +
                        contractType +
                        ' | stake ' +
                        baseStakeValue +
                        ' ${currency} | duration ' +
                        durationValue +
                        ' ${duration_type}' +
                        (requiresPrediction ? ' | prediction ' + predictionValue : '') +
                        (recoveryState.consecutiveLosses > 0
                            ? ' | recovery waiting until ' + recoveryAfterLosses + ' consecutive losses'
                            : ''),
                    sound: '',
                });
                Bot.purchase(contractType);
            };
            var confirmFinalProposalAndPurchase = function (attempt, stakeValue) {
                var askPrice = 0;
                var payoutValue = 0;

                try {
                    askPrice = Number(Bot.getAskPrice(contractType));
                    payoutValue = Number(Bot.getPayout(contractType));
                } catch (error) {
                    askPrice = 0;
                    payoutValue = 0;
                }

                if (!(askPrice > 0) || !(payoutValue > askPrice)) {
                    if (attempt >= proposalAttemptLimit) {
                        Bot.notify({
                            className: 'journal__text--warn',
                            message:
                                'Recovery proposal for ' +
                                contractType +
                                ' was not ready in time. Skipping this purchase cycle to avoid a wrong stake.',
                            sound: '',
                        });
                        return;
                    }
                    sleep(proposalWaitSeconds);
                    confirmFinalProposalAndPurchase(attempt + 1, stakeValue);
                    return;
                }

                Bot.notify({
                    className: 'journal__text--info',
                    message:
                        'Purchase request: ' +
                        contractType +
                        ' | recovery stake ' +
                        stakeValue +
                        ' ${currency} | duration ' +
                        durationValue +
                        ' ${duration_type}' +
                        (requiresPrediction ? ' | prediction ' + predictionValue : '') +
                        ' | target recovers cumulative losses only.',
                    sound: '',
                });
                Bot.purchase(contractType);
            };

            Bot.start(createTradeOptions(baseStakeValue));
            requestProposalAndMaybeRecover(0);
        })();
    \n`;
};
