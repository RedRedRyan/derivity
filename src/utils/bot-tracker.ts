let activeBot: { source: string; id: string; name: string } | null = null;

export const PREMIUM_PROTECTED_BOT_IDS = ['double-under-bot'];

export const setActiveBot = (source: string, id: string, name: string) => {
    activeBot = { source, id, name };
};

export const getActiveBot = () => activeBot;

export const isPremiumProtectedBot = (bot_id?: string | null) => !!bot_id && PREMIUM_PROTECTED_BOT_IDS.includes(bot_id);

export const isActivePremiumProtectedBot = () => isPremiumProtectedBot(activeBot?.id);

export const clearActiveBot = () => {
    activeBot = null;
};
