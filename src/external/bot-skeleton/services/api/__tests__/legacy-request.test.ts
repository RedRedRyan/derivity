import { getSymbolRequestField, isLegacyWebSocketURL, setRequestWebSocketURL } from '../legacy-request';

describe('WebSocket request compatibility', () => {
    afterEach(() => {
        setRequestWebSocketURL(null);
    });

    it('uses symbol for the classic WebSocket API', () => {
        setRequestWebSocketURL('wss://ws.derivws.com/websockets/v3?app_id=1089');

        expect(isLegacyWebSocketURL('wss://ws.derivws.com/websockets/v3?app_id=1089')).toBe(true);
        expect(getSymbolRequestField('R_100')).toEqual({ symbol: 'R_100' });
    });

    it('uses underlying_symbol for the new Options WebSocket API', () => {
        setRequestWebSocketURL('wss://api.derivws.com/trading/v1/options/ws/demo?otp=example');

        expect(getSymbolRequestField('R_100')).toEqual({ underlying_symbol: 'R_100' });
    });

    it('can normalize a request for an explicit fallback endpoint', () => {
        setRequestWebSocketURL('wss://api.derivws.com/trading/v1/options/ws/public');

        expect(getSymbolRequestField('R_100', 'wss://ws.derivws.com/websockets/v3?app_id=1089')).toEqual({
            symbol: 'R_100',
        });
    });
});
