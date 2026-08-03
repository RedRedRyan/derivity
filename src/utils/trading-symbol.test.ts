import { isValidTradingSymbol } from '@/utils/trading-symbol';

describe('isValidTradingSymbol', () => {
    it.each(['', ' ', 'na', 'DEFAULT'] as const)('rejects transient workspace symbol "%s"', symbol => {
        expect(isValidTradingSymbol(symbol)).toBe(false);
    });

    it('accepts a real Deriv symbol', () => {
        expect(isValidTradingSymbol('1HZ10V')).toBe(true);
    });
});
