// Comprehensive unit tests for account-helpers.ts
// Covers all 6 exported functions with edge cases per PR review requirements
import {
    ACCOUNT_TYPE_KEY,
    getDisplayLoginId,
    getDisplayMaskedLoginId,
    getAccountId,
    getAccountType,
    getDeviceType,
    getMaskedLoginId,
    getJournalAccountLabel,
    isDemoAccount,
    isVirtualAccount,
    MAX_MOBILE_WIDTH,
    removeUrlParameter,
    shouldShowUsdAccountIcon,
} from '../account-helpers';

describe('account-helpers', () => {
    // Mock localStorage
    let localStorageMock: { [key: string]: string };

    beforeEach(() => {
        // Reset localStorage mock
        localStorageMock = {};
        Storage.prototype.getItem = jest.fn((key: string) => localStorageMock[key] || null);
        Storage.prototype.setItem = jest.fn((key: string, value: string) => {
            localStorageMock[key] = value;
        });
        Storage.prototype.removeItem = jest.fn((key: string) => {
            delete localStorageMock[key];
        });

        window.history.pushState({}, '', '/');

        // Reset window.history
        window.history.replaceState = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('isDemoAccount', () => {
        it('should return true for VRTC prefix (classic demo)', () => {
            expect(isDemoAccount('VRTC12345')).toBe(true);
        });

        it('should return true for VRW prefix (demo wallet)', () => {
            expect(isDemoAccount('VRW12345')).toBe(true);
        });

        it('should return true for DEM prefix', () => {
            expect(isDemoAccount('DEM12345')).toBe(true);
        });

        it('should return true for DOT prefix demo accounts', () => {
            expect(isDemoAccount('DOT12345')).toBe(true);
            expect(isDemoAccount('DOT91317422')).toBe(true);
            expect(isDemoAccount('DOT91360536')).toBe(true);
            expect(isDemoAccount('DOT92075124')).toBe(true);
        });

        it('should return false for real account prefix', () => {
            expect(isDemoAccount('CR12345')).toBe(false);
            expect(isDemoAccount('MF12345')).toBe(false);
            expect(isDemoAccount('ROT12345')).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(isDemoAccount('')).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(isDemoAccount(null as any)).toBe(false);
            expect(isDemoAccount(undefined as any)).toBe(false);
        });

        it('should be case-sensitive', () => {
            expect(isDemoAccount('vrtc12345')).toBe(false);
            expect(isDemoAccount('vrw12345')).toBe(false);
        });
    });

    describe('getAccountType', () => {
        it('should return "demo" for demo loginid', () => {
            expect(getAccountType('VRTC12345')).toBe('demo');
            expect(getAccountType('VRW12345')).toBe('demo');
            expect(getAccountType('DEM12345')).toBe('demo');
            expect(getAccountType('DOT91317422')).toBe('demo');
        });

        it('should return "real" for real account loginid', () => {
            expect(getAccountType('CR12345')).toBe('real');
            expect(getAccountType('MF12345')).toBe('real');
        });

        it('should return "public" when no loginid provided', () => {
            expect(getAccountType()).toBe('public');
            expect(getAccountType('')).toBe('public');
        });

        it('should return "public" when localStorage throws error', () => {
            Storage.prototype.getItem = jest.fn(() => {
                throw new Error('localStorage not available');
            });
            expect(getAccountType()).toBe('public');
        });
    });

    describe('isVirtualAccount', () => {
        it('should use loginid as primary source of truth', () => {
            // Even if localStorage says "real", loginid takes precedence
            localStorageMock[ACCOUNT_TYPE_KEY] = 'real';
            expect(isVirtualAccount('VRTC12345')).toBe(true);
        });

        it('should treat DOT and VRW accounts as demos', () => {
            expect(isVirtualAccount('VRW12345')).toBe(true);
            expect(isVirtualAccount('VRW70350')).toBe(true);
            expect(isVirtualAccount('DOT91317422')).toBe(true);
        });

        it('should return false for real account loginid', () => {
            localStorageMock[ACCOUNT_TYPE_KEY] = 'demo';
            expect(isVirtualAccount('CR12345')).toBe(false);
        });

        it('should fall back to localStorage when loginid is empty', () => {
            localStorageMock[ACCOUNT_TYPE_KEY] = 'demo';
            expect(isVirtualAccount('')).toBe(true);
        });

        it('should return false when localStorage has "real"', () => {
            localStorageMock[ACCOUNT_TYPE_KEY] = 'real';
            expect(isVirtualAccount('')).toBe(false);
        });

        it('should return false when localStorage is not available', () => {
            Storage.prototype.getItem = jest.fn(() => {
                throw new Error('localStorage not available');
            });
            expect(isVirtualAccount('')).toBe(false);
        });

        it('should return false when localStorage is empty', () => {
            expect(isVirtualAccount('')).toBe(false);
        });
    });

    describe('journal account labels', () => {
        it('should label demo accounts as Demo', () => {
            expect(getJournalAccountLabel('VRTC12345', 'USD')).toBe('Demo');
            expect(getJournalAccountLabel('DEM12345', 'USD')).toBe('Demo');
            expect(getJournalAccountLabel('DOT91317422', 'USD')).toBe('Demo');
            expect(getJournalAccountLabel('VRW70350', 'USD')).toBe('Demo');
        });

        it('should use currency for normal real accounts', () => {
            expect(getJournalAccountLabel('CR12345', 'USD')).toBe('USD');
        });
    });

    describe('display helpers', () => {
        it('should only use the usd icon for real accounts and the allowed DOT accounts', () => {
            expect(shouldShowUsdAccountIcon('CR12345')).toBe(true);
            expect(shouldShowUsdAccountIcon('DOT91317422')).toBe(true);
            expect(shouldShowUsdAccountIcon('DOT93418180')).toBe(true);
            expect(shouldShowUsdAccountIcon('DOT91360536')).toBe(true);
            expect(shouldShowUsdAccountIcon('VRTC12345')).toBe(false);
            expect(shouldShowUsdAccountIcon('VRW70350')).toBe(false);
        });

        it('should return loginids unchanged', () => {
            expect(getDisplayLoginId('DOT91317422')).toBe('DOT91317422');
            expect(getDisplayLoginId('DOT12345')).toBe('DOT12345');
            expect(getDisplayLoginId('CR12345')).toBe('CR12345');
        });

        it('should return masked loginids unchanged', () => {
            expect(getDisplayMaskedLoginId('DO****7422')).toBe('DO****7422');
            expect(getDisplayMaskedLoginId('CR****2345')).toBe('CR****2345');
        });

        it('should create masked loginids that match the backend format', () => {
            expect(getMaskedLoginId('DOT91317422')).toBe('DO****7422');
            expect(getMaskedLoginId('CR12345')).toBe('CR****2345');
        });
    });

    describe('getDeviceType', () => {
        it('should return "desktop" for SSR (no window)', () => {
            const originalWindow = global.window;
            delete (global as any).window;
            expect(getDeviceType()).toBe('desktop');
            global.window = originalWindow;
        });

        it('should return "mobile" when width <= MAX_MOBILE_WIDTH', () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: MAX_MOBILE_WIDTH,
            });
            expect(getDeviceType()).toBe('mobile');
        });

        it('should return "mobile" for width below breakpoint', () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 320,
            });
            expect(getDeviceType()).toBe('mobile');
        });

        it('should return "desktop" when width > MAX_MOBILE_WIDTH', () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: MAX_MOBILE_WIDTH + 1,
            });
            expect(getDeviceType()).toBe('desktop');
        });

        it('should return "desktop" for large screens', () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 1920,
            });
            expect(getDeviceType()).toBe('desktop');
        });
    });

    describe('getAccountId', () => {
        it('should prioritize URL parameter over localStorage', () => {
            localStorageMock['active_loginid'] = 'CR12345';
            window.history.pushState({}, '', '/?account_id=CR67890');

            const result = getAccountId();

            expect(result).toBe('CR67890');
            expect(localStorage.setItem).toHaveBeenCalledWith('active_loginid', 'CR67890');
        });

        it('should store URL account_id in localStorage', () => {
            window.history.pushState({}, '', '/?account_id=CR12345');

            getAccountId();

            expect(localStorage.setItem).toHaveBeenCalledWith('active_loginid', 'CR12345');
        });

        it('should remove token from URL if present', () => {
            window.history.pushState({}, '', '/?token=abc123&account_id=CR12345');

            getAccountId();

            expect(window.history.replaceState).toHaveBeenCalled();
        });

        it('should fall back to localStorage when no URL parameter', () => {
            localStorageMock['active_loginid'] = 'CR12345';
            window.history.pushState({}, '', '/');

            expect(getAccountId()).toBe('CR12345');
        });

        it('should return null when no account_id available', () => {
            window.history.pushState({}, '', '/');

            expect(getAccountId()).toBeNull();
        });

        it('should remove account_id from URL after storing', () => {
            window.history.pushState({}, '', '/?account_id=CR12345');

            getAccountId();

            expect(window.history.replaceState).toHaveBeenCalled();
        });
    });

    describe('removeUrlParameter', () => {
        it('should remove specified parameter from URL', () => {
            window.history.pushState({}, '', '/?foo=bar&baz=qux');

            removeUrlParameter('foo');

            expect(window.history.replaceState).toHaveBeenCalled();
            const calls = (window.history.replaceState as jest.Mock).mock.calls;
            const newUrl = calls[0][2];
            expect(newUrl).toBe('http://localhost/?baz=qux');
        });

        it('should preserve other parameters', () => {
            window.history.pushState({}, '', '/?foo=bar&baz=qux&hello=world');

            removeUrlParameter('baz');

            const calls = (window.history.replaceState as jest.Mock).mock.calls;
            const newUrl = calls[0][2];
            expect(newUrl).toContain('foo=bar');
            expect(newUrl).toContain('hello=world');
            expect(newUrl).not.toContain('baz');
        });

        it('should handle removing non-existent parameter', () => {
            window.history.pushState({}, '', '/?foo=bar');

            removeUrlParameter('nonexistent');

            expect(window.history.replaceState).toHaveBeenCalled();
        });

        it('should maintain document title', () => {
            document.title = 'Test Page';
            window.history.pushState({}, '', '/?foo=bar');

            removeUrlParameter('foo');

            const calls = (window.history.replaceState as jest.Mock).mock.calls;
            expect(calls[0][1]).toBe('Test Page');
        });

        it('should update history state', () => {
            window.history.pushState({}, '', '/?token=abc123');

            removeUrlParameter('token');

            expect(window.history.replaceState).toHaveBeenCalledWith({}, expect.any(String), expect.any(String));
        });
    });

    describe('constants', () => {
        it('should export MAX_MOBILE_WIDTH constant', () => {
            expect(MAX_MOBILE_WIDTH).toBe(926);
        });

        it('should export ACCOUNT_TYPE_KEY constant', () => {
            expect(ACCOUNT_TYPE_KEY).toBe('account_type');
        });
    });
});
