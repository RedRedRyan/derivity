import {
    getBlocksForRequiredType,
    getCanonicalRequiredBlockType,
    hasRequiredBlockType,
    isPurchaseBlockType,
} from './required-blocks';

describe('required Blockly blocks', () => {
    const standard_purchase = { type: 'purchase' };
    const smart_purchase = { type: 'smart_purchase_contract' };
    const legacy_purchase = { type: 'apollo_purchase' };
    const trade_definition = { type: 'trade_definition' };

    it.each(['purchase', 'smart_purchase_contract', 'apollo_purchase'])(
        'recognizes %s as a purchase-capable block',
        block_type => {
            expect(isPurchaseBlockType(block_type)).toBe(true);
            expect(getCanonicalRequiredBlockType(block_type)).toBe('purchase');
        }
    );

    it('satisfies the mandatory purchase requirement with a smart purchase block', () => {
        const blocks = [trade_definition, smart_purchase];

        expect(hasRequiredBlockType(blocks, 'purchase')).toBe(true);
        expect(getBlocksForRequiredType(blocks, 'purchase')).toEqual([smart_purchase]);
    });

    it('returns every supported purchase implementation', () => {
        const blocks = [standard_purchase, smart_purchase, legacy_purchase, trade_definition];

        expect(getBlocksForRequiredType(blocks, 'purchase')).toEqual([
            standard_purchase,
            smart_purchase,
            legacy_purchase,
        ]);
    });
});
