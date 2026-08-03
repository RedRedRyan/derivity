import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import ChunkLoader from '@/components/loader/chunk-loader';
import ChartSettingsModal from '@/components/ui/chart-settings-modal/ChartSettingsModal';
import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import { useSmartChartAdaptor } from '@/hooks/useSmartChartAdaptor';
import { useStore } from '@/hooks/useStore';
import { FastMarker, SmartChart, TGranularity, TStateChangeListener } from '@deriv-com/smartcharts-champion';
import { useDevice } from '@deriv-com/ui';
import ToolbarWidgets from './toolbar-widgets';
import '@deriv-com/smartcharts-champion/dist/smartcharts.css';

const getPrecisionFromPip = (pip?: number) => {
    if (!pip || !Number.isFinite(pip)) return 2;

    const pipString = pip.toString();
    if (!pipString.includes('.')) return 0;

    return pipString.split('.')[1].replace(/0+$/, '').length;
};

const getEpochFromQuote = (quote?: any) => {
    const candidates = [quote?.Date, quote?.date, quote?.epoch, quote?.tick?.epoch, quote?.ohlc?.epoch, quote?.DT];

    for (const candidate of candidates) {
        if (candidate instanceof Date) {
            const epoch = Math.floor(candidate.getTime() / 1000);
            if (Number.isFinite(epoch)) return epoch;
        }

        const numeric_epoch = Number(candidate);
        if (Number.isFinite(numeric_epoch) && numeric_epoch > 0) return numeric_epoch;

        if (typeof candidate === 'string') {
            const parsed_epoch = Math.floor(Date.parse(candidate) / 1000);
            if (Number.isFinite(parsed_epoch) && parsed_epoch > 0) return parsed_epoch;
        }
    }

    return null;
};

const getPriceFromQuote = (quote?: any) => {
    const candidates = [quote?.Close, quote?.close, quote?.quote, quote?.price, quote?.tick?.quote, quote?.ohlc?.close];

    for (const candidate of candidates) {
        const price = Number(candidate);
        if (Number.isFinite(price)) return price;
    }

    return null;
};

type TLiveMarkerHandle = {
    div?: HTMLDivElement | null;
    setPosition: (position: { epoch: number | null; price: number | null }) => void;
};

type TChartProps = {
    chart_instance_id: string;
    chart_type_override?: string;
    granularity_override?: number;
    show_digits_stats: boolean;
};

const Chart = observer(
    ({ chart_instance_id, chart_type_override, granularity_override, show_digits_stats }: TChartProps) => {
        const barriers: [] = [];
        const { common, ui } = useStore();
        const { chart_store, run_panel, dashboard } = useStore();
        const [isSafari, setIsSafari] = useState(false);
        const [current_price, setCurrentPrice] = useState<number | null>(null);
        const [current_epoch, setCurrentEpoch] = useState<number | null>(null);
        const live_marker_ref = useRef<TLiveMarkerHandle | null>(null);
        const marker_geometry_frame_ref = useRef<number | null>(null);

        const {
            chart_type,
            getMarketsOrder,
            granularity,
            setChartStatus,
            symbol,
            updateChartType,
            updateGranularity,
            updateSymbol,
        } = chart_store;

        const { chartData, getQuotes, subscribeQuotes, unsubscribeQuotes } = useSmartChartAdaptor();
        const { isDesktop, isMobile } = useDevice();
        const { is_drawer_open } = run_panel;
        const { is_chart_modal_visible } = dashboard;
        const activeSymbol = chartData.activeSymbols.find(active_symbol => active_symbol.symbol === symbol);
        const price_precision = useMemo(() => getPrecisionFromPip(activeSymbol?.pip), [activeSymbol?.pip]);
        const display_chart_type = chart_type_override ?? chart_type;
        const display_granularity = (granularity_override ?? granularity ?? 0) as TGranularity;
        const live_marker_granularity = 0 as TGranularity;

        const chartStyle = {
            backgroundColor: ui.backgroundColor,
            '--candle-up-color': ui.candleUpColor,
            '--candle-down-color': ui.candleDownColor,
            '--background-color': ui.backgroundColor,
            '--show-grid': ui.showGrid ? '1' : '0',
            '--candle-mode': ui.candleMode,
        };

        const settings = {
            assetInformation: false,
            countdown: true,
            isAutoScale: true,
            isHighestLowestMarkerEnabled: false,
            language: common.current_language.toLowerCase(),
            position: ui.is_chart_layout_default ? 'bottom' : 'left',
            theme: ui.is_dark_mode_on ? 'dark' : 'light',
            whitespace: 0,
        };

        useEffect(() => {
            const isSafariBrowser = () => {
                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                const hasWebkitFeatures = 'webkitAudioContext' in window || 'WebKitMediaSource' in window;

                return isSafari && hasWebkitFeatures;
            };

            setIsSafari(isSafariBrowser());

            return () => {
                chart_api.api.forgetAll('ticks');
            };
        }, []);

        useEffect(() => {
            if (!symbol) updateSymbol();
        }, [symbol, updateSymbol]);

        useEffect(() => {
            let is_cancelled = false;

            const loadInitialMarker = async () => {
                if (!symbol) return;

                try {
                    const initial_quotes = await getQuotes({
                        symbol,
                        granularity: live_marker_granularity,
                        count: 200,
                    });

                    if (is_cancelled) return;

                    const latest_quote = (initial_quotes as any).quotes?.at?.(-1);
                    const latest_candle = initial_quotes.candles?.at(-1);
                    const latest_tick_price = initial_quotes.history?.prices?.at(-1);
                    const latest_tick_time = initial_quotes.history?.times?.at(-1);

                    const latest_price = getPriceFromQuote(latest_quote) ?? latest_candle?.close ?? latest_tick_price ?? null;
                    const latest_epoch = getEpochFromQuote(latest_quote) ?? latest_candle?.epoch ?? latest_tick_time ?? null;

                    setCurrentPrice(typeof latest_price === 'number' ? latest_price : null);
                    setCurrentEpoch(typeof latest_epoch === 'number' ? latest_epoch : null);
                } catch {
                    setCurrentPrice(null);
                    setCurrentEpoch(null);
                }
            };

            void loadInitialMarker();

            return () => {
                is_cancelled = true;
                setCurrentPrice(null);
                setCurrentEpoch(null);
            };
        }, [getQuotes, live_marker_granularity, symbol]);

        useEffect(() => {
            if (!symbol) return undefined;

            const unsubscribe_live_quote = subscribeQuotes(
                {
                    symbol,
                    granularity: live_marker_granularity,
                },
                quote => {
                    const next_price = getPriceFromQuote(quote);
                    const next_epoch = getEpochFromQuote(quote) ?? Math.floor(Date.now() / 1000);

                    setCurrentPrice(next_price);
                    setCurrentEpoch(next_epoch);
                }
            );

            return () => {
                unsubscribe_live_quote?.();
                unsubscribeQuotes({
                    symbol,
                    granularity: live_marker_granularity,
                });
            };
        }, [live_marker_granularity, subscribeQuotes, symbol, unsubscribeQuotes]);

        const updateLiveMarkerGeometry = useCallback(() => {
            const marker = live_marker_ref.current;
            const marker_div = marker?.div;
            if (!marker_div) return;

            const marker_rect = marker_div.getBoundingClientRect();
            const chart_container = marker_div.closest('.dashboard__chart-wrapper') ?? marker_div.parentElement;
            const chart_rect = chart_container?.getBoundingClientRect();
            const chart_right = chart_rect?.right ?? window.innerWidth;
            const line_width = Math.max(0, chart_right - marker_rect.left);

            marker_div.style.setProperty('--live-price-line-width', `${line_width}px`);
        }, []);

        const scheduleLiveMarkerGeometry = useCallback(() => {
            if (marker_geometry_frame_ref.current !== null) {
                window.cancelAnimationFrame(marker_geometry_frame_ref.current);
            }

            marker_geometry_frame_ref.current = window.requestAnimationFrame(() => {
                marker_geometry_frame_ref.current = null;
                updateLiveMarkerGeometry();
            });
        }, [updateLiveMarkerGeometry]);

        const setLiveMarker = useCallback((marker: TLiveMarkerHandle | null) => {
            live_marker_ref.current = marker;
            if (marker) scheduleLiveMarkerGeometry();
        }, [scheduleLiveMarkerGeometry]);

        const positionLiveMarker = useCallback(() => {
            const marker = live_marker_ref.current;
            if (!marker) return;

            const marker_epoch = Number.isFinite(Number(current_epoch)) ? Number(current_epoch) : null;
            const marker_price = Number.isFinite(Number(current_price)) ? Number(current_price) : null;

            marker.setPosition({
                epoch: marker_epoch,
                price: marker_price,
            });

            if (marker.div) {
                marker.div.setAttribute('data-epoch', marker_epoch === null ? '' : String(marker_epoch));
                marker.div.setAttribute(
                    'data-price',
                    marker_price === null ? '' : marker_price.toFixed(price_precision)
                );
            }

            scheduleLiveMarkerGeometry();
        }, [current_epoch, current_price, price_precision, scheduleLiveMarkerGeometry]);

        useEffect(() => {
            positionLiveMarker();
        }, [positionLiveMarker]);

        useEffect(() => {
            window.addEventListener('resize', scheduleLiveMarkerGeometry);

            return () => {
                window.removeEventListener('resize', scheduleLiveMarkerGeometry);
                if (marker_geometry_frame_ref.current !== null) {
                    window.cancelAnimationFrame(marker_geometry_frame_ref.current);
                }
            };
        }, [scheduleLiveMarkerGeometry]);

        const is_connection_opened = !!chart_api?.api;

        const handleStateChange: TStateChangeListener = state => {
            if (state === 'READY') {
                setChartStatus(true);
                window.requestAnimationFrame(positionLiveMarker);
            }
        };

        if (!symbol || chartData.activeSymbols.length === 0) {
            return <ChunkLoader message='' />;
        }

        return (
            <>
                <div
                    className={classNames('dashboard__chart-wrapper', {
                        'dashboard__chart-wrapper--expanded': is_drawer_open && isDesktop,
                        'dashboard__chart-wrapper--modal': is_chart_modal_visible && isDesktop,
                        'dashboard__chart-wrapper--safari': isSafari,
                    })}
                    style={chartStyle}
                    dir='ltr'
                >
                    <SmartChart
                        id={`dbot-${chart_instance_id}-${symbol}`}
                        key={`chart-${chart_instance_id}-${symbol}`}
                        barriers={barriers}
                        showLastDigitStats={show_digits_stats}
                        chartControlsWidgets={null}
                        enabledChartFooter={false}
                        stateChangeListener={handleStateChange}
                        toolbarWidget={() => (
                            <ToolbarWidgets
                                updateChartType={updateChartType}
                                updateGranularity={updateGranularity}
                                position={!isDesktop ? 'bottom' : 'top'}
                                isDesktop={isDesktop}
                            />
                        )}
                        chartType={display_chart_type}
                        isMobile={isMobile}
                        enabledNavigationWidget={isDesktop}
                        granularity={display_granularity}
                        getQuotes={getQuotes}
                        subscribeQuotes={subscribeQuotes}
                        unsubscribeQuotes={unsubscribeQuotes}
                        chartData={{ activeSymbols: chartData.activeSymbols, tradingTimes: chartData.tradingTimes }}
                        symbol={symbol}
                        settings={settings}
                        isConnectionOpened={is_connection_opened}
                        getMarketsOrder={getMarketsOrder}
                        leftMargin={80}
                        drawingToolFloatingMenuPosition={isMobile ? { x: 100, y: 100 } : { x: 200, y: 200 }}
                    >
                        <FastMarker markerRef={setLiveMarker} className='dashboard__live-price-marker'>
                            <span className='dashboard__live-price-marker__dot' />
                            <span className='dashboard__live-price-marker__line' />
                            <span className='dashboard__live-price-marker__value'>
                                {current_price === null ? '' : current_price.toFixed(price_precision)}
                            </span>
                        </FastMarker>
                    </SmartChart>
                </div>
                {ui.showChartSettingsModal && <ChartSettingsModal />}
            </>
        );
    }
);

export default Chart;
