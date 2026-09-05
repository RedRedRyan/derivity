import { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { api_base } from '@/external/bot-skeleton';
import {
    buyContractForUi,
    getContractSnapshot,
    normalizeTradeParameters,
    streamContractUntilSettled,
} from '@/utils/trade-purchase';
import { formatMoney } from './accumilatoirs-format';
import type { TTradeTypeId } from './trade-type-catalog';

type TBarrierDurationSubType = Extract<TTradeTypeId, 'touch_no_touch' | 'turbos' | 'vanillas'>;

type TProposalPreview = {
    askPrice?: number;
    message: string;
    payout?: number;
    status: 'idle' | 'loading' | 'ready' | 'error';
};

type TContractCard = {
    buy_price?: number;
    contract_id: string;
    contract_type: string;
    currency: string;
    payout?: number;
    profit?: number;
    status: string;
};

export interface BarrierDurationTradeControlsProps {
    currency: string;
    subType: TBarrierDurationSubType;
    symbol?: string;
}

type TDirectionOption = { value: string; label: string; contractType: string };

type TSubTypeConfig = {
    barrierLabel: string;
    defaultBarrier: string;
    directionOptions: [TDirectionOption, TDirectionOption];
    durationLabel: string;
    durationMax: number;
    durationMin: number;
    durationUnit: string;
    defaultDuration: string;
};

const SUBTYPE_CONFIG: Record<TBarrierDurationSubType, TSubTypeConfig> = {
    touch_no_touch: {
        barrierLabel: 'Barrier offset',
        defaultBarrier: '+0.25',
        directionOptions: [
            { value: 'touch', label: 'Touch', contractType: 'ONETOUCH' },
            { value: 'no_touch', label: 'No Touch', contractType: 'NOTOUCH' },
        ],
        durationLabel: 'Minutes',
        durationMax: 1440,
        durationMin: 1,
        durationUnit: 'm',
        defaultDuration: '15',
    },
    turbos: {
        barrierLabel: 'Barrier offset',
        defaultBarrier: '+0.50',
        directionOptions: [
            { value: 'long', label: 'Up', contractType: 'TURBOSLONG' },
            { value: 'short', label: 'Down', contractType: 'TURBOSSHORT' },
        ],
        durationLabel: 'Days',
        durationMax: 365,
        durationMin: 1,
        durationUnit: 'd',
        defaultDuration: '1',
    },
    vanillas: {
        barrierLabel: 'Strike offset',
        defaultBarrier: '+0.00',
        directionOptions: [
            { value: 'call', label: 'Call', contractType: 'VANILLALONGCALL' },
            { value: 'put', label: 'Put', contractType: 'VANILLALONGPUT' },
        ],
        durationLabel: 'Days',
        durationMax: 365,
        durationMin: 1,
        durationUnit: 'd',
        defaultDuration: '1',
    },
};

const getContractStatusLabel = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === 'won') return 'Won';
    if (normalized === 'lost') return 'Lost';
    if (normalized === 'sold') return 'Sold';
    return 'Live';
};

export function BarrierDurationTradeControls({ currency, subType, symbol }: BarrierDurationTradeControlsProps) {
    const config = SUBTYPE_CONFIG[subType];
    const [direction, setDirection] = useState(config.directionOptions[0].value);
    const [barrier, setBarrier] = useState(config.defaultBarrier);
    const [duration, setDuration] = useState(config.defaultDuration);
    const [stake, setStake] = useState('10');
    const [proposal, setProposal] = useState<TProposalPreview>({ message: 'Enter a stake to quote.', status: 'idle' });
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [tradeMessage, setTradeMessage] = useState('');
    const [purchasedContracts, setPurchasedContracts] = useState<TContractCard[]>([]);

    // Reset to sensible defaults whenever the trade type itself changes.
    useEffect(() => {
        setDirection(config.directionOptions[0].value);
        setBarrier(config.defaultBarrier);
        setDuration(config.defaultDuration);
    }, [config]);

    const contractType =
        config.directionOptions.find(option => option.value === direction)?.contractType ??
        config.directionOptions[0].contractType;

    const stakeAmount = Number(stake);
    const durationAmount = Number(duration);
    const canQuote =
        !!symbol &&
        Number.isFinite(stakeAmount) &&
        stakeAmount > 0 &&
        Number.isFinite(durationAmount) &&
        durationAmount > 0 &&
        barrier.trim() !== '';

    const tradeParameters = useMemo(() => {
        if (!canQuote || !symbol) return null;

        return {
            amount: stakeAmount,
            barrier,
            basis: 'stake',
            contract_type: contractType,
            currency,
            duration: durationAmount,
            duration_unit: config.durationUnit,
            symbol,
        };
    }, [barrier, canQuote, config.durationUnit, contractType, currency, durationAmount, stakeAmount, symbol]);

    // Debounced one-shot proposal preview — same pattern used for Digits and Up & Down.
    useEffect(() => {
        if (!tradeParameters) {
            setProposal({ message: 'Enter a valid stake, barrier, and duration to quote.', status: 'idle' });
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
                    payout: Number(response?.proposal?.payout),
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
    }, [tradeParameters]);

    const canTrade = canQuote && proposal.status === 'ready' && !isPurchasing;

    const handlePurchase = useCallback(async () => {
        if (!tradeParameters) {
            setTradeMessage('Enter a valid stake, barrier, and duration before trading.');
            return;
        }

        setIsPurchasing(true);
        setTradeMessage('Buying contract...');

        try {
            const buy = await buyContractForUi({ parameters: tradeParameters, price: stakeAmount, source: subType });
            const buyDetails = buy as Record<string, any>;
            const contractId = String(buyDetails.contract_id || buyDetails.transaction_id || 'confirmed');

            const nextContract: TContractCard = {
                buy_price: Number(buyDetails.buy_price ?? stakeAmount),
                contract_id: contractId,
                contract_type: contractType,
                currency,
                payout: Number(buyDetails.payout),
                status: 'open',
            };
            setPurchasedContracts(current => [nextContract, ...current].slice(0, 5));

            if (buyDetails.contract_id) {
                const fallback = getContractSnapshot(
                    {
                        ...buyDetails,
                        buy_price: Number(buyDetails.buy_price ?? stakeAmount),
                        contract_id: buyDetails.contract_id,
                        contract_type: contractType,
                        currency,
                        status: 'open',
                    },
                    nextContract
                );

                void streamContractUntilSettled({
                    contractId: Number(buyDetails.contract_id),
                    fallback,
                    onUpdate: snapshot => {
                        setPurchasedContracts(current =>
                            current.map(contract =>
                                contract.contract_id === String(buyDetails.contract_id)
                                    ? {
                                          ...contract,
                                          buy_price: Number(snapshot.buy_price ?? contract.buy_price),
                                          profit: Number(snapshot.profit ?? contract.profit ?? 0),
                                          status: snapshot.is_sold ? String(snapshot.status || 'sold') : 'open',
                                      }
                                    : contract
                            )
                        );
                    },
                    source: subType,
                });
            }

            setTradeMessage(`Purchase confirmed: ${contractId}.`);
        } catch (error) {
            setTradeMessage(error instanceof Error ? error.message : 'The purchase could not be completed.');
        } finally {
            setIsPurchasing(false);
        }
    }, [contractType, currency, stakeAmount, subType, tradeParameters]);

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
                            disabled={isPurchasing}
                            inputMode='decimal'
                            value={stake}
                            onChange={event => setStake(event.target.value.replace(/[^\d.]/g, ''))}
                        />
                        <span className='accumilatoirs-inline-input__suffix'>{currency}</span>
                    </div>
                </label>

                <label className='accumilatoirs-field'>
                    <span className='accumilatoirs-field__label'>{config.barrierLabel}</span>
                    <div className='accumilatoirs-inline-input'>
                        <input
                            className='accumilatoirs-field__control'
                            disabled={isPurchasing}
                            value={barrier}
                            onChange={event => setBarrier(event.target.value.replace(/[^\d.+\-]/g, ''))}
                        />
                    </div>
                </label>

                <label className='accumilatoirs-field'>
                    <span className='accumilatoirs-field__label'>Duration</span>
                    <div className='accumilatoirs-inline-input'>
                        <input
                            className='accumilatoirs-field__control'
                            disabled={isPurchasing}
                            inputMode='numeric'
                            value={duration}
                            onChange={event => setDuration(event.target.value.replace(/\D/g, ''))}
                            onBlur={event => {
                                const next = Number(event.target.value.replace(/\D/g, '')) || config.durationMin;
                                setDuration(String(Math.min(Math.max(next, config.durationMin), config.durationMax)));
                            }}
                        />
                        <span className='accumilatoirs-inline-input__suffix'>{config.durationLabel}</span>
                    </div>
                </label>

                <div className='accumilatoirs-direction'>
                    {config.directionOptions.map((option, index) => (
                        <button
                            className={classNames('accumilatoirs-direction__btn', {
                                'accumilatoirs-direction__btn--active': option.value === direction,
                                'accumilatoirs-direction__btn--rise': option.value === direction && index === 0,
                                'accumilatoirs-direction__btn--fall': option.value === direction && index === 1,
                            })}
                            disabled={isPurchasing}
                            key={option.value}
                            type='button'
                            onClick={() => setDirection(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className='accumilatoirs-summary-panel'>
                <div className='accumilatoirs-summary-row'>
                    <span>Payout</span>
                    <span>{proposal.payout ? formatMoney(proposal.payout, currency) : '--'}</span>
                </div>
                <div className='accumilatoirs-summary-row'>
                    <span>Ask price</span>
                    <span>{proposal.askPrice ? formatMoney(proposal.askPrice, currency) : '--'}</span>
                </div>
            </div>

            <button
                className='accumilatoirs-primary'
                disabled={!canTrade}
                type='button'
                onClick={() => void handlePurchase()}
            >
                {isPurchasing ? 'Purchasing...' : `Buy ${contractType}`}
            </button>

            <div className='accumilatoirs-ticket__status'>{tradeMessage || proposal.message}</div>

            {purchasedContracts.length > 0 && (
                <div className='accumilatoirs-summary-panel'>
                    {purchasedContracts.map(contract => (
                        <div className='accumilatoirs-summary-row' key={contract.contract_id}>
                            <span>
                                {contract.contract_id} &middot; {getContractStatusLabel(contract.status)}
                            </span>
                            <span
                                className={classNames({
                                    'accumilatoirs-summary-row--positive': Number(contract.profit ?? 0) >= 0,
                                    'accumilatoirs-summary-row--negative': Number(contract.profit ?? 0) < 0,
                                })}
                            >
                                {formatMoney(contract.profit, contract.currency)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

export default BarrierDurationTradeControls;
