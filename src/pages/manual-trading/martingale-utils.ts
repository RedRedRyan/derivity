export type ManualMartingaleMode =
    | 'no_martingale'
    | 'after_one_loss'
    | 'after_two_losses'
    | 'custom_consecutive_loss_trigger';

type GetMartingaleStakeForRunArgs = {
    stake: number;
    currentLossStreak: number;
    martingaleMultiplier: number;
    martingaleMode: ManualMartingaleMode;
    consecutiveLossCount: number;
};

const clampMultiplier = (value: number) => Math.max(1.01, Number.isFinite(value) ? value : 1);

export const getMartingaleStakeForRun = ({
    stake,
    currentLossStreak,
    martingaleMultiplier,
    martingaleMode,
    consecutiveLossCount,
}: GetMartingaleStakeForRunArgs) => {
    if (!Number.isFinite(stake) || stake <= 0) return stake;

    if (martingaleMode === 'no_martingale') return stake;

    const multiplier = clampMultiplier(martingaleMultiplier);
    const threshold = Math.max(1, Math.round(consecutiveLossCount || 1));

    const activeThreshold =
        martingaleMode === 'after_one_loss' ? 1 : martingaleMode === 'after_two_losses' ? 2 : threshold;

    if (currentLossStreak < activeThreshold) return stake;

    const multiplierSteps = currentLossStreak - activeThreshold + 1;
    return Number((stake * multiplier ** multiplierSteps).toFixed(2));
};
