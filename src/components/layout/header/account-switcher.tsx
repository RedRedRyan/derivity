import { MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { CurrencyIcon } from '@/components/currency/currency-icon';
import { addComma, getDecimalPlaces } from '@/components/shared';
import Text from '@/components/shared_ui/text';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { isDemoAccount, shouldShowUsdAccountIcon } from '@/utils/account-helpers';
import {
    DISPLAY_CURRENCIES,
    formatDisplayBalanceValue,
    resolveDisplayCurrency,
    TDisplayCurrency,
} from '@/utils/display-currency';
import { Localize } from '@deriv-com/translations';
import { TAccountSwitcher } from './common/types';
import AccountInfoWrapper from './account-info-wrapper';
import './account-switcher.scss';

const CURRENCY_NAMES: Record<string, string> = {
    AUD: 'Australian Dollar',
    BTC: 'Bitcoin',
    ETH: 'Ether',
    EUR: 'Euro',
    GBP: 'Pound Sterling',
    LTC: 'Litecoin',
    USD: 'US Dollar',
    USDC: 'USD Coin',
    UST: 'Tether Omni',
    EUSDT: 'Tether ERC20',
    TUSDT: 'Tether TRC20',
};

const getCurrencyName = (currency?: string) => CURRENCY_NAMES[currency?.toUpperCase() ?? ''] ?? currency ?? 'Account';
const DEFAULT_DEMO_RESET = 10000;
const DEFAULT_GROUP_EXPANDED_STATE = { demo: true, real: true };

const AccountSwitcher = observer(({ activeAccount }: TAccountSwitcher) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
    const [activeDropdownTab, setActiveDropdownTab] = useState<'real' | 'demo'>('real');
    const [expandedGroups, setExpandedGroups] = useState(DEFAULT_GROUP_EXPANDED_STATE);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { accountList, activeLoginid } = useApiBase();
    const { client, run_panel } = useStore() ?? {};

    const [resetAmount, setResetAmount] = useState<string>('');
    const [resetMessage, setResetMessage] = useState<string>('');
    const [resetError, setResetError] = useState<string>('');

    const is_bot_running = run_panel?.is_running || api_base.is_running;
    const isSingleAccount = !accountList || accountList.length <= 1;

    useEffect(() => {
        const handleClickOutside = (e: PointerEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setIsCurrencyMenuOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                setIsCurrencyMenuOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        if (!activeAccount) return;

        setActiveDropdownTab(activeAccount.isVirtual ? 'demo' : 'real');
    }, [activeAccount?.isVirtual, activeAccount?.loginid]);

    const toggleDropdown = useCallback(() => {
        if (is_bot_running || isSingleAccount) return;
        setIsCurrencyMenuOpen(false);
        setExpandedGroups(DEFAULT_GROUP_EXPANDED_STATE);
        setIsOpen(prev => !prev);
    }, [is_bot_running, isSingleAccount]);

    const toggleCurrencyMenu = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setIsOpen(false);
        setIsCurrencyMenuOpen(prev => !prev);
    }, []);

    const handleDisplayCurrencySelect = useCallback(
        (currency_code: TDisplayCurrency) => {
            client?.setDisplayCurrency(resolveDisplayCurrency(currency_code));
            setIsCurrencyMenuOpen(false);
        },
        [client]
    );

    const handleAccountSelect = useCallback(
        (loginid: string) => {
            setIsOpen(false);
            localStorage.setItem('active_loginid', loginid);
            localStorage.setItem('account_type', isDemoAccount(loginid) ? 'demo' : 'real');

            const accountsListRaw = localStorage.getItem('accountsList');
            if (accountsListRaw) {
                try {
                    const accountsList = JSON.parse(accountsListRaw) as Record<string, string>;
                    if (accountsList[loginid]) localStorage.setItem('authToken', accountsList[loginid]);
                } catch (error) {
                    console.error('[AccountSwitcher] Failed to update legacy auth token:', error);
                }
            }

            client?.checkAndRegenerateWebSocket();
        },
        [client]
    );

    const formattedAccounts = useMemo(() => {
        if (!accountList) return [];
        return accountList
            .map(account => ({
                loginid: account.loginid,
                currency: account.currency,
                balance: addComma(Number(account.balance ?? 0).toFixed(getDecimalPlaces(account.currency))),
                isVirtual: isDemoAccount(account.loginid),
                isActive: account.loginid === activeLoginid,
            }))
            .sort((a, b) => (a.isActive ? -1 : b.isActive ? 1 : 0));
    }, [accountList, activeLoginid]);

    const currency = activeAccount?.currency;
    const isVirtual = activeAccount?.isVirtual ?? false;
    const balance = activeAccount?.balance;
    const loginid = activeAccount?.loginid;
    const showChevron = !isSingleAccount && !is_bot_running;
    const realAccounts = formattedAccounts.filter(account => !account.isVirtual);
    const demoAccounts = formattedAccounts.filter(account => account.isVirtual);
    const selectedDisplayCurrency = resolveDisplayCurrency(client?.display_currency, 'USD');
    const headerBalance = formatDisplayBalanceValue(
        balance ?? 0,
        currency || 'USD',
        selectedDisplayCurrency,
        client?.usd_kes_rate
    );

    const handleTabSelect = useCallback((tab: 'real' | 'demo') => {
        setActiveDropdownTab(tab);
    }, []);

    const handleGroupToggle = useCallback((group: 'real' | 'demo') => {
        setExpandedGroups(prev => ({
            ...prev,
            [group]: !prev[group],
        }));
    }, []);

    const getDefaultResetAmountForLogin = () => DEFAULT_DEMO_RESET;

    const handleResetSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            setResetMessage('');
            setResetError('');

            const currentActiveLogin = activeLoginid || loginid || '';

            // Only allow reset when a demo account is active
            if (!isDemoAccount(currentActiveLogin)) {
                setResetError('Switch to a demo account to set its starting balance.');
                return;
            }

            // Determine amount to reset to
            let amount = parseFloat(resetAmount);
            if (!Number.isFinite(amount) || amount <= 0) {
                amount = getDefaultResetAmountForLogin();
            }

            const accountCurrency =
                demoAccounts.find(a => a.loginid === currentActiveLogin)?.currency ||
                client?.getAccountCurrency?.(currentActiveLogin) ||
                'USD';

            try {
                const getResetSuccessMessage = (resetResult: unknown) => {
                    const resultData =
                        resetResult && typeof resetResult === 'object'
                            ? (resetResult as { balance?: number; currency?: string; success?: boolean })
                            : null;
                    const resetBalance = Number(resultData?.balance ?? amount);
                    const resetCurrency = resultData?.currency || accountCurrency;

                    return `Demo balance reset to ${Number(resetBalance).toFixed(2)} ${resetCurrency}`;
                };

                const result = client?.resetDemoBalance?.(currentActiveLogin, amount, accountCurrency);
                // resetDemoBalance may return boolean or promise; handle both
                if (result && typeof (result as Promise<boolean>).then === 'function') {
                    (result as Promise<unknown>)
                        .then(success => {
                            if (success) {
                                setResetMessage(getResetSuccessMessage(success));
                                setResetAmount('');
                            } else {
                                setResetError('Failed to reset demo balance.');
                            }
                        })
                        .catch(err => {
                            console.error('Demo reset failed', err);
                            setResetError('Failed to reset demo balance.');
                        });
                } else if (result) {
                    setResetMessage(getResetSuccessMessage(result));
                    setResetAmount('');
                } else {
                    setResetError('Failed to reset demo balance.');
                }
            } catch (err) {
                console.error('Demo reset failed', err);
                setResetError('Failed to reset demo balance.');
            }
        },
        [resetAmount, activeLoginid, loginid, client, demoAccounts]
    );

    if (!activeAccount) return null;

    return (
        <div className='acc-info__wrapper' ref={wrapperRef}>
            <AccountInfoWrapper>
                <div className='acc-info__currency-switcher'>
                    <button
                        className='acc-info__currency-button'
                        type='button'
                        onClick={toggleCurrencyMenu}
                        aria-expanded={isCurrencyMenuOpen}
                        aria-haspopup='listbox'
                    >
                        {selectedDisplayCurrency}
                        <svg width='10' height='10' viewBox='0 0 10 10' fill='none' aria-hidden='true'>
                            <path
                                d='M2 3.5L5 6.5L8 3.5'
                                stroke='currentColor'
                                strokeWidth='1.5'
                                strokeLinecap='round'
                            />
                        </svg>
                    </button>
                    {isCurrencyMenuOpen && (
                        <div className='acc-info__currency-menu' role='listbox'>
                            {DISPLAY_CURRENCIES.map(option => (
                                <button
                                    key={option}
                                    type='button'
                                    className={classNames('acc-info__currency-option', {
                                        'acc-info__currency-option--active': option === selectedDisplayCurrency,
                                    })}
                                    onClick={() => handleDisplayCurrencySelect(option)}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div
                    data-testid='dt_acc_info'
                    id='dt_core_account-info_acc-info'
                    role={showChevron ? 'button' : undefined}
                    tabIndex={showChevron ? 0 : -1}
                    aria-expanded={showChevron ? isOpen : undefined}
                    aria-haspopup={showChevron ? 'listbox' : undefined}
                    className={classNames('acc-info', {
                        'acc-info--is-virtual': isVirtual,
                        'acc-info--interactive': showChevron,
                    })}
                    onClick={toggleDropdown}
                    onKeyDown={e => {
                        if (showChevron && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            toggleDropdown();
                        }
                    }}
                >
                    <span className='acc-info__id' aria-hidden='true'>
                        <CurrencyIcon
                            currency={loginid && shouldShowUsdAccountIcon(loginid) ? 'usd' : undefined}
                            isVirtual={!loginid || !shouldShowUsdAccountIcon(loginid)}
                        />
                    </span>
                    <div className='acc-info__content'>
                        {(typeof balance !== 'undefined' || !currency) && (
                            <div className='acc-info__balance-section'>
                                <p
                                    data-testid='dt_balance'
                                    className={classNames('acc-info__balance', {
                                        'acc-info__balance--no-currency': !currency && !isVirtual,
                                    })}
                                >
                                    {!currency ? <Localize i18n_default_text='No currency assigned' /> : headerBalance}
                                </p>
                            </div>
                        )}
                    </div>
                    {showChevron && (
                        <span
                            className={classNames('acc-info__select-arrow', {
                                'acc-info__select-arrow--invert': isOpen,
                            })}
                        >
                            <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
                                <path
                                    d='M3 5L7 9L11 5'
                                    stroke='currentColor'
                                    strokeWidth='1.8'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                />
                            </svg>
                        </span>
                    )}
                </div>
            </AccountInfoWrapper>
            {isOpen && (
                <div className='acc-dropdown' role='listbox'>
                    <div className='acc-dropdown__tabs' role='tablist'>
                        <button
                            type='button'
                            role='tab'
                            aria-selected={activeDropdownTab === 'real'}
                            className={classNames('acc-dropdown__tab', {
                                'acc-dropdown__tab--active': activeDropdownTab === 'real',
                            })}
                            onClick={() => handleTabSelect('real')}
                        >
                            Real
                        </button>
                        <button
                            type='button'
                            role='tab'
                            aria-selected={activeDropdownTab === 'demo'}
                            className={classNames('acc-dropdown__tab', {
                                'acc-dropdown__tab--active': activeDropdownTab === 'demo',
                            })}
                            onClick={() => handleTabSelect('demo')}
                        >
                            Demo
                        </button>
                    </div>
                    {activeDropdownTab === 'real' && realAccounts.length > 0 && (
                        <div className='acc-dropdown__group'>
                            <button
                                type='button'
                                className='acc-dropdown__group-title'
                                aria-expanded={expandedGroups.real}
                                onClick={() => handleGroupToggle('real')}
                            >
                                <span>Deriv accounts</span>
                                <span
                                    className={classNames('acc-dropdown__group-chevron', {
                                        'acc-dropdown__group-chevron--collapsed': !expandedGroups.real,
                                    })}
                                    aria-hidden='true'
                                >
                                    ^
                                </span>
                            </button>
                            {expandedGroups.real &&
                                realAccounts.map(account => (
                                    <div
                                        key={account.loginid}
                                        role='option'
                                        aria-selected={account.isActive}
                                        tabIndex={0}
                                        className={classNames('acc-dropdown__account', {
                                            'acc-dropdown__account--selected': account.isActive,
                                        })}
                                        onClick={() => handleAccountSelect(account.loginid)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleAccountSelect(account.loginid);
                                            }
                                        }}
                                    >
                                        <span className='acc-dropdown__account-icon'>
                                            <CurrencyIcon currency='usd' />
                                        </span>
                                        <span className='acc-dropdown__account-info'>
                                            <Text as='span' size='xs' weight='bold' className='acc-dropdown__currency'>
                                                {getCurrencyName(account.currency)}
                                            </Text>
                                            <Text as='span' size='xxxs' className='acc-dropdown__loginid'>
                                                {account.loginid}
                                            </Text>
                                        </span>
                                        <Text as='span' size='xs' weight='bold' className='acc-dropdown__balance'>
                                            {account.currency ? (
                                                formatDisplayBalanceValue(
                                                    account.balance,
                                                    account.currency,
                                                    selectedDisplayCurrency,
                                                    client?.usd_kes_rate
                                                )
                                            ) : (
                                                <Localize i18n_default_text='No currency assigned' />
                                            )}
                                        </Text>
                                    </div>
                                ))}
                        </div>
                    )}
                    {activeDropdownTab === 'demo' && demoAccounts.length > 0 && (
                        <div className='acc-dropdown__group'>
                            <button
                                type='button'
                                className='acc-dropdown__group-title'
                                aria-expanded={expandedGroups.demo}
                                onClick={() => handleGroupToggle('demo')}
                            >
                                <span>Demo accounts</span>
                                <span
                                    className={classNames('acc-dropdown__group-chevron', {
                                        'acc-dropdown__group-chevron--collapsed': !expandedGroups.demo,
                                    })}
                                    aria-hidden='true'
                                >
                                    ^
                                </span>
                            </button>
                            {expandedGroups.demo &&
                                demoAccounts.map(account => (
                                    <div
                                        key={account.loginid}
                                        role='option'
                                        aria-selected={account.isActive}
                                        tabIndex={0}
                                        className={classNames('acc-dropdown__account', {
                                            'acc-dropdown__account--selected': account.isActive,
                                        })}
                                        onClick={() => handleAccountSelect(account.loginid)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleAccountSelect(account.loginid);
                                            }
                                        }}
                                    >
                                        <span className='acc-dropdown__account-icon'>
                                            <CurrencyIcon
                                                currency={shouldShowUsdAccountIcon(account.loginid) ? 'usd' : undefined}
                                                isVirtual={!shouldShowUsdAccountIcon(account.loginid)}
                                            />
                                        </span>
                                        <span className='acc-dropdown__account-info'>
                                            <Text as='span' size='xs' weight='bold' className='acc-dropdown__currency'>
                                                Demo
                                            </Text>
                                            <Text as='span' size='xxxs' className='acc-dropdown__loginid'>
                                                {account.loginid}
                                            </Text>
                                        </span>
                                        <Text as='span' size='xs' weight='bold' className='acc-dropdown__balance'>
                                            {formatDisplayBalanceValue(
                                                account.balance,
                                                account.currency,
                                                selectedDisplayCurrency,
                                                client?.usd_kes_rate
                                            )}
                                        </Text>
                                    </div>
                                ))}
                        </div>
                    )}
                    {activeDropdownTab === 'real' && realAccounts.length === 0 && (
                        <div className='acc-dropdown__empty'>No real accounts available.</div>
                    )}
                    {activeDropdownTab === 'demo' && demoAccounts.length === 0 && (
                        <div className='acc-dropdown__empty'>No demo accounts available.</div>
                    )}

                    {/* Demo reset section */}
                    {activeDropdownTab === 'demo' && (
                        <div className='acc-dropdown__reset'>
                            <div className='acc-dropdown__reset-title'>Reset demo balance</div>
                            <p className='acc-dropdown__reset-copy'>
                                Set a starting balance for your active demo account.
                            </p>

                            <form onSubmit={handleResetSubmit}>
                                <div className='acc-dropdown__reset-input-row'>
                                    <label htmlFor='demo-balance-amount' className='sr-only'>
                                        Demo balance amount
                                    </label>
                                    <input
                                        id='demo-balance-amount'
                                        aria-label='Demo balance amount'
                                        className='acc-dropdown__reset-input'
                                        type='number'
                                        min='0'
                                        step='0.01'
                                        value={resetAmount}
                                        onChange={e => setResetAmount(e.target.value)}
                                    />
                                    <button type='submit' className='acc-dropdown__reset-button'>
                                        Reset Demo Account Balance
                                    </button>
                                </div>
                            </form>

                            {resetError && <p className='acc-dropdown__reset-error'>{resetError}</p>}
                            {resetMessage && <p className='acc-dropdown__reset-success'>{resetMessage}</p>}

                            <p className='acc-dropdown__reset-hint'>
                                Default: {getDefaultResetAmountForLogin()}{' '}
                                {client?.getAccountCurrency?.(activeLoginid || loginid) || 'USD'}
                            </p>
                        </div>
                    )}

                    <div className='acc-dropdown__traders-hub'>Looking for CFD accounts? Go to Trader&apos;s Hub</div>
                    <div className='acc-dropdown__footer'>
                        <button className='acc-dropdown__manage' type='button'>
                            Manage accounts
                        </button>
                        <button className='acc-dropdown__logout' type='button' onClick={() => client?.logout()}>
                            Logout
                            <svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
                                <path
                                    d='M6 3H3.5A1.5 1.5 0 0 0 2 4.5v7A1.5 1.5 0 0 0 3.5 13H6M10 5l3 3-3 3M13 8H5'
                                    stroke='currentColor'
                                    strokeWidth='1.4'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default AccountSwitcher;
