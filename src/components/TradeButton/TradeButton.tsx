import React from 'react';
import classNames from 'classnames';
import './TradeButton.scss';

export interface TradeButtonProps {
    tradeType: string;
    label: string;
    selected: boolean;
    onClick: (tradeType: string) => void;
    disabled?: boolean;
    percentage?: number;
}

export const TradeButton: React.FC<TradeButtonProps> = ({
    tradeType,
    label,
    selected,
    onClick,
    disabled = false,
    percentage,
}) => {
    return (
        <button
            type='button'
            className={classNames('trade-button', {
                'trade-button--selected': selected,
                'trade-button--disabled': disabled,
            })}
            onClick={() => !disabled && onClick(tradeType)}
            disabled={disabled}
            aria-label={`${label} trade type`}
            aria-pressed={selected}
        >
            <span className='trade-button__label'>{label}</span>
            {percentage !== undefined && <span className='percentage-badge'>{percentage.toFixed(1)}%</span>}
        </button>
    );
};
