import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.second_last_digit = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Second Last Digit'),
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Returns the last digit of the previous tick value'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Second Last Digit'),
            description: localize('This block gives you the last digit of the previous tick value.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.second_last_digit = () => [
    `(function () {
        var digits = Bot.getLastDigitList();
        return digits.length > 1 ? Number(digits[digits.length - 2]) : 0;
    })()`,
    window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL,
];
