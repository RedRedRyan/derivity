import { useState } from 'react';
import classNames from 'classnames';
import { TTradeTypeCatalogItem, TTradeTypeId } from './trade-type-catalog';

export interface TradeTypePreviewProps {
    tradeType: TTradeTypeCatalogItem;
    currency: string;
}

const DIGITS = Array.from({ length: 10 }, (_, digit) => digit);

const DurationStakeFields = ({ currency }: { currency: string }) => {
    const [duration, setDuration] = useState('5');
    const [stake, setStake] = useState('10');

    return (
        <div className='accumilatoirs-ticket__row'>
            <label className='accumilatoirs-field'>
                <span className='accumilatoirs-field__label'>Duration</span>
                <div className='accumilatoirs-inline-input'>
                    <input
                        className='accumilatoirs-field__control'
                        inputMode='numeric'
                        value={duration}
                        onChange={event => setDuration(event.target.value.replace(/\D/g, ''))}
                    />
                    <span className='accumilatoirs-inline-input__suffix'>Ticks</span>
                </div>
            </label>
            <label className='accumilatoirs-field'>
                <span className='accumilatoirs-field__label'>Stake</span>
                <div className='accumilatoirs-inline-input'>
                    <input
                        className='accumilatoirs-field__control'
                        inputMode='decimal'
                        value={stake}
                        onChange={event => setStake(event.target.value.replace(/[^\d.]/g, ''))}
                    />
                    <span className='accumilatoirs-inline-input__suffix'>{currency}</span>
                </div>
            </label>
        </div>
    );
};

const DirectionToggle = ({ options }: { options: [string, string] }) => {
    const [selected, setSelected] = useState(options[0]);

    return (
        <div className='accumilatoirs-direction'>
            {options.map(option => (
                <button
                    className={classNames('accumilatoirs-direction__btn', {
                        'accumilatoirs-direction__btn--active': option === selected,
                        'accumilatoirs-direction__btn--rise': option === selected && options.indexOf(option) === 0,
                        'accumilatoirs-direction__btn--fall': option === selected && options.indexOf(option) === 1,
                    })}
                    key={option}
                    type='button'
                    onClick={() => setSelected(option)}
                >
                    {option}
                </button>
            ))}
        </div>
    );
};

const DigitPicker = ({ label }: { label: string }) => {
    const [selected, setSelected] = useState(5);

    return (
        <div className='accumilatoirs-field'>
            <span className='accumilatoirs-field__label'>{label}</span>
            <div className='accumilatoirs-digit-grid'>
                {DIGITS.map(digit => (
                    <button
                        className={classNames('accumilatoirs-digit-grid__btn', {
                            'accumilatoirs-digit-grid__btn--active': digit === selected,
                        })}
                        key={digit}
                        type='button'
                        onClick={() => setSelected(digit)}
                    >
                        {digit}
                    </button>
                ))}
            </div>
        </div>
    );
};

const renderCategoryFields = (id: TTradeTypeId, currency: string) => {
    switch (id) {
        case 'matches_differs':
            return (
                <>
                    <DurationStakeFields currency={currency} />
                    <DigitPicker label='Prediction digit' />
                    <DirectionToggle options={['Matches', 'Differs']} />
                </>
            );
        case 'even_odd':
            return (
                <>
                    <DurationStakeFields currency={currency} />
                    <DirectionToggle options={['Even', 'Odd']} />
                </>
            );
        case 'over_under':
            return (
                <>
                    <DurationStakeFields currency={currency} />
                    <DigitPicker label='Barrier digit' />
                    <DirectionToggle options={['Over', 'Under']} />
                </>
            );
        case 'higher_lower':
            return (
                <>
                    <DurationStakeFields currency={currency} />
                    <label className='accumilatoirs-field'>
                        <span className='accumilatoirs-field__label'>Barrier offset</span>
                        <div className='accumilatoirs-inline-input'>
                            <input className='accumilatoirs-field__control' defaultValue='+0.10' />
                        </div>
                    </label>
                    <DirectionToggle options={['Higher', 'Lower']} />
                </>
            );
        case 'touch_no_touch':
            return (
                <>
                    <DurationStakeFields currency={currency} />
                    <label className='accumilatoirs-field'>
                        <span className='accumilatoirs-field__label'>Barrier offset</span>
                        <div className='accumilatoirs-inline-input'>
                            <input className='accumilatoirs-field__control' defaultValue='+0.25' />
                        </div>
                    </label>
                    <DirectionToggle options={['Touch', 'No Touch']} />
                </>
            );
        case 'multipliers':
            return (
                <>
                    <label className='accumilatoirs-field'>
                        <span className='accumilatoirs-field__label'>Stake</span>
                        <div className='accumilatoirs-inline-input'>
                            <input className='accumilatoirs-field__control' defaultValue='10' inputMode='decimal' />
                            <span className='accumilatoirs-inline-input__suffix'>{currency}</span>
                        </div>
                    </label>
                    <label className='accumilatoirs-field'>
                        <span className='accumilatoirs-field__label'>Multiplier</span>
                        <select className='accumilatoirs-field__control' defaultValue='100'>
                            {['10', '20', '50', '100', '150', '200'].map(multiplier => (
                                <option key={multiplier} value={multiplier}>
                                    x{multiplier}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className='accumilatoirs-ticket__row'>
                        <label className='accumilatoirs-field'>
                            <span className='accumilatoirs-field__label'>Take profit</span>
                            <div className='accumilatoirs-inline-input'>
                                <input className='accumilatoirs-field__control' placeholder='-' />
                                <span className='accumilatoirs-inline-input__suffix'>{currency}</span>
                            </div>
                        </label>
                        <label className='accumilatoirs-field'>
                            <span className='accumilatoirs-field__label'>Stop loss</span>
                            <div className='accumilatoirs-inline-input'>
                                <input className='accumilatoirs-field__control' placeholder='-' />
                                <span className='accumilatoirs-inline-input__suffix'>{currency}</span>
                            </div>
                        </label>
                    </div>
                    <DirectionToggle options={['Up', 'Down']} />
                </>
            );
        case 'turbos':
            return (
                <>
                    <label className='accumilatoirs-field'>
                        <span className='accumilatoirs-field__label'>Stake</span>
                        <div className='accumilatoirs-inline-input'>
                            <input className='accumilatoirs-field__control' defaultValue='10' inputMode='decimal' />
                            <span className='accumilatoirs-inline-input__suffix'>{currency}</span>
                        </div>
                    </label>
                    <label className='accumilatoirs-field'>
                        <span className='accumilatoirs-field__label'>Payout per point</span>
                        <div className='accumilatoirs-inline-input'>
                            <input className='accumilatoirs-field__control' defaultValue='1.00' inputMode='decimal' />
                            <span className='accumilatoirs-inline-input__suffix'>{currency}</span>
                        </div>
                    </label>
                    <DurationStakeFields currency={currency} />
                    <DirectionToggle options={['Up', 'Down']} />
                </>
            );
        case 'vanillas':
            return (
                <>
                    <label className='accumilatoirs-field'>
                        <span className='accumilatoirs-field__label'>Stake</span>
                        <div className='accumilatoirs-inline-input'>
                            <input className='accumilatoirs-field__control' defaultValue='10' inputMode='decimal' />
                            <span className='accumilatoirs-inline-input__suffix'>{currency}</span>
                        </div>
                    </label>
                    <label className='accumilatoirs-field'>
                        <span className='accumilatoirs-field__label'>Strike</span>
                        <select className='accumilatoirs-field__control' defaultValue='spot'>
                            <option value='spot'>At the money</option>
                            <option value='above'>Above spot</option>
                            <option value='below'>Below spot</option>
                        </select>
                    </label>
                    <DurationStakeFields currency={currency} />
                    <DirectionToggle options={['Call', 'Put']} />
                </>
            );
        default:
            return null;
    }
};

export function TradeTypePreview({ tradeType, currency }: TradeTypePreviewProps) {
    return (
        <>
            <div className='accumilatoirs-ticket-card__header'>
                <h2>Trade setup</h2>
                <span className='accumilatoirs-trade-type__preview-tag'>Preview</span>
            </div>

            <div className='accumilatoirs-ticket-card__section'>{renderCategoryFields(tradeType.id, currency)}</div>

            <div className='accumilatoirs-alert'>
                Live trading for <strong>{tradeType.label}</strong> isn&apos;t wired up in derivity yet — this is a
                preview of the ticket layout. Only Accumulators trades for real right now.
            </div>

            <button className='accumilatoirs-primary' disabled type='button'>
                Buy
            </button>
        </>
    );
}

export default TradeTypePreview;
