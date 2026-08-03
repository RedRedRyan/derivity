import { TextEncoder } from 'util';
import {
    buildBestBotsFileUrl,
    generateOAuthURL,
    getDomainConfig,
    getDomainConfigForHost,
    getDomainRedirectUrl,
} from '../config';

describe('DOMAIN_CONFIG', () => {
    it('returns the configured Derivhhub auth and bot folder settings', () => {
        expect(getDomainConfigForHost('derivhhub.com')).toMatchObject({
            clientId: '33h4ThjleZotVMiKQ1gE7',
            appId: '124217',
            redirectUri: 'https://derivhhub.com/',
            botsFolder: 'optimumtraders.site',
            includeLegacyAppIdInOAuth: false,
            useLegacyOAuthLogin: false,
            features: {
                botIdeas: false,
                printPopups: false,
                autoTrades: true,
                manualTrading: true,
            },
        });
        expect(getDomainConfigForHost('www.derivhhub.com')).toMatchObject({
            clientId: '33h4ThjleZotVMiKQ1gE7',
            appId: '124217',
            redirectUri: 'https://derivhhub.com/',
            botsFolder: 'optimumtraders.site',
            includeLegacyAppIdInOAuth: false,
            useLegacyOAuthLogin: false,
            canonicalHost: 'derivhhub.com',
        });
    });

    it('keeps Bot Ideas temporarily disabled on Risk Managers', () => {
        expect(getDomainConfigForHost('riskmanagers.site')?.features).toMatchObject({
            botIdeas: false,
            chart: false,
            printPopups: true,
            autoTrades: true,
            manualTrading: true,
            accumilatoirs: true,
            tradingView: false,
        });
        expect(getDomainConfigForHost('riskmanagers.site')?.ui).toMatchObject({
            brandName: 'Risk Managers',
            primaryColor: '#f97316',
            secondaryColor: '#1a1a2e',
            accentColor: '#2196f3',
            headerBgColor: '#1a1a2e',
            sidebarBgColor: '#16213e',
        });
        expect(getDomainConfigForHost('riskmanagers.site')).toMatchObject({
            redirectUri: 'https://riskmanagers.site/',
            includeLegacyAppIdInOAuth: true,
            useLegacyOAuthLogin: false,
        });
    });

    it.each([
        ['tradinghubs.site', '33hi7ev9NiDjWY64OJuSw', '122208', 'Trading Hubs', false],
        ['mafiahub.site', '33ABjz4hBB7eawgytiT6P', '120589', 'Mafia Hub', false],
    ])(
        'returns auth and bot folder settings for %s',
        (domain, clientId, appId, brandName, useLegacyOAuthLogin, botsFolder = domain) => {
            expect(getDomainConfigForHost(domain)).toMatchObject({
                clientId,
                appId,
                redirectUri: `https://${domain}/`,
                botsFolder,
                canonicalHost: domain,
                includeLegacyAppIdInOAuth: true,
                useLegacyOAuthLogin,
                ui: {
                    brandName,
                },
                features: {
                    autoTrades: true,
                    manualTrading: true,
                },
            });
            expect(getDomainConfigForHost(`www.${domain}`)).toMatchObject({
                clientId,
                appId,
                redirectUri: `https://${domain}/`,
                botsFolder,
                canonicalHost: domain,
                includeLegacyAppIdInOAuth: true,
                useLegacyOAuthLogin,
                ui: {
                    brandName,
                },
                features: {
                    autoTrades: true,
                    manualTrading: true,
                },
            });
        }
    );

    it('returns OAuth2-only auth and bot folder settings for Kicktrade', () => {
        expect(getDomainConfigForHost('kicktrade.site')).toMatchObject({
            clientId: '33vlry53HSLhXICBcUURu',
            appId: '80364',
            redirectUri: 'https://www.kicktrade.site/',
            botsFolder: 'kicktrade.site',
            canonicalHost: 'kicktrade.site',
            includeLegacyAppIdInOAuth: true,
            useLegacyOAuthLogin: false,
            ui: {
                brandName: 'Kicktrade',
            },
            features: {
                chart: true,
                tradingView: true,
                autoTrades: true,
                manualTrading: true,
            },
        });
        expect(getDomainConfigForHost('www.kicktrade.site')).toMatchObject({
            clientId: '33vlry53HSLhXICBcUURu',
            appId: '80364',
            redirectUri: 'https://www.kicktrade.site/',
            botsFolder: 'kicktrade.site',
            canonicalHost: 'kicktrade.site',
            includeLegacyAppIdInOAuth: true,
            useLegacyOAuthLogin: false,
        });
    });

    it('uses Kicktrade auth settings from the active browser hostname', async () => {
        const originalAppEnv = process.env.APP_ENV;
        const cryptoMock = {
            getRandomValues: (array: Uint8Array) => array.fill(1),
            subtle: {
                digest: jest.fn().mockResolvedValue(new Uint8Array(32).fill(2).buffer),
            },
        };

        Object.defineProperty(globalThis, 'crypto', {
            configurable: true,
            value: cryptoMock,
        });
        Object.defineProperty(globalThis, 'TextEncoder', {
            configurable: true,
            value: TextEncoder,
        });
        process.env.APP_ENV = 'production';

        const domainConfig = getDomainConfig('www.kicktrade.site');

        expect(domainConfig).toMatchObject({
            clientId: '33vlry53HSLhXICBcUURu',
            appId: '80364',
            redirectUri: 'https://www.kicktrade.site/',
            includeLegacyAppIdInOAuth: true,
        });
        expect(domainConfig.clientId).not.toBe('33v1ry53HSLhXICBCUURU');

        const oauthUrl = await generateOAuthURL(undefined, domainConfig);
        const url = new URL(oauthUrl);

        expect(url.origin + url.pathname).toBe('https://auth.deriv.com/oauth2/auth');
        expect(url.searchParams.get('client_id')).toBe('33vlry53HSLhXICBcUURu');
        expect(url.searchParams.get('app_id')).toBe('80364');
        expect(url.searchParams.get('redirect_uri')).toBe('https://www.kicktrade.site/');
        expect(url.searchParams.get('redirect_uri')).not.toBe('https://riskmanagers.site/');

        process.env.APP_ENV = originalAppEnv;
    });

    it('redirects Mrzetuzetu traffic to Kicktrade instead of processing the domain directly', () => {
        expect(getDomainConfigForHost('mrzetuzetu.site')).toBeUndefined();
        expect(getDomainConfigForHost('www.mrzetuzetu.site')).toBeUndefined();
        expect(
            getDomainRedirectUrl({
                hash: '#best_bots',
                hostname: 'www.mrzetuzetu.site',
                pathname: '/dashboard',
                search: '?code=abc',
            })
        ).toBe('https://www.kicktrade.site/dashboard?code=abc#best_bots');
    });

    it('returns OAuth2-only auth and bot folder settings for Dollarsign', () => {
        expect(getDomainConfigForHost('dollarsigns.site')).toMatchObject({
            clientId: '33uLmMotAXYx94pf0CLe6',
            appId: '',
            redirectUri: 'http://dollarsigns.site/',
            botsFolder: 'dollarsigns.site',
            includeLegacyAppIdInOAuth: false,
            useLegacyOAuthLogin: false,
            ui: {
                brandName: 'Dollarsign',
            },
            features: {
                autoTrades: true,
                manualTrading: true,
            },
        });
        expect(getDomainConfigForHost('www.dollarsigns.site')).toMatchObject({
            clientId: '33uLmMotAXYx94pf0CLe6',
            appId: '',
            redirectUri: 'http://dollarsigns.site/',
            botsFolder: 'dollarsigns.site',
            includeLegacyAppIdInOAuth: false,
            useLegacyOAuthLogin: false,
        });
    });

    it('returns OAuth2 auth and bot folder settings for Master Hunter', () => {
        expect(getDomainConfigForHost('masterhunter.site')).toMatchObject({
            clientId: '33y9R1zDsuaYKXK2RaEH9',
            appId: '96223',
            redirectUri: 'https://masterhunter.site/',
            botsFolder: 'masterhunter.site',
            canonicalHost: 'masterhunter.site',
            includeLegacyAppIdInOAuth: true,
            useLegacyOAuthLogin: false,
            ui: {
                brandName: 'Master Hunter',
            },
            features: {
                autoTrades: true,
                manualTrading: true,
            },
        });
        expect(getDomainConfigForHost('www.masterhunter.site')).toMatchObject({
            clientId: '33y9R1zDsuaYKXK2RaEH9',
            appId: '96223',
            redirectUri: 'https://masterhunter.site/',
            botsFolder: 'masterhunter.site',
            canonicalHost: 'masterhunter.site',
            includeLegacyAppIdInOAuth: true,
            useLegacyOAuthLogin: false,
        });
    });

    it.each([
        ['husseinfx.site', '33B0O9dYtRl6X3OQ6rJsz', 'Husseinfx'],
        ['levynetrading.site', '33B45506MeTF6j6VHOi7A', 'Levyne Trading'],
        ['easytraders.site', '33Dp1fPdIGm7Sf0zGpJYw', 'Easy Traders'],
        ['dollarmaster.site', '33Do7K9svQABFySnUo7pE', 'Dollar Master'],
        ['profitempire.site', '33DtjQWnmdxRkogkgAOtP', 'Prime Empire'],
        ['primempire.site', '33DtjQWnmdxRkogkgAOtP', 'Prime Empire'],
        ['mkulimamdogo.site', '33FIBnsBLHouNk9bOnSVa', 'Mkulima Mdogo'],
    ])('returns OAuth2-only auth settings for %s', (domain, clientId, brandName) => {
        expect(getDomainConfigForHost(domain)).toMatchObject({
            clientId,
            appId: '',
            redirectUri: domain === 'primempire.site' ? 'https://profitempire.site/' : `https://${domain}/`,
            botsFolder: domain === 'primempire.site' ? 'profitempire.site' : domain,
            canonicalHost: domain === 'primempire.site' ? 'profitempire.site' : domain,
            includeLegacyAppIdInOAuth: false,
            useLegacyOAuthLogin: false,
            ui: {
                brandName,
            },
            features: {
                autoTrades: true,
                manualTrading: true,
            },
        });
        expect(getDomainConfigForHost(`www.${domain}`)).toMatchObject({
            clientId,
            appId: '',
            redirectUri: domain === 'primempire.site' ? 'https://profitempire.site/' : `https://${domain}/`,
            botsFolder: domain === 'primempire.site' ? 'profitempire.site' : domain,
            canonicalHost: domain === 'primempire.site' ? 'profitempire.site' : domain,
            includeLegacyAppIdInOAuth: false,
            useLegacyOAuthLogin: false,
        });
    });

    it('maps existing pointed aliases to the correct canonical domains', () => {
        expect(getDomainConfigForHost('novaderiv.site')).toMatchObject({
            clientId: '33B45506MeTF6j6VHOi7A',
            redirectUri: 'https://levynetrading.site/',
            botsFolder: 'levynetrading.site',
            canonicalHost: 'levynetrading.site',
        });
        expect(getDomainConfigForHost('derivhhub.site')).toMatchObject({
            clientId: '33h4ThjleZotVMiKQ1gE7',
            appId: '124217',
            redirectUri: 'https://derivhhub.com/',
            botsFolder: 'optimumtraders.site',
            canonicalHost: 'derivhhub.com',
        });
        expect(getDomainConfigForHost('www.derivhhub.site')).toMatchObject({
            clientId: '33h4ThjleZotVMiKQ1gE7',
            appId: '124217',
            redirectUri: 'https://derivhhub.com/',
            botsFolder: 'optimumtraders.site',
            canonicalHost: 'derivhhub.com',
        });
        expect(getDomainConfigForHost('primempire.site')).toMatchObject({
            clientId: '33DtjQWnmdxRkogkgAOtP',
            redirectUri: 'https://profitempire.site/',
            botsFolder: 'profitempire.site',
            canonicalHost: 'profitempire.site',
        });
    });

    it('removes old hosted domain entries that should no longer process login directly', () => {
        expect(getDomainConfigForHost('optimumtraders.site')).toBeUndefined();
        expect(getDomainConfigForHost('www.optimumtraders.site')).toBeUndefined();
        expect(getDomainConfigForHost('newwapi.netlify.app')).toBeUndefined();
    });

    it('builds the Best Bots file URL from the configured bot folder', () => {
        expect(buildBestBotsFileUrl('derivhhub.com', 'My Bot.xml')).toBe('/derivhhub.com/My%20Bot.xml');
    });

    it.each([
        ['masterhunter.site', '96223', '33y9R1zDsuaYKXK2RaEH9', 'https://masterhunter.site/'],
        ['tradinghubs.site', '122208', '33hi7ev9NiDjWY64OJuSw', 'https://tradinghubs.site/'],
        ['mafiahub.site', '120589', '33ABjz4hBB7eawgytiT6P', 'https://mafiahub.site/'],
        ['husseinfx.site', '', '33B0O9dYtRl6X3OQ6rJsz', 'https://husseinfx.site/'],
        ['levynetrading.site', '', '33B45506MeTF6j6VHOi7A', 'https://levynetrading.site/'],
        ['easytraders.site', '', '33Dp1fPdIGm7Sf0zGpJYw', 'https://easytraders.site/'],
        ['dollarmaster.site', '', '33Do7K9svQABFySnUo7pE', 'https://dollarmaster.site/'],
        ['profitempire.site', '', '33DtjQWnmdxRkogkgAOtP', 'https://profitempire.site/'],
        ['primempire.site', '', '33DtjQWnmdxRkogkgAOtP', 'https://profitempire.site/'],
        ['mkulimamdogo.site', '', '33FIBnsBLHouNk9bOnSVa', 'https://mkulimamdogo.site/'],
        ['kicktrade.site', '80364', '33vlry53HSLhXICBcUURu', 'https://www.kicktrade.site/'],
        ['www.kicktrade.site', '80364', '33vlry53HSLhXICBcUURu', 'https://www.kicktrade.site/'],
    ])('uses the working OAuth2 PKCE login wiring for %s', async (host, appId, clientId, expectedRedirectUri) => {
        const originalAppEnv = process.env.APP_ENV;
        const cryptoMock = {
            getRandomValues: (array: Uint8Array) => array.fill(1),
            subtle: {
                digest: jest.fn().mockResolvedValue(new Uint8Array(32).fill(2).buffer),
            },
        };
        const domainConfig = getDomainConfigForHost(host);

        Object.defineProperty(globalThis, 'crypto', {
            configurable: true,
            value: cryptoMock,
        });
        Object.defineProperty(globalThis, 'TextEncoder', {
            configurable: true,
            value: TextEncoder,
        });
        process.env.APP_ENV = 'production';
        expect(domainConfig).toBeDefined();

        const oauthUrl = await generateOAuthURL(undefined, domainConfig!);
        const url = new URL(oauthUrl);

        expect(url.origin + url.pathname).toBe('https://auth.deriv.com/oauth2/auth');
        expect(url.searchParams.get('client_id')).toBe(clientId);
        expect(url.searchParams.get('app_id')).toBe(appId || null);
        expect(url.searchParams.get('redirect_uri')).toBe(expectedRedirectUri || `https://${host}/`);
        expect(url.searchParams.get('response_type')).toBe('code');
        expect(url.searchParams.get('code_challenge_method')).toBe('S256');

        process.env.APP_ENV = originalAppEnv;
    });

    it('keeps Risk Managers on OAuth2 with both client_id and legacy app_id routing', async () => {
        const originalAppEnv = process.env.APP_ENV;
        const cryptoMock = {
            getRandomValues: (array: Uint8Array) => array.fill(1),
            subtle: {
                digest: jest.fn().mockResolvedValue(new Uint8Array(32).fill(2).buffer),
            },
        };
        const domainConfig = getDomainConfigForHost('riskmanagers.site');

        Object.defineProperty(globalThis, 'crypto', {
            configurable: true,
            value: cryptoMock,
        });
        Object.defineProperty(globalThis, 'TextEncoder', {
            configurable: true,
            value: TextEncoder,
        });
        process.env.APP_ENV = 'production';
        expect(domainConfig).toBeDefined();

        const oauthUrl = await generateOAuthURL(undefined, domainConfig!);
        const url = new URL(oauthUrl);

        expect(url.origin + url.pathname).toBe('https://auth.deriv.com/oauth2/auth');
        expect(url.searchParams.get('client_id')).toBe('33cCr2bWsByPgLlormNFw');
        expect(url.searchParams.get('app_id')).toBe('71937');
        expect(url.searchParams.get('redirect_uri')).toBe('https://riskmanagers.site/');
        expect(url.searchParams.get('response_type')).toBe('code');
        expect(url.searchParams.get('code_challenge_method')).toBe('S256');

        process.env.APP_ENV = originalAppEnv;
    });

    it('uses Derivhhub OAuth2 without Risk Managers redirect or legacy app_id routing', async () => {
        const originalAppEnv = process.env.APP_ENV;
        const cryptoMock = {
            getRandomValues: (array: Uint8Array) => array.fill(1),
            subtle: {
                digest: jest.fn().mockResolvedValue(new Uint8Array(32).fill(2).buffer),
            },
        };
        const domainConfig = getDomainConfigForHost('derivhhub.com');

        Object.defineProperty(globalThis, 'crypto', {
            configurable: true,
            value: cryptoMock,
        });
        Object.defineProperty(globalThis, 'TextEncoder', {
            configurable: true,
            value: TextEncoder,
        });
        process.env.APP_ENV = 'production';
        expect(domainConfig).toBeDefined();

        const oauthUrl = await generateOAuthURL(undefined, domainConfig!);
        const url = new URL(oauthUrl);

        expect(url.origin + url.pathname).toBe('https://auth.deriv.com/oauth2/auth');
        expect(url.searchParams.get('client_id')).toBe('33h4ThjleZotVMiKQ1gE7');
        expect(url.searchParams.get('app_id')).toBeNull();
        expect(url.searchParams.get('redirect_uri')).toBe('https://derivhhub.com/');
        expect(url.searchParams.get('redirect_uri')).not.toBe('https://riskmanagers.site/');
        expect(url.searchParams.get('response_type')).toBe('code');
        expect(url.searchParams.get('code_challenge_method')).toBe('S256');

        process.env.APP_ENV = originalAppEnv;
    });

    it('uses OAuth2 PKCE login without legacy app_id routing for Dollarsign', async () => {
        const originalAppEnv = process.env.APP_ENV;
        const cryptoMock = {
            getRandomValues: (array: Uint8Array) => array.fill(1),
            subtle: {
                digest: jest.fn().mockResolvedValue(new Uint8Array(32).fill(2).buffer),
            },
        };
        const domainConfig = getDomainConfigForHost('dollarsigns.site');

        Object.defineProperty(globalThis, 'crypto', {
            configurable: true,
            value: cryptoMock,
        });
        Object.defineProperty(globalThis, 'TextEncoder', {
            configurable: true,
            value: TextEncoder,
        });
        process.env.APP_ENV = 'production';
        expect(domainConfig).toBeDefined();

        const oauthUrl = await generateOAuthURL(undefined, domainConfig!);
        const url = new URL(oauthUrl);

        expect(url.origin + url.pathname).toBe('https://auth.deriv.com/oauth2/auth');
        expect(url.searchParams.get('client_id')).toBe('33uLmMotAXYx94pf0CLe6');
        expect(url.searchParams.get('app_id')).toBeNull();
        expect(url.searchParams.get('redirect_uri')).toBe('http://dollarsigns.site/');
        expect(url.searchParams.get('response_type')).toBe('code');
        expect(url.searchParams.get('code_challenge_method')).toBe('S256');

        process.env.APP_ENV = originalAppEnv;
    });
});
