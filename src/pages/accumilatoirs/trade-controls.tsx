import classNames from 'classnames';
import { formatMoney, formatPercent, formatQuote } from './accumilatoirs-format';

export type TGrowthRateOption = { label: string; value: string };

export type TProposalSummary = {
    highBarrier?: number | string;
    lowBarrier?: number | string;
    maxPayout?: number | string;
    minStake?: number | string;
    spot?: number | string;
};

export interface TradeControlsProps {
    // Header status
    currency: string;
    isLive: boolean;
    isMarketLoading: boolean;

    // Growth rate
    growthRate: string;
    growthRateOptions: TGrowthRateOption[];
    onGrowthRateChange: (rate: string) => void;

    // Stake
    stake: string;
    onStakeChange: (value: string) => void;

    // Take profit
    takeProfitPercent: string;
    onTakeProfitChange: (value: string) => void;

    // Proposal / position summary
    bidPrice: number;
    currentProfit: number;
    currentStakeDisplay: number;
    hasOpenContract: boolean;
    hasProposalBarrierData: boolean;
    proposal: TProposalSummary;

    // Advanced strategy (martingale / auto trade) — derivity-specific, no
    // equivalent in the App Builder reference, kept behind a collapsible section.
    autoTradeEnabled: boolean;
    consecutiveLossCountInput: string;
    martingale: string;
    martingaleMode: string;
    onAutoTradeToggle: (enabled: boolean) => void;
    onCommitConsecutiveLossCountInput: () => void;
    onConsecutiveLossCountInputChange: (value: string) => void;
    onMartingaleChange: (value: string) => void;
    onMartingaleModeChange: (value: string) => void;

    // Buy / close
    canTrade: boolean;
    growthRatePercent: number;
    isCashingOut: boolean;
    isPurchasing: boolean;
    onStopAllTrades: () => void;
    onTradeAction: () => void;
    queuedPurchase: boolean;

    // Status / meta footer
    consecutiveLossDisplay: string | number;
    displayReturnPercent: number;
    proposalBarrierStatus: string;
    proposalMessage?: string;
    proposalStatus?: string;
    selectedMarketLabel?: string;
    takeProfitAmount: number;
}

export function TradeControls({
    currency,
    isLive,
    isMarketLoading,
    growthRate,
    growthRateOptions,
    onGrowthRateChange,
    stake,
    onStakeChange,
    takeProfitPercent,
    onTakeProfitChange,
    bidPrice,
    currentProfit,
    currentStakeDisplay,
    hasOpenContract,
    hasProposalBarrierData,
    proposal,
    autoTradeEnabled,
    consecutiveLossCountInput,
    martingale,
    martingaleMode,
    onAutoTradeToggle,
    onCommitConsecutiveLossCountInput,
    onConsecutiveLossCountInputChange,
    onMartingaleChange,
    onMartingaleModeChange,
    canTrade,
    growthRatePercent,
    isCashingOut,
    isPurchasing,
    onStopAllTrades,
    onTradeAction,
    queuedPurchase,
    consecutiveLossDisplay,
    displayReturnPercent,
    proposalBarrierStatus,
    proposalMessage,
    proposalStatus,
    selectedMarketLabel,
    takeProfitAmount,
}: TradeControlsProps) {
    const isControlsLocked = hasOpenContract || queuedPurchase;

    return (
        <aside className='accumilatoirs-ticket-card'>
            <div className='accumilatoirs-ticket-card__header'>
                <h2>Trade setup</h2>
                <span className={classNames({ 'accumilatoirs-live-text': isLive })}>
                    {isMarketLoading ? 'Loading' : isLive ? 'LIVE' : 'Waiting'} &middot; {currency}
                </span>
            </div>

            <div className='accumilatoirs-ticket-card__section'>
                <div className='accumilatoirs-field accumilatoirs-field--growth'>
                    <span className='accumilatoirs-field__label'>
                        Growth rate
                        <span
                            className='accumilatoirs-info-dot'
                            title='Your stake grows by this percentage for each tick that stays within the barrier range.'
                        >
                            i
                        </span>
                    </span>
                    <div className='accumilatoirs-segmented' role='radiogroup' aria-label='Growth rate'>
                        {growthRateOptions.map(rate => (
                            <button
                                key={rate.value}
                                aria-checked={growthRate === rate.value}
                                className={classNames('accumilatoirs-segmented__option', {
                                    'accumilatoirs-segmented__option--active': growthRate === rate.value,
                                })}
                                disabled={isControlsLocked}
                                role='radio'
                                type='button'
                                onClick={() => onGrowthRateChange(rate.value)}
                            >
                                {rate.label}
                            </button>
                        ))}
                    </div>
                </div>

                <label className='accumilatoirs-field'>
                    <span className='accumilatoirs-field__label'>Stake</span>
                    <div className='accumilatoirs-stepper'>
                        <button
                            aria-label='Decrease stake'
                            className='accumilatoirs-stepper__btn'
                            disabled={isControlsLocked}
                            type='button'
                            onClick={() => {
                                const next = Math.max(0.01, (Number(stake) || 0) - 1);
                                onStakeChange(String(Math.round(next * 100) / 100));
                            }}
                        >
                            −
                        </button>
                        <input
                            className='accumilatoirs-stepper__value'
                            disabled={isControlsLocked}
                            inputMode='decimal'
                            value={stake}
                            onChange={event => onStakeChange(event.target.value)}
                        />
                        <span className='accumilatoirs-stepper__suffix'>{currency}</span>
                        <button
                            aria-label='Increase stake'
                            className='accumilatoirs-stepper__btn'
                            disabled={isControlsLocked}
                            type='button'
                            onClick={() => {
                                const next = Math.min(100000, (Number(stake) || 0) + 1);
                                onStakeChange(String(Math.round(next * 100) / 100));
                            }}
                        >
                            +
                        </button>
                    </div>
                </label>

                <label className='accumilatoirs-field'>
                    <span className='accumilatoirs-field__label'>
                        Take profit
                        <span
                            className='accumilatoirs-info-dot'
                            title='The contract closes automatically when your profit reaches this amount.'
                        >
                            i
                        </span>
                    </span>
                    <div className='accumilatoirs-inline-input'>
                        <input
                            className='accumilatoirs-field__control'
                            disabled={isControlsLocked}
                            inputMode='decimal'
                            placeholder='-'
                            value={takeProfitPercent}
                            onChange={event => onTakeProfitChange(event.target.value)}
                        />
                        <span className='accumilatoirs-inline-input__suffix'>%</span>
                    </div>
                </label>
            </div>

            {/* Contract info summary — skeleton while waiting for the first Deriv proposal */}
            {!hasProposalBarrierData && !hasOpenContract && (
                <div className='accumilatoirs-summary-panel accumilatoirs-summary-panel--loading'>
                    <div className='accumilatoirs-summary-row accumilatoirs-summary-row--skeleton' />
                    <div className='accumilatoirs-summary-row accumilatoirs-summary-row--skeleton' />
                    <div className='accumilatoirs-summary-row accumilatoirs-summary-row--skeleton' />
                </div>
            )}

            {hasProposalBarrierData && !hasOpenContract && (
                <div className='accumilatoirs-summary-panel'>
                    <div className='accumilatoirs-summary-row'>
                        <span>Max. payout</span>
                        <span>{formatMoney(proposal.maxPayout, currency)}</span>
                    </div>
                    <div className='accumilatoirs-summary-row'>
                        <span>Spot</span>
                        <span>{formatQuote(proposal.spot)}</span>
                    </div>
                    <div className='accumilatoirs-summary-row'>
                        <span>Barrier range</span>
                        <span>
                            {formatQuote(proposal.lowBarrier)} &ndash; {formatQuote(proposal.highBarrier)}
                        </span>
                    </div>
                    {proposal.minStake ? (
                        <div className='accumilatoirs-summary-row'>
                            <span>Min. stake</span>
                            <span>{formatMoney(proposal.minStake, currency)}</span>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Active position summary — shown while a trade is running */}
            {hasOpenContract && (
                <div className='accumilatoirs-summary-panel'>
                    <div className='accumilatoirs-summary-row'>
                        <span>Stake</span>
                        <span>{formatMoney(currentStakeDisplay, currency)}</span>
                    </div>
                    <div
                        className={classNames('accumilatoirs-summary-row', {
                            'accumilatoirs-summary-row--positive': currentProfit >= 0,
                            'accumilatoirs-summary-row--negative': currentProfit < 0,
                        })}
                    >
                        <span>Current P&amp;L</span>
                        <span>
                            {currentProfit >= 0 ? '+' : ''}
                            {formatMoney(currentProfit, currency)}
                        </span>
                    </div>
                    <div className='accumilatoirs-summary-row accumilatoirs-summary-row--total'>
                        <span>Total return</span>
                        <span>{formatMoney(bidPrice, currency)}</span>
                    </div>
                </div>
            )}

            <details className='accumilatoirs-advanced'>
                <summary>Advanced strategy</summary>

                <div className='accumilatoirs-ticket__row accumilatoirs-ticket__row--martingale'>
                    <label className='accumilatoirs-field'>
                        <span className='accumilatoirs-field__label'>Martingale x</span>
                        <input
                            className='accumilatoirs-field__control'
                            disabled={isControlsLocked}
                            inputMode='decimal'
                            min='1.01'
                            step='0.5'
                            type='number'
                            value={martingale}
                            onChange={event => onMartingaleChange(event.target.value)}
                        />
                    </label>

                    <label className='accumilatoirs-field'>
                        <span className='accumilatoirs-field__label'>Strategy</span>
                        <select
                            className='accumilatoirs-field__control'
                            disabled={isControlsLocked}
                            value={martingaleMode}
                            onChange={event => onMartingaleModeChange(event.target.value)}
                        >
                            <option value='no_martingale'>No Martingale</option>
                            <option value='after_one_loss'>After 1 loss</option>
                            <option value='after_two_losses'>After 2 losses</option>
                            <option value='custom_consecutive_loss_trigger'>Custom loss count</option>
                        </select>
                    </label>
                </div>

                {martingaleMode === 'custom_consecutive_loss_trigger' && (
                    <label className='accumilatoirs-field accumilatoirs-field--martingale-threshold'>
                        <span className='accumilatoirs-field__label'>Consecutive losses before martingale</span>
                        <input
                            className='accumilatoirs-field__control'
                            disabled={isControlsLocked}
                            inputMode='numeric'
                            max='10'
                            min='1'
                            step='1'
                            type='number'
                            value={consecutiveLossCountInput}
                            onBlur={onCommitConsecutiveLossCountInput}
                            onChange={event => onConsecutiveLossCountInputChange(event.target.value)}
                        />
                    </label>
                )}

                <label
                    className={classNames('accumilatoirs-check accumilatoirs-check--auto', {
                        'accumilatoirs-check--auto-active': autoTradeEnabled,
                    })}
                >
                    <input
                        checked={autoTradeEnabled}
                        type='checkbox'
                        onChange={event => onAutoTradeToggle(event.target.checked)}
                    />
                    <span>Auto trade after breakout</span>
                </label>
            </details>

            <div className='accumilatoirs-ticket-card__action'>
                {!hasOpenContract && (
                    <button
                        className={classNames('accumilatoirs-primary', {
                            'accumilatoirs-primary--waiting': queuedPurchase,
                        })}
                        disabled={!canTrade}
                        type='button'
                        onClick={onTradeAction}
                    >
                        {queuedPurchase
                            ? 'Waiting for breakout...'
                            : isPurchasing
                              ? 'Purchasing...'
                              : `Buy at ${growthRatePercent.toFixed(0)}%`}
                    </button>
                )}

                {hasOpenContract && (
                    <button
                        className='accumilatoirs-primary accumilatoirs-primary--cashout'
                        disabled={isCashingOut}
                        type='button'
                        onClick={onTradeAction}
                    >
                        {isCashingOut ? (
                            'Cashing out...'
                        ) : (
                            <span className='accumilatoirs-primary__stacked'>
                                <span>Close</span>
                                <span className='accumilatoirs-primary__stacked-sub'>
                                    {formatMoney(bidPrice, currency)}
                                </span>
                            </span>
                        )}
                    </button>
                )}
            </div>

            <button
                className='accumilatoirs-stop'
                disabled={!hasOpenContract && !queuedPurchase && !autoTradeEnabled && !isPurchasing}
                type='button'
                onClick={onStopAllTrades}
            >
                Stop all trades
            </button>

            <div className='accumilatoirs-ticket__status'>
                {hasOpenContract
                    ? `Live return ${formatPercent(displayReturnPercent)} (${formatMoney(currentProfit, currency)})`
                    : queuedPurchase
                      ? hasProposalBarrierData
                          ? `${proposalBarrierStatus} Purchase queued for the next breakout/flew away.`
                          : 'Purchase queued. Waiting for Deriv barrier data.'
                      : proposalStatus === 'loading'
                        ? 'Preparing Deriv quote...'
                        : proposalBarrierStatus || proposalMessage}
            </div>

            <div className='accumilatoirs-ticket__meta'>
                <span>{selectedMarketLabel}</span>
                <span>Current stake {formatMoney(currentStakeDisplay, currency)}</span>
                <span>
                    TP {takeProfitPercent || 0}% = {formatMoney(takeProfitAmount, currency)}
                </span>
                <span>Consecutive losses {consecutiveLossDisplay}</span>
                {proposal.maxPayout ? <span>Max payout {formatMoney(proposal.maxPayout, currency)}</span> : null}
            </div>
        </aside>
    );
}

export default TradeControls;
