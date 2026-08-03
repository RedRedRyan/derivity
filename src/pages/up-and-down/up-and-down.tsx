import { useCallback, useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import SettingsButton from '@/components/ui/settings-button/SettingsButton';
import { DBOT_TABS } from '@/constants/bot-contents';
import { api_base } from '@/external/bot-skeleton';
import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import { useStore } from '@/hooks/useStore';
import ChartWrapper from '@/pages/chart/chart-wrapper';
import {
    buyContractForUi,
    getContractSnapshot,
    normalizeTradeParameters,
    streamContractUntilSettled,
} from '@/utils/trade-purchase';
import styles from './up-and-down.module.scss';

type TTradeTypeId =
    | 'rise_fall'
    | 'higher_lower'
    | 'digits'
    | 'touch_no_touch'
    | 'ends_in_out'
    | 'stays_in_out'
    | 'asian'
    | 'multiplier'
    | 'accumulator'
    | 'reset'
    | 'lookback'
    | 'only_ups_downs';

type TProposalPreview = Partial<Record<'CALL' | 'PUT', number>>;
type TDirection = -1 | 0 | 1;
type TSignalSnapshot = {
    confidence: number;
    fallPercentage: number;
    preferredContract: 'CALL' | 'PUT' | null;
    risePercentage: number;
    sampleSize: number;
};
type TContractCard = {
    buy_price?: number;
    contract_id: string;
    contract_type: 'CALL' | 'PUT';
    currency: string;
    entry_spot?: string | number;
    exit_spot?: string | number;
    live_price?: number;
    payout?: number;
    profit?: number;
    status: string;
    transaction_id?: string | number;
};

const TRADE_TYPES: Array<{ id: TTradeTypeId; label: string; glyph: string }> = [
    { id: 'rise_fall', label: 'Rise / Fall', glyph: '/' },
    { id: 'higher_lower', label: 'Higher / Lower', glyph: '^' },
    { id: 'digits', label: 'Digits', glyph: '::' },
    { id: 'touch_no_touch', label: 'Touch / No Touch', glyph: 'x' },
    { id: 'ends_in_out', label: 'Ends In / Out', glyph: '->' },
    { id: 'stays_in_out', label: 'Stays In / Out', glyph: '<>' },
    { id: 'asian', label: 'Asian', glyph: '~' },
    { id: 'multiplier', label: 'Multiplier', glyph: 'x' },
    { id: 'accumulator', label: 'Accumulator', glyph: '+' },
    { id: 'reset', label: 'Reset', glyph: 'R' },
    { id: 'lookback', label: 'Lookback', glyph: 'O' },
    { id: 'only_ups_downs', label: 'Only Ups/Downs', glyph: '/\\' },
];

const MARKET_LABELS: Record<string, string> = {
    '1HZ100V': 'Volatility 100 (1s) Index',
    '1HZ10V': 'Volatility 10 (1s) Index',
    '1HZ25V': 'Volatility 25 (1s) Index',
    '1HZ50V': 'Volatility 50 (1s) Index',
    '1HZ75V': 'Volatility 75 (1s) Index',
    R_10: 'Volatility 10 Index',
    R_25: 'Volatility 25 Index',
    R_50: 'Volatility 50 Index',
    R_75: 'Volatility 75 Index',
    R_100: 'Volatility 100 Index',
};

const toPositiveNumber = (value: string) => {
    const next_value = Number(value);
    return Number.isFinite(next_value) && next_value > 0 ? next_value : null;
};

const clampTicks = (value: string) => {
    const next_value = Number(value);
    if (!Number.isFinite(next_value)) return null;
    return Math.min(Math.max(Math.round(next_value), 1), 10);
};

const formatMoney = (amount: number | undefined, currency: string) =>
    typeof amount === 'number' && Number.isFinite(amount) ? `${amount.toFixed(2)} ${currency}` : '--';

const formatPrice = (price?: number | string) => {
    const next_price = Number(price);
    return Number.isFinite(next_price) ? next_price.toFixed(2) : '--';
};

const computePercentage = (base_amount: number, target_amount: number): number => {
    if (base_amount === 0 || Number.isNaN(base_amount) || Number.isNaN(target_amount)) return 0;
    return Number(((target_amount / base_amount) * 100).toFixed(2));
};

const calculateDirectionSignal = (prices: number[]): TSignalSnapshot => {
    const direction_history = prices.slice(1).map<TDirection>((price, index) => {
        const previous_price = prices[index];
        if (price > previous_price) return 1;
        if (price < previous_price) return -1;
        return 0;
    });
    const directional_ticks = direction_history.filter(direction => direction !== 0);

    if (directional_ticks.length === 0) {
        return { confidence: 0, fallPercentage: 0, preferredContract: null, risePercentage: 0, sampleSize: 0 };
    }

    const rising_ticks = directional_ticks.filter(direction => direction === 1).length;
    const risePercentage = computePercentage(directional_ticks.length, rising_ticks);
    const fallPercentage = Number((100 - risePercentage).toFixed(2));
    const confidence = Math.min(100, Math.abs(risePercentage - fallPercentage) * 2);
    const preferredContract =
        risePercentage === fallPercentage ? null : risePercentage > fallPercentage ? 'CALL' : 'PUT';

    return { confidence, fallPercentage, preferredContract, risePercentage, sampleSize: directional_ticks.length };
};

const getContractStatusLabel = (status: string) => {
    const normalized_status = status.toLowerCase();
    if (normalized_status === 'won') return 'Won';
    if (normalized_status === 'lost') return 'Lost';
    if (normalized_status === 'sold') return 'Sold';
    return 'Live';
};

const getDerivWebSocketUrl = () => {
    const stored_app_id =
        typeof window !== 'undefined' ? window.localStorage.getItem('config.app_id') || undefined : undefined;
    const app_id = stored_app_id || process.env.APP_ID || '1089';

    return `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(app_id)}`;
};

const sendPublicDerivRequest = (payload: Record<string, unknown>) =>
    new Promise<any>((resolve, reject) => {
        if (typeof WebSocket === 'undefined') {
            reject(new Error('WebSocket is not available in this browser.'));
            return;
        }

        const web_socket_url = getDerivWebSocketUrl();
        const normalized_payload = normalizeTradeParameters(payload, web_socket_url);
        const socket = new WebSocket(web_socket_url);
        let is_settled = false;
        const timeout_id = window.setTimeout(() => {
            if (is_settled) return;
            is_settled = true;
            socket.close();
            reject(new Error('Unable to fetch a live proposal.'));
        }, 10000);

        const settle = (handler: () => void) => {
            if (is_settled) return;
            is_settled = true;
            window.clearTimeout(timeout_id);
            handler();
            socket.close();
        };

        socket.onopen = () => {
            socket.send(JSON.stringify(normalized_payload));
        };
        socket.onmessage = event => {
            settle(() => {
                try {
                    resolve(JSON.parse(event.data));
                } catch {
                    reject(new Error('Unable to read the live proposal response.'));
                }
            });
        };
        socket.onerror = () => {
            settle(() => reject(new Error('Unable to fetch a live proposal.')));
        };
        socket.onclose = () => {
            if (!is_settled) settle(() => reject(new Error('Unable to fetch a live proposal.')));
        };
    });

const subscribePublicTicks = (symbol: string, onTick: (price: number) => void, onError: (error: unknown) => void) => {
    if (typeof WebSocket === 'undefined') return () => {};

    const socket = new WebSocket(getDerivWebSocketUrl());
    let is_closed = false;

    socket.onopen = () => {
        socket.send(
            JSON.stringify({
                count: 1,
                end: 'latest',
                style: 'ticks',
                subscribe: 1,
                ticks_history: symbol,
            })
        );
    };
    socket.onmessage = event => {
        try {
            const response = JSON.parse(event.data);
            if (response?.error) {
                onError(response.error);
                return;
            }

            const history_price = Array.isArray(response?.history?.prices) ? response.history.prices.at(-1) : undefined;
            const next_price = Number(response?.tick?.quote ?? history_price);
            if (Number.isFinite(next_price)) onTick(next_price);
        } catch (error) {
            onError(error);
        }
    };
    socket.onerror = error => {
        if (!is_closed) onError(error);
    };

    return () => {
        is_closed = true;
        socket.close();
    };
};

const sendProposalRequest = async (payload: Record<string, unknown>) => {
    const primary_api = api_base.api;
    let api_error: unknown;

    try {
        if (primary_api?.send) {
            const response = await primary_api.send(payload);
            if (response?.proposal || !response?.error) return response;
            api_error = response.error;
        }
    } catch (error) {
        api_error = error;
    }

    try {
        if (!chart_api.api) await chart_api.init();
        const response = await chart_api.api?.send?.(payload);
        if (response?.proposal || !response?.error) return response;
        api_error = response.error;
    } catch (error) {
        api_error = error;
    }

    try {
        return await sendPublicDerivRequest(payload);
    } catch (public_error) {
        const message =
            (api_error as any)?.message ||
            (public_error instanceof Error ? public_error.message : 'Unable to fetch a live proposal.');
        throw new Error(message);
    }
};

const UpAndDown = observer(() => {
    const {
        chart_store,
        client,
        dashboard: { active_tab },
        ui: { showChartSettingsModal, setShowChartSettingsModal },
    } = useStore();

    const [selected_trade_type, setSelectedTradeType] = useState<TTradeTypeId>('rise_fall');
    const [duration, setDuration] = useState('1');
    const [stake, setStake] = useState('0.6');
    const [is_auto_signal_on, setIsAutoSignalOn] = useState(false);
    const [is_more_settings_open, setIsMoreSettingsOpen] = useState(false);
    const [proposal_preview, setProposalPreview] = useState<TProposalPreview>({});
    const [proposal_message, setProposalMessage] = useState('');
    const [is_proposal_loading, setIsProposalLoading] = useState(false);
    const [is_purchasing, setIsPurchasing] = useState(false);
    const [trade_message, setTradeMessage] = useState('');
    const [live_price, setLivePrice] = useState<number | null>(null);
    const [price_history, setPriceHistory] = useState<number[]>([]);
    const [purchased_contracts, setPurchasedContracts] = useState<TContractCard[]>([]);

    const currency = client.currency || 'USD';
    const selected_symbol = chart_store.symbol;
    const selected_trade_type_label =
        TRADE_TYPES.find(trade_type => trade_type.id === selected_trade_type)?.label ?? 'Rise / Fall';
    const market_label = selected_symbol ? MARKET_LABELS[selected_symbol] || selected_symbol : 'Loading market...';
    const normalized_stake = useMemo(() => toPositiveNumber(stake), [stake]);
    const normalized_duration = useMemo(() => clampTicks(duration), [duration]);
    const can_quote =
        selected_trade_type === 'rise_fall' && !!selected_symbol && !!normalized_stake && !!normalized_duration;
    const can_purchase = can_quote && !is_purchasing;
    const signal_snapshot = useMemo(() => calculateDirectionSignal(price_history), [price_history]);

    const base_trade_parameters = useMemo(() => {
        if (!selected_symbol || !normalized_stake || !normalized_duration) return null;

        return {
            amount: normalized_stake,
            basis: 'stake',
            currency,
            duration: normalized_duration,
            duration_unit: 't',
            symbol: selected_symbol,
        };
    }, [currency, normalized_duration, normalized_stake, selected_symbol]);

    useEffect(() => {
        if (!can_quote || !base_trade_parameters) {
            setProposalPreview({});
            setProposalMessage(
                selected_trade_type === 'rise_fall'
                    ? 'Enter a valid stake and duration to quote Rise/Fall.'
                    : 'Live purchase is enabled for Rise / Fall on this page.'
            );
            setIsProposalLoading(false);
            return undefined;
        }

        let is_cancelled = false;
        const proposal_timer = window.setTimeout(async () => {
            setIsProposalLoading(true);
            setProposalMessage('Requesting live Deriv proposal...');

            try {
                const [rise_response, fall_response] = await Promise.all(
                    (['CALL', 'PUT'] as const).map(contract_type =>
                        sendProposalRequest({
                            proposal: 1,
                            ...normalizeTradeParameters({
                                ...base_trade_parameters,
                                contract_type,
                            }),
                        })
                    )
                );

                if (is_cancelled) return;

                if (rise_response?.error || fall_response?.error) {
                    throw new Error(
                        rise_response?.error?.message ||
                            fall_response?.error?.message ||
                            'Unable to fetch a live proposal.'
                    );
                }

                const rise_payout = Number(rise_response?.proposal?.payout);
                const fall_payout = Number(fall_response?.proposal?.payout);

                setProposalPreview({
                    CALL: Number.isFinite(rise_payout) ? rise_payout : undefined,
                    PUT: Number.isFinite(fall_payout) ? fall_payout : undefined,
                });
                setProposalMessage('Live proposal ready.');
            } catch (error) {
                if (is_cancelled) return;
                const message = error instanceof Error ? error.message : 'Unable to fetch a live proposal.';
                setProposalPreview({});
                setProposalMessage(message);
            } finally {
                if (!is_cancelled) setIsProposalLoading(false);
            }
        }, 350);

        return () => {
            is_cancelled = true;
            window.clearTimeout(proposal_timer);
        };
    }, [base_trade_parameters, can_quote, selected_trade_type]);

    useEffect(() => {
        if (!selected_symbol) {
            setLivePrice(null);
            setPriceHistory([]);
            return undefined;
        }

        let is_cancelled = false;
        const unsubscribe = subscribePublicTicks(
            selected_symbol,
            next_price => {
                if (is_cancelled) return;
                setLivePrice(next_price);
                setPriceHistory(current_history => [...current_history, next_price].slice(-60));
            },
            error => {
                if (!is_cancelled) console.warn('[Up & Down] Live tick stream failed.', error);
            }
        );

        return () => {
            is_cancelled = true;
            unsubscribe();
        };
    }, [selected_symbol]);

    const handleSettings = () => {
        setShowChartSettingsModal(!showChartSettingsModal);
    };

    const handlePurchase = useCallback(
        async (contract_type: 'CALL' | 'PUT') => {
            if (!base_trade_parameters || !normalized_stake) {
                setTradeMessage('Enter a valid stake, duration, and market before trading.');
                return;
            }

            setIsPurchasing(true);
            setTradeMessage(contract_type === 'CALL' ? 'Buying Rise contract...' : 'Buying Fall contract...');

            try {
                const buy = await buyContractForUi({
                    parameters: {
                        ...base_trade_parameters,
                        contract_type,
                    },
                    price: normalized_stake,
                    source: 'Up & Down',
                });
                const buy_details = buy as Record<string, any>;

                const contract_id = String(buy_details.contract_id || buy_details.transaction_id || 'confirmed');
                const next_contract: TContractCard = {
                    buy_price: Number(buy_details.buy_price ?? normalized_stake),
                    contract_id,
                    contract_type,
                    currency,
                    entry_spot: buy_details.start_spot,
                    live_price: live_price ?? undefined,
                    payout: Number(buy_details.payout),
                    status: 'open',
                    transaction_id: buy_details.transaction_id,
                };

                setPurchasedContracts(current_contracts => [next_contract, ...current_contracts].slice(0, 5));

                if (buy_details.contract_id) {
                    const fallback = getContractSnapshot(
                        {
                            ...buy_details,
                            buy_price: Number(buy_details.buy_price ?? normalized_stake),
                            contract_id: buy_details.contract_id,
                            contract_type,
                            currency,
                            status: 'open',
                        },
                        next_contract
                    );

                    void streamContractUntilSettled({
                        contractId: Number(buy_details.contract_id),
                        fallback,
                        onUpdate: snapshot => {
                            setPurchasedContracts(current_contracts =>
                                current_contracts.map(contract =>
                                    contract.contract_id === String(buy_details.contract_id)
                                        ? {
                                              ...contract,
                                              buy_price: Number(snapshot.buy_price ?? contract.buy_price),
                                              entry_spot: snapshot.entry_spot ?? contract.entry_spot,
                                              exit_spot: snapshot.exit_spot ?? contract.exit_spot,
                                              live_price: Number(
                                                  snapshot.bid_price ??
                                                      snapshot.sell_price ??
                                                      snapshot.exit_spot ??
                                                      contract.live_price
                                              ),
                                              profit: Number(snapshot.profit ?? contract.profit ?? 0),
                                              status: snapshot.is_sold ? String(snapshot.status || 'sold') : 'open',
                                          }
                                        : contract
                                )
                            );
                        },
                        source: 'Up & Down',
                    });
                }

                setTradeMessage(`${contract_type === 'CALL' ? 'Rise' : 'Fall'} purchase confirmed: ${contract_id}.`);
            } catch (error) {
                setTradeMessage(error instanceof Error ? error.message : 'The purchase could not be completed.');
            } finally {
                setIsPurchasing(false);
            }
        },
        [base_trade_parameters, normalized_stake]
    );

    return (
        <div className={styles.page}>
            <div className={styles.top_bar}>
                <button
                    className={styles.status_pill}
                    type='button'
                    aria-label='Current market feed status'
                    title={proposal_message}
                >
                    <span className={styles.status_dot} />
                    <span>{is_proposal_loading ? 'Quoting' : 'Live'}</span>
                </button>

                <SettingsButton
                    onClick={handleSettings}
                    aria-label='Open Settings'
                    className={`${styles.settings_button} ${showChartSettingsModal ? styles.is_active : ''}`}
                />
            </div>

            <div className={styles.workspace}>
                <aside className={styles.trade_types} aria-label='Trade types'>
                    {TRADE_TYPES.map(trade_type => (
                        <button
                            className={`${styles.trade_type_button} ${
                                selected_trade_type === trade_type.id ? styles.trade_type_button_active : ''
                            }`}
                            key={trade_type.id}
                            onClick={() => setSelectedTradeType(trade_type.id)}
                            type='button'
                        >
                            <span className={styles.trade_type_glyph}>{trade_type.glyph}</span>
                            <span>{trade_type.label}</span>
                        </button>
                    ))}
                </aside>

                <main className={styles.chart_panel}>
                    <div className={styles.chart_header_card}>
                        <div className={styles.market_icon}>100</div>
                        <div>
                            <h2>{market_label}</h2>
                            <p>
                                {selected_symbol || '--'} - {formatPrice(live_price ?? undefined)} -{' '}
                                {proposal_message || 'Live chart feed'}
                            </p>
                        </div>
                    </div>

                    <div className={styles.chart_shell}>
                        <ChartWrapper
                            chart_type_override='candles'
                            granularity_override={60}
                            prefix='up-and-down-chart'
                            refresh_token={active_tab === DBOT_TABS.UP_AND_DOWN ? 'active' : 'inactive'}
                            show_digits_stats={false}
                        />
                    </div>
                </main>

                <aside className={styles.reference_panel} aria-label='Trade reference'>
                    <div className={styles.reference_header}>
                        <span className={styles.reference_icon}>[]</span>
                        <span>Reference</span>
                    </div>

                    <section className={styles.reference_section}>
                        <button className={styles.section_toggle} type='button'>
                            <span>
                                <span className={styles.market_strength_dot} />
                                MARKET STRENGTH
                            </span>
                            <span>{signal_snapshot.confidence.toFixed(0)}%</span>
                        </button>
                        <div className={styles.signal_meter} aria-label='BinaryTool direction signal'>
                            <div
                                className={styles.signal_meter_rise}
                                style={{ width: `${signal_snapshot.risePercentage}%` }}
                            />
                            <div
                                className={styles.signal_meter_fall}
                                style={{ width: `${signal_snapshot.fallPercentage}%` }}
                            />
                        </div>
                        <div className={styles.signal_values}>
                            <span>Rise {signal_snapshot.risePercentage.toFixed(1)}%</span>
                            <span>Fall {signal_snapshot.fallPercentage.toFixed(1)}%</span>
                        </div>
                        <p className={styles.signal_caption}>
                            {signal_snapshot.sampleSize
                                ? `${signal_snapshot.sampleSize} live ticks sampled. ${
                                      signal_snapshot.preferredContract === 'CALL'
                                          ? 'Rise signal leads.'
                                          : signal_snapshot.preferredContract === 'PUT'
                                            ? 'Fall signal leads.'
                                            : 'No signal edge yet.'
                                  }`
                                : 'Waiting for live ticks to calculate signal strength.'}
                        </p>
                    </section>

                    <section className={styles.form_section}>
                        <p className={styles.form_caption}>PARAMETERS</p>
                        <div className={styles.parameter_chip}>{selected_trade_type_label}</div>

                        <label className={styles.field}>
                            <span>CONTRACT</span>
                            <select
                                value={selected_trade_type}
                                onChange={event => setSelectedTradeType(event.target.value as TTradeTypeId)}
                            >
                                {TRADE_TYPES.map(trade_type => (
                                    <option key={trade_type.id} value={trade_type.id}>
                                        {trade_type.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className={styles.field}>
                            <span>DURATION</span>
                            <div className={styles.input_with_unit}>
                                <input
                                    min='1'
                                    max='10'
                                    inputMode='numeric'
                                    value={duration}
                                    onChange={event => setDuration(event.target.value)}
                                />
                                <strong>Ticks</strong>
                            </div>
                            <small>Allowed: 1-10 ticks</small>
                        </label>

                        <label className={styles.field}>
                            <span>STAKE</span>
                            <div className={styles.input_with_unit}>
                                <input
                                    min='0.01'
                                    step='0.01'
                                    inputMode='decimal'
                                    value={stake}
                                    onChange={event => setStake(event.target.value)}
                                />
                                <strong>{currency}</strong>
                            </div>
                        </label>
                    </section>

                    <section className={styles.execute_section}>
                        <p className={styles.form_caption}>EXECUTE</p>
                        <button
                            className={`${styles.auto_signal} ${is_auto_signal_on ? styles.auto_signal_on : ''}`}
                            onClick={() => setIsAutoSignalOn(value => !value)}
                            type='button'
                        >
                            <span className={styles.auto_signal_knob} />
                            <span>AUTO SIGNAL</span>
                            <strong>{is_auto_signal_on ? 'ON' : 'OFF'}</strong>
                        </button>

                        <button
                            className={styles.more_settings}
                            onClick={() => setIsMoreSettingsOpen(value => !value)}
                            type='button'
                        >
                            <span>More Settings</span>
                            <span>{is_more_settings_open ? 'v' : '>'}</span>
                        </button>

                        {is_more_settings_open && (
                            <div className={styles.more_settings_panel}>
                                <p>Chart settings are available from the green gear button in the top-right corner.</p>
                            </div>
                        )}

                        <div className={styles.purchase_grid}>
                            <button
                                className={`${styles.purchase_button} ${styles.purchase_button_rise} ${
                                    is_auto_signal_on && signal_snapshot.preferredContract === 'CALL'
                                        ? styles.purchase_button_signal
                                        : ''
                                }`}
                                disabled={!can_purchase}
                                onClick={() => void handlePurchase('CALL')}
                                type='button'
                            >
                                <span>Rise</span>
                                <small>Payout {formatMoney(proposal_preview.CALL, currency)}</small>
                            </button>
                            <button
                                className={`${styles.purchase_button} ${styles.purchase_button_fall} ${
                                    is_auto_signal_on && signal_snapshot.preferredContract === 'PUT'
                                        ? styles.purchase_button_signal
                                        : ''
                                }`}
                                disabled={!can_purchase}
                                onClick={() => void handlePurchase('PUT')}
                                type='button'
                            >
                                <span>Fall</span>
                                <small>Payout {formatMoney(proposal_preview.PUT, currency)}</small>
                            </button>
                        </div>

                        {(trade_message || proposal_message) && (
                            <p className={styles.trade_message}>{trade_message || proposal_message}</p>
                        )}

                        <div className={styles.contracts_panel}>
                            <div className={styles.contracts_header}>
                                <span>Purchased contracts</span>
                                <small>
                                    {purchased_contracts.length ? `${purchased_contracts.length} shown` : 'None yet'}
                                </small>
                            </div>
                            {purchased_contracts.length === 0 ? (
                                <p className={styles.contracts_empty}>
                                    Buy Rise or Fall to track live price proceedings here.
                                </p>
                            ) : (
                                purchased_contracts.map(contract => (
                                    <article className={styles.contract_card} key={contract.contract_id}>
                                        <div className={styles.contract_card_header}>
                                            <span
                                                className={`${styles.contract_status_dot} ${
                                                    contract.status === 'open' ? styles.contract_status_live : ''
                                                }`}
                                            />
                                            <strong>{contract.contract_type === 'CALL' ? 'Rise' : 'Fall'}</strong>
                                            <small>{getContractStatusLabel(contract.status)}</small>
                                        </div>
                                        <dl className={styles.contract_grid}>
                                            <div>
                                                <dt>Contract</dt>
                                                <dd>{contract.contract_id}</dd>
                                            </div>
                                            <div>
                                                <dt>Buy price</dt>
                                                <dd>{formatMoney(contract.buy_price, contract.currency)}</dd>
                                            </div>
                                            <div>
                                                <dt>Live price</dt>
                                                <dd>{formatPrice(contract.live_price)}</dd>
                                            </div>
                                            <div>
                                                <dt>Profit/Loss</dt>
                                                <dd
                                                    className={
                                                        Number(contract.profit ?? 0) >= 0
                                                            ? styles.contract_profit_positive
                                                            : styles.contract_profit_negative
                                                    }
                                                >
                                                    {formatMoney(contract.profit, contract.currency)}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt>Entry</dt>
                                                <dd>{formatPrice(contract.entry_spot)}</dd>
                                            </div>
                                            <div>
                                                <dt>Exit</dt>
                                                <dd>{formatPrice(contract.exit_spot)}</dd>
                                            </div>
                                        </dl>
                                    </article>
                                ))
                            )}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
});

export default UpAndDown;
