import { normalizeBotXml } from './index';

const parseXml = (xmlText: string) => new DOMParser().parseFromString(xmlText, 'application/xml');

describe('normalizeBotXml', () => {
    it('converts riskmanagers option helper blocks into standard Blockly blocks', () => {
        const xml = parseXml(`
            <xml xmlns="https://developers.google.com/blockly/xml" is_dbot="true" collection="false">
                <variables>
                    <variable id="trade-type-id">TRADE TYPE</variable>
                </variables>
                <block type="trade_definition" id="root">
                    <statement name="INITIALIZATION">
                        <block type="variables_set_option" id="set-option">
                            <mutation options="%5B%5D"></mutation>
                            <field name="VAR" id="trade-type-id">TRADE TYPE</field>
                            <field name="OPTION">Even Odd</field>
                        </block>
                    </statement>
                </block>
                <block type="before_purchase" id="before">
                    <statement name="BEFOREPURCHASE_STACK">
                        <block type="controls_if" id="if-block">
                            <value name="IF0">
                                <block type="variables_is_option" id="is-option">
                                    <mutation options="%5B%5D"></mutation>
                                    <field name="VAR" id="trade-type-id">TRADE TYPE</field>
                                    <field name="OPTION">Even Odd</field>
                                </block>
                            </value>
                        </block>
                    </statement>
                </block>
            </xml>
        `);

        normalizeBotXml(xml);

        const option_set_block = xml.querySelector('#set-option');
        expect(option_set_block?.getAttribute('type')).toBe('variables_set');
        expect(
            option_set_block?.querySelector('value[name="VALUE"] block[type="text"] field[name="TEXT"]')?.textContent
        ).toBe('Even Odd');

        const option_compare_block = xml.querySelector('#is-option');
        expect(option_compare_block?.getAttribute('type')).toBe('logic_compare');
        expect(option_compare_block?.querySelector('field[name="OP"]')?.textContent).toBe('EQ');
        expect(
            option_compare_block?.querySelector('value[name="A"] block[type="variables_get"] field[name="VAR"]')
                ?.textContent
        ).toBe('TRADE TYPE');
        expect(
            option_compare_block?.querySelector('value[name="B"] block[type="text"] field[name="TEXT"]')?.textContent
        ).toBe('Even Odd');
    });

    it('converts apollo_purchase2 blocks into dynamic smart purchase blocks', () => {
        const xml = parseXml(`
            <xml xmlns="https://developers.google.com/blockly/xml" is_dbot="true" collection="false">
                <block type="trade_definition" id="trade-root">
                    <statement name="SUBMARKET">
                        <block type="trade_definition_tradeoptions" id="trade-options">
                            <mutation has_first_barrier="false" has_second_barrier="false" has_prediction="false"></mutation>
                            <field name="DURATIONTYPE_LIST">t</field>
                            <value name="DURATION">
                                <block type="math_number"><field name="NUM">1</field></block>
                            </value>
                            <value name="AMOUNT">
                                <shadow type="math_number_positive"><field name="NUM">1</field></shadow>
                                <block type="variables_get">
                                    <field name="VAR" id="stake-id">Stake</field>
                                </block>
                            </value>
                        </block>
                    </statement>
                </block>
                <variables>
                    <variable id="stake-id">Stake</variable>
                </variables>
                <block type="before_purchase" id="before">
                    <statement name="BEFOREPURCHASE_STACK">
                        <block type="apollo_purchase2" id="apollo">
                            <field name="PURCHASE_LIST">DIGITOVER</field>
                            <value name="PREDICTION">
                                <block type="math_number">
                                    <field name="NUM">4</field>
                                </block>
                            </value>
                        </block>
                    </statement>
                </block>
            </xml>
        `);

        normalizeBotXml(xml);

        const smart_purchase = xml.querySelector('#apollo');
        expect(smart_purchase?.getAttribute('type')).toBe('smart_purchase_contract');
        expect(
            smart_purchase?.querySelector('value[name="CONTRACT_TYPE"] block[type="text"] field[name="TEXT"]')
                ?.textContent
        ).toBe('DIGITOVER');
        expect(
            smart_purchase?.querySelector('value[name="AMOUNT"] block[type="variables_get"] field[name="VAR"]')
                ?.textContent
        ).toBe('Stake');
        expect(
            smart_purchase?.querySelector('value[name="DURATION"] block[type="math_number"] field[name="NUM"]')
                ?.textContent
        ).toBe('1');
        expect(smart_purchase?.querySelector('field[name="DURATIONTYPE_LIST"]')?.textContent).toBe('t');
        expect(
            smart_purchase?.querySelector('value[name="PREDICTION"] block[type="math_number"] field[name="NUM"]')
                ?.textContent
        ).toBe('4');
        expect(
            smart_purchase?.querySelector('value[name="RECOVERY_AFTER"] block[type="math_number"] field[name="NUM"]')
                ?.textContent
        ).toBe('999999');
    });

    it('injects trade type rotation for the legacy risk managers switch-counter pattern', () => {
        const xml = parseXml(`
            <xml xmlns="https://developers.google.com/blockly/xml" is_dbot="true" collection="false">
                <variables>
                    <variable id="trade-type-id">TRADE TYPE</variable>
                    <variable id="count-id">Count</variable>
                </variables>
                <block type="after_purchase" id="after">
                    <statement name="AFTERPURCHASE_STACK">
                        <block type="controls_if" id="toggle_even_odd_after_count">
                            <next>
                                <block type="variables_set" id="reset_count_after_switch">
                                    <field name="VAR" id="count-id">Count</field>
                                    <value name="VALUE">
                                        <block type="math_number"><field name="NUM">0</field></block>
                                    </value>
                                </block>
                            </next>
                        </block>
                    </statement>
                </block>
                <block type="before_purchase" id="before">
                    <statement name="BEFOREPURCHASE_STACK">
                        <block type="controls_if" id="branch-root">
                            <value name="IF0">
                                <block type="variables_is_option" id="trade-type-check">
                                    <mutation options="%5B%5D"></mutation>
                                    <field name="VAR" id="trade-type-id">TRADE TYPE</field>
                                    <field name="OPTION">Even Odd</field>
                                </block>
                            </value>
                        </block>
                    </statement>
                </block>
            </xml>
        `);

        normalizeBotXml(xml);

        expect(xml.querySelector('#cycle_trade_type_after_switch')?.getAttribute('type')).toBe('controls_if');
        expect(
            xml.querySelector('#set_trade_type_to_over_under value[name="VALUE"] block[type="text"] field[name="TEXT"]')
                ?.textContent
        ).toBe('Over4/Under5');
        expect(
            xml.querySelector('#set_trade_type_to_rise_fall value[name="VALUE"] block[type="text"] field[name="TEXT"]')
                ?.textContent
        ).toBe('Rise/Fall');
        expect(
            xml.querySelector('#reset_trade_type_to_even_odd value[name="VALUE"] block[type="text"] field[name="TEXT"]')
                ?.textContent
        ).toBe('Even Odd');
    });
});
