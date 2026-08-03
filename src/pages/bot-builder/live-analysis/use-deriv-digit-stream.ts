import { useEffect, useState } from 'react';
import { TAnalysisTick } from './digit-analytics';

const WS_URL = 'wss://api.derivws.com/trading/v1/options/ws/public';
const makeTick = (quote: number, pip_size?: number): TAnalysisTick => {
    const precision = Number.isInteger(pip_size) ? Number(pip_size) : 2;
    const formatted = Number(quote).toFixed(precision);
    return { quote: Number(quote), formatted, digit: Number(formatted.replace(/\D/g, '').at(-1)) };
};

export const useDerivDigitStream = (symbol: string, tick_count: number) => {
    const [ticks, setTicks] = useState<TAnalysisTick[]>([]);
    const [status, setStatus] = useState('connecting');
    useEffect(() => {
        let retry: ReturnType<typeof setTimeout>;
        let socket: WebSocket;
        let closed = false;
        const connect = () => {
            socket = new WebSocket(WS_URL);
            socket.onopen = () =>
                socket.send(
                    JSON.stringify({
                        ticks_history: symbol,
                        count: tick_count,
                        end: 'latest',
                        style: 'ticks',
                        subscribe: 1,
                    })
                );
            socket.onmessage = event => {
                const message = JSON.parse(event.data);
                if (message.history?.prices) {
                    setTicks(
                        message.history.prices
                            .map((price: number) => makeTick(price, message.pip_size))
                            .slice(-tick_count)
                    );
                    setStatus('live');
                } else if (message.tick?.quote !== undefined) {
                    setTicks(current =>
                        [...current, makeTick(message.tick.quote, message.tick.pip_size)].slice(-tick_count)
                    );
                    setStatus('live');
                }
            };
            socket.onerror = () => setStatus('error');
            socket.onclose = () => !closed && (retry = setTimeout(connect, 2000));
        };
        setTicks([]);
        connect();
        return () => {
            closed = true;
            clearTimeout(retry);
            socket?.close();
        };
    }, [symbol, tick_count]);
    return { ticks, status };
};
