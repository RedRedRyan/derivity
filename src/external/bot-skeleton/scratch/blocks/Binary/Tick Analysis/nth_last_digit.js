import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.nth_last_digit = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Nth Last Digit {{ n }}', { n: '%1' }),
            args0: [
                {
                    type: 'input_value',
                    name: 'INDEX',
                    check: 'Number',
                },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Returns the last digit of the Nth previous tick value'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Nth Last Digit'),
            description: localize('This block gives you the last digit of the Nth previous tick value.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.nth_last_digit = block => {
    const index =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'INDEX',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_NONE
        ) || 1;

    return [
        `(function () {
            var digits = Bot.getLastDigitList();
            var offset = Math.max(1, Number(${index}) || 1);
            return digits.length >= offset ? Number(digits[digits.length - offset]) : 0;
        })()`,
        window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL,
    ];
};
