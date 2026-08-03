import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

const CONDITION_OPTIONS = [
    [localize('less than'), 'lt'],
    [localize('greater than'), 'gt'],
    [localize('less than or equal to'), 'lte'],
    [localize('greater than or equal to'), 'gte'],
    [localize('equal to'), 'eq'],
    [localize('different from'), 'neq'],
    [localize('all odd'), 'all_odd'],
    [localize('all even'), 'all_even'],
];

const CONDITION_TEXT_MAP = {
    all_even: 'all even',
    all_odd: 'all odd',
    eq: 'equal to',
    gt: 'greater than',
    gte: 'greater than or equal to',
    lt: 'less than',
    lte: 'less than or equal to',
    neq: 'different from',
};

const OPERATOR_MAP = {
    eq: '===',
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
    neq: '!==',
};

const parityConditions = new Set(['all_odd', 'all_even']);

window.Blockly.Blocks.last_digits_condition = {
    init() {
        this.appendValueInput('COUNT').setCheck('Number').appendField(localize('Last'));
        this.appendDummyInput('CONDITION_ROW')
            .appendField(localize('digits are'))
            .appendField(new window.Blockly.FieldDropdown(CONDITION_OPTIONS), 'CONDITION');

        this.updateShape_(true);
        this.setOutput(true, 'Boolean');
        this.setOutputShape(window.Blockly.OUTPUT_SHAPE_ROUND);
        this.setColour(window.Blockly.Colours.Base.colour);
        this.setTooltip(localize('Checks if the last N digits all meet the selected condition'));
        this.category = window.Blockly.Categories.Tick_Analysis;

        this.setOnChange(event => {
            if (
                !event ||
                event.type !== window.Blockly.Events.BLOCK_CHANGE ||
                event.blockId !== this.id ||
                event.name !== 'CONDITION'
            ) {
                return;
            }

            this.updateShape_(!parityConditions.has(this.getFieldValue('CONDITION')));
        });
    },
    meta() {
        return {
            display_name: localize('Last Digits Condition'),
            description: localize('Checks if the last N digits meet the specified condition.'),
        };
    },
    mutationToDom() {
        const container = document.createElement('mutation');
        container.setAttribute('needs_digit_input', String(!parityConditions.has(this.getFieldValue('CONDITION'))));
        return container;
    },
    domToMutation(xmlElement) {
        const needs_digit_input = xmlElement.getAttribute('needs_digit_input') !== 'false';
        this.updateShape_(needs_digit_input);
    },
    updateShape_(needs_digit_input) {
        const existing_digit_input = this.getInput('DIGIT');

        if (needs_digit_input) {
            if (!existing_digit_input) {
                this.appendValueInput('DIGIT').setCheck('Number').appendField(localize('digit'));
            }
        } else if (existing_digit_input) {
            this.removeInput('DIGIT');
        }

        if (this.rendered) {
            this.initSvg();
            this.renderEfficiently();
        }
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    getRequiredValueInputs() {
        const required_inputs = {
            COUNT: null,
        };

        if (!parityConditions.has(this.getFieldValue('CONDITION'))) {
            required_inputs.DIGIT = null;
        }

        return required_inputs;
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.last_digits_condition = block => {
    const count =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_NONE
        ) || 3;
    const condition = block.getFieldValue('CONDITION');
    const condition_text = CONDITION_TEXT_MAP[condition] || 'less than';

    if (condition === 'all_odd' || condition === 'all_even') {
        const is_odd_check = condition === 'all_odd';

        return [
            `(function () {
                var digits = Bot.getLastDigitList().slice(-Math.max(1, Number(${count}) || 1));
                var requestedCount = Math.max(1, Number(${count}) || 1);
                var index = 0;
                var result = digits.length > 0;
                var digitsText = '';
                if (!digits.length) {
                    Bot.notify({
                        className: 'journal__text--analysis',
                        message:
                            'Scanning exact last ' +
                            requestedCount +
                            ' digits: none available yet. Result: False.',
                        sound: '',
                        analysis_append: true,
                        analysis_key: '${block.id}',
                    });
                    return false;
                }
                digitsText = digits.join(', ');
                for (index = 0; index < digits.length; index += 1) {
                    if (${is_odd_check ? 'Number(digits[index]) % 2 !== 1' : 'Number(digits[index]) % 2 !== 0'}) {
                        result = false;
                        break;
                    }
                }
                Bot.notify({
                    className: 'journal__text--analysis',
                    message:
                        'Scanning exact last ' +
                        requestedCount +
                        ' digits: [' +
                        digitsText +
                        ']. Digits available: ' +
                        digits.length +
                        '. Rule: every digit is ${condition_text}. Result: ' +
                        (result ? 'True' : 'False') +
                        '.',
                    sound: '',
                    analysis_append: true,
                    analysis_key: '${block.id}',
                });
                return result;
            })()`,
            window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL,
        ];
    }

    const digit =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'DIGIT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_NONE
        ) || 4;
    const operator = OPERATOR_MAP[condition] || '<';

    return [
        `(function () {
            var digits = Bot.getLastDigitList().slice(-Math.max(1, Number(${count}) || 1));
            var target = Number(${digit});
            var requestedCount = Math.max(1, Number(${count}) || 1);
            var index = 0;
            var result = true;
            var digitsText = '';
            if (!digits.length) {
                Bot.notify({
                    className: 'journal__text--analysis',
                    message:
                        'Scanning exact last ' +
                        requestedCount +
                        ' digits: none available yet. Result: False.',
                    sound: '',
                    analysis_append: true,
                    analysis_key: '${block.id}',
                });
                return false;
            }
            digitsText = digits.join(', ');
            for (index = 0; index < digits.length; index += 1) {
                if (!(Number(digits[index]) ${operator} target)) {
                    result = false;
                    break;
                }
            }
            Bot.notify({
                className: 'journal__text--analysis',
                message:
                    'Scanning exact last ' +
                    requestedCount +
                    ' digits: [' +
                    digitsText +
                    ']. Digits available: ' +
                    digits.length +
                    '. Rule: every digit is ${condition_text} ' +
                    target +
                    '. Result: ' +
                    (result ? 'True' : 'False') +
                    '.',
                sound: '',
                analysis_append: true,
                analysis_key: '${block.id}',
            });
            return result;
        })()`,
        window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL,
    ];
};
