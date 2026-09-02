import { DerivWSAccountsService } from '@/services/derivws-accounts.service';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import { getPendingApiToken } from '@/utils/api-token-permissions';
import brandConfig from '../../../../../brand.config.json';

// =============================================================================
// Domain Configuration Map
// Maps each hostname to its specific Deriv APP_ID, OAuth CLIENT_ID, and the
// exact redirect URI registered in that OAuth app. Add a new entry here to
// support an additional domain — no other code changes required.
// =============================================================================

interface DomainConfig {
    clientId: string; // OAuth 2.0 CLIENT_ID (new OAuth app)
    appId: string; // Legacy Deriv APP_ID for intelligent platform routing
    redirectUri: string; // MUST match the redirect URL registered in the OAuth app exactly
    botsFolder: string; // Public folder used by Best Bots XML loading for this domain
    canonicalHost: string; // Preferred host used for redirects and auth/session consistency
    includeLegacyAppIdInOAuth: boolean; // Only enable when the legacy app redirects to this domain
    useLegacyOAuthLogin: boolean; // Use old OAuth app_id login when OAuth2 client setup is not valid yet
    features: DomainFeatureFlags;
}

type MartingaleMode = 'no_martingale' | 'fixed_loss_trigger' | 'consecutive_loss_trigger';

type DomainFeatureFlags = {
    botIdeas: boolean;
    printPopups: boolean;
    autoTrades: boolean;
    manualTrading: boolean;
    scanner: boolean;
    accumilatoirs: boolean;
    chart: boolean;
    tradingView: boolean;
};

type MartingaleConfig = {
    mode: MartingaleMode;
    consecutiveLossThreshold: number;
};

type DomainUIConfig = {
    brandName: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl: string;
    faviconUrl: string;
    headerBgColor: string;
    headerTextColor: string;
    sidebarBgColor: string;
    sidebarTextColor: string;
    buttonPrimaryBg: string;
    buttonPrimaryText: string;
    buttonSecondaryBg: string;
    buttonSecondaryText: string;
    cardBgColor: string;
    cardBorderColor: string;
    textPrimary: string;
    textSecondary: string;
    successColor: string;
    errorColor: string;
    warningColor: string;
    fontFamily: string;
    borderRadius: string;
    showHeaderLogo: boolean;
    showHeaderTitle: boolean;
    showFooter: boolean;
    showDisclaimer: boolean;
    customCssVars: Record<string, string>;
    martingale?: MartingaleConfig;
};

interface DomainConfig {
    clientId: string;
    appId: string;
    redirectUri: string;
    botsFolder: string;
    canonicalHost: string;
    includeLegacyAppIdInOAuth: boolean;
    useLegacyOAuthLogin: boolean;
    features: DomainFeatureFlags;
    ui: DomainUIConfig;
}

interface HostedDomainDefinition {
    primaryDomain: string;
    aliases?: string[];
    clientId: string;
    appId: string;
    botsFolder?: string;
    includeLegacyAppIdInOAuth?: boolean;
    useLegacyOAuthLogin?: boolean;
    features?: Partial<DomainFeatureFlags>;
    redirectUri?: string;
    ui?: Partial<DomainUIConfig>;
}

type DomainShellPalette = {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    headerBgColor: string;
    headerTextColor?: string;
    sidebarBgColor: string;
    sidebarTextColor?: string;
    navBg: string;
    navActive: string;
    navHover: string;
    pageBg: string;
    pageBgLight: string;
    sectionBg: string;
    sectionBg2: string;
    sectionMuted: string;
    sectionBorder: string;
    panelBorder: string;
    panelBorderSoft: string;
    runButton?: string;
    runButtonHover?: string;
    authBlue?: string;
    authBorder?: string;
    gold?: string;
    panelText?: string;
    panelTextMuted?: string;
};

const DEFAULT_BOTS_FOLDER = 'optimumtraders.site';
const DEFAULT_DOMAIN_FEATURES: DomainFeatureFlags = {
    botIdeas: false,
    printPopups: true,
    autoTrades: true,
    manualTrading: true,
    scanner: true,
    accumilatoirs: false,
    chart: true,
    tradingView: true,
};

const DEFAULT_MARTINGALE_CONFIG: MartingaleConfig = {
    mode: 'fixed_loss_trigger',
    consecutiveLossThreshold: 1,
};

const DEFAULT_DOMAIN_UI: DomainUIConfig = {
    brandName: 'Deriv Bot',
    primaryColor: '#f0050c',
    secondaryColor: '#1a1a2e',
    accentColor: '#2196f3',
    logoUrl: '',
    faviconUrl: '',
    headerBgColor: '#1a1a2e',
    headerTextColor: 'var(--text-colored-background)',
    sidebarBgColor: '#16213e',
    sidebarTextColor: '#e0e0e0',
    buttonPrimaryBg: '#f0050c',
    buttonPrimaryText: 'var(--text-colored-background)',
    buttonSecondaryBg: '#2d2d44',
    buttonSecondaryText: '#e0e0e0',
    cardBgColor: '#1e1e32',
    cardBorderColor: '#2d2d44',
    textPrimary: 'var(--text-colored-background)',
    textSecondary: '#a0a0b0',
    successColor: '#4caf50',
    errorColor: '#f44336',
    warningColor: '#f0050c',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    borderRadius: '8px',
    showHeaderLogo: true,
    showHeaderTitle: true,
    showFooter: true,
    showDisclaimer: true,
    customCssVars: {},
    martingale: DEFAULT_MARTINGALE_CONFIG,
};

const LOCALHOST_DOMAIN_UI: Partial<DomainUIConfig> = {
    ...DEFAULT_DOMAIN_UI,
};

const createDomainShellUI = (
    brandName: string,
    {
        primaryColor,
        secondaryColor,
        accentColor,
        headerBgColor,
        headerTextColor = '#ffffff',
        sidebarBgColor,
        sidebarTextColor = '#ffffff',
        navBg,
        navActive,
        navHover,
        pageBg,
        pageBgLight,
        sectionBg,
        sectionBg2,
        sectionMuted,
        sectionBorder,
        panelBorder,
        panelBorderSoft,
        runButton = primaryColor,
        runButtonHover = accentColor,
        authBlue = secondaryColor,
        authBorder = panelBorder,
        gold = accentColor,
        panelText = headerTextColor,
        panelTextMuted = `${sidebarTextColor}cc`,
    }: DomainShellPalette
): Partial<DomainUIConfig> => ({
    brandName,
    primaryColor,
    secondaryColor,
    accentColor,
    headerBgColor,
    headerTextColor,
    sidebarBgColor,
    sidebarTextColor,
    buttonPrimaryBg: primaryColor,
    buttonPrimaryText: '#f0050c',
    buttonSecondaryBg: secondaryColor,
    buttonSecondaryText: sidebarTextColor,
    cardBgColor: sectionBg,
    cardBorderColor: sectionBorder,
    textPrimary: panelText,
    textSecondary: panelTextMuted,
    successColor: runButton,
    warningColor: gold,
    customCssVars: {
        '--rm-shell-top': headerBgColor,
        '--rm-shell-top-light': headerBgColor,
        '--rm-shell-nav': navBg,
        '--rm-shell-nav-active': navActive,
        '--rm-shell-nav-hover': navHover,
        '--rm-shell-gold': gold,
        '--rm-shell-text': headerTextColor,
        '--rm-shell-header-text': headerTextColor,
        '--rm-shell-nav-text': sidebarTextColor,
        '--rm-shell-panel-text': panelText,
        '--rm-shell-panel-text-muted': panelTextMuted,
        '--rm-shell-surface': headerBgColor,
        '--rm-shell-surface-2': sectionBg,
        '--rm-shell-border': sectionBorder,
        '--rm-shell-input-bg': sectionBg,
        '--rm-shell-input-text': headerTextColor,
        '--rm-shell-button-text': '#ffffff',
        '--rm-shell-circle-bg': navActive,
        '--rm-shell-circle-text': sidebarTextColor,
        '--rm-shell-muted': panelTextMuted,
        '--rm-shell-auth-blue': authBlue,
        '--rm-shell-auth-border': authBorder,
        '--rm-shell-run': runButton,
        '--rm-shell-run-hover': runButtonHover,
        '--rm-shell-run-panel': pageBg,
        '--rm-shell-run-panel-light': pageBgLight,
        '--rm-shell-section': sectionBg,
        '--rm-shell-section-2': sectionBg2,
        '--rm-shell-section-muted': sectionMuted,
        '--rm-shell-section-border': sectionBorder,
        '--rm-shell-run-panel-border': panelBorder,
        '--rm-shell-run-panel-border-soft': panelBorderSoft,
    },
});

const createHostedDomainEntries = ({
    primaryDomain,
    aliases = [],
    clientId,
    appId,
    botsFolder = primaryDomain,
    includeLegacyAppIdInOAuth = true,
    useLegacyOAuthLogin = false,
    features = {},
    redirectUri = `https://${primaryDomain}/`,
    ui = {},
}: HostedDomainDefinition): Record<string, DomainConfig> => {
    const config: DomainConfig = {
        clientId,
        appId,
        redirectUri,
        botsFolder,
        canonicalHost: primaryDomain,
        includeLegacyAppIdInOAuth,
        useLegacyOAuthLogin,
        features: {
            ...DEFAULT_DOMAIN_FEATURES,
            ...features,
        },
        ui: {
            ...DEFAULT_DOMAIN_UI,
            ...ui,
        },
    };

    return [primaryDomain, ...aliases].reduce<Record<string, DomainConfig>>((accumulator, hostname) => {
        accumulator[hostname] = config;
        return accumulator;
    }, {});
};

export const DOMAIN_CONFIG: Record<string, DomainConfig> = {
    // ── Primary production domain ────────────────────────────────────────────
    // New OAuth app registered redirect: https://riskmanagers.site/ (trailing slash)
    ...createHostedDomainEntries({
        primaryDomain: 'cyctrades.vercel.app',
        aliases: ['www.cyctrades.vercel.app'],
        clientId: process.env.CLIENT_ID || '33PPqCmoCqt9yWsbBuSPu',
        appId: process.env.APP_ID || '',
        redirectUri: process.env.REDIRECT_URI || 'https://cyctrades.vercel.app/',
        includeLegacyAppIdInOAuth: true,
        features: {
            autoTrades: true,
            accumilatoirs: true,
            chart: false,
            manualTrading: true,
            tradingView: false,
        },
        ui: {
            ...LOCALHOST_DOMAIN_UI,
            brandName: 'Cycle Trades',
            primaryColor: '#f0050c',
            secondaryColor: '#00aaff',
        },
    }),
    // ── Additional production domain ─────────────────────────────────────────
    ...createHostedDomainEntries({
        primaryDomain: 'cyctrades.vercel.app',
        aliases: ['www.cyctrades.vercel.app'],
        clientId: '33PPqCmoCqt9yWsbBuSPu',
        appId: '',
        redirectUri: 'https://cyctrades.vercel.app/',
        botsFolder: 'optimumtraders.site',
        includeLegacyAppIdInOAuth: false,
        features: {
            autoTrades: true,
            accumilatoirs: true,
            chart: false,
            manualTrading: true,
            tradingView: false,
        },
        ui: createDomainShellUI('Cycle Trades', {
            primaryColor: '#38bdf8',
            secondaryColor: '#2563eb',
            accentColor: '#f0050c',
            headerBgColor: '#020617',
            sidebarBgColor: '#0f172a',
            navBg: '#1d4ed8',
            navActive: '#1e40af',
            navHover: '#2563eb',
            pageBg: '#0c4a6e',
            pageBgLight: '#e0f2fe',
            sectionBg: '#075985',
            sectionBg2: '#0369a1',
            sectionMuted: '#0284c7',
            sectionBorder: 'rgba(56, 189, 248, 0.34)',
            panelBorder: '#38bdf8',
            panelBorderSoft: 'rgba(56, 189, 248, 0.22)',
            runButton: '#0ea5e9',
            runButtonHover: '#38bdf8',
            authBlue: '#1d4ed8',
            authBorder: '#7dd3fc',
            gold: '#ffffff',
        }),
    }),

    ...createHostedDomainEntries({
        primaryDomain: 'derivhhub.com',
        aliases: ['www.derivhhub.com', 'derivhhub.site', 'www.derivhhub.site'],
        clientId: '33h4ThjleZotVMiKQ1gE7',
        appId: '124217',
        redirectUri: 'https://derivhhub.com/',
        botsFolder: 'optimumtraders.site',
        includeLegacyAppIdInOAuth: false,
        features: {
            botIdeas: false,
            printPopups: false,
        },
        ui: createDomainShellUI('Termica FX', {
            primaryColor: '#00ff88',
            secondaryColor: '#00aaff',
            accentColor: '#ffd700',
            headerBgColor: '#030712',
            sidebarBgColor: '#062b24',
            navBg: '#064e3b',
            navActive: '#047857',
            navHover: '#047857',
            pageBg: '#082f49',
            pageBgLight: '#dcfce7',
            sectionBg: '#063244',
            sectionBg2: '#075985',
            sectionMuted: '#0369a1',
            sectionBorder: 'rgba(0, 255, 136, 0.32)',
            panelBorder: '#00ff88',
            panelBorderSoft: 'rgba(0, 255, 136, 0.22)',
            runButton: '#00b8ad',
            runButtonHover: '#00ff88',
            authBlue: '#0369a1',
            authBorder: '#00aaff',
            gold: '#ffd700',
        }),
    }),
    // Dedicated branded domains wired with the same OAuth2 flow as the working domains.
    ...createHostedDomainEntries({
        primaryDomain: 'masterhunter.site',
        aliases: ['www.masterhunter.site'],
        clientId: '33y9R1zDsuaYKXK2RaEH9',
        appId: '96223',
        redirectUri: 'https://masterhunter.site/',
        botsFolder: 'masterhunter.site',
        includeLegacyAppIdInOAuth: true,
        features: {
            autoTrades: true,
            manualTrading: true,
        },
        ui: createDomainShellUI('Master Hunter', {
            primaryColor: '#22c55e',
            secondaryColor: '#14b8a6',
            accentColor: '#f8fafc',
            headerBgColor: '#02110b',
            sidebarBgColor: '#052e16',
            navBg: '#14532d',
            navActive: '#166534',
            navHover: '#15803d',
            pageBg: '#052e16',
            pageBgLight: '#dcfce7',
            sectionBg: '#06351b',
            sectionBg2: '#064e3b',
            sectionMuted: '#047857',
            sectionBorder: 'rgba(34, 197, 94, 0.32)',
            panelBorder: '#22c55e',
            panelBorderSoft: 'rgba(34, 197, 94, 0.2)',
            runButton: '#22c55e',
            runButtonHover: '#4ade80',
            authBlue: '#14532d',
            authBorder: '#14b8a6',
            gold: '#bef264',
        }),
    }),
    ...createHostedDomainEntries({
        primaryDomain: 'husseinfx.site',
        aliases: ['www.husseinfx.site'],
        clientId: '33B0O9dYtRl6X3OQ6rJsz',
        appId: '122208',
        redirectUri: 'https://husseinfx.site/',
        botsFolder: 'husseinfx.site',
        includeLegacyAppIdInOAuth: false,
        features: {
            autoTrades: true,
            manualTrading: true,
        },
        ui: createDomainShellUI('Husseinfx', {
            primaryColor: '#38bdf8',
            secondaryColor: '#2563eb',
            accentColor: '#fef3c7',
            headerBgColor: '#020617',
            sidebarBgColor: '#0f172a',
            navBg: '#1d4ed8',
            navActive: '#1e40af',
            navHover: '#2563eb',
            pageBg: '#0c4a6e',
            pageBgLight: '#e0f2fe',
            sectionBg: '#075985',
            sectionBg2: '#0369a1',
            sectionMuted: '#0284c7',
            sectionBorder: 'rgba(56, 189, 248, 0.34)',
            panelBorder: '#38bdf8',
            panelBorderSoft: 'rgba(56, 189, 248, 0.22)',
            runButton: '#0ea5e9',
            runButtonHover: '#38bdf8',
            authBlue: '#1d4ed8',
            authBorder: '#7dd3fc',
            gold: '#facc15',
        }),
    }),
    ...createHostedDomainEntries({
        primaryDomain: 'levynetrading.site',
        aliases: ['www.levynetrading.site', 'novaderiv.site', 'www.novaderiv.site'],
        clientId: '33B45506MeTF6j6VHOi7A',
        appId: '122208',
        redirectUri: 'https://levynetrading.site/',
        botsFolder: 'levynetrading.site',
        includeLegacyAppIdInOAuth: false,
        features: {
            autoTrades: true,
            manualTrading: true,
        },
        ui: createDomainShellUI('Levyne Trading', {
            primaryColor: '#a78bfa',
            secondaryColor: '#06b6d4',
            accentColor: '#ffffff',
            headerBgColor: '#100824',
            sidebarBgColor: '#1e1b4b',
            navBg: '#5b21b6',
            navActive: '#6d28d9',
            navHover: '#7c3aed',
            pageBg: '#312e81',
            pageBgLight: '#ede9fe',
            sectionBg: '#3730a3',
            sectionBg2: '#4338ca',
            sectionMuted: '#4f46e5',
            sectionBorder: 'rgba(167, 139, 250, 0.34)',
            panelBorder: '#a78bfa',
            panelBorderSoft: 'rgba(167, 139, 250, 0.22)',
            runButton: '#06b6d4',
            runButtonHover: '#22d3ee',
            authBlue: '#5b21b6',
            authBorder: '#a78bfa',
            gold: '#f0abfc',
        }),
    }),
    ...createHostedDomainEntries({
        primaryDomain: 'tradinghubs.site',
        aliases: ['www.tradinghubs.site'],
        clientId: '33hi7ev9NiDjWY64OJuSw',
        appId: '122208',
        redirectUri: 'https://tradinghubs.site/',
        botsFolder: 'tradinghubs.site',
        includeLegacyAppIdInOAuth: true,
        features: {
            autoTrades: true,
            manualTrading: true,
        },
        ui: createDomainShellUI('Trading Hubs', {
            primaryColor: '#f59e0b',
            secondaryColor: '#ef4444',
            accentColor: '#fff7ed',
            headerBgColor: '#170b04',
            sidebarBgColor: '#431407',
            navBg: '#9a3412',
            navActive: '#c2410c',
            navHover: '#9a3412',
            pageBg: '#7c2d12',
            pageBgLight: '#ffedd5',
            sectionBg: '#9a3412',
            sectionBg2: '#c2410c',
            sectionMuted: '#ea580c',
            sectionBorder: 'rgba(245, 158, 11, 0.34)',
            panelBorder: '#f59e0b',
            panelBorderSoft: 'rgba(245, 158, 11, 0.22)',
            runButton: '#f59e0b',
            runButtonHover: '#fbbf24',
            authBlue: '#9a3412',
            authBorder: '#fed7aa',
            gold: '#fbbf24',
        }),
    }),
    ...createHostedDomainEntries({
        primaryDomain: 'mafiahub.site',
        aliases: ['www.mafiahub.site'],
        clientId: '33ABjz4hBB7eawgytiT6P',
        appId: '120589',
        redirectUri: 'https://mafiahub.site/',
        botsFolder: 'mafiahub.site',
        includeLegacyAppIdInOAuth: true,
        features: {
            autoTrades: true,
            manualTrading: true,
        },
        ui: createDomainShellUI('Mafia Hub', {
            primaryColor: '#dc2626',
            secondaryColor: '#7f1d1d',
            accentColor: '#f9fafb',
            headerBgColor: '#080202',
            sidebarBgColor: '#1f0505',
            navBg: '#450a0a',
            navActive: '#7f1d1d',
            navHover: '#991b1b',
            pageBg: '#1f0505',
            pageBgLight: '#fee2e2',
            sectionBg: '#2a0707',
            sectionBg2: '#450a0a',
            sectionMuted: '#7f1d1d',
            sectionBorder: 'rgba(220, 38, 38, 0.34)',
            panelBorder: '#dc2626',
            panelBorderSoft: 'rgba(220, 38, 38, 0.22)',
            runButton: '#dc2626',
            runButtonHover: '#ef4444',
            authBlue: '#450a0a',
            authBorder: '#dc2626',
            gold: '#fca5a5',
        }),
    }),
    ...createHostedDomainEntries({
        primaryDomain: 'easytraders.site',
        aliases: ['www.easytraders.site'],
        clientId: '33Dp1fPdIGm7Sf0zGpJYw',
        appId: '',
        redirectUri: 'https://easytraders.site/',
        botsFolder: 'easytraders.site',
        includeLegacyAppIdInOAuth: false,
        features: {
            autoTrades: true,
            manualTrading: true,
        },
        ui: createDomainShellUI('Easy Traders', {
            primaryColor: '#10b981',
            secondaryColor: '#84cc16',
            accentColor: '#ecfccb',
            headerBgColor: '#04130b',
            sidebarBgColor: '#064e3b',
            navBg: '#047857',
            navActive: '#047857',
            navHover: '#047857',
            pageBg: '#065f46',
            pageBgLight: '#d1fae5',
            sectionBg: '#047857',
            sectionBg2: '#047857',
            sectionMuted: '#10b981',
            sectionBorder: 'rgba(132, 204, 22, 0.34)',
            panelBorder: '#10b981',
            panelBorderSoft: 'rgba(16, 185, 129, 0.22)',
            runButton: '#10b981',
            runButtonHover: '#34d399',
            authBlue: '#047857',
            authBorder: '#84cc16',
            gold: '#bef264',
        }),
    }),
    ...createHostedDomainEntries({
        primaryDomain: 'dollarmaster.site',
        aliases: ['www.dollarmaster.site'],
        clientId: '33Do7K9svQABFySnUo7pE',
        appId: '',
        redirectUri: 'https://dollarmaster.site/',
        botsFolder: 'dollarmaster.site',
        includeLegacyAppIdInOAuth: false,
        features: {
            autoTrades: true,
            manualTrading: true,
        },
        ui: createDomainShellUI('Dollar Master', {
            primaryColor: '#facc15',
            secondaryColor: '#22c55e',
            accentColor: '#ffffff',
            headerBgColor: '#111006',
            sidebarBgColor: '#1f2a0a',
            navBg: '#3f6212',
            navActive: '#4d7c0f',
            navHover: '#4d7c0f',
            pageBg: '#365314',
            pageBgLight: '#fef9c3',
            sectionBg: '#3f6212',
            sectionBg2: '#4d7c0f',
            sectionMuted: '#65a30d',
            sectionBorder: 'rgba(250, 204, 21, 0.34)',
            panelBorder: '#facc15',
            panelBorderSoft: 'rgba(250, 204, 21, 0.22)',
            runButton: '#22c55e',
            runButtonHover: '#4ade80',
            authBlue: '#3f6212',
            authBorder: '#facc15',
            gold: '#facc15',
        }),
    }),
    ...createHostedDomainEntries({
        primaryDomain: 'profitempire.site',
        aliases: ['www.profitempire.site', 'primempire.site', 'www.primempire.site'],
        clientId: '33DtjQWnmdxRkogkgAOtP',
        appId: '',
        redirectUri: 'https://profitempire.site/',
        botsFolder: 'profitempire.site',
        includeLegacyAppIdInOAuth: false,
        features: {
            autoTrades: true,
            manualTrading: true,
        },
        ui: createDomainShellUI('Prime Empire', {
            primaryColor: '#e879f9',
            secondaryColor: '#f97316',
            accentColor: '#fdf4ff',
            headerBgColor: '#16051c',
            sidebarBgColor: '#3b0764',
            navBg: '#86198f',
            navActive: '#a21caf',
            navHover: '#c026d3',
            pageBg: '#581c87',
            pageBgLight: '#fae8ff',
            sectionBg: '#701a75',
            sectionBg2: '#86198f',
            sectionMuted: '#a21caf',
            sectionBorder: 'rgba(232, 121, 249, 0.34)',
            panelBorder: '#e879f9',
            panelBorderSoft: 'rgba(232, 121, 249, 0.22)',
            runButton: '#f97316',
            runButtonHover: '#fb923c',
            authBlue: '#86198f',
            authBorder: '#e879f9',
            gold: '#fdba74',
        }),
    }),
    ...createHostedDomainEntries({
        primaryDomain: 'mkulimamdogo.site',
        aliases: ['www.mkulimamdogo.site'],
        clientId: '33FIBnsBLHouNk9bOnSVa',
        appId: '',
        redirectUri: 'https://mkulimamdogo.site/',
        botsFolder: 'mkulimamdogo.site',
        includeLegacyAppIdInOAuth: false,
        features: {
            autoTrades: true,
            manualTrading: true,
        },
        ui: createDomainShellUI('Mkulima Mdogo', {
            primaryColor: '#84cc16',
            secondaryColor: '#16a34a',
            accentColor: '#fef9c3',
            headerBgColor: '#101706',
            sidebarBgColor: '#1f2a0a',
            navBg: '#365314',
            navActive: '#4d7c0f',
            navHover: '#65a30d',
            pageBg: '#365314',
            pageBgLight: '#ecfccb',
            sectionBg: '#3f6212',
            sectionBg2: '#4d7c0f',
            sectionMuted: '#65a30d',
            sectionBorder: 'rgba(132, 204, 22, 0.34)',
            panelBorder: '#84cc16',
            panelBorderSoft: 'rgba(132, 204, 22, 0.22)',
            runButton: '#16a34a',
            runButtonHover: '#22c55e',
            authBlue: '#3f6212',
            authBorder: '#bef264',
            gold: '#fde047',
        }),
    }),
    ...createHostedDomainEntries({
        primaryDomain: 'kicktrade.site',
        aliases: ['www.kicktrade.site'],
        clientId: '33vlry53HSLhXICBcUURu',
        appId: '80364',
        redirectUri: 'https://www.kicktrade.site/',
        botsFolder: 'kicktrade.site',
        includeLegacyAppIdInOAuth: true,
        features: {
            autoTrades: true,
            manualTrading: true,
        },
        ui: createDomainShellUI('Kicktrade', {
            primaryColor: '#2dd4bf',
            secondaryColor: '#0f766e',
            accentColor: '#ccfbf1',
            headerBgColor: '#031412',
            sidebarBgColor: '#042f2e',
            navBg: '#0f766e',
            navActive: '#0f766e',
            navHover: '#0f766e',
            pageBg: '#134e4a',
            pageBgLight: '#ccfbf1',
            sectionBg: '#115e59',
            sectionBg2: '#0f766e',
            sectionMuted: '#0d9488',
            sectionBorder: 'rgba(45, 212, 191, 0.34)',
            panelBorder: '#2dd4bf',
            panelBorderSoft: 'rgba(45, 212, 191, 0.22)',
            runButton: '#14b8a6',
            runButtonHover: '#2dd4bf',
            authBlue: '#0f766e',
            authBorder: '#5eead4',
            gold: '#99f6e4',
        }),
    }),
};

const normalizeHostname = (hostname: string) => hostname.split(':')[0].toLowerCase();
const DOMAIN_REDIRECTS: Record<string, string> = {
    'mrzetuzetu.site': 'https://www.kicktrade.site',
    'www.mrzetuzetu.site': 'https://www.kicktrade.site',
};

export const getDomainConfigForHost = (hostname: string): DomainConfig | undefined =>
    DOMAIN_CONFIG[normalizeHostname(hostname)];
export const getCanonicalHostForHost = (hostname: string): string | undefined =>
    DOMAIN_CONFIG[normalizeHostname(hostname)]?.canonicalHost;
export const getDomainRedirectUrl = (
    location: Pick<Location, 'hash' | 'hostname' | 'pathname' | 'search'> = window.location
) => {
    const redirect_origin = DOMAIN_REDIRECTS[normalizeHostname(location.hostname)];
    if (!redirect_origin) return '';

    return `${redirect_origin}${location.pathname}${location.search}${location.hash}`;
};

/**
 * Returns the DomainConfig for the current hostname.
 * Falls back to env vars (for local / Replit dev) when the hostname is not
 * listed in DOMAIN_CONFIG.
 */
export const getDomainConfig = (activeHostname = window.location.hostname): DomainConfig => {
    const hostname = normalizeHostname(activeHostname);
    const domain_config = getDomainConfigForHost(hostname);
    if (domain_config) {
        return domain_config;
    }
    // Fallback — used on localhost and Replit dev domains
    return {
        clientId: process.env.CLIENT_ID || '33cCr2bWsByPgLlormNFw',
        appId: process.env.APP_ID || '71937',
        redirectUri: process.env.REDIRECT_URI || window.location.origin,
        botsFolder: process.env.BOTS_FOLDER || DEFAULT_BOTS_FOLDER,
        canonicalHost: hostname,
        includeLegacyAppIdInOAuth: true,
        useLegacyOAuthLogin: false,
        features: DEFAULT_DOMAIN_FEATURES,
        ui: DEFAULT_DOMAIN_UI,
    };
};

/**
 * Returns the registered production hostname for the current domain.
 * Used when we need to know which domain is active in production.
 */
export const getCurrentProductionDomain = () =>
    Object.keys(DOMAIN_CONFIG).find(domain => window.location.hostname === domain);

export const getBestBotsFolder = () => getDomainConfig().botsFolder;

export const getDomainFeatures = () => getDomainConfig().features;

export const isDomainFeatureEnabled = (feature: keyof DomainFeatureFlags) => getDomainFeatures()[feature];

export const getDomainUIConfig = (): DomainUIConfig => getDomainConfig().ui;

export const getMartingaleConfig = (): MartingaleConfig => {
    const ui = getDomainUIConfig();
    return ui.martingale ?? DEFAULT_MARTINGALE_CONFIG;
};

export const getMartingaleMode = (): MartingaleMode => getMartingaleConfig().mode;

export const getConsecutiveLossThreshold = (): number => getMartingaleConfig().consecutiveLossThreshold;

export const isMartingaleEnabled = (): boolean => {
    const mode = getMartingaleMode();
    return mode !== 'no_martingale';
};

export const applyDomainUI = (): void => {
    const ui = getDomainUIConfig();
    const targets = [document.documentElement, document.body].filter(Boolean);
    const setVariable = (key: string, value: string) => {
        targets.forEach(target => target.style.setProperty(key, value));
    };

    setVariable('--domain-primary', ui.primaryColor);
    setVariable('--domain-secondary', ui.secondaryColor);
    setVariable('--domain-accent', ui.accentColor);
    setVariable('--domain-header-bg', ui.headerBgColor);
    setVariable('--domain-header-text', ui.headerTextColor);
    setVariable('--domain-sidebar-bg', ui.sidebarBgColor);
    setVariable('--domain-sidebar-text', ui.sidebarTextColor);
    setVariable('--domain-btn-primary-bg', ui.buttonPrimaryBg);
    setVariable('--domain-btn-primary-text', ui.buttonPrimaryText);
    setVariable('--domain-btn-secondary-bg', ui.buttonSecondaryBg);
    setVariable('--domain-btn-secondary-text', ui.buttonSecondaryText);
    setVariable('--domain-card-bg', ui.cardBgColor);
    setVariable('--domain-card-border', ui.cardBorderColor);
    setVariable('--domain-text-primary', ui.textPrimary);
    setVariable('--domain-text-secondary', ui.textSecondary);
    setVariable('--domain-success', ui.successColor);
    setVariable('--domain-error', ui.errorColor);
    setVariable('--domain-warning', ui.warningColor);
    setVariable('--domain-font-family', ui.fontFamily);
    setVariable('--domain-border-radius', ui.borderRadius);
    setVariable('--rm-shell-top', ui.headerBgColor);
    setVariable('--rm-shell-top-light', ui.headerBgColor);
    setVariable('--rm-shell-text', ui.textPrimary);
    setVariable('--rm-shell-header-text', ui.headerTextColor);
    setVariable('--rm-shell-nav', ui.sidebarBgColor);
    setVariable('--rm-shell-nav-text', ui.sidebarTextColor);
    setVariable('--rm-shell-panel-text', ui.textPrimary);
    setVariable('--rm-shell-panel-text-muted', ui.textSecondary);
    setVariable('--rm-shell-run-panel', ui.secondaryColor);
    setVariable('--rm-shell-section', ui.cardBgColor);
    setVariable('--rm-shell-section-border', ui.cardBorderColor);
    setVariable('--rm-shell-run', ui.primaryColor);
    setVariable('--rm-shell-run-hover', ui.accentColor);

    Object.entries(ui.customCssVars).forEach(([key, value]) => {
        setVariable(key, value);
    });
    if (ui.brandName) {
        document.title = ui.brandName;
    }
};

export const buildBestBotsFileUrl = (bots_folder: string, file_name: string) => {
    const folder = encodeURI(bots_folder);
    return `/${folder}/${encodeURIComponent(file_name)}`;
};

export const getBestBotsFileUrl = (file_name: string) => buildBestBotsFileUrl(getBestBotsFolder(), file_name);

// =============================================================================
// Constants - Server Configuration (from brand.config.json)
// =============================================================================

// WebSocket server URLs
export const WS_SERVERS = {
    STAGING: `${brandConfig.platform.derivws.url.staging}options/ws/public`,
    PRODUCTION: `${brandConfig.platform.derivws.url.production}options/ws/public`,
} as const;

// Classic Deriv WebSocket API used by legacy OAuth tokens.
// DerivAPIBasic expects this `/websockets/v3` protocol for calls such as
// `authorize`, `balance`, `proposal`, `buy`, etc. Legacy `a1-...` tokens do
// not authorize correctly against the newer DerivWS `/trading/v1/...` URLs.
const LEGACY_WS_SERVER = 'wss://ws.derivws.com/websockets/v3';

// Legacy — kept for backward-compat with imports elsewhere
export const PRODUCTION_DOMAINS = {
    COM: brandConfig.platform.hostname.production.com,
} as const;

export const STAGING_DOMAINS = {
    COM: brandConfig.platform.hostname.staging.com,
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

// Helper to check if we're on production domains
export const isProduction = () => {
    if (process.env.APP_ENV === 'production') return true;
    const hostname = window.location.hostname;
    return !!DOMAIN_CONFIG[hostname];
};

export const isLocal = () => /localhost(:\d+)?$/i.test(window.location.hostname);

const getDefaultServerURL = () => {
    const isProductionEnv = isProduction();

    try {
        return isProductionEnv ? WS_SERVERS.PRODUCTION : WS_SERVERS.STAGING;
    } catch (error) {
        console.error('Error in getDefaultServerURL:', error);
    }

    // Production defaults to demov2, staging/preview defaults to qa194 (demo)
    return isProductionEnv ? WS_SERVERS.PRODUCTION : WS_SERVERS.STAGING;
};

const getLegacyServerURL = () => {
    const { appId } = getDomainConfig();
    return `${LEGACY_WS_SERVER}?app_id=${encodeURIComponent(appId)}`;
};

/**
 * Gets the WebSocket URL using the appropriate authentication flow
 * This function handles both:
 *
 * PKCE OAuth2 Flow (New users):
 * 1. Get access token from auth_info (sessionStorage)
 * 2. Fetch accounts list from derivatives/accounts
 * 3. Store accounts in sessionStorage
 * 4. Get default account (first from list)
 * 5. Fetch OTP and WebSocket URL for that account
 *
 * Legacy OAuth Flow (Legacy users):
 * 1. Check if user has legacy token in localStorage (from ?acct1=...&token1=...)
 * 2. If found, return classic Deriv WebSocket URL with app_id
 * 3. api_base.ts will authorize using api.authorize(token) with the legacy token
 *
 * @returns Promise with WebSocket URL or fallback to default server
 */
export const getSocketURL = async (): Promise<string> => {
    try {
        // Check PKCE OAuth first (new platform users)
        let authInfo = OAuthTokenExchangeService.getAuthInfo();
        if (!authInfo) {
            const expiredAuthInfo = OAuthTokenExchangeService.getAuthInfo({ allowExpiredWithRefresh: true });
            if (expiredAuthInfo?.refresh_token) {
                const refreshedAuth = await OAuthTokenExchangeService.refreshAccessToken(expiredAuthInfo.refresh_token);
                if (refreshedAuth.access_token) {
                    authInfo = OAuthTokenExchangeService.getAuthInfo();
                }
            }
        }
        if (authInfo?.access_token) {
            console.log('[getSocketURL] PKCE user detected - fetching authenticated WebSocket URL');
            // Use the DerivWSAccountsService to get authenticated WebSocket URL
            const wsUrl = await DerivWSAccountsService.getAuthenticatedWebSocketURL(authInfo.access_token);
            return wsUrl;
        }

        // Check for legacy token in localStorage (legacy platform users)
        // Legacy tokens are stored by storeLegacyAccounts() from OAuth redirect params
        const accountsList_raw = localStorage.getItem('accountsList');
        const pendingApiToken = getPendingApiToken();
        if (pendingApiToken) {
            const legacyWsUrl = getLegacyServerURL();
            console.log('[getSocketURL] API token login detected - using classic WebSocket URL');
            return legacyWsUrl;
        }

        if (accountsList_raw) {
            try {
                const accountsList = JSON.parse(accountsList_raw);
                const active_loginid = localStorage.getItem('active_loginid');
                if (active_loginid && accountsList[active_loginid]) {
                    const legacyWsUrl = getLegacyServerURL();
                    console.log('[getSocketURL] Legacy user detected with token - using classic WebSocket URL');
                    // For legacy users, DerivAPIBasic must connect to classic `/websockets/v3`.
                    // The newer DerivWS `/trading/v1/options/ws/public` endpoint can open, but
                    // legacy `api.authorize(token)` will not complete there.
                    return legacyWsUrl;
                }
            } catch (e) {
                console.error('[getSocketURL] Error parsing legacy accountsList:', e);
            }
        }

        // No authentication found
        console.log('[getSocketURL] No authentication found - returning default server URL');
        return getDefaultServerURL();
    } catch (error) {
        console.error('[DerivWS] Error in getSocketURL:', error);
        return getDefaultServerURL();
    }
};

export const getDebugServiceWorker = () => {
    const debug_service_worker_flag = window.localStorage.getItem('debug_service_worker');
    if (debug_service_worker_flag) return !!parseInt(debug_service_worker_flag);

    return false;
};

/**
 * Generates a cryptographically secure CSRF token
 * @returns A random base64url-encoded string
 */
const generateCSRFToken = (): string => {
    // Generate 32 random bytes (256 bits) for strong security
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);

    // Convert to base64url encoding (URL-safe)
    const base64 = btoa(String.fromCharCode(...array));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * Generates a PKCE code verifier (random string)
 * @returns A cryptographically random base64url-encoded string (43-128 characters)
 */
const generateCodeVerifier = (): string => {
    // Generate 32 random bytes (will result in 43 characters after base64url encoding)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);

    // Convert to base64url encoding (URL-safe, no padding)
    const base64 = btoa(String.fromCharCode(...array));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * Generates a PKCE code challenge from a code verifier using SHA-256
 * @param verifier The code verifier string
 * @returns Promise that resolves to the base64url-encoded SHA-256 hash
 */
const generateCodeChallenge = async (verifier: string): Promise<string> => {
    // Encode the verifier as UTF-8
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);

    // Hash with SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert to base64url encoding
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const base64 = btoa(String.fromCharCode(...hashArray));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * Stores PKCE code verifier in sessionStorage for token exchange
 * @param verifier The code verifier to store
 */
const storeCodeVerifier = (verifier: string): void => {
    sessionStorage.setItem('oauth_code_verifier', verifier);
    // Also store timestamp for verifier expiration (e.g., 10 minutes)
    sessionStorage.setItem('oauth_code_verifier_timestamp', Date.now().toString());
};

/**
 * Retrieves and validates the stored PKCE code verifier
 * @returns The code verifier if valid and not expired, null otherwise
 */
export const getCodeVerifier = (): string | null => {
    const verifier = sessionStorage.getItem('oauth_code_verifier');
    const timestamp = sessionStorage.getItem('oauth_code_verifier_timestamp');

    if (!verifier || !timestamp) {
        return null;
    }

    // Check if verifier is expired (10 minutes = 600000ms)
    const verifierAge = Date.now() - parseInt(timestamp, 10);
    if (verifierAge > 600000) {
        // Clean up expired verifier
        sessionStorage.removeItem('oauth_code_verifier');
        sessionStorage.removeItem('oauth_code_verifier_timestamp');
        return null;
    }

    return verifier;
};

/**
 * Clears PKCE code verifier from sessionStorage after successful token exchange
 */
export const clearCodeVerifier = (): void => {
    sessionStorage.removeItem('oauth_code_verifier');
    sessionStorage.removeItem('oauth_code_verifier_timestamp');
};

/**
 * Stores CSRF token in sessionStorage for validation after OAuth callback
 * @param token The CSRF token to store
 */
const storeCSRFToken = (token: string): void => {
    sessionStorage.setItem('oauth_csrf_token', token);
    // Also store timestamp for token expiration (e.g., 10 minutes)
    sessionStorage.setItem('oauth_csrf_token_timestamp', Date.now().toString());
};

/**
 * Validates CSRF token from OAuth callback
 * @param token The token to validate
 * @returns true if token is valid and not expired
 */
export const validateCSRFToken = (token: string): boolean => {
    const storedToken = sessionStorage.getItem('oauth_csrf_token');
    const timestamp = sessionStorage.getItem('oauth_csrf_token_timestamp');

    if (!storedToken || !timestamp) {
        return false;
    }

    // Check if token matches
    if (storedToken !== token) {
        return false;
    }

    // Check if token is expired (10 minutes = 600000ms)
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    if (tokenAge > 600000) {
        // Clean up expired token
        sessionStorage.removeItem('oauth_csrf_token');
        sessionStorage.removeItem('oauth_csrf_token_timestamp');
        return false;
    }

    return true;
};

/**
 * Clears CSRF token from sessionStorage after successful validation
 */
export const clearCSRFToken = (): void => {
    sessionStorage.removeItem('oauth_csrf_token');
    sessionStorage.removeItem('oauth_csrf_token_timestamp');
};

export const generateOAuthURL = async (prompt?: string, domainConfig = getDomainConfig()) => {
    try {
        // Resolve config for the current domain (auto-selects the right
        // CLIENT_ID, APP_ID, and redirect URI from DOMAIN_CONFIG)
        const domainCfg = domainConfig;
        const { clientId, appId, redirectUri, includeLegacyAppIdInOAuth } = {
            clientId: domainCfg.clientId || process.env.CLIENT_ID || '33cCr2bWsByPgLlormNFw',
            appId: domainCfg.appId || process.env.APP_ID || '71937',
            redirectUri: domainCfg.redirectUri,
            includeLegacyAppIdInOAuth: domainCfg.includeLegacyAppIdInOAuth,
        };

        if (domainCfg.useLegacyOAuthLogin && appId) {
            const params = new URLSearchParams({ app_id: appId });
            if (prompt) {
                params.set('prompt', prompt);
            }
            return `https://oauth.deriv.com/oauth2/authorize?${params.toString()}`;
        }

        // Use brand config for the OAuth2 base URL
        const environment = isProduction() ? 'production' : 'staging';
        const hostname = brandConfig?.platform.auth2_url?.[environment];

        if (hostname && clientId) {
            // Generate CSRF token for security
            const csrfToken = generateCSRFToken();
            storeCSRFToken(csrfToken);

            // Generate PKCE parameters
            const codeVerifier = generateCodeVerifier();
            const codeChallenge = await generateCodeChallenge(codeVerifier);
            storeCodeVerifier(codeVerifier);

            // redirectUri is sourced from DOMAIN_CONFIG and must match the URL
            // registered in the Deriv OAuth app for clientId exactly.
            const params = new URLSearchParams({
                scope: 'trade account_manage',
                response_type: 'code',
                client_id: clientId,
                redirect_uri: redirectUri,
                state: csrfToken,
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
            });

            // Optional: prompt parameter (e.g. 'registration' for signup flow)
            if (prompt) {
                params.set('prompt', prompt);
            }

            // Include legacy app_id for intelligent platform routing
            // According to Deriv OAuth 2.0 docs: "Deriv will check whether the user belongs
            // to the old or new platform and route them to the appropriate version of your app."
            // This allows the app to support both:
            // - New users who use PKCE OAuth (returns access_token)
            // - Legacy users who have old accounts (returns via legacy OAuth params)
            // Both token types are then handled appropriately by the app
            if (includeLegacyAppIdInOAuth && appId) {
                params.set('app_id', appId);
            }

            return `${hostname}auth?${params.toString()}`;
        }
    } catch (error) {
        console.error('Error generating OAuth URL:', error);
    }

    return ``;
};
