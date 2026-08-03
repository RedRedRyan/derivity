/**
 * Normalizes a hostname by converting to lowercase and removing www prefix
 * @param hostname - The hostname to normalize
 * @returns The normalized hostname
 */
export function normalizeHostname(hostname: string): string {
    return hostname
        .toLowerCase()
        .replace(/^www\./, '')
        .trim();
}

/**
 * Gets the current hostname in normalized form
 * @returns The normalized current hostname
 */
export function getCurrentHostname(): string {
    if (typeof window === 'undefined') {
        return 'localhost';
    }
    return normalizeHostname(window.location.hostname);
}
