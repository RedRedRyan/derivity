export const isLegacyOAuthSession = () => {
    try {
        const activeLoginId = localStorage.getItem('active_loginid');
        const accountsListRaw = localStorage.getItem('accountsList');

        if (!activeLoginId || !accountsListRaw) return false;

        const accountsList = JSON.parse(accountsListRaw);
        return !!accountsList?.[activeLoginId];
    } catch (error) {
        console.error('[LegacyRequest] Failed to detect legacy OAuth session:', error);
        return false;
    }
};

let currentWebSocketURL = '';

export const isLegacyWebSocketURL = url => /\/websockets\/v3(?:[/?]|$)/i.test(String(url || ''));

export const setRequestWebSocketURL = url => {
    currentWebSocketURL = String(url || '');
};

export const getSymbolRequestField = (symbol, webSocketURL = currentWebSocketURL) =>
    isLegacyWebSocketURL(webSocketURL) || !webSocketURL ? { symbol } : { underlying_symbol: symbol };

export const removeUndefinedFields = value => {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(removeUndefinedFields);

    return Object.entries(value).reduce((cleaned, [key, fieldValue]) => {
        if (fieldValue !== undefined) cleaned[key] = removeUndefinedFields(fieldValue);
        return cleaned;
    }, {});
};
