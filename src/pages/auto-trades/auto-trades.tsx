import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Input from '@/components/shared_ui/input';
import ThemedScrollbars from '@/components/shared_ui/themed-scrollbars';
import { DBOT_TABS } from '@/constants/bot-contents';
import { contract_stages } from '@/constants/contract-stage';
import { api_base, observer as globalObserver } from '@/external/bot-skeleton';
import { useStore } from '@/hooks/useStore';
import { conditionNotifierStore } from '@/stores/condition-notifier-store';
import { API_BASE } from '@/utils/api-base';
import {
    DIGIT_STRATEGIES,
    evaluateDigitStrategy,
    SUPPORTED_VOLATILITY_MARKETS,
    type DigitStrategyId,
} from '@/utils/digit-strategy';
import { recordDiagnosticEvent, setDiagnosticGauge } from '@/utils/diagnostics';
import { getLastDigitFromQuote, getMarketPipSize, isExpectedStreamInterruption } from '@/utils/market-data';
import { buyContractForUi, streamContractUntilSettled } from '@/utils/trade-purchase';
import { safeSubscribe } from '@/utils/websocket-handler';
import {
    AUTO_TRADE_STRATEGY_FAMILIES,
    AUTO_TRADE_STRATEGY_PRESET_COUNT,
    AUTO_TRADE_STRATEGY_PRESET_LOOKUP,
} from './strategy-presets';
import type { AutoTradeStrategyPreset } from './strategy-presets';
import './auto-trades.scss';

type MartingaleModeType = 'no_martingale' | 'after_one_loss' | 'after_two_losses' | 'custom_consecutive_loss_trigger';

type AutoMarket = { symbol: string; label: string; pip: number };
type Direction = 1 | -1 | 0;
type AiFabPosition = { left: number; top: number };
type StrategyTemplate = 'STANDARD' | DigitStrategyId;
type FloatingStrategyAlert = {
    marketLabel: string;
    message: string;
    strategyId: DigitStrategyId;
    symbol: string;
};

const FIVE_MINUTE_GRANULARITY = 300;
const AI_FAB_SIZE = 72;
const AI_FAB_MARGIN = 12;
const AI_FAB_BOTTOM_GUARD = 82;
const STRATEGY_ALERT_SOUND_ID = 'announcement';

const AUTO_MARKETS: AutoMarket[] = SUPPORTED_VOLATILITY_MARKETS.map(market => ({
    label: market.label.replace('Volatility ', 'Vol ').replace(' Index', ''),
    pip: market.pip ?? 2,
    symbol: market.symbol,
}));

const AUTO_MARKET_SYMBOLS = AUTO_MARKETS.map(({ symbol }) => symbol);
const AUTO_MARKET_LOOKUP = new Map(AUTO_MARKETS.map(market => [market.symbol, market]));

type AiAutoTradeSettings = {
    tradeType?: TradeType | null;
    barrier?: string | null;
    predictionBeforeLoss?: string | null;
    predictionAfterLoss?: string | null;
    analysisTicks?: string | null;
    selectedMarketSymbols?: string[];
    stake?: string | null;
    martingale?: string | null;
    takeProfit?: string | null;
    stopLoss?: string | null;
    streak?: string | null;
    strategyMode?: StrategyMode | null;
    martingaleMode?: MartingaleModeType | null;
    consecutiveLossCount?: string | null;
};

type AiCustomStrategy = {
    intent?: string;
    entryRules?: string[];
    exitRules?: string[];
    riskRules?: string[];
    notes?: string[];
};

type AiAutoTradeParseResult = {
    settings: AiAutoTradeSettings;
    summary: string[];
    warnings: string[];
    unsupportedCapabilities?: string[];
    customStrategy?: AiCustomStrategy;
    confidence?: number;
    source?: 'openai' | 'local' | 'preset';
};

const DATA_SILENCE_RESTART_MS = 15000;
const DATA_RESTART_COOLDOWN_MS = 10000;
const UI_REFRESH_THROTTLE_MS = 80;
const PERCENTAGE_ANALYSIS_HISTORY_SIZE = 1000;
const PERCENTAGE_BACKFILL_COUNT = PERCENTAGE_ANALYSIS_HISTORY_SIZE;
const PERCENTAGE_MIN_SAMPLE_SIZE = 100;
const MARKET_LOSS_COOLDOWN_TICKS = 60;

type StrategyMode = 'STANDARD' | 'INVERSE' | 'PERCENTAGE';

type PercentageThresholds = {
    over: Record<number, { minPercentage: number; confidence: number; streak: number }>;
    under: Record<number, { minPercentage: number; confidence: number; streak: number }>;
    even: { minPercentage: number; streak: number; confidence: number };
    odd: { minPercentage: number; streak: number; confidence: number };
    rise: { minPercentage: number; momentum: number; confidence: number };
    fall: { minPercentage: number; momentum: number; confidence: number };
    differs: { minPercentage: number; confidence: number; streak: number };
    match: { minPercentage: number; confidence: number; streak: number };
    higher: { minPercentage: number; momentum: number; confidence: number };
    lower: { minPercentage: number; momentum: number; confidence: number };
};

const PERCENTAGE_THRESHOLDS: PercentageThresholds = {
    over: {
        0: { minPercentage: 88, confidence: 92, streak: 3 },
        1: { minPercentage: 82, confidence: 90, streak: 3 },
        2: { minPercentage: 74, confidence: 88, streak: 2 },
        3: { minPercentage: 66, confidence: 85, streak: 2 },
        4: { minPercentage: 58, confidence: 82, streak: 2 },
        5: { minPercentage: 50, confidence: 80, streak: 1 },
        6: { minPercentage: 42, confidence: 80, streak: 2 },
        7: { minPercentage: 34, confidence: 85, streak: 2 },
        8: { minPercentage: 22, confidence: 90, streak: 3 },
    },
    under: {
        1: { minPercentage: 12, confidence: 92, streak: 3 },
        2: { minPercentage: 18, confidence: 90, streak: 3 },
        3: { minPercentage: 26, confidence: 88, streak: 2 },
        4: { minPercentage: 34, confidence: 85, streak: 2 },
        5: { minPercentage: 42, confidence: 82, streak: 2 },
        6: { minPercentage: 50, confidence: 80, streak: 1 },
        7: { minPercentage: 58, confidence: 80, streak: 2 },
        8: { minPercentage: 66, confidence: 85, streak: 2 },
        9: { minPercentage: 78, confidence: 90, streak: 3 },
    },
    even: { minPercentage: 56, streak: 4, confidence: 84 },
    odd: { minPercentage: 56, streak: 4, confidence: 84 },
    rise: { minPercentage: 58, momentum: 4, confidence: 86 },
    fall: { minPercentage: 58, momentum: 4, confidence: 86 },
    differs: { minPercentage: 82, confidence: 91, streak: 3 },
    match: { minPercentage: 18, confidence: 90, streak: 4 },
    higher: { minPercentage: 57, momentum: 3, confidence: 85 },
    lower: { minPercentage: 57, momentum: 3, confidence: 85 },
};

export type TradeType =
    | 'DIGITOVER'
    | 'DIGITUNDER'
    | 'DIGITEVEN'
    | 'DIGITODD'
    | 'DIGITMATCH'
    | 'DIGITDIFF'
    | 'CALL'
    | 'PUT'
    | 'RUNHIGH'
    | 'RUNLOW';

const TRADE_TYPE_LABELS: Record<TradeType, string> = {
    DIGITOVER: 'Digit Over',
    DIGITUNDER: 'Digit Under',
    DIGITEVEN: 'Digit Even',
    DIGITODD: 'Digit Odd',
    DIGITMATCH: 'Matches',
    DIGITDIFF: 'Differs',
    CALL: 'Rise',
    PUT: 'Fall',
    RUNHIGH: 'Only Ups',
    RUNLOW: 'Only Downs',
};

const BARRIER_NEEDED: Record<TradeType, boolean> = {
    DIGITOVER: true,
    DIGITUNDER: true,
    DIGITEVEN: false,
    DIGITODD: false,
    DIGITMATCH: true,
    DIGITDIFF: true,
    CALL: false,
    PUT: false,
    RUNHIGH: false,
    RUNLOW: false,
};

const IS_DIRECTION_TYPE: Record<TradeType, boolean> = {
    DIGITOVER: false,
    DIGITUNDER: false,
    DIGITEVEN: false,
    DIGITODD: false,
    DIGITMATCH: false,
    DIGITDIFF: false,
    CALL: true,
    PUT: true,
    RUNHIGH: true,
    RUNLOW: true,
};

const INVERSE_TRADE_TYPE: Record<TradeType, TradeType> = {
    DIGITOVER: 'DIGITUNDER',
    DIGITUNDER: 'DIGITOVER',
    DIGITEVEN: 'DIGITODD',
    DIGITODD: 'DIGITEVEN',
    DIGITMATCH: 'DIGITDIFF',
    DIGITDIFF: 'DIGITMATCH',
    CALL: 'PUT',
    PUT: 'CALL',
    RUNHIGH: 'RUNLOW',
    RUNLOW: 'RUNHIGH',
};

const INVERSE_LABELS: Record<TradeType, string> = {
    DIGITOVER: 'Inv Over',
    DIGITUNDER: 'Inv Under',
    DIGITEVEN: 'Inv Even',
    DIGITODD: 'Inv Odd',
    DIGITMATCH: 'Inv Match',
    DIGITDIFF: 'Inv Diff',
    CALL: 'Inv Rise',
    PUT: 'Inv Fall',
    RUNHIGH: 'Inv Ups',
    RUNLOW: 'Inv Downs',
};

const isInverseDirectionMatch = (trade_type: TradeType, direction: Direction) => {
    if (trade_type === 'CALL') return direction === 1;
    if (trade_type === 'PUT') return direction === -1;
    if (trade_type === 'RUNHIGH') return direction === 1;
    if (trade_type === 'RUNLOW') return direction === -1;
    return false;
};

const isCandleConfirmedTradeType = (trade_type: TradeType) =>
    trade_type === 'CALL' || trade_type === 'PUT' || trade_type === 'RUNHIGH' || trade_type === 'RUNLOW';

const isInverseCandleMatch = (trade_type: TradeType, candle_direction: Direction) => {
    if (trade_type === 'CALL') return candle_direction === 1;
    if (trade_type === 'PUT') return candle_direction === -1;
    if (trade_type === 'RUNHIGH') return candle_direction === -1;
    if (trade_type === 'RUNLOW') return candle_direction === 1;
    return true;
};

const DEFAULT_BARRIER: Record<TradeType, string> = {
    DIGITOVER: '4',
    DIGITUNDER: '5',
    DIGITEVEN: '4',
    DIGITODD: '4',
    DIGITMATCH: '4',
    DIGITDIFF: '4',
    CALL: '4',
    PUT: '4',
    RUNHIGH: '4',
    RUNLOW: '4',
};

const isRunTradeType = (trade_type: TradeType) => trade_type === 'RUNHIGH' || trade_type === 'RUNLOW';
const usesLossPrediction = (trade_type: TradeType) => trade_type === 'DIGITOVER' || trade_type === 'DIGITUNDER';
const STRATEGY_TEMPLATE_IDS: StrategyTemplate[] = ['STANDARD', 'OVER_2_MARKET', 'UNDER_7_MARKET'];

const getTemplateTradeConfig = (template: StrategyTemplate) => {
    if (template === 'OVER_2_MARKET') {
        return { barrier: '2', tradeType: 'DIGITOVER' as TradeType };
    }
    if (template === 'UNDER_7_MARKET') {
        return { barrier: '7', tradeType: 'DIGITUNDER' as TradeType };
    }
    return null;
};

const playStrategyAlertSound = () => {
    if (typeof document === 'undefined') return;

    const audio = document.getElementById(STRATEGY_ALERT_SOUND_ID) as HTMLAudioElement | null;
    if (!audio) return;

    audio.currentTime = 0;
    audio.play().catch(() => {});
};

const clampAiFabPosition = (left: number, top: number): AiFabPosition => {
    if (typeof window === 'undefined') return { left, top };

    const maxLeft = Math.max(AI_FAB_MARGIN, window.innerWidth - AI_FAB_SIZE - AI_FAB_MARGIN);
    const maxTop = Math.max(AI_FAB_MARGIN, window.innerHeight - AI_FAB_SIZE - AI_FAB_BOTTOM_GUARD);

    return {
        left: Math.min(Math.max(AI_FAB_MARGIN, left), maxLeft),
        top: Math.min(Math.max(AI_FAB_MARGIN, top), maxTop),
    };
};

const getDefaultAiFabPosition = () => {
    if (typeof window === 'undefined') return { left: AI_FAB_MARGIN, top: AI_FAB_MARGIN };

    return clampAiFabPosition(window.innerWidth - AI_FAB_SIZE - 16, window.innerHeight - AI_FAB_SIZE - 104);
};

const normalizeMartingaleMode = (value: unknown): MartingaleModeType => {
    if (value === 'no_martingale') return 'no_martingale';
    if (value === 'after_two_losses') return 'after_two_losses';
    if (value === 'custom_consecutive_loss_trigger' || value === 'consecutive_loss_trigger') {
        return 'custom_consecutive_loss_trigger';
    }
    return 'after_one_loss';
};

const clampConsecutiveLossThreshold = (value: unknown) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 2;
    return Math.min(10, Math.max(1, Math.trunc(numeric)));
};

const getInitialConsecutiveLossThreshold = () => {
    try {
        const saved = localStorage.getItem('auto_trades_consecutiveLossCount');
        return clampConsecutiveLossThreshold(saved || 2);
    } catch {
        return 2;
    }
};

const getAiNumber = (text: string, patterns: RegExp[], min: number, max: number) => {
    for (const pattern of patterns) {
        const match = text.match(pattern);
        const value = Number(match?.[1]);
        if (Number.isFinite(value) && value >= min && value <= max) return String(value);
    }
    return undefined;
};

const getAiMoney = (text: string, patterns: RegExp[]) => {
    for (const pattern of patterns) {
        const match = text.match(pattern);
        const value = Number(match?.[1]);
        if (Number.isFinite(value) && value > 0) return String(value);
    }
    return undefined;
};

const getAiMarketSymbols = (text: string) => {
    const symbols = new Set<string>();
    const normalized = text.toLowerCase();

    AUTO_MARKETS.forEach(market => {
        if (normalized.includes(market.symbol.toLowerCase()) || normalized.includes(market.label.toLowerCase())) {
            symbols.add(market.symbol);
        }
    });

    const volatilityMatches = normalized.matchAll(/\b(?:v|vol|volatility)\s*(10|15|25|30|50|75|90|100)\b/g);
    for (const match of volatilityMatches) {
        const value = match[1];
        const wantsOneSecond = /\b(?:1s|1\s*second|one\s*second|1hz)\b/.test(normalized);
        const oneSecondSymbol = `1HZ${value}V`;
        const standardSymbol = `R_${value}`;
        const symbol = wantsOneSecond && AUTO_MARKET_LOOKUP.has(oneSecondSymbol) ? oneSecondSymbol : standardSymbol;
        if (AUTO_MARKET_LOOKUP.has(symbol)) symbols.add(symbol);
    }

    return [...symbols];
};

const isAiTradeType = (value: unknown): value is TradeType =>
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(TRADE_TYPE_LABELS, value);

const isAiStrategyMode = (value: unknown): value is StrategyMode =>
    value === 'STANDARD' || value === 'INVERSE' || value === 'PERCENTAGE';

const getAiDigitString = (value: unknown) => {
    const digit = Number(value);
    return Number.isInteger(digit) && digit >= 0 && digit <= 9 ? String(digit) : undefined;
};

const getDigitNumber = (value: unknown, fallback: number) => {
    const digit = Number(value);
    return Number.isFinite(digit) ? Math.min(9, Math.max(0, Math.trunc(digit))) : fallback;
};

const getAiBoundedIntString = (value: unknown, min: number, max: number) => {
    const numeric = Number(value);
    return Number.isInteger(numeric) && numeric >= min && numeric <= max ? String(numeric) : undefined;
};

const getAiPositiveNumberString = (value: unknown) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? String(value) : undefined;
};

export const normalizeAiAutoTradePlan = (plan: Partial<AiAutoTradeParseResult>): AiAutoTradeParseResult => {
    const settings = plan.settings || {};
    const normalizedSettings: AiAutoTradeSettings = {};

    if (isAiTradeType(settings.tradeType)) normalizedSettings.tradeType = settings.tradeType;
    if (isAiStrategyMode(settings.strategyMode)) normalizedSettings.strategyMode = settings.strategyMode;

    const barrier = getAiDigitString(settings.barrier);
    if (barrier !== undefined) normalizedSettings.barrier = barrier;

    const predictionBeforeLoss = getAiDigitString(settings.predictionBeforeLoss);
    if (predictionBeforeLoss !== undefined) normalizedSettings.predictionBeforeLoss = predictionBeforeLoss;

    const predictionAfterLoss = getAiDigitString(settings.predictionAfterLoss);
    if (predictionAfterLoss !== undefined) normalizedSettings.predictionAfterLoss = predictionAfterLoss;

    const analysisTicks = getAiBoundedIntString(settings.analysisTicks, 1, 10);
    if (analysisTicks !== undefined) normalizedSettings.analysisTicks = analysisTicks;

    const streak = getAiBoundedIntString(settings.streak, 1, 10);
    if (streak !== undefined) normalizedSettings.streak = streak;

    if (Array.isArray(settings.selectedMarketSymbols)) {
        normalizedSettings.selectedMarketSymbols = [
            ...new Set(settings.selectedMarketSymbols.filter(symbol => AUTO_MARKET_LOOKUP.has(symbol))),
        ];
    }

    const stake = getAiPositiveNumberString(settings.stake);
    if (stake !== undefined) normalizedSettings.stake = stake;

    const martingale = getAiPositiveNumberString(settings.martingale);
    if (martingale !== undefined) normalizedSettings.martingale = martingale;

    const takeProfit = getAiPositiveNumberString(settings.takeProfit);
    if (takeProfit !== undefined) normalizedSettings.takeProfit = takeProfit;

    const stopLoss = getAiPositiveNumberString(settings.stopLoss);
    if (stopLoss !== undefined) normalizedSettings.stopLoss = stopLoss;

    if (settings.martingaleMode != null) {
        normalizedSettings.martingaleMode = normalizeMartingaleMode(settings.martingaleMode);
    }

    const consecutiveLossCount = getAiBoundedIntString(settings.consecutiveLossCount, 1, 10);
    if (consecutiveLossCount !== undefined) normalizedSettings.consecutiveLossCount = consecutiveLossCount;

    return {
        settings: normalizedSettings,
        summary: Array.isArray(plan.summary) ? plan.summary.filter(item => typeof item === 'string') : [],
        warnings: Array.isArray(plan.warnings) ? plan.warnings.filter(item => typeof item === 'string') : [],
        unsupportedCapabilities: Array.isArray(plan.unsupportedCapabilities)
            ? plan.unsupportedCapabilities.filter(item => typeof item === 'string')
            : [],
        customStrategy: {
            intent: typeof plan.customStrategy?.intent === 'string' ? plan.customStrategy.intent : undefined,
            entryRules: Array.isArray(plan.customStrategy?.entryRules)
                ? plan.customStrategy.entryRules.filter(item => typeof item === 'string')
                : [],
            exitRules: Array.isArray(plan.customStrategy?.exitRules)
                ? plan.customStrategy.exitRules.filter(item => typeof item === 'string')
                : [],
            riskRules: Array.isArray(plan.customStrategy?.riskRules)
                ? plan.customStrategy.riskRules.filter(item => typeof item === 'string')
                : [],
            notes: Array.isArray(plan.customStrategy?.notes)
                ? plan.customStrategy.notes.filter(item => typeof item === 'string')
                : [],
        },
        confidence: Number.isFinite(Number(plan.confidence)) ? Number(plan.confidence) : undefined,
        source:
            plan.source === 'openai' || plan.source === 'local' || plan.source === 'preset' ? plan.source : undefined,
    };
};

export const parseAiAutoTradeStrategy = (rawText: string): AiAutoTradeParseResult => {
    const text = rawText.toLowerCase().replace(/\s+/g, ' ').trim();
    const settings: AiAutoTradeSettings = {};
    const summary: string[] = [];
    const warnings: string[] = [];

    if (!text) {
        return { settings, summary, warnings: ['Enter a strategy before applying settings.'], source: 'local' };
    }

    const afterLossMatch = text.match(
        /(?:after|if|when|incase|in case|following)\s+(?:of\s+)?(?:a\s+)?loss.*?\b(over|under)\s*(?:digit\s*)?([0-9])\b/
    );
    const firstOverUnderMatch = text.match(/\b(over|under)\s*(?:digit\s*)?([0-9])\b/);

    if (firstOverUnderMatch) {
        settings.tradeType = firstOverUnderMatch[1] === 'under' ? 'DIGITUNDER' : 'DIGITOVER';
        settings.predictionBeforeLoss = firstOverUnderMatch[2];
        settings.strategyMode = 'STANDARD';
        summary.push(
            `${settings.tradeType === 'DIGITUNDER' ? 'Digit Under' : 'Digit Over'} before-loss prediction ${firstOverUnderMatch[2]}`
        );

        if (afterLossMatch) {
            const afterLossType = afterLossMatch[1] === 'under' ? 'DIGITUNDER' : 'DIGITOVER';
            if (afterLossType !== settings.tradeType) {
                warnings.push('After-loss prediction type was different, so only the digit value was applied.');
            }
            settings.predictionAfterLoss = afterLossMatch[2];
            summary.push(`After-loss prediction ${afterLossMatch[2]}`);
        }
    } else if (/\b(?:rise|call)\b/.test(text)) {
        settings.tradeType = 'CALL';
        settings.strategyMode = 'STANDARD';
        summary.push('Trade type Rise');
    } else if (/\b(?:fall|put)\b/.test(text)) {
        settings.tradeType = 'PUT';
        settings.strategyMode = 'STANDARD';
        summary.push('Trade type Fall');
    } else if (/\b(?:only\s*ups?|run\s*high|higher)\b/.test(text)) {
        settings.tradeType = 'RUNHIGH';
        settings.strategyMode = 'STANDARD';
        summary.push('Trade type Only Ups');
    } else if (/\b(?:only\s*downs?|run\s*low|lower)\b/.test(text)) {
        settings.tradeType = 'RUNLOW';
        settings.strategyMode = 'STANDARD';
        summary.push('Trade type Only Downs');
    } else if (/\b(?:even)\b/.test(text)) {
        settings.tradeType = 'DIGITEVEN';
        settings.strategyMode = 'STANDARD';
        summary.push('Trade type Digit Even');
    } else if (/\b(?:odd)\b/.test(text)) {
        settings.tradeType = 'DIGITODD';
        settings.strategyMode = 'STANDARD';
        summary.push('Trade type Digit Odd');
    }

    const analysisTicks = getAiNumber(
        text,
        [/\b(?:using|use|duration|for)\s*(\d+)\s*ticks?\b/, /\b(\d+)\s*ticks?\b/],
        1,
        10
    );
    if (analysisTicks) {
        settings.analysisTicks = analysisTicks;
        summary.push(`${analysisTicks} analysis tick${analysisTicks === '1' ? '' : 's'}`);
    }

    const streak = getAiNumber(
        text,
        [/\bstreak\s*(?:of|=|is)?\s*(\d+)\b/, /\b(\d+)\s*(?:match|matches|streak)\b/],
        1,
        10
    );
    if (streak) {
        settings.streak = streak;
        summary.push(`Streak ${streak}`);
    }

    const stake = getAiMoney(text, [
        /\bstake\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)\b/,
        /\bamount\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)\b/,
    ]);
    if (stake) {
        settings.stake = stake;
        summary.push(`Stake ${stake}`);
    }

    const martingale = getAiMoney(text, [/\bmartingale\s*(?:x|of|=|is)?\s*(\d+(?:\.\d+)?)\b/]);
    if (martingale) {
        settings.martingale = martingale;
        summary.push(`Martingale ${martingale}`);
    }

    const takeProfit = getAiMoney(text, [
        /\btake\s*profit\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)\b/,
        /\btp\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)\b/,
    ]);
    if (takeProfit) {
        settings.takeProfit = takeProfit;
        summary.push(`Take profit ${takeProfit}`);
    }

    const stopLoss = getAiMoney(text, [
        /\bstop\s*loss\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)\b/,
        /\bsl\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)\b/,
    ]);
    if (stopLoss) {
        settings.stopLoss = stopLoss;
        summary.push(`Stop loss ${stopLoss}`);
    }

    const marketSymbols = getAiMarketSymbols(text);
    if (marketSymbols.length > 0) {
        settings.selectedMarketSymbols = marketSymbols;
        summary.push(`Markets: ${marketSymbols.join(', ')}`);
    }

    if (!settings.tradeType && !settings.selectedMarketSymbols?.length) {
        warnings.push('I could not identify a contract type or market from that text.');
    }

    return { settings, summary, warnings, source: 'local' };
};

export const getPredictionForLastOutcome = ({
    trade_type,
    last_result,
    consecutive_losses = 0,
    prediction_before_loss,
    prediction_after_loss,
    fallback_barrier,
}: {
    trade_type: TradeType;
    last_result: 'win' | 'loss' | null;
    consecutive_losses?: number;
    prediction_before_loss: number;
    prediction_after_loss: number;
    fallback_barrier: number;
}) => {
    if (!usesLossPrediction(trade_type)) return fallback_barrier;

    return consecutive_losses > 0 || last_result === 'loss' ? prediction_after_loss : prediction_before_loss;
};

export const getNextMartingaleState = ({
    profit,
    current_stake,
    base_stake,
    multiplier,
    martingale_mode,
    consecutive_losses,
    consecutive_loss_trigger,
    recover_until_total_profit = false,
    total_profit_after_trade = 0,
}: {
    profit: number;
    current_stake: number;
    base_stake: number;
    multiplier: number;
    martingale_mode: MartingaleModeType;
    consecutive_losses: number;
    consecutive_loss_trigger: number;
    recover_until_total_profit?: boolean;
    total_profit_after_trade?: number;
}) => {
    if (!(profit < 0)) {
        if (recover_until_total_profit && consecutive_losses > 0 && total_profit_after_trade <= 0) {
            return {
                consecutiveLosses: Math.max(1, consecutive_losses),
                lastResult: 'loss' as const,
                nextStake: current_stake > 0 ? current_stake : base_stake,
            };
        }

        return {
            consecutiveLosses: 0,
            lastResult: 'win' as const,
            nextStake: base_stake,
        };
    }

    const nextConsecutiveLosses = consecutive_losses + 1;
    const normalizedMode = normalizeMartingaleMode(martingale_mode);
    const normalizedTrigger = clampConsecutiveLossThreshold(consecutive_loss_trigger);

    if (normalizedMode === 'no_martingale') {
        return {
            consecutiveLosses: nextConsecutiveLosses,
            lastResult: 'loss' as const,
            nextStake: base_stake,
        };
    }

    const shouldApplyMartingale =
        normalizedMode === 'after_one_loss' ||
        (normalizedMode === 'after_two_losses' && nextConsecutiveLosses >= 2) ||
        (normalizedMode === 'custom_consecutive_loss_trigger' && nextConsecutiveLosses >= normalizedTrigger);

    return {
        consecutiveLosses: nextConsecutiveLosses,
        lastResult: 'loss' as const,
        nextStake: shouldApplyMartingale ? parseFloat((current_stake * multiplier).toFixed(2)) : base_stake,
    };
};

export const getEffectiveSignalStreak = ({
    trade_type,
    configured_streak,
}: {
    trade_type: TradeType;
    configured_streak: number;
}) => {
    const normalizedStreak = Math.min(10, Math.max(1, Math.trunc(configured_streak) || 4));
    return usesLossPrediction(trade_type) ? Math.max(3, normalizedStreak) : normalizedStreak;
};

export const isDigitSignalMatch = ({
    trade_type,
    digit,
    barrier,
    inverse,
}: {
    trade_type: TradeType;
    digit: number;
    barrier: number;
    inverse: boolean;
}) => {
    if (trade_type === 'DIGITOVER') return inverse ? digit > barrier : digit <= barrier;
    if (trade_type === 'DIGITUNDER') return inverse ? digit < barrier : digit >= barrier;
    if (trade_type === 'DIGITEVEN') return inverse ? digit % 2 === 0 : digit % 2 !== 0;
    if (trade_type === 'DIGITODD') return inverse ? digit % 2 !== 0 : digit % 2 === 0;
    if (trade_type === 'DIGITMATCH') return inverse ? digit === barrier : digit !== barrier;
    if (trade_type === 'DIGITDIFF') return inverse ? digit !== barrier : digit === barrier;
    return false;
};

export const hasRequiredDigitStreak = ({
    trade_type,
    digits,
    barrier,
    inverse,
    streak,
}: {
    trade_type: TradeType;
    digits: number[];
    barrier: number;
    inverse: boolean;
    streak: number;
}) => {
    if (digits.length < streak) return false;

    return digits.slice(-streak).every(digit => isDigitSignalMatch({ trade_type, digit, barrier, inverse }));
};

const isDirectionMatch = (trade_type: TradeType, direction: Direction) => {
    if (trade_type === 'CALL') return direction === -1;
    if (trade_type === 'PUT') return direction === 1;
    if (trade_type === 'RUNHIGH') return direction === -1;
    if (trade_type === 'RUNLOW') return direction === 1;
    return false;
};

const isCandleMatch = (trade_type: TradeType, candle_direction: Direction) => {
    if (trade_type === 'CALL') return candle_direction === 1;
    if (trade_type === 'PUT') return candle_direction === -1;
    if (trade_type === 'RUNHIGH') return candle_direction === 1;
    if (trade_type === 'RUNLOW') return candle_direction === -1;
    return true;
};

const getCandleDirectionLabel = (direction: Direction) => {
    if (direction === 1) return 'Bullish';
    if (direction === -1) return 'Bearish';
    return 'Waiting';
};

const getDirectionCondition = (trade_type: TradeType, target_len: number) => {
    if (trade_type === 'CALL') return `5m candle bullish + consecutive falling ticks ≥ ${target_len}`;
    if (trade_type === 'PUT') return `5m candle bearish + consecutive rising ticks ≥ ${target_len}`;
    if (trade_type === 'RUNHIGH') return `5m candle bullish + consecutive falling ticks ≥ ${target_len}`;
    return `5m candle bearish + consecutive rising ticks ≥ ${target_len}`;
};

const getDirectionStreakLabel = (trade_type: TradeType) => {
    if (trade_type === 'CALL') return 'falling ticks + bullish 5m candle';
    if (trade_type === 'PUT') return 'rising ticks + bearish 5m candle';
    if (trade_type === 'RUNHIGH') return 'falling ticks + bullish 5m candle';
    return 'rising ticks + bearish 5m candle';
};

export const computePercentage = (baseAmount: number, targetAmount: number): number => {
    if (baseAmount === 0 || isNaN(baseAmount) || isNaN(targetAmount)) return 0;
    return Number(((targetAmount / baseAmount) * 100).toFixed(2));
};

const calculateDigitPercentages = (digitHistory: number[]): Record<number, number> => {
    if (digitHistory.length === 0) return {};
    const counts = Array(10).fill(0);
    digitHistory.forEach(d => {
        if (d >= 0 && d <= 9) counts[d]++;
    });
    return Object.fromEntries(counts.map((count, digit) => [digit, computePercentage(digitHistory.length, count)]));
};

const calculateConfidence = (percentages: Record<number, number>): number => {
    const expectedPct = 10;
    const totalDeviation = Object.values(percentages).reduce((sum, pct) => sum + Math.abs(pct - expectedPct), 0);
    const avgDeviation = totalDeviation / 10;
    return Math.max(0, 100 - avgDeviation * 2);
};

type PercentageSnapshot = {
    primaryLabel: string;
    primaryPercentage: number;
    secondaryLabel?: string;
    secondaryPercentage?: number;
    confidence: number;
    sampleSize: number;
};

const sumDigitPercentages = (percentages: Record<number, number>, predicate: (digit: number) => boolean) =>
    Object.entries(percentages).reduce(
        (sum, [digit, percentage]) => (predicate(Number(digit)) ? sum + percentage : sum),
        0
    );

const calculateDirectionPercentages = (directionHistory: Direction[]) => {
    const directionalTicks = directionHistory.filter(direction => direction !== 0);
    if (directionalTicks.length === 0) {
        return { risePercentage: 0, fallPercentage: 0, confidence: 0, sampleSize: 0 };
    }

    const risingTicks = directionalTicks.filter(direction => direction === 1).length;
    const risePercentage = computePercentage(directionalTicks.length, risingTicks);
    const fallPercentage = Number((100 - risePercentage).toFixed(2));
    const confidence = Math.min(100, Math.abs(risePercentage - fallPercentage) * 2);

    return { risePercentage, fallPercentage, confidence, sampleSize: directionalTicks.length };
};

export const getPercentageSnapshot = (
    trade_type: TradeType,
    state: Pick<MarketState, 'digitHistory' | 'digitPercentages' | 'directionSampleHistory' | 'confidenceScore'>,
    barrier: number
): PercentageSnapshot => {
    if (IS_DIRECTION_TYPE[trade_type]) {
        const { risePercentage, fallPercentage, confidence, sampleSize } = calculateDirectionPercentages(
            state.directionSampleHistory
        );
        const primaryIsRise = trade_type === 'CALL' || trade_type === 'RUNHIGH';

        return {
            primaryLabel: primaryIsRise ? 'Rise' : 'Fall',
            primaryPercentage: primaryIsRise ? risePercentage : fallPercentage,
            secondaryLabel: primaryIsRise ? 'Fall' : 'Rise',
            secondaryPercentage: primaryIsRise ? fallPercentage : risePercentage,
            confidence,
            sampleSize,
        };
    }

    const percentages = state.digitPercentages;
    const safeBarrier = Math.min(9, Math.max(0, barrier));
    const sampleSize = state.digitHistory.length;

    if (trade_type === 'DIGITOVER') {
        const primaryPercentage = sumDigitPercentages(percentages, digit => digit > safeBarrier);
        return {
            primaryLabel: `Over ${safeBarrier}`,
            primaryPercentage,
            secondaryLabel: `${safeBarrier} or below`,
            secondaryPercentage: Number((100 - primaryPercentage).toFixed(2)),
            confidence: state.confidenceScore,
            sampleSize,
        };
    }

    if (trade_type === 'DIGITUNDER') {
        const primaryPercentage = sumDigitPercentages(percentages, digit => digit < safeBarrier);
        return {
            primaryLabel: `Under ${safeBarrier}`,
            primaryPercentage,
            secondaryLabel: `${safeBarrier} or above`,
            secondaryPercentage: Number((100 - primaryPercentage).toFixed(2)),
            confidence: state.confidenceScore,
            sampleSize,
        };
    }

    if (trade_type === 'DIGITEVEN' || trade_type === 'DIGITODD') {
        const evenPercentage = sumDigitPercentages(percentages, digit => digit % 2 === 0);
        const oddPercentage = Number((100 - evenPercentage).toFixed(2));
        const primaryIsEven = trade_type === 'DIGITEVEN';

        return {
            primaryLabel: primaryIsEven ? 'Even' : 'Odd',
            primaryPercentage: primaryIsEven ? evenPercentage : oddPercentage,
            secondaryLabel: primaryIsEven ? 'Odd' : 'Even',
            secondaryPercentage: primaryIsEven ? oddPercentage : evenPercentage,
            confidence: state.confidenceScore,
            sampleSize,
        };
    }

    const matchPercentage = percentages[safeBarrier] ?? 0;
    const differsPercentage = Number((100 - matchPercentage).toFixed(2));
    const primaryIsMatch = trade_type === 'DIGITMATCH';

    return {
        primaryLabel: primaryIsMatch ? `Match ${safeBarrier}` : `Differ ${safeBarrier}`,
        primaryPercentage: primaryIsMatch ? matchPercentage : differsPercentage,
        secondaryLabel: primaryIsMatch ? `Differ ${safeBarrier}` : `Match ${safeBarrier}`,
        secondaryPercentage: primaryIsMatch ? differsPercentage : matchPercentage,
        confidence: state.confidenceScore,
        sampleSize,
    };
};

const getPercentageThreshold = (trade_type: TradeType, barrier: number) => {
    if (trade_type === 'DIGITOVER') return PERCENTAGE_THRESHOLDS.over[barrier] ?? PERCENTAGE_THRESHOLDS.over[4];
    if (trade_type === 'DIGITUNDER') return PERCENTAGE_THRESHOLDS.under[barrier] ?? PERCENTAGE_THRESHOLDS.under[5];
    if (trade_type === 'DIGITEVEN') return PERCENTAGE_THRESHOLDS.even;
    if (trade_type === 'DIGITODD') return PERCENTAGE_THRESHOLDS.odd;
    if (trade_type === 'DIGITMATCH') return PERCENTAGE_THRESHOLDS.match;
    if (trade_type === 'DIGITDIFF') return PERCENTAGE_THRESHOLDS.differs;
    if (trade_type === 'CALL') return PERCENTAGE_THRESHOLDS.rise;
    if (trade_type === 'PUT') return PERCENTAGE_THRESHOLDS.fall;
    if (trade_type === 'RUNHIGH') return PERCENTAGE_THRESHOLDS.higher;
    return PERCENTAGE_THRESHOLDS.lower;
};

export const isPercentageSignalReady = (trade_type: TradeType, state: MarketState, barrier: number): boolean => {
    const snapshot = getPercentageSnapshot(trade_type, state, barrier);
    const threshold = getPercentageThreshold(trade_type, barrier);

    return (
        snapshot.sampleSize >= PERCENTAGE_MIN_SAMPLE_SIZE &&
        snapshot.primaryPercentage >= threshold.minPercentage &&
        snapshot.confidence >= threshold.confidence
    );
};

interface MarketState {
    alertActive: boolean;
    alertMessage: string;
    consecutive: number;
    trading: boolean;
    isRecovering: boolean;
    lastDigits: number[];
    directionHistory: Direction[];
    prevQuote: number | null;
    candleDirection: Direction;
    candleOpen: number | null;
    candleClose: number | null;
    directionSampleHistory: Direction[];
    tradeCount: number;
    lastResult: 'win' | 'loss' | null;
    lastQuote: number | null;
    tradeStartTime: number | null;
    verificationId: string | null;
    digitHistory: number[];
    digitPercentages: Record<number, number>;
    confidenceScore: number;
    momentumCount: number;
    percentageQuoteHistory: number[];
    percentageEpochHistory: number[];
    percentageBackfilled: boolean;
    percentageBackfillInFlight: boolean;
    lossCooldownLeft: number;
    qualifyingWinningDigits: number[];
    specialEntryReady: boolean;
    trailingTriggerCount: number;
}

interface MarketDisplay extends MarketState {
    symbol: string;
    label: string;
    currentStake: number;
    cooldownLeft: number;
}

const createMarketState = (prev?: Partial<MarketState>): MarketState => ({
    alertActive: prev?.alertActive ?? false,
    alertMessage: prev?.alertMessage ?? '',
    consecutive: 0,
    trading: false,
    isRecovering: false,
    lastDigits: prev?.lastDigits ?? [],
    directionHistory: prev?.directionHistory ?? [],
    prevQuote: prev?.prevQuote ?? null,
    candleDirection: prev?.candleDirection ?? 0,
    candleOpen: prev?.candleOpen ?? null,
    candleClose: prev?.candleClose ?? null,
    directionSampleHistory: prev?.directionSampleHistory ?? [],
    tradeCount: 0,
    lastResult: null,
    lastQuote: prev?.lastQuote ?? null,
    tradeStartTime: null,
    verificationId: null,
    digitHistory: [],
    digitPercentages: {},
    confidenceScore: 0,
    momentumCount: 0,
    percentageQuoteHistory: prev?.percentageQuoteHistory ?? [],
    percentageEpochHistory: prev?.percentageEpochHistory ?? [],
    percentageBackfilled: prev?.percentageBackfilled ?? false,
    percentageBackfillInFlight: prev?.percentageBackfillInFlight ?? false,
    lossCooldownLeft: prev?.lossCooldownLeft ?? 0,
    qualifyingWinningDigits: prev?.qualifyingWinningDigits ?? [],
    specialEntryReady: prev?.specialEntryReady ?? false,
    trailingTriggerCount: prev?.trailingTriggerCount ?? 0,
});

const getDirectionSamplesFromQuotes = (quotes: number[]): Direction[] =>
    quotes.slice(1).map((quote, index) => {
        const previousQuote = quotes[index];
        if (quote > previousQuote) return 1;
        if (quote < previousQuote) return -1;
        return 0;
    });

const rebuildPercentageAnalytics = (symbol: string, state: MarketState, trade_type: TradeType) => {
    const pip = getMarketPipSize(symbol, AUTO_MARKET_LOOKUP.get(symbol)?.pip ?? 2);
    const quoteHistory = state.percentageQuoteHistory.slice(-PERCENTAGE_ANALYSIS_HISTORY_SIZE);

    state.percentageQuoteHistory = quoteHistory;
    state.percentageEpochHistory = quoteHistory.length ? state.percentageEpochHistory.slice(-quoteHistory.length) : [];
    state.digitHistory = quoteHistory.map(quote => getLastDigitFromQuote(quote, symbol, pip));
    state.digitPercentages = calculateDigitPercentages(state.digitHistory);
    state.directionSampleHistory = getDirectionSamplesFromQuotes(quoteHistory);

    if (IS_DIRECTION_TYPE[trade_type]) {
        const directionPercentages = calculateDirectionPercentages(state.directionSampleHistory);
        state.confidenceScore = directionPercentages.confidence;
        state.momentumCount = Math.round(
            trade_type === 'CALL' || trade_type === 'RUNHIGH'
                ? directionPercentages.risePercentage
                : directionPercentages.fallPercentage
        );
    } else {
        state.confidenceScore = calculateConfidence(state.digitPercentages);
        state.momentumCount = 0;
    }
};

const appendPercentageQuote = (
    symbol: string,
    state: MarketState,
    quote: number,
    epoch: number | null,
    trade_type: TradeType
) => {
    if (!Number.isFinite(quote)) return;

    const lastEpoch = state.percentageEpochHistory[state.percentageEpochHistory.length - 1];
    if (epoch !== null && lastEpoch === epoch) {
        state.percentageQuoteHistory[state.percentageQuoteHistory.length - 1] = quote;
    } else {
        state.percentageQuoteHistory.push(quote);
        state.percentageEpochHistory.push(epoch ?? Date.now());
    }

    while (state.percentageQuoteHistory.length > PERCENTAGE_ANALYSIS_HISTORY_SIZE) {
        state.percentageQuoteHistory.shift();
        state.percentageEpochHistory.shift();
    }

    rebuildPercentageAnalytics(symbol, state, trade_type);
};

const AutoTrades = observer(() => {
    const { dashboard, client, run_panel, summary_card, transactions } = useStore();
    const { currency } = client;
    const { active_tab } = dashboard;

    const VALID_TRADE_TYPES: TradeType[] = [
        'DIGITOVER',
        'DIGITUNDER',
        'DIGITEVEN',
        'DIGITODD',
        'DIGITMATCH',
        'DIGITDIFF',
        'CALL',
        'PUT',
        'RUNHIGH',
        'RUNLOW',
    ];
    const loadSaved = (key: string, fallback: string) => {
        try {
            return localStorage.getItem(`auto_trades_${key}`) || fallback;
        } catch {
            return fallback;
        }
    };
    const loadSavedNum = (key: string, fallback: string, min: number, max: number) => {
        const v = loadSaved(key, fallback);
        const n = Number(v);
        return !isNaN(n) && n >= min && n <= max ? v : fallback;
    };
    const loadSavedMarkets = () => {
        try {
            const raw = localStorage.getItem('auto_trades_markets');
            const parsed = raw ? JSON.parse(raw) : null;
            if (Array.isArray(parsed)) {
                const symbols = Array.from(
                    new Set(
                        parsed.filter(
                            (symbol): symbol is string => typeof symbol === 'string' && AUTO_MARKET_LOOKUP.has(symbol)
                        )
                    )
                );
                return symbols;
            }
        } catch {
            // Ignore invalid saved market settings.
        }
        return AUTO_MARKET_SYMBOLS;
    };

    const [stake, setStake] = useState(() => loadSavedNum('stake', '1', 0.01, 100000));
    const [martingale, setMartingale] = useState(() => loadSavedNum('martingale', '2', 1.01, 100));
    const [takeProfit, setTakeProfit] = useState(() => loadSavedNum('takeProfit', '100', 1, 1000000));
    const [stopLoss, setStopLoss] = useState(() => loadSavedNum('stopLoss', '100', 1, 1000000));
    const [tradeType, setTradeType] = useState<TradeType>(() => {
        const v = loadSaved('tradeType', 'DIGITOVER');
        return VALID_TRADE_TYPES.includes(v as TradeType) ? (v as TradeType) : 'DIGITOVER';
    });
    const [strategyTemplate, setStrategyTemplate] = useState<StrategyTemplate>(() => {
        const saved = loadSaved('strategyTemplate', 'STANDARD');
        return STRATEGY_TEMPLATE_IDS.includes(saved as StrategyTemplate) ? (saved as StrategyTemplate) : 'STANDARD';
    });
    const [barrier, setBarrier] = useState(() => loadSavedNum('barrier', '4', 0, 9));
    const [predictionBeforeLoss, setPredictionBeforeLoss] = useState(() =>
        loadSavedNum('predictionBeforeLoss', '4', 0, 9)
    );
    const [predictionAfterLoss, setPredictionAfterLoss] = useState(() =>
        loadSavedNum('predictionAfterLoss', '5', 0, 9)
    );
    const [streak, setStreak] = useState(() => loadSavedNum('streak', '4', 1, 10));
    const [analysisTicks, setAnalysisTicks] = useState(() => loadSavedNum('analysisTicks', '1', 1, 10));
    const [selectedMarketSymbols, setSelectedMarketSymbols] = useState<string[]>(loadSavedMarkets);
    const selectedMarkets = useMemo(
        () => AUTO_MARKETS.filter(market => selectedMarketSymbols.includes(market.symbol)),
        [selectedMarketSymbols]
    );
    const availableMarkets = useMemo(
        () => AUTO_MARKETS.filter(market => !selectedMarketSymbols.includes(market.symbol)),
        [selectedMarketSymbols]
    );

    const [totalPnl, setTotalPnl] = useState(0);
    const [totalTrades, setTotalTrades] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [inverseMode, setInverseMode] = useState(() => {
        try {
            return localStorage.getItem('auto_trades_inverseMode') === 'true';
        } catch {
            return false;
        }
    });
    const inverseModeRef = useRef(false);
    const [strategyMode, setStrategyMode] = useState<StrategyMode>(() => {
        try {
            return (localStorage.getItem('auto_trades_strategyMode') as StrategyMode) || 'STANDARD';
        } catch {
            return 'STANDARD';
        }
    });
    const [martingaleMode, setMartingaleMode] = useState<MartingaleModeType>(() => {
        try {
            return normalizeMartingaleMode(localStorage.getItem('auto_trades_martingaleMode'));
        } catch {
            return 'after_one_loss';
        }
    });
    const [consecutiveLossCount, setConsecutiveLossCount] = useState(getInitialConsecutiveLossThreshold);
    const [consecutiveLossCountInput, setConsecutiveLossCountInput] = useState(() =>
        String(getInitialConsecutiveLossThreshold())
    );
    const strategyModeRef = useRef(strategyMode);
    const martingaleModeRef = useRef(martingaleMode);
    const consecutiveLossCountRef = useRef(consecutiveLossCount);
    const modeTransitionLockRef = useRef(false);
    const isRecoveringDataRef = useRef(false);
    const [showAiStrategy, setShowAiStrategy] = useState(false);
    const [aiStrategyText, setAiStrategyText] = useState('');
    const [aiStrategyResult, setAiStrategyResult] = useState<AiAutoTradeParseResult | null>(null);
    const [aiStrategyLoading, setAiStrategyLoading] = useState(false);
    const [selectedAiPresetId, setSelectedAiPresetId] = useState('');
    const aiPresetFamilies = useMemo(
        () =>
            AUTO_TRADE_STRATEGY_FAMILIES.map(family => ({
                ...family,
                presets: family.presetIds
                    .map(id => AUTO_TRADE_STRATEGY_PRESET_LOOKUP.get(id))
                    .filter((preset): preset is AutoTradeStrategyPreset => Boolean(preset)),
            })),
        []
    );
    const [aiFabPosition, setAiFabPosition] = useState<AiFabPosition | null>(() => {
        try {
            const saved = localStorage.getItem('auto_trades_aiFabPosition');
            if (!saved) return null;
            const parsed = JSON.parse(saved);
            if (typeof parsed?.left !== 'number' || typeof parsed?.top !== 'number') return null;
            return parsed;
        } catch {
            return null;
        }
    });
    const [isAiFabDragging, setIsAiFabDragging] = useState(false);
    const [currentStakeDisplay, setCurrentStakeDisplay] = useState(1);
    const [cooldownDisplay, setCooldownDisplay] = useState(0);
    const [dataStreamLoading, setDataStreamLoading] = useState(false);
    const [dataStreamMessage, setDataStreamMessage] = useState('Loading selected market data...');
    const [floatingStrategyAlert, setFloatingStrategyAlert] = useState<FloatingStrategyAlert | null>(null);

    const [marketDisplays, setMarketDisplays] = useState<MarketDisplay[]>(
        selectedMarkets.map(m => ({
            ...m,
            consecutive: 0,
            lastDigits: [],
            directionHistory: [],
            isRecovering: false,
            prevQuote: null,
            candleDirection: 0,
            candleOpen: null,
            candleClose: null,
            directionSampleHistory: [],
            trading: false,
            lastResult: null,
            tradeCount: 0,
            lastQuote: null,
            tradeStartTime: null,
            verificationId: null,
            digitHistory: [],
            digitPercentages: {},
            confidenceScore: 0,
            momentumCount: 0,
            percentageQuoteHistory: [],
            percentageEpochHistory: [],
            percentageBackfilled: false,
            percentageBackfillInFlight: false,
            currentStake: 1,
            cooldownLeft: 0,
        }))
    );

    const subscriptionsRef = useRef<Record<string, any>>({});
    const candleSubscriptionsRef = useRef<Record<string, any>>({});
    const selectedMarketsRef = useRef<AutoMarket[]>(selectedMarkets);
    const selectedMarketSymbolsRef = useRef<Set<string>>(new Set(selectedMarketSymbols));
    const monitoredMarketSymbolsRef = useRef<Set<string>>(new Set(selectedMarketSymbols));
    const marketStatesRef = useRef<Record<string, MarketState>>(
        Object.fromEntries(AUTO_MARKETS.map(m => [m.symbol, createMarketState()]))
    );
    const totalPnlRef = useRef(0);
    const totalTradesRef = useRef(0);
    const runningRef = useRef(false);
    const configRef = useRef({
        stake: 1,
        martingale: 2,
        takeProfit: 100,
        stopLoss: 100,
        martingaleMode: 'after_one_loss' as MartingaleModeType,
        consecutiveLossThreshold: 2,
    });
    const tradeTypeRef = useRef<TradeType>('DIGITOVER');
    const strategyTemplateRef = useRef<StrategyTemplate>('STANDARD');
    const barrierRef = useRef(4);
    const predictionBeforeLossRef = useRef(4);
    const predictionAfterLossRef = useRef(5);
    const streakRef = useRef(4);
    const analysisTicksRef = useRef(1);
    const globalTradingRef = useRef(false);
    const nextStakeRef = useRef(1);
    const consecutiveLossRef = useRef(0);
    const previousContractResultRef = useRef<'win' | 'loss' | null>(null);
    const lastTickAtRef = useRef(0);
    const restartInFlightRef = useRef(false);
    const lastRestartAttemptAtRef = useRef(0);
    const subscriptionVersionRef = useRef(0);
    const handleTickRef = useRef<(symbol: string, tick: any) => void>(() => {});
    const handleCandleRef = useRef<(symbol: string, candle: any) => void>(() => {});
    const lastUiRefreshAtRef = useRef(0);
    const uiRefreshTimerRef = useRef<number | null>(null);
    const restartTimerRef = useRef<number | null>(null);
    const modeTransitionTimerRef = useRef<number | null>(null);
    const contractStreamAbortControllersRef = useRef<Set<AbortController>>(new Set());
    const aiFabDragRef = useRef({
        active: false,
        moved: false,
        pointerId: null as number | null,
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0,
    });
    const suppressAiFabClickRef = useRef(false);
    const show_auto = active_tab === DBOT_TABS.AUTO_TRADES;
    const show_auto_ref = useRef(show_auto);
    show_auto_ref.current = show_auto;
    const unmountedRef = useRef(false);
    const stopTradingRef = useRef<() => void>(() => {});
    const floatingStrategyAlertRef = useRef<FloatingStrategyAlert | null>(null);

    useEffect(() => {
        setAiFabPosition(current => {
            const fallback = getDefaultAiFabPosition();
            return clampAiFabPosition(current?.left ?? fallback.left, current?.top ?? fallback.top);
        });

        const handleResize = () => {
            setAiFabPosition(current => {
                const next = current ? clampAiFabPosition(current.left, current.top) : getDefaultAiFabPosition();
                try {
                    localStorage.setItem('auto_trades_aiFabPosition', JSON.stringify(next));
                } catch {
                    // Ignore localStorage write failures.
                }
                return next;
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!aiFabPosition) return;
        try {
            localStorage.setItem('auto_trades_aiFabPosition', JSON.stringify(aiFabPosition));
        } catch {
            // Ignore localStorage write failures.
        }
    }, [aiFabPosition]);

    const handleAiFabPointerDown = useCallback(
        (event: any) => {
            if (isRunning) return;

            const currentPosition = aiFabPosition ?? getDefaultAiFabPosition();
            aiFabDragRef.current = {
                active: true,
                moved: false,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startLeft: currentPosition.left,
                startTop: currentPosition.top,
            };
            setAiFabPosition(currentPosition);
            setIsAiFabDragging(true);
            event.currentTarget?.setPointerCapture?.(event.pointerId);
        },
        [aiFabPosition, isRunning]
    );

    const handleAiFabPointerMove = useCallback((event: any) => {
        const drag = aiFabDragRef.current;
        if (!drag.active || drag.pointerId !== event.pointerId) return;

        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            drag.moved = true;
        }
        setAiFabPosition(clampAiFabPosition(drag.startLeft + dx, drag.startTop + dy));
    }, []);

    const finishAiFabDrag = useCallback((event: any) => {
        const drag = aiFabDragRef.current;
        if (!drag.active || drag.pointerId !== event.pointerId) return;

        aiFabDragRef.current = { ...drag, active: false, pointerId: null };
        setIsAiFabDragging(false);
        event.currentTarget?.releasePointerCapture?.(event.pointerId);

        if (drag.moved) {
            suppressAiFabClickRef.current = true;
            window.setTimeout(() => {
                suppressAiFabClickRef.current = false;
            }, 0);
        }
    }, []);

    const handleAiFabClick = useCallback(() => {
        if (suppressAiFabClickRef.current || isRunning) return;
        setShowAiStrategy(true);
    }, [isRunning]);

    useEffect(() => {
        configRef.current = {
            stake: Number(stake) || 1,
            martingale: Math.max(1.01, Number(martingale) || 2),
            takeProfit: Number(takeProfit) || 100,
            stopLoss: Number(stopLoss) || 100,
            martingaleMode,
            consecutiveLossThreshold: clampConsecutiveLossThreshold(consecutiveLossCount),
        };
        try {
            localStorage.setItem('auto_trades_stake', stake);
            localStorage.setItem('auto_trades_martingale', martingale);
            localStorage.setItem('auto_trades_takeProfit', takeProfit);
            localStorage.setItem('auto_trades_stopLoss', stopLoss);
        } catch {
            // Ignore localStorage write failures.
        }
    }, [stake, martingale, takeProfit, stopLoss, martingaleMode, consecutiveLossCount]);

    useEffect(() => {
        tradeTypeRef.current = tradeType;
        try {
            localStorage.setItem('auto_trades_tradeType', tradeType);
        } catch {
            // Ignore localStorage write failures.
        }
    }, [tradeType]);
    useEffect(() => {
        strategyTemplateRef.current = strategyTemplate;
        try {
            localStorage.setItem('auto_trades_strategyTemplate', strategyTemplate);
        } catch {
            // Ignore localStorage write failures.
        }

        const templateConfig = getTemplateTradeConfig(strategyTemplate);
        if (!templateConfig) return;

        setTradeType(templateConfig.tradeType);
        setBarrier(templateConfig.barrier);
        setAnalysisTicks('1');
        setInverseMode(false);
    }, [strategyTemplate]);
    useEffect(() => {
        barrierRef.current = getDigitNumber(barrier, 4);
        try {
            localStorage.setItem('auto_trades_barrier', barrier);
        } catch {
            // Ignore localStorage write failures.
        }
    }, [barrier]);
    useEffect(() => {
        predictionBeforeLossRef.current = getDigitNumber(predictionBeforeLoss, 0);
        try {
            localStorage.setItem('auto_trades_predictionBeforeLoss', predictionBeforeLoss);
        } catch {
            // Ignore localStorage write failures.
        }
    }, [predictionBeforeLoss]);
    useEffect(() => {
        predictionAfterLossRef.current = getDigitNumber(predictionAfterLoss, 0);
        try {
            localStorage.setItem('auto_trades_predictionAfterLoss', predictionAfterLoss);
        } catch {
            // Ignore localStorage write failures.
        }
    }, [predictionAfterLoss]);
    useEffect(() => {
        streakRef.current = Math.min(10, Math.max(1, Number(streak) || 4));
        try {
            localStorage.setItem('auto_trades_streak', streak);
        } catch {
            // Ignore localStorage write failures.
        }
    }, [streak]);
    useEffect(() => {
        analysisTicksRef.current = Math.min(10, Math.max(1, Number(analysisTicks) || 1));
        try {
            localStorage.setItem('auto_trades_analysisTicks', analysisTicks);
        } catch {
            // Ignore localStorage write failures.
        }
    }, [analysisTicks]);

    useEffect(() => {
        martingaleModeRef.current = martingaleMode;
        try {
            localStorage.setItem('auto_trades_martingaleMode', martingaleMode);
        } catch {
            // Ignore localStorage write failures.
        }
    }, [martingaleMode]);

    useEffect(() => {
        consecutiveLossCountRef.current = clampConsecutiveLossThreshold(consecutiveLossCount);
        try {
            localStorage.setItem('auto_trades_consecutiveLossCount', String(consecutiveLossCountRef.current));
        } catch {
            // Ignore localStorage write failures.
        }
    }, [consecutiveLossCount]);

    useEffect(() => {
        setConsecutiveLossCountInput(String(clampConsecutiveLossThreshold(consecutiveLossCount)));
    }, [consecutiveLossCount]);

    const handleConsecutiveLossCountInputChange = useCallback((value: string) => {
        const digits_only = value.replace(/[^\d]/g, '').slice(0, 2);
        setConsecutiveLossCountInput(digits_only);
    }, []);

    const commitConsecutiveLossCountInput = useCallback(() => {
        setConsecutiveLossCount(clampConsecutiveLossThreshold(consecutiveLossCountInput || 2));
    }, [consecutiveLossCountInput]);

    useEffect(() => {
        selectedMarketsRef.current = selectedMarkets;
        selectedMarketSymbolsRef.current = new Set(selectedMarketSymbols);
        selectedMarketSymbols.forEach(symbol => {
            if (!marketStatesRef.current[symbol]) marketStatesRef.current[symbol] = createMarketState();
        });
        try {
            localStorage.setItem('auto_trades_markets', JSON.stringify(selectedMarketSymbols));
        } catch {
            // Ignore localStorage write failures.
        }
    }, [selectedMarketSymbols, selectedMarkets]);

    useEffect(() => {
        monitoredMarketSymbolsRef.current = new Set(
            strategyTemplate === 'STANDARD' ? selectedMarketSymbols : AUTO_MARKET_SYMBOLS
        );
    }, [selectedMarketSymbols, strategyTemplate]);

    useEffect(() => {
        floatingStrategyAlertRef.current = floatingStrategyAlert;
    }, [floatingStrategyAlert]);

    useEffect(() => {
        inverseModeRef.current = inverseMode;
        try {
            localStorage.setItem('auto_trades_inverseMode', String(inverseMode));
        } catch {
            // Ignore localStorage write failures.
        }
    }, [inverseMode]);

    useEffect(() => {
        modeTransitionLockRef.current = true;
        strategyModeRef.current = strategyMode;
        try {
            localStorage.setItem('auto_trades_strategyMode', strategyMode);
        } catch {
            // Ignore localStorage write failures.
        }
        if (strategyMode === 'INVERSE') {
            setInverseMode(true);
        } else if (strategyMode === 'STANDARD' || strategyMode === 'PERCENTAGE') {
            setInverseMode(false);
        }
        if (strategyMode === 'PERCENTAGE') {
            Object.keys(marketStatesRef.current).forEach(symbol => {
                const state = marketStatesRef.current[symbol];
                state.digitHistory = [];
                state.digitPercentages = {};
                state.directionSampleHistory = [];
                state.confidenceScore = 0;
                state.momentumCount = 0;
                state.percentageQuoteHistory = [];
                state.percentageEpochHistory = [];
                state.percentageBackfilled = false;
                state.percentageBackfillInFlight = false;
            });
        }
        if (modeTransitionTimerRef.current !== null) {
            window.clearTimeout(modeTransitionTimerRef.current);
        }
        modeTransitionTimerRef.current = window.setTimeout(() => {
            modeTransitionTimerRef.current = null;
            modeTransitionLockRef.current = false;
        }, 100);
    }, [strategyMode]);

    const handleTradeTypeChange = useCallback((t: TradeType) => {
        setTradeType(t);
        setBarrier(DEFAULT_BARRIER[t]);
        if (usesLossPrediction(t)) {
            setPredictionBeforeLoss(DEFAULT_BARRIER[t]);
            setPredictionAfterLoss(t === 'DIGITOVER' ? '5' : '4');
        }
    }, []);

    const setDataRecoveryLoading = useCallback((message: string) => {
        if (unmountedRef.current || !show_auto_ref.current) return;
        isRecoveringDataRef.current = true;
        setDataStreamMessage(message);
        setDataStreamLoading(true);
    }, []);

    const clearDataRecoveryLoading = useCallback(() => {
        if (unmountedRef.current) return;
        isRecoveringDataRef.current = false;
        setDataStreamLoading(false);
    }, []);

    const updateSubscriptionDiagnostics = useCallback(() => {
        setDiagnosticGauge('auto_trades.subscriptions', {
            tickStreams: Object.keys(subscriptionsRef.current).length,
            candleStreams: Object.keys(candleSubscriptionsRef.current).length,
            selectedMarkets: selectedMarketsRef.current.length,
            isConnected: Object.keys(subscriptionsRef.current).length > 0,
            running: runningRef.current,
        });
    }, []);

    useEffect(() => {
        updateSubscriptionDiagnostics();
    }, [selectedMarketSymbols.length, updateSubscriptionDiagnostics]);

    const flushDisplays = useCallback(() => {
        if (unmountedRef.current || !show_auto_ref.current) return;
        lastUiRefreshAtRef.current = Date.now();
        const highestCooldown = selectedMarketsRef.current.reduce(
            (maxCooldown, market) =>
                Math.max(maxCooldown, marketStatesRef.current[market.symbol]?.lossCooldownLeft ?? 0),
            0
        );
        setMarketDisplays(
            selectedMarketsRef.current.map(m => ({
                ...m,
                ...(marketStatesRef.current[m.symbol] || {}),
                currentStake: nextStakeRef.current,
                cooldownLeft: marketStatesRef.current[m.symbol]?.lossCooldownLeft ?? 0,
            }))
        );
        setTotalPnl(totalPnlRef.current);
        setTotalTrades(totalTradesRef.current);
        setCurrentStakeDisplay(nextStakeRef.current);
        setCooldownDisplay(highestCooldown);
    }, []);

    const refreshDisplays = useCallback(() => {
        if (unmountedRef.current || !show_auto_ref.current) return;

        const elapsed = Date.now() - lastUiRefreshAtRef.current;
        if (elapsed >= UI_REFRESH_THROTTLE_MS) {
            if (uiRefreshTimerRef.current !== null) {
                window.clearTimeout(uiRefreshTimerRef.current);
                uiRefreshTimerRef.current = null;
            }
            flushDisplays();
            return;
        }

        if (uiRefreshTimerRef.current !== null) return;
        uiRefreshTimerRef.current = window.setTimeout(() => {
            uiRefreshTimerRef.current = null;
            flushDisplays();
        }, UI_REFRESH_THROTTLE_MS - elapsed);
    }, [flushDisplays]);

    const markMarketRecovering = useCallback(
        (symbol: string, is_recovering: boolean) => {
            const state = marketStatesRef.current[symbol];
            if (!state) return;
            state.isRecovering = is_recovering;
            refreshDisplays();
        },
        [refreshDisplays]
    );

    useEffect(() => {
        refreshDisplays();
    }, [refreshDisplays, selectedMarketSymbols]);

    useEffect(() => {
        if (!show_auto) return;
        if (strategyTemplate !== 'STANDARD' || selectedMarketSymbols.length > 0) {
            setDataRecoveryLoading(
                strategyTemplate === 'STANDARD' ? 'Loading selected market data...' : 'Loading strategy scanner data...'
            );
            return;
        }
        if (selectedMarketSymbols.length === 0) {
            clearDataRecoveryLoading();
            return;
        }
    }, [clearDataRecoveryLoading, selectedMarketSymbols.length, setDataRecoveryLoading, show_auto, strategyTemplate]);

    const handleAddMarket = useCallback((symbol: string) => {
        if (!AUTO_MARKET_LOOKUP.has(symbol) || runningRef.current) return;
        setSelectedMarketSymbols(current => (current.includes(symbol) ? current : [...current, symbol]));
    }, []);

    const handleRemoveMarket = useCallback((symbol: string) => {
        if (!AUTO_MARKET_LOOKUP.has(symbol) || runningRef.current) return;
        setSelectedMarketSymbols(current => current.filter(item => item !== symbol));
    }, []);

    const handleSelectAllMarkets = useCallback(() => {
        if (!runningRef.current) setSelectedMarketSymbols(AUTO_MARKET_SYMBOLS);
    }, []);

    const handleClearMarkets = useCallback(() => {
        if (!runningRef.current) setSelectedMarketSymbols([]);
    }, []);

    const handleLoadAlertMarket = useCallback((symbol: string, strategyId: DigitStrategyId) => {
        const market = AUTO_MARKET_LOOKUP.get(symbol);
        const strategy = DIGIT_STRATEGIES[strategyId];
        if (!market || !strategy) return;

        setStrategyTemplate(strategyId);
        setTradeType(strategy.contractType);
        setBarrier(strategy.winBarrier);
        setSelectedMarketSymbols([symbol]);
        setFloatingStrategyAlert(null);
        setError(null);
        try {
            localStorage.setItem('auto_trades_strategyTemplate', strategyId);
            localStorage.setItem('auto_trades_tradeType', strategy.contractType);
            localStorage.setItem('auto_trades_barrier', strategy.winBarrier);
            localStorage.setItem('auto_trades_markets', JSON.stringify([symbol]));
        } catch {
            // Ignore localStorage write failures.
        }
    }, []);

    const applyAiSettings = useCallback((result: AiAutoTradeParseResult) => {
        const { settings } = result;

        if (settings.tradeType) {
            setTradeType(settings.tradeType);
            setBarrier(settings.barrier ?? DEFAULT_BARRIER[settings.tradeType]);
        }
        if (settings.predictionBeforeLoss != null) setPredictionBeforeLoss(settings.predictionBeforeLoss);
        if (settings.predictionAfterLoss != null) setPredictionAfterLoss(settings.predictionAfterLoss);
        if (settings.analysisTicks != null) setAnalysisTicks(settings.analysisTicks);
        if (settings.selectedMarketSymbols?.length) setSelectedMarketSymbols(settings.selectedMarketSymbols);
        if (settings.stake != null) setStake(settings.stake);
        if (settings.martingale != null) setMartingale(settings.martingale);
        if (settings.takeProfit != null) setTakeProfit(settings.takeProfit);
        if (settings.stopLoss != null) setStopLoss(settings.stopLoss);
        if (settings.streak != null) setStreak(settings.streak);
        if (settings.strategyMode != null) setStrategyMode(settings.strategyMode);
        if (settings.martingaleMode != null) setMartingaleMode(normalizeMartingaleMode(settings.martingaleMode));
        if (settings.consecutiveLossCount != null) {
            const normalizedLossCount = clampConsecutiveLossThreshold(settings.consecutiveLossCount);
            setConsecutiveLossCount(normalizedLossCount);
            setConsecutiveLossCountInput(String(normalizedLossCount));
        }
    }, []);

    const handleAiPresetChange = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => {
            const presetId = event.target.value;
            setSelectedAiPresetId(presetId);

            const preset = AUTO_TRADE_STRATEGY_PRESET_LOOKUP.get(presetId);
            if (!preset) return;

            const presetResult = normalizeAiAutoTradePlan({
                settings: preset.settings,
                summary: preset.summary,
                warnings: [],
                customStrategy: {
                    intent: preset.description,
                    entryRules: [preset.description],
                    riskRules: [
                        `Stake ${preset.settings.stake}, martingale ${preset.settings.martingale}, stop loss ${preset.settings.stopLoss}`,
                    ],
                },
                confidence: preset.confidence,
                source: 'preset',
            });

            setAiStrategyText(preset.description);
            setAiStrategyResult(presetResult);
            applyAiSettings(presetResult);
        },
        [applyAiSettings]
    );

    const applyAiStrategy = useCallback(async () => {
        const localResult = parseAiAutoTradeStrategy(aiStrategyText);

        if (!aiStrategyText.trim()) {
            setAiStrategyResult(localResult);
            return;
        }

        setAiStrategyLoading(true);

        try {
            const response = await fetch(`${API_BASE}/ai/auto-trade-strategy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ strategyText: aiStrategyText }),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => null);
                throw new Error(error?.error || 'AI strategy service is unavailable.');
            }

            const aiResult = normalizeAiAutoTradePlan({ ...(await response.json()), source: 'openai' });
            setAiStrategyResult(aiResult);
            if (aiResult.warnings.length === 0 || aiResult.summary.length > 0) applyAiSettings(aiResult);
        } catch (error) {
            const fallback = normalizeAiAutoTradePlan({
                ...localResult,
                warnings: [
                    ...localResult.warnings,
                    error instanceof Error
                        ? `OpenAI unavailable, applied local understanding instead: ${error.message}`
                        : 'OpenAI unavailable, applied local understanding instead.',
                ],
                source: 'local',
            });
            setAiStrategyResult(fallback);
            if (fallback.warnings.length === 0 || fallback.summary.length > 0) applyAiSettings(fallback);
        } finally {
            setAiStrategyLoading(false);
        }
    }, [aiStrategyText, applyAiSettings]);

    const pushContract = useCallback(
        (data: any) => {
            try {
                transactions.pushTransaction({ ...data, run_id: run_panel.run_id });
                run_panel.onBotContractEvent(data);
                summary_card.onBotContractEvent(data);
            } catch {
                // Ignore observer emit failures.
            }
        },
        [run_panel, summary_card, transactions]
    );

    const getActiveDigitBarrier = useCallback(
        (ct: TradeType, lastResult: 'win' | 'loss' | null, consecutiveLosses = 0) => {
            return getPredictionForLastOutcome({
                trade_type: ct,
                last_result: lastResult,
                consecutive_losses: consecutiveLosses,
                prediction_before_loss: predictionBeforeLossRef.current,
                prediction_after_loss: predictionAfterLossRef.current,
                fallback_barrier: barrierRef.current,
            });
        },
        []
    );

    const completeRunPanelStop = useCallback(() => {
        try {
            run_panel.is_contract_buying_in_progress = false;
            run_panel.setIsRunning(false);
            run_panel.setHasOpenContract?.(false);
            run_panel.setContractStage?.(contract_stages.NOT_RUNNING);
            run_panel.setShowBotStopMessage?.(false);
        } catch {
            // Ignore optional run-panel cleanup failures.
        }

        try {
            api_base.is_stopping = false;
            api_base.setIsRunning?.(false);
        } catch {
            // Ignore optional bot-skeleton cleanup failures.
        }
    }, [run_panel]);

    const clearDeferredWork = useCallback(() => {
        if (uiRefreshTimerRef.current !== null) {
            window.clearTimeout(uiRefreshTimerRef.current);
            uiRefreshTimerRef.current = null;
        }
        if (restartTimerRef.current !== null) {
            window.clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
        if (modeTransitionTimerRef.current !== null) {
            window.clearTimeout(modeTransitionTimerRef.current);
            modeTransitionTimerRef.current = null;
        }
        modeTransitionLockRef.current = false;
        contractStreamAbortControllersRef.current.forEach(controller => controller.abort());
        contractStreamAbortControllersRef.current.clear();
        restartInFlightRef.current = false;
    }, []);

    const executeTrade = useCallback(
        async (symbol: string, stakeAmount: number, lastResult: 'win' | 'loss' | null): Promise<number> => {
            const ct = tradeTypeRef.current;
            const bar = getActiveDigitBarrier(ct, lastResult, consecutiveLossRef.current);
            const tradeStartTime = Math.floor(Date.now() / 1000);
            const verificationId = `${symbol}_${tradeStartTime}_${Math.random().toString(36).substring(2, 11)}`;
            const abortController = new AbortController();

            const params: Record<string, any> = {
                amount: stakeAmount,
                basis: 'stake',
                contract_type: ct,
                currency: currency || 'USD',
                duration: analysisTicksRef.current,
                duration_unit: 't',
                symbol,
            };
            if (BARRIER_NEEDED[ct]) params.barrier = String(bar);

            try {
                const buy = await buyContractForUi({ parameters: params, price: stakeAmount, source: 'AutoTrades' });
                const { contract_id, buy_price, transaction_id } = buy;
                pushContract({
                    buy_price,
                    contract_id,
                    transaction_ids: { buy: transaction_id },
                    date_start: tradeStartTime,
                    display_name: symbol,
                    underlying_symbol: symbol,
                    shortcode: `AUTO_${ct}_${symbol}`,
                    contract_type: ct,
                    currency: currency || 'USD',
                    verification_id: verificationId,
                });

                contractStreamAbortControllersRef.current.add(abortController);
                const contract = await streamContractUntilSettled({
                    contractId: contract_id,
                    fallback: {
                        buy_price,
                        contract_id,
                        transaction_ids: { buy: transaction_id },
                        date_start: tradeStartTime,
                        display_name: symbol,
                        underlying_symbol: symbol,
                        shortcode: `AUTO_${ct}_${symbol}`,
                        contract_type: ct,
                        currency: currency || 'USD',
                        verification_id: verificationId,
                    },
                    onUpdate: snapshot => {
                        if (!unmountedRef.current) {
                            pushContract(snapshot);
                        }
                    },
                    signal: abortController.signal,
                    source: 'AutoTrades',
                });
                return Number(contract.profit ?? 0);
            } catch (err) {
                console.error('[AutoTrades] executeTrade exception:', err);
                setError(err instanceof Error ? err.message : 'Auto Trades could not purchase this contract.');
                return 0;
            } finally {
                contractStreamAbortControllersRef.current.delete(abortController);
            }
        },
        [currency, getActiveDigitBarrier, pushContract, setError]
    );

    const handleAfterTrade = useCallback(
        (symbol: string, profit: number) => {
            if (!runningRef.current) return;
            const state = marketStatesRef.current[symbol];
            if (!state) return;

            const { martingale: mult, takeProfit: tp, stopLoss: sl, stake: baseStake } = configRef.current;

            const nextTotalPnl = parseFloat((totalPnlRef.current + profit).toFixed(2));
            totalPnlRef.current = nextTotalPnl;
            totalTradesRef.current++;

            const nextMartingaleState = getNextMartingaleState({
                profit,
                current_stake: nextStakeRef.current,
                base_stake: baseStake,
                multiplier: mult,
                martingale_mode: martingaleModeRef.current,
                consecutive_losses: consecutiveLossRef.current,
                consecutive_loss_trigger: consecutiveLossCountRef.current,
                recover_until_total_profit:
                    strategyModeRef.current === 'PERCENTAGE' && usesLossPrediction(tradeTypeRef.current),
                total_profit_after_trade: nextTotalPnl,
            });

            nextStakeRef.current = nextMartingaleState.nextStake;
            consecutiveLossRef.current = nextMartingaleState.consecutiveLosses;
            state.lastResult = nextMartingaleState.lastResult;
            state.lossCooldownLeft = profit < 0 ? MARKET_LOSS_COOLDOWN_TICKS : 0;
            previousContractResultRef.current = state.lastResult;
            state.tradeCount++;
            state.trading = false;
            globalTradingRef.current = false;

            if (!unmountedRef.current) {
                refreshDisplays();
            }

            if ((totalPnlRef.current >= tp || totalPnlRef.current <= -sl) && runningRef.current) {
                runningRef.current = false;
                if (!unmountedRef.current) {
                    setIsRunning(false);
                }
                completeRunPanelStop();
            }
        },
        [completeRunPanelStop, refreshDisplays]
    );

    const isPatternDigit = useCallback(
        (symbol: string, digit: number): boolean => {
            const ct = tradeTypeRef.current;
            const lastResult = previousContractResultRef.current;
            const consecutiveLosses = consecutiveLossRef.current;

            if (
                (strategyModeRef.current === 'PERCENTAGE' || strategyTemplateRef.current !== 'STANDARD') &&
                !modeTransitionLockRef.current
            ) {
                const state = marketStatesRef.current[symbol];
                return state
                    ? isPercentageSignalReady(ct, state, getActiveDigitBarrier(ct, lastResult, consecutiveLosses))
                    : false;
            }

            const bar = getActiveDigitBarrier(ct, lastResult, consecutiveLosses);
            const inv = inverseModeRef.current;

            return isDigitSignalMatch({
                trade_type: ct,
                digit,
                barrier: bar,
                inverse: inv,
            });
        },
        [getActiveDigitBarrier]
    );

    const tryExecuteSignal = useCallback(
        (symbol: string, state: MarketState, signalReady: boolean) => {
            if (
                runningRef.current &&
                signalReady &&
                !state.trading &&
                !globalTradingRef.current &&
                state.lossCooldownLeft === 0
            ) {
                state.trading = true;
                state.consecutive = 0;
                globalTradingRef.current = true;
                state.tradeStartTime = Math.floor(Date.now() / 1000);
                state.verificationId = `${symbol}_${state.tradeStartTime}_${Math.random().toString(36).substring(2, 11)}`;

                const stakeNow = nextStakeRef.current;

                // Runtime sanity checks
                if (stakeNow <= 0 || isNaN(stakeNow)) {
                    console.error(`[AutoTrades] Sanity check failed: Invalid stake amount ${stakeNow} for ${symbol}`);
                    state.trading = false;
                    globalTradingRef.current = false;
                    setError('Auto Trades stopped because the stake amount is invalid.');
                    refreshDisplays();
                    return;
                }

                executeTrade(symbol, stakeNow, previousContractResultRef.current).then(profit =>
                    handleAfterTrade(symbol, profit)
                );
            }
        },
        [executeTrade, handleAfterTrade, refreshDisplays]
    );

    const handleCandle = useCallback(
        (symbol: string, candle: any) => {
            if (!selectedMarketSymbolsRef.current.has(symbol)) return;

            const state = marketStatesRef.current[symbol];
            if (!state) return;

            const open = Number(candle?.open);
            const close = Number(candle?.close);
            if (!Number.isFinite(open) || !Number.isFinite(close)) return;

            state.candleOpen = open;
            state.candleClose = close;
            state.candleDirection = close > open ? 1 : close < open ? -1 : 0;

            const ct = tradeTypeRef.current;
            const signalReady =
                isCandleConfirmedTradeType(ct) &&
                state.consecutive >= streakRef.current &&
                (inverseModeRef.current
                    ? isInverseCandleMatch(ct, state.candleDirection)
                    : isCandleMatch(ct, state.candleDirection));
            tryExecuteSignal(symbol, state, signalReady);

            refreshDisplays();
        },
        [refreshDisplays, tryExecuteSignal]
    );

    handleCandleRef.current = handleCandle;

    const handleTick = useCallback(
        (symbol: string, tick: any) => {
            if (!monitoredMarketSymbolsRef.current.has(symbol)) return;

            const state = marketStatesRef.current[symbol];
            if (!state) return;

            const pip = getMarketPipSize(symbol, AUTO_MARKET_LOOKUP.get(symbol)?.pip ?? 2);
            const quote = tick.quote as number;
            const ct = tradeTypeRef.current;
            const targetLen = getEffectiveSignalStreak({
                trade_type: ct,
                configured_streak: streakRef.current,
            });

            state.lastQuote = quote;
            state.isRecovering = false;
            lastTickAtRef.current = Date.now();
            if (isRecoveringDataRef.current) {
                clearDataRecoveryLoading();
            }

            if (
                (strategyModeRef.current === 'PERCENTAGE' || strategyTemplateRef.current !== 'STANDARD') &&
                !modeTransitionLockRef.current
            ) {
                const epoch = Number(tick.epoch);
                appendPercentageQuote(symbol, state, quote, Number.isFinite(epoch) ? epoch : null, ct);
            }

            if (state.lossCooldownLeft > 0) {
                state.lossCooldownLeft = Math.max(0, state.lossCooldownLeft - 1);
            }

            if (IS_DIRECTION_TYPE[ct]) {
                const prev = state.prevQuote;
                const dir: Direction = prev === null ? 0 : quote > prev ? 1 : quote < prev ? -1 : 0;

                state.directionHistory = [...state.directionHistory.slice(-9), dir];
                state.prevQuote = quote;

                if (dir !== 0) {
                    const match = inverseModeRef.current ? isInverseDirectionMatch(ct, dir) : isDirectionMatch(ct, dir);
                    if (match) {
                        state.consecutive = Math.min(state.consecutive + 1, 10);
                    } else {
                        state.consecutive = 0;
                    }
                }
            } else {
                const lastDigit = getLastDigitFromQuote(quote, symbol, pip);
                state.lastDigits = [...state.lastDigits.slice(-9), lastDigit];
                state.prevQuote = quote;

                if (isPatternDigit(symbol, lastDigit)) {
                    state.consecutive = Math.min(state.consecutive + 1, 10);
                } else {
                    state.consecutive = 0;
                }
            }

            const candleMatch = inverseModeRef.current
                ? isInverseCandleMatch(ct, state.candleDirection)
                : isCandleMatch(ct, state.candleDirection);
            const requiresCandle = isCandleConfirmedTradeType(ct);
            const lastPredictionResult = previousContractResultRef.current;
            const activeBarrier = getActiveDigitBarrier(ct, lastPredictionResult, consecutiveLossRef.current);
            const activeStrategyTemplate = strategyTemplateRef.current;
            const specialStrategyEvaluation =
                activeStrategyTemplate !== 'STANDARD'
                    ? evaluateDigitStrategy(activeStrategyTemplate, state.digitPercentages, state.lastDigits)
                    : null;

            if (specialStrategyEvaluation) {
                const wasAlertActive = state.alertActive;
                state.alertActive = specialStrategyEvaluation.isQualified;
                state.specialEntryReady = specialStrategyEvaluation.entryReady;
                state.trailingTriggerCount = specialStrategyEvaluation.trailingTriggerCount;
                state.qualifyingWinningDigits = specialStrategyEvaluation.qualifyingWinningDigits;
                state.alertMessage = specialStrategyEvaluation.isQualified
                    ? `${specialStrategyEvaluation.alertLabel} ready to watch. Winning digits >= 10.5%: ${specialStrategyEvaluation.qualifyingWinningDigits.join(', ')}`
                    : `${specialStrategyEvaluation.alertLabel} waiting for qualifying percentages.`;

                if (!wasAlertActive && specialStrategyEvaluation.isQualified) {
                    const marketLabel = AUTO_MARKET_LOOKUP.get(symbol)?.label ?? symbol;
                    playStrategyAlertSound();
                    setFloatingStrategyAlert({
                        marketLabel,
                        message: state.alertMessage,
                        strategyId: activeStrategyTemplate,
                        symbol,
                    });
                } else if (
                    floatingStrategyAlertRef.current?.symbol === symbol &&
                    floatingStrategyAlertRef.current?.strategyId === activeStrategyTemplate &&
                    !specialStrategyEvaluation.isQualified
                ) {
                    setFloatingStrategyAlert(current =>
                        current?.symbol === symbol && current.strategyId === activeStrategyTemplate ? null : current
                    );
                }

                if (
                    runningRef.current &&
                    selectedMarketSymbolsRef.current.has(symbol) &&
                    !specialStrategyEvaluation.isQualified
                ) {
                    stopTradingRef.current();
                    setError(
                        `${AUTO_MARKET_LOOKUP.get(symbol)?.label ?? symbol} no longer matches ${specialStrategyEvaluation.alertLabel}. Auto Trades stopped.`
                    );
                    return;
                }
            } else {
                state.alertActive = false;
                state.specialEntryReady = false;
                state.trailingTriggerCount = 0;
                state.qualifyingWinningDigits = [];
                state.alertMessage = '';
            }
            const riskFilteredDigitStreakReady =
                !usesLossPrediction(ct) ||
                hasRequiredDigitStreak({
                    trade_type: ct,
                    digits: state.lastDigits,
                    barrier: activeBarrier,
                    inverse: inverseModeRef.current,
                    streak: targetLen,
                });
            const signalReady = specialStrategyEvaluation
                ? specialStrategyEvaluation.entryReady
                : strategyModeRef.current === 'PERCENTAGE' && !modeTransitionLockRef.current
                  ? isPercentageSignalReady(ct, state, activeBarrier) && (!requiresCandle || candleMatch)
                  : state.consecutive >= targetLen && riskFilteredDigitStreakReady && (!requiresCandle || candleMatch);

            if (runningRef.current || specialStrategyEvaluation) {
                const ct = tradeTypeRef.current;
                const bar = activeBarrier;
                const mkt = AUTO_MARKET_LOOKUP.get(symbol);
                const inv = inverseModeRef.current;
                let condStr = '';
                let digitsStr = '';
                if (specialStrategyEvaluation) {
                    digitsStr = `[${state.lastDigits.slice(-4).join(', ')}]`;
                    condStr = state.alertMessage;
                } else if (IS_DIRECTION_TYPE[ct]) {
                    const dirs = state.directionHistory.slice(-targetLen);
                    digitsStr = `[${dirs.map(d => (d === 1 ? '↑' : d === -1 ? '↓' : '—')).join(', ')}]`;
                    if (inv) {
                        if (ct === 'CALL') condStr = `5m candle bullish + consecutive rising ticks ≥ ${targetLen}`;
                        else if (ct === 'PUT') condStr = `5m candle bearish + consecutive falling ticks ≥ ${targetLen}`;
                        else if (ct === 'RUNHIGH')
                            condStr = `5m candle bearish + consecutive rising ticks ≥ ${targetLen}`;
                        else condStr = `5m candle bullish + consecutive falling ticks ≥ ${targetLen}`;
                    } else {
                        condStr = getDirectionCondition(ct, targetLen);
                    }
                } else {
                    const recent = state.lastDigits.slice(-targetLen);
                    digitsStr = `[${recent.join(', ')}]`;
                    if (inv) {
                        if (ct === 'DIGITOVER') condStr = `digits > ${bar} streak ≥ ${targetLen}`;
                        else if (ct === 'DIGITUNDER') condStr = `digits < ${bar} streak ≥ ${targetLen}`;
                        else if (ct === 'DIGITEVEN') condStr = `consecutive even digits ≥ ${targetLen}`;
                        else if (ct === 'DIGITODD') condStr = `consecutive odd digits ≥ ${targetLen}`;
                        else if (ct === 'DIGITMATCH') condStr = `digits = ${bar} streak ≥ ${targetLen}`;
                        else condStr = `digits ≠ ${bar} streak ≥ ${targetLen}`;
                    } else {
                        if (ct === 'DIGITOVER') condStr = `digits ≤ ${bar} streak ≥ ${targetLen}`;
                        if (ct === 'DIGITUNDER') condStr = `digits ≥ ${bar} streak ≥ ${targetLen}`;
                        if (ct === 'DIGITEVEN') condStr = `consecutive odd digits ≥ ${targetLen}`;
                        if (ct === 'DIGITODD') condStr = `consecutive even digits ≥ ${targetLen}`;
                        if (ct === 'DIGITMATCH') condStr = `digits ≠ ${bar} streak ≥ ${targetLen}`;
                        if (ct === 'DIGITDIFF') condStr = `digits = ${bar} streak ≥ ${targetLen}`;
                    }
                }
                conditionNotifierStore.setCondition({
                    market: mkt?.label ?? symbol,
                    condition: condStr,
                    digits: digitsStr,
                    result: specialStrategyEvaluation ? specialStrategyEvaluation.isQualified : signalReady,
                    source: specialStrategyEvaluation ? 'strategy-alert' : 'auto',
                    timestamp: Date.now(),
                });
            }

            tryExecuteSignal(symbol, state, signalReady);

            refreshDisplays();
        },
        [clearDataRecoveryLoading, getActiveDigitBarrier, isPatternDigit, refreshDisplays, tryExecuteSignal]
    );

    handleTickRef.current = handleTick;

    useEffect(() => {
        unmountedRef.current = false;
        return () => {
            unmountedRef.current = true;
        };
    }, []);

    const backfillPercentageTicks = useCallback(
        async (market: AutoMarket) => {
            const state = marketStatesRef.current[market.symbol];
            if (
                !state ||
                state.percentageBackfilled ||
                state.percentageBackfillInFlight ||
                (strategyModeRef.current !== 'PERCENTAGE' && strategyTemplateRef.current === 'STANDARD')
            ) {
                return;
            }

            state.percentageBackfillInFlight = true;

            try {
                const response = await (api_base.api as any).send({
                    ticks_history: market.symbol,
                    end: 'latest',
                    count: PERCENTAGE_BACKFILL_COUNT,
                    style: 'ticks',
                });
                const history = response?.history;
                const prices = Array.isArray(history?.prices) ? history.prices : [];
                const times = Array.isArray(history?.times) ? history.times : [];
                const quotes: number[] = [];
                const epochs: number[] = [];

                prices.forEach((price: unknown, index: number) => {
                    const quote = Number(price);
                    if (!Number.isFinite(quote)) return;

                    const epoch = Number(times[index]);
                    quotes.push(quote);
                    epochs.push(Number.isFinite(epoch) ? epoch : Date.now() + index);
                });

                state.percentageQuoteHistory = quotes.slice(-PERCENTAGE_ANALYSIS_HISTORY_SIZE);
                state.percentageEpochHistory = epochs.slice(-state.percentageQuoteHistory.length);
                state.percentageBackfilled = state.percentageQuoteHistory.length > 0;

                if (state.percentageQuoteHistory.length > 0) {
                    const latestQuote = state.percentageQuoteHistory[state.percentageQuoteHistory.length - 1];
                    rebuildPercentageAnalytics(market.symbol, state, tradeTypeRef.current);
                    state.lastQuote = latestQuote;
                    state.prevQuote = latestQuote;
                    state.lastDigits = state.digitHistory.slice(-10);
                    state.directionHistory = state.directionSampleHistory.slice(-10);
                }

                refreshDisplays();
            } catch (error) {
                state.percentageBackfilled = false;
                if (!isExpectedStreamInterruption(error)) {
                    console.warn(`[AutoTrades] Percentage history backfill failed for ${market.symbol}:`, error);
                }
            } finally {
                state.percentageBackfillInFlight = false;
            }
        },
        [refreshDisplays]
    );

    const startSubscriptions = useCallback(async () => {
        const subscriptionVersion = subscriptionVersionRef.current;
        const monitorAllMarkets = strategyTemplateRef.current !== 'STANDARD';
        const marketsToMonitor = monitorAllMarkets ? AUTO_MARKETS : selectedMarketsRef.current;
        const monitoredSymbolSet = new Set(marketsToMonitor.map(({ symbol }) => symbol));
        const candleSymbolSet = monitorAllMarkets
            ? new Set<string>()
            : new Set(selectedMarketsRef.current.map(({ symbol }) => symbol));

        Object.entries(subscriptionsRef.current).forEach(([symbol, sub]) => {
            if (!monitoredSymbolSet.has(symbol)) {
                try {
                    sub?.unsubscribe?.();
                } catch {
                    // Ignore unsubscribe failures.
                }
                delete subscriptionsRef.current[symbol];
                updateSubscriptionDiagnostics();
            }
        });

        Object.entries(candleSubscriptionsRef.current).forEach(([symbol, sub]) => {
            if (!candleSymbolSet.has(symbol)) {
                try {
                    sub?.unsubscribe?.();
                } catch {
                    // Ignore unsubscribe failures.
                }
                delete candleSubscriptionsRef.current[symbol];
                updateSubscriptionDiagnostics();
            }
        });

        if (marketsToMonitor.length === 0) {
            setIsConnected(false);
            clearDataRecoveryLoading();
            return;
        }

        lastTickAtRef.current = Date.now();
        setDataRecoveryLoading(
            monitorAllMarkets ? 'Loading strategy scanner data...' : 'Loading selected market data...'
        );

        for (const market of marketsToMonitor) {
            if (strategyModeRef.current === 'PERCENTAGE' || strategyTemplateRef.current !== 'STANDARD') {
                backfillPercentageTicks(market);
            }

            if (!subscriptionsRef.current[market.symbol]) {
                try {
                    const obs = (api_base.api as any).subscribe({ ticks: market.symbol });
                    const sub = safeSubscribe(
                        obs,
                        (data: any) => {
                            if (subscriptionVersion !== subscriptionVersionRef.current) return;
                            if (!show_auto_ref.current || unmountedRef.current) return;
                            if (data?.error) {
                                if (!isExpectedStreamInterruption(data.error)) {
                                    console.warn(`[AutoTrades] Tick stream error for ${market.symbol}:`, data.error);
                                }
                                markMarketRecovering(market.symbol, true);
                                return;
                            }
                            if (data?.tick?.quote !== undefined) handleTickRef.current(market.symbol, data.tick);
                        },
                        (streamError: unknown) => {
                            if (subscriptionVersion !== subscriptionVersionRef.current) return;
                            if (!show_auto_ref.current || unmountedRef.current) return;
                            if (!isExpectedStreamInterruption(streamError)) {
                                console.warn(`[AutoTrades] Tick stream error for ${market.symbol}:`, streamError);
                            }
                            markMarketRecovering(market.symbol, true);
                        }
                    );
                    subscriptionsRef.current[market.symbol] = sub;
                    updateSubscriptionDiagnostics();
                } catch (err) {
                    if (!isExpectedStreamInterruption(err)) {
                        console.error(`[AutoTrades] Subscribe failed for ${market.symbol}:`, err);
                    }
                }
            }

            if (!monitorAllMarkets && !candleSubscriptionsRef.current[market.symbol]) {
                try {
                    const obs = (api_base.api as any).subscribe({
                        ticks_history: market.symbol,
                        end: 'latest',
                        count: 2,
                        granularity: FIVE_MINUTE_GRANULARITY,
                        style: 'candles',
                        subscribe: 1,
                    });
                    const sub = safeSubscribe(
                        obs,
                        (data: any) => {
                            if (subscriptionVersion !== subscriptionVersionRef.current) return;
                            if (!show_auto_ref.current || unmountedRef.current) return;
                            if (data?.error) {
                                if (!isExpectedStreamInterruption(data.error)) {
                                    console.warn(`[AutoTrades] Candle stream error for ${market.symbol}:`, data.error);
                                }
                                markMarketRecovering(market.symbol, true);
                                return;
                            }
                            const candle =
                                data?.ohlc ??
                                (Array.isArray(data?.candles) ? data.candles[data.candles.length - 1] : null);
                            if (candle) handleCandleRef.current(market.symbol, candle);
                        },
                        (streamError: unknown) => {
                            if (subscriptionVersion !== subscriptionVersionRef.current) return;
                            if (!show_auto_ref.current || unmountedRef.current) return;
                            if (!isExpectedStreamInterruption(streamError)) {
                                console.warn(`[AutoTrades] Candle stream error for ${market.symbol}:`, streamError);
                            }
                            markMarketRecovering(market.symbol, true);
                        }
                    );
                    candleSubscriptionsRef.current[market.symbol] = sub;
                    updateSubscriptionDiagnostics();
                } catch (err) {
                    if (!isExpectedStreamInterruption(err)) {
                        console.error(`[AutoTrades] 5m candle subscribe failed for ${market.symbol}:`, err);
                    }
                }
            }
        }
        setIsConnected(Object.keys(subscriptionsRef.current).length > 0);
        updateSubscriptionDiagnostics();
    }, [
        backfillPercentageTicks,
        clearDataRecoveryLoading,
        markMarketRecovering,
        setDataRecoveryLoading,
        updateSubscriptionDiagnostics,
    ]);

    const stopSubscriptions = useCallback(() => {
        subscriptionVersionRef.current++;
        Object.values(subscriptionsRef.current).forEach(sub => {
            try {
                sub?.unsubscribe?.();
            } catch {
                // Ignore unsubscribe failures.
            }
        });
        subscriptionsRef.current = {};
        Object.values(candleSubscriptionsRef.current).forEach(sub => {
            try {
                sub?.unsubscribe?.();
            } catch {
                // Ignore unsubscribe failures.
            }
        });
        candleSubscriptionsRef.current = {};
        setIsConnected(false);
        clearDataRecoveryLoading();
        updateSubscriptionDiagnostics();
    }, [clearDataRecoveryLoading, updateSubscriptionDiagnostics]);

    const restartSubscriptions = useCallback(() => {
        const now = Date.now();
        if (restartInFlightRef.current) return;
        if (now - lastRestartAttemptAtRef.current < DATA_RESTART_COOLDOWN_MS) return;
        restartInFlightRef.current = true;
        lastRestartAttemptAtRef.current = now;
        recordDiagnosticEvent('auto_trades.stream_restart', {
            selectedMarkets: selectedMarketsRef.current.length,
            silentForMs: now - lastTickAtRef.current,
        });
        stopSubscriptions();
        setDataRecoveryLoading('Market data paused. Reconnecting streams...');
        restartTimerRef.current = window.setTimeout(() => {
            restartTimerRef.current = null;
            if (!show_auto_ref.current || unmountedRef.current) {
                restartInFlightRef.current = false;
                return;
            }
            startSubscriptions()
                .catch(err => {
                    console.error('[AutoTrades] Data restart failed:', err);
                })
                .finally(() => {
                    restartInFlightRef.current = false;
                    lastTickAtRef.current = Date.now();
                });
        }, 800);
    }, [setDataRecoveryLoading, startSubscriptions, stopSubscriptions]);

    const resetSession = useCallback(() => {
        const baseStake = configRef.current.stake;
        nextStakeRef.current = baseStake;
        globalTradingRef.current = false;
        previousContractResultRef.current = null;
        consecutiveLossRef.current = 0;

        selectedMarkets.forEach(m => {
            // Create fresh state — never carry old array references to prevent memory accumulation
            marketStatesRef.current[m.symbol] = createMarketState();
        });
        totalPnlRef.current = 0;
        totalTradesRef.current = 0;
        setTotalPnl(0);
        setTotalTrades(0);
        setCooldownDisplay(0);
        setCurrentStakeDisplay(baseStake);
        setError(null);
        refreshDisplays();
    }, [refreshDisplays, selectedMarkets]);

    const handleRun = useCallback(() => {
        if (!api_base.is_authorized) {
            setError('Please log in to your Deriv account before trading.');
            return;
        }
        if (selectedMarkets.length === 0) {
            setError('Please select at least one market before running Auto Trades.');
            return;
        }
        setError(null);
        resetSession();
        try {
            run_panel.setIsRunning(true);
            run_panel.setRunId(`run-${Date.now()}`);
            run_panel.setContractStage?.(contract_stages.RUNNING);
            run_panel.toggleDrawer(true);
        } catch {
            // Ignore optional run-panel mount failures.
        }
        dashboard.setActiveTradingModule('auto_trades');
        runningRef.current = true;
        setIsRunning(true);
    }, [dashboard, resetSession, run_panel, selectedMarkets.length]);

    const stopTrading = useCallback(() => {
        runningRef.current = false;
        globalTradingRef.current = false;
        consecutiveLossRef.current = 0;
        previousContractResultRef.current = null;
        clearDeferredWork();
        Object.values(marketStatesRef.current).forEach(state => {
            state.trading = false;
            state.consecutive = 0;
            state.tradeStartTime = null;
            state.verificationId = null;
            state.lossCooldownLeft = 0;
        });
        setIsRunning(false);
        clearDataRecoveryLoading();
        setCooldownDisplay(0);
        setCurrentStakeDisplay(configRef.current.stake);
        nextStakeRef.current = configRef.current.stake;
        dashboard.setActiveTradingModule(null);
        recordDiagnosticEvent('auto_trades.stop_trading', {
            selectedMarkets: selectedMarketsRef.current.length,
            tickStreams: Object.keys(subscriptionsRef.current).length,
            candleStreams: Object.keys(candleSubscriptionsRef.current).length,
        });
        updateSubscriptionDiagnostics();
        completeRunPanelStop();
        refreshDisplays();
    }, [
        clearDataRecoveryLoading,
        clearDeferredWork,
        completeRunPanelStop,
        dashboard,
        refreshDisplays,
        updateSubscriptionDiagnostics,
    ]);

    const handleStop = useCallback(() => {
        stopTrading();
    }, [stopTrading]);

    useEffect(() => {
        stopTradingRef.current = stopTrading;
    }, [stopTrading]);

    useEffect(() => {
        if (!show_auto) return undefined;

        dashboard.registerTradingStopHandler('auto_trades', stopTrading);
        globalObserver.register('bot.running', run_panel.onBotRunningEvent);
        globalObserver.register('contract.status', run_panel.onContractStatusEvent);
        globalObserver.register('Error', run_panel.onError);
        globalObserver.register('bot.setPurchaseInProgress', run_panel.SetpurchaseInProgress);
        globalObserver.register('bot.manual_stop', stopTrading);

        return () => {
            dashboard.unregisterTradingStopHandler('auto_trades');
            globalObserver.unregister('bot.running', run_panel.onBotRunningEvent);
            globalObserver.unregister('contract.status', run_panel.onContractStatusEvent);
            globalObserver.unregister('Error', run_panel.onError);
            globalObserver.unregister('bot.setPurchaseInProgress', run_panel.SetpurchaseInProgress);
            globalObserver.unregister('bot.manual_stop', stopTrading);
        };
    }, [dashboard, run_panel, show_auto, stopTrading]);

    useEffect(() => {
        if (show_auto) {
            if (api_base.api) {
                startSubscriptions();
            } else {
                const id = setInterval(() => {
                    if (api_base.api) {
                        clearInterval(id);
                        startSubscriptions();
                    }
                }, 1000);
                return () => clearInterval(id);
            }
        } else {
            if (runningRef.current) {
                runningRef.current = false;
                setIsRunning(false);
                try {
                    run_panel.setIsRunning(false);
                } catch {
                    // Ignore optional run-panel stop failures.
                }
            }
            clearDeferredWork();
            stopSubscriptions();
        }
        return undefined;
    }, [clearDeferredWork, show_auto, run_panel, startSubscriptions, stopSubscriptions]);

    useEffect(() => {
        if (!show_auto || !api_base.api) return;
        startSubscriptions();
    }, [selectedMarketSymbols, show_auto, startSubscriptions, strategyMode, strategyTemplate]);

    const dataSilenceIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (dataSilenceIntervalRef.current) {
            window.clearInterval(dataSilenceIntervalRef.current);
            dataSilenceIntervalRef.current = null;
        }

        // Only run watchdog when tab is visible
        if (!show_auto) return undefined;

        dataSilenceIntervalRef.current = window.setInterval(() => {
            // Double-check visibility and unmount state before restarting
            if (!show_auto_ref.current || unmountedRef.current) return;
            const has_selected_markets = selectedMarketsRef.current.length > 0;
            const silent_for = Date.now() - lastTickAtRef.current;

            if (has_selected_markets && silent_for > DATA_SILENCE_RESTART_MS) {
                if (!restartInFlightRef.current) {
                    restartSubscriptions();
                }
            }
        }, 5000);

        return () => {
            if (dataSilenceIntervalRef.current) {
                window.clearInterval(dataSilenceIntervalRef.current);
                dataSilenceIntervalRef.current = null;
            }
        };
    }, [restartSubscriptions, show_auto]);

    useEffect(() => {
        if (!run_panel.is_running && runningRef.current && show_auto) {
            stopTrading();
        }
    }, [run_panel.is_running, show_auto, stopTrading]);

    useEffect(
        () => () => {
            unmountedRef.current = true;
            clearDeferredWork();
            // Invalidate all subscription callbacks by bumping version
            subscriptionVersionRef.current++;
            runningRef.current = false;
            stopTrading();
            try {
                run_panel.setIsRunning(false);
                run_panel.setHasOpenContract(false);
            } catch {
                // Ignore optional run-panel stop failures.
            }
            // Stop all WebSocket subscriptions
            stopSubscriptions();
            // Free array memory to prevent heap growth across sessions
            Object.values(marketStatesRef.current).forEach(state => {
                state.digitHistory.length = 0;
                state.directionHistory.length = 0;
                state.percentageQuoteHistory.length = 0;
                state.percentageEpochHistory.length = 0;
                state.directionSampleHistory.length = 0;
                state.lastDigits.length = 0;
            });
        },
        [clearDeferredWork, run_panel, stopTrading, stopSubscriptions]
    );

    if (!show_auto) return null;

    const pnlPositive = totalPnl > 0;
    const pnlNegative = totalPnl < 0;
    const baseStakeNum = Number(stake) || 1;
    const martingaleActive = currentStakeDisplay > baseStakeNum;
    const inCooldown = cooldownDisplay > 0;
    const selectedMarketDisplayStates = selectedMarkets.map(
        market =>
            marketDisplays.find(display => display.symbol === market.symbol) ?? marketStatesRef.current[market.symbol]
    );
    const hasAnyLiveQuote =
        selectedMarkets.length > 0 && selectedMarketDisplayStates.some(display => display?.lastQuote !== null);
    const hasAllLiveQuotes =
        selectedMarkets.length > 0 && selectedMarketDisplayStates.every(display => display?.lastQuote !== null);
    const isDataLoading =
        selectedMarketSymbols.length > 0 &&
        ((!hasAnyLiveQuote && (dataStreamLoading || !isConnected || show_auto)) ||
            (!hasAllLiveQuotes && !hasAnyLiveQuote));
    const streakNum = getEffectiveSignalStreak({
        trade_type: tradeType,
        configured_streak: Number(streak) || 4,
    });
    const usingSpecialStrategy = strategyTemplate !== 'STANDARD';
    const activeSpecialStrategy = usingSpecialStrategy ? DIGIT_STRATEGIES[strategyTemplate as DigitStrategyId] : null;
    const isDirection = IS_DIRECTION_TYPE[tradeType];
    const previousContractResult = previousContractResultRef.current;
    const lossPredictionActive =
        usesLossPrediction(tradeType) &&
        (consecutiveLossRef.current > 0 || previousContractResultRef.current === 'loss');
    const activeBarrier = getActiveDigitBarrier(tradeType, previousContractResult, consecutiveLossRef.current);

    const subtitleTxt = (() => {
        const inv = inverseModeRef.current;
        const label = inv ? INVERSE_LABELS[tradeType] : TRADE_TYPE_LABELS[tradeType];
        if (tradeType === 'DIGITOVER')
            return `Streak: ${streakNum}+ digits ${inv ? '>' : '≤'} ${activeBarrier} → ${label}`;
        if (tradeType === 'DIGITUNDER')
            return `Streak: ${streakNum}+ digits ${inv ? '<' : '≥'} ${activeBarrier} → ${label}`;
        if (tradeType === 'CALL')
            return `5m bullish candle + ${streakNum}+ consecutive ${inv ? 'rising' : 'falling'} ticks → ${label} (${analysisTicks} ticks)`;
        if (tradeType === 'PUT')
            return `5m bearish candle + ${streakNum}+ consecutive ${inv ? 'falling' : 'rising'} ticks → ${label} (${analysisTicks} ticks)`;
        if (tradeType === 'RUNHIGH')
            return `${inv ? '5m bearish' : '5m bullish'} candle + ${streakNum}+ ${inv ? 'rising' : 'falling'} ticks → ${label} (${analysisTicks} ticks)`;
        if (tradeType === 'RUNLOW')
            return `${inv ? '5m bullish' : '5m bearish'} candle + ${streakNum}+ ${inv ? 'falling' : 'rising'} ticks → ${label} (${analysisTicks} ticks)`;
        if (tradeType === 'DIGITEVEN')
            return `Streak: ${streakNum}+ consecutive ${inv ? 'Even' : 'Odd'} digits → ${label}`;
        if (tradeType === 'DIGITODD')
            return `Streak: ${streakNum}+ consecutive ${inv ? 'Odd' : 'Even'} digits → ${label}`;
        if (tradeType === 'DIGITMATCH') return `Streak: ${streakNum}+ digits ${inv ? '=' : '≠'} ${barrier} → ${label}`;
        if (tradeType === 'DIGITDIFF') return `Streak: ${streakNum}+ digits ${inv ? '≠' : '='} ${barrier} → ${label}`;
    })();

    const resolvedSubtitleTxt = (() => {
        if (activeSpecialStrategy) {
            return `${activeSpecialStrategy.alertLabel}: ${activeSpecialStrategy.triggerLabel}, then ${activeSpecialStrategy.entryLabel}`;
        }
        if (!usesLossPrediction(tradeType)) return subtitleTxt;

        const inv = inverseModeRef.current;
        const label = inv ? INVERSE_LABELS[tradeType] : TRADE_TYPE_LABELS[tradeType];
        const lossPhaseText = lossPredictionActive ? 'after loss' : 'before loss';

        if (tradeType === 'DIGITOVER')
            return `Streak: ${streakNum}+ digits ${inv ? '>' : '≤'} ${activeBarrier} → ${label} ${lossPhaseText}`;
        if (tradeType === 'DIGITUNDER')
            return `Streak: ${streakNum}+ digits ${inv ? '<' : '≥'} ${activeBarrier} → ${label} ${lossPhaseText}`;

        return subtitleTxt;
    })();

    const resolvedAiFabPosition = aiFabPosition ?? getDefaultAiFabPosition();
    const aiFabStyle = {
        '--auto-trades-ai-fab-left': `${resolvedAiFabPosition.left}px`,
        '--auto-trades-ai-fab-top': `${resolvedAiFabPosition.top}px`,
    } as any;

    return (
        <div className='auto-trades-page'>
            <ThemedScrollbars className='auto-trades-page__scroll'>
                <div className='auto-trades-page__inner'>
                    {/* Header */}
                    <div className='auto-trades-page__header'>
                        <div>
                            <h1 className='auto-trades-page__title'>Auto Trades</h1>
                            <p className='auto-trades-page__subtitle'>{resolvedSubtitleTxt}</p>
                        </div>
                        <div className='auto-trades-page__status-dot'>
                            <span
                                className={classNames('auto-trades-status', {
                                    'auto-trades-status--connected': isConnected && !inCooldown,
                                    'auto-trades-status--running': isRunning && !inCooldown,
                                    'auto-trades-status--cooldown': inCooldown,
                                    'auto-trades-status--loading': isDataLoading && !inCooldown,
                                })}
                            />
                            <span className='auto-trades-status__label'>
                                {inCooldown
                                    ? `Cooldown ${cooldownDisplay}t`
                                    : isDataLoading
                                      ? 'Loading data'
                                      : isRunning
                                        ? 'Trading'
                                        : isConnected
                                          ? 'Live data'
                                          : selectedMarketSymbols.length === 0
                                            ? 'No markets'
                                            : 'Connecting…'}
                            </span>
                        </div>
                    </div>

                    {/* Cooldown banner */}
                    {inCooldown && isRunning && (
                        <div className='auto-trades-cooldown'>
                            <span className='auto-trades-cooldown__icon'>⏳</span>
                            <span>
                                Cooldown after 2 consecutive losses — all markets paused for{' '}
                                <strong>{cooldownDisplay}</strong> more ticks
                            </span>
                        </div>
                    )}

                    {!client.is_logged_in && (
                        <div className='auto-trades-page__notice'>
                            Please log in to your Deriv account to execute real trades.
                        </div>
                    )}

                    {error && <div className='auto-trades-page__error'>{error}</div>}

                    {floatingStrategyAlert && (
                        <div className='auto-trades-floating-alert' role='status' aria-live='polite'>
                            <div className='auto-trades-floating-alert__eyebrow'>
                                {DIGIT_STRATEGIES[floatingStrategyAlert.strategyId].alertLabel} ready
                            </div>
                            <strong>{floatingStrategyAlert.marketLabel}</strong>
                            <p>{floatingStrategyAlert.message}</p>
                            <div className='auto-trades-floating-alert__actions'>
                                <button
                                    type='button'
                                    onClick={() =>
                                        handleLoadAlertMarket(
                                            floatingStrategyAlert.symbol,
                                            floatingStrategyAlert.strategyId
                                        )
                                    }
                                >
                                    Load market
                                </button>
                                <button type='button' onClick={() => setFloatingStrategyAlert(null)}>
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    )}

                    {isDataLoading && (
                        <div className='auto-trades-page__loader'>
                            <div className='auto-trades-data-loader auto-trades-data-loader--panel'>
                                <span className='auto-trades-data-loader__spinner' />
                                <div className='auto-trades-data-loader__copy'>
                                    <strong>Waiting for live market data</strong>
                                    <span>{dataStreamMessage}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div
                        className={classNames('auto-trades-page__body', {
                            'auto-trades-page__body--loading': isDataLoading,
                        })}
                    >
                        {/* Sidebar */}
                        <div className='auto-trades-page__sidebar'>
                            {/* Settings card */}
                            <div className='auto-trades-card'>
                                <h2 className='auto-trades-card__title'>Settings</h2>

                                <div className='auto-trades-config__group'>
                                    <div className='auto-trades-strategy-selector'>
                                        <label>Strategy template</label>
                                        <select
                                            className='auto-trades-strategy-selector__select'
                                            value={strategyTemplate}
                                            onChange={e => setStrategyTemplate(e.target.value as StrategyTemplate)}
                                            disabled={isRunning}
                                        >
                                            <option value='STANDARD'>Standard builder</option>
                                            <option value='OVER_2_MARKET'>Over 2 Market</option>
                                            <option value='UNDER_7_MARKET'>Under 7 Market</option>
                                        </select>
                                    </div>
                                    <p className='auto-trades-inverse__hint'>
                                        {usingSpecialStrategy
                                            ? 'Scans every volatility and 1s market in the background. When one qualifies, load that market and click Start Trading to wait for the entry and buy automatically.'
                                            : 'Use the standard contract builder to configure your own auto-trade rule.'}
                                    </p>
                                </div>

                                {/* Contract Type + Barrier + Streak */}
                                <div className='auto-trades-config__group'>
                                    <p className='auto-trades-config__group-label'>Contract Type</p>

                                    {/* Trade type row */}
                                    <div className='auto-trades-config__trade-row'>
                                        <div className='auto-trades-config__field auto-trades-config__field--type'>
                                            <label>Type</label>
                                            <select
                                                className='auto-trades-config__select'
                                                value={tradeType}
                                                onChange={e => handleTradeTypeChange(e.target.value as TradeType)}
                                                disabled={isRunning || usingSpecialStrategy}
                                            >
                                                <optgroup label='Digits'>
                                                    <option value='DIGITOVER'>Digit Over</option>
                                                    <option value='DIGITUNDER'>Digit Under</option>
                                                    <option value='DIGITEVEN'>Digit Even</option>
                                                    <option value='DIGITODD'>Digit Odd</option>
                                                    <option value='DIGITMATCH'>Matches</option>
                                                    <option value='DIGITDIFF'>Differs</option>
                                                </optgroup>
                                                <optgroup label='Direction'>
                                                    <option value='CALL'>Rise</option>
                                                    <option value='PUT'>Fall</option>
                                                    <option value='RUNHIGH'>Only Ups</option>
                                                    <option value='RUNLOW'>Only Downs</option>
                                                </optgroup>
                                            </select>
                                        </div>

                                        {/* Prediction — adaptive digit selector (Win→Before / Loss→After) */}
                                        {usesLossPrediction(tradeType) && (
                                            <div className='auto-trades-config__prediction-pair'>
                                                <div className='auto-trades-config__prediction-label'>
                                                    Prediction
                                                    <span className='auto-trades-config__prediction-hint'>
                                                        W→digit / L→digit
                                                    </span>
                                                </div>
                                                <div className='auto-trades-config__prediction-controls'>
                                                    <div className='auto-trades-config__prediction-item'>
                                                        <span className='auto-trades-config__prediction-tag auto-trades-config__prediction-tag--win'>
                                                            W
                                                        </span>
                                                        <select
                                                            className='auto-trades-config__select auto-trades-config__select--compact'
                                                            value={predictionBeforeLoss}
                                                            onChange={e => setPredictionBeforeLoss(e.target.value)}
                                                            disabled={isRunning || usingSpecialStrategy}
                                                            title='Prediction used after a Win'
                                                        >
                                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                                                                <option key={d} value={String(d)}>
                                                                    {d}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <span className='auto-trades-config__prediction-divider'>|</span>
                                                    <div className='auto-trades-config__prediction-item'>
                                                        <span className='auto-trades-config__prediction-tag auto-trades-config__prediction-tag--loss'>
                                                            L
                                                        </span>
                                                        <select
                                                            className='auto-trades-config__select auto-trades-config__select--compact'
                                                            value={predictionAfterLoss}
                                                            onChange={e => setPredictionAfterLoss(e.target.value)}
                                                            disabled={isRunning || usingSpecialStrategy}
                                                            title='Prediction used after a Loss'
                                                        >
                                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                                                                <option key={d} value={String(d)}>
                                                                    {d}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {BARRIER_NEEDED[tradeType] && !usesLossPrediction(tradeType) && (
                                            <div className='auto-trades-config__field auto-trades-config__field--narrow'>
                                                <label>
                                                    {tradeType === 'DIGITMATCH' || tradeType === 'DIGITDIFF'
                                                        ? 'Prediction'
                                                        : 'Digit'}
                                                </label>
                                                <select
                                                    className='auto-trades-config__select'
                                                    value={barrier}
                                                    onChange={e => setBarrier(e.target.value)}
                                                    disabled={isRunning || usingSpecialStrategy}
                                                >
                                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                                                        <option key={d} value={String(d)}>
                                                            {d}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className='auto-trades-config__field auto-trades-config__field--analysis'>
                                            <label>Analysis ticks</label>
                                            <select
                                                className='auto-trades-config__select'
                                                value={analysisTicks}
                                                onChange={e => setAnalysisTicks(e.target.value)}
                                                disabled={isRunning || usingSpecialStrategy}
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => (
                                                    <option key={d} value={String(d)}>
                                                        {d}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Streak length */}
                                    <div className='auto-trades-config__field' style={{ marginTop: '0.8rem' }}>
                                        <label>
                                            Streak (
                                            {isDirection ? getDirectionStreakLabel(tradeType) : 'matching digits'})
                                        </label>
                                        <div className='auto-trades-config__streak-row'>
                                            <input
                                                className='auto-trades-config__streak-slider'
                                                type='range'
                                                min='1'
                                                max='10'
                                                step='1'
                                                value={streak}
                                                onChange={e => setStreak(e.target.value)}
                                                disabled={isRunning || usingSpecialStrategy}
                                            />
                                            <span className='auto-trades-config__streak-value'>{streak}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Strategy Mode Selector */}
                                <div className='auto-trades-config__group'>
                                    <div className='auto-trades-strategy-selector'>
                                        <label>Strategy Mode</label>
                                        <select
                                            className='auto-trades-strategy-selector__select'
                                            value={strategyMode}
                                            onChange={e => setStrategyMode(e.target.value as StrategyMode)}
                                            disabled={isRunning || usingSpecialStrategy}
                                        >
                                            <option value='STANDARD'>Standard</option>
                                            <option value='INVERSE'>Inverse</option>
                                            <option value='PERCENTAGE'>Percentage Mode</option>
                                        </select>
                                    </div>
                                    <p className='auto-trades-inverse__hint'>
                                        {strategyMode === 'PERCENTAGE'
                                            ? 'Auto-loads the latest 1,000 ticks and keeps a live rolling percentage window'
                                            : strategyMode === 'INVERSE'
                                              ? 'Detects opposite signals, executes contracts'
                                              : 'Detects standard signals, executes contracts'}
                                    </p>
                                </div>

                                {/* Inverse Toggle for Standard/Inverse modes */}
                                {strategyMode !== 'PERCENTAGE' && !usingSpecialStrategy && (
                                    <div className='auto-trades-config__group'>
                                        <button
                                            type='button'
                                            className={classNames(
                                                'auto-trades-strategy-btn',
                                                inverseMode && 'auto-trades-strategy-btn--active'
                                            )}
                                            onClick={() => setInverseMode(prev => !prev)}
                                            disabled={isRunning || usingSpecialStrategy}
                                        >
                                            <span className='auto-trades-strategy-btn__badge'>
                                                {inverseMode ? 'Inverse' : 'Direct'}
                                            </span>
                                            <span className='auto-trades-strategy-btn__label'>Signal Mode</span>
                                            <span
                                                className={classNames(
                                                    'auto-trades-inverse__toggle-switch',
                                                    'auto-trades-strategy-btn__switch'
                                                )}
                                            >
                                                <span className='auto-trades-inverse__toggle-knob' />
                                            </span>
                                        </button>
                                    </div>
                                )}

                                {/* Percentage Mode Configuration */}
                                {strategyMode === 'PERCENTAGE' && (
                                    <div className='auto-trades-config__group percentage-mode-config'>
                                        <div className='auto-trades-config__field'>
                                            <label>Trade Type</label>
                                            <select
                                                className='auto-trades-config__select'
                                                value={tradeType}
                                                onChange={e => setTradeType(e.target.value as TradeType)}
                                                disabled={isRunning}
                                            >
                                                <option value='DIGITOVER'>Digit Over</option>
                                                <option value='DIGITUNDER'>Digit Under</option>
                                                <option value='DIGITEVEN'>Digit Even/Odd</option>
                                                <option value='DIGITMATCH'>Digit Match/Differs</option>
                                                <option value='CALL'>Rise/Fall</option>
                                                <option value='RUNHIGH'>Higher/Lower</option>
                                            </select>
                                        </div>
                                        <div className='auto-trades-config__field'>
                                            <label>Confidence Threshold: 80%</label>
                                            <input
                                                type='range'
                                                className='auto-trades-config__slider'
                                                min='50'
                                                max='95'
                                                step='1'
                                                value={80}
                                                onChange={() => {}}
                                                disabled={isRunning}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Money settings */}
                                <div className='auto-trades-config'>
                                    <div className='auto-trades-config__field'>
                                        <label>Stake ({currency || 'USD'})</label>
                                        <Input
                                            type='number'
                                            min='0.35'
                                            step='0.01'
                                            value={stake}
                                            onChange={e => setStake(e.target.value)}
                                            disabled={isRunning}
                                        />
                                    </div>
                                    <div className='auto-trades-config__field'>
                                        <label>Martingale ×</label>
                                        <Input
                                            type='number'
                                            min='1.01'
                                            step='0.5'
                                            value={martingale}
                                            onChange={e => setMartingale(e.target.value)}
                                            disabled={isRunning}
                                        />
                                    </div>
                                    <div className='auto-trades-config__field'>
                                        <label>Take Profit ({currency || 'USD'})</label>
                                        <Input
                                            type='number'
                                            min='0'
                                            step='1'
                                            value={takeProfit}
                                            onChange={e => setTakeProfit(e.target.value)}
                                            disabled={isRunning}
                                        />
                                    </div>
                                    <div className='auto-trades-config__field'>
                                        <label>Stop Loss ({currency || 'USD'})</label>
                                        <Input
                                            type='number'
                                            min='0'
                                            step='1'
                                            value={stopLoss}
                                            onChange={e => setStopLoss(e.target.value)}
                                            disabled={isRunning}
                                        />
                                    </div>
                                </div>

                                {/* Martingale Strategy Selector */}
                                <div className='auto-trades-config__group'>
                                    <div className='auto-trades-martingale-selector'>
                                        <label>Martingale Strategy</label>
                                        <select
                                            className='auto-trades-martingale-selector__select'
                                            value={martingaleMode}
                                            onChange={e => setMartingaleMode(normalizeMartingaleMode(e.target.value))}
                                            disabled={isRunning}
                                        >
                                            <option value='no_martingale'>No Martingale</option>
                                            <option value='after_one_loss'>After 1 loss</option>
                                            <option value='after_two_losses'>After 2 losses</option>
                                            <option value='custom_consecutive_loss_trigger'>Custom loss count</option>
                                        </select>
                                    </div>
                                    <p className='auto-trades-martingale__hint'>
                                        {martingaleMode === 'no_martingale'
                                            ? 'Martingale is disabled. Stake stays at the base amount.'
                                            : martingaleMode === 'after_one_loss'
                                              ? 'Martingale engages immediately after one loss.'
                                              : martingaleMode === 'after_two_losses'
                                                ? 'Martingale engages only after two consecutive losses.'
                                                : `Martingale engages after ${clampConsecutiveLossThreshold(
                                                      consecutiveLossCount
                                                  )} consecutive losses.`}
                                    </p>
                                    {martingaleMode === 'custom_consecutive_loss_trigger' && (
                                        <div
                                            className='auto-trades-config__field auto-trades-config__field--martingale-threshold'
                                            style={{ marginTop: '0.5rem' }}
                                        >
                                            <label>Consecutive losses before martingale</label>
                                            <Input
                                                type='number'
                                                min='1'
                                                max='10'
                                                step='1'
                                                value={consecutiveLossCountInput}
                                                inputMode='numeric'
                                                onChange={e =>
                                                    handleConsecutiveLossCountInputChange(
                                                        (e.target as HTMLInputElement).value
                                                    )
                                                }
                                                onBlur={commitConsecutiveLossCountInput}
                                                disabled={isRunning}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className='auto-trades-controls'>
                                    <button
                                        className={classNames('auto-trades-controls__ai', {
                                            'auto-trades-controls__ai--dragging': isAiFabDragging,
                                        })}
                                        onClick={handleAiFabClick}
                                        onPointerDown={handleAiFabPointerDown}
                                        onPointerMove={handleAiFabPointerMove}
                                        onPointerUp={finishAiFabDrag}
                                        onPointerCancel={finishAiFabDrag}
                                        disabled={isRunning}
                                        type='button'
                                        title='AI strategy setup'
                                        style={aiFabStyle}
                                    >
                                        <span className='auto-trades-controls__ai-orbit'>
                                            <span className='auto-trades-controls__ai-text'>AI</span>
                                            <span className='auto-trades-controls__ai-dot' />
                                        </span>
                                        <span className='auto-trades-controls__ai-label'>Ai</span>
                                    </button>
                                    {!isRunning ? (
                                        <button
                                            className='auto-trades-controls__run'
                                            onClick={handleRun}
                                            disabled={!client.is_logged_in || selectedMarketSymbols.length === 0}
                                        >
                                            ▶ Start Trading
                                        </button>
                                    ) : (
                                        <button className='auto-trades-controls__stop' onClick={handleStop}>
                                            ■ Stop Trading
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Markets grid */}
                        <div className='auto-trades-markets'>
                            <h2 className='auto-trades-markets__title'>
                                Live Markets
                                <span className='auto-trades-markets__selected-count'>
                                    {selectedMarketSymbols.length}/{AUTO_MARKETS.length} selected
                                </span>
                                {isConnected && <span className='auto-trades-markets__live-badge'>● LIVE</span>}
                                {inCooldown && isRunning && (
                                    <span className='auto-trades-markets__cooldown-badge'>
                                        ⏳ {cooldownDisplay}t cooldown
                                    </span>
                                )}
                            </h2>
                            {!isRunning && (
                                <div className='auto-trades-markets__actions'>
                                    <button type='button' onClick={handleSelectAllMarkets}>
                                        Select all
                                    </button>
                                    <button type='button' onClick={handleClearMarkets}>
                                        Clear
                                    </button>
                                </div>
                            )}
                            {selectedMarketSymbols.length === 0 && (
                                <div className='auto-trades-hint'>
                                    {usingSpecialStrategy
                                        ? 'Background scanning is live across all supported volatility markets. Load one alert market to enable Start Trading.'
                                        : 'Select at least one market to show live quotes and enable Auto Trades.'}
                                </div>
                            )}
                            <div className='auto-trades-markets__grid'>
                                {marketDisplays.map(m => {
                                    const isMarketLoading = m.lastQuote === null;
                                    const isMarketRecovering = m.isRecovering && m.lastQuote !== null;
                                    const marketInCooldown = m.cooldownLeft > 0;
                                    const dots = Math.min(m.consecutive, streakNum);
                                    const candleReady =
                                        !isCandleConfirmedTradeType(tradeType) ||
                                        (inverseModeRef.current
                                            ? isInverseCandleMatch(tradeType, m.candleDirection)
                                            : isCandleMatch(tradeType, m.candleDirection));
                                    const isReady =
                                        (((usingSpecialStrategy ? m.specialEntryReady : m.consecutive >= streakNum) &&
                                            candleReady) ||
                                            m.trading) &&
                                        !marketInCooldown;
                                    return (
                                        <div
                                            key={m.symbol}
                                            className={classNames('auto-trades-market', {
                                                'auto-trades-market--ready': isReady && !m.trading && isRunning,
                                                'auto-trades-market--trading': m.trading,
                                                'auto-trades-market--win': m.lastResult === 'win' && !m.trading,
                                                'auto-trades-market--loss': m.lastResult === 'loss' && !m.trading,
                                                'auto-trades-market--cooldown': marketInCooldown && isRunning,
                                                'auto-trades-market--loading': isMarketLoading,
                                                'auto-trades-market--recovering': isMarketRecovering,
                                            })}
                                        >
                                            {isMarketLoading && (
                                                <div className='auto-trades-market__loading'>
                                                    <span className='auto-trades-data-loader__spinner' />
                                                    <span>Loading</span>
                                                </div>
                                            )}
                                            <div className='auto-trades-market__top'>
                                                <div>
                                                    <p className='auto-trades-market__name'>{m.label}</p>
                                                    <p className='auto-trades-market__symbol'>{m.symbol}</p>
                                                </div>
                                                <div className='auto-trades-market__controls'>
                                                    {!isRunning && (
                                                        <button
                                                            className='auto-trades-market__btn auto-trades-market__btn--remove'
                                                            onClick={() => handleRemoveMarket(m.symbol)}
                                                            title='Remove from Auto Trades'
                                                            type='button'
                                                        >
                                                            −
                                                        </button>
                                                    )}
                                                    {marketInCooldown && isRunning ? (
                                                        <div className='auto-trades-market__badge auto-trades-market__badge--cooldown'>
                                                            ⏳{m.cooldownLeft}
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className={classNames('auto-trades-market__badge', {
                                                                'auto-trades-market__badge--ready':
                                                                    isReady && isRunning,
                                                                'auto-trades-market__badge--trading': m.trading,
                                                            })}
                                                        >
                                                            {m.trading
                                                                ? 'BUYING'
                                                                : isReady && isRunning
                                                                  ? 'READY'
                                                                  : m.consecutive > 0
                                                                    ? `${m.consecutive}`
                                                                    : '—'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Live quote */}
                                            {m.lastQuote !== null && (
                                                <div className='auto-trades-market__quote'>
                                                    {m.lastQuote.toFixed(
                                                        getMarketPipSize(
                                                            m.symbol,
                                                            AUTO_MARKET_LOOKUP.get(m.symbol)?.pip ?? 2
                                                        )
                                                    )}
                                                </div>
                                            )}

                                            {usingSpecialStrategy && (
                                                <div className='auto-trades-market__confidence'>
                                                    {m.alertActive
                                                        ? `${m.alertMessage} Trigger streak ${m.trailingTriggerCount}/3.`
                                                        : m.alertMessage || 'Waiting for percentage alert.'}
                                                </div>
                                            )}

                                            {isCandleConfirmedTradeType(tradeType) && (
                                                <div
                                                    className={classNames('auto-trades-market__candle', {
                                                        'auto-trades-market__candle--bullish': m.candleDirection === 1,
                                                        'auto-trades-market__candle--bearish': m.candleDirection === -1,
                                                        'auto-trades-market__candle--waiting': m.candleDirection === 0,
                                                    })}
                                                >
                                                    5m candle: {getCandleDirectionLabel(m.candleDirection)}
                                                </div>
                                            )}

                                            {/* Progress indicators */}
                                            {isRunning && !inCooldown && (
                                                <div className='auto-trades-market__dots'>
                                                    {Array.from({ length: streakNum }).map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className={classNames('auto-trades-market__dot', {
                                                                'auto-trades-market__dot--filled': i < dots,
                                                                'auto-trades-market__dot--ready': i < dots && isReady,
                                                            })}
                                                        />
                                                    ))}
                                                    <span className='auto-trades-market__dots-label'>
                                                        {m.consecutive}/{streakNum}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Digit history (digit modes) */}
                                            {!isDirection && m.lastDigits.length > 0 && (
                                                <div className='auto-trades-market__digits'>
                                                    {m.lastDigits.slice(-5).map((d, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={classNames('auto-trades-market__digit', {
                                                                'auto-trades-market__digit--low': d <= 4,
                                                                'auto-trades-market__digit--high': d > 4,
                                                            })}
                                                        >
                                                            {d}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Direction history (Rise/Fall modes) */}
                                            {isDirection && m.directionHistory.length > 0 && (
                                                <div className='auto-trades-market__digits'>
                                                    {m.directionHistory.slice(-5).map((dir, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={classNames('auto-trades-market__digit', {
                                                                'auto-trades-market__digit--low': dir === 1,
                                                                'auto-trades-market__digit--high': dir === -1,
                                                            })}
                                                        >
                                                            {dir === 1 ? '▲' : dir === -1 ? '▼' : '—'}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Percentage visualization for Percentage Mode */}
                                            {strategyMode === 'PERCENTAGE' && (
                                                <div className='auto-trades-market__percentages'>
                                                    {(() => {
                                                        const snapshot = getPercentageSnapshot(
                                                            tradeType,
                                                            m,
                                                            getActiveDigitBarrier(
                                                                tradeType,
                                                                previousContractResult,
                                                                consecutiveLossRef.current
                                                            )
                                                        );
                                                        const threshold = getPercentageThreshold(
                                                            tradeType,
                                                            getActiveDigitBarrier(
                                                                tradeType,
                                                                previousContractResult,
                                                                consecutiveLossRef.current
                                                            )
                                                        );
                                                        const hasEnoughSamples =
                                                            snapshot.sampleSize >= PERCENTAGE_MIN_SAMPLE_SIZE;
                                                        const rollingWindowLabel =
                                                            m.percentageBackfillInFlight && snapshot.sampleSize === 0
                                                                ? 'Loading 1,000 tick window'
                                                                : `Window ${Math.min(
                                                                      snapshot.sampleSize,
                                                                      PERCENTAGE_ANALYSIS_HISTORY_SIZE
                                                                  )}/${PERCENTAGE_ANALYSIS_HISTORY_SIZE} ticks`;

                                                        return (
                                                            <>
                                                                <div className='auto-trades-market__percentage-row'>
                                                                    <span>
                                                                        {snapshot.primaryLabel}:{' '}
                                                                        {snapshot.primaryPercentage.toFixed(1)}%
                                                                    </span>
                                                                    {snapshot.secondaryLabel && (
                                                                        <span>
                                                                            {snapshot.secondaryLabel}:{' '}
                                                                            {snapshot.secondaryPercentage?.toFixed(1)}%
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className='auto-trades-market__confidence'>
                                                                    {hasEnoughSamples
                                                                        ? `Signal needs ${threshold.minPercentage}% / confidence ${threshold.confidence}%`
                                                                        : `Collecting ${snapshot.sampleSize}/${PERCENTAGE_MIN_SAMPLE_SIZE} samples`}
                                                                    {' · '}
                                                                    {rollingWindowLabel}
                                                                    {' Â· '}
                                                                    Confidence: {snapshot.confidence.toFixed(0)}%
                                                                </div>
                                                            </>
                                                        );
                                                    })()}

                                                    {/* Individual digit percentages */}
                                                    {!isDirection && Object.keys(m.digitPercentages).length > 0 && (
                                                        <div className='auto-trades-market__digit-bars'>
                                                            {[...Array(10)].map((_, d) => {
                                                                const pct = m.digitPercentages[d] || 0;
                                                                const isHot = pct > 15;
                                                                const isCold = pct < 5;
                                                                return (
                                                                    <div
                                                                        key={d}
                                                                        className='auto-trades-market__digit-bar-wrapper'
                                                                    >
                                                                        <span
                                                                            className={classNames(
                                                                                'auto-trades-market__digit-num',
                                                                                {
                                                                                    'auto-trades-market__digit-num--hot':
                                                                                        isHot,
                                                                                    'auto-trades-market__digit-num--cold':
                                                                                        isCold,
                                                                                }
                                                                            )}
                                                                        >
                                                                            {d}
                                                                        </span>
                                                                        <div className='auto-trades-market__digit-bar-bg'>
                                                                            <div
                                                                                className={classNames(
                                                                                    'auto-trades-market__digit-bar-fill',
                                                                                    {
                                                                                        'auto-trades-market__digit-bar-fill--hot':
                                                                                            isHot,
                                                                                        'auto-trades-market__digit-bar-fill--cold':
                                                                                            isCold,
                                                                                    }
                                                                                )}
                                                                                style={{ width: `${pct}%` }}
                                                                            />
                                                                        </div>
                                                                        <span className='auto-trades-market__digit-pct'>
                                                                            {pct.toFixed(0)}%
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {m.tradeCount > 0 && (
                                                <div className='auto-trades-market__footer'>
                                                    <span>
                                                        {m.tradeCount} trade{m.tradeCount !== 1 ? 's' : ''}
                                                    </span>
                                                    <span
                                                        className={classNames({
                                                            'auto-trades-market__last-win': m.lastResult === 'win',
                                                            'auto-trades-market__last-loss': m.lastResult === 'loss',
                                                        })}
                                                    >
                                                        {m.lastResult === 'win' ? '✓ Win' : '✗ Loss'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {!isRunning && availableMarkets.length > 0 && (
                                <div className='auto-trades-markets__available'>
                                    <h3 className='auto-trades-markets__subtitle'>Available markets to add</h3>
                                    <p className='auto-trades-markets__help'>
                                        Removed markets stay here with a plus button until you add them back.
                                    </p>
                                    <div className='auto-trades-markets__grid auto-trades-markets__grid--available'>
                                        {availableMarkets.map(market => (
                                            <button
                                                key={market.symbol}
                                                className='auto-trades-market-add'
                                                onClick={() => handleAddMarket(market.symbol)}
                                                type='button'
                                                title={`Add ${market.label} to Auto Trades`}
                                            >
                                                <span className='auto-trades-market-add__plus'>+</span>
                                                <div className='auto-trades-market-add__info'>
                                                    <p className='auto-trades-market-add__name'>{market.label}</p>
                                                    <p className='auto-trades-market-add__symbol'>{market.symbol}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </ThemedScrollbars>

            {showAiStrategy && (
                <div className='auto-trades-ai-overlay' onClick={() => setShowAiStrategy(false)}>
                    <div className='auto-trades-ai-modal' onClick={e => e.stopPropagation()}>
                        <div className='auto-trades-ai-modal__header'>
                            <div className='auto-trades-controls__ai-orbit auto-trades-controls__ai-orbit--small'>
                                <span className='auto-trades-controls__ai-text'>AI</span>
                                <span className='auto-trades-controls__ai-dot' />
                            </div>
                            <h3 className='auto-trades-ai-modal__title'>AI Strategy</h3>
                            <button
                                className='auto-trades-ai-modal__close'
                                onClick={() => setShowAiStrategy(false)}
                                disabled={aiStrategyLoading}
                                type='button'
                            >
                                x
                            </button>
                        </div>
                        <div className='auto-trades-ai-modal__preset'>
                            <label htmlFor='auto-trades-ai-preset'>Strategy preset</label>
                            <select
                                id='auto-trades-ai-preset'
                                className='auto-trades-ai-modal__preset-select'
                                value={selectedAiPresetId}
                                onChange={handleAiPresetChange}
                                disabled={aiStrategyLoading}
                            >
                                <option value=''>Select one of {AUTO_TRADE_STRATEGY_PRESET_COUNT} settings</option>
                                {aiPresetFamilies.map(family => (
                                    <optgroup key={family.id} label={family.name}>
                                        {family.presets.map(preset => (
                                            <option key={preset.id} value={preset.id}>
                                                {preset.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <textarea
                            className='auto-trades-ai-modal__textarea'
                            disabled={aiStrategyLoading}
                            value={aiStrategyText}
                            onChange={e => {
                                setAiStrategyText(e.target.value);
                                setAiStrategyResult(null);
                                setSelectedAiPresetId('');
                            }}
                            placeholder='Trade Over 1. In case of a loss trade Over 3. Use 1 tick. Only trade V25 index.'
                        />
                        {aiStrategyResult && (
                            <div className='auto-trades-ai-modal__result'>
                                <div className='auto-trades-ai-modal__source'>
                                    {aiStrategyResult.source === 'openai'
                                        ? 'OpenAI reasoning'
                                        : aiStrategyResult.source === 'preset'
                                          ? 'Preset library'
                                          : 'Local fallback'}
                                    {typeof aiStrategyResult.confidence === 'number'
                                        ? ` - ${Math.round(aiStrategyResult.confidence * 100)}% confidence`
                                        : ''}
                                </div>
                                {aiStrategyResult.summary.length > 0 && (
                                    <ul>
                                        {aiStrategyResult.summary.map(item => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                )}
                                {aiStrategyResult.unsupportedCapabilities &&
                                    aiStrategyResult.unsupportedCapabilities.length > 0 && (
                                        <div className='auto-trades-ai-modal__unsupported'>
                                            <strong>Needs new bot logic</strong>
                                            <ul>
                                                {aiStrategyResult.unsupportedCapabilities.map(item => (
                                                    <li key={item}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                {aiStrategyResult.customStrategy?.entryRules &&
                                    aiStrategyResult.customStrategy.entryRules.length > 0 && (
                                        <div className='auto-trades-ai-modal__custom'>
                                            <strong>Understood strategy rules</strong>
                                            <ul>
                                                {aiStrategyResult.customStrategy.entryRules.map(item => (
                                                    <li key={item}>{item}</li>
                                                ))}
                                                {aiStrategyResult.customStrategy.exitRules?.map(item => (
                                                    <li key={item}>{item}</li>
                                                ))}
                                                {aiStrategyResult.customStrategy.riskRules?.map(item => (
                                                    <li key={item}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                {aiStrategyResult.warnings.map(item => (
                                    <p key={item} className='auto-trades-ai-modal__warning'>
                                        {item}
                                    </p>
                                ))}
                            </div>
                        )}
                        <div className='auto-trades-ai-modal__footer'>
                            <button
                                className='auto-trades-ai-modal__secondary'
                                onClick={() => setShowAiStrategy(false)}
                                disabled={aiStrategyLoading}
                                type='button'
                            >
                                Cancel
                            </button>
                            <button
                                className='auto-trades-ai-modal__primary'
                                onClick={applyAiStrategy}
                                disabled={aiStrategyLoading}
                                type='button'
                            >
                                {aiStrategyLoading ? 'Thinking...' : 'Apply Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default AutoTrades;
