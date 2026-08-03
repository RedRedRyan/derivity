export type TAnalysisTick = { quote: number; formatted: string; digit: number };

export const calculateDigitAnalytics = (ticks: TAnalysisTick[]) => {
    const counts = Array(10).fill(0) as number[];
    ticks.forEach(({ digit }) => (counts[digit] += 1));
    const total = ticks.length;
    const percentages = counts.map(count => (total ? (count / total) * 100 : 0));
    const evenCount = counts.reduce((sum, count, digit) => sum + (digit % 2 === 0 ? count : 0), 0);
    const overFourCount = counts.slice(5).reduce((sum, count) => sum + count, 0);
    let rises = 0;
    let falls = 0;
    ticks.slice(1).forEach((tick, index) => {
        if (tick.quote > ticks[index].quote) rises += 1;
        if (tick.quote < ticks[index].quote) falls += 1;
    });
    const moves = rises + falls;
    const even = total ? (evenCount / total) * 100 : 0;
    const rise = moves ? (rises / moves) * 100 : 0;
    const overFour = total ? (overFourCount / total) * 100 : 0;
    return {
        percentages,
        even,
        odd: total ? 100 - even : 0,
        rise,
        fall: moves ? 100 - rise : 0,
        overFour,
        underFive: total ? 100 - overFour : 0,
    };
};
