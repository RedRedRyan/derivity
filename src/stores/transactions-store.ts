import { action, computed, makeObservable, observable, reaction } from 'mobx';
import { formatDate, isEnded } from '@/components/shared';
import { LogTypes, MessageTypes } from '@/external/bot-skeleton';
import { contractsReferToSameTrade, hasContractIdentity, mergeContractUpdate } from '@/utils/contract-identity';
import { ProposalOpenContract } from '@deriv/api-types';
import { TPortfolioPosition, TStores } from '@deriv/stores/types';
import { TContractInfo } from '../components/summary/summary-card.types';
import { transaction_elements } from '../constants/transactions';
import { getStoredItemsByKey, getStoredItemsByUser, setStoredItemsByKey } from '../utils/session-storage';
import RootStore from './root-store';

type TTransaction = {
    type: string;
    data?: string | TContractInfo;
};

type TContractDisplayUpdate = TContractInfo & {
    entry_spot_time?: number | string;
    entry_tick_display_value?: number | string;
    exit_spot_time?: number | string;
    exit_tick_display_value?: number | string;
};

type TElement = {
    [key: string]: TTransaction[];
};

export default class TransactionsStore {
    root_store: RootStore;
    core: TStores;
    disposeReactionsFn: () => void;
    persist_timer: ReturnType<typeof setTimeout> | null = null;

    constructor(root_store: RootStore, core: TStores) {
        this.root_store = root_store;
        this.core = core;
        this.is_transaction_details_modal_open = false;
        this.disposeReactionsFn = this.registerReactions();

        makeObservable(this, {
            elements: observable,
            active_transaction_id: observable,
            recovered_completed_transactions: observable,
            recovered_transactions: observable,
            is_called_proposal_open_contract: observable,
            is_transaction_details_modal_open: observable,
            transactions: computed,
            onBotContractEvent: action.bound,
            pushTransaction: action.bound,
            syncJournalWithTransactions: action.bound,
            clear: action.bound,
            registerReactions: action.bound,
            recoverPendingContracts: action.bound,
            updateResultsCompletedContract: action.bound,
            sortOutPositionsBeforeAction: action.bound,
            recoverPendingContractsById: action.bound,
        });
    }
    TRANSACTION_CACHE = 'transaction_cache';

    elements: TElement = getStoredItemsByUser(this.TRANSACTION_CACHE, this.core?.client?.loginid, []);
    active_transaction_id: null | number = null;
    recovered_completed_transactions: number[] = [];
    recovered_transactions: number[] = [];
    is_called_proposal_open_contract = false;
    is_transaction_details_modal_open = false;

    hasJournalMessageForContract(contract_id?: number, matcher?: (message: string) => boolean) {
        if (!contract_id) return false;

        return this.root_store.journal.unfiltered_messages.some(entry => {
            if (typeof entry.message !== 'string') return false;
            if (!entry.message.includes(String(contract_id))) return false;
            return matcher ? matcher(entry.message) : true;
        });
    }

    pushContractJournalMessage(contract: TContractInfo, existing_contract?: TContractInfo) {
        const { journal } = this.root_store;
        const contract_id = Number(contract.contract_id);
        const buy_id = contract.transaction_ids?.buy ?? '';
        const has_completed_now = !!contract.is_completed;
        const was_completed_before = !!existing_contract?.is_completed;
        const contract_status = String(contract.status || '').toLowerCase();
        const contract_currency = String(contract.currency || this.core?.client?.currency || '');
        const profit = Number(contract.profit ?? 0);

        if (
            !existing_contract &&
            contract_id &&
            !this.hasJournalMessageForContract(contract_id, message => message.includes('opened'))
        ) {
            const open_message = [
                `Contract opened: ${contract_id}`,
                buy_id ? `Buy ID: ${buy_id}` : '',
                contract.display_name ? `Market: ${contract.display_name}` : '',
                contract.contract_type ? `Type: ${contract.contract_type}` : '',
            ]
                .filter(Boolean)
                .join(' | ');

            journal.pushMessage(open_message, MessageTypes.NOTIFY, 'journal__text--analysis');
        }

        if (
            contract_id &&
            has_completed_now &&
            !was_completed_before &&
            !this.hasJournalMessageForContract(contract_id, message => message.includes('settled'))
        ) {
            const settlement_label =
                contract_status === 'won' ? 'Won' : contract_status === 'lost' ? 'Lost' : contract_status || 'Closed';
            const settlement_parts = [
                `Contract settled: ${contract_id}`,
                `Status: ${settlement_label}`,
                Number.isFinite(profit) ? `Profit/Loss: ${profit} ${contract_currency}` : '',
                contract.exit_spot ? `Exit spot: ${contract.exit_spot}` : '',
            ].filter(Boolean);

            journal.pushMessage(settlement_parts.join(' | '), MessageTypes.NOTIFY, 'journal__text--analysis');
        }
    }

    syncJournalWithTransactions() {
        const current_account = this.core?.client?.loginid;
        if (!current_account) return;

        (this.elements[current_account] ?? []).forEach(transaction => {
            if (transaction.type !== transaction_elements.CONTRACT || typeof transaction.data !== 'object') return;
            this.pushContractJournalMessage(transaction.data as TContractInfo);
        });
    }

    get transactions(): TTransaction[] {
        if (this.core?.client?.loginid) {
            return (this.elements[this.core.client.loginid] ?? []).filter(
                transaction =>
                    transaction.type !== transaction_elements.CONTRACT ||
                    (typeof transaction.data === 'object' && hasContractIdentity(transaction.data))
            );
        }
        return [];
    }

    get statistics() {
        let total_runs = 0;
        // Filter out only contract transactions and remove dividers
        const trxs = this.transactions.filter(
            trx => trx.type === transaction_elements.CONTRACT && typeof trx.data === 'object'
        );
        const statistics = trxs.reduce(
            (stats, { data }) => {
                const contract = data as TContractInfo;
                const profit = Number(contract.profit) || 0;
                const is_completed = contract.is_completed || false;
                const buy_price = Number(contract.buy_price) || 0;
                const payout = Number(contract.payout) || Number(contract.bid_price) || 0;
                const bid_price = Number(contract.bid_price) || 0;

                if (is_completed) {
                    if (profit > 0) {
                        stats.won_contracts += 1;
                        stats.total_payout += payout ?? bid_price ?? 0;
                    } else {
                        stats.lost_contracts += 1;
                    }
                    stats.total_profit += profit;
                    stats.total_stake += buy_price;
                    total_runs += 1;
                }
                return stats;
            },
            {
                lost_contracts: 0,
                number_of_runs: 0,
                total_profit: 0,
                total_payout: 0,
                total_stake: 0,
                won_contracts: 0,
            }
        );
        statistics.number_of_runs = total_runs;
        return statistics;
    }

    toggleTransactionDetailsModal = (is_open: boolean) => {
        this.is_transaction_details_modal_open = is_open;
    };

    onBotContractEvent(data: TContractInfo) {
        this.pushTransaction(data);
    }

    pushTransaction(data: TContractInfo) {
        if (!data || !hasContractIdentity(data)) return;

        const is_completed = isEnded(data as ProposalOpenContract);
        const { run_id } = this.root_store.run_panel;
        const current_account = this.core?.client?.loginid;
        if (!current_account) return;

        if (!this.elements[current_account]) {
            this.elements = {
                ...this.elements,
                [current_account]: [],
            };
        }

        const same_contract_index = this.elements[current_account]?.findIndex(transaction => {
            if (transaction.type !== transaction_elements.CONTRACT || typeof transaction.data !== 'object') {
                return false;
            }
            return contractsReferToSameTrade(transaction.data, data);
        });
        const existing_contract =
            same_contract_index >= 0 && typeof this.elements[current_account]?.[same_contract_index]?.data === 'object'
                ? (this.elements[current_account][same_contract_index].data as TContractInfo)
                : undefined;
        const merged_data = mergeContractUpdate(existing_contract, data);
        const display_data = merged_data as TContractDisplayUpdate;
        const entry_spot = display_data.entry_tick_display_value ?? merged_data.entry_tick ?? merged_data.entry_spot;
        const exit_spot = display_data.exit_tick_display_value ?? merged_data.exit_tick ?? merged_data.exit_spot;
        const entry_tick_time = merged_data.entry_tick_time ?? display_data.entry_spot_time;
        const exit_tick_time = merged_data.exit_tick_time ?? display_data.exit_spot_time;

        const contract: TContractInfo = {
            ...merged_data,
            entry_spot,
            exit_spot,
            is_completed,
            run_id,
            date_start: formatDate(merged_data.date_start, 'YYYY-M-D HH:mm:ss [GMT]'),
            entry_tick: merged_data.entry_tick ?? entry_spot,
            entry_tick_time: entry_tick_time && formatDate(entry_tick_time, 'YYYY-M-D HH:mm:ss [GMT]'),
            exit_tick: merged_data.exit_tick ?? exit_spot,
            exit_tick_time: exit_tick_time && formatDate(exit_tick_time, 'YYYY-M-D HH:mm:ss [GMT]'),
            profit: is_completed ? merged_data.profit : 0,
        };

        this.pushContractJournalMessage(contract, existing_contract);

        if (same_contract_index === -1) {
            // Render a divider if the "run_id" for this contract is different.
            if (this.elements[current_account]?.length > 0) {
                const temp_contract = this.elements[current_account]?.[0];
                const is_contract = temp_contract.type === transaction_elements.CONTRACT;
                const is_new_run =
                    is_contract &&
                    typeof temp_contract.data === 'object' &&
                    contract.run_id !== temp_contract?.data?.run_id;

                if (is_new_run) {
                    this.elements[current_account]?.unshift({
                        type: transaction_elements.DIVIDER,
                        data: contract.run_id,
                    });
                }
            }

            this.elements[current_account]?.unshift({
                type: transaction_elements.CONTRACT,
                data: contract,
            });
        } else {
            // If data belongs to existing contract in memory, update it.
            this.elements[current_account]?.splice(same_contract_index, 1, {
                type: transaction_elements.CONTRACT,
                data: contract,
            });
        }

        this.elements = { ...this.elements }; // force update
        this.syncJournalWithTransactions();
    }

    clear() {
        if (this.elements && this.elements[this.core?.client?.loginid as string]?.length > 0) {
            this.elements[this.core?.client?.loginid as string] = [];
        }
        this.recovered_completed_transactions = this.recovered_completed_transactions?.slice(0, 0);
        this.recovered_transactions = this.recovered_transactions?.slice(0, 0);
        this.is_transaction_details_modal_open = false;
        if (this.persist_timer) {
            clearTimeout(this.persist_timer);
            this.persist_timer = null;
        }
    }

    schedulePersistTransactions = (loginid: string, elements: TTransaction[]) => {
        if (this.persist_timer) {
            clearTimeout(this.persist_timer);
        }

        this.persist_timer = setTimeout(() => {
            this.persist_timer = null;
            const stored_transactions = getStoredItemsByKey(this.TRANSACTION_CACHE, {});
            stored_transactions[loginid] = elements?.slice(0, 5000) ?? [];
            setStoredItemsByKey(this.TRANSACTION_CACHE, stored_transactions);
        }, 200);
    };

    registerReactions() {
        const { client } = this.core;

        // Write transactions to session storage on each change in transaction elements.
        const disposeTransactionElementsListener = reaction(
            () => this.elements[client?.loginid as string],
            elements => {
                if (!client.loginid) return;
                this.schedulePersistTransactions(client.loginid as string, elements ?? []);
                this.syncJournalWithTransactions();
            }
        );

        // User could've left the page mid-contract. On initial load, try
        // to recover any pending contracts so we can reflect accurate stats
        // and transactions.
        const disposeRecoverContracts = reaction(
            () => this.transactions.length,
            () => this.recoverPendingContracts()
        );

        return () => {
            if (this.persist_timer) {
                clearTimeout(this.persist_timer);
                this.persist_timer = null;
            }
            disposeTransactionElementsListener();
            disposeRecoverContracts();
        };
    }

    recoverPendingContracts(contract = null) {
        this.transactions.forEach(({ data: trx }) => {
            if (
                typeof trx === 'string' ||
                trx?.is_completed ||
                !trx?.contract_id ||
                this.recovered_transactions.includes(trx?.contract_id)
            )
                return;
            this.recoverPendingContractsById(trx.contract_id, contract);
        });
    }

    updateResultsCompletedContract(contract: ProposalOpenContract) {
        const { journal, summary_card } = this.root_store;
        const { contract_info } = summary_card;
        const { currency, profit } = contract;

        if (contract.contract_id !== contract_info?.contract_id) {
            this.onBotContractEvent(contract);

            if (contract.contract_id && !this.recovered_transactions.includes(contract.contract_id)) {
                this.recovered_transactions.push(contract.contract_id);
            }
            if (
                contract.contract_id &&
                !this.recovered_completed_transactions.includes(contract.contract_id) &&
                isEnded(contract)
            ) {
                this.recovered_completed_transactions.push(contract.contract_id);

                journal.onLogSuccess({
                    log_type: profit && profit > 0 ? LogTypes.PROFIT : LogTypes.LOST,
                    extra: { currency, profit },
                });
            }
        }
    }

    sortOutPositionsBeforeAction(positions: TPortfolioPosition[], element_id?: number) {
        positions?.forEach(position => {
            if (!element_id || (element_id && position.id === element_id)) {
                const contract_details = position.contract_info;
                this.updateResultsCompletedContract(contract_details);
            }
        });
    }

    async recoverPendingContractsById(contract_id: number, contract: ProposalOpenContract | null = null) {
        // TODO: need to fix as the portfolio is not available now
        // const positions = this.core.portfolio.positions;
        const positions: unknown[] = [];

        if (contract) {
            this.is_called_proposal_open_contract = true;
            if (contract.contract_id === contract_id) {
                this.updateResultsCompletedContract(contract);
            }
        }

        if (!this.is_called_proposal_open_contract) {
            if (this.core?.client?.loginid) {
                const current_account = this.core?.client?.loginid;
                if (!this.elements[current_account]?.length) {
                    this.sortOutPositionsBeforeAction(positions);
                }

                const elements = this.elements[current_account];
                const [element = null] = elements;
                if (typeof element?.data === 'object' && !element?.data?.profit) {
                    const element_id = element.data.contract_id;
                    this.sortOutPositionsBeforeAction(positions, element_id);
                }
            }
        }
    }
}
