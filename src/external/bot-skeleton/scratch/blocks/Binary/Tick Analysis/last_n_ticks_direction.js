import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.last_n_ticks_direction = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Last {{ count }} ticks direction is {{ direction }}', {
                count: '%1',
                direction: '%2',
            }),
            args0: [
                {
                    type: 'input_value',
                    name: 'COUNT',
                    check: 'Number',
                },
                {
                    type: 'field_dropdown',
                    name: 'DIRECTION',
                    options: [
                        [localize('Rise'), 'rise'],
                        [localize('Fall'), 'fall'],
                    ],
                },
            ],
            output: 'Boolean',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Checks if the last N ticks are all rising or all falling'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Last N Ticks Direction'),
            description: localize('This block checks if the last N ticks are all rising or all falling.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.last_n_ticks_direction = block => {
    const count =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_NONE
        ) || 5;
    const direction = block.getFieldValue('DIRECTION');
    const operator = direction === 'fall' ? '<' : '>';

    return [
        `(function () {
            var size = Math.max(2, Number(${count}) || 2);
            var raw_ticks = Bot.getTicks(false).slice(-size);
            var ticks = [];
            var index = 0;
            var result = true;
            for (index = 0; index < raw_ticks.length; index += 1) {
                ticks.push(Number(raw_ticks[index]));
            }
            if (ticks.length < size) {
                Bot.notify({
                    className: 'journal__text--analysis',
                    message: 'Waiting: Last ' + size + ' ticks are not available yet.',
                    sound: '',
                    analysis_append: true,
                    analysis_key: '${block.id}',
                });
                return false;
            }
            for (index = 1; index < ticks.length; index += 1) {
                if (!(ticks[index] ${operator} ticks[index - 1])) {
                    result = false;
                    break;
                }
            }
            Bot.notify({
                className: 'journal__text--analysis',
                message: result
                    ? 'Condition met: Last ' + size + ' ticks direction is ${direction === 'fall' ? 'Fall' : 'Rise'}. Purchasing contract.'
                    : 'Waiting: Last ' + size + ' ticks direction is not yet ${direction === 'fall' ? 'Fall' : 'Rise'}.',
                sound: '',
                analysis_append: true,
                analysis_key: '${block.id}',
            });
            return result;
        })()`,
        window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL,
    ];
};
