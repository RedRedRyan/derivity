import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.tri_mode_signal_value = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Sequence {{ value_type }} from signal {{ signal }}', {
                value_type: '%1',
                signal: '%2',
            }),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'VALUE_TYPE',
                    options: [
                        [localize('step number'), 'MODE'],
                        [localize('contract type'), 'CONTRACT'],
                        [localize('prediction'), 'PREDICTION'],
                        [localize('duration'), 'DURATION'],
                    ],
                },
                {
                    type: 'input_value',
                    name: 'SIGNAL',
                    check: 'Number',
                },
            ],
            output: null,
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize('Converts a six-contract sequence signal into the selected trade parameter.'),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Six-contract sequence value'),
            description: localize('Returns the sequence step, contract, prediction, or duration for a signal.'),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.tri_mode_signal_value = block => {
    const signal =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'SIGNAL',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_NONE
        ) || 0;
    const value_type = block.getFieldValue('VALUE_TYPE');
    const expressions = {
        MODE: `(function (signal) {
            if (signal === 20) return 1;
            if (signal === 21) return 2;
            if (signal === 22) return 3;
            if (signal === 23) return 4;
            if (signal === 30) return 5;
            if (signal === 31) return 6;
            return 0;
        })(Number(${signal}))`,
        CONTRACT: `(function (signal) {
            if (signal === 20) return 'DIGITOVER';
            if (signal === 21) return 'DIGITUNDER';
            if (signal === 22) return 'DIGITEVEN';
            if (signal === 23) return 'DIGITODD';
            if (signal === 30) return 'CALL';
            if (signal === 31) return 'PUT';
            return '';
        })(Number(${signal}))`,
        PREDICTION: `(function (signal) {
            if (signal === 20) return 4;
            if (signal === 21) return 5;
            return 0;
        })(Number(${signal}))`,
        DURATION: `(function (signal) {
            if (signal === 30 || signal === 31) return 3;
            return signal > 0 ? 1 : 0;
        })(Number(${signal}))`,
    };

    return [expressions[value_type] || '0', window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};
