import { useMemo } from 'react';
import { domainLoaderConfig, defaultLoaderConfig, DomainLoaderConfig } from './domainLoaderConfig';
import { normalizeHostname } from './normalizeHostname';

/**
 * Hook to get the domain-specific loader configuration
 * @returns The loader configuration for the current domain
 */
export function useDomainLoaderConfig(): DomainLoaderConfig {
    return useMemo(() => {
        const hostname = normalizeHostname(typeof window !== 'undefined' ? window.location.hostname : 'localhost');
        const withWelcomeText = (config: DomainLoaderConfig, domain = hostname): DomainLoaderConfig => ({
            ...config,
            domain,
            welcomeText: `Welcome to ${domain}`,
        });

        // Check for exact match
        if (domainLoaderConfig[hostname]) {
            return withWelcomeText(domainLoaderConfig[hostname]);
        }

        // Check for subdomain match (e.g., app.mrduke.site)
        for (const [domain, config] of Object.entries(domainLoaderConfig)) {
            if (hostname.endsWith(`.${domain}`) || hostname === domain) {
                return withWelcomeText(config, domain);
            }
        }

        // Check for preview deployment patterns
        const previewPatterns = [/^[\w-]+--/, /^preview-/, /^pr-/];

        const isPreview = previewPatterns.some(pattern => pattern.test(hostname));

        if (isPreview) {
            // Extract potential domain from preview URL
            const parts = hostname.split('.');
            if (parts.length > 2) {
                const possibleDomain = parts.slice(-2).join('.');
                if (domainLoaderConfig[possibleDomain]) {
                    return withWelcomeText(domainLoaderConfig[possibleDomain], possibleDomain);
                }
            }
        }

        return withWelcomeText(defaultLoaderConfig);
    }, []);
}
