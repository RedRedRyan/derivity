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

type TDigitsSubType = Extract<TTradeTypeId, 'matches_differs' | 'even_odd' | 'over_under'>;

type TMatchesDiffersDirection = 'match' | 'differ';
type TEvenOddDirection = 'even' | 'odd';
type TOverUnderDirection = 'over' | 'under';
type TDirection = TMatchesDiffersDirection | TEvenOddDirection | TOverUnderDirection;

type TProposalPreview = {
    askPrice?: number;
    message: string;
    payout?: number;
    status: 'idle' | 'loading' | 'ready' | 'error';
};

type TDigitContractCard = {
    buy_price?: number;
    contract_id: string;
    contract_type: string;
    currency: string;
    entry_spot?: string | number;
    exit_spot?: string | number;
    payout?: number;
    profit?: number;
    status: string;
};

export interface DigitsTradeControlsProps {
    currency: string;
    subType: TDigitsSubType;
    symbol?: string;
}

const DIGITS = Array.from({ length: 10 }, (_, digit) => digit);

const DEFAULT_DIRECTION_BY_SUBTYPE: Record<TDigitsSubType, TDirection> = {
    matches_differs: 'match',
    even_odd: 'even',
    over_under: 'over',
};

const DIRECTION_OPTIONS_BY_SUBTYPE: Record<TDigitsSubType, { value: TDirection; label: string }[]> = {
    matches_differs: [
        { value: 'match', label: 'Matches' },
        { value: 'differ', label: 'Differs' },
    ],
    even_odd: [
        { value: 'even', label: 'Even' },
        { value: 'odd', label: 'Odd' },
    ],
    over_under: [
        { value: 'over', label: 'Over' },
        { value: 'under', label: 'Under' },
    ],
};

const getContractType = (subType: TDigitsSubType, direction: TDirection) => {
    switch (subType) {
        case 'matches_differs':
            return direction === 'match' ? 'DIGITMATCH' : 'DIGITDIFF';
        case 'even_odd':
            return direction === 'even' ? 'DIGITEVEN' : 'DIGITODD';
        case 'over_under':
        default:
            return direction === 'over' ? 'DIGITOVER' : 'DIGITUNDER';
    }
};

const needsBarrier = (subType: TDigitsSubType) => subType === 'matches_differs' || subType === 'over_under';

// DIGITOVER can't compare against 9 (nothing is "over 9"), DIGITUNDER can't compare against 0.
const clampPredictionDigit = (subType: TDigitsSubType, direction: TDirection, digit: number) => {
    if (subType === 'over_under') {
        if (direction === 'over') return Math.min(Math.max(digit, 0), 8);
        return Math.min(Math.max(digit, 1), 9);
    }
    return Math.min(Math.max(digit, 0), 9);
};

const clampDuration = (value: string) => {
    const next = Number(value.replace(/\D/g, ''));
    if (!Number.isFinite(next)) return '5';
    return String(Math.min(Math.max(Math.round(next), 1), 10));
};

const getContractStatusLabel = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === 'won') return 'Won';
    if (normalized === 'lost') return 'Lost';
    if (normalized === 'sold') return 'Sold';
    return 'Live';
};

export function DigitsTradeControls({ currency, subType, symbol }: DigitsTradeControlsProps) {
    const [duration, setDuration] = useState('5');
    const [stake, setStake] = useState('10');
    const [direction, setDirection] = useState<TDirection>(DEFAULT_DIRECTION_BY_SUBTYPE[subType]);
    const [predictionDigit, setPredictionDigit] = useState(5);
    const [proposal, setProposal] = useState<TProposalPreview>({ message: 'Enter a stake to quote.', status: 'idle' });
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [tradeMessage, setTradeMessage] = useState('');
    const [purchasedContracts, setPurchasedContracts] = useState<TDigitContractCard[]>([]);

    const directionOptions = DIRECTION_OPTIONS_BY_SUBTYPE[subType];
    const contractType = getContractType(subType, direction);
    const requiresBarrier = needsBarrier(subType);

    // Reset direction (and clamp the prediction digit) whenever the trade type itself changes.
    useEffect(() => {
        setDirection(DEFAULT_DIRECTION_BY_SUBTYPE[subType]);
    }, [subType]);

    useEffect(() => {
        setPredictionDigit(previous => clampPredictionDigit(subType, direction, previous));
    }, [direction, subType]);

    const stakeAmount = Number(stake);
    const durationAmount = Number(duration);
    const canQuote = !!symbol && Number.isFinite(stakeAmount) && stakeAmount > 0 && durationAmount > 0;

    const tradeParameters = useMemo(() => {
        if (!canQuote || !symbol) return null;

        return {
            amount: stakeAmount,
            barrier: requiresBarrier ? String(predictionDigit) : undefined,
            basis: 'stake',
            contract_type: contractType,
            currency,
            duration: durationAmount,
            duration_unit: 't',
            symbol,
        };
    }, [canQuote, contractType, currency, durationAmount, predictionDigit, requiresBarrier, stakeAmount, symbol]);

    // Debounced one-shot proposal preview — same pattern as Up & Down's Rise/Fall quote.
    useEffect(() => {
        if (!tradeParameters) {
            setProposal({ message: 'Enter a valid stake and duration to quote.', status: 'idle' });
            return undefined;
        }

        let isCancelled = false;
        setProposal(previous => ({ ...previous, message: 'Requesting live Deriv proposal...', status: 'loading' }));

        const timer = window.setTimeout(async () => {
            try {
                if (!api_base.api) {
                    if (!isCancelled) {
                        setProposal({ message: 'Waiting for Deriv connection...', status: 'loading' });
                    }
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
            setTradeMessage('Enter a valid stake, duration, and market before trading.');
            return;
        }

        setIsPurchasing(true);
        setTradeMessage('Buying contract...');

        try {
            const buy = await buyContractForUi({
                parameters: tradeParameters,
                price: stakeAmount,
                source: 'Digits',
            });
            const buyDetails = buy as Record<string, any>;
            const contractId = String(buyDetails.contract_id || buyDetails.transaction_id || 'confirmed');

            const nextContract: TDigitContractCard = {
                buy_price: Number(buyDetails.buy_price ?? stakeAmount),
                contract_id: contractId,
                contract_type: contractType,
                currency,
                entry_spot: buyDetails.start_spot,
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
                                          entry_spot: snapshot.entry_spot ?? contract.entry_spot,
                                          exit_spot: snapshot.exit_spot ?? contract.exit_spot,
                                          profit: Number(snapshot.profit ?? contract.profit ?? 0),
                                          status: snapshot.is_sold ? String(snapshot.status || 'sold') : 'open',
                                      }
                                    : contract
                            )
                        );
                    },
                    source: 'Digits',
                });
            }

            setTradeMessage(`Purchase confirmed: ${contractId}.`);
        } catch (error) {
            setTradeMessage(error instanceof Error ? error.message : 'The purchase could not be completed.');
        } finally {
            setIsPurchasing(false);
        }
    }, [contractType, currency, stakeAmount, tradeParameters]);

    return (
        <>
            <div className='accumilatoirs-ticket-card__header'>
                <h2>Trade setup</h2>
                <span>{currency}</span>
            </div>

            <div className='accumilatoirs-ticket-card__section'>
                <div className='accumilatoirs-ticket__row'>
                    <label className='accumilatoirs-field'>
                        <span className='accumilatoirs-field__label'>Duration</span>
                        <div className='accumilatoirs-inline-input'>
                            <input
                                className='accumilatoirs-field__control'
                                disabled={isPurchasing}
                                inputMode='numeric'
                                value={duration}
                                onChange={event => setDuration(event.target.value.replace(/\D/g, ''))}
                                onBlur={event => setDuration(clampDuration(event.target.value))}
                            />
                            <span className='accumilatoirs-inline-input__suffix'>Ticks</span>
                        </div>
                    </label>
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
                </div>

                {requiresBarrier && (
                    <div className='accumilatoirs-field'>
                        <span className='accumilatoirs-field__label'>
                            {subType === 'matches_differs' ? 'Prediction digit' : 'Barrier digit'}
                        </span>
                        <div className='accumilatoirs-digit-grid'>
                            {DIGITS.map(digit => {
                                const isDisabled =
                                    subType === 'over_under' &&
                                    ((direction === 'over' && digit === 9) || (direction === 'under' && digit === 0));

                                return (
                                    <button
                                        className={classNames('accumilatoirs-digit-grid__btn', {
                                            'accumilatoirs-digit-grid__btn--active': digit === predictionDigit,
                                        })}
                                        disabled={isPurchasing || isDisabled}
                                        key={digit}
                                        type='button'
                                        onClick={() => setPredictionDigit(digit)}
                                    >
                                        {digit}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className='accumilatoirs-direction'>
                    {directionOptions.map(option => (
                        <button
                            className={classNames('accumilatoirs-direction__btn', {
                                'accumilatoirs-direction__btn--active': option.value === direction,
                                'accumilatoirs-direction__btn--rise':
                                    option.value === direction && directionOptions.indexOf(option) === 0,
                                'accumilatoirs-direction__btn--fall':
                                    option.value === direction && directionOptions.indexOf(option) === 1,
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
                {isPurchasing ? 'Purchasing...' : `Buy ${getContractType(subType, direction)}`}
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

export default DigitsTradeControls;
