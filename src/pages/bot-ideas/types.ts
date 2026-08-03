export type TBotIdea = {
    id: number;
    bot_name: string;
    strategy_description: string;
    submitted_by: string;
    submitted_at: string;
    total_runs: number;
    profits: number;
    losses: number;
    profit_amount?: number | string | null;
    loss_amount?: number | string | null;
    has_bot_xml?: boolean;
    bot_xml_filename?: string | null;
    developed_by?: string | null;
};

export type TNotification = {
    type: 'success' | 'error';
    message: string;
};
