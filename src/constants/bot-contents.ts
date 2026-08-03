type TTabsTitle = {
    [key: string]: string | number;
};

type TDashboardTabIndex = {
    [key: string]: number;
};

export const tabs_title: TTabsTitle = Object.freeze({
    WORKSPACE: 'Workspace',
    CHART: 'Chart',
});

export const DBOT_TABS: TDashboardTabIndex = Object.freeze({
    BOT_IDEAS: 0,
    BEST_BOTS: 1,
    UP_AND_DOWN: 2,
    DASHBOARD: 3,
    BOT_BUILDER: 4,
    AUTO_TRADES: 5,
    MANUAL_TRADING: 6,
    SCANNER: 7,
    ACCUMILATOIRS: 8,
    ANALYSIS_TOOL: 9,
    CHART: 10,
    TRADING_VIEW: 11,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-bot-ideas',
    'id-best-bots',
    'id-up-and-down',
    'id-dbot-dashboard',
    'id-bot-builder',
    'id-auto-trades',
    'id-manual-trading',
    'id-scanner',
    'id-accumilatoirs',
    'id-analysistool',
    'id-chart',
    'id-tradingview',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
