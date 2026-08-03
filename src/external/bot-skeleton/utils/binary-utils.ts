import { TickSpotData } from '@deriv/api-types';

export const getLast = (arr: any[]): any => arr && (arr.length === 0 ? undefined : arr[arr.length - 1]);

type TickSpotDataWithRawQuote = TickSpotData & { raw_quote?: string };

export const historyToTicks = (history: any): TickSpotDataWithRawQuote[] =>
    history.times.map((t, idx) => ({
        epoch: +t,
        quote: +history.prices[idx],
        raw_quote: String(history.prices[idx]),
    }));
