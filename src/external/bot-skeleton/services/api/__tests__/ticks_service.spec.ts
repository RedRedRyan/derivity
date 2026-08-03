import { Map } from 'immutable';

let messageCallback: ((message: { data: unknown }) => void) | undefined;
const mockSend = jest.fn();
const mockDoUntilDone = jest.fn((action: () => Promise<unknown>) => action());

jest.mock('../api-base', () => ({
    api_base: {
        api: {
            send: mockSend,
            onMessage: () => ({
                subscribe: (callback: (message: { data: unknown }) => void) => {
                    messageCallback = callback;
                    return { unsubscribe: jest.fn() };
                },
            }),
        },
        pushSubscription: jest.fn(),
        pip_sizes: {},
    },
}));

jest.mock('../../tradeEngine/utils/helpers', () => ({
    doUntilDone: mockDoUntilDone,
    getUUID: jest.fn(() => 'test-listener-key'),
}));

jest.mock('../../../utils/observer', () => ({
    observer: {
        emit: jest.fn(),
    },
}));

describe('TicksService', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        messageCallback = undefined;
    });

    it('accepts the first live tick when cached tick history is empty', async () => {
        const { default: TicksService } = await import('../ticks_service');
        const service = new TicksService();

        service.ticks = Map().set('R_100', []);

        expect(() =>
            messageCallback?.({
                data: {
                    msg_type: 'tick',
                    tick: { symbol: 'R_100', id: 'tick-subscription', epoch: 1717420000, quote: 123.45 },
                },
            })
        ).not.toThrow();

        expect(service.ticks.get('R_100')).toEqual([{ epoch: 1717420000, quote: 123.45 }]);
    });

    it('accepts the first live candle when cached candle history is empty', async () => {
        const { default: TicksService } = await import('../ticks_service');
        const service = new TicksService();

        service.candles = Map().setIn(['R_100', 60], []);

        expect(() =>
            messageCallback?.({
                data: {
                    msg_type: 'ohlc',
                    ohlc: {
                        symbol: 'R_100',
                        granularity: 60,
                        id: 'ohlc-subscription',
                        open_time: 1717420000,
                        open: 120,
                        high: 130,
                        low: 110,
                        close: 125,
                    },
                },
            })
        ).not.toThrow();

        expect(service.candles.getIn(['R_100', 60])).toEqual([
            { epoch: 1717420000, open: 120, high: 130, low: 110, close: 125 },
        ]);
    });

    it('pulls a bounded non-subscribing tick history directly from Deriv', async () => {
        mockSend.mockResolvedValue({
            history: {
                times: [1717420000, 1717420001],
                prices: ['123.40', '123.41'],
            },
        });
        const { default: TicksService } = await import('../ticks_service');
        const service = new TicksService();

        await expect(service.requestHistory({ symbol: 'R_100', count: 100 })).resolves.toEqual([
            { epoch: 1717420000, quote: 123.4, raw_quote: '123.40' },
            { epoch: 1717420001, quote: 123.41, raw_quote: '123.41' },
        ]);
        expect(mockSend).toHaveBeenCalledWith({
            ticks_history: 'R_100',
            end: 'latest',
            count: 100,
            style: 'ticks',
        });
    });
});
