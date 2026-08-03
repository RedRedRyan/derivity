import { areContractIdsEqual, normalizeOpenContract } from '../open-contract-utils';

describe('OpenContract normalization', () => {
    const closed_statuses = new Set(['sold', 'won', 'lost', 'cancelled']);

    it('preserves transaction IDs from the purchase snapshot when an update omits them', () => {
        expect(
            normalizeOpenContract(
                { contract_id: 42, status: 'open' },
                {
                    buy_price: 1,
                    contract_id: 42,
                    transaction_ids: { buy: 1001 },
                },
                closed_statuses
            )
        ).toEqual({
            buy_price: 1,
            contract_id: 42,
            status: 'open',
            transaction_ids: { buy: 1001 },
        });
    });

    it('merges the sell transaction ID and normalizes a final status', () => {
        expect(
            normalizeOpenContract(
                {
                    contract_id: 42,
                    status: 'lost',
                    transaction_ids: { sell: 1002 },
                },
                {
                    contract_id: 42,
                    transaction_ids: { buy: 1001 },
                },
                closed_statuses
            )
        ).toEqual({
            contract_id: 42,
            is_sold: 1,
            status: 'lost',
            transaction_ids: { buy: 1001, sell: 1002 },
        });
    });

    it('does not merge details from a different contract', () => {
        expect(
            normalizeOpenContract(
                { contract_id: 43, status: 'open' },
                {
                    buy_price: 1,
                    contract_id: 42,
                    transaction_ids: { buy: 1001 },
                },
                closed_statuses
            )
        ).toEqual({ contract_id: 43, status: 'open' });
    });

    it('accepts equivalent numeric and string contract IDs', () => {
        expect(areContractIdsEqual(42, '42')).toBe(true);
    });
});
