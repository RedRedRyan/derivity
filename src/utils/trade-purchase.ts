import { getLocalizedErrorMessage } from '@/constants/backend-error-messages';
import { api_base, observer as globalObserver } from '@/external/bot-skeleton';
import { getSymbolRequestField } from '@/external/bot-skeleton/services/api/legacy-request';
import { assertApiTokenScope } from '@/utils/api-token-permissions';
import { safeSubscribe } from '@/utils/websocket-handler';
import type { Buy } from '@deriv/api-types';

type TTradeParameters = Record<string, any>;

type TBuyContractArgs = {
    parameters: TTradeParameters;
    price: number;
    source: string;
};

class InsufficientDemoBalanceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InsufficientDemoBalanceError';
    }
}

const throwApiError = (response: any, source: string) => {
    if (response?.error) {
        const api_error = response.error;
        const message = api_error.code
            ? getLocalizedErrorMessage(api_error.code, api_error)
            : api_error.message || `${source} contract purchase failed.`;
        const error = new Error(message);

        (error as Error & { code?: string; details?: Record<string, any> }).code = api_error.code;
        (error as Error & { code?: string; details?: Record<string, any> }).details = api_error.details;

        throw error;
    }
};

const removeUndefinedFields = <T extends Record<string, any>>(fields: T): T =>
    Object.entries(fields).reduce((cleaned, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') cleaned[key as keyof T] = value;
        return cleaned;
    }, {} as T);

export const normalizeTradeParameters = (parameters: TTradeParameters, webSocketURL?: string) => {
    const { symbol, underlying_symbol, ...rest } = parameters;
    const normalized_symbol = symbol || underlying_symbol;
    const symbol_field = normalized_symbol ? getSymbolRequestField(normalized_symbol, webSocketURL) : {};

    return removeUndefinedFields({ ...rest, ...symbol_field });
};

const getApiError = (error: any) => error?.error ?? (error?.code ? error : undefined);

const ensureAuthorizedForTrading = async () => {
    if (api_base.is_authorized) return;

    await (api_base as any).authorizeAndSubscribe?.();

    if (!api_base.is_authorized) {
        throw new Error('Please log in to your Deriv account before trading.');
    }
};

const getMoneyDecimals = (currency?: string) => {
    const normalizedCurrency = (currency || '').toUpperCase();
    return normalizedCurrency === 'BTC' || normalizedCurrency === 'ETH' || normalizedCurrency.includes('USDT') ? 8 : 2;
};

const formatAmount = (amount: number, currency: string) => `${amount.toFixed(getMoneyDecimals(currency))} ${currency}`;

const assertSufficientDemoBalance = (required_amount: number, source: string) => {
    const client_store = globalObserver.getState('client.store') as
        | {
              loginid?: string;
              currency?: string;
              getAccountCurrency?: (loginid?: string) => string;
              getDisplayBalanceAmount?: (loginid?: string) => number;
              hasSufficientDemoBalance?: (amount: number, loginid?: string) => boolean;
          }
        | undefined;

    const loginid = client_store?.loginid;
    if (!client_store?.hasSufficientDemoBalance?.(required_amount, loginid)) {
        const currency = client_store?.getAccountCurrency?.(loginid) || client_store?.currency || 'USD';
        const available_balance = Number(client_store?.getDisplayBalanceAmount?.(loginid) ?? 0);
        throw new InsufficientDemoBalanceError(
            `${source} could not purchase this contract. Insufficient demo balance: available ${formatAmount(
                available_balance,
                currency
            )}, required ${formatAmount(required_amount, currency)}.`
        );
    }
};

export const buyContractForUi = async ({ parameters, price, source }: TBuyContractArgs): Promise<Buy> => {
    await ensureAuthorizedForTrading();
    assertApiTokenScope('trade');

    globalObserver.emit('bot.running');
    globalObserver.emit('bot.setPurchaseInProgress');

    const normalized_parameters = normalizeTradeParameters(parameters);

    try {
        const proposal_response = await (api_base.api as any).send({
            proposal: 1,
            ...normalized_parameters,
        });
        throwApiError(proposal_response, source);

        const proposal = proposal_response?.proposal;
        if (!proposal?.id) {
            throw new Error(`${source} could not get a contract proposal.`);
        }

        const ask_price = Number(proposal.ask_price ?? price);
        assertSufficientDemoBalance(ask_price, source);
        globalObserver.emit('contract.status', {
            id: 'contract.purchase_sent',
            data: ask_price,
        });

        const buy_response = await (api_base.api as any).send({ buy: proposal.id, price: ask_price });
        throwApiError(buy_response, source);

        const buy = buy_response?.buy;
        if (buy) {
            globalObserver.emit('contract.status', {
                id: 'contract.purchase_received',
                data: buy.transaction_id,
                buy,
            });

            return buy;
        }
    } catch (proposal_error) {
        if (proposal_error instanceof InsufficientDemoBalanceError) {
            throw proposal_error;
        }

        const api_error = getApiError(proposal_error);
        if (api_error) {
            console.error(`[${source}] Proposal rejected by Deriv.`, {
                code: api_error.code,
                details: api_error.details,
                message: api_error.message,
                parameters: normalized_parameters,
            });
            throwApiError({ error: api_error }, source);
        }

        console.warn(`[${source}] Proposal buy failed, retrying with direct buy.`, proposal_error);
    }

    assertSufficientDemoBalance(price, source);
    globalObserver.emit('contract.status', {
        id: 'contract.purchase_sent',
        data: price,
    });

    const direct_buy_response = await (api_base.api as any).send({
        buy: '1',
        price,
        parameters: normalized_parameters,
    });
    throwApiError(direct_buy_response, source);

    const buy = direct_buy_response?.buy;
    if (!buy) {
        throw new Error(`${source} did not receive a buy confirmation.`);
    }

    globalObserver.emit('contract.status', {
        id: 'contract.purchase_received',
        data: buy.transaction_id,
        buy,
    });

    return buy;
};

export const sellContractForUi = async ({
    contractId,
    price = 0,
    source,
}: {
    contractId: number | string;
    price?: number;
    source: string;
}) => {
    await ensureAuthorizedForTrading();
    assertApiTokenScope('trade');

    const sell_response = await (api_base.api as any).send({ sell: contractId, price });
    throwApiError(sell_response, source);

    const sell = sell_response?.sell;
    if (!sell) {
        throw new Error(`${source} did not receive a cashout confirmation.`);
    }

    globalObserver.emit('contract.status', {
        id: 'contract.sold',
        data: sell.transaction_id,
        sell,
    });

    return sell;
};

const CLOSED_CONTRACT_STATUSES = new Set(['sold', 'won', 'lost']);
const PROFIT_TABLE_RECOVERY_CHECK_MS = 5000;

const isContractSettled = (contract: Record<string, any> = {}) =>
    Boolean(contract.is_sold) || CLOSED_CONTRACT_STATUSES.has(String(contract.status || '').toLowerCase());

const getContractDisplayTick = (
    contract: Record<string, any>,
    fallback: Record<string, any>,
    displayKey: string,
    tickKey: string,
    spotKey: string
) =>
    contract[displayKey] ??
    contract[tickKey] ??
    contract[spotKey] ??
    fallback[displayKey] ??
    fallback[tickKey] ??
    fallback[spotKey];

export const getContractSnapshot = (contract: Record<string, any>, fallback: Record<string, any> = {}) => {
    const is_sold = isContractSettled(contract) || Boolean(fallback.is_sold);
    const entry_spot = getContractDisplayTick(
        contract,
        fallback,
        'entry_tick_display_value',
        'entry_tick',
        'entry_spot'
    );
    const exit_spot = getContractDisplayTick(contract, fallback, 'exit_tick_display_value', 'exit_tick', 'exit_spot');

    return {
        ...fallback,
        buy_price: contract.buy_price ?? fallback.buy_price,
        contract_id: contract.contract_id ?? fallback.contract_id,
        transaction_ids: contract.transaction_ids ?? fallback.transaction_ids,
        date_start: contract.date_start ?? fallback.date_start,
        display_name: contract.display_name || contract.underlying || fallback.display_name,
        underlying_symbol: contract.underlying || contract.underlying_symbol || fallback.underlying_symbol,
        shortcode: contract.shortcode ?? fallback.shortcode,
        contract_type: contract.contract_type ?? fallback.contract_type,
        currency: contract.currency ?? fallback.currency,
        entry_spot,
        entry_tick: contract.entry_tick ?? contract.entry_spot ?? fallback.entry_tick ?? entry_spot,
        entry_tick_time: contract.entry_tick_time ?? contract.entry_spot_time ?? fallback.entry_tick_time,
        exit_spot,
        exit_tick: contract.exit_tick ?? contract.exit_spot ?? fallback.exit_tick ?? exit_spot,
        exit_tick_time: contract.exit_tick_time ?? contract.exit_spot_time ?? fallback.exit_tick_time,
        barrier: contract.barrier ?? fallback.barrier,
        sell_price: contract.sell_price ?? fallback.sell_price,
        bid_price: contract.bid_price ?? fallback.bid_price,
        profit: is_sold ? (contract.profit ?? fallback.profit ?? 0) : (fallback.profit ?? 0),
        is_sold,
        status: contract.status ?? fallback.status,
    };
};

export const emitContractSoldStatus = (contract: Record<string, any>) => {
    if (!contract?.is_sold) return;

    globalObserver.emit('contract.status', {
        id: 'contract.sold',
        data: contract.transaction_ids?.sell,
        contract,
    });
};

type TStreamContractUntilSettledArgs = {
    contractId: number;
    fallback?: Record<string, any>;
    onUpdate?: (snapshot: Record<string, any>, rawContract: Record<string, any>) => void;
    settlementCheckMs?: number;
    signal?: AbortSignal;
    source: string;
    timeoutMs?: number;
};

const getAbortedContractSnapshot = (contractId: number, fallback: Record<string, any> = {}) =>
    getContractSnapshot(
        {
            contract_id: contractId,
            is_sold: false,
            status: fallback.status ?? 'open',
            transaction_ids: fallback.transaction_ids,
        },
        fallback
    );

const getProfitTableContractSnapshot = (transaction: Record<string, any>, fallback: Record<string, any> = {}) => {
    const buy_price = Number(transaction.buy_price ?? fallback.buy_price ?? 0);
    const sell_price =
        transaction.sell_price !== undefined && transaction.sell_price !== null
            ? Number(transaction.sell_price)
            : undefined;
    const payout =
        transaction.payout !== undefined && transaction.payout !== null ? Number(transaction.payout) : undefined;
    const profit =
        transaction.profit !== undefined && transaction.profit !== null
            ? Number(transaction.profit)
            : sell_price !== undefined
              ? Number((sell_price - buy_price).toFixed(8))
              : fallback.profit;

    return getContractSnapshot(
        {
            contract_id: transaction.contract_id,
            is_sold: transaction.sell_time !== undefined && transaction.sell_time !== null,
            status: Number(profit ?? 0) < 0 ? 'lost' : 'won',
            buy_price,
            sell_price,
            bid_price: sell_price ?? payout,
            payout,
            profit,
            transaction_ids: {
                ...fallback.transaction_ids,
                sell: transaction.transaction_id ?? fallback.transaction_ids?.sell,
            },
            date_start: transaction.purchase_time ?? fallback.date_start,
            exit_tick_time: transaction.sell_time ?? fallback.exit_tick_time,
            shortcode: transaction.shortcode ?? fallback.shortcode,
            contract_type: transaction.contract_type ?? fallback.contract_type,
            underlying_symbol: transaction.underlying_symbol ?? fallback.underlying_symbol,
            display_name: transaction.underlying_symbol ?? fallback.display_name,
        },
        fallback
    );
};

export const streamContractUntilSettled = ({
    contractId,
    fallback = {},
    onUpdate,
    settlementCheckMs = api_base.execution_config?.settlementCheckMs ?? 500,
    signal,
    source,
    timeoutMs = 90000,
}: TStreamContractUntilSettledArgs): Promise<Record<string, any>> =>
    new Promise(resolve => {
        let finished = false;
        let snapshotRequestInFlight = false;
        let profitTableRequestInFlight = false;
        let recoveryMode = false;
        let lastProfitTableRecoveryCheck = 0;
        let subscription: { unsubscribe?: () => void } | null = null;
        let settlementCheckId: ReturnType<typeof setInterval> | null = null;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const cleanup = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (settlementCheckId) {
                clearInterval(settlementCheckId);
                settlementCheckId = null;
            }
            if (signal) {
                signal.removeEventListener('abort', handleAbort);
            }
            try {
                subscription?.unsubscribe?.();
            } catch (unsubscribeError) {
                console.warn(`[${source}] Failed to unsubscribe contract stream.`, unsubscribeError);
            }
            subscription = null;
        };

        const finish = (value: Record<string, any>) => {
            if (finished) return;
            finished = true;
            cleanup();
            resolve(value);
        };

        const handleAbort = () => {
            finish(getAbortedContractSnapshot(contractId, fallback));
        };

        const handleContractUpdate = (contract: Record<string, any>) => {
            if (finished || !contract) return;

            const snapshot = getContractSnapshot(contract, fallback);
            onUpdate?.(snapshot, contract);

            if (snapshot.is_sold) {
                emitContractSoldStatus(snapshot);
                finish(snapshot);
            }
        };

        const requestProfitTableSnapshot = async (reason: string) => {
            const now = Date.now();
            if (
                finished ||
                profitTableRequestInFlight ||
                (lastProfitTableRecoveryCheck && now - lastProfitTableRecoveryCheck < PROFIT_TABLE_RECOVERY_CHECK_MS)
            ) {
                return;
            }

            profitTableRequestInFlight = true;
            lastProfitTableRecoveryCheck = now;
            try {
                const response = await (api_base.api as any)?.send?.({
                    profit_table: 1,
                    description: 1,
                    limit: 25,
                    sort: 'DESC',
                });
                if (response?.error) {
                    console.warn(
                        `[${source}] Profit table recovery failed for ${contractId} (${reason}).`,
                        response.error
                    );
                    return;
                }

                const transaction = response?.profit_table?.transactions?.find(
                    (item: Record<string, any>) => Number(item?.contract_id) === Number(contractId)
                );

                if (!transaction) return;

                const snapshot = getProfitTableContractSnapshot(transaction, fallback);
                if (snapshot.is_sold) {
                    onUpdate?.(snapshot, transaction);
                    emitContractSoldStatus(snapshot);
                    finish(snapshot);
                }
            } catch (profitTableError) {
                console.warn(
                    `[${source}] Profit table recovery failed for ${contractId} (${reason}).`,
                    profitTableError
                );
            } finally {
                profitTableRequestInFlight = false;
            }
        };

        const requestSettlementSnapshot = async (reason: string) => {
            if (finished || snapshotRequestInFlight) return;
            snapshotRequestInFlight = true;
            try {
                const response = await (api_base.api as any)?.send?.({
                    proposal_open_contract: 1,
                    contract_id: contractId,
                });
                const contract = response?.proposal_open_contract;
                if (contract) {
                    handleContractUpdate(contract);
                }
                if (!finished && recoveryMode && (!contract || !isContractSettled(contract))) {
                    void requestProfitTableSnapshot(reason);
                }
            } catch (snapshotError) {
                console.warn(
                    `[${source}] Contract settlement snapshot failed for ${contractId} (${reason}).`,
                    snapshotError
                );
                if (recoveryMode) void requestProfitTableSnapshot(reason);
            } finally {
                snapshotRequestInFlight = false;
            }
        };

        const startSettlementPolling = (intervalMs: number) => {
            if (settlementCheckId) {
                clearInterval(settlementCheckId);
                settlementCheckId = null;
            }
            settlementCheckId = setInterval(() => {
                void requestSettlementSnapshot(recoveryMode ? 'recovery-watchdog' : 'watchdog');
            }, intervalMs);
        };

        if (signal?.aborted) {
            handleAbort();
            return;
        }

        if (signal) {
            signal.addEventListener('abort', handleAbort, { once: true });
        }

        timeoutId = setTimeout(() => {
            if (finished) return;
            recoveryMode = true;
            timeoutId = null;
            console.warn(
                `[${source}] Contract settlement is stale for ${contractId}; continuing recovery polling until Deriv returns the sold result.`
            );
            globalObserver.emit('contract.status', {
                id: 'contract.settlement_recovery',
                data: contractId,
            });
            startSettlementPolling(
                Math.max(settlementCheckMs, api_base.execution_config?.settlementRecoveryCheckMs ?? settlementCheckMs)
            );
            void requestSettlementSnapshot('timeout-recovery');
        }, timeoutMs);

        startSettlementPolling(settlementCheckMs);

        try {
            const observable = (api_base.api as any)?.subscribe?.({
                proposal_open_contract: 1,
                contract_id: contractId,
                subscribe: 1,
            });

            subscription = safeSubscribe(
                observable,
                (data: any) => {
                    if (finished) return;
                    if (data?.error) {
                        console.warn(`[${source}] Contract stream error for ${contractId}.`, data.error);
                        void requestSettlementSnapshot('stream-error');
                        return;
                    }

                    const contract = data?.proposal_open_contract;
                    handleContractUpdate(contract);
                },
                streamError => {
                    if (finished) return;
                    console.warn(`[${source}] Contract stream subscription failed for ${contractId}.`, streamError);
                    void requestSettlementSnapshot('stream-failure');
                }
            );
        } catch (subscribeError) {
            console.warn(`[${source}] Could not subscribe to contract stream for ${contractId}.`, subscribeError);
            void requestSettlementSnapshot('subscribe-failure');
        }

        void requestSettlementSnapshot('initial');
    });
