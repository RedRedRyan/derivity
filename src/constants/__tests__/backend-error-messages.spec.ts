import { getBackendErrorMessages, getLocalizedErrorMessage } from '../backend-error-messages';

// Mock the localize function
jest.mock('@deriv-com/translations', () => ({
    localize: jest.fn((message, params) => {
        // Simple mock that replaces {{param}} with actual values
        let result = message;
        if (params) {
            Object.keys(params).forEach(key => {
                result = result.replace(new RegExp(`{{${key}}}`, 'g'), params[key]);
            });
        }
        return result;
    }),
}));

describe('Backend Error Messages', () => {
    describe('getBackendErrorMessages', () => {
        it('should return all error message mappings', () => {
            const errorMessages = getBackendErrorMessages();

            // Test that we have the main backend errors
            expect(errorMessages.AccountBalanceExceedsLimit).toBeDefined();
            expect(errorMessages.InsufficientBalance).toBeDefined();
            expect(errorMessages.InvalidContractType).toBeDefined();

            // Test that we have bot-skeleton specific errors
            expect(errorMessages.RateLimit).toBeDefined();
            expect(errorMessages.NotInitialized).toBeDefined();
            expect(errorMessages.ProposalsNotReady).toBeDefined();
        });

        it('should have all original backend error codes', () => {
            const errorMessages = getBackendErrorMessages();
            const originalErrorCodes = [
                'AccountBalanceExceedsLimit',
                'AlreadyExpired',
                'AuthorizationRequired',
                'BarrierNotAllowed',
                'InsufficientBalance',
                'InvalidContractType',
                'MarketIsClosed',
                'PriceMoved',
                'RateLimitExceeded',
                'TradingDisabled',
            ];

            originalErrorCodes.forEach(code => {
                expect(errorMessages[code as keyof typeof errorMessages]).toBeDefined();
            });
        });
    });

    describe('getLocalizedErrorMessage', () => {
        it('should return localized message for known error code', () => {
            const message = getLocalizedErrorMessage('InsufficientBalance');
            expect(message).toContain('insufficient');
        });

        it('should handle parameters correctly', () => {
            const message = getLocalizedErrorMessage('AccountBalanceExceedsLimit', {
                _1: '1000 USD',
                _2: '500 USD',
            });
            expect(message).toContain('1000 USD');
            expect(message).toContain('500 USD');
        });

        it('should return fallback message for unknown error code', () => {
            const message = getLocalizedErrorMessage('UnknownErrorCode');
            expect(message).toBe('An error occurred. Please try again.');
        });

        it('should handle bot-skeleton specific errors', () => {
            const message = getLocalizedErrorMessage('RateLimit', {
                message_type: 'buy',
                delay: '5',
                request: '12345',
            });
            expect(message).toContain('buy');
            expect(message).toContain('5');
            expect(message).toContain('12345');
        });

        it('should include Deriv input validation details when available', () => {
            const message = getLocalizedErrorMessage('InputValidationFailed', {
                details: {
                    'limit_order/take_profit': 'Expected number - got string.',
                },
            });

            expect(message).toBe('Invalid input provided: limit_order/take_profit: Expected number - got string.');
        });

        it('should preserve Deriv input validation messages when details are empty', () => {
            const message = getLocalizedErrorMessage('InputValidationFailed', {
                message: 'Input validation failed: Properties not allowed: underlying_symbol.',
                details: {},
            });

            expect(message).toBe('Input validation failed: Properties not allowed: underlying_symbol.');
        });
    });
});
