import React from 'react';
import { observer } from 'mobx-react-lite';
import { formatMoney, getCurrencyDisplayCode } from '@/components/shared';
import { useStore } from '@/hooks/useStore';
import { getDisplayMoney } from '@/utils/display-currency';

type TMoneyProps = {
    amount: number | string;
    className: string;
    currency: string;
    has_sign: boolean;
    should_format: boolean;
    show_currency: boolean; // if true, append currency symbol
};

const Money = ({
    amount = 0,
    className,
    currency = 'USD',
    has_sign,
    should_format = true,
    show_currency = false,
}: Partial<TMoneyProps>) => {
    const { client } = useStore();
    const { amount: displayAmount, currency: displayCurrency } = getDisplayMoney(
        amount,
        currency,
        client?.display_currency || 'USD',
        client?.usd_kes_rate
    );
    let sign = '';
    if (Number(displayAmount) && (Number(displayAmount) < 0 || has_sign)) {
        sign = Number(displayAmount) > 0 ? '+' : '-';
    }

    // if it's formatted already then don't make any changes unless we should remove extra -/+ signs
    const value = has_sign || should_format ? Math.abs(Number(displayAmount)) : displayAmount;
    const final_amount = should_format ? formatMoney(displayCurrency, value, true, 0, 0) : value;

    return (
        <React.Fragment>
            <span>{has_sign && sign}</span>
            <span data-testid='dt_span' className={className}>
                {final_amount} {show_currency && getCurrencyDisplayCode(displayCurrency)}
            </span>
        </React.Fragment>
    );
};

export default React.memo(observer(Money));
