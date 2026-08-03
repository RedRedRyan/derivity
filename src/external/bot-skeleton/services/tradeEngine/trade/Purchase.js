import { assertApiTokenScope } from '@/utils/api-token-permissions';
import { LogTypes } from '../../../constants/messages';
import { observer as globalObserver } from '../../../utils/observer';
import { api_base } from '../../api/api-base';
import { contract as broadcastContract, contractStatus, info, log } from '../utils/broadcast';
import { doUntilDone, getUUID, recoverFromError, tradeOptionToBuy } from '../utils/helpers';
import { purchaseSuccessful } from './state/actions';
import { BEFORE_PURCHASE } from './state/constants';
import { getValidatedBuyResponse } from './purchase-utils';

let delayIndex = 0;
let purchase_reference;

const getMoneyDecimals = currency => {
    const normalizedCurrency = (currency || '').toUpperCase();
    return normalizedCurrency === 'BTC' || normalizedCurrency === 'ETH' || normalizedCurrency.includes('USDT') ? 8 : 2;
};

const formatAmount = (amount, currency) => `${Number(amount || 0).toFixed(getMoneyDecimals(currency))} ${currency}`;

const createInsufficientDemoBalanceError = ({ loginid, requiredAmount }) => {
    const clientStore = globalObserver.getState('client.store');
    if (!clientStore?.hasSufficientDemoBalance?.(requiredAmount, loginid)) {
        const currency = clientStore?.getAccountCurrency?.(loginid) || clientStore?.currency || 'USD';
        const availableBalance = Number(clientStore?.getDisplayBalanceAmount?.(loginid) ?? 0);
        return new Error(
            `Bot Builder could not purchase this contract. Insufficient demo balance: available ${formatAmount(
                availableBalance,
                currency
            )}, required ${formatAmount(requiredAmount, currency)}.`
        );
    }

    return null;
};

export default Engine =>
    class Purchase extends Engine {
        purchase(contract_type) {
            assertApiTokenScope('trade');

            // Prevent calling purchase twice
            if (this.store.getState().scope !== BEFORE_PURCHASE) {
                return Promise.resolve();
            }

            const onSuccess = response => {
                // Don't unnecessarily send a forget request for a purchased contract.
                const buy = getValidatedBuyResponse(response, contract_type);

                contractStatus({
                    id: 'contract.purchase_received',
                    data: buy.transaction_id,
                    buy,
                });

                this.contractId = buy.contract_id;
                this.store.dispatch(purchaseSuccessful());
                this.bootstrapPurchasedContract(buy);

                if (this.is_proposal_subscription_required) {
                    this.renewProposalsOnPurchase();
                }

                delayIndex = 0;
                log(LogTypes.PURCHASE, { transaction_id: buy.transaction_id, contract_type });
                info({
                    accountID: this.accountInfo.loginid,
                    totalRuns: this.updateAndReturnTotalRuns(),
                    transaction_ids: { buy: buy.transaction_id },
                    contract_type,
                    buy_price: buy.buy_price,
                });
            };

            if (this.is_proposal_subscription_required) {
                const { id, askPrice } = this.selectProposal(contract_type);
                const insufficientBalanceError = createInsufficientDemoBalanceError({
                    loginid: this.accountInfo?.loginid,
                    requiredAmount: askPrice,
                });
                if (insufficientBalanceError) {
                    return Promise.reject(insufficientBalanceError);
                }

                const action = () => api_base.api.send({ buy: id, price: askPrice });

                this.isSold = false;

                contractStatus({
                    id: 'contract.purchase_sent',
                    data: askPrice,
                });

                if (!this.options.timeMachineEnabled) {
                    return doUntilDone(action).then(onSuccess);
                }

                return recoverFromError(
                    action,
                    (errorCode, makeDelay) => {
                        // if disconnected no need to resubscription (handled by live-api)
                        if (errorCode !== 'DisconnectError') {
                            this.renewProposalsOnPurchase();
                        } else {
                            this.clearProposals();
                        }

                        const unsubscribe = this.store.subscribe(() => {
                            const { scope, proposalsReady } = this.store.getState();
                            if (scope === BEFORE_PURCHASE && proposalsReady) {
                                makeDelay().then(() => this.observer.emit('REVERT', 'before'));
                                unsubscribe();
                            }
                        });
                    },
                    ['PriceMoved', 'InvalidContractProposal'],
                    delayIndex++
                ).then(onSuccess);
            }
            const trade_option = tradeOptionToBuy(contract_type, this.tradeOptions);
            const insufficientBalanceError = createInsufficientDemoBalanceError({
                loginid: this.accountInfo?.loginid,
                requiredAmount: this.tradeOptions.amount,
            });
            if (insufficientBalanceError) {
                return Promise.reject(insufficientBalanceError);
            }
            const action = () => api_base.api.send(trade_option);

            this.isSold = false;

            contractStatus({
                id: 'contract.purchase_sent',
                data: this.tradeOptions.amount,
            });

            if (!this.options.timeMachineEnabled) {
                return doUntilDone(action).then(onSuccess);
            }

            return recoverFromError(
                action,
                (errorCode, makeDelay) => {
                    if (errorCode === 'DisconnectError') {
                        this.clearProposals();
                    }
                    const unsubscribe = this.store.subscribe(() => {
                        const { scope } = this.store.getState();
                        if (scope === BEFORE_PURCHASE) {
                            makeDelay().then(() => this.observer.emit('REVERT', 'before'));
                            unsubscribe();
                        }
                    });
                },
                ['PriceMoved', 'InvalidContractProposal'],
                delayIndex++
            ).then(onSuccess);
        }
        getPurchaseReference = () => purchase_reference;
        regeneratePurchaseReference = () => {
            purchase_reference = getUUID();
        };
        bootstrapPurchasedContract = buy => {
            const baseContract = {
                accountID: this.accountInfo.loginid,
                buy_price: buy.buy_price,
                contract_id: buy.contract_id,
                currency: buy.currency,
                date_start: buy.start_time,
                status: 'open',
                transaction_ids: {
                    buy: buy.transaction_id,
                },
            };

            // Keep a complete local snapshot before the first open-contract update arrives.
            // Some Deriv updates omit transaction_ids, so OpenContract can merge them from here.
            this.data.contract = baseContract;
            broadcastContract(baseContract);

            api_base.api
                ?.send({ proposal_open_contract: 1, contract_id: buy.contract_id })
                .then(response => {
                    const contract = response?.proposal_open_contract;

                    if (contract) {
                        this.processOpenContract(contract);
                    }
                })
                .catch(() => {
                    // Keep the optimistic contract in the UI while the stream catches up.
                });
        };
    };
