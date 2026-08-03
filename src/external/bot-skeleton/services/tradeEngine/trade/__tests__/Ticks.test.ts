jest.mock('@deriv-com/translations', () => ({
    localize: jest.fn((text: string) => text),
}));

jest.mock('@/constants/backend-error-messages', () => ({
    getLocalizedErrorMessage: jest.fn((code: string) => code),
}));

jest.mock('../../utils/helpers', () => ({
    getDirection: jest.fn(),
    getLastDigit: jest.fn(),
}));

const mockApiSend = jest.fn();

jest.mock('../../../../utils/observer', () => ({
    observer: {
        emit: jest.fn(),
    },
}));

jest.mock('../../../api/api-base', () => ({
    api_base: {
        api: {
            send: (...args: unknown[]) => mockApiSend(...args),
        },
    },
}));

import { setRequestWebSocketURL } from '../../../api/legacy-request';
import Ticks from '../Ticks';

describe('Ticks trade engine mixin', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setRequestWebSocketURL('wss://ws.derivws.com/websockets/v3?app_id=1089');
    });

    afterEach(() => {
        setRequestWebSocketURL(null);
    });

    const createEngine = (ticks: unknown[]) => {
        const Engine = Ticks(class {});
        const engine = new Engine() as any;

        engine.symbol = 'R_100';
        engine.$scope = {
            ticksService: {
                pipSizes: {},
                request: jest.fn().mockResolvedValue(ticks),
            },
        };

        return engine;
    };

    it('returns undefined instead of throwing while the first raw tick is unavailable', async () => {
        const engine = createEngine([]);

        await expect(engine.getLastTick(true)).resolves.toBeUndefined();
    });

    it('returns an empty formatted value while the first tick is unavailable', async () => {
        const engine = createEngine([]);

        await expect(engine.getLastTick(false, true)).resolves.toBe('');
    });

    it('uses symbol for accumulator stat proposals on the classic API', async () => {
        mockApiSend.mockResolvedValue({});
        (window as any).Blockly = {
            accumulators_request: {
                symbol: 'R_100',
            },
        };
        const engine = createEngine([]);

        engine.tradeOptions = {
            amount: 1,
            basis: 'stake',
            currency: 'USD',
            growth_rate: 0.01,
            symbol: 'R_100',
        };

        await engine.requestAccumulatorStats();

        expect(mockApiSend).toHaveBeenCalledWith(
            expect.objectContaining({
                contract_type: 'ACCU',
                proposal: 1,
                symbol: 'R_100',
            })
        );
        expect(mockApiSend).not.toHaveBeenCalledWith(expect.objectContaining({ underlying_symbol: 'R_100' }));
    });

    it('uses underlying_symbol for accumulator stat proposals on the new Options API', async () => {
        setRequestWebSocketURL('wss://api.derivws.com/trading/v1/options/ws/demo?otp=example');
        mockApiSend.mockResolvedValue({});
        (window as any).Blockly = {
            accumulators_request: {
                symbol: 'R_100',
            },
        };
        const engine = createEngine([]);

        engine.tradeOptions = {
            amount: 1,
            basis: 'stake',
            currency: 'USD',
            growth_rate: 0.01,
            symbol: 'R_100',
        };

        await engine.requestAccumulatorStats();

        expect(mockApiSend).toHaveBeenCalledWith(
            expect.objectContaining({
                contract_type: 'ACCU',
                proposal: 1,
                underlying_symbol: 'R_100',
            })
        );
        expect(mockApiSend).not.toHaveBeenCalledWith(expect.objectContaining({ symbol: 'R_100' }));
    });
});
