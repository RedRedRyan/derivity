import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.over_under_percentage = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('{{ condition }} digit {{ digit }} percentage in last {{ count }} ticks', {
                condition: '%1',
                digit: '%2',
                count: '%3',
            }),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'CONDITION',
                    options: [
                        [localize('over'), 'over'],
                        [localize('under'), 'under'],
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
            tooltip: localize('Returns the percentage of recent last digits over or under the selected digit.'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Over/Under percentage'),
            description: localize('Compatibility block for legacy over/under percentage strategies.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.over_under_percentage = block => {
    const condition = block.getFieldValue('CONDITION') === 'under' ? '<' : '>';
    const digit =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'DIGIT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_NONE
        ) || 0;
    const count =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_NONE
        ) || 100;
    const code = `(function () {
        var digits = Bot.getLastDigitList().slice(-Number(${count}));
        var matches = 0;
        var index = 0;
        var percentage = 0;
        for (index = 0; index < digits.length; index += 1) {
            if (Number(digits[index]) ${condition} Number(${digit})) {
                matches += 1;
            }
        }
        percentage = digits.length ? (matches / digits.length) * 100 : 0;
        Bot.notify({
            className: 'journal__text--analysis',
            message:
                '${block.getFieldValue('CONDITION') === 'under' ? 'Under' : 'Over'} % for digit ' +
                Number(${digit}) +
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
    })()`;

    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};
