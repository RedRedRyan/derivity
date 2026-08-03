const express = require('express');
const {
    BestBotStatsServiceError,
    getBestBotStat,
    getBestBotStats,
    upsertBestBotStat,
} = require('../best-bot-stats-supabase-service');
const router = express.Router();

// GET best bot statistics
router.get('/', async (req, res, next) => {
    try {
        const rows = await getBestBotStats();
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// GET single bot stats
router.get('/:botId', async (req, res, next) => {
    try {
        const row = await getBestBotStat(req.params.botId);
        res.json(row);
    } catch (error) {
        if (error instanceof BestBotStatsServiceError && error.status === 404) {
            return res.status(404).json({ error: 'Bot stats not found' });
        }
        next(error);
    }
});

// POST update bot stats (internal use)
router.post('/:botId', async (req, res, next) => {
    try {
        const { total_runs, profits, losses, profit_amount, loss_amount } = req.body;

        const row = await upsertBestBotStat({
            botId: req.params.botId,
            total_runs,
            profits,
            losses,
            profit_amount,
            loss_amount,
        });

        res.json(row);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
