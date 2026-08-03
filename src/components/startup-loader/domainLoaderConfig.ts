export interface DomainLoaderConfig {
    siteName: string;
    domain: string;
    welcomeText: string;
    subtitle: string;
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    loaderText: string;
    footerText: string;
    fallingSymbols: string[];
    duration: number;
    messages: string[];
}

const DEFAULT_MESSAGES = [
    'Initializing secure environment...',
    'Connecting to trading services...',
    'Loading market analysis tools...',
    'Synchronizing live data...',
    'Preparing your dashboard...',
    'Launching application...',
];

const LOCALHOST_LOADER_COLORS = {
    primaryColor: '#00d4ff',
    secondaryColor: '#7c3aed',
    accentColor: '#fbbf24',
    backgroundColor: '#020617',
} as const;

const createLoaderConfig = (
    domain: string,
    siteName: string,
    colors: Pick<DomainLoaderConfig, 'primaryColor' | 'secondaryColor' | 'accentColor' | 'backgroundColor'>,
    subtitle = 'Premium Deriv Trading Tools'
): DomainLoaderConfig => ({
    siteName,
    domain,
    welcomeText: `Welcome to ${domain}`,
    subtitle,
    logo: undefined,
    ...colors,
    loaderText: 'Preparing your trading environment',
    footerText: `Powered by ${siteName}`,
    fallingSymbols: ['$', '\u20AC', '\u00A3', '\u20BF'],
    duration: 6000,
    messages: DEFAULT_MESSAGES,
});

export const domainLoaderConfig: Record<string, DomainLoaderConfig> = {
    'riskmanagers.site': createLoaderConfig(
        'riskmanagers.site',
        'Risk Managers',
        LOCALHOST_LOADER_COLORS,
        'Trade Smarter. Manage Risk Better.'
    ),
    'derivhhub.com': createLoaderConfig('derivhhub.com', 'Termica FX', {
        primaryColor: '#00ff88',
        secondaryColor: '#00aaff',
        accentColor: '#ffd700',
        backgroundColor: '#030712',
    }),
    'derivhhub.site': createLoaderConfig('derivhhub.site', 'Termica FX', {
        primaryColor: '#00ff88',
        secondaryColor: '#00aaff',
        accentColor: '#ffd700',
        backgroundColor: '#030712',
    }),
    'masterhunter.site': createLoaderConfig('masterhunter.site', 'Master Hunter', {
        primaryColor: '#22c55e',
        secondaryColor: '#14b8a6',
        accentColor: '#f8fafc',
        backgroundColor: '#02110b',
    }),
    'husseinfx.site': createLoaderConfig('husseinfx.site', 'Husseinfx', {
        primaryColor: '#38bdf8',
        secondaryColor: '#2563eb',
        accentColor: '#fef3c7',
        backgroundColor: '#020617',
    }),
    'levynetrading.site': createLoaderConfig('levynetrading.site', 'Levyne Trading', {
        primaryColor: '#a78bfa',
        secondaryColor: '#06b6d4',
        accentColor: '#ffffff',
        backgroundColor: '#100824',
    }),
    'novaderiv.site': createLoaderConfig('novaderiv.site', 'Levyne Trading', {
        primaryColor: '#a78bfa',
        secondaryColor: '#06b6d4',
        accentColor: '#ffffff',
        backgroundColor: '#100824',
    }),
    'tradinghubs.site': createLoaderConfig('tradinghubs.site', 'Trading Hubs', {
        primaryColor: '#f59e0b',
        secondaryColor: '#ef4444',
        accentColor: '#fff7ed',
        backgroundColor: '#170b04',
    }),
    'mafiahub.site': createLoaderConfig('mafiahub.site', 'Mafia Hub', {
        primaryColor: '#dc2626',
        secondaryColor: '#7f1d1d',
        accentColor: '#f9fafb',
        backgroundColor: '#080202',
    }),
    'easytraders.site': createLoaderConfig('easytraders.site', 'Easy Traders', {
        primaryColor: '#10b981',
        secondaryColor: '#84cc16',
        accentColor: '#ecfccb',
        backgroundColor: '#04130b',
    }),
    'dollarmaster.site': createLoaderConfig('dollarmaster.site', 'Dollar Master', {
        primaryColor: '#facc15',
        secondaryColor: '#22c55e',
        accentColor: '#ffffff',
        backgroundColor: '#111006',
    }),
    'profitempire.site': createLoaderConfig('profitempire.site', 'Prime Empire', {
        primaryColor: '#e879f9',
        secondaryColor: '#f97316',
        accentColor: '#fdf4ff',
        backgroundColor: '#16051c',
    }),
    'primempire.site': createLoaderConfig('primempire.site', 'Prime Empire', {
        primaryColor: '#e879f9',
        secondaryColor: '#f97316',
        accentColor: '#fdf4ff',
        backgroundColor: '#16051c',
    }),
    'mkulimamdogo.site': createLoaderConfig('mkulimamdogo.site', 'Mkulima Mdogo', {
        primaryColor: '#84cc16',
        secondaryColor: '#16a34a',
        accentColor: '#fef9c3',
        backgroundColor: '#101706',
    }),
    'kicktrade.site': createLoaderConfig('kicktrade.site', 'Kicktrade', {
        primaryColor: '#2dd4bf',
        secondaryColor: '#0f766e',
        accentColor: '#ccfbf1',
        backgroundColor: '#031412',
    }),
    'dollarsigns.site': createLoaderConfig('dollarsigns.site', 'Dollarsign', {
        primaryColor: '#fde047',
        secondaryColor: '#16a34a',
        accentColor: '#fefce8',
        backgroundColor: '#0f1204',
    }),
    'moneybagpro.site': createLoaderConfig('moneybagpro.site', 'Money Bag Pro', {
        primaryColor: '#facc15',
        secondaryColor: '#15803d',
        accentColor: '#fde047',
        backgroundColor: '#0a0f05',
    }),
    'www.moneybagpro.site': createLoaderConfig('www.moneybagpro.site', 'Money Bag Pro', {
        primaryColor: '#facc15',
        secondaryColor: '#15803d',
        accentColor: '#fde047',
        backgroundColor: '#0a0f05',
    }),
    'mrduke.site': createLoaderConfig('mrduke.site', 'Mr Duke', {
        primaryColor: '#00ff88',
        secondaryColor: '#00aaff',
        accentColor: '#ffd700',
        backgroundColor: '#030712',
    }),
    localhost: createLoaderConfig('localhost', 'Dev Trading Platform', LOCALHOST_LOADER_COLORS, 'Testing Environment'),
};

export const defaultLoaderConfig: DomainLoaderConfig = {
    siteName: 'Trading Platform',
    domain: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    welcomeText: 'Welcome to Trading Platform',
    subtitle: 'Preparing your trading experience',
    logo: undefined,
    primaryColor: '#00d4ff',
    secondaryColor: '#7c3aed',
    accentColor: '#ffffff',
    backgroundColor: '#020617',
    loaderText: 'Initializing application',
    footerText: 'Secure Trading Environment',
    fallingSymbols: ['$', '\u20AC', '\u00A3'],
    duration: 6000,
    messages: DEFAULT_MESSAGES,
};
