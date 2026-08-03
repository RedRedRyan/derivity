const express = require('express');

const router = express.Router();

const CACHE_TTL_MS = 10 * 60 * 1000;

let cachedRate = null;
let cachedAt = 0;

const getCachedResponse = () => {
    if (!cachedRate || Date.now() - cachedAt > CACHE_TTL_MS) {
        return null;
    }

    return cachedRate;
};

const setCachedResponse = payload => {
    cachedRate = payload;
    cachedAt = Date.now();
    return payload;
};

const fetchJson = async url => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Rate provider failed with status ${response.status}`);
    }
    return response.json();
};

const fetchFromExchangeRateApi = async () => {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) return null;

    const data = await fetchJson(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
    const rate = Number(data?.conversion_rates?.KES);
    if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error('ExchangeRate-API did not return a valid USD/KES rate');
    }

    return {
        rate,
        base: 'USD',
        quote: 'KES',
        provider: 'ExchangeRate-API',
        updated_at: new Date().toISOString(),
    };
};

const fetchFromOpenExchangeRateApi = async () => {
    const data = await fetchJson('https://open.er-api.com/v6/latest/USD');
    const rate = Number(data?.rates?.KES);
    if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error('Open ExchangeRate API did not return a valid USD/KES rate');
    }

    return {
        rate,
        base: 'USD',
        quote: 'KES',
        provider: 'Open ExchangeRate API',
        updated_at: data?.time_last_update_utc || new Date().toISOString(),
    };
};

router.get('/usd-kes', async (req, res, next) => {
    try {
        const cached = getCachedResponse();
        if (cached) {
            res.json({ ...cached, cached: true });
            return;
        }

        const payload = setCachedResponse((await fetchFromExchangeRateApi()) || (await fetchFromOpenExchangeRateApi()));

        res.json({ ...payload, cached: false });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
