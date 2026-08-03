import { useCallback, useEffect, useState } from 'react';
import { clearCSRFToken, validateCSRFToken } from '@/components/shared/utils/config/config';
import { clearAuthData } from '@/utils/auth-utils';

/**
 * A single account entry parsed from the legacy Deriv OAuth callback URL.
 * e.g. ?acct1=CR123&token1=a1-xxx&cur1=USD
 */
export interface LegacyAccount {
    loginid: string;
    token: string;
    currency: string;
}

/**
 * OAuth callback parameters extracted from URL
 */
export interface OAuthCallbackParams {
    code: string | null;
    state: string | null;
    error: string | null;
    error_description: string | null;
}

/**
 * OAuth callback processing result
 */
export interface OAuthCallbackResult {
    isProcessing: boolean;
    isValid: boolean;
    params: OAuthCallbackParams;
    /** Populated when Deriv legacy OAuth redirects back with acct/token/cur params */
    legacyAccounts: LegacyAccount[];
    error: string | null;
    cleanupURL: () => void;
}

/**
 * Parses legacy Deriv OAuth accounts from the URL search string.
 * Deriv returns: ?acct1=CR123&token1=a1-xxx&cur1=USD&acct2=...
 */
function parseLegacyAccounts(urlParams: URLSearchParams): LegacyAccount[] {
    const accounts: LegacyAccount[] = [];
    let i = 1;
    while (urlParams.has(`acct${i}`)) {
        const loginid = urlParams.get(`acct${i}`) || '';
        const token = urlParams.get(`token${i}`) || '';
        const currency = urlParams.get(`cur${i}`) || '';
        if (loginid && token) {
            accounts.push({ loginid, token, currency });
        }
        i++;
    }
    return accounts;
}

/**
 * Custom hook to handle OAuth callback flow
 *
 * This hook:
 * 1. Extracts OAuth parameters (code, state, error) from URL
 * 2. Validates CSRF token (state parameter)
 * 3. Returns the authorization code and a cleanup function
 *
 * Note: Call cleanupURL() after you've processed the authorization code
 *
 * @returns OAuth callback processing result with cleanupURL function
 *
 * @example
 * ```tsx
 * const { isProcessing, isValid, params, error, cleanupURL } = useOAuthCallback();
 *
 * useEffect(() => {
 *   if (!isProcessing && isValid && params.code) {
 *     // Exchange code for tokens
 *     exchangeCodeForTokens(params.code).then(() => {
 *       cleanupURL(); // Clean up after processing
 *     });
 *   }
 * }, [isProcessing, isValid, params.code]);
 * ```
 */
export const useOAuthCallback = (): OAuthCallbackResult => {
    const [result, setResult] = useState<Omit<OAuthCallbackResult, 'cleanupURL'>>({
        isProcessing: true,
        isValid: false,
        params: {
            code: null,
            state: null,
            error: null,
            error_description: null,
        },
        legacyAccounts: [],
        error: null,
    });

    // Cleanup function that can be called by the consuming component
    const cleanupURL = useCallback(() => {
        const url = new URL(window.location.href);
        // New OAuth2 params
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('scope');
        url.searchParams.delete('error');
        url.searchParams.delete('error_description');
        // Legacy Deriv OAuth params
        let i = 1;
        while (url.searchParams.has(`acct${i}`)) {
            url.searchParams.delete(`acct${i}`);
            url.searchParams.delete(`token${i}`);
            url.searchParams.delete(`cur${i}`);
            i++;
        }
        window.history.replaceState({}, '', url.toString());
    }, []);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);

        // ── Legacy Deriv OAuth: ?acct1=X&token1=Y&cur1=Z ─────────────────────
        // Deriv's legacy flow returns tokens directly in the URL, no code
        // exchange needed. Detect it before checking for OAuth2 params.
        const legacyAccounts = parseLegacyAccounts(urlParams);
        if (legacyAccounts.length > 0) {
            setResult({
                isProcessing: false,
                isValid: false, // not the new flow
                params: { code: null, state: null, error: null, error_description: null },
                legacyAccounts,
                error: null,
            });
            return;
        }

        // ── New OAuth2 PKCE: ?code=X&state=Y ─────────────────────────────────
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const error_description = urlParams.get('error_description');

        const isOAuthCallback = code !== null || error !== null || state !== null;

        if (!isOAuthCallback) {
            setResult({
                isProcessing: false,
                isValid: false,
                params: { code: null, state: null, error: null, error_description: null },
                legacyAccounts: [],
                error: null,
            });
            return;
        }

        if (error) {
            console.error('OAuth error:', error, error_description);
            setResult({
                isProcessing: false,
                isValid: false,
                params: { code, state, error, error_description },
                legacyAccounts: [],
                error: error_description || error,
            });
            cleanupURL();
            return;
        }

        if (!state) {
            console.error('[OAuth] Missing state parameter in callback');
            clearAuthData();
            setResult({
                isProcessing: false,
                isValid: false,
                params: { code, state, error, error_description },
                legacyAccounts: [],
                error: 'Missing state parameter - potential security threat',
            });
            window.location.replace(window.location.origin);
            return;
        }

        if (!validateCSRFToken(state)) {
            console.error('[OAuth] CSRF token validation failed');
            clearAuthData();
            setResult({
                isProcessing: false,
                isValid: false,
                params: { code, state, error, error_description },
                legacyAccounts: [],
                error: 'CSRF token validation failed',
            });
            return;
        }

        clearCSRFToken();

        if (!code) {
            console.error('[OAuth] Missing authorization code in callback');
            setResult({
                isProcessing: false,
                isValid: false,
                params: { code, state, error, error_description },
                legacyAccounts: [],
                error: 'Missing authorization code',
            });
            cleanupURL();
            return;
        }

        setResult({
            isProcessing: false,
            isValid: true,
            params: { code, state, error, error_description },
            legacyAccounts: [],
            error: null,
        });
    }, [cleanupURL]);

    return {
        ...result,
        cleanupURL,
    };
};
