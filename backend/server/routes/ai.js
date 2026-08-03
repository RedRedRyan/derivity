const express = require('express');

const router = express.Router();

const SUPPORTED_MARKETS = [
    '1HZ10V',
    '1HZ15V',
    '1HZ25V',
    '1HZ30V',
    '1HZ50V',
    '1HZ75V',
    '1HZ90V',
    '1HZ100V',
    'R_10',
    'R_25',
    'R_50',
    'R_75',
    'R_100',
];

const SUPPORTED_TRADE_TYPES = [
    'DIGITOVER',
    'DIGITUNDER',
    'DIGITEVEN',
    'DIGITODD',
    'DIGITMATCH',
    'DIGITDIFF',
    'CALL',
    'PUT',
    'RUNHIGH',
    'RUNLOW',
];

const SUPPORTED_STRATEGY_MODES = ['STANDARD', 'INVERSE', 'PERCENTAGE'];

const autoTradeStrategySchema = {
    type: 'object',
    additionalProperties: false,
    required: ['settings', 'summary', 'warnings', 'unsupportedCapabilities', 'customStrategy', 'confidence'],
    properties: {
        settings: {
            type: 'object',
            additionalProperties: false,
            required: [
                'tradeType',
                'barrier',
                'predictionBeforeLoss',
                'predictionAfterLoss',
                'analysisTicks',
                'selectedMarketSymbols',
                'stake',
                'martingale',
                'takeProfit',
                'stopLoss',
                'streak',
                'strategyMode',
            ],
            properties: {
                tradeType: { anyOf: [{ type: 'string', enum: SUPPORTED_TRADE_TYPES }, { type: 'null' }] },
                barrier: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                predictionBeforeLoss: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                predictionAfterLoss: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                analysisTicks: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                selectedMarketSymbols: {
                    type: 'array',
                    items: { type: 'string', enum: SUPPORTED_MARKETS },
                },
                stake: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                martingale: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                takeProfit: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                stopLoss: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                streak: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                strategyMode: { anyOf: [{ type: 'string', enum: SUPPORTED_STRATEGY_MODES }, { type: 'null' }] },
            },
        },
        summary: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        unsupportedCapabilities: { type: 'array', items: { type: 'string' } },
        customStrategy: {
            type: 'object',
            additionalProperties: false,
            required: ['intent', 'entryRules', 'exitRules', 'riskRules', 'notes'],
            properties: {
                intent: { type: 'string' },
                entryRules: { type: 'array', items: { type: 'string' } },
                exitRules: { type: 'array', items: { type: 'string' } },
                riskRules: { type: 'array', items: { type: 'string' } },
                notes: { type: 'array', items: { type: 'string' } },
            },
        },
        confidence: { type: 'number' },
    },
};

const numberLike = value => {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? String(value) : null;
};

const clampDigit = value => {
    const numeric = Number(value);
    return Number.isInteger(numeric) && numeric >= 0 && numeric <= 9 ? String(numeric) : null;
};

const validatePlan = plan => {
    const safe = {
        settings: {
            tradeType: null,
            barrier: null,
            predictionBeforeLoss: null,
            predictionAfterLoss: null,
            analysisTicks: null,
            selectedMarketSymbols: [],
            stake: null,
            martingale: null,
            takeProfit: null,
            stopLoss: null,
            streak: null,
            strategyMode: null,
        },
        summary: Array.isArray(plan?.summary) ? plan.summary.filter(item => typeof item === 'string') : [],
        warnings: Array.isArray(plan?.warnings) ? plan.warnings.filter(item => typeof item === 'string') : [],
        unsupportedCapabilities: Array.isArray(plan?.unsupportedCapabilities)
            ? plan.unsupportedCapabilities.filter(item => typeof item === 'string')
            : [],
        customStrategy: {
            intent: typeof plan?.customStrategy?.intent === 'string' ? plan.customStrategy.intent : '',
            entryRules: Array.isArray(plan?.customStrategy?.entryRules)
                ? plan.customStrategy.entryRules.filter(item => typeof item === 'string')
                : [],
            exitRules: Array.isArray(plan?.customStrategy?.exitRules)
                ? plan.customStrategy.exitRules.filter(item => typeof item === 'string')
                : [],
            riskRules: Array.isArray(plan?.customStrategy?.riskRules)
                ? plan.customStrategy.riskRules.filter(item => typeof item === 'string')
                : [],
            notes: Array.isArray(plan?.customStrategy?.notes)
                ? plan.customStrategy.notes.filter(item => typeof item === 'string')
                : [],
        },
        confidence: Number.isFinite(Number(plan?.confidence)) ? Math.max(0, Math.min(1, Number(plan.confidence))) : 0,
    };

    const settings = plan?.settings || {};
    if (SUPPORTED_TRADE_TYPES.includes(settings.tradeType)) safe.settings.tradeType = settings.tradeType;
    if (SUPPORTED_STRATEGY_MODES.includes(settings.strategyMode)) safe.settings.strategyMode = settings.strategyMode;

    safe.settings.barrier = clampDigit(settings.barrier);
    safe.settings.predictionBeforeLoss = clampDigit(settings.predictionBeforeLoss);
    safe.settings.predictionAfterLoss = clampDigit(settings.predictionAfterLoss);

    const analysisTicks = Number(settings.analysisTicks);
    if (Number.isInteger(analysisTicks) && analysisTicks >= 1 && analysisTicks <= 10) {
        safe.settings.analysisTicks = String(analysisTicks);
    }

    const streak = Number(settings.streak);
    if (Number.isInteger(streak) && streak >= 2 && streak <= 10) safe.settings.streak = String(streak);

    safe.settings.selectedMarketSymbols = Array.isArray(settings.selectedMarketSymbols)
        ? [...new Set(settings.selectedMarketSymbols.filter(symbol => SUPPORTED_MARKETS.includes(symbol)))]
        : [];

    safe.settings.stake = numberLike(settings.stake);
    safe.settings.martingale = numberLike(settings.martingale);
    safe.settings.takeProfit = numberLike(settings.takeProfit);
    safe.settings.stopLoss = numberLike(settings.stopLoss);

    if (safe.unsupportedCapabilities.length > 0) {
        safe.warnings.push('Some parts of this strategy need new bot logic before they can be traded automatically.');
    }

    return safe;
};

const extractResponseText = response => {
    if (typeof response.output_text === 'string') return response.output_text;

    const content = response.output?.flatMap(item => item.content || []) || [];
    const text = content.find(item => typeof item.text === 'string')?.text;
    if (text) return text;

    throw new Error('OpenAI did not return a text strategy plan.');
};

router.post('/auto-trade-strategy', async (req, res, next) => {
    try {
        const strategyText = String(req.body?.strategyText || '').trim();
        if (!strategyText) {
            res.status(400).json({ error: 'strategyText is required' });
            return;
        }
        if (strategyText.length > 4000) {
            res.status(400).json({ error: 'strategyText is too long' });
            return;
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            res.status(503).json({ error: 'OPENAI_API_KEY is not configured on the backend' });
            return;
        }

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                input: [
                    {
                        role: 'system',
                        content: [
                            {
                                type: 'input_text',
                                text:
                                    'You convert natural-language Deriv auto-trading strategies into executable Auto Trades settings. ' +
                                    'Only output settings the current Auto Trades UI supports. If the user asks for logic that is not supported, ' +
                                    'describe it in unsupportedCapabilities and customStrategy instead of pretending it is executable. ' +
                                    `Supported trade types: ${SUPPORTED_TRADE_TYPES.join(', ')}. ` +
                                    `Supported markets: ${SUPPORTED_MARKETS.join(', ')}. ` +
                                    'Supported modes: STANDARD, INVERSE, PERCENTAGE. analysisTicks and streak are 1-10 where applicable. ' +
                                    'Digit barriers/predictions are 0-9. Use R_25 for normal V25 and 1HZ25V for V25 1s.',
                            },
                        ],
                    },
                    {
                        role: 'user',
                        content: [{ type: 'input_text', text: strategyText }],
                    },
                ],
                text: {
                    format: {
                        type: 'json_schema',
                        name: 'auto_trade_strategy_plan',
                        strict: true,
                        schema: autoTradeStrategySchema,
                    },
                },
                temperature: 0.1,
            }),
        });

        const json = await response.json();
        if (!response.ok) {
            res.status(response.status).json({
                error: json?.error?.message || 'OpenAI strategy generation failed',
            });
            return;
        }

        const plan = JSON.parse(extractResponseText(json));
        res.json(validatePlan(plan));
    } catch (error) {
        next(error);
    }
});

module.exports = router;
