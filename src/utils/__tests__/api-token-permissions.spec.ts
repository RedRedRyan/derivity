import {
    API_TOKEN_ACCOUNT_DETAILS_KEY,
    API_TOKEN_AUTH_METHOD,
    API_TOKEN_AUTH_METHOD_KEY,
    API_TOKEN_PENDING_KEY,
    API_TOKEN_SCOPES_KEY,
    buildApiTokenAccountDetails,
    canAccessApiTokenBalance,
    canTradeWithApiToken,
    completeApiTokenSession,
    getApiTokenAccountDetails,
    getApiTokenScopes,
    getPendingApiToken,
    normalizeApiTokenInput,
    normalizeScopes,
    startApiTokenSession,
    storeApiTokenAccountDetails,
} from '../api-token-permissions';

describe('api token permissions', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('normalizes supported token input formats', () => {
        expect(normalizeApiTokenInput(' Bearer abc123 ')).toBe('abc123');
        expect(normalizeApiTokenInput('{"api_token":"def456"}')).toBe('def456');
        expect(normalizeApiTokenInput('{"access_token":"ghi789"}')).toBe('ghi789');
    });

    it('stores a pending token session before the login id is known', () => {
        startApiTokenSession('abc123');

        expect(localStorage.getItem(API_TOKEN_AUTH_METHOD_KEY)).toBe(API_TOKEN_AUTH_METHOD);
        expect(localStorage.getItem(API_TOKEN_PENDING_KEY)).toBe('abc123');
        expect(getPendingApiToken()).toBe('abc123');
    });

    it('completes token login storage with account token mapping and scopes', () => {
        completeApiTokenSession({
            loginid: 'CR12345',
            token: 'abc123',
            currency: 'USD',
            scopes: ['read', 'trade'],
        });

        expect(localStorage.getItem('active_loginid')).toBe('CR12345');
        expect(JSON.parse(localStorage.getItem('accountsList') || '{}')).toEqual({ CR12345: 'abc123' });
        expect(JSON.parse(localStorage.getItem(API_TOKEN_SCOPES_KEY) || '[]')).toEqual(['read', 'trade']);
        expect(canAccessApiTokenBalance()).toBe(true);
        expect(canTradeWithApiToken()).toBe(true);
    });

    it('enforces missing token scopes for token sessions', () => {
        localStorage.setItem(API_TOKEN_AUTH_METHOD_KEY, API_TOKEN_AUTH_METHOD);
        localStorage.setItem(API_TOKEN_SCOPES_KEY, JSON.stringify(['read']));

        expect(canAccessApiTokenBalance()).toBe(true);
        expect(canTradeWithApiToken()).toBe(false);
    });

    it('builds and stores account details returned by token login', () => {
        const details = buildApiTokenAccountDetails({
            loginid: 'VRTC12345',
            balance: 1000,
            currency: 'USD',
        });

        storeApiTokenAccountDetails(details);

        expect(details).toEqual({
            account_id: 'VRTC12345',
            balance: 1000,
            currency: 'USD',
            account_type: 'demo',
            status: 'active',
        });
        expect(JSON.parse(localStorage.getItem(API_TOKEN_ACCOUNT_DETAILS_KEY) || '{}')).toEqual(details);
        expect(getApiTokenAccountDetails()).toEqual(details);
    });

    it('normalizes scope strings and arrays', () => {
        expect(normalizeScopes('read trade')).toEqual(['read', 'trade']);
        expect(normalizeScopes('read,trade')).toEqual(['read', 'trade']);
        expect(normalizeScopes(['read', 'trade'])).toEqual(['read', 'trade']);
    });

    it('maps legacy scope labels to read access', () => {
        expect(normalizeScopes('trading_information account_manage')).toEqual([
            'trading_information',
            'read',
            'account_manage',
        ]);
    });

    it('stores comma-separated scopes from token sessions', () => {
        completeApiTokenSession({
            loginid: 'CR12345',
            token: 'abc123',
            currency: 'USD',
            scopes: 'read, trade',
        } as any);

        expect(getApiTokenScopes()).toEqual(['read', 'trade']);
        expect(canTradeWithApiToken()).toBe(true);
    });

    it('does not block token sessions when no scopes were stored locally yet', () => {
        localStorage.setItem(API_TOKEN_AUTH_METHOD_KEY, API_TOKEN_AUTH_METHOD);

        expect(canAccessApiTokenBalance()).toBe(true);
        expect(canTradeWithApiToken()).toBe(true);
    });
});
