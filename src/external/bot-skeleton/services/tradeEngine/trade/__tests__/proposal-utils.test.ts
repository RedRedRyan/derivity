import { findCurrentProposal, getProposalNumericValue, getProposalPurchaseDetails } from '../proposal-utils';

describe('proposal readiness helpers', () => {
    const proposal = {
        ask_price: '1.25',
        contract_type: 'DIGITOVER',
        id: 'proposal-1',
        passthrough: {},
        payout: '2.1',
        purchase_reference: 'active-reference',
    };

    it('returns undefined while the matching proposal is not ready', () => {
        expect(
            findCurrentProposal({
                proposals: [],
                contract_type: 'DIGITOVER',
                purchase_reference: 'active-reference',
            })
        ).toBeUndefined();
        expect(getProposalNumericValue(undefined, 'ask_price')).toBe(0);
    });

    it('only selects the proposal for the active purchase reference', () => {
        expect(
            findCurrentProposal({
                proposals: [{ ...proposal, purchase_reference: 'old-reference' }, proposal],
                contract_type: 'digitover',
                purchase_reference: 'active-reference',
            })
        ).toBe(proposal);
    });

    it('returns safe numeric ask price and payout values', () => {
        expect(getProposalNumericValue(proposal, 'ask_price')).toBe(1.25);
        expect(getProposalNumericValue(proposal, 'payout')).toBe(2.1);
        expect(getProposalNumericValue({ ask_price: undefined }, 'ask_price')).toBe(0);
    });

    it('rejects incomplete proposals before purchase', () => {
        expect(getProposalPurchaseDetails({ ask_price: 1.25 })).toBeNull();
        expect(getProposalPurchaseDetails({ id: 'proposal-1' })).toBeNull();
        expect(getProposalPurchaseDetails(proposal)).toEqual({
            askPrice: 1.25,
            id: 'proposal-1',
        });
    });
});
