export type SupportedMarket = {
    label: string;
    pip?: number;
    symbol: string;
};

export type DigitStrategyId = 'OVER_2_MARKET' | 'UNDER_7_MARKET';

export type DigitStrategyDefinition = {
    alertLabel: string;
    contractType: 'DIGITOVER' | 'DIGITUNDER';
    entryLabel: string;
    id: DigitStrategyId;
    losingDigits: number[];
    minWinningDigits: number;
    triggerDigits: number[];
    triggerLabel: string;
    winBarrier: string;
    winningDigits: number[];
};

export type DigitStrategyEvaluation = {
    alertLabel: string;
    entryReady: boolean;
    isQualified: boolean;
    qualifyingWinningDigits: number[];
    trailingTriggerCount: number;
};

export const SUPPORTED_VOLATILITY_MARKETS: SupportedMarket[] = [
    { label: 'Volatility 10 (1s) Index', pip: 2, symbol: '1HZ10V' },
    { label: 'Volatility 25 (1s) Index', pip: 2, symbol: '1HZ25V' },
    { label: 'Volatility 50 (1s) Index', pip: 2, symbol: '1HZ50V' },
    { label: 'Volatility 75 (1s) Index', pip: 2, symbol: '1HZ75V' },
    { label: 'Volatility 100 (1s) Index', pip: 2, symbol: '1HZ100V' },
    { label: 'Volatility 10 Index', pip: 3, symbol: 'R_10' },
    { label: 'Volatility 25 Index', pip: 3, symbol: 'R_25' },
    { label: 'Volatility 50 Index', pip: 3, symbol: 'R_50' },
    { label: 'Volatility 75 Index', pip: 3, symbol: 'R_75' },
    { label: 'Volatility 100 Index', pip: 2, symbol: 'R_100' },
];

export const DIGIT_STRATEGIES: Record<DigitStrategyId, DigitStrategyDefinition> = {
    OVER_2_MARKET: {
        alertLabel: 'Over 2 Market',
        contractType: 'DIGITOVER',
        entryLabel: 'Wait for one winning digit from 3-9 after 3 trigger digits.',
        id: 'OVER_2_MARKET',
        losingDigits: [0, 1, 2],
        minWinningDigits: 3,
        triggerDigits: [0, 1, 2],
        triggerLabel: '3 consecutive digits below 3',
        winBarrier: '2',
        winningDigits: [3, 4, 5, 6, 7, 8, 9],
    },
    UNDER_7_MARKET: {
        alertLabel: 'Under 7 Market',
        contractType: 'DIGITUNDER',
        entryLabel: 'Wait for one winning digit from 0-6 after 3 trigger digits.',
        id: 'UNDER_7_MARKET',
        losingDigits: [7, 8, 9],
        minWinningDigits: 3,
        triggerDigits: [7, 8, 9],
        triggerLabel: '3 consecutive digits above 6',
        winBarrier: '7',
        winningDigits: [0, 1, 2, 3, 4, 5, 6],
    },
};

const toPercent = (value: number) => Math.round(value * 100) / 100;

export const calculateDigitPercentagesFromDigits = (digits: number[]): Record<number, number> => {
    const counts = new Array(10).fill(0);

    digits.forEach(digit => {
        if (digit >= 0 && digit <= 9) counts[digit] += 1;
    });

    if (digits.length === 0) {
        return Object.fromEntries(counts.map((_, digit) => [digit, 0]));
    }

    return Object.fromEntries(counts.map((count, digit) => [digit, toPercent((count / digits.length) * 100)]));
};

export const evaluateDigitStrategy = (
    strategyId: DigitStrategyId,
    digitPercentages: Record<number, number>,
    recentDigits: number[]
): DigitStrategyEvaluation => {
    const strategy = DIGIT_STRATEGIES[strategyId];

    const losingDigitsOk = strategy.losingDigits.every(digit => (digitPercentages[digit] ?? 0) < 10.5);
    const qualifyingWinningDigits = strategy.winningDigits.filter(digit => (digitPercentages[digit] ?? 0) >= 10.5);
    const isQualified = losingDigitsOk && qualifyingWinningDigits.length >= strategy.minWinningDigits;

    let trailingTriggerCount = 0;
    for (let index = recentDigits.length - 1; index >= 0; index -= 1) {
        if (!strategy.triggerDigits.includes(recentDigits[index])) break;
        trailingTriggerCount += 1;
    }

    const lastFourDigits = recentDigits.slice(-4);
    const entryReady =
        isQualified &&
        lastFourDigits.length === 4 &&
        lastFourDigits.slice(0, 3).every(digit => strategy.triggerDigits.includes(digit)) &&
        strategy.winningDigits.includes(lastFourDigits[3]);

    return {
        alertLabel: strategy.alertLabel,
        entryReady,
        isQualified,
        qualifyingWinningDigits,
        trailingTriggerCount,
    };
};
