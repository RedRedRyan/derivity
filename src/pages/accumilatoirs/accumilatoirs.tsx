import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import ThemedScrollbars from '@/components/shared_ui/themed-scrollbars';
import { contract_stages } from '@/constants/contract-stage';
import { DBOT_TABS } from '@/constants/bot-contents';
import { api_base } from '@/external/bot-skeleton';
import { useStore } from '@/hooks/useStore';
import ChartWrapper from '@/pages/chart/chart-wrapper';
import { SUPPORTED_VOLATILITY_MARKETS } from '@/utils/digit-strategy';
import { isExpectedStreamInterruption } from '@/utils/market-data';
import {
    buyContractForUi,
    normalizeTradeParameters,
    sellContractForUi,
    streamContractUntilSettled,
} from '@/utils/trade-purchase';
import { safeSubscribe } from '@/utils/websocket-handler';

type TAccumulatorMarket = {
    label: string;
    symbol: string;
};

type TTickSnapshot = {
    epoch: number;
    quote: number;
};

type THistoryMove = {
    className: 'high' | 'low' | 'medium';
    value: string;
};

type TProposalPreview = {
    askPrice: number;
    currency: string;
    highBarrier?: number;
    lowBarrier?: number;
    maxPayout?: number;
    maxTicks?: number;
    message: string;
    minStake?: number;
    spot?: number;
    status: 'idle' | 'loading' | 'ready' | 'error';
    tickSizeBarrier?: number;
};

type TAutoCashoutSettings = {
    enabled: boolean;
    takeProfitPercent: string;
    useServerTakeProfit: boolean;
};

type MartingaleModeType = 'no_martingale' | 'after_one_loss' | 'after_two_losses' | 'custom_consecutive_loss_trigger';

const ACCUMULATOR_MARKETS: TAccumulatorMarket[] = SUPPORTED_VOLATILITY_MARKETS.map(({ label, symbol }) => ({
    label,
    symbol,
}));

const GROWTH_RATES = [
    { label: '1%', value: '0.01' },
    { label: '2%', value: '0.02' },
    { label: '3%', value: '0.03' },
    { label: '4%', value: '0.04' },
    { label: '5%', value: '0.05' },
];

const DEFAULT_STAKE = '1';
const DEFAULT_TAKE_PROFIT_PERCENT = '100';
const DEFAULT_MARTINGALE = '2';
const PROPOSAL_REFRESH_MS = 500;
const INITIAL_RETURN_PERCENT = 0;
const MAX_GRAPH_TICKS = 60;
const MAX_HISTORY_MOVES = 28;

const cleanMoneyInput = (value: string) => value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');

const formatMoney = (value: unknown, currency = 'USD') => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return `0.00 ${currency}`;

    return `${amount.toFixed(2)} ${currency}`;
};

const getTakeProfitAmountFromPercent = (stakeAmount: unknown, takeProfitPercent: unknown) => {
    const stake = Number(stakeAmount);
    const percent = Number(takeProfitPercent);
    if (!Number.isFinite(stake) || stake <= 0 || !Number.isFinite(percent) || percent <= 0) return 0;

    return Number(((stake * percent) / 100).toFixed(2));
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

const loadSaved = (key: string, fallback: string) => {
    try {
        return localStorage.getItem(`accumilatoirs_${key}`) || fallback;
    } catch {
        return fallback;
    }
};

const loadSavedNum = (key: string, fallback: string, min: number, max: number) => {
    const value = loadSaved(key, fallback);
    const numberValue = Number(value);
    return !isNaN(numberValue) && numberValue >= min && numberValue <= max ? value : fallback;
};

const getInitialConsecutiveLossThreshold = () => {
    try {
        const saved = localStorage.getItem('accumilatoirs_consecutiveLossCount');
        return clampConsecutiveLossThreshold(saved || 2);
    } catch {
        return 2;
    }
};

const getNextMartingaleState = ({
    profit,
    current_stake,
    base_stake,
    multiplier,
    martingale_mode,
    consecutive_losses,
    consecutive_loss_trigger,
}: {
    profit: number;
    current_stake: number;
    base_stake: number;
    multiplier: number;
    martingale_mode: MartingaleModeType;
    consecutive_losses: number;
    consecutive_loss_trigger: number;
}) => {
    if (!(profit < 0)) {
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

const getTickFromResponse = (data: any): TTickSnapshot | null => {
    const quote = Number(data?.tick?.quote);
    if (!Number.isFinite(quote)) return null;

    return {
        epoch: Number(data?.tick?.epoch) || Math.floor(Date.now() / 1000),
        quote,
    };
};

const getTickFromContract = (contract: Record<string, any>): TTickSnapshot | null => {
    const quote = Number(
        contract?.current_spot ??
            contract?.current_tick ??
            contract?.spot ??
            contract?.entry_tick ??
            contract?.entry_spot ??
            contract?.exit_tick ??
            contract?.exit_spot
    );
    if (!Number.isFinite(quote)) return null;

    return {
        epoch:
            Number(contract?.current_spot_time) ||
            Number(contract?.tick_time) ||
            Number(contract?.entry_tick_time) ||
            Number(contract?.exit_tick_time) ||
            Math.floor(Date.now() / 1000),
        quote,
    };
};

const appendTick = (ticks: TTickSnapshot[], tick: TTickSnapshot) => {
    const lastTick = ticks[ticks.length - 1];
    if (lastTick?.epoch === tick.epoch && lastTick.quote === tick.quote) return ticks;

    return [...ticks, tick].slice(-MAX_GRAPH_TICKS);
};

const getAccumulatorReturnPercent = (survivedTicks: number, growthRateValue: unknown) => {
    const ticks = Math.max(0, Math.floor(Number(survivedTicks) || 0));
    const rate = Number(growthRateValue);
    if (!Number.isFinite(rate) || rate <= 0 || ticks <= 0) return 0;

    return Number(((Math.pow(1 + rate, ticks) - 1) * 100).toFixed(2));
};

const hasAccumulatorBarrierBreakout = (quote: number, entryQuote: number, tickSizeBarrier: unknown) => {
    const barrier = Number(tickSizeBarrier);
    if (!Number.isFinite(quote) || !Number.isFinite(entryQuote) || !Number.isFinite(barrier) || barrier <= 0) {
        return false;
    }

    return quote >= entryQuote + barrier || quote <= entryQuote - barrier;
};

const classifyMove = (value: number): THistoryMove['className'] => {
    if (value >= 1) return 'high';
    if (value >= 0.25) return 'medium';
    return 'low';
};

const formatPercent = (value: unknown) => {
    const percent = Number(value);
    if (!Number.isFinite(percent)) return '0.00%';

    return `${percent.toFixed(2)}%`;
};

const formatQuote = (value: unknown) => {
    const quote = Number(value);
    if (!Number.isFinite(quote)) return '-';

    return quote.toFixed(5).replace(/0+$/, '').replace(/\.$/, '');
};

const getFirstFiniteNumber = (...values: unknown[]) => {
    for (const value of values) {
        const numberValue = Number(value);
        if (Number.isFinite(numberValue) && numberValue > 0) return numberValue;
    }

    return undefined;
};

const getProposalTickSizeBarrier = (proposal: any) =>
    getFirstFiniteNumber(
        proposal?.contract_details?.tick_size_barrier,
        proposal?.contract_details?.barrier_spot_distance,
        proposal?.contract_details?.barrier_offset,
        proposal?.tick_size_barrier,
        proposal?.barrier_spot_distance,
        proposal?.barrier_offset,
        Math.abs(Number(proposal?.contract_details?.high_barrier) - Number(proposal?.spot)),
        Math.abs(Number(proposal?.spot) - Number(proposal?.contract_details?.low_barrier)),
        Math.abs(Number(proposal?.high_barrier) - Number(proposal?.spot)),
        Math.abs(Number(proposal?.spot) - Number(proposal?.low_barrier))
    );

const getProposalSpot = (proposal: any) => {
    const spot = Number(proposal?.spot);
    return Number.isFinite(spot) ? spot : undefined;
};

const getProposalSpotTime = (proposal: any) => {
    const spotTime = Number(proposal?.spot_time ?? proposal?.contract_details?.last_tick_epoch);
    return Number.isFinite(spotTime) ? spotTime : undefined;
};

const getProposalBarriers = (proposal: any) => {
    const details = proposal?.contract_details ?? {};
    const high = Number(details.high_barrier ?? proposal?.high_barrier);
    const low = Number(details.low_barrier ?? proposal?.low_barrier);

    if (!Number.isFinite(high) || !Number.isFinite(low)) return null;

    return { high, low };
};

const hasCrossedProposalBarriers = (spot: number | undefined, barriers: { high: number; low: number } | null) =>
    Number.isFinite(spot) &&
    Boolean(barriers) &&
    (Number(spot) >= Number(barriers?.high) || Number(spot) <= Number(barriers?.low));

const getReturnPercent = (cashoutValue: unknown, buyValue: unknown) => {
    const cashout = Number(cashoutValue);
    const buy = Number(buyValue);
    if (!Number.isFinite(cashout) || !Number.isFinite(buy) || buy <= 0) return 0;

    return Number((((cashout - buy) / buy) * 100).toFixed(2));
};

const buildHistoryMoves = (
    ticks: TTickSnapshot[],
    tickSizeBarrier: unknown,
    growthRateValue: unknown
): THistoryMove[] => {
    if (ticks.length < 2) return [];

    let entryQuote = ticks[0].quote;
    let survivedTicks = 0;

    return ticks
        .slice(1)
        .reduce<THistoryMove[]>((moves, tick) => {
            if (hasAccumulatorBarrierBreakout(tick.quote, entryQuote, tickSizeBarrier)) {
                const value = getAccumulatorReturnPercent(survivedTicks, growthRateValue);
                if (value > 0) {
                    moves.push({
                        className: classifyMove(value),
                        value: formatPercent(value),
                    });
                }
                entryQuote = tick.quote;
                survivedTicks = 0;
                return moves;
            }

            survivedTicks += 1;
            return moves;
        }, [])
        .slice(-MAX_HISTORY_MOVES);
};

const Accumilatoirs = observer(() => {
    const { chart_store, client, dashboard, run_panel, summary_card, transactions, ui } = useStore();
    const { active_tab } = dashboard;
    const showAccumilatoirs = active_tab === DBOT_TABS.ACCUMILATOIRS;
    const currency = client.currency || 'USD';

    const [selectedSymbol, setSelectedSymbol] = useState(ACCUMULATOR_MARKETS[0]?.symbol ?? 'R_100');
    const [stakeInput, setStakeInput] = useState(() => loadSavedNum('stake', DEFAULT_STAKE, 0.01, 100000));
    const [growthRate, setGrowthRate] = useState(GROWTH_RATES[0].value);
    const [martingale, setMartingale] = useState(() => loadSavedNum('martingale', DEFAULT_MARTINGALE, 1.01, 100));
    const [martingaleMode, setMartingaleMode] = useState<MartingaleModeType>(() => {
        try {
            return normalizeMartingaleMode(localStorage.getItem('accumilatoirs_martingaleMode'));
        } catch {
            return 'after_one_loss';
        }
    });
    const [consecutiveLossCount, setConsecutiveLossCount] = useState(getInitialConsecutiveLossThreshold);
    const [consecutiveLossCountInput, setConsecutiveLossCountInput] = useState(() =>
        String(getInitialConsecutiveLossThreshold())
    );
    const [currentStakeDisplay, setCurrentStakeDisplay] = useState(() => Number(stakeInput) || Number(DEFAULT_STAKE));
    const [consecutiveLossDisplay, setConsecutiveLossDisplay] = useState(0);
    const [autoCashout, setAutoCashout] = useState<TAutoCashoutSettings>({
        enabled: true,
        takeProfitPercent: DEFAULT_TAKE_PROFIT_PERCENT,
        useServerTakeProfit: true,
    });
    const [proposalPreview, setProposalPreview] = useState<TProposalPreview>({
        askPrice: 0,
        currency,
        message: 'Enter stake to quote accumulator.',
        status: 'idle',
    });
    const [latestTick, setLatestTick] = useState<TTickSnapshot | null>(null);
    const [tickHistory, setTickHistory] = useState<TTickSnapshot[]>([]);
    const [marketSurvivedTicks, setMarketSurvivedTicks] = useState(0);
    const [proposalSurvivedTicks, setProposalSurvivedTicks] = useState<number | null>(null);
    const [proposalHistoryMoves, setProposalHistoryMoves] = useState<THistoryMove[]>([]);
    const [isLive, setIsLive] = useState(false);
    const [isMarketLoading, setIsMarketLoading] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isCashingOut, setIsCashingOut] = useState(false);
    const [openContract, setOpenContract] = useState<Record<string, any> | null>(null);
    const [queuedPurchase, setQueuedPurchase] = useState(false);
    const [autoTradeEnabled, setAutoTradeEnabled] = useState(false);
    const [roundStatus, setRoundStatus] = useState<'flew' | 'running'>('running');
    const [outcomeHistory, setOutcomeHistory] = useState<THistoryMove[]>([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const tickSubscriptionRef = useRef<{ unsubscribe?: () => void } | null>(null);
    const proposalSubscriptionRef = useRef<{ unsubscribe?: () => void } | null>(null);
    const proposalSubscriptionIdRef = useRef<string | null>(null);
    const proposalBarrierWindowRef = useRef<{ high: number; low: number } | null>(null);
    const proposalLastSpotTimeRef = useRef<number | undefined>(undefined);
    const proposalSurvivedTicksRef = useRef(0);
    const contractAbortRef = useRef<AbortController | null>(null);
    const openContractRef = useRef<Record<string, any> | null>(null);
    const cashoutInFlightRef = useRef(false);
    const cashoutRequestedRef = useRef(false);
    const autoCashoutRef = useRef(autoCashout);
    const queuedPurchaseRef = useRef(false);
    const autoTradeEnabledRef = useRef(false);
    const executePurchaseRef = useRef<(() => void) | null>(null);
    const nextStakeRef = useRef(Number(stakeInput) || Number(DEFAULT_STAKE));
    const martingaleModeRef = useRef(martingaleMode);
    const consecutiveLossCountRef = useRef(consecutiveLossCount);
    const consecutiveLossRef = useRef(0);
    const hasOpenContractRef = useRef(false);
    const roundStatusRef = useRef<'flew' | 'running'>('running');
    const proposalBarrierRef = useRef<number | undefined>(undefined);
    const marketEntryQuoteRef = useRef<number | null>(null);
    const marketSurvivedTicksRef = useRef(0);

    const selectedMarket = useMemo(
        () => ACCUMULATOR_MARKETS.find(market => market.symbol === selectedSymbol) ?? ACCUMULATOR_MARKETS[0],
        [selectedSymbol]
    );
    const growthRatePercent = Number(growthRate) * 100;
    const stake = Number(stakeInput);
    const currentTakeProfitAmount = getTakeProfitAmountFromPercent(currentStakeDisplay, autoCashout.takeProfitPercent);
    const currentProfit = Number(openContract?.profit ?? 0);
    const bidPrice = Number(openContract?.bid_price ?? openContract?.sell_price ?? 0);
    const buyPrice = Number(openContract?.buy_price ?? 0);
    const cashoutValue = Number(openContract?.bid_price ?? openContract?.sell_price ?? openContract?.payout ?? 0);
    const contractStatus = String(openContract?.status || '').toLowerCase();
    const hasClosedContract = Boolean(openContract?.is_sold) || ['sold', 'won', 'lost'].includes(contractStatus);
    const hasCrashed = hasClosedContract && (contractStatus === 'lost' || currentProfit < 0);
    const hasWon = hasClosedContract && !hasCrashed;
    const hasOpenContract = Boolean(openContract?.contract_id && !openContract?.is_sold);
    const canTrade = !isPurchasing && Number.isFinite(stake) && stake > 0;
    const historyMoves = useMemo(
        () =>
            outcomeHistory.length
                ? outcomeHistory.slice(-MAX_HISTORY_MOVES)
                : proposalHistoryMoves.length
                  ? proposalHistoryMoves
                  : buildHistoryMoves(tickHistory, proposalPreview.tickSizeBarrier, growthRate),
        [growthRate, outcomeHistory, proposalHistoryMoves, proposalPreview.tickSizeBarrier, tickHistory]
    );
    const marketReturnPercent = useMemo(
        () => getAccumulatorReturnPercent(proposalSurvivedTicks ?? marketSurvivedTicks, growthRate),
        [growthRate, marketSurvivedTicks, proposalSurvivedTicks]
    );
    const contractReturnPercent =
        buyPrice > 0 && cashoutValue > 0
            ? getReturnPercent(cashoutValue, buyPrice)
            : buyPrice > 0
              ? Number(((currentProfit / buyPrice) * 100).toFixed(2))
              : null;
    const displayReturnPercent = contractReturnPercent ?? marketReturnPercent;
    const hasProposalBarrierData =
        proposalPreview.status === 'ready' &&
        Number.isFinite(Number(proposalPreview.spot)) &&
        Number.isFinite(Number(proposalPreview.highBarrier)) &&
        Number.isFinite(Number(proposalPreview.lowBarrier));
    const proposalBarrierStatus = hasProposalBarrierData ? 'Tracking live Deriv barrier data.' : '';

    // Keep the shared chart (used across chart/up-and-down/bot-builder tabs) pointed at whichever
    // market is selected in this ticket, same convention as the up-and-down tab.
    useEffect(() => {
        if (showAccumilatoirs && selectedSymbol && chart_store.symbol !== selectedSymbol) {
            chart_store.onSymbolChange(selectedSymbol);
        }
    }, [chart_store, selectedSymbol, showAccumilatoirs]);

    useEffect(() => {
        openContractRef.current = openContract;
    }, [openContract]);

    useEffect(() => {
        hasOpenContractRef.current = hasOpenContract;
    }, [hasOpenContract]);

    useEffect(() => {
        autoCashoutRef.current = autoCashout;
    }, [autoCashout]);

    useEffect(() => {
        queuedPurchaseRef.current = queuedPurchase;
    }, [queuedPurchase]);

    useEffect(() => {
        autoTradeEnabledRef.current = autoTradeEnabled;
    }, [autoTradeEnabled]);

    useEffect(() => {
        try {
            localStorage.setItem('accumilatoirs_stake', stakeInput);
        } catch {
            // Ignore unavailable storage.
        }
        const baseStake = Number(stakeInput);
        if (Number.isFinite(baseStake) && baseStake > 0 && !hasOpenContractRef.current && !queuedPurchaseRef.current) {
            nextStakeRef.current = baseStake;
            setCurrentStakeDisplay(baseStake);
        }
    }, [stakeInput]);

    useEffect(() => {
        try {
            localStorage.setItem('accumilatoirs_martingale', martingale);
        } catch {
            // Ignore unavailable storage.
        }
    }, [martingale]);

    useEffect(() => {
        martingaleModeRef.current = martingaleMode;
        try {
            localStorage.setItem('accumilatoirs_martingaleMode', martingaleMode);
        } catch {
            // Ignore unavailable storage.
        }
    }, [martingaleMode]);

    useEffect(() => {
        const normalizedLossCount = clampConsecutiveLossThreshold(consecutiveLossCount);
        consecutiveLossCountRef.current = normalizedLossCount;
        setConsecutiveLossCountInput(String(normalizedLossCount));
        try {
            localStorage.setItem('accumilatoirs_consecutiveLossCount', String(normalizedLossCount));
        } catch {
            // Ignore unavailable storage.
        }
    }, [consecutiveLossCount]);

    useEffect(() => {
        roundStatusRef.current = roundStatus;
    }, [roundStatus]);

    useEffect(() => {
        proposalBarrierRef.current = proposalPreview.tickSizeBarrier;
    }, [proposalPreview.tickSizeBarrier]);

    useEffect(() => {
        marketSurvivedTicksRef.current = marketSurvivedTicks;
    }, [marketSurvivedTicks]);

    const recordFlewAway = useCallback((move: number, useExactValue = false, triggerQueuedPurchase = true) => {
        const value = Number((useExactValue ? move : Math.max(move, INITIAL_RETURN_PERCENT)).toFixed(2));
        if (value > 0) {
            setOutcomeHistory(previous =>
                [...previous, { className: classifyMove(value), value: formatPercent(value) }].slice(-MAX_HISTORY_MOVES)
            );
        }
        setRoundStatus('flew');

        window.setTimeout(() => {
            if (
                triggerQueuedPurchase &&
                (queuedPurchaseRef.current || autoTradeEnabledRef.current) &&
                executePurchaseRef.current
            ) {
                executePurchaseRef.current();
                return;
            }
            setRoundStatus('running');
        }, 450);
    }, []);

    const resetMartingaleSequence = useCallback(() => {
        const baseStake = Number(stakeInput);
        const normalizedBaseStake = Number.isFinite(baseStake) && baseStake > 0 ? baseStake : Number(DEFAULT_STAKE);
        nextStakeRef.current = normalizedBaseStake;
        consecutiveLossRef.current = 0;
        setCurrentStakeDisplay(normalizedBaseStake);
        setConsecutiveLossDisplay(0);
    }, [stakeInput]);

    const pushContract = useCallback(
        (data: any) => {
            try {
                transactions.pushTransaction({ ...data, run_id: run_panel.run_id });
                run_panel.onBotContractEvent(data);
                summary_card.onBotContractEvent(data);
            } catch {
                // Accumulator trading should keep running if an observer panel is unavailable.
            }
        },
        [run_panel, summary_card, transactions]
    );

    const commitConsecutiveLossCountInput = useCallback(() => {
        const normalizedLossCount = clampConsecutiveLossThreshold(consecutiveLossCountInput || 2);
        setConsecutiveLossCount(normalizedLossCount);
        setConsecutiveLossCountInput(String(normalizedLossCount));
    }, [consecutiveLossCountInput]);

    const handleConsecutiveLossCountInputChange = useCallback((value: string) => {
        const digitsOnly = value.replace(/\D/g, '').slice(0, 2);
        setConsecutiveLossCountInput(digitsOnly);
        const numericValue = Number(digitsOnly);
        if (Number.isFinite(numericValue) && numericValue >= 1 && numericValue <= 10) {
            setConsecutiveLossCount(Math.trunc(numericValue));
        }
    }, []);

    const buildAccumulatorParameters = useCallback(
        (stakeAmount = Number(stakeInput)) => {
            const takeProfit = getTakeProfitAmountFromPercent(stakeAmount, autoCashout.takeProfitPercent);
            const shouldUseServerTakeProfit =
                autoCashout.enabled && autoCashout.useServerTakeProfit && Number.isFinite(takeProfit) && takeProfit > 0;

            return {
                amount: stakeAmount,
                basis: 'stake',
                contract_type: 'ACCU',
                currency,
                growth_rate: Number(growthRate),
                symbol: selectedSymbol,
                limit_order: shouldUseServerTakeProfit
                    ? {
                          take_profit: Number(takeProfit.toFixed(2)),
                      }
                    : undefined,
            };
        },
        [
            autoCashout.enabled,
            autoCashout.takeProfitPercent,
            autoCashout.useServerTakeProfit,
            currency,
            growthRate,
            selectedSymbol,
            stakeInput,
        ]
    );

    const cashoutContract = useCallback(
        async (reason = 'Manual cashout') => {
            const contractId = openContractRef.current?.contract_id;
            if (!contractId || cashoutInFlightRef.current) return;

            cashoutInFlightRef.current = true;
            setIsCashingOut(true);
            cashoutRequestedRef.current = true;
            setError('');
            setMessage(`${reason} requested...`);

            try {
                const sell = await sellContractForUi({
                    contractId,
                    price: 0,
                    source: 'Accumilatoirs',
                });
                setMessage(`Cashout accepted at ${formatMoney(sell.sold_for, currency)}.`);
            } catch (cashoutError) {
                setError(cashoutError instanceof Error ? cashoutError.message : 'Could not cash out this accumulator.');
            } finally {
                setIsCashingOut(false);
                cashoutInFlightRef.current = false;
            }
        },
        [currency]
    );

    const maybeAutoCashout = useCallback(
        (snapshot: Record<string, any>) => {
            if (!snapshot?.contract_id || snapshot?.is_sold || cashoutInFlightRef.current) return;

            const settings = autoCashoutRef.current;
            if (!settings.enabled) return;

            const profit = Number(snapshot.profit ?? 0);
            const takeProfit = getTakeProfitAmountFromPercent(
                snapshot.buy_price ?? nextStakeRef.current,
                settings.takeProfitPercent
            );

            if (Number.isFinite(takeProfit) && takeProfit > 0 && profit >= takeProfit) {
                void cashoutContract('Automated take profit');
            }
        },
        [cashoutContract]
    );

    const cleanupContractStream = useCallback(() => {
        contractAbortRef.current?.abort();
        contractAbortRef.current = null;
    }, []);

    const stopAccumulator = useCallback(async () => {
        setAutoTradeEnabled(false);
        setQueuedPurchase(false);
        autoTradeEnabledRef.current = false;
        queuedPurchaseRef.current = false;
        if (openContractRef.current?.contract_id && !openContractRef.current?.is_sold) {
            await cashoutContract('Navigation cashout');
        }
        cleanupContractStream();
        setOpenContract(null);
        dashboard.setActiveTradingModule(null);
        try {
            run_panel.setIsRunning(false);
            run_panel.setHasOpenContract?.(false);
            run_panel.setContractStage?.(contract_stages.NOT_RUNNING);
            api_base.setIsRunning?.(false);
        } catch {
            // Optional run panel cleanup only.
        }
    }, [cashoutContract, cleanupContractStream, dashboard, run_panel]);

    useEffect(() => {
        dashboard.registerTradingStopHandler('accumilatoirs', stopAccumulator);

        return () => {
            dashboard.unregisterTradingStopHandler('accumilatoirs');
        };
    }, [dashboard, stopAccumulator]);

    useEffect(() => {
        if (!showAccumilatoirs) return undefined;

        let isMounted = true;
        setIsMarketLoading(true);

        const requestTickHistory = async () => {
            try {
                const response = await (api_base.api as any)?.send?.({
                    ticks_history: selectedSymbol,
                    adjust_start_time: 1,
                    count: MAX_GRAPH_TICKS,
                    end: 'latest',
                    style: 'ticks',
                });

                const times = response?.history?.times ?? [];
                const prices = response?.history?.prices ?? [];
                const historyTicks = prices
                    .map((price: string | number, index: number) => ({
                        epoch: Number(times[index]) || Math.floor(Date.now() / 1000) - prices.length + index,
                        quote: Number(price),
                    }))
                    .filter((tick: TTickSnapshot) => Number.isFinite(tick.quote));

                if (isMounted && historyTicks.length) {
                    setTickHistory(historyTicks.slice(-MAX_GRAPH_TICKS));
                    setLatestTick(historyTicks[historyTicks.length - 1]);
                    marketEntryQuoteRef.current = historyTicks[historyTicks.length - 1].quote;
                    marketSurvivedTicksRef.current = 0;
                    setMarketSurvivedTicks(0);
                }
            } catch (historyError) {
                if (isMounted) {
                    console.warn('[Accumilatoirs] Tick history is not available yet.', historyError);
                }
            } finally {
                if (isMounted) {
                    setIsMarketLoading(false);
                }
            }
        };

        void requestTickHistory();

        try {
            tickSubscriptionRef.current?.unsubscribe?.();
        } catch {
            // safeSubscribe handles stream errors; ignore stale unsubscribe failures.
        }

        setIsLive(false);
        const observable = (api_base.api as any)?.subscribe?.({
            ticks: selectedSymbol,
            subscribe: 1,
        });

        tickSubscriptionRef.current = safeSubscribe(
            observable,
            (data: any) => {
                const tick = getTickFromResponse(data);
                if (!tick) return;

                setLatestTick(tick);
                setTickHistory(previousTicks => {
                    const barrier = Number(proposalBarrierRef.current);
                    if (
                        !hasOpenContractRef.current &&
                        roundStatusRef.current === 'running' &&
                        !proposalBarrierWindowRef.current &&
                        Number.isFinite(barrier) &&
                        barrier > 0
                    ) {
                        if (!Number.isFinite(Number(marketEntryQuoteRef.current))) {
                            marketEntryQuoteRef.current = tick.quote;
                            marketSurvivedTicksRef.current = 0;
                            setMarketSurvivedTicks(0);
                        } else if (
                            hasAccumulatorBarrierBreakout(
                                tick.quote,
                                Number(marketEntryQuoteRef.current),
                                proposalBarrierRef.current
                            )
                        ) {
                            recordFlewAway(getAccumulatorReturnPercent(marketSurvivedTicksRef.current, growthRate));
                            marketEntryQuoteRef.current = tick.quote;
                            marketSurvivedTicksRef.current = 0;
                            setMarketSurvivedTicks(0);
                        } else {
                            const nextSurvivedTicks = marketSurvivedTicksRef.current + 1;
                            marketSurvivedTicksRef.current = nextSurvivedTicks;
                            setMarketSurvivedTicks(nextSurvivedTicks);
                        }
                    }

                    return appendTick(previousTicks, tick);
                });
                setIsLive(true);
            },
            streamError => {
                setIsLive(false);
                if (!isExpectedStreamInterruption(streamError)) {
                    setError('Live tick stream is not available yet.');
                }
            }
        );

        return () => {
            isMounted = false;
            try {
                tickSubscriptionRef.current?.unsubscribe?.();
            } catch {
                // Ignore stale unsubscribe failures.
            }
            tickSubscriptionRef.current = null;
            setIsLive(false);
            setIsMarketLoading(false);
        };
    }, [growthRate, recordFlewAway, selectedSymbol, showAccumilatoirs]);

    useEffect(() => {
        if (!showAccumilatoirs) return undefined;

        let isMounted = true;

        const applyProposal = (proposal: any, subscriptionId?: string) => {
            if (!isMounted || !proposal) return;
            if (subscriptionId) proposalSubscriptionIdRef.current = subscriptionId;

            const spot = getProposalSpot(proposal);
            const spotTime = getProposalSpotTime(proposal);
            const currentBarriers = getProposalBarriers(proposal);
            const isNewProposalTick = spotTime === undefined || spotTime !== proposalLastSpotTimeRef.current;
            const previousBarriers = proposalBarrierWindowRef.current;

            if (Number.isFinite(Number(spot))) {
                const proposalTick = {
                    epoch: spotTime || Math.floor(Date.now() / 1000),
                    quote: Number(spot),
                };
                setLatestTick(proposalTick);
                setTickHistory(previousTicks => appendTick(previousTicks, proposalTick));
                setIsLive(true);
            }

            if (isNewProposalTick && currentBarriers) {
                if (
                    hasCrossedProposalBarriers(spot, previousBarriers) &&
                    !hasOpenContractRef.current &&
                    roundStatusRef.current === 'running'
                ) {
                    const returnPercent = getAccumulatorReturnPercent(proposalSurvivedTicksRef.current, growthRate);
                    if (returnPercent > 0) {
                        const historyMove = {
                            className: classifyMove(returnPercent),
                            value: formatPercent(returnPercent),
                        };
                        setProposalHistoryMoves(previous => [historyMove, ...previous].slice(0, MAX_HISTORY_MOVES));
                    }
                    recordFlewAway(returnPercent, true);
                    proposalSurvivedTicksRef.current = 0;
                    setProposalSurvivedTicks(0);
                } else if (previousBarriers) {
                    const nextSurvivedTicks = proposalSurvivedTicksRef.current + 1;
                    proposalSurvivedTicksRef.current = nextSurvivedTicks;
                    setProposalSurvivedTicks(nextSurvivedTicks);
                }
            }

            if (isNewProposalTick) {
                proposalBarrierWindowRef.current = currentBarriers;
                proposalLastSpotTimeRef.current = spotTime;
            }

            setProposalPreview({
                askPrice: Number(proposal?.ask_price ?? stake),
                currency,
                highBarrier: currentBarriers?.high,
                lowBarrier: currentBarriers?.low,
                maxPayout: Number(proposal?.validation_params?.max_payout) || undefined,
                maxTicks: Number(proposal?.validation_params?.max_ticks) || undefined,
                message: proposal?.longcode || 'Accumulator is ready to buy.',
                minStake: Number(proposal?.contract_details?.minimum_stake) || undefined,
                spot,
                status: 'ready',
                tickSizeBarrier: getProposalTickSizeBarrier(proposal),
            });
        };

        let retryTimer: number | undefined;

        const subscribeToProposal = async () => {
            if (!isMounted) return;

            proposalBarrierWindowRef.current = null;
            proposalLastSpotTimeRef.current = undefined;
            proposalSurvivedTicksRef.current = 0;
            setProposalSurvivedTicks(null);

            if (!Number.isFinite(stake) || stake <= 0) {
                setProposalPreview({
                    askPrice: 0,
                    currency,
                    message: 'Enter a valid stake to quote accumulator.',
                    status: 'idle',
                });
                return;
            }

            if (!api_base.api) {
                setProposalPreview({
                    askPrice: stake,
                    currency,
                    message: 'Waiting for Deriv connection...',
                    status: 'loading',
                });
                retryTimer = window.setTimeout(() => {
                    void subscribeToProposal();
                }, 1000);
                return;
            }

            setProposalPreview(previous => ({
                ...previous,
                message: 'Quoting accumulator...',
                status: 'loading',
            }));

            try {
                proposalSubscriptionRef.current?.unsubscribe?.();
                const proposalRequest = {
                    proposal: 1,
                    subscribe: 1,
                    ...normalizeTradeParameters(buildAccumulatorParameters()),
                };
                const proposalObservable = (api_base.api as any)?.subscribe?.(proposalRequest);

                proposalSubscriptionRef.current = safeSubscribe(
                    proposalObservable,
                    (data: any) => {
                        const response = data?.data ?? data;
                        if (response?.msg_type && response.msg_type !== 'proposal') return;

                        const echoRequest = response?.echo_req ?? {};
                        const requestSymbol = echoRequest.underlying_symbol ?? echoRequest.symbol;
                        if (echoRequest.contract_type && echoRequest.contract_type !== 'ACCU') return;
                        if (requestSymbol && requestSymbol !== selectedSymbol) return;
                        if (response?.error) {
                            setProposalPreview({
                                askPrice: stake,
                                currency,
                                message: response.error.message || 'Accumulator proposal failed.',
                                status: 'error',
                            });
                            return;
                        }

                        applyProposal(response?.proposal, response?.subscription?.id);
                    },
                    proposalError => {
                        setProposalPreview({
                            askPrice: stake,
                            currency,
                            message:
                                proposalError instanceof Error
                                    ? proposalError.message
                                    : 'Accumulator proposal stream failed.',
                            status: 'error',
                        });
                    }
                );
            } catch (proposalError) {
                setProposalPreview({
                    askPrice: stake,
                    currency,
                    message: proposalError instanceof Error ? proposalError.message : 'Accumulator proposal failed.',
                    status: 'error',
                });
            }
        };

        const proposalVersion = window.setTimeout(() => {
            void subscribeToProposal();
        }, PROPOSAL_REFRESH_MS);

        return () => {
            isMounted = false;
            window.clearTimeout(proposalVersion);
            if (retryTimer) {
                window.clearTimeout(retryTimer);
            }
            try {
                proposalSubscriptionRef.current?.unsubscribe?.();
            } catch {
                // Ignore stale accumulator proposal subscriptions.
            }
            proposalSubscriptionRef.current = null;
            const subscriptionId = proposalSubscriptionIdRef.current;
            proposalSubscriptionIdRef.current = null;
            if (subscriptionId) {
                void (api_base.api as any)?.send?.({ forget: subscriptionId });
            }
        };
    }, [buildAccumulatorParameters, currency, growthRate, recordFlewAway, selectedSymbol, showAccumilatoirs, stake]);

    useEffect(
        () => () => {
            cleanupContractStream();
        },
        [cleanupContractStream]
    );

    const executePurchase = useCallback(async () => {
        const activeStake = Number(nextStakeRef.current);
        if (!Number.isFinite(activeStake) || activeStake <= 0) {
            setError('Enter a valid stake before buying an accumulator.');
            return;
        }

        if (!api_base.api) {
            setError('Deriv connection is not ready yet.');
            return;
        }

        const tradeStartTime = Math.floor(Date.now() / 1000);
        const verificationId = `accu_${selectedSymbol}_${tradeStartTime}_${Math.random().toString(36).slice(2, 11)}`;
        const parameters = buildAccumulatorParameters(activeStake);

        setError('');
        setMessage(`Buying accumulator with ${formatMoney(activeStake, currency)} stake...`);
        setIsPurchasing(true);
        setQueuedPurchase(false);
        setRoundStatus('running');
        queuedPurchaseRef.current = false;
        setCurrentStakeDisplay(activeStake);

        try {
            run_panel.setIsRunning(true);
            run_panel.setRunId(`accu-${Date.now()}`);
            run_panel.setContractStage?.(contract_stages.RUNNING);
            run_panel.toggleDrawer(true);
            run_panel.setHasOpenContract?.(true);
            dashboard.setActiveTradingModule('accumilatoirs');

            const buy = await buyContractForUi({ parameters, price: activeStake, source: 'Accumilatoirs' });
            const buySnapshot = {
                buy_price: buy.buy_price,
                contract_id: buy.contract_id,
                contract_type: 'ACCU',
                currency,
                date_start: tradeStartTime,
                display_name: selectedMarket?.label ?? selectedSymbol,
                growth_rate: Number(growthRate),
                shortcode: `ACCU_${selectedSymbol}_${growthRate}`,
                transaction_ids: { buy: buy.transaction_id },
                underlying_symbol: selectedSymbol,
                verification_id: verificationId,
            };

            setOpenContract(buySnapshot);
            pushContract(buySnapshot);
            setMessage('Accumulator is open. Watch profit or cash out manually.');

            cleanupContractStream();
            const abortController = new AbortController();
            contractAbortRef.current = abortController;

            void streamContractUntilSettled({
                contractId: buy.contract_id,
                fallback: buySnapshot,
                onUpdate: (snapshot, rawContract) => {
                    setOpenContract(snapshot);
                    const contractTick = getTickFromContract(rawContract);
                    if (contractTick) {
                        setLatestTick(contractTick);
                        setTickHistory(previousTicks => appendTick(previousTicks, contractTick));
                    }
                    pushContract(snapshot);
                    maybeAutoCashout(snapshot);
                },
                signal: abortController.signal,
                source: 'Accumilatoirs',
                timeoutMs: 180000,
            }).then(settledContract => {
                setOpenContract(settledContract);
                pushContract(settledContract);
                const profit = Number(settledContract.profit ?? 0);
                if (settledContract.is_sold) {
                    const baseStake = Number(stakeInput);
                    const multiplier = Number(martingale);
                    const nextMartingaleState = getNextMartingaleState({
                        profit,
                        current_stake: activeStake,
                        base_stake: Number.isFinite(baseStake) && baseStake > 0 ? baseStake : Number(DEFAULT_STAKE),
                        multiplier:
                            Number.isFinite(multiplier) && multiplier >= 1.01 ? multiplier : Number(DEFAULT_MARTINGALE),
                        martingale_mode: martingaleModeRef.current,
                        consecutive_losses: consecutiveLossRef.current,
                        consecutive_loss_trigger: consecutiveLossCountRef.current,
                    });
                    nextStakeRef.current = nextMartingaleState.nextStake;
                    consecutiveLossRef.current = nextMartingaleState.consecutiveLosses;
                    setCurrentStakeDisplay(nextMartingaleState.nextStake);
                    setConsecutiveLossDisplay(nextMartingaleState.consecutiveLosses);

                    const wasCashoutRequested = cashoutRequestedRef.current;
                    const takeProfit = getTakeProfitAmountFromPercent(
                        settledContract.buy_price ?? activeStake,
                        autoCashoutRef.current.takeProfitPercent
                    );
                    const wasTakeProfitClose =
                        !wasCashoutRequested && Number.isFinite(takeProfit) && takeProfit > 0 && profit >= takeProfit;
                    cashoutRequestedRef.current = false;
                    const closedReturnPercent =
                        Number(settledContract.buy_price) > 0
                            ? Number(((profit / Number(settledContract.buy_price)) * 100).toFixed(2))
                            : displayReturnPercent;
                    if (wasCashoutRequested || wasTakeProfitClose) {
                        setOutcomeHistory(previous =>
                            [
                                ...previous,
                                {
                                    className: classifyMove(closedReturnPercent),
                                    value: formatPercent(closedReturnPercent),
                                },
                            ].slice(-MAX_HISTORY_MOVES)
                        );
                        const shouldKeepWaitingForBreakout = autoTradeEnabledRef.current;
                        setRoundStatus('running');
                        setQueuedPurchase(shouldKeepWaitingForBreakout);
                        queuedPurchaseRef.current = shouldKeepWaitingForBreakout;
                        const closeReason = wasTakeProfitClose ? 'closed at take profit' : 'cashed out';
                        setMessage(
                            shouldKeepWaitingForBreakout
                                ? `Accumulator ${closeReason}. P/L: ${formatMoney(profit, currency)}. Waiting for the next barrier breakout.`
                                : `Accumulator ${closeReason}. P/L: ${formatMoney(profit, currency)}.`
                        );
                    } else {
                        recordFlewAway(closedReturnPercent, true);
                        setMessage(`Accumulator closed. P/L: ${formatMoney(profit, currency)}.`);
                    }
                    dashboard.setActiveTradingModule(null);
                    run_panel.setHasOpenContract?.(false);
                    run_panel.setContractStage?.(contract_stages.CONTRACT_CLOSED);
                }
            });
        } catch (purchaseError) {
            setMessage('');
            setError(purchaseError instanceof Error ? purchaseError.message : 'Could not buy accumulator.');
            dashboard.setActiveTradingModule(null);
            run_panel.setIsRunning(false);
            run_panel.setHasOpenContract?.(false);
            run_panel.setContractStage?.(contract_stages.NOT_RUNNING);
        } finally {
            setIsPurchasing(false);
        }
    }, [
        buildAccumulatorParameters,
        cleanupContractStream,
        currency,
        dashboard,
        growthRate,
        maybeAutoCashout,
        pushContract,
        run_panel,
        selectedMarket?.label,
        selectedSymbol,
        stakeInput,
        martingale,
        displayReturnPercent,
        recordFlewAway,
    ]);

    useEffect(() => {
        executePurchaseRef.current = () => {
            void executePurchase();
        };
    }, [executePurchase]);

    const handleTradeAction = useCallback(async () => {
        if (hasOpenContract) {
            await cashoutContract();
            return;
        }

        void executePurchase();
    }, [cashoutContract, executePurchase, hasOpenContract]);

    const handleStopAllTrades = useCallback(async () => {
        setAutoTradeEnabled(false);
        setQueuedPurchase(false);
        autoTradeEnabledRef.current = false;
        queuedPurchaseRef.current = false;
        setError('');
        resetMartingaleSequence();

        if (hasOpenContract) {
            await cashoutContract('Stop all trades cashout');
            setMessage('Stop all trades requested. Auto trading is off.');
            return;
        }

        cleanupContractStream();
        setOpenContract(null);
        dashboard.setActiveTradingModule(null);
        run_panel.setIsRunning(false);
        run_panel.setHasOpenContract?.(false);
        run_panel.setContractStage?.(contract_stages.NOT_RUNNING);
        setMessage('All accumulator auto trading has been stopped.');
    }, [cashoutContract, cleanupContractStream, dashboard, hasOpenContract, resetMartingaleSequence, run_panel]);

    const handleMarketChange = (symbol: string) => {
        setSelectedSymbol(symbol);
        setLatestTick(null);
        setTickHistory([]);
        resetMartingaleSequence();
        setOutcomeHistory([]);
        setProposalHistoryMoves([]);
        setProposalSurvivedTicks(null);
        proposalBarrierWindowRef.current = null;
        proposalLastSpotTimeRef.current = undefined;
        proposalSurvivedTicksRef.current = 0;
        setMarketSurvivedTicks(0);
        marketEntryQuoteRef.current = null;
        marketSurvivedTicksRef.current = 0;
        setQueuedPurchase(false);
        queuedPurchaseRef.current = false;
        setRoundStatus('running');
        setMessage('');
        setError('');
    };

    if (!showAccumilatoirs) return null;

    return (
        <div
            className={classNames('accumilatoirs-page', {
                'accumilatoirs-page--dark': ui.is_dark_mode_on,
            })}
        >
            <ThemedScrollbars className='accumilatoirs-page__scroll' autohide={false}>
                <div className='accumilatoirs-page__inner'>
                    <div className='accumilatoirs-history-strip'>
                        {historyMoves.length ? (
                            historyMoves.map((history, index) => (
                                <span
                                    className={`accumilatoirs-history-chip accumilatoirs-history-chip--${history.className}`}
                                    key={`${history.value}-${index}`}
                                >
                                    {history.value}
                                </span>
                            ))
                        ) : (
                            <span className='accumilatoirs-history-chip accumilatoirs-history-chip--loading'>
                                {proposalPreview.status === 'loading' ? (
                                    <span className='accumilatoirs-loader' aria-hidden='true' />
                                ) : null}
                                {proposalPreview.status === 'loading'
                                    ? 'Connecting to Deriv accumulator stream...'
                                    : hasProposalBarrierData
                                      ? 'Tracking live Deriv barriers...'
                                      : 'Waiting for Deriv barrier data...'}
                            </span>
                        )}
                    </div>

                    {error && <div className='accumilatoirs-alert accumilatoirs-alert--error'>{error}</div>}
                    {message && <div className='accumilatoirs-alert'>{message}</div>}

                    <div className='accumilatoirs-layout'>
                        <section className='accumilatoirs-chart-card'>
                            <div className='accumilatoirs-chart-card__header'>
                                <label className='accumilatoirs-chart-card__symbol'>
                                    <span>Market</span>
                                    <select
                                        className='accumilatoirs-chart-card__symbol-control'
                                        disabled={hasOpenContract || queuedPurchase}
                                        value={selectedSymbol}
                                        onChange={event => handleMarketChange(event.target.value)}
                                    >
                                        {ACCUMULATOR_MARKETS.map(market => (
                                            <option key={market.symbol} value={market.symbol}>
                                                {market.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <span
                                    className={classNames('accumilatoirs-live-pill', {
                                        'accumilatoirs-live-pill--on': isLive,
                                    })}
                                >
                                    <i />
                                    {isMarketLoading ? 'Loading' : isLive ? 'Live' : 'Waiting'}
                                </span>
                            </div>

                            <div className='accumilatoirs-chart-card__body'>
                                <div className='accumilatoirs-chart-shell'>
                                    <ChartWrapper
                                        chart_type_override='line'
                                        granularity_override={0}
                                        prefix='accumilatoirs-chart'
                                        refresh_token={showAccumilatoirs ? 'active' : 'inactive'}
                                        show_digits_stats={false}
                                    />
                                </div>

                                <div
                                    className={classNames('accumilatoirs-result-banner', {
                                        'accumilatoirs-result-banner--crashed': hasCrashed || roundStatus === 'flew',
                                        'accumilatoirs-result-banner--won': hasWon,
                                    })}
                                >
                                    <span className='accumilatoirs-result-banner__label'>
                                        {hasCrashed || roundStatus === 'flew'
                                            ? 'Breakout / flew away'
                                            : hasWon
                                              ? 'Cashed out'
                                              : hasOpenContract
                                                ? 'Live accumulator'
                                                : 'Live market'}
                                    </span>
                                    <strong className='accumilatoirs-result-banner__value'>
                                        {formatPercent(displayReturnPercent)}
                                    </strong>
                                    <span className='accumilatoirs-result-banner__balance'>
                                        Balance {formatMoney(client.balance || 0, currency)}
                                    </span>
                                </div>
                            </div>
                        </section>

                        <aside className='accumilatoirs-ticket-card'>
                            <div className='accumilatoirs-ticket-card__header'>
                                <h2>Trade setup</h2>
                                <span className={classNames({ 'accumilatoirs-live-text': isLive })}>
                                    {isMarketLoading ? 'Loading' : isLive ? 'LIVE' : 'Waiting'} &middot; {currency}
                                </span>
                            </div>

                            <div className='accumilatoirs-ticket-card__section'>
                                <div className='accumilatoirs-ticket__row'>
                                    <label className='accumilatoirs-field'>
                                        <span className='accumilatoirs-field__label'>
                                            Growth rate
                                            <span
                                                className='accumilatoirs-info-dot'
                                                title='Your stake grows by this percentage for each tick that stays within the barrier range.'
                                            >
                                                i
                                            </span>
                                        </span>
                                        <select
                                            className='accumilatoirs-field__control'
                                            disabled={hasOpenContract || queuedPurchase}
                                            value={growthRate}
                                            onChange={event => setGrowthRate(event.target.value)}
                                        >
                                            {GROWTH_RATES.map(rate => (
                                                <option key={rate.value} value={rate.value}>
                                                    {rate.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                <label className='accumilatoirs-field'>
                                    <span className='accumilatoirs-field__label'>Stake</span>
                                    <div className='accumilatoirs-inline-input'>
                                        <input
                                            className='accumilatoirs-field__control'
                                            disabled={hasOpenContract || queuedPurchase}
                                            inputMode='decimal'
                                            value={stakeInput}
                                            onChange={event => setStakeInput(cleanMoneyInput(event.target.value))}
                                        />
                                        <span className='accumilatoirs-inline-input__suffix'>{currency}</span>
                                    </div>
                                </label>

                                <label className='accumilatoirs-field'>
                                    <span className='accumilatoirs-field__label'>
                                        Take profit
                                        <span
                                            className='accumilatoirs-info-dot'
                                            title='The contract closes automatically when your profit reaches this amount.'
                                        >
                                            i
                                        </span>
                                    </span>
                                    <div className='accumilatoirs-inline-input'>
                                        <input
                                            className='accumilatoirs-field__control'
                                            disabled={hasOpenContract || queuedPurchase}
                                            inputMode='decimal'
                                            placeholder='-'
                                            value={autoCashout.takeProfitPercent}
                                            onChange={event =>
                                                setAutoCashout(previous => ({
                                                    ...previous,
                                                    enabled: true,
                                                    takeProfitPercent: cleanMoneyInput(event.target.value),
                                                    useServerTakeProfit: true,
                                                }))
                                            }
                                        />
                                        <span className='accumilatoirs-inline-input__suffix'>%</span>
                                    </div>
                                </label>
                            </div>

                            {!hasProposalBarrierData && !hasOpenContract && (
                                <div className='accumilatoirs-summary-panel accumilatoirs-summary-panel--loading'>
                                    <div className='accumilatoirs-summary-row accumilatoirs-summary-row--skeleton' />
                                    <div className='accumilatoirs-summary-row accumilatoirs-summary-row--skeleton' />
                                    <div className='accumilatoirs-summary-row accumilatoirs-summary-row--skeleton' />
                                </div>
                            )}

                            {hasProposalBarrierData && !hasOpenContract && (
                                <div className='accumilatoirs-summary-panel'>
                                    <div className='accumilatoirs-summary-row'>
                                        <span>Max. payout</span>
                                        <span>{formatMoney(proposalPreview.maxPayout, currency)}</span>
                                    </div>
                                    <div className='accumilatoirs-summary-row'>
                                        <span>Spot</span>
                                        <span>{formatQuote(proposalPreview.spot)}</span>
                                    </div>
                                    <div className='accumilatoirs-summary-row'>
                                        <span>Barrier range</span>
                                        <span>
                                            {formatQuote(proposalPreview.lowBarrier)} &ndash;{' '}
                                            {formatQuote(proposalPreview.highBarrier)}
                                        </span>
                                    </div>
                                    {proposalPreview.minStake ? (
                                        <div className='accumilatoirs-summary-row'>
                                            <span>Min. stake</span>
                                            <span>{formatMoney(proposalPreview.minStake, currency)}</span>
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {hasOpenContract && (
                                <div className='accumilatoirs-summary-panel'>
                                    <div className='accumilatoirs-summary-row'>
                                        <span>Stake</span>
                                        <span>{formatMoney(currentStakeDisplay, currency)}</span>
                                    </div>
                                    <div
                                        className={classNames('accumilatoirs-summary-row', {
                                            'accumilatoirs-summary-row--positive': currentProfit >= 0,
                                            'accumilatoirs-summary-row--negative': currentProfit < 0,
                                        })}
                                    >
                                        <span>Current P&amp;L</span>
                                        <span>
                                            {currentProfit >= 0 ? '+' : ''}
                                            {formatMoney(currentProfit, currency)}
                                        </span>
                                    </div>
                                    <div className='accumilatoirs-summary-row accumilatoirs-summary-row--total'>
                                        <span>Total return</span>
                                        <span>{formatMoney(bidPrice, currency)}</span>
                                    </div>
                                </div>
                            )}

                            <details className='accumilatoirs-advanced'>
                                <summary>Advanced strategy</summary>

                                <div className='accumilatoirs-ticket__row accumilatoirs-ticket__row--martingale'>
                                    <label className='accumilatoirs-field'>
                                        <span className='accumilatoirs-field__label'>Martingale x</span>
                                        <input
                                            className='accumilatoirs-field__control'
                                            disabled={hasOpenContract || queuedPurchase}
                                            inputMode='decimal'
                                            min='1.01'
                                            step='0.5'
                                            type='number'
                                            value={martingale}
                                            onChange={event => setMartingale(cleanMoneyInput(event.target.value))}
                                        />
                                    </label>

                                    <label className='accumilatoirs-field'>
                                        <span className='accumilatoirs-field__label'>Strategy</span>
                                        <select
                                            className='accumilatoirs-field__control'
                                            disabled={hasOpenContract || queuedPurchase}
                                            value={martingaleMode}
                                            onChange={event =>
                                                setMartingaleMode(normalizeMartingaleMode(event.target.value))
                                            }
                                        >
                                            <option value='no_martingale'>No Martingale</option>
                                            <option value='after_one_loss'>After 1 loss</option>
                                            <option value='after_two_losses'>After 2 losses</option>
                                            <option value='custom_consecutive_loss_trigger'>Custom loss count</option>
                                        </select>
                                    </label>
                                </div>

                                {martingaleMode === 'custom_consecutive_loss_trigger' && (
                                    <label className='accumilatoirs-field accumilatoirs-field--martingale-threshold'>
                                        <span className='accumilatoirs-field__label'>
                                            Consecutive losses before martingale
                                        </span>
                                        <input
                                            className='accumilatoirs-field__control'
                                            disabled={hasOpenContract || queuedPurchase}
                                            inputMode='numeric'
                                            max='10'
                                            min='1'
                                            step='1'
                                            type='number'
                                            value={consecutiveLossCountInput}
                                            onBlur={commitConsecutiveLossCountInput}
                                            onChange={event =>
                                                handleConsecutiveLossCountInputChange(event.target.value)
                                            }
                                        />
                                    </label>
                                )}

                                <label
                                    className={classNames('accumilatoirs-check accumilatoirs-check--auto', {
                                        'accumilatoirs-check--auto-active': autoTradeEnabled,
                                    })}
                                >
                                    <input
                                        checked={autoTradeEnabled}
                                        type='checkbox'
                                        onChange={event => {
                                            const enabled = event.target.checked;
                                            setAutoTradeEnabled(enabled);
                                            if (enabled && !hasOpenContract) {
                                                setQueuedPurchase(false);
                                                queuedPurchaseRef.current = false;
                                                setMessage('Auto trade enabled. Starting first accumulator now.');
                                                void executePurchase();
                                            } else if (!enabled) {
                                                setQueuedPurchase(false);
                                                queuedPurchaseRef.current = false;
                                                setMessage('');
                                            }
                                        }}
                                    />
                                    <span>Auto trade after breakout</span>
                                </label>
                            </details>

                            <div className='accumilatoirs-ticket-card__action'>
                                {!hasOpenContract && (
                                    <button
                                        className={classNames('accumilatoirs-primary', {
                                            'accumilatoirs-primary--waiting': queuedPurchase,
                                        })}
                                        disabled={!canTrade}
                                        type='button'
                                        onClick={() => void handleTradeAction()}
                                    >
                                        {queuedPurchase
                                            ? 'Waiting for breakout...'
                                            : isPurchasing
                                              ? 'Purchasing...'
                                              : `Buy at ${growthRatePercent.toFixed(0)}%`}
                                    </button>
                                )}

                                {hasOpenContract && (
                                    <button
                                        className='accumilatoirs-primary accumilatoirs-primary--cashout'
                                        disabled={isCashingOut}
                                        type='button'
                                        onClick={() => void handleTradeAction()}
                                    >
                                        {isCashingOut ? (
                                            'Cashing out...'
                                        ) : (
                                            <span className='accumilatoirs-primary__stacked'>
                                                <span>Close</span>
                                                <span className='accumilatoirs-primary__stacked-sub'>
                                                    {formatMoney(bidPrice, currency)}
                                                </span>
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>

                            <button
                                className='accumilatoirs-stop'
                                disabled={!hasOpenContract && !queuedPurchase && !autoTradeEnabled && !isPurchasing}
                                type='button'
                                onClick={() => void handleStopAllTrades()}
                            >
                                Stop all trades
                            </button>

                            <div className='accumilatoirs-ticket__status'>
                                {hasOpenContract
                                    ? `Live return ${formatPercent(displayReturnPercent)} (${formatMoney(currentProfit, currency)})`
                                    : queuedPurchase
                                      ? hasProposalBarrierData
                                          ? `${proposalBarrierStatus} Purchase queued for the next breakout/flew away.`
                                          : 'Purchase queued. Waiting for Deriv barrier data.'
                                      : proposalPreview.status === 'loading'
                                        ? 'Preparing Deriv quote...'
                                        : proposalBarrierStatus || proposalPreview.message}
                            </div>

                            <div className='accumilatoirs-ticket__meta'>
                                <span>{selectedMarket?.label}</span>
                                <span>Current stake {formatMoney(currentStakeDisplay, currency)}</span>
                                <span>
                                    TP {autoCashout.takeProfitPercent || 0}% ={' '}
                                    {formatMoney(currentTakeProfitAmount, currency)}
                                </span>
                                <span>Consecutive losses {consecutiveLossDisplay}</span>
                                {proposalPreview.maxPayout ? (
                                    <span>Max payout {formatMoney(proposalPreview.maxPayout, currency)}</span>
                                ) : null}
                            </div>
                        </aside>
                    </div>
                </div>
            </ThemedScrollbars>
        </div>
    );
});

export default Accumilatoirs;
