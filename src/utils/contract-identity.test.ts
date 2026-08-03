import {
    contractsReferToSameTrade,
    getContractRowKey,
    hasContractIdentity,
    mergeContractUpdate,
} from '@/utils/contract-identity';

describe('contract identity helpers', () => {
    it('matches contract updates by contract ID when transaction IDs are omitted', () => {
        const existing = { contract_id: 42, transaction_ids: { buy: 1001 } };
        const update = { contract_id: 42, status: 'open' };

        expect(contractsReferToSameTrade(existing, update)).toBe(true);
    });

    it('preserves the buy transaction ID while merging a partial update', () => {
        const existing = { contract_id: 42, transaction_ids: { buy: 1001 }, buy_price: 1 };
        const update = { contract_id: 42, transaction_ids: { sell: 1002 }, status: 'sold' };

        expect(mergeContractUpdate(existing, update)).toEqual({
            contract_id: 42,
            transaction_ids: { buy: 1001, sell: 1002 },
            buy_price: 1,
            status: 'sold',
        });
    });

    it('builds a safe row key when only the contract ID is available', () => {
        expect(getContractRowKey({ contract_id: 42 })).toBe('contract-42');
        expect(getContractRowKey({ transaction_ids: { buy: 1001 } })).toBe('buy-1001');
    });

    it('rejects data that has neither a contract ID nor a buy transaction ID', () => {
        expect(hasContractIdentity({ transaction_ids: {} })).toBe(false);
    });
});
