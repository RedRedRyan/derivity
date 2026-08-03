jest.mock('@deriv-com/translations', () => ({
    getInitialLanguage: jest.fn(() => 'EN'),
    Localize: ({ i18n_default_text }: { i18n_default_text: string }) => i18n_default_text,
    localize: jest.fn((text: string) => text),
}));

import { setRequestWebSocketURL } from '../../../api/legacy-request';
import { createDetails, tradeOptionToBuy, tradeOptionToProposal } from '../helpers';

beforeEach(() => {
    setRequestWebSocketURL('wss://ws.derivws.com/websockets/v3?app_id=1089');
});

afterEach(() => {
    setRequestWebSocketURL(null);
});

describe('createDetails', () => {
    it('returns safe empty details before a complete contract exists', () => {
        expect(createDetails()).toEqual(['', 0, 0, 0, '', '', 0, '', 0, 0, '']);
    });

    it('falls back to the contract ID when transaction IDs are omitted', () => {
        expect(
            createDetails({
                buy_price: 1,
                contract_id: 42,
                contract_type: 'CALL',
                currency: 'USD',
                sell_price: 0,
            })
        ).toEqual([42, 1, 0, -1, 'CALL', '', 0, '', 0, 0, 'loss']);
    });

    it('does not report an unfinished contract as a win', () => {
        expect(createDetails({ buy_price: 1, contract_id: 42, sell_price: '' })[10]).toBe('');
    });
});

describe('trade option request builders', () => {
    it('keeps multiplier limit order values numeric', () => {
        const request = tradeOptionToBuy('MULTUP', {
            amount: 1,
            basis: 'stake',
            currency: 'USD',
            duration: 5,
            duration_unit: 't',
            limit_order: {
                take_profit: 2.5,
            },
            multiplier: 100,
            symbol: 'R_100',
        });

        expect(request).toEqual({
            buy: '1',
            parameters: {
                amount: 1,
                basis: 'stake',
                contract_type: 'MULTUP',
                currency: 'USD',
                limit_order: {
                    take_profit: 2.5,
                },
                multiplier: 100,
                symbol: 'R_100',
            },
            price: 1,
        });
    });

    it('builds accumulator proposals with growth rate and without duration', () => {
        const [proposal] = tradeOptionToProposal(
            {
                amount: 1,
                basis: 'stake',
                contractTypes: ['ACCU'],
                currency: 'USD',
                duration: 5,
                duration_unit: 't',
                growth_rate: 0.01,
                symbol: 'R_100',
            },
            'purchase-reference'
        );

        expect(proposal).toEqual({
            amount: 1,
            basis: 'stake',
            contract_type: 'ACCU',
            currency: 'USD',
            growth_rate: 0.01,
            passthrough: {
                contract_type: 'ACCU',
                purchase_reference: 'purchase-reference',
            },
            proposal: 1,
            symbol: 'R_100',
        });
    });

    it('builds proposals with underlying_symbol on the new Options API', () => {
        setRequestWebSocketURL('wss://api.derivws.com/trading/v1/options/ws/demo?otp=example');

        const [proposal] = tradeOptionToProposal(
            {
                amount: 1,
                basis: 'stake',
                contractTypes: ['CALL'],
                currency: 'USD',
                duration: 5,
                duration_unit: 't',
                symbol: 'R_100',
            },
            'purchase-reference'
        );

        expect(proposal).toEqual(
            expect.objectContaining({
                underlying_symbol: 'R_100',
            })
        );
        expect(proposal).not.toHaveProperty('symbol');
    });
});
