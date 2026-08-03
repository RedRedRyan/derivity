import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.digit_frequency_analysis = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('{{ rank }} frequent digit from last {{ count }} digits', {
                rank: '%1',
                count: '%2',
            }),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'RANK',
                    options: [
                        [localize('Most'), 'most'],
                        [localize('Least'), 'least'],
                    ],
                },
                {
                    type: 'input_value',
                    name: 'COUNT',
                    check: 'Number',
                },
            ],
            output: 'Number',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Finds frequency patterns in the last N digits and returns the selected ranking'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Digit Frequency Analysis'),
            description: localize('Finds frequency patterns in the last N digits and returns the selected ranking.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.digit_frequency_analysis = block => {
    const count =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_NONE
        ) || 1000;
    const rank = block.getFieldValue('RANK');
    const order =
        rank === 'least' ? 'a.count - b.count || a.digit - b.digit' : 'b.count - a.count || a.digit - b.digit';

    return [
        `(function () {
            var digits = Bot.getLastDigitList().slice(-Math.max(1, Number(${count}) || 1));
            var frequency = [];
            var current_digit = 0;
            var index = 0;
            var matches = 0;
            var result = 0;
            for (current_digit = 0; current_digit < 10; current_digit += 1) {
                matches = 0;
                for (index = 0; index < digits.length; index += 1) {
                    if (Number(digits[index]) === current_digit) {
                        matches += 1;
                    }
                }
                frequency.push({
                    digit: current_digit,
                    count: matches,
                });
            }
            frequency.sort(function (a, b) {
                return ${order};
            });
            result = frequency.length ? frequency[0].digit : 0;
            Bot.notify({
                className: 'journal__text--analysis',
                message:
                    '${rank === 'least' ? 'Least' : 'Most'} frequent digit from last ' +
                    Number(${count}) +
                    ' digits: ' +
                    result,
                sound: '',
                analysis_append: true,
                analysis_key: '${block.id}',
            });
            return result;
        })()`,
        window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL,
    ];
};
