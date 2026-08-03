import React, { CSSProperties, useMemo, useRef, useState } from 'react';
import { calculateDigitAnalytics } from './digit-analytics';
import { useDerivDigitStream } from './use-deriv-digit-stream';
import './live-analysis.scss';

const MARKETS = [
    ['R_10', 'Volatility 10 Index'],
    ['R_25', 'Volatility 25 Index'],
    ['R_50', 'Volatility 50 Index'],
    ['R_75', 'Volatility 75 Index'],
    ['R_100', 'Volatility 100 Index'],
    ['1HZ10V', 'Volatility 10 (1s) Index'],
    ['1HZ25V', 'Volatility 25 (1s) Index'],
    ['1HZ50V', 'Volatility 50 (1s) Index'],
    ['1HZ75V', 'Volatility 75 (1s) Index'],
    ['1HZ100V', 'Volatility 100 (1s) Index'],
] as const;
const SUPPORTED_MARKETS = new Set(MARKETS.map(([value]) => value));
const pct = (value: number) => `${value.toFixed(1)}%`;
const RING_COLORS = { highest: '#0ba95b', secondHighest: '#1127ff', least: '#ff1717', secondLeast: '#ffe733' };

const LiveAnalysis = () => {
    const [visible, setVisible] = useState(false);
    const [symbol, setSymbol] = useState('1HZ50V');
    const [tickCount, setTickCount] = useState(1000);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const panelRef = useRef<HTMLElement>(null);
    const { ticks, status } = useDerivDigitStream(symbol, tickCount);
    const data = useMemo(() => calculateDigitAnalytics(ticks), [ticks]);
    const current = ticks.at(-1);
    const ringColors = useMemo(() => {
        if (!ticks.length) return {} as Record<number, string>;
        const ranked = data.percentages.map((percentage, digit) => ({ digit, percentage }));
        const descending = [...ranked].sort((a, b) => b.percentage - a.percentage || b.digit - a.digit);
        const ascending = [...ranked].sort((a, b) => a.percentage - b.percentage || a.digit - b.digit);
        return {
            [descending[0].digit]: RING_COLORS.highest,
            [descending[1].digit]: RING_COLORS.secondHighest,
            [ascending[0].digit]: RING_COLORS.least,
            [ascending[1].digit]: RING_COLORS.secondLeast,
        };
    }, [data.percentages, ticks.length]);

    React.useEffect(() => {
        const toggle = () => setVisible(value => !value);
        window.addEventListener('dbot:toggle-analysis', toggle);
        return () => window.removeEventListener('dbot:toggle-analysis', toggle);
    }, []);

    React.useEffect(() => {
        const workspace = window.Blockly?.derivWorkspace;
        if (!workspace) return;
        const syncFromWorkspace = () => {
            const marketBlock = workspace
                .getAllBlocks(false)
                .find((block: { type: string }) => block.type === 'trade_definition_market');
            const workspaceSymbol = marketBlock?.getFieldValue('SYMBOL_LIST');
            if (SUPPORTED_MARKETS.has(workspaceSymbol)) setSymbol(workspaceSymbol);
        };
        syncFromWorkspace();
        workspace.addChangeListener(syncFromWorkspace);
        return () => workspace.removeChangeListener(syncFromWorkspace);
    }, [visible]);

    const changeMarket = (nextSymbol: string) => {
        setSymbol(nextSymbol);
        const workspace = window.Blockly?.derivWorkspace;
        const marketBlock = workspace
            ?.getAllBlocks(false)
            .find((block: { type: string }) => block.type === 'trade_definition_market');
        marketBlock?.getField('SYMBOL_LIST')?.setValue(nextSymbol);
    };

    const startDrag = (event: React.PointerEvent) => {
        if (window.innerWidth <= 600 || (event.target as HTMLElement).closest('button, select')) return;
        const panel = panelRef.current;
        if (!panel) return;
        const origin = { clientX: event.clientX, clientY: event.clientY, x: position.x, y: position.y };
        panel.setPointerCapture(event.pointerId);
        const move = (moveEvent: PointerEvent) => {
            const rect = panel.getBoundingClientRect();
            const nextX = origin.x + moveEvent.clientX - origin.clientX;
            const nextY = origin.y + moveEvent.clientY - origin.clientY;
            setPosition({
                x: Math.max(origin.x - rect.left + 8, Math.min(nextX, origin.x + window.innerWidth - rect.right - 8)),
                y: Math.max(origin.y - rect.top + 8, Math.min(nextY, origin.y + window.innerHeight - rect.bottom - 8)),
            });
        };
        const stop = () => {
            panel.removeEventListener('pointermove', move);
            panel.removeEventListener('pointerup', stop);
        };
        panel.addEventListener('pointermove', move);
        panel.addEventListener('pointerup', stop);
    };

    if (!visible) return null;
    const recent = ticks.slice(-10);
    return (
        <section
            ref={panelRef}
            className='live-analysis'
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
            aria-label='Live digit distribution'
        >
            <header className='live-analysis__header' onPointerDown={startDrag}>
                <div>
                    <small>
                        <i className={`live-analysis__dot live-analysis__dot--${status}`} /> LIVE ANALYSIS
                    </small>
                    <h2>Digit Distribution</h2>
                </div>
                <div className='live-analysis__actions'>
                    <label>
                        TICKS{' '}
                        <select value={tickCount} onChange={e => setTickCount(Number(e.target.value))}>
                            {[100, 500, 1000].map(n => (
                                <option key={n}>{n}</option>
                            ))}
                        </select>
                    </label>
                    <button type='button' onClick={() => setVisible(false)} aria-label='Close analysis'>
                        ×
                    </button>
                </div>
            </header>
            <div className='live-analysis__body'>
                <div className='live-analysis__market'>
                    <label>
                        <small>SELECTED MARKET</small>
                        <select value={symbol} onChange={e => changeMarket(e.target.value)}>
                            {MARKETS.map(([value, name]) => (
                                <option key={value} value={value}>
                                    {name}
                                </option>
                            ))}
                        </select>
                        <b>{symbol}</b>
                    </label>
                    <div>
                        <small>CURRENT PRICE</small>
                        <strong>{current?.formatted ?? '—'}</strong>
                    </div>
                </div>
                <div className='live-analysis__digits'>
                    {data.percentages.map((value, digit) => (
                        <div key={digit} className={digit === current?.digit ? 'is-current' : ''}>
                            <div
                                className={ringColors[digit] ? 'has-special-ring' : ''}
                                style={{ '--analysis-ring-color': ringColors[digit] ?? '#666' } as CSSProperties}
                            >
                                <div>
                                    <strong>{digit}</strong>
                                    <span>{value.toFixed(2)}%</span>
                                </div>
                            </div>
                            {digit === current?.digit && <i aria-hidden='true' />}
                        </div>
                    ))}
                </div>
                <div className='live-analysis__recent'>
                    {Array.from({ length: 10 }, (_, index) => recent[index]?.digit).map((digit, index) => (
                        <span className={digit === 0 || Number(digit) >= 7 ? 'is-alert' : ''} key={index}>
                            {digit}
                        </span>
                    ))}
                </div>
                <div className='live-analysis__metrics'>
                    {[
                        ['EVEN', data.even, 'ODD', data.odd],
                        ['RISE', data.rise, 'FALL', data.fall],
                        ['OVER 4', data.overFour, 'UNDER 5', data.underFive],
                    ].map(([left, lval, right, rval]) => (
                        <div key={String(left)}>
                            <p>
                                <b>
                                    {left} {pct(Number(lval))}
                                </b>
                                <b>
                                    {right} {pct(Number(rval))}
                                </b>
                            </p>
                            <span>
                                <i style={{ width: `${lval}%` }} />
                                <i style={{ width: `${rval}%` }} />
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
export default LiveAnalysis;
