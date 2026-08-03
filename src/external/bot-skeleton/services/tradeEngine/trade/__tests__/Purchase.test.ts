import { getValidatedBuyResponse } from '../purchase-utils';

describe('getValidatedBuyResponse', () => {
    it('returns the buy payload when present', () => {
        const buy = { contract_id: 123, transaction_id: 456 };

        expect(getValidatedBuyResponse({ buy }, 'CALL')).toBe(buy);
    });

    it('throws a readable error when buy is missing', () => {
        expect(() => getValidatedBuyResponse({}, 'DIGITOVER')).toThrow(
            'Bot Builder could not confirm the DIGITOVER purchase because Deriv did not return a buy response.'
        );
    });

    it.each(['contract_id', 'transaction_id'])('rejects a buy response without %s', missing_field => {
        const buy = { contract_id: 123, transaction_id: 456 };
        delete buy[missing_field as keyof typeof buy];

        expect(() => getValidatedBuyResponse({ buy }, 'CALL')).toThrow(
            `Bot Builder could not confirm the CALL purchase because the buy response is missing ${missing_field}.`
        );
    });

    it('surfaces an API error returned in a resolved response', () => {
        expect(() =>
            getValidatedBuyResponse({ error: { message: 'The contract proposal has expired.' } }, 'PUT')
        ).toThrow('The contract proposal has expired.');
    });
});
