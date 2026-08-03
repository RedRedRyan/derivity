const express = require('express');
const { pool } = require('../db');
const router = express.Router();

// GET all bot ideas
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM bot_ideas ORDER BY submitted_at DESC');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// POST create bot idea
router.post('/', async (req, res, next) => {
    try {
        const { bot_name, strategy_description, submitted_by, bot_xml, bot_xml_filename } = req.body;

        if (!bot_name || !strategy_description || !submitted_by) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (strategy_description.length < 120) {
            return res.status(400).json({ error: 'Description must be at least 120 characters' });
        }

        const result = await pool.query(
            `INSERT INTO bot_ideas 
       (bot_name, strategy_description, submitted_by, bot_xml, bot_xml_filename)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [bot_name, strategy_description, submitted_by, bot_xml || null, bot_xml_filename || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// GET bot idea by ID
router.get('/:id', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM bot_ideas WHERE id = $1', [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bot idea not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// PUT update bot idea
router.put('/:id', async (req, res, next) => {
    try {
        const { bot_name, strategy_description, submitted_by } = req.body;
        const result = await pool.query(
            `UPDATE bot_ideas 
       SET bot_name = $1, strategy_description = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND submitted_by = $4
       RETURNING *`,
            [bot_name, strategy_description, req.params.id, submitted_by]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bot idea not found or unauthorized' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// DELETE bot idea
router.delete('/:id', async (req, res, next) => {
    try {
        const { submitted_by } = req.body;
        const result = await pool.query('DELETE FROM bot_ideas WHERE id = $1 AND submitted_by = $2 RETURNING id', [
            req.params.id,
            submitted_by,
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bot idea not found or unauthorized' });
        }

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// GET bot XML
router.get('/:id/xml', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT bot_xml FROM bot_ideas WHERE id = $1', [req.params.id]);

        if (result.rows.length === 0 || !result.rows[0].bot_xml) {
            return res.status(404).json({ error: 'Bot XML not found' });
        }

        res.json({ bot_xml: result.rows[0].bot_xml });
    } catch (error) {
        next(error);
    }
});

// POST attach bot XML
router.post('/:id/bot-xml', async (req, res, next) => {
    try {
        const { submitted_by, bot_xml, bot_xml_filename } = req.body;
        const result = await pool.query(
            `UPDATE bot_ideas 
       SET bot_xml = $1, bot_xml_filename = $2, developed_by = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
            [bot_xml, bot_xml_filename, submitted_by, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bot idea not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// DELETE bot XML
router.delete('/:id/bot-xml', async (req, res, next) => {
    try {
        const { submitted_by } = req.body;
        const result = await pool.query(
            `UPDATE bot_ideas 
       SET bot_xml = NULL, bot_xml_filename = NULL, developed_by = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bot idea not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
