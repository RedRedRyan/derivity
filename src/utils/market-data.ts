import { api_base } from '@/external/bot-skeleton';

export const MARKET_PIP_SIZE: Record<string, number> = {
    '1HZ15V': 3,
    '1HZ30V': 3,
    '1HZ90V': 3,
    '1HZ10V': 2,
    '1HZ25V': 2,
    '1HZ50V': 2,
    '1HZ75V': 2,
    '1HZ100V': 2,
    R_10: 3,
    R_25: 3,
    R_50: 4,
    R_75: 4,
    R_100: 2,
};

export const getMarketPipSize = (symbol: string, fallback = 2) => {
    const api_pip_size = Number((api_base.pip_sizes as Record<string, number | undefined>)?.[symbol]);

    if (Number.isFinite(api_pip_size) && api_pip_size >= 0) return api_pip_size;

    return MARKET_PIP_SIZE[symbol] ?? fallback;
};

export const getLastDigitFromQuote = (quote: number | string, symbol: string, fallback_pip_size = 2) => {
    const pip_size = getMarketPipSize(symbol, fallback_pip_size);
    const normalized_quote = Number(quote).toFixed(pip_size);
    const digit = normalized_quote.replace(/\D/g, '').slice(-1);

    return Number(digit || 0);
};

export const isExpectedStreamInterruption = (error: unknown) => {
    const api_error = (error as any)?.error ?? error;
    const message = String(
        (api_error as any)?.message ?? (api_error as Error)?.message ?? api_error ?? ''
    ).toLowerCase();
    const code = String((api_error as any)?.code ?? '').toLowerCase();

    return (
        code.includes('interrupted') ||
        code.includes('disconnect') ||
        code.includes('closed') ||
        message.includes('interrupted') ||
        message.includes('disconnect') ||
        message.includes('timeout') ||
        message.includes('timed out') ||
        message.includes('network') ||
        message.includes('aborted') ||
        message.includes('connection closed') ||
        message.includes('socket closed') ||
        message.includes('subscription not found')
    );
};
