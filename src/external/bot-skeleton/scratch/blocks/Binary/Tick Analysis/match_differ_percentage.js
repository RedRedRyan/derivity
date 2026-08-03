import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.match_differ_percentage = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('{{ mode }} %% for digit {{ digit }} in last {{ count }} ticks', {
                mode: '%1',
                digit: '%2',
                count: '%3',
            }),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'MODE',
                    options: [
                        [localize('Match'), 'match'],
                        [localize('Differ'), 'differ'],
                    ],
                },
                {
                    type: 'input_value',
                    name: 'DIGIT',
                    check: 'Number',
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
            tooltip: localize('Returns the percentage of digits matching or differing from the selected value'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Match/Differ Analysis'),
            description: localize(
                'Returns the percentage of digits matching or differing from the specified value in the last N ticks.'
            ),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.match_differ_percentage = block => {
    const digit =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'DIGIT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_NONE
        ) || 5;
    const count =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_NONE
        ) || 1000;
    const mode = block.getFieldValue('MODE');
    const operator = mode === 'differ' ? '!==' : '===';

    return [
        `(function () {
            var digits = Bot.getLastDigitList().slice(-Math.max(1, Number(${count}) || 1));
            var target = Number(${digit});
            var matches = 0;
            var index = 0;
            var percentage = 0;
            for (index = 0; index < digits.length; index += 1) {
                if (Number(digits[index]) ${operator} target) {
                    matches += 1;
                }
            }
            percentage = digits.length ? (matches / digits.length) * 100 : 0;
            Bot.notify({
                className: 'journal__text--analysis',
                message:
                    '${mode === 'differ' ? 'Differ' : 'Match'} % for digit ' +
                    target +
                    ' in last ' +
                    Number(${count}) +
                    ' ticks: ' +
                    (Math.round(percentage * 100) / 100) +
                    '%',
                sound: '',
                analysis_append: true,
                analysis_key: '${block.id}',
            });
            return percentage;
        })()`,
        window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL,
    ];
};
