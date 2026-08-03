type AutoTradePresetTradeType =
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

type AutoTradePresetStrategyMode = 'STANDARD' | 'INVERSE' | 'PERCENTAGE';
type AutoTradePresetMartingaleMode =
    | 'no_martingale'
    | 'after_one_loss'
    | 'after_two_losses'
    | 'custom_consecutive_loss_trigger';

export type AutoTradeStrategyPresetSettings = {
    tradeType: AutoTradePresetTradeType;
    barrier?: string;
    predictionBeforeLoss?: string;
    predictionAfterLoss?: string;
    analysisTicks: string;
    selectedMarketSymbols: string[];
    stake: string;
    martingale: string;
    takeProfit: string;
    stopLoss: string;
    streak: string;
    strategyMode: AutoTradePresetStrategyMode;
    martingaleMode: AutoTradePresetMartingaleMode;
    consecutiveLossCount: string;
};

export type AutoTradeStrategyPreset = {
    id: string;
    familyId: string;
    familyName: string;
    name: string;
    description: string;
    settings: AutoTradeStrategyPresetSettings;
    summary: string[];
    confidence: number;
};

export type AutoTradeStrategyFamily = {
    id: string;
    name: string;
    description: string;
    presetIds: string[];
};

export const AUTO_TRADE_PRESET_ALL_MARKETS = SUPPORTED_VOLATILITY_MARKETS.map(({ symbol }) => symbol);

const TRADE_BLUEPRINTS: Array<{ tradeType: AutoTradePresetTradeType; label: string; baseBarrier: string }> = [
    { tradeType: 'DIGITOVER', label: 'Over', baseBarrier: '2' },
    { tradeType: 'DIGITUNDER', label: 'Under', baseBarrier: '8' },
    { tradeType: 'DIGITEVEN', label: 'Even', baseBarrier: '4' },
    { tradeType: 'DIGITODD', label: 'Odd', baseBarrier: '4' },
    { tradeType: 'DIGITMATCH', label: 'Matches', baseBarrier: '4' },
    { tradeType: 'DIGITDIFF', label: 'Differs', baseBarrier: '4' },
    { tradeType: 'CALL', label: 'Rise', baseBarrier: '4' },
    { tradeType: 'PUT', label: 'Fall', baseBarrier: '4' },
    { tradeType: 'RUNHIGH', label: 'Only Ups', baseBarrier: '4' },
    { tradeType: 'RUNLOW', label: 'Only Downs', baseBarrier: '4' },
];

const PROFILE_BLUEPRINTS: Array<{
    label: string;
    strategyMode: AutoTradePresetStrategyMode;
    martingaleMode: AutoTradePresetMartingaleMode;
    consecutiveLossCount: number;
    stakeBase: number;
    martingaleBase: number;
    takeProfitBase: number;
    stopLossBase: number;
    streakBase: number;
    confidenceBase: number;
}> = [
    {
        label: 'Conservative Streak',
        strategyMode: 'STANDARD',
        martingaleMode: 'after_two_losses',
        consecutiveLossCount: 2,
        stakeBase: 0.35,
        martingaleBase: 1.6,
        takeProfitBase: 4,
        stopLossBase: 2,
        streakBase: 4,
        confidenceBase: 0.82,
    },
    {
        label: 'Balanced Flow',
        strategyMode: 'STANDARD',
        martingaleMode: 'after_one_loss',
        consecutiveLossCount: 1,
        stakeBase: 0.5,
        martingaleBase: 1.8,
        takeProfitBase: 6,
        stopLossBase: 3,
        streakBase: 3,
        confidenceBase: 0.78,
    },
    {
        label: 'Fast Tick',
        strategyMode: 'STANDARD',
        martingaleMode: 'no_martingale',
        consecutiveLossCount: 1,
        stakeBase: 0.35,
        martingaleBase: 1.2,
        takeProfitBase: 3,
        stopLossBase: 2,
        streakBase: 1,
        confidenceBase: 0.72,
    },
    {
        label: 'Recovery Filter',
        strategyMode: 'STANDARD',
        martingaleMode: 'custom_consecutive_loss_trigger',
        consecutiveLossCount: 3,
        stakeBase: 0.45,
        martingaleBase: 2.1,
        takeProfitBase: 8,
        stopLossBase: 4,
        streakBase: 5,
        confidenceBase: 0.84,
    },
    {
        label: 'Percentage Edge',
        strategyMode: 'PERCENTAGE',
        martingaleMode: 'after_two_losses',
        consecutiveLossCount: 2,
        stakeBase: 0.35,
        martingaleBase: 1.5,
        takeProfitBase: 5,
        stopLossBase: 3,
        streakBase: 4,
        confidenceBase: 0.86,
    },
    {
        label: 'Inverse Pulse',
        strategyMode: 'INVERSE',
        martingaleMode: 'after_one_loss',
        consecutiveLossCount: 1,
        stakeBase: 0.5,
        martingaleBase: 1.7,
        takeProfitBase: 6,
        stopLossBase: 3,
        streakBase: 3,
        confidenceBase: 0.76,
    },
    {
        label: 'Low Stake Guard',
        strategyMode: 'STANDARD',
        martingaleMode: 'no_martingale',
        consecutiveLossCount: 1,
        stakeBase: 0.35,
        martingaleBase: 1.1,
        takeProfitBase: 2,
        stopLossBase: 1,
        streakBase: 4,
        confidenceBase: 0.8,
    },
    {
        label: 'High Momentum',
        strategyMode: 'PERCENTAGE',
        martingaleMode: 'after_one_loss',
        consecutiveLossCount: 1,
        stakeBase: 0.7,
        martingaleBase: 2,
        takeProfitBase: 9,
        stopLossBase: 5,
        streakBase: 2,
        confidenceBase: 0.79,
    },
    {
        label: 'Long Confirmation',
        strategyMode: 'STANDARD',
        martingaleMode: 'custom_consecutive_loss_trigger',
        consecutiveLossCount: 4,
        stakeBase: 0.4,
        martingaleBase: 1.9,
        takeProfitBase: 7,
        stopLossBase: 4,
        streakBase: 6,
        confidenceBase: 0.88,
    },
    {
        label: 'Strict Inverse',
        strategyMode: 'INVERSE',
        martingaleMode: 'after_two_losses',
        consecutiveLossCount: 2,
        stakeBase: 0.35,
        martingaleBase: 1.6,
        takeProfitBase: 5,
        stopLossBase: 3,
        streakBase: 5,
        confidenceBase: 0.83,
    },
];

const VARIANT_BLUEPRINTS = [
    { label: 'Micro 1 Tick', ticks: 1, stakeLift: 0, streakLift: 0 },
    { label: 'Fast 2 Tick', ticks: 2, stakeLift: 0.05, streakLift: 0 },
    { label: 'Tight 3 Tick', ticks: 3, stakeLift: 0.1, streakLift: 1 },
    { label: 'Steady 4 Tick', ticks: 4, stakeLift: 0.15, streakLift: 1 },
    { label: 'Balanced 5 Tick', ticks: 5, stakeLift: 0.2, streakLift: 2 },
    { label: 'Extended 6 Tick', ticks: 6, stakeLift: 0.25, streakLift: 2 },
    { label: 'Patient 7 Tick', ticks: 7, stakeLift: 0.3, streakLift: 3 },
    { label: 'Deep 8 Tick', ticks: 8, stakeLift: 0.35, streakLift: 3 },
    { label: 'Slow 9 Tick', ticks: 9, stakeLift: 0.4, streakLift: 4 },
    { label: 'Full 10 Tick', ticks: 10, stakeLift: 0.45, streakLift: 4 },
];

const formatNumber = (value: number) => {
    const fixed = value.toFixed(2);
    return fixed.endsWith('00') ? String(Math.round(value)) : fixed.replace(/0$/, '');
};

const getDigitSettings = (
    tradeType: AutoTradePresetTradeType,
    tradeIndex: number,
    profileIndex: number,
    variantIndex: number,
    baseBarrier: string
) => {
    const seed = tradeIndex * 17 + profileIndex * 7 + variantIndex;

    if (tradeType === 'DIGITOVER') {
        const before = seed % 9;
        const after = Math.min(8, before + 2);
        return {
            barrier: String(before),
            predictionBeforeLoss: String(before),
            predictionAfterLoss: String(after),
        };
    }

    if (tradeType === 'DIGITUNDER') {
        const before = 9 - (seed % 9);
        const after = Math.max(1, before - 2);
        return {
            barrier: String(before),
            predictionBeforeLoss: String(before),
            predictionAfterLoss: String(after),
        };
    }

    if (tradeType === 'DIGITMATCH' || tradeType === 'DIGITDIFF') {
        return { barrier: String(seed % 10) };
    }

    return { barrier: baseBarrier };
};

const buildPreset = (
    trade: (typeof TRADE_BLUEPRINTS)[number],
    profile: (typeof PROFILE_BLUEPRINTS)[number],
    variant: (typeof VARIANT_BLUEPRINTS)[number],
    tradeIndex: number,
    profileIndex: number,
    variantIndex: number
): AutoTradeStrategyPreset => {
    const familyId = `family-${tradeIndex + 1}-${profileIndex + 1}`;
    const digitSettings = getDigitSettings(trade.tradeType, tradeIndex, profileIndex, variantIndex, trade.baseBarrier);
    const streak = Math.min(10, Math.max(1, profile.streakBase + variant.streakLift));
    const stake = profile.stakeBase + variant.stakeLift;
    const martingale = Math.max(1.01, profile.martingaleBase + variantIndex * 0.03);
    const takeProfit = profile.takeProfitBase + variantIndex;
    const stopLoss = profile.stopLossBase + Math.floor(variantIndex / 2);
    const confidence = Math.min(0.95, profile.confidenceBase + variantIndex * 0.005);

    const settings: AutoTradeStrategyPresetSettings = {
        tradeType: trade.tradeType,
        ...digitSettings,
        analysisTicks: String(variant.ticks),
        selectedMarketSymbols: [...AUTO_TRADE_PRESET_ALL_MARKETS],
        stake: formatNumber(stake),
        martingale: formatNumber(martingale),
        takeProfit: formatNumber(takeProfit),
        stopLoss: formatNumber(stopLoss),
        streak: String(streak),
        strategyMode: profile.strategyMode,
        martingaleMode: profile.martingaleMode,
        consecutiveLossCount: String(profile.consecutiveLossCount),
    };

    const predictionSummary =
        trade.tradeType === 'DIGITOVER' || trade.tradeType === 'DIGITUNDER'
            ? `W ${settings.predictionBeforeLoss} / L ${settings.predictionAfterLoss}`
            : `Barrier ${settings.barrier ?? 'none'}`;

    return {
        id: `preset-${tradeIndex + 1}-${profileIndex + 1}-${variantIndex + 1}`,
        familyId,
        familyName: `${trade.label} ${profile.label}`,
        name: `${trade.label} ${profile.label} - ${variant.label}`,
        description: `${trade.label} ${profile.label} ${variant.label} across all Auto Trades markets.`,
        settings,
        summary: [
            `${trade.label} ${profile.label}`,
            `${variant.ticks} tick${variant.ticks === 1 ? '' : 's'}, streak ${streak}`,
            predictionSummary,
            `Stake ${settings.stake}, martingale ${settings.martingale}, ${profile.martingaleMode.replace(/_/g, ' ')}`,
            'All Auto Trades markets selected',
        ],
        confidence,
    };
};

export const AUTO_TRADE_STRATEGY_PRESETS: AutoTradeStrategyPreset[] = TRADE_BLUEPRINTS.flatMap((trade, tradeIndex) =>
    PROFILE_BLUEPRINTS.flatMap((profile, profileIndex) =>
        VARIANT_BLUEPRINTS.map((variant, variantIndex) =>
            buildPreset(trade, profile, variant, tradeIndex, profileIndex, variantIndex)
        )
    )
);

export const AUTO_TRADE_STRATEGY_FAMILIES: AutoTradeStrategyFamily[] = TRADE_BLUEPRINTS.flatMap((trade, tradeIndex) =>
    PROFILE_BLUEPRINTS.map((profile, profileIndex) => {
        const id = `family-${tradeIndex + 1}-${profileIndex + 1}`;
        return {
            id,
            name: `${trade.label} ${profile.label}`,
            description: `${trade.label} ${profile.label} presets for all supported Auto Trades markets.`,
            presetIds: AUTO_TRADE_STRATEGY_PRESETS.filter(preset => preset.familyId === id).map(preset => preset.id),
        };
    })
);

export const AUTO_TRADE_STRATEGY_PRESET_LOOKUP = new Map(
    AUTO_TRADE_STRATEGY_PRESETS.map(preset => [preset.id, preset])
);

export const AUTO_TRADE_STRATEGY_PRESET_COUNT = AUTO_TRADE_STRATEGY_PRESETS.length;
export const AUTO_TRADE_STRATEGY_FAMILY_COUNT = AUTO_TRADE_STRATEGY_FAMILIES.length;
import { SUPPORTED_VOLATILITY_MARKETS } from '@/utils/digit-strategy';
