import { getLatestBuyTransactionId, isOfficialDerivTelemetryHostname } from '@/utils/telemetry-safety';

describe('telemetry safety', () => {
    it.each(['deriv.com', 'bot.deriv.com', 'staging.deriv.cloud', 'app.binary.sx'])(
        'allows the official host %s',
        hostname => {
            expect(isOfficialDerivTelemetryHostname(hostname)).toBe(true);
        }
    );

    it('disables Deriv telemetry on a white-label host', () => {
        expect(isOfficialDerivTelemetryHostname('riskmanagers.site')).toBe(false);
    });

    it('finds the first valid buy ID while ignoring dividers and partial rows', () => {
        expect(
            getLatestBuyTransactionId([
                { type: 'divider', data: 'run-id' },
                { type: 'contract', data: { contract_id: 42 } },
                { type: 'contract', data: { transaction_ids: { buy: 1001 } } },
            ])
        ).toBe(1001);
    });

    it('returns null when no transaction has a buy ID', () => {
        expect(getLatestBuyTransactionId([{ data: {} }])).toBeNull();
    });
});
