import { createBadgeIcon } from './icon-base';

const makeMarketIcon = (label: string, accent = '#1d4ed8', background = '#eff6ff') =>
    createBadgeIcon({ label, accent, background });

const marketEntries = {
    MarketForexAudcadIcon: makeMarketIcon('AUD/CAD'),
    MarketForexAudchfIcon: makeMarketIcon('AUD/CHF'),
    MarketForexAudjpyIcon: makeMarketIcon('AUD/JPY'),
    MarketForexAudnzdIcon: makeMarketIcon('AUD/NZD'),
    MarketForexAudsgdIcon: makeMarketIcon('AUD/*'),
    MarketForexAudusdIcon: makeMarketIcon('AUD/USD'),
    MarketForexCadchfIcon: makeMarketIcon('BRO'),
    MarketForexEuraudIcon: makeMarketIcon('EUR/AUD'),
    MarketForexEurcadIcon: makeMarketIcon('EUR/CAD'),
    MarketForexEurchfIcon: makeMarketIcon('EUR/CHF'),
    MarketForexEurgbpIcon: makeMarketIcon('EUR/GBP'),
    MarketForexEurjpyIcon: makeMarketIcon('EUR/JPY'),
    MarketForexEurnzdIcon: makeMarketIcon('EUR/NZD'),
    MarketForexEurusdIcon: makeMarketIcon('EUR/USD'),
    MarketForexGbpaudIcon: makeMarketIcon('GBP/AUD'),
    MarketForexGbpcadIcon: makeMarketIcon('GBP/CAD'),
    MarketForexGbpchfIcon: makeMarketIcon('GBP/CHF'),
    MarketForexGbpjpyIcon: makeMarketIcon('GBP/JPY'),
    MarketForexGbpnokIcon: makeMarketIcon('GBP/NOK'),
    MarketForexGbpusdIcon: makeMarketIcon('GBP/USD'),
    MarketForexGbpnzdIcon: makeMarketIcon('GBP/NZD'),
    MarketForexNzdjpnIcon: makeMarketIcon('NZD/JPY'),
    MarketForexNzdusdIcon: makeMarketIcon('NZD/USD'),
    MarketForexUsdcadIcon: makeMarketIcon('USD/CAD'),
    MarketForexUsdchfIcon: makeMarketIcon('USD/CHF'),
    MarketForexUsdjpyIcon: makeMarketIcon('USD/JPY'),
    MarketForexUsdnokIcon: makeMarketIcon('USD/NOK'),
    MarketForexUsdplnIcon: makeMarketIcon('USD/PLN'),
    MarketForexUsdsekIcon: makeMarketIcon('USD/SEK'),
    MarketForexUsdmxnIcon: makeMarketIcon('USD/MXN'),
    MarketCommoditySilverusdIcon: makeMarketIcon('XAG', '#475569', '#f8fafc'),
    MarketCommodityGoldusdIcon: makeMarketIcon('XAU', '#a16207', '#fefce8'),
    MarketCommodityPalladiumusdIcon: makeMarketIcon('XPD', '#6b7280', '#f9fafb'),
    MarketCommodityPlatinumusdIcon: makeMarketIcon('XPT', '#334155', '#f8fafc'),
    MarketIndicesNetherlands25Icon: makeMarketIcon('AEX', '#0f766e', '#f0fdfa'),
    MarketIndicesAustralia200Icon: makeMarketIcon('ASX', '#0f766e', '#f0fdfa'),
    MarketIndicesWallStreet30Icon: makeMarketIcon('DJI', '#0f766e', '#f0fdfa'),
    MarketIndicesFrance40Icon: makeMarketIcon('CAC', '#0f766e', '#f0fdfa'),
    MarketIndicesUk100Icon: makeMarketIcon('UK', '#0f766e', '#f0fdfa'),
    MarketIndicesHongKong50Icon: makeMarketIcon('HSI', '#0f766e', '#f0fdfa'),
    MarketIndicesSpain35Icon: makeMarketIcon('IBEX', '#0f766e', '#f0fdfa'),
    MarketIndicesJapan225Icon: makeMarketIcon('N225', '#0f766e', '#f0fdfa'),
    MarketIndicesUsTech100Icon: makeMarketIcon('NDX', '#0f766e', '#f0fdfa'),
    MarketIndicesUs500Icon: makeMarketIcon('SPC', '#0f766e', '#f0fdfa'),
    MarketIndicesSwiss20Icon: makeMarketIcon('SMI', '#0f766e', '#f0fdfa'),
    MarketIndicesEuro50Icon: makeMarketIcon('SX5E', '#0f766e', '#f0fdfa'),
    MarketDerivedVolatility10Icon: makeMarketIcon('V10', '#4338ca', '#eef2ff'),
    MarketDerivedVolatility25Icon: makeMarketIcon('V25', '#4338ca', '#eef2ff'),
    MarketDerivedVolatility50Icon: makeMarketIcon('V50', '#4338ca', '#eef2ff'),
    MarketDerivedVolatility75Icon: makeMarketIcon('V75', '#4338ca', '#eef2ff'),
    MarketDerivedVolatility100Icon: makeMarketIcon('V100', '#4338ca', '#eef2ff'),
    MarketDerivedBoom300Icon: makeMarketIcon('B300', '#b91c1c', '#fef2f2'),
    MarketDerivedBoom500Icon: makeMarketIcon('B500', '#b91c1c', '#fef2f2'),
    MarketDerivedBoom600Icon: makeMarketIcon('B600', '#b91c1c', '#fef2f2'),
    MarketDerivedBoom900Icon: makeMarketIcon('B900', '#b91c1c', '#fef2f2'),
    MarketDerivedBoom1000Icon: makeMarketIcon('B1K', '#b91c1c', '#fef2f2'),
    MarketDerivedCrash300Icon: makeMarketIcon('C300', '#0f766e', '#ecfeff'),
    MarketDerivedCrash500Icon: makeMarketIcon('C500', '#0f766e', '#ecfeff'),
    MarketDerivedCrash600Icon: makeMarketIcon('C600', '#0f766e', '#ecfeff'),
    MarketDerivedCrash900Icon: makeMarketIcon('C900', '#0f766e', '#ecfeff'),
    MarketDerivedCrash1000Icon: makeMarketIcon('C1K', '#0f766e', '#ecfeff'),
    MarketDerivedBearIcon: makeMarketIcon('BEAR', '#92400e', '#fff7ed'),
    MarketDerivedBullIcon: makeMarketIcon('BULL', '#166534', '#ecfdf5'),
    MarketDerivedStepIndices100Icon: makeMarketIcon('STEP', '#7c3aed', '#f5f3ff'),
    MarketDerivedStepIndices200Icon: makeMarketIcon('S200', '#7c3aed', '#f5f3ff'),
    MarketDerivedStepIndices300Icon: makeMarketIcon('S300', '#7c3aed', '#f5f3ff'),
    MarketDerivedStepIndices400Icon: makeMarketIcon('S400', '#7c3aed', '#f5f3ff'),
    MarketDerivedStepIndices500Icon: makeMarketIcon('S500', '#7c3aed', '#f5f3ff'),
    MarketDerivedAudBasketIcon: makeMarketIcon('WLDA'),
    MarketDerivedEurBasketIcon: makeMarketIcon('WLDE'),
    MarketDerivedGbpBasketIcon: makeMarketIcon('WLDG'),
    MarketDerivedGoldBasketIcon: makeMarketIcon('WLDX'),
    MarketDerivedUsdBasketIcon: makeMarketIcon('WLDU'),
    MarketDerivedVolatility101sIcon: makeMarketIcon('1S10', '#4338ca', '#eef2ff'),
    MarketDerivedVolatility151sIcon: makeMarketIcon('1S15', '#4338ca', '#eef2ff'),
    MarketDerivedVolatility251sIcon: makeMarketIcon('1S25', '#4338ca', '#eef2ff'),
    MarketDerivedVolatility301sIcon: makeMarketIcon('1S30', '#4338ca', '#eef2ff'),
    MarketDerivedVolatility501sIcon: makeMarketIcon('1S50', '#4338ca', '#eef2ff'),
    MarketDerivedVolatility751sIcon: makeMarketIcon('1S75', '#4338ca', '#eef2ff'),
    MarketDerivedVolatility901sIcon: makeMarketIcon('1S90', '#4338ca', '#eef2ff'),
    MarketDerivedVolatility1001sIcon: makeMarketIcon('1S100', '#4338ca', '#eef2ff'),
    MarketDerivedVolatility1501sIcon: makeMarketIcon('1S150', '#4338ca', '#eef2ff'),
    MarketDerivedVolatility2001sIcon: makeMarketIcon('1S200', '#4338ca', '#eef2ff'),
    MarketDerivedVolatility2501sIcon: makeMarketIcon('1S250', '#4338ca', '#eef2ff'),
    MarketDerivedVolatility3001sIcon: makeMarketIcon('1S300', '#4338ca', '#eef2ff'),
    MarketDerivedJump10Icon: makeMarketIcon('J10', '#be185d', '#fdf2f8'),
    MarketDerivedJump25Icon: makeMarketIcon('J25', '#be185d', '#fdf2f8'),
    MarketDerivedJump50Icon: makeMarketIcon('J50', '#be185d', '#fdf2f8'),
    MarketDerivedJump75Icon: makeMarketIcon('J75', '#be185d', '#fdf2f8'),
    MarketDerivedJump100Icon: makeMarketIcon('J100', '#be185d', '#fdf2f8'),
    MarketDerivedJump150Icon: makeMarketIcon('J150', '#be185d', '#fdf2f8'),
    MarketDerivedJump200Icon: makeMarketIcon('J200', '#be185d', '#fdf2f8'),
    MarketCryptocurrencyBchusdIcon: makeMarketIcon('BCH', '#92400e', '#fff7ed'),
    MarketCryptocurrencyBnbusdIcon: makeMarketIcon('BNB', '#ca8a04', '#fefce8'),
    MarketCryptocurrencyBtcltcIcon: makeMarketIcon('BTC/L'),
    MarketCryptocurrencyIotusdIcon: makeMarketIcon('IOTA'),
    MarketCryptocurrencyNeousdIcon: makeMarketIcon('NEO'),
    MarketCryptocurrencyOmgusdIcon: makeMarketIcon('OMG'),
    MarketCryptocurrencyTrxusdIcon: makeMarketIcon('TRX', '#b91c1c', '#fef2f2'),
    MarketCryptocurrencyBtcethIcon: makeMarketIcon('BTC/E'),
    MarketCryptocurrencyZecusdIcon: makeMarketIcon('ZEC'),
    MarketCryptocurrencyXmrusdIcon: makeMarketIcon('XMR'),
    MarketCryptocurrencyXlmusdIcon: makeMarketIcon('XLM'),
    MarketCryptocurrencyXrpusdIcon: makeMarketIcon('XRP'),
    MarketCryptocurrencyBtcusdIcon: makeMarketIcon('BTC'),
    MarketCryptocurrencyDshusdIcon: makeMarketIcon('DASH'),
    MarketCryptocurrencyEthusdIcon: makeMarketIcon('ETH'),
    MarketCryptocurrencyEosusdIcon: makeMarketIcon('EOS'),
    MarketCryptocurrencyLtcusdIcon: makeMarketIcon('LTC'),
};

export const { ...allMarketIcons } = marketEntries;
export const IllustrativeMarketsFallback = makeMarketIcon('MKT', '#334155', '#f8fafc');

export const MarketForexAudcadIcon = allMarketIcons.MarketForexAudcadIcon;
export const MarketForexAudchfIcon = allMarketIcons.MarketForexAudchfIcon;
export const MarketForexAudjpyIcon = allMarketIcons.MarketForexAudjpyIcon;
export const MarketForexAudnzdIcon = allMarketIcons.MarketForexAudnzdIcon;
export const MarketForexAudsgdIcon = allMarketIcons.MarketForexAudsgdIcon;
export const MarketForexAudusdIcon = allMarketIcons.MarketForexAudusdIcon;
export const MarketForexCadchfIcon = allMarketIcons.MarketForexCadchfIcon;
export const MarketForexEuraudIcon = allMarketIcons.MarketForexEuraudIcon;
export const MarketForexEurcadIcon = allMarketIcons.MarketForexEurcadIcon;
export const MarketForexEurchfIcon = allMarketIcons.MarketForexEurchfIcon;
export const MarketForexEurgbpIcon = allMarketIcons.MarketForexEurgbpIcon;
export const MarketForexEurjpyIcon = allMarketIcons.MarketForexEurjpyIcon;
export const MarketForexEurnzdIcon = allMarketIcons.MarketForexEurnzdIcon;
export const MarketForexEurusdIcon = allMarketIcons.MarketForexEurusdIcon;
export const MarketForexGbpaudIcon = allMarketIcons.MarketForexGbpaudIcon;
export const MarketForexGbpcadIcon = allMarketIcons.MarketForexGbpcadIcon;
export const MarketForexGbpchfIcon = allMarketIcons.MarketForexGbpchfIcon;
export const MarketForexGbpjpyIcon = allMarketIcons.MarketForexGbpjpyIcon;
export const MarketForexGbpnokIcon = allMarketIcons.MarketForexGbpnokIcon;
export const MarketForexGbpusdIcon = allMarketIcons.MarketForexGbpusdIcon;
export const MarketForexGbpnzdIcon = allMarketIcons.MarketForexGbpnzdIcon;
export const MarketForexNzdjpnIcon = allMarketIcons.MarketForexNzdjpnIcon;
export const MarketForexNzdusdIcon = allMarketIcons.MarketForexNzdusdIcon;
export const MarketForexUsdcadIcon = allMarketIcons.MarketForexUsdcadIcon;
export const MarketForexUsdchfIcon = allMarketIcons.MarketForexUsdchfIcon;
export const MarketForexUsdjpyIcon = allMarketIcons.MarketForexUsdjpyIcon;
export const MarketForexUsdnokIcon = allMarketIcons.MarketForexUsdnokIcon;
export const MarketForexUsdplnIcon = allMarketIcons.MarketForexUsdplnIcon;
export const MarketForexUsdsekIcon = allMarketIcons.MarketForexUsdsekIcon;
export const MarketForexUsdmxnIcon = allMarketIcons.MarketForexUsdmxnIcon;
export const MarketCommoditySilverusdIcon = allMarketIcons.MarketCommoditySilverusdIcon;
export const MarketCommodityGoldusdIcon = allMarketIcons.MarketCommodityGoldusdIcon;
export const MarketCommodityPalladiumusdIcon = allMarketIcons.MarketCommodityPalladiumusdIcon;
export const MarketCommodityPlatinumusdIcon = allMarketIcons.MarketCommodityPlatinumusdIcon;
export const MarketIndicesNetherlands25Icon = allMarketIcons.MarketIndicesNetherlands25Icon;
export const MarketIndicesAustralia200Icon = allMarketIcons.MarketIndicesAustralia200Icon;
export const MarketIndicesWallStreet30Icon = allMarketIcons.MarketIndicesWallStreet30Icon;
export const MarketIndicesFrance40Icon = allMarketIcons.MarketIndicesFrance40Icon;
export const MarketIndicesUk100Icon = allMarketIcons.MarketIndicesUk100Icon;
export const MarketIndicesHongKong50Icon = allMarketIcons.MarketIndicesHongKong50Icon;
export const MarketIndicesSpain35Icon = allMarketIcons.MarketIndicesSpain35Icon;
export const MarketIndicesJapan225Icon = allMarketIcons.MarketIndicesJapan225Icon;
export const MarketIndicesUsTech100Icon = allMarketIcons.MarketIndicesUsTech100Icon;
export const MarketIndicesUs500Icon = allMarketIcons.MarketIndicesUs500Icon;
export const MarketIndicesSwiss20Icon = allMarketIcons.MarketIndicesSwiss20Icon;
export const MarketIndicesEuro50Icon = allMarketIcons.MarketIndicesEuro50Icon;
export const MarketDerivedVolatility10Icon = allMarketIcons.MarketDerivedVolatility10Icon;
export const MarketDerivedVolatility25Icon = allMarketIcons.MarketDerivedVolatility25Icon;
export const MarketDerivedVolatility50Icon = allMarketIcons.MarketDerivedVolatility50Icon;
export const MarketDerivedVolatility75Icon = allMarketIcons.MarketDerivedVolatility75Icon;
export const MarketDerivedVolatility100Icon = allMarketIcons.MarketDerivedVolatility100Icon;
export const MarketDerivedBoom300Icon = allMarketIcons.MarketDerivedBoom300Icon;
export const MarketDerivedBoom500Icon = allMarketIcons.MarketDerivedBoom500Icon;
export const MarketDerivedBoom600Icon = allMarketIcons.MarketDerivedBoom600Icon;
export const MarketDerivedBoom900Icon = allMarketIcons.MarketDerivedBoom900Icon;
export const MarketDerivedBoom1000Icon = allMarketIcons.MarketDerivedBoom1000Icon;
export const MarketDerivedCrash300Icon = allMarketIcons.MarketDerivedCrash300Icon;
export const MarketDerivedCrash500Icon = allMarketIcons.MarketDerivedCrash500Icon;
export const MarketDerivedCrash600Icon = allMarketIcons.MarketDerivedCrash600Icon;
export const MarketDerivedCrash900Icon = allMarketIcons.MarketDerivedCrash900Icon;
export const MarketDerivedCrash1000Icon = allMarketIcons.MarketDerivedCrash1000Icon;
export const MarketDerivedBearIcon = allMarketIcons.MarketDerivedBearIcon;
export const MarketDerivedBullIcon = allMarketIcons.MarketDerivedBullIcon;
export const MarketDerivedStepIndices100Icon = allMarketIcons.MarketDerivedStepIndices100Icon;
export const MarketDerivedStepIndices200Icon = allMarketIcons.MarketDerivedStepIndices200Icon;
export const MarketDerivedStepIndices300Icon = allMarketIcons.MarketDerivedStepIndices300Icon;
export const MarketDerivedStepIndices400Icon = allMarketIcons.MarketDerivedStepIndices400Icon;
export const MarketDerivedStepIndices500Icon = allMarketIcons.MarketDerivedStepIndices500Icon;
export const MarketDerivedAudBasketIcon = allMarketIcons.MarketDerivedAudBasketIcon;
export const MarketDerivedEurBasketIcon = allMarketIcons.MarketDerivedEurBasketIcon;
export const MarketDerivedGbpBasketIcon = allMarketIcons.MarketDerivedGbpBasketIcon;
export const MarketDerivedGoldBasketIcon = allMarketIcons.MarketDerivedGoldBasketIcon;
export const MarketDerivedUsdBasketIcon = allMarketIcons.MarketDerivedUsdBasketIcon;
export const MarketDerivedVolatility101sIcon = allMarketIcons.MarketDerivedVolatility101sIcon;
export const MarketDerivedVolatility151sIcon = allMarketIcons.MarketDerivedVolatility151sIcon;
export const MarketDerivedVolatility251sIcon = allMarketIcons.MarketDerivedVolatility251sIcon;
export const MarketDerivedVolatility301sIcon = allMarketIcons.MarketDerivedVolatility301sIcon;
export const MarketDerivedVolatility501sIcon = allMarketIcons.MarketDerivedVolatility501sIcon;
export const MarketDerivedVolatility751sIcon = allMarketIcons.MarketDerivedVolatility751sIcon;
export const MarketDerivedVolatility901sIcon = allMarketIcons.MarketDerivedVolatility901sIcon;
export const MarketDerivedVolatility1001sIcon = allMarketIcons.MarketDerivedVolatility1001sIcon;
export const MarketDerivedVolatility1501sIcon = allMarketIcons.MarketDerivedVolatility1501sIcon;
export const MarketDerivedVolatility2001sIcon = allMarketIcons.MarketDerivedVolatility2001sIcon;
export const MarketDerivedVolatility2501sIcon = allMarketIcons.MarketDerivedVolatility2501sIcon;
export const MarketDerivedVolatility3001sIcon = allMarketIcons.MarketDerivedVolatility3001sIcon;
export const MarketDerivedJump10Icon = allMarketIcons.MarketDerivedJump10Icon;
export const MarketDerivedJump25Icon = allMarketIcons.MarketDerivedJump25Icon;
export const MarketDerivedJump50Icon = allMarketIcons.MarketDerivedJump50Icon;
export const MarketDerivedJump75Icon = allMarketIcons.MarketDerivedJump75Icon;
export const MarketDerivedJump100Icon = allMarketIcons.MarketDerivedJump100Icon;
export const MarketDerivedJump150Icon = allMarketIcons.MarketDerivedJump150Icon;
export const MarketDerivedJump200Icon = allMarketIcons.MarketDerivedJump200Icon;
export const MarketCryptocurrencyBchusdIcon = allMarketIcons.MarketCryptocurrencyBchusdIcon;
export const MarketCryptocurrencyBnbusdIcon = allMarketIcons.MarketCryptocurrencyBnbusdIcon;
export const MarketCryptocurrencyBtcltcIcon = allMarketIcons.MarketCryptocurrencyBtcltcIcon;
export const MarketCryptocurrencyIotusdIcon = allMarketIcons.MarketCryptocurrencyIotusdIcon;
export const MarketCryptocurrencyNeousdIcon = allMarketIcons.MarketCryptocurrencyNeousdIcon;
export const MarketCryptocurrencyOmgusdIcon = allMarketIcons.MarketCryptocurrencyOmgusdIcon;
export const MarketCryptocurrencyTrxusdIcon = allMarketIcons.MarketCryptocurrencyTrxusdIcon;
export const MarketCryptocurrencyBtcethIcon = allMarketIcons.MarketCryptocurrencyBtcethIcon;
export const MarketCryptocurrencyZecusdIcon = allMarketIcons.MarketCryptocurrencyZecusdIcon;
export const MarketCryptocurrencyXmrusdIcon = allMarketIcons.MarketCryptocurrencyXmrusdIcon;
export const MarketCryptocurrencyXlmusdIcon = allMarketIcons.MarketCryptocurrencyXlmusdIcon;
export const MarketCryptocurrencyXrpusdIcon = allMarketIcons.MarketCryptocurrencyXrpusdIcon;
export const MarketCryptocurrencyBtcusdIcon = allMarketIcons.MarketCryptocurrencyBtcusdIcon;
export const MarketCryptocurrencyDshusdIcon = allMarketIcons.MarketCryptocurrencyDshusdIcon;
export const MarketCryptocurrencyEthusdIcon = allMarketIcons.MarketCryptocurrencyEthusdIcon;
export const MarketCryptocurrencyEosusdIcon = allMarketIcons.MarketCryptocurrencyEosusdIcon;
export const MarketCryptocurrencyLtcusdIcon = allMarketIcons.MarketCryptocurrencyLtcusdIcon;
