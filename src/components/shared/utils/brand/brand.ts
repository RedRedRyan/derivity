import config_data from '../../../../../brand.config.json';

type TLogoConfig = {
    type: string;
    component_name?: string;
    alt_text?: string;
    link_url?: string;
    show_text?: boolean;
    text?: string;
};

type TPlatform = {
    name: string;
    logo?: TLogoConfig | string;
};

const isDomainAllowed = (domain_name: string) => {
    const custom_domains = [
        'riskmanagers.site',
        'derivhhub.com',
        'mrzetuzetu.site',
        'masterhunter.site',
        'husseinfx.site',
        'levynetrading.site',
        'novaderiv.site',
        'tradinghubs.site',
        'mafiahub.site',
        'easytraders.site',
        'dollarmaster.site',
        'profitempire.site',
        'primempire.site',
        'mkulimamdogo.site',
        'kicktrade.site',
        'dollarsigns.site',
        'derivhhub.site',
    ];

    const hostname = domain_name.split(':')[0].toLowerCase();
    if (custom_domains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
        return true;
    }

    // This regex will match any official deriv production and testing domain names.
    // Allowed deriv domains: localhost, binary.sx, binary.com, deriv.com, deriv.be, deriv.me and their subdomains.
    return /^(((.*)\.)?(localhost|pages.dev|binary\.(sx|com)|deriv.(com|me|be|dev)))$/.test(hostname);
};

export const getBrandWebsiteName = () => {
    return config_data.domain_name;
};

export const getPlatformConfig = (): TPlatform => {
    const allowed_config_data = { ...config_data.platform };

    if (!isDomainAllowed(window.location.host)) {
        // Remove all official platform logos if the app is hosted under unofficial domain
        allowed_config_data.logo = undefined;
    }

    return allowed_config_data;
};
