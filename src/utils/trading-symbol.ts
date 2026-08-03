const INVALID_SYMBOL_VALUES = new Set(['', 'DEFAULT', 'NA']);

export const isValidTradingSymbol = (symbol: unknown): symbol is string => {
    if (typeof symbol !== 'string') return false;
    return !INVALID_SYMBOL_VALUES.has(symbol.trim().toUpperCase());
};
