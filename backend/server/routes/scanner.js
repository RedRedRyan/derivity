const express = require('express');
const { pool } = require('../db');
const router = express.Router();

let lastSignal = null;
let nextScanTime = new Date(Date.now() + 240000); // 4 minutes from now
let scannerStatus = 'initializing';

// Initialize scanner data
async function initializeScannerData() {
    try {
        const result = await pool.query(`
      SELECT * FROM scanner_signals
      WHERE is_valid = true
      ORDER BY scan_time DESC
      LIMIT 1
    `);

        if (result.rows.length > 0) {
            const signal = result.rows[0];
            lastSignal = {
                scanTime: signal.scan_time.toISOString(),
                nextScanTime: nextScanTime.toISOString(),
                marketSymbol: signal.market_symbol,
                marketLabel: signal.market_label,
                groupName: signal.group_name,
                tradeType: signal.trade_type,
                contractType: signal.contract_type,
                direction: signal.direction,
                barrier: signal.barrier,
                confidence: parseFloat(signal.confidence),
                edge: parseFloat(signal.edge),
                zScore: parseFloat(signal.z_score),
                recommendedRuns: signal.recommended_runs,
                signalLabel: signal.signal_label,
                tickCount: signal.tick_count,
                isValid: signal.is_valid,
            };

            console.log(`[Scanner] Loaded last signal from DB: ${signal.market_label} ${signal.direction}`);
            scannerStatus = 'ok';
        }
    } catch (error) {
        console.error('[Scanner] Error loading initial signal:', error);
    }
}

// GET current scanner signal
router.get('/signal', async (req, res, next) => {
    try {
        res.json({
            status: scannerStatus,
            signal: lastSignal,
            nextScanTime: nextScanTime.toISOString(),
        });
    } catch (error) {
        next(error);
    }
});

// POST new scanner signal (internal use)
router.post('/signal', async (req, res, next) => {
    try {
        const {
            marketSymbol,
            marketLabel,
            groupName,
            tradeType,
            contractType,
            direction,
            barrier,
            confidence,
            edge,
            zScore,
            recommendedRuns,
            signalLabel,
            tickCount,
            isValid,
        } = req.body;

        const scanTime = new Date();
        nextScanTime = new Date(scanTime.getTime() + 240000); // 4 minutes

        const result = await pool.query(
            `INSERT INTO scanner_signals (
        scan_time, next_scan_time, market_symbol, market_label, group_name,
        trade_type, contract_type, direction, barrier, confidence, edge,
        z_score, recommended_runs, signal_label, tick_count, is_valid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
            [
                scanTime,
                nextScanTime,
                marketSymbol,
                marketLabel,
                groupName,
                tradeType,
                contractType,
                direction,
                barrier,
                confidence,
                edge,
                zScore,
                recommendedRuns,
                signalLabel,
                tickCount,
                isValid,
            ]
        );

        lastSignal = {
            scanTime: scanTime.toISOString(),
            nextScanTime: nextScanTime.toISOString(),
            marketSymbol,
            marketLabel,
            groupName,
            tradeType,
            contractType,
            direction,
            barrier,
            confidence: parseFloat(confidence),
            edge: parseFloat(edge),
            zScore: parseFloat(zScore),
            recommendedRuns,
            signalLabel,
            tickCount,
            isValid,
        };

        scannerStatus = 'ok';
        res.status(201).json(lastSignal);
    } catch (error) {
        next(error);
    }
});

// Initialize on module load
initializeScannerData();

module.exports = router;
