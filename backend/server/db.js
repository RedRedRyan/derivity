const { Pool } = require('pg');

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
let databaseReady = false;
let lastDatabaseError = hasDatabaseUrl
    ? 'Database connection has not been initialized yet.'
    : 'DATABASE_URL is not configured.';

const createDatabaseUnavailableError = message => {
    const error = new Error(message || 'Database is currently unavailable.');
    error.status = 503;
    return error;
};

const pool = hasDatabaseUrl
    ? new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: {
              rejectUnauthorized: false,
          },
      })
    : {
          query: async () => {
              throw createDatabaseUnavailableError('Database is unavailable because DATABASE_URL is not configured.');
          },
      };

if (hasDatabaseUrl && typeof pool.on === 'function') {
    pool.on('error', err => {
        databaseReady = false;
        lastDatabaseError = err.message || 'Unexpected database error.';
        console.error('[DB] Unexpected error on idle client', err);
    });
}

// Initialize database tables
async function initializeDatabase() {
    if (!hasDatabaseUrl) {
        databaseReady = false;
        console.warn('[DB] Skipping database initialization because DATABASE_URL is not configured.');
        return false;
    }

    try {
        // Bot Ideas table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_ideas (
        id SERIAL PRIMARY KEY,
        bot_name VARCHAR(255) NOT NULL,
        strategy_description TEXT NOT NULL,
        submitted_by VARCHAR(255) NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_runs INTEGER DEFAULT 0,
        profits INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        profit_amount DECIMAL(15, 2),
        loss_amount DECIMAL(15, 2),
        bot_xml TEXT,
        bot_xml_filename VARCHAR(255),
        developed_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Scanner signals table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS scanner_signals (
        id SERIAL PRIMARY KEY,
        scan_time TIMESTAMP NOT NULL,
        next_scan_time TIMESTAMP,
        market_symbol VARCHAR(50) NOT NULL,
        market_label VARCHAR(100),
        group_name VARCHAR(100),
        trade_type VARCHAR(50),
        contract_type VARCHAR(50),
        direction VARCHAR(50),
        barrier INTEGER,
        confidence DECIMAL(5, 2),
        edge DECIMAL(10, 4),
        z_score DECIMAL(10, 4),
        recommended_runs INTEGER,
        signal_label VARCHAR(255),
        tick_count INTEGER,
        is_valid BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Bot statistics table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_stats (
        id SERIAL PRIMARY KEY,
        bot_id VARCHAR(255) NOT NULL UNIQUE,
        total_runs INTEGER DEFAULT 0,
        profits INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        profit_amount DECIMAL(15, 2),
        loss_amount DECIMAL(15, 2),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        databaseReady = true;
        lastDatabaseError = null;
        console.log('[DB] Database connection successful');
        console.log('[DB] Database tables verified / created.');
        return true;
    } catch (err) {
        databaseReady = false;
        lastDatabaseError = err.message || 'Unable to initialize database.';
        console.error('[DB] Error initializing database:', err);
        return false;
    }
}

const getDatabaseStatus = () => ({
    configured: hasDatabaseUrl,
    ready: databaseReady,
    error: lastDatabaseError,
});

module.exports = { pool, initializeDatabase, getDatabaseStatus };
