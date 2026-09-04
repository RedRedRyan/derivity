import { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import { useSmartChartAdaptor } from '@/hooks/useSmartChartAdaptor';
import { useStore } from '@/hooks/useStore';
import { SmartChart, TGranularity } from '@deriv-com/smartcharts-champion';
import { useDevice } from '@deriv-com/ui';
import ToolbarWidgets from '@/pages/chart/toolbar-widgets';
import '@deriv-com/smartcharts-champion/dist/smartcharts.css';
import './accumilatoirs-chart.scss';

/** Mirrors the barrier shape SmartChart expects (shade band between high/low, etc). */
export type TAccumilatoirsChartBarrier = {
    shade?: string;
    color?: string;
    shadeColor?: string;
    foregroundColor?: string;
    high?: number | string;
    low?: number | string;
    relative?: boolean;
    draggable?: boolean;
    hideBarrierLine?: boolean;
    hideOffscreenBarrier?: boolean;
    hideOffscreenLine?: boolean;
    hidePriceLabel?: boolean;
};

type TAccumilatoirsChartProps = {
    barriers?: TAccumilatoirsChartBarrier[];
    symbol?: string;
};

// A focused, self-contained SmartChart instance for the Accumulators ticket:
// same underlying wiring as the main Chart tab (useSmartChartAdaptor + chart_api),
// but driven by this ticket's own selected symbol/barriers instead of the shared
// chart_store, so it doesn't fight with the bot-builder/Chart tab for state.
const AccumilatoirsChart = observer(({ barriers = [], symbol }: TAccumilatoirsChartProps) => {
    const { common, ui } = useStore();
    const { isDesktop, isMobile } = useDevice();
    const { chartData, getQuotes, subscribeQuotes, unsubscribeQuotes } = useSmartChartAdaptor();
    const [chartType, setChartType] = useState('line');
    const [granularity, setGranularity] = useState<TGranularity>(0 as TGranularity);

    const settings = useMemo(
        () => ({
            assetInformation: false,
            countdown: true,
            isAutoScale: true,
            isHighestLowestMarkerEnabled: false,
            language: common.current_language.toLowerCase(),
            position: 'bottom',
            theme: ui.is_dark_mode_on ? 'dark' : 'light',
            whitespace: 0,
        }),
        [common.current_language, ui.is_dark_mode_on]
    );

    const is_connection_opened = !!chart_api?.api;

    if (!symbol || chartData.activeSymbols.length === 0) {
        return (
            <div className='accumilatoirs-chart-shell__loading'>
                <span className='accumilatoirs-loader' aria-hidden='true' />
                Connecting to Deriv chart feed...
            </div>
        );
    }

    return (
        <SmartChart
            id='accumilatoirs-chart'
            key={`accumilatoirs-chart-${symbol}`}
            barriers={barriers}
            chartControlsWidgets={null}
            enabledChartFooter={false}
            toolbarWidget={() => (
                <ToolbarWidgets
                    updateChartType={setChartType}
                    updateGranularity={setGranularity}
                    position={!isDesktop ? 'bottom' : 'top'}
                    isDesktop={isDesktop}
                />
            )}
            chartType={chartType}
            isMobile={isMobile}
            enabledNavigationWidget={isDesktop}
            granularity={granularity}
            getQuotes={getQuotes}
            subscribeQuotes={subscribeQuotes}
            unsubscribeQuotes={unsubscribeQuotes}
            chartData={{ activeSymbols: chartData.activeSymbols, tradingTimes: chartData.tradingTimes }}
            symbol={symbol}
            settings={settings}
            isConnectionOpened={is_connection_opened}
            leftMargin={48}
            drawingToolFloatingMenuPosition={isMobile ? { x: 100, y: 100 } : { x: 200, y: 200 }}
        />
    );
});

export default AccumilatoirsChart;
