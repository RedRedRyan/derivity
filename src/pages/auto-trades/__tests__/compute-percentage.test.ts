import {
    computePercentage,
    getEffectiveSignalStreak,
    getNextMartingaleState,
    getPercentageSnapshot,
    getPredictionForLastOutcome,
    hasRequiredDigitStreak,
    isPercentageSignalReady,
    normalizeAiAutoTradePlan,
    parseAiAutoTradeStrategy,
} from '../auto-trades';
import {
    AUTO_TRADE_PRESET_ALL_MARKETS,
    AUTO_TRADE_STRATEGY_FAMILIES,
    AUTO_TRADE_STRATEGY_PRESETS,
} from '../strategy-presets';

jest.mock('@/hooks/useStore', () => ({
    useStore: jest.fn(() => ({
        dashboard: {
            active_tab: 'auto_trades',
            setActiveTradingModule: jest.fn(),
            registerTradingStopHandler: jest.fn(),
            unregisterTradingStopHandler: jest.fn(),
        },
        client: { currency: 'USD', is_logged_in: true },
        summary_card: { onBotContractEvent: jest.fn() },
        transactions: { pushTransaction: jest.fn() },
        run_panel: {
            run_id: 'run-1',
            is_running: false,
            setIsRunning: jest.fn(),
            setRunId: jest.fn(),
            setHasOpenContract: jest.fn(),
            setContractStage: jest.fn(),
            setShowBotStopMessage: jest.fn(),
            toggleDrawer: jest.fn(),
            registerBotListeners: jest.fn(),
            unregisterBotListeners: jest.fn(),
            onMount: jest.fn(),
            onUnmount: jest.fn(),
            onBotRunningEvent: jest.fn(),
            onContractStatusEvent: jest.fn(),
            onError: jest.fn(),
            onBotContractEvent: jest.fn(),
            SetpurchaseInProgress: jest.fn(),
        },
    })),
}));

describe('computePercentage', () => {
    it('should correctly calculate the percentage', () => {
        expect(computePercentage(100, 50)).toBe(50);
        expect(computePercentage(200, 50)).toBe(25);
        expect(computePercentage(10, 1)).toBe(10);
    });

    it('should handle zero baseAmount safely', () => {
        expect(computePercentage(0, 50)).toBe(0);
    });

    it('should handle NaN inputs safely', () => {
        expect(computePercentage(NaN, 50)).toBe(0);
        expect(computePercentage(100, NaN)).toBe(0);
        expect(computePercentage(NaN, NaN)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
        expect(computePercentage(3, 1)).toBe(33.33);
        expect(computePercentage(7, 2)).toBe(28.57);
    });

    it('should handle negative values if they occur', () => {
        expect(computePercentage(100, -50)).toBe(-50);
    });
});

describe('percentage mode trade calculations', () => {
    const buildState = (digitHistory: number[], digitPercentages: Record<number, number>, extra = {}) =>
        ({
            digitHistory,
            digitPercentages,
            directionSampleHistory: [],
            confidenceScore: 90,
            ...extra,
        }) as any;

    it('calculates Digit Over and Under against the selected barrier', () => {
        const state = buildState(Array(100).fill(0), {
            0: 4,
            1: 4,
            2: 5,
            3: 5,
            4: 6,
            5: 20,
            6: 20,
            7: 16,
            8: 12,
            9: 8,
        });

        expect(getPercentageSnapshot('DIGITOVER' as any, state, 4)).toMatchObject({
            primaryLabel: 'Over 4',
            primaryPercentage: 76,
            secondaryPercentage: 24,
            confidence: 90,
            sampleSize: 100,
        });
        expect(getPercentageSnapshot('DIGITUNDER' as any, state, 5)).toMatchObject({
            primaryLabel: 'Under 5',
            primaryPercentage: 24,
            secondaryPercentage: 76,
        });
    });

    it('does not execute percentage signals until enough samples are collected', () => {
        const state = buildState(
            Array(99).fill(7),
            { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 99, 8: 0, 9: 0 },
            { confidenceScore: 100 }
        );

        expect(isPercentageSignalReady('DIGITOVER' as any, state, 4)).toBe(false);
    });

    it('executes percentage signals when percentage, confidence, and sample size are valid', () => {
        const state = buildState(
            Array(100).fill(7),
            { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 20, 6: 20, 7: 20, 8: 20, 9: 15 },
            { confidenceScore: 92 }
        );

        expect(isPercentageSignalReady('DIGITOVER' as any, state, 4)).toBe(true);
    });
});

describe('Over/Under prediction selection', () => {
    const baseConfig = {
        prediction_before_loss: 4,
        prediction_after_loss: 7,
        fallback_barrier: 2,
    };

    it('uses Prediction Before Loss after a previous win', () => {
        expect(
            getPredictionForLastOutcome({
                trade_type: 'DIGITOVER',
                last_result: 'win',
                ...baseConfig,
            })
        ).toBe(4);
    });

    it('uses Prediction After Loss after a previous loss', () => {
        expect(
            getPredictionForLastOutcome({
                trade_type: 'DIGITUNDER',
                last_result: 'loss',
                ...baseConfig,
            })
        ).toBe(7);
    });

    it('keeps using Prediction After Loss while the loss streak continues beyond two losses', () => {
        expect(
            getPredictionForLastOutcome({
                trade_type: 'DIGITUNDER',
                last_result: 'loss',
                consecutive_losses: 3,
                ...baseConfig,
            })
        ).toBe(7);
    });

    it('uses Prediction Before Loss for the first trade before any previous outcome exists', () => {
        expect(
            getPredictionForLastOutcome({
                trade_type: 'DIGITOVER',
                last_result: null,
                ...baseConfig,
            })
        ).toBe(4);
    });

    it('keeps non Over/Under contracts on the normal barrier value', () => {
        expect(
            getPredictionForLastOutcome({
                trade_type: 'DIGITMATCH',
                last_result: 'loss',
                ...baseConfig,
            })
        ).toBe(2);
    });
});

describe('martingale progression', () => {
    it('continues multiplying after the second loss when martingale starts after two losses', () => {
        const firstLoss = getNextMartingaleState({
            profit: -0.35,
            current_stake: 0.35,
            base_stake: 0.35,
            multiplier: 2,
            martingale_mode: 'after_two_losses',
            consecutive_losses: 0,
            consecutive_loss_trigger: 2,
        });

        expect(firstLoss).toMatchObject({
            consecutiveLosses: 1,
            lastResult: 'loss',
            nextStake: 0.35,
        });

        const secondLoss = getNextMartingaleState({
            profit: -0.35,
            current_stake: firstLoss.nextStake,
            base_stake: 0.35,
            multiplier: 2,
            martingale_mode: 'after_two_losses',
            consecutive_losses: firstLoss.consecutiveLosses,
            consecutive_loss_trigger: 2,
        });

        expect(secondLoss).toMatchObject({
            consecutiveLosses: 2,
            lastResult: 'loss',
            nextStake: 0.7,
        });

        const thirdLoss = getNextMartingaleState({
            profit: -0.7,
            current_stake: secondLoss.nextStake,
            base_stake: 0.35,
            multiplier: 2,
            martingale_mode: 'after_two_losses',
            consecutive_losses: secondLoss.consecutiveLosses,
            consecutive_loss_trigger: 2,
        });

        expect(thirdLoss).toMatchObject({
            consecutiveLosses: 3,
            lastResult: 'loss',
            nextStake: 1.4,
        });
    });

    it('resets back to base stake after a win', () => {
        expect(
            getNextMartingaleState({
                profit: 0.6,
                current_stake: 1.4,
                base_stake: 0.35,
                multiplier: 2,
                martingale_mode: 'after_two_losses',
                consecutive_losses: 3,
                consecutive_loss_trigger: 2,
            })
        ).toMatchObject({
            consecutiveLosses: 0,
            lastResult: 'win',
            nextStake: 0.35,
        });
    });

    it('keeps recovery stake and after-loss state while percentage total P/L is not positive', () => {
        expect(
            getNextMartingaleState({
                profit: 0.6,
                current_stake: 1.4,
                base_stake: 0.35,
                multiplier: 2,
                martingale_mode: 'after_one_loss',
                consecutive_losses: 2,
                consecutive_loss_trigger: 1,
                recover_until_total_profit: true,
                total_profit_after_trade: -0.2,
            })
        ).toMatchObject({
            consecutiveLosses: 2,
            lastResult: 'loss',
            nextStake: 1.4,
        });
    });

    it('resets percentage recovery once total P/L becomes profitable', () => {
        expect(
            getNextMartingaleState({
                profit: 1.5,
                current_stake: 1.4,
                base_stake: 0.35,
                multiplier: 2,
                martingale_mode: 'after_one_loss',
                consecutive_losses: 2,
                consecutive_loss_trigger: 1,
                recover_until_total_profit: true,
                total_profit_after_trade: 0.1,
            })
        ).toMatchObject({
            consecutiveLosses: 0,
            lastResult: 'win',
            nextStake: 0.35,
        });
    });
});

describe('risk-filtered streak gating', () => {
    it('requires at least a 3-digit streak for Digit Under and Digit Over strategies', () => {
        expect(getEffectiveSignalStreak({ trade_type: 'DIGITUNDER', configured_streak: 2 })).toBe(3);
        expect(getEffectiveSignalStreak({ trade_type: 'DIGITOVER', configured_streak: 1 })).toBe(3);
        expect(getEffectiveSignalStreak({ trade_type: 'DIGITUNDER', configured_streak: 5 })).toBe(5);
        expect(getEffectiveSignalStreak({ trade_type: 'DIGITEVEN', configured_streak: 2 })).toBe(2);
    });

    it('allows one matching digit for Digit Match and Differs strategies', () => {
        expect(getEffectiveSignalStreak({ trade_type: 'DIGITDIFF', configured_streak: 1 })).toBe(1);
        expect(getEffectiveSignalStreak({ trade_type: 'DIGITMATCH', configured_streak: 1 })).toBe(1);
    });

    it('recognizes digit 0 as a valid Differs barrier trigger', () => {
        expect(
            hasRequiredDigitStreak({
                trade_type: 'DIGITDIFF',
                digits: [7, 3, 0],
                barrier: 0,
                inverse: false,
                streak: 1,
            })
        ).toBe(true);
    });

    it('accepts a Digit Under streak only when the trailing digits all satisfy the active barrier', () => {
        expect(
            hasRequiredDigitStreak({
                trade_type: 'DIGITUNDER',
                digits: [1, 8, 9, 8],
                barrier: 8,
                inverse: false,
                streak: 3,
            })
        ).toBe(true);

        expect(
            hasRequiredDigitStreak({
                trade_type: 'DIGITUNDER',
                digits: [8, 7, 8],
                barrier: 8,
                inverse: false,
                streak: 3,
            })
        ).toBe(false);
    });

    it('applies the inverse low-digit filter for Digit Over recovery streaks', () => {
        expect(
            hasRequiredDigitStreak({
                trade_type: 'DIGITOVER',
                digits: [4, 2, 1, 2],
                barrier: 2,
                inverse: false,
                streak: 3,
            })
        ).toBe(true);

        expect(
            hasRequiredDigitStreak({
                trade_type: 'DIGITOVER',
                digits: [2, 3, 2],
                barrier: 2,
                inverse: false,
                streak: 3,
            })
        ).toBe(false);
    });
});

describe('parseAiAutoTradeStrategy', () => {
    it('understands an Over strategy with after-loss prediction, ticks, and V25 market', () => {
        const result = parseAiAutoTradeStrategy(
            'I want to trade over 1 and in case of a loss over 3 using 1 tick only on V25 index'
        );

        expect(result.settings).toMatchObject({
            tradeType: 'DIGITOVER',
            predictionBeforeLoss: '1',
            predictionAfterLoss: '3',
            analysisTicks: '1',
            selectedMarketSymbols: ['R_25'],
            strategyMode: 'STANDARD',
        });
        expect(result.warnings).toHaveLength(0);
    });

    it('maps one-second volatility requests to 1HZ symbols', () => {
        const result = parseAiAutoTradeStrategy('Only trade over 4 on volatility 25 1s using 2 ticks');

        expect(result.settings).toMatchObject({
            tradeType: 'DIGITOVER',
            predictionBeforeLoss: '4',
            analysisTicks: '2',
            selectedMarketSymbols: ['1HZ25V'],
        });
    });

    it('understands direction strategies and risk settings', () => {
        const result = parseAiAutoTradeStrategy(
            'Rise on V50 with streak 5 stake 2 martingale 3 take profit 20 stop loss 10'
        );

        expect(result.settings).toMatchObject({
            tradeType: 'CALL',
            selectedMarketSymbols: ['R_50'],
            streak: '5',
            stake: '2',
            martingale: '3',
            takeProfit: '20',
            stopLoss: '10',
        });
    });

    it('normalizes OpenAI strategy plans before applying settings', () => {
        const result = normalizeAiAutoTradePlan({
            settings: {
                tradeType: 'DIGITOVER',
                predictionBeforeLoss: '1',
                predictionAfterLoss: '99',
                analysisTicks: '3',
                selectedMarketSymbols: ['R_25', 'BOOM500'],
                stake: '2',
                strategyMode: 'PERCENTAGE',
            },
            summary: ['Use over 1'],
            warnings: [],
            unsupportedCapabilities: ['BOOM500 market is not supported by Auto Trades.'],
            source: 'openai',
        });

        expect(result.settings).toMatchObject({
            tradeType: 'DIGITOVER',
            predictionBeforeLoss: '1',
            analysisTicks: '3',
            selectedMarketSymbols: ['R_25'],
            stake: '2',
            strategyMode: 'PERCENTAGE',
        });
        expect(result.settings.predictionAfterLoss).toBeUndefined();
        expect(result.unsupportedCapabilities).toEqual(['BOOM500 market is not supported by Auto Trades.']);
    });
});

describe('auto trade strategy presets', () => {
    it('provides 100 strategy families and 1000 loadable settings', () => {
        expect(AUTO_TRADE_STRATEGY_FAMILIES).toHaveLength(100);
        expect(AUTO_TRADE_STRATEGY_PRESETS).toHaveLength(1000);

        expect(new Set(AUTO_TRADE_STRATEGY_FAMILIES.map(family => family.id)).size).toBe(100);
        expect(new Set(AUTO_TRADE_STRATEGY_PRESETS.map(preset => preset.id)).size).toBe(1000);
        expect(AUTO_TRADE_STRATEGY_FAMILIES.every(family => family.presetIds.length === 10)).toBe(true);
    });

    it('keeps every preset valid for all Auto Trades markets', () => {
        AUTO_TRADE_STRATEGY_PRESETS.forEach(preset => {
            expect(preset.settings.selectedMarketSymbols).toEqual(AUTO_TRADE_PRESET_ALL_MARKETS);

            const normalized = normalizeAiAutoTradePlan({
                settings: preset.settings,
                summary: preset.summary,
                warnings: [],
                confidence: preset.confidence,
                source: 'preset',
            });

            expect(normalized.settings.tradeType).toBe(preset.settings.tradeType);
            expect(normalized.settings.selectedMarketSymbols).toEqual(AUTO_TRADE_PRESET_ALL_MARKETS);
            expect(normalized.settings.analysisTicks).toBe(preset.settings.analysisTicks);
            expect(normalized.settings.streak).toBe(preset.settings.streak);
            expect(normalized.settings.martingaleMode).toBe(preset.settings.martingaleMode);
            expect(normalized.source).toBe('preset');
        });
    });

    it('includes zero-digit barrier settings for differs and matches', () => {
        expect(
            AUTO_TRADE_STRATEGY_PRESETS.some(
                preset => preset.settings.tradeType === 'DIGITDIFF' && preset.settings.barrier === '0'
            )
        ).toBe(true);
        expect(
            AUTO_TRADE_STRATEGY_PRESETS.some(
                preset => preset.settings.tradeType === 'DIGITMATCH' && preset.settings.barrier === '0'
            )
        ).toBe(true);
    });
});
