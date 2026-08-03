import { configure } from 'mobx';
import ReactDOM from 'react-dom/client';
import { getCanonicalHostForHost } from '@/components/shared';
import StartupLoader from '@/components/startup-loader';
import { AuthWrapper } from './app/AuthWrapper';
// Removed AnalyticsInitializer import - analytics dependency removed
// See migrate-docs/ANALYTICS_IMPLEMENTATION_GUIDE.md for re-implementation
import { performVersionCheck } from './utils/version-check';
import './styles/index.scss';

import { setupDiagnostics } from './utils/diagnostics';
import { removeLegacyPwaState } from './utils/remove-legacy-pwa';

// Configure MobX to handle multiple instances in production builds
configure({ isolateGlobalState: true });

// Perform version check FIRST - before any other operations
performVersionCheck();

// Set up diagnostics for crash monitoring
setupDiagnostics();

removeLegacyPwaState();

const canonicalHost = getCanonicalHostForHost(window.location.hostname);
const shouldRedirectToCanonicalHost = Boolean(canonicalHost && canonicalHost !== window.location.hostname);

if (shouldRedirectToCanonicalHost && canonicalHost) {
    const canonicalUrl = new URL(window.location.href);
    canonicalUrl.hostname = canonicalHost;
    canonicalUrl.port = '';
    window.location.replace(canonicalUrl.toString());
}

if (shouldRedirectToCanonicalHost) {
    // Stop bootstrapping on the alias host while the browser navigates.
} else {
    // Removed AnalyticsInitializer() call - analytics dependency removed
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <StartupLoader>
            <AuthWrapper />
        </StartupLoader>
    );
}
