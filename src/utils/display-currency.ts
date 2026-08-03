import { addComma, formatMoney } from '@/components/shared';

export const DISPLAY_CURRENCIES = ['USD', 'KES'] as const;

export type TDisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

const DEFAULT_USD_KES_RATE = 129;

const normalizeCurrency = (currency?: string | null) => (currency || 'USD').toUpperCase();

export const isSupportedDisplayCurrency = (currency?: string | null): currency is TDisplayCurrency =>
    DISPLAY_CURRENCIES.includes(normalizeCurrency(currency) as TDisplayCurrency);

export const sanitizeUsdKesRate = (value?: number | null) =>
    Number.isFinite(value) && Number(value) > 0 ? Number(value) : DEFAULT_USD_KES_RATE;

export const resolveDisplayCurrency = (
    currency?: string | null,
    fallback: TDisplayCurrency = 'USD'
): TDisplayCurrency =>
    isSupportedDisplayCurrency(currency) ? (normalizeCurrency(currency) as TDisplayCurrency) : fallback;

export const convertDisplayAmount = (
    amount: number | string,
    sourceCurrency: string,
    displayCurrency: TDisplayCurrency,
    usdKesRate?: number | null
) => {
    const numericAmount = Number(String(amount ?? 0).replace(/,/g, ''));
    if (!Number.isFinite(numericAmount)) return 0;

    const normalizedSource = normalizeCurrency(sourceCurrency);
    const normalizedDisplay = resolveDisplayCurrency(displayCurrency);
    const rate = sanitizeUsdKesRate(usdKesRate);

    if (normalizedSource === normalizedDisplay) return numericAmount;
    if (normalizedSource === 'USD' && normalizedDisplay === 'KES') return numericAmount * rate;
    if (normalizedSource === 'KES' && normalizedDisplay === 'USD') return numericAmount / rate;

    return numericAmount;
};

export const getDisplayMoney = (
    amount: number | string,
    sourceCurrency: string,
    displayCurrency: TDisplayCurrency,
    usdKesRate?: number | null
) => {
    const normalizedSource = normalizeCurrency(sourceCurrency);
    const normalizedDisplay = resolveDisplayCurrency(displayCurrency);

    if (!['USD', 'KES'].includes(normalizedSource)) {
        return {
            amount: Number(String(amount ?? 0).replace(/,/g, '')) || 0,
            currency: normalizedSource || 'USD',
        };
    }

    return {
        amount: convertDisplayAmount(amount, normalizedSource, normalizedDisplay, usdKesRate),
        currency: normalizedDisplay,
    };
};

export const formatDisplayMoneyValue = (
    amount: number | string,
    sourceCurrency: string,
    displayCurrency: TDisplayCurrency,
    usdKesRate?: number | null,
    showCurrency = true
) => {
    const resolved = getDisplayMoney(amount, sourceCurrency, displayCurrency, usdKesRate);
    const formattedAmount = formatMoney(resolved.currency, resolved.amount, true, 0, 0);
    return showCurrency ? `${formattedAmount} ${resolved.currency}` : formattedAmount;
};

export const formatDisplayBalanceValue = (
    amount: number | string,
    sourceCurrency: string,
    displayCurrency: TDisplayCurrency,
    usdKesRate?: number | null
) => {
    const resolved = getDisplayMoney(amount, sourceCurrency, displayCurrency, usdKesRate);
    return `${addComma(resolved.amount.toFixed(2))} ${resolved.currency}`;
};
