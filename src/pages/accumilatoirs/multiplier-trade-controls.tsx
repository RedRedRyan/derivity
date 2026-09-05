import { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { api_base } from '@/external/bot-skeleton';
import {
    buyContractForUi,
    getContractSnapshot,
    normalizeTradeParameters,
    sellContractForUi,
    streamContractUntilSettled,
} from '@/utils/trade-purchase';
import { formatMoney } from './accumilatoirs-format';

export interface MultipliersTradeControlsProps {
    currency: string;
    symbol?: string;
}

type TProposalPreview = {
    askPrice?: number;
    message: string;
    status: 'idle' | 'loading' | 'ready' | 'error';
};

type TOpenPosition = {
    bidPrice: number;
    buyPrice: number;
    contractId: number;
    contractType: string;
    isValidToSell: boolean;
    profit: number;
};

const MULTIPLIER_OPTIONS = ['10', '20', '50', '100', '150', '200'];

export function MultipliersTradeControls({ currency, symbol }: MultipliersTradeControlsProps) {
    const [direction, setDirection] = useState<'up' | 'down'>('up');
    const [multiplier, setMultiplier] = useState('100');
    const [stake, setStake] = useState('10');
    const [takeProfit, setTakeProfit] = useState('');
    const [stopLoss, setStopLoss] = useState('');
    const [proposal, setProposal] = useState<TProposalPreview>({ message: 'Enter a stake to quote.', status: 'idle' });
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [tradeMessage, setTradeMessage] = useState('');
    const [openPosition, setOpenPosition] = useState<TOpenPosition | null>(null);

    const contractType = direction === 'up' ? 'MULTUP' : 'MULTDOWN';
    const stakeAmount = Number(stake);
    const multiplierAmount = Number(multiplier);
    const canQuote = !!symbol && Number.isFinite(stakeAmount) && stakeAmount > 0 && multiplierAmount > 0;

    const tradeParameters = useMemo(() => {
        if (!canQuote || !symbol || openPosition) return null;

        const takeProfitAmount = Number(takeProfit);
        const stopLossAmount = Number(stopLoss);
        const hasLimitOrder =
            (Number.isFinite(takeProfitAmount) && takeProfitAmount > 0) ||
            (Number.isFinite(stopLossAmount) && stopLossAmount > 0);

        return {
            amount: stakeAmount,
            basis: 'stake',
            contract_type: contractType,
            currency,
            multiplier: multiplierAmount,
            symbol,
            ...(hasLimitOrder
                ? {
                      limit_order: {
                          ...(Number.isFinite(takeProfitAmount) && takeProfitAmount > 0
                              ? { take_profit: takeProfitAmount }
                              : {}),
                          ...(Number.isFinite(stopLossAmount) && stopLossAmount > 0
                              ? { stop_loss: stopLossAmount }
                              : {}),
                      },
                  }
                : {}),
        };
    }, [canQuote, contractType, currency, multiplierAmount, openPosition, stakeAmount, stopLoss, symbol, takeProfit]);

    // Debounced one-shot proposal preview — skipped entirely while a position is open,
    // since Multipliers don't re-quote an existing contract.
    useEffect(() => {
        if (!tradeParameters) {
            setProposal({
                message: openPosition ? 'Position is open.' : 'Enter a valid stake and multiplier to quote.',
                status: 'idle',
            });
            return undefined;
        }

        let isCancelled = false;
        setProposal(previous => ({ ...previous, message: 'Requesting live Deriv proposal...', status: 'loading' }));

        const timer = window.setTimeout(async () => {
            try {
                if (!api_base.api) {
                    if (!isCancelled) setProposal({ message: 'Waiting for Deriv connection...', status: 'loading' });
                    return;
                }

                const response = await (api_base.api as any)?.send?.({
                    proposal: 1,
                    ...normalizeTradeParameters(tradeParameters),
                });
                if (isCancelled) return;

                if (response?.error) {
                    setProposal({
                        message: response.error.message || 'Unable to fetch a live proposal.',
                        status: 'error',
                    });
                    return;
                }

                setProposal({
                    askPrice: Number(response?.proposal?.ask_price),
                    message: 'Live proposal ready.',
                    status: 'ready',
                });
            } catch (error) {
                if (!isCancelled) {
                    setProposal({
                        message: error instanceof Error ? error.message : 'Unable to fetch a live proposal.',
                        status: 'error',
                    });
                }
            }
        }, 350);

        return () => {
            isCancelled = true;
            window.clearTimeout(timer);
        };
    }, [openPosition, tradeParameters]);

    const canTrade = canQuote && !openPosition && proposal.status === 'ready' && !isPurchasing;

    const handlePurchase = useCallback(async () => {
        if (!tradeParameters) {
            setTradeMessage('Enter a valid stake and multiplier before trading.');
            return;
        }

        setIsPurchasing(true);
        setTradeMessage('Buying contract...');

        try {
            const buy = await buyContractForUi({
                parameters: tradeParameters,
                price: stakeAmount,
                source: 'Multipliers',
            });
            const buyDetails = buy as Record<string, any>;
            const contractId = Number(buyDetails.contract_id);

            setOpenPosition({
                bidPrice: Number(buyDetails.buy_price ?? stakeAmount),
                buyPrice: Number(buyDetails.buy_price ?? stakeAmount),
                contractId,
                contractType,
                isValidToSell: false,
                profit: 0,
            });
            setTradeMessage(`Purchase confirmed: ${contractId}.`);

            if (Number.isFinite(contractId)) {
                const fallback = getContractSnapshot({
                    buy_price: Number(buyDetails.buy_price ?? stakeAmount),
                    contract_id: contractId,
                    contract_type: contractType,
                    currency,
                    status: 'open',
                });

                void streamContractUntilSettled({
                    contractId,
                    fallback,
                    onUpdate: (snapshot, rawContract) => {
                        if (snapshot.is_sold) {
                            setOpenPosition(null);
                            setTradeMessage(
                                `Position closed: ${formatMoney(Number(snapshot.profit ?? 0), currency)} P&L.`
                            );
                            return;
                        }

                        setOpenPosition(current =>
                            current
                                ? {
                                      ...current,
                                      bidPrice: Number(rawContract?.bid_price ?? current.bidPrice),
                                      isValidToSell: Boolean(rawContract?.is_valid_to_sell),
                                      profit: Number(rawContract?.profit ?? current.profit),
                                  }
                                : current
                        );
                    },
                    source: 'Multipliers',
                });
            }
        } catch (error) {
            setTradeMessage(error instanceof Error ? error.message : 'The purchase could not be completed.');
        } finally {
            setIsPurchasing(false);
        }
    }, [contractType, currency, stakeAmount, tradeParameters]);

    const handleClose = useCallback(async () => {
        if (!openPosition) return;

        setIsClosing(true);
        setTradeMessage('Closing position...');
        try {
            await sellContractForUi({
                contractId: openPosition.contractId,
                price: openPosition.bidPrice,
                source: 'Multipliers',
            });
            // The active streamContractUntilSettled subscription will report is_sold and
            // clear openPosition once the server confirms the sale.
        } catch (error) {
            setTradeMessage(error instanceof Error ? error.message : 'The position could not be closed.');
        } finally {
            setIsClosing(false);
        }
    }, [openPosition]);

    const isControlsLocked = !!openPosition || isPurchasing;

    return (
        <>
            <div className='accumilatoirs-ticket-card__header'>
                <h2>Trade setup</h2>
                <span>{currency}</span>
            </div>

            <div className='accumilatoirs-ticket-card__section'>
                <label className='accumilatoirs-field'>
                    <span className='accumilatoirs-field__label'>Stake</span>
                    <div className='accumilatoirs-inline-input'>
                        <input
                            className='accumilatoirs-field__control'
                            disabled={isControlsLocked}
                            inputMode='decimal'
                            value={stake}
                            onChange={event => setStake(event.target.value.replace(/[^\d.]/g, ''))}
                        />
                        <span className='accumilatoirs-inline-input__suffix'>{currency}</span>
                    </div>
                </label>

                <label className='accumilatoirs-field'>
                    <span className='accumilatoirs-field__label'>Multiplier</span>
                    <select
                        className='accumilatoirs-field__control'
                        disabled={isControlsLocked}
                        value={multiplier}
                        onChange={event => setMultiplier(event.target.value)}
                    >
                        {MULTIPLIER_OPTIONS.map(option => (
                            <option key={option} value={option}>
                                x{option}
                            </option>
                        ))}
                    </select>
                </label>

                <div className='accumilatoirs-ticket__row'>
                    <label className='accumilatoirs-field'>
                        <span className='accumilatoirs-field__label'>Take profit</span>
                        <div className='accumilatoirs-inline-input'>
                            <input
                                className='accumilatoirs-field__control'
                                disabled={isControlsLocked}
                                inputMode='decimal'
                                placeholder='-'
                                value={takeProfit}
                                onChange={event => setTakeProfit(event.target.value.replace(/[^\d.]/g, ''))}
                            />
                            <span className='accumilatoirs-inline-input__suffix'>{currency}</span>
                        </div>
                    </label>
                    <label className='accumilatoirs-field'>
                        <span className='accumilatoirs-field__label'>Stop loss</span>
                        <div className='accumilatoirs-inline-input'>
                            <input
                                className='accumilatoirs-field__control'
                                disabled={isControlsLocked}
                                inputMode='decimal'
                                placeholder='-'
                                value={stopLoss}
                                onChange={event => setStopLoss(event.target.value.replace(/[^\d.]/g, ''))}
                            />
                            <span className='accumilatoirs-inline-input__suffix'>{currency}</span>
                        </div>
                    </label>
                </div>

                <div className='accumilatoirs-direction'>
                    <button
                        className={classNames('accumilatoirs-direction__btn', 'accumilatoirs-direction__btn--rise', {
                            'accumilatoirs-direction__btn--active': direction === 'up',
                        })}
                        disabled={isControlsLocked}
                        type='button'
                        onClick={() => setDirection('up')}
                    >
                        Up
                    </button>
                    <button
                        className={classNames('accumilatoirs-direction__btn', 'accumilatoirs-direction__btn--fall', {
                            'accumilatoirs-direction__btn--active': direction === 'down',
                        })}
                        disabled={isControlsLocked}
                        type='button'
                        onClick={() => setDirection('down')}
                    >
                        Down
                    </button>
                </div>
            </div>

            {!openPosition && (
                <div className='accumilatoirs-summary-panel'>
                    <div className='accumilatoirs-summary-row'>
                        <span>Ask price</span>
                        <span>{proposal.askPrice ? formatMoney(proposal.askPrice, currency) : '--'}</span>
                    </div>
                </div>
            )}

            {openPosition && (
                <div className='accumilatoirs-summary-panel'>
                    <div className='accumilatoirs-summary-row'>
                        <span>Stake</span>
                        <span>{formatMoney(openPosition.buyPrice, currency)}</span>
                    </div>
                    <div
                        className={classNames('accumilatoirs-summary-row', {
                            'accumilatoirs-summary-row--positive': openPosition.profit >= 0,
                            'accumilatoirs-summary-row--negative': openPosition.profit < 0,
                        })}
                    >
                        <span>Current P&amp;L</span>
                        <span>
                            {openPosition.profit >= 0 ? '+' : ''}
                            {formatMoney(openPosition.profit, currency)}
                        </span>
                    </div>
                    <div className='accumilatoirs-summary-row accumilatoirs-summary-row--total'>
                        <span>Total return</span>
                        <span>{formatMoney(openPosition.bidPrice, currency)}</span>
                    </div>
                </div>
            )}

            {!openPosition ? (
                <button
                    className='accumilatoirs-primary'
                    disabled={!canTrade}
                    type='button'
                    onClick={() => void handlePurchase()}
                >
                    {isPurchasing ? 'Purchasing...' : `Buy ${contractType}`}
                </button>
            ) : (
                <button
                    className='accumilatoirs-primary accumilatoirs-primary--cashout'
                    disabled={isClosing}
                    type='button'
                    onClick={() => void handleClose()}
                >
                    {isClosing ? 'Closing...' : `Close ${formatMoney(openPosition.bidPrice, currency)}`}
                </button>
            )}

            <div className='accumilatoirs-ticket__status'>{tradeMessage || proposal.message}</div>
        </>
    );
}

export default MultipliersTradeControls;
