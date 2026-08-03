class BestBotStatsServiceError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'BestBotStatsServiceError';
        this.status = status;
    }
}

const getSupabaseConfig = () => {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        throw new BestBotStatsServiceError(
            503,
            'Best bot stats Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        );
    }

    return { url, serviceRoleKey };
};

const supabaseRequest = async (path, { method = 'GET', body } = {}) => {
    const { url, serviceRoleKey } = getSupabaseConfig();
    const response = await fetch(`${url}${path}`, {
        method,
        headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        let message = `Best bot stats Supabase request failed with status ${response.status}.`;

        try {
            const payload = await response.json();
            message = payload.message || payload.error || payload.hint || message;
        } catch {
            const text = await response.text().catch(() => '');
            if (text) {
                message = text;
            }
        }

        throw new BestBotStatsServiceError(response.status, message);
    }

    if (response.status === 204) {
        return null;
    }

    const text = await response.text();
    if (!text) {
        return null;
    }

    return JSON.parse(text);
};

const invokeRpc = async (name, args = {}) => {
    return await supabaseRequest(`/rest/v1/rpc/${name}`, {
        method: 'POST',
        body: args,
    });
};

const getBestBotStats = async () => {
    return (await invokeRpc('get_best_bot_stats', { limit_count: 20 })) || [];
};

const getBestBotStat = async botId => {
    return await invokeRpc('get_best_bot_stat', {
        target_bot_id: String(botId || ''),
    });
};

const upsertBestBotStat = async ({ botId, total_runs, profits, losses, profit_amount, loss_amount }) => {
    return await invokeRpc('upsert_best_bot_stat', {
        target_bot_id: String(botId || ''),
        target_total_runs: Number(total_runs || 0),
        target_profits: Number(profits || 0),
        target_losses: Number(losses || 0),
        target_profit_amount: Number(profit_amount || 0),
        target_loss_amount: Number(loss_amount || 0),
    });
};

module.exports = {
    BestBotStatsServiceError,
    getBestBotStat,
    getBestBotStats,
    upsertBestBotStat,
};
