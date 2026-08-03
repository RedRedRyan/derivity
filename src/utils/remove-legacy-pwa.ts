const LEGACY_PWA_CACHE_PREFIXES = ['risk-managers-static', 'risk-managers-shell'];
const LEGACY_PWA_STORAGE_KEYS = ['risk_managers_pwa_installed'];

export const removeLegacyPwaState = () => {
    if (typeof window === 'undefined') return;

    LEGACY_PWA_STORAGE_KEYS.forEach(key => window.localStorage.removeItem(key));

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .getRegistrations()
            .then(registrations => {
                registrations.forEach(registration => {
                    registration.unregister();
                });
            })
            .catch(error => {
                console.error('Legacy service worker cleanup failed:', error);
            });
    }

    if ('caches' in window) {
        window.caches
            .keys()
            .then(cache_names =>
                Promise.all(
                    cache_names
                        .filter(cache_name => LEGACY_PWA_CACHE_PREFIXES.some(prefix => cache_name.startsWith(prefix)))
                        .map(cache_name => window.caches.delete(cache_name))
                )
            )
            .catch(error => {
                console.error('Legacy PWA cache cleanup failed:', error);
            });
    }
};
