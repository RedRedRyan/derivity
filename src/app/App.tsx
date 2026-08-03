import { lazy, Suspense } from 'react';
import React from 'react';
import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from 'react-router-dom';
import ChunkLoader from '@/components/loader/chunk-loader';
import LocalStorageSyncWrapper from '@/components/localStorage-sync-wrapper';
import RoutePromptDialog from '@/components/route-prompt-dialog';
import { useAccountSwitching } from '@/hooks/useAccountSwitching';
import { useLanguageFromURL } from '@/hooks/useLanguageFromURL';
import { useOAuthCallback } from '@/hooks/useOAuthCallback';
import { StoreProvider } from '@/hooks/useStore';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import { isDemoAccount } from '@/utils/account-helpers';
import { initializeI18n, localize, TranslationProvider } from '@deriv-com/translations';
import CoreStoreProvider from './CoreStoreProvider';
import ErrorBoundary from './ErrorBoundary';
import './app-root.scss';

const Layout = lazy(() => import('../components/layout'));
const AppRoot = lazy(() => import('./app-root'));

// Translations CDN is optional — requires TRANSLATIONS_CDN_URL, R2_PROJECT_NAME, and CROWDIN_BRANCH_NAME env vars.
// Without these, the app defaults to English. See user-guide/03-white-labeling.md#translations for setup instructions.
const i18nInstance = initializeI18n({ cdnUrl: '' });

/**
 * Component wrapper to handle language URL parameter
 * Uses the useLanguageFromURL hook to process language switching
 */
const LanguageHandler = ({ children }: { children: React.ReactNode }) => {
    useLanguageFromURL();
    return <>{children}</>;
};

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route
            path='/'
            element={
                <Suspense
                    fallback={<ChunkLoader message={localize('Please wait while we connect to the server...')} />}
                >
                    <TranslationProvider defaultLang='EN' i18nInstance={i18nInstance}>
                        <LanguageHandler>
                            <StoreProvider>
                                <LocalStorageSyncWrapper>
                                    <RoutePromptDialog />
                                    <CoreStoreProvider>
                                        <Layout />
                                    </CoreStoreProvider>
                                </LocalStorageSyncWrapper>
                            </StoreProvider>
                        </LanguageHandler>
                    </TranslationProvider>
                </Suspense>
            }
        >
            {/* All child routes will be passed as children to Layout */}
            <Route index element={<AppRoot />} />
            {/* Catch-all: redirect any unknown path back to root (hash-based tab navigation handles the rest) */}
            <Route path='*' element={<Navigate to='/' replace />} />
        </Route>
    )
);

/**
 * Stores legacy Deriv OAuth accounts in localStorage for authorization.
 *
 * NOTE: This is called when app_id routing sends users through the legacy platform.
 * According to Deriv OAuth 2.0 docs, when app_id is included, Deriv routes users
 * to whichever platform they belong to (legacy or new). If they're on the legacy
 * platform, they get redirected back with ?acct1=...&token1=... parameters.
 *
 * These legacy tokens are handled separately from new PKCE tokens:
 * - Legacy tokens: Used directly with WebSocket API via api.authorize(token)
 * - PKCE tokens: Exchanged for access_token, then used with DerivWS REST API
 *
 * Both flows converge after the user is authorized in api_base.ts
 *
 * Deriv OAuth returns: ?acct1=CR123&token1=a1-xxx&cur1=USD&acct2=...
 * We store in localStorage:
 *   accountsList   → { loginid: token, ... }      [Used by getToken()]
 *   clientAccounts → { loginid: { currency, token }, ... }
 *   authToken      → token of the first real account (non-VRT)
 *   active_loginid → loginid of the first real account [Used by getAccountId()]
 *   account_type   → 'demo' or 'real'
 */
function storeLegacyAccounts(accounts: import('@/hooks/useOAuthCallback').LegacyAccount[]): void {
    const accountsList: Record<string, string> = {};
    const clientAccounts: Record<string, { currency: string; token: string }> = {};

    for (const { loginid, token, currency } of accounts) {
        accountsList[loginid] = token;
        clientAccounts[loginid] = { currency, token };
    }

    // Store in localStorage (persists across page reloads, picked up by api_base.init())
    localStorage.setItem('accountsList', JSON.stringify(accountsList));
    localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));

    // Pick the first real account (non-VRT) as active; fall back to first account
    const realAccount = accounts.find(a => !isDemoAccount(a.loginid)) ?? accounts[0];
    if (realAccount) {
        localStorage.setItem('authToken', realAccount.token);
        localStorage.setItem('active_loginid', realAccount.loginid);
        const isDemo = isDemoAccount(realAccount.loginid);
        localStorage.setItem('account_type', isDemo ? 'demo' : 'real');

        console.log('[Legacy OAuth] ✅ Legacy account stored:', {
            loginid: realAccount.loginid,
            token_type: typeof realAccount.token,
            token_length: realAccount.token.length,
            account_type: isDemo ? 'demo' : 'real',
            accountsList: accountsList,
        });
    } else {
        console.error('[Legacy OAuth] ❌ No real account found in OAuth response:', accounts);
    }
}

/**
 * Main App component
 *
 * Responsibilities:
 * 1. OAuth callback handling — both legacy (acct1/token1) and new PKCE flow
 * 2. Account switching from URL (via useAccountSwitching hook)
 * 3. Router provider setup
 */
function App() {
    const { isProcessing, isValid, params, legacyAccounts, error, cleanupURL } = useOAuthCallback();

    useAccountSwitching();

    // ── Legacy Deriv OAuth: tokens arrive directly in the URL ────────────────
    React.useEffect(() => {
        if (!isProcessing && legacyAccounts.length > 0) {
            // IMPORTANT: Clean up URL BEFORE storing accounts to prevent re-processing on reload
            cleanupURL();
            storeLegacyAccounts(legacyAccounts);
            // Note: DO NOT reload the page. Let the normal app initialization pick up the
            // stored token from localStorage. The api_base.init() in AppRoot will authorize.
        }
    }, [isProcessing, legacyAccounts, cleanupURL]);

    // ── New OAuth2 PKCE: exchange code for access token ───────────────────────
    React.useEffect(() => {
        if (!isProcessing && isValid && params.code) {
            OAuthTokenExchangeService.exchangeCodeForToken(params.code)
                .then(response => {
                    if (response.access_token) {
                        cleanupURL();
                    } else if (response.error) {
                        console.error('❌ Token exchange failed:', response.error, response.error_description);
                        cleanupURL();
                    }
                })
                .catch(err => {
                    console.error('❌ Token exchange request failed:', err);
                    cleanupURL();
                });
        } else if (!isProcessing && error) {
            console.error('OAuth callback error:', error);
        }
    }, [isProcessing, isValid, params.code, error, cleanupURL]);

    return (
        <ErrorBoundary>
            <RouterProvider router={router} />
        </ErrorBoundary>
    );
}

export default App;
