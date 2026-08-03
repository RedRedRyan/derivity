import { lazy, Suspense } from 'react';

const CURRENCY_ICONS = {
    aud: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyAudIcon }))
    ),
    bch: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyBchIcon }))
    ),
    btc: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyBtcIcon }))
    ),
    busd: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyBusdIcon }))
    ),
    dai: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyDaiIcon }))
    ),
    eth: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyEthIcon }))
    ),
    eur: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyEurIcon }))
    ),
    'eur-check': lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyEurIcon }))
    ),
    eurs: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyEursIcon }))
    ),
    eusdt: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyUsdtIcon }))
    ),
    gbp: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyGbpIcon }))
    ),
    idk: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyIdkIcon }))
    ),
    ltc: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyLtcIcon }))
    ),
    pax: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyPaxIcon }))
    ),
    tusd: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyTusdIcon }))
    ),
    tusdt: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyUsdtIcon }))
    ),
    unknown: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({
            default: module.CurrencyPlaceholderIcon,
        }))
    ),
    usd: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyUsdIcon }))
    ),
    usdc: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyUsdcIcon }))
    ),
    usdk: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyUsdkIcon }))
    ),
    ust: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyUsdtIcon }))
    ),
    virtual: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyDemoIcon }))
    ),
    xrp: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyXrpIcon }))
    ),
    algo: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyAlgoIcon }))
    ),
    avax: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyAvaxIcon }))
    ),
    bat: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyBatIcon }))
    ),
    bnb: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyBnbIcon }))
    ),
    dash: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyDashIcon }))
    ),
    doge: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyDogeIcon }))
    ),
    dot: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyDotIcon }))
    ),
    eos: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyEosIcon }))
    ),
    etc: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyEtcIcon }))
    ),
    fil: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyFilIcon }))
    ),
    iota: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyIotaIcon }))
    ),
    link: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyLinkIcon }))
    ),
    matic: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyMaticIcon }))
    ),
    mkr: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyMkrIcon }))
    ),
    mcd: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({
            default: module.CurrencyMultiCollateralDaiIcon,
        }))
    ),
    neo: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyNeoIcon }))
    ),
    none: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyNoneIcon }))
    ),
    omg: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyOmgIcon }))
    ),
    p2p: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyP2PIcon }))
    ),
    scd: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({
            default: module.CurrencySingleCollateralDaiIcon,
        }))
    ),
    sol: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencySolIcon }))
    ),
    terra: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyTerraIcon }))
    ),
    trx: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyTrxIcon }))
    ),
    uni: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyUniIcon }))
    ),
    xlm: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyXlmIcon }))
    ),
    xmr: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyXmrIcon }))
    ),
    xtz: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyXtzIcon }))
    ),
    zec: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyZecIcon }))
    ),
};

export const CurrencyIcon = ({ currency, isVirtual }: { currency?: string; isVirtual?: boolean }) => {
    const Icon = isVirtual
        ? CURRENCY_ICONS.virtual
        : CURRENCY_ICONS[currency?.toLowerCase() as keyof typeof CURRENCY_ICONS] || CURRENCY_ICONS.unknown;

    return (
        <Suspense fallback={null}>
            <Icon iconSize='sm' />
        </Suspense>
    );
};
