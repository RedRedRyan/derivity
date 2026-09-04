export const formatMoney = (value: unknown, currency = 'USD') => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return `0.00 ${currency}`;

    return `${amount.toFixed(2)} ${currency}`;
};

export const formatPercent = (value: unknown) => {
    const percent = Number(value);
    if (!Number.isFinite(percent)) return '0.00%';

    return `${percent.toFixed(2)}%`;
};

export const formatQuote = (value: unknown) => {
    const quote = Number(value);
    if (!Number.isFinite(quote)) return '-';

    return quote.toFixed(5).replace(/0+$/, '').replace(/\.$/, '');
};
