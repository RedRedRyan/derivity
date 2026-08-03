import { getMartingaleStakeForRun } from '../martingale-utils';

describe('manual trading martingale stake calculation', () => {
    it('keeps the original stake when martingale is disabled', () => {
        expect(
            getMartingaleStakeForRun({
                stake: 2,
                currentLossStreak: 2,
                martingaleMultiplier: 1.5,
                martingaleMode: 'no_martingale',
                consecutiveLossCount: 2,
            })
        ).toBe(2);
    });

    it('applies the multiplier after the first loss in after-one-loss mode', () => {
        expect(
            getMartingaleStakeForRun({
                stake: 2,
                currentLossStreak: 1,
                martingaleMultiplier: 1.5,
                martingaleMode: 'after_one_loss',
                consecutiveLossCount: 1,
            })
        ).toBe(3);
    });

    it('keeps compounding after the threshold just like auto trades', () => {
        expect(
            getMartingaleStakeForRun({
                stake: 2,
                currentLossStreak: 3,
                martingaleMultiplier: 1.5,
                martingaleMode: 'after_two_losses',
                consecutiveLossCount: 2,
            })
        ).toBe(4.5);
    });

    it('waits for the configured loss threshold before increasing stake', () => {
        expect(
            getMartingaleStakeForRun({
                stake: 2,
                currentLossStreak: 1,
                martingaleMultiplier: 1.5,
                martingaleMode: 'custom_consecutive_loss_trigger',
                consecutiveLossCount: 3,
            })
        ).toBe(2);
    });

    it('compounds once the custom loss threshold is reached', () => {
        expect(
            getMartingaleStakeForRun({
                stake: 2,
                currentLossStreak: 4,
                martingaleMultiplier: 1.5,
                martingaleMode: 'custom_consecutive_loss_trigger',
                consecutiveLossCount: 3,
            })
        ).toBe(4.5);
    });
});
