import { lazy, Suspense } from 'react';
import { IconSize } from '@/components/shared_ui/figma-icons';

const MARKET_ICONS = {
    FRXAUDCAD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexAudcadIcon }))
    ),
    FRXAUDCHF: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexAudchfIcon }))
    ),
    FRXAUDJPY: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexAudjpyIcon }))
    ),
    FRXAUDNZD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexAudnzdIcon }))
    ),
    FRXAUDPLN: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexAudsgdIcon }))
    ),
    FRXAUDUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexAudusdIcon }))
    ),
    FRXBROUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexCadchfIcon }))
    ),
    FRXEURAUD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexEuraudIcon }))
    ),
    FRXEURCAD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexEurcadIcon }))
    ),
    FRXEURCHF: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexEurchfIcon }))
    ),
    FRXEURGBP: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexEurgbpIcon }))
    ),
    FRXEURJPY: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexEurjpyIcon }))
    ),
    FRXEURNZD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexEurnzdIcon }))
    ),
    FRXEURUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexEurusdIcon }))
    ),
    FRXGBPAUD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexGbpaudIcon }))
    ),
    FRXGBPCAD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexGbpcadIcon }))
    ),
    FRXGBPCHF: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexGbpchfIcon }))
    ),
    FRXGBPJPY: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexGbpjpyIcon }))
    ),
    FRXGBPNOK: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexGbpnokIcon }))
    ),
    FRXGBPUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexGbpusdIcon }))
    ),
    FRXGBPNZD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexGbpnzdIcon }))
    ),
    FRXNZDJPY: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexNzdjpnIcon }))
    ),
    FRXNZDUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexNzdusdIcon }))
    ),
    FRXUSDCAD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexUsdcadIcon }))
    ),
    FRXUSDCHF: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexUsdchfIcon }))
    ),
    FRXUSDJPY: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexUsdjpyIcon }))
    ),
    FRXUSDNOK: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexUsdnokIcon }))
    ),
    FRXUSDPLN: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexUsdplnIcon }))
    ),
    FRXUSDSEK: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexUsdsekIcon }))
    ),
    FRXUSDMXN: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketForexUsdmxnIcon }))
    ),
    FRXXAGUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCommoditySilverusdIcon,
        }))
    ),
    FRXXAUUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCommodityGoldusdIcon,
        }))
    ),
    FRXXPDUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCommodityPalladiumusdIcon,
        }))
    ),
    FRXXPTUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCommodityPlatinumusdIcon,
        }))
    ),
    OTC_AEX: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketIndicesNetherlands25Icon,
        }))
    ),
    OTC_AS51: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketIndicesAustralia200Icon,
        }))
    ),
    OTC_DJI: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketIndicesWallStreet30Icon,
        }))
    ),
    OTC_FCHI: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketIndicesFrance40Icon,
        }))
    ),
    OTC_FTSE: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketIndicesUk100Icon,
        }))
    ),
    OTC_GDAXI: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketIndicesUk100Icon,
        }))
    ),
    OTC_HSI: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketIndicesHongKong50Icon,
        }))
    ),
    OTC_IBEX35: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketIndicesSpain35Icon,
        }))
    ),
    OTC_N225: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketIndicesJapan225Icon,
        }))
    ),
    OTC_NDX: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketIndicesUsTech100Icon,
        }))
    ),
    OTC_SPC: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketIndicesUs500Icon,
        }))
    ),
    OTC_SSMI: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketIndicesSwiss20Icon,
        }))
    ),
    OTC_SX5E: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketIndicesEuro50Icon,
        }))
    ),
    R_10: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility10Icon,
        }))
    ),
    R_25: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility25Icon,
        }))
    ),
    R_50: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility50Icon,
        }))
    ),
    R_75: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility75Icon,
        }))
    ),
    R_100: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility100Icon,
        }))
    ),
    BOOM300N: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedBoom300Icon,
        }))
    ),
    BOOM500: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedBoom500Icon,
        }))
    ),
    BOOM600: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedBoom600Icon,
        }))
    ),
    BOOM900: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedBoom900Icon,
        }))
    ),
    BOOM1000: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedBoom1000Icon,
        }))
    ),
    CRASH300N: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedCrash300Icon,
        }))
    ),
    CRASH500: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedCrash500Icon,
        }))
    ),
    CRASH600: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedCrash600Icon,
        }))
    ),
    CRASH900: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedCrash900Icon,
        }))
    ),
    CRASH1000: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedCrash1000Icon,
        }))
    ),
    RDBEAR: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketDerivedBearIcon }))
    ),
    RDBULL: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({ default: module.MarketDerivedBullIcon }))
    ),
    STPRNG: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedStepIndices100Icon,
        }))
    ),
    STPRNG2: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedStepIndices200Icon,
        }))
    ),
    STPRNG3: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedStepIndices300Icon,
        }))
    ),
    STPRNG4: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedStepIndices400Icon,
        }))
    ),
    STPRNG5: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedStepIndices500Icon,
        }))
    ),
    WLDAUD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedAudBasketIcon,
        }))
    ),
    WLDEUR: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedEurBasketIcon,
        }))
    ),
    WLDGBP: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedGbpBasketIcon,
        }))
    ),
    WLDXAU: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedGoldBasketIcon,
        }))
    ),
    WLDUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedUsdBasketIcon,
        }))
    ),
    '1HZ10V': lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility101sIcon,
        }))
    ),
    '1HZ15V': lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility151sIcon,
        }))
    ),
    '1HZ25V': lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility251sIcon,
        }))
    ),
    '1HZ30V': lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility301sIcon,
        }))
    ),
    '1HZ50V': lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility501sIcon,
        }))
    ),
    '1HZ75V': lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility751sIcon,
        }))
    ),
    '1HZ90V': lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility901sIcon,
        }))
    ),
    '1HZ100V': lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility1001sIcon,
        }))
    ),
    '1HZ150V': lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility1501sIcon,
        }))
    ),
    '1HZ200V': lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility2001sIcon,
        }))
    ),
    '1HZ250V': lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility2501sIcon,
        }))
    ),
    '1HZ300V': lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedVolatility3001sIcon,
        }))
    ),
    JD10: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedJump10Icon,
        }))
    ),
    JD25: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedJump25Icon,
        }))
    ),
    JD50: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedJump50Icon,
        }))
    ),
    JD75: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedJump75Icon,
        }))
    ),
    JD100: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedJump100Icon,
        }))
    ),
    JD150: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedJump150Icon,
        }))
    ),
    JD200: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketDerivedJump200Icon,
        }))
    ),
    CRYBCHUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyBchusdIcon,
        }))
    ),
    CRYBNBUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyBnbusdIcon,
        }))
    ),
    CRYBTCLTC: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyBtcltcIcon,
        }))
    ),
    CRYIOTUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyIotusdIcon,
        }))
    ),
    CRYNEOUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyNeousdIcon,
        }))
    ),
    CRYOMGUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyOmgusdIcon,
        }))
    ),
    CRYTRXUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyTrxusdIcon,
        }))
    ),
    CRYBTCETH: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyBtcethIcon,
        }))
    ),
    CRYZECUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyZecusdIcon,
        }))
    ),
    CRYXMRUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyXmrusdIcon,
        }))
    ),
    CRYXMLUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyXlmusdIcon,
        }))
    ),
    CRYXRPUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyXrpusdIcon,
        }))
    ),
    CRYBTCUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyBtcusdIcon,
        }))
    ),
    CRYDSHUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyDshusdIcon,
        }))
    ),
    CRYETHUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyEthusdIcon,
        }))
    ),
    CRYEOSUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyEosusdIcon,
        }))
    ),
    CRYLTCUSD: lazy(() =>
        import('@/components/shared_ui/figma-icons/Markets').then(module => ({
            default: module.MarketCryptocurrencyLtcusdIcon,
        }))
    ),
    unknown: lazy(() =>
        import('@/components/shared_ui/figma-icons/Illustrative').then(module => ({
            default: module.IllustrativeMarketsIcon,
        }))
    ),
};

export const MarketIcon = ({ type, size }: { type: string; size?: IconSize }) => {
    const Icon = MARKET_ICONS[type?.toUpperCase() as keyof typeof MARKET_ICONS] || MARKET_ICONS.unknown;

    return (
        <Suspense fallback={null}>
            <Icon iconSize={size ?? 'xs'} />
        </Suspense>
    );
};
