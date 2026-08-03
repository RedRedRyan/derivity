const OFFICIAL_DERIV_HOST_SUFFIXES = ['binary.sx', 'deriv.be', 'deriv.cloud', 'deriv.com', 'deriv.me'];

export const isOfficialDerivTelemetryHostname = (hostname: string) => {
    const normalized_hostname = String(hostname || '')
        .trim()
        .toLowerCase();

    return OFFICIAL_DERIV_HOST_SUFFIXES.some(
        suffix => normalized_hostname === suffix || normalized_hostname.endsWith(`.${suffix}`)
    );
};

export const getLatestBuyTransactionId = (transactions: unknown) => {
    if (!Array.isArray(transactions)) return null;

    for (const transaction of transactions) {
        if (!transaction || typeof transaction !== 'object') continue;

        const data = (transaction as { data?: unknown }).data;
        if (!data || typeof data !== 'object') continue;

        const transaction_ids = (data as { transaction_ids?: unknown }).transaction_ids;
        if (!transaction_ids || typeof transaction_ids !== 'object') continue;

        const buy = (transaction_ids as { buy?: unknown }).buy;
        if ((typeof buy === 'number' || typeof buy === 'string') && String(buy).trim()) {
            return buy;
        }
    }

    return null;
};
