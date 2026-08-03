import { useEffect, useMemo } from 'react';
import { getDomainUIConfig, applyDomainUI, getDomainConfig } from './config';

export const useDomainUI = () => {
    const uiConfig = useMemo(() => getDomainUIConfig(), []);
    const domainConfig = useMemo(() => getDomainConfig(), []);

    useEffect(() => {
        applyDomainUI();
    }, []);

    return {
        ui: uiConfig,
        features: domainConfig.features,
        brandName: uiConfig.brandName,
        primaryColor: uiConfig.primaryColor,
        secondaryColor: uiConfig.secondaryColor,
        accentColor: uiConfig.accentColor,
        logoUrl: uiConfig.logoUrl,
        faviconUrl: uiConfig.faviconUrl,
        headerBgColor: uiConfig.headerBgColor,
        headerTextColor: uiConfig.headerTextColor,
        sidebarBgColor: uiConfig.sidebarBgColor,
        sidebarTextColor: uiConfig.sidebarTextColor,
        buttonPrimaryBg: uiConfig.buttonPrimaryBg,
        buttonPrimaryText: uiConfig.buttonPrimaryText,
        buttonSecondaryBg: uiConfig.buttonSecondaryBg,
        buttonSecondaryText: uiConfig.buttonSecondaryText,
        cardBgColor: uiConfig.cardBgColor,
        cardBorderColor: uiConfig.cardBorderColor,
        textPrimary: uiConfig.textPrimary,
        textSecondary: uiConfig.textSecondary,
        successColor: uiConfig.successColor,
        errorColor: uiConfig.errorColor,
        warningColor: uiConfig.warningColor,
        fontFamily: uiConfig.fontFamily,
        borderRadius: uiConfig.borderRadius,
        showHeaderLogo: uiConfig.showHeaderLogo,
        showHeaderTitle: uiConfig.showHeaderTitle,
        showFooter: uiConfig.showFooter,
        showDisclaimer: uiConfig.showDisclaimer,
        customCssVars: uiConfig.customCssVars,
    };
};

export default useDomainUI;
