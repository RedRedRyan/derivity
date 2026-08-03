import { createBadgeIcon } from './icon-base';

const assetIcon = (label: string, accent = '#0f766e', background = '#ecfeff') =>
    createBadgeIcon({ label, accent, background });

export const ASSET_ICON_COMPONENTS = {
    icCurrencyEurCheck: assetIcon('EUR'),
    icDeriv: assetIcon('DRV', '#ea580c', '#fff7ed'),
    IcAccumilatoirs: assetIcon('ACC'),
    IcAdd: assetIcon('+'),
    IcArrowLeft: assetIcon('<'),
    IcBotBuilder: assetIcon('BOT'),
    IcBotBuilderSkeleton: assetIcon('BOT'),
    IcBox: assetIcon('BOX'),
    IcChart: assetIcon('CH'),
    IcChartsTabDbot: assetIcon('CH'),
    IcChevronDown: assetIcon('V'),
    IcChevronDownBold: assetIcon('V'),
    IcChevronRightBold: assetIcon('>'),
    IcChevronUp: assetIcon('^'),
    IcClose: assetIcon('X'),
    IcCross: assetIcon('X'),
    IcDashboard: assetIcon('DB'),
    IcDbotClose: assetIcon('X'),
    IcDbotDownload: assetIcon('DL'),
    IcDbotNoSearchResult: assetIcon('0'),
    IcDelete: assetIcon('DEL'),
    IcEdit: assetIcon('ED'),
    IcGoogleDriveDbot: assetIcon('GD', '#1d4ed8', '#eff6ff'),
    IcInfo: assetIcon('i'),
    IcLoader: assetIcon('...'),
    IcMigrateStrategy: assetIcon('UP'),
    IcMinus: assetIcon('-'),
    IcMyComputer: assetIcon('PC', '#475569', '#f8fafc'),
    IcNoRecent: assetIcon('NR'),
    IcPlay: assetIcon('GO'),
    IcQuickStrategy: assetIcon('QS'),
    IcReports: assetIcon('RP'),
    IcSearch: assetIcon('?'),
    IcStop: assetIcon('[]'),
    IcTradetypeAccu: assetIcon('TT'),
    IcUpgradeBlockly: assetIcon('BL'),
    IcUnknown: assetIcon('?'),
    IcCircle: assetIcon('o'),
};

export type AssetIconName = keyof typeof ASSET_ICON_COMPONENTS;

export const getAssetIconComponent = (iconName: string) =>
    ASSET_ICON_COMPONENTS[iconName as AssetIconName] || assetIcon(iconName.slice(0, 3).toUpperCase());
