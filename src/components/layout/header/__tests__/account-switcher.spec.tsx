import { fireEvent, render, screen } from '@testing-library/react';
import AccountSwitcher from '../account-switcher';

const mockCheckAndRegenerateWebSocket = jest.fn();
const mockResetDemoBalance = jest.fn(() => true);
const mockLogout = jest.fn();
const mockSetDisplayCurrency = jest.fn();
const mockGetDemoBalanceOverride = jest.fn();

const mockAccountList = [
    { loginid: 'CR123', currency: 'USD', balance: 100, is_virtual: 0 },
    { loginid: 'VRTC456', currency: 'USD', balance: 9992.15, is_virtual: 1 },
];

jest.mock('@/hooks/useApiBase', () => ({
    useApiBase: jest.fn(() => ({
        accountList: mockAccountList,
        activeLoginid: 'CR123',
    })),
}));

jest.mock('@/hooks/useStore', () => ({
    useStore: jest.fn(() => ({
        client: {
            checkAndRegenerateWebSocket: mockCheckAndRegenerateWebSocket,
            resetDemoBalance: mockResetDemoBalance,
            getDemoBalanceOverride: mockGetDemoBalanceOverride,
            logout: mockLogout,
            setDisplayCurrency: mockSetDisplayCurrency,
            display_currency: 'USD',
            usd_kes_rate: 129.33,
        },
        run_panel: { is_running: false },
    })),
}));

jest.mock('@/hooks/useLogout', () => ({
    useLogout: jest.fn(() => jest.fn()),
}));

jest.mock('@/external/bot-skeleton/services/api/api-base', () => ({
    api_base: { is_running: false },
}));

jest.mock('@deriv-com/translations', () => ({
    Localize: ({ i18n_default_text }: { i18n_default_text: string }) => <span>{i18n_default_text}</span>,
}));

jest.mock('@deriv-com/ui', () => ({
    useDevice: jest.fn(() => ({ isDesktop: false })),
}));

jest.mock('@/components/shared', () => ({
    addComma: (val: string) => val,
    getDecimalPlaces: () => 2,
}));

jest.mock('@/utils/account-helpers', () => ({
    isDemoAccount: (loginid: string) => loginid.startsWith('VR') || loginid.startsWith('DOT'),
    shouldShowUsdAccountIcon: (loginid: string) => loginid.startsWith('CR') || loginid === 'DOT91317422',
}));

jest.mock('@/utils/display-currency', () => ({
    DISPLAY_CURRENCIES: ['USD', 'KES'],
    formatDisplayBalanceValue: (balance: string | number, currency: string, displayCurrency?: string) =>
        `${balance} ${displayCurrency || currency}`,
    resolveDisplayCurrency: (currency?: string, fallback = 'USD') => currency || fallback,
}));

jest.mock('@/components/shared_ui/text', () => ({
    __esModule: true,
    default: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <span className={className}>{children}</span>
    ),
}));

jest.mock('../account-info-wrapper', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockRealActiveAccount = {
    loginid: 'CR123',
    currency: 'USD',
    balance: '100.00',
    isVirtual: false,
    isActive: true,
    currencyLabel: 'USD',
    icon: null,
};

const mockDemoActiveAccount = {
    loginid: 'VRTC456',
    currency: 'USD',
    balance: '9992.15',
    isVirtual: true,
    isActive: true,
    currencyLabel: 'Demo',
    icon: null,
};

describe('AccountSwitcher', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        const { useApiBase } = require('@/hooks/useApiBase');
        useApiBase.mockReturnValue({ accountList: mockAccountList, activeLoginid: 'CR123' });
        const { useStore } = require('@/hooks/useStore');
        useStore.mockReturnValue({
            client: {
                checkAndRegenerateWebSocket: mockCheckAndRegenerateWebSocket,
                resetDemoBalance: mockResetDemoBalance,
                getDemoBalanceOverride: mockGetDemoBalanceOverride,
                logout: mockLogout,
                setDisplayCurrency: mockSetDisplayCurrency,
                display_currency: 'USD',
                usd_kes_rate: 129.33,
            },
            run_panel: { is_running: false },
        });
        require('@/external/bot-skeleton/services/api/api-base').api_base.is_running = false;
    });

    it('returns null when activeAccount is not provided', () => {
        const { container } = render(<AccountSwitcher activeAccount={undefined} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders active account balance in the header', () => {
        render(<AccountSwitcher activeAccount={mockRealActiveAccount} />);
        expect(screen.getByText('USD', { selector: 'button.acc-info__currency-button' })).toBeInTheDocument();
        expect(screen.getByTestId('dt_balance')).toHaveTextContent('100.00 USD');
    });

    it('renders the currency switcher on desktop too', () => {
        const { useDevice } = require('@deriv-com/ui');
        useDevice.mockReturnValue({ isDesktop: true });

        render(<AccountSwitcher activeAccount={mockRealActiveAccount} />);

        expect(screen.getByText('USD', { selector: 'button.acc-info__currency-button' })).toBeInTheDocument();
    });

    it('opens dropdown on click when multiple accounts exist', () => {
        render(<AccountSwitcher activeAccount={mockRealActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('does not open dropdown when bot is running', () => {
        const { useStore } = require('@/hooks/useStore');
        useStore.mockReturnValue({
            client: {
                checkAndRegenerateWebSocket: mockCheckAndRegenerateWebSocket,
            },
            run_panel: { is_running: true },
        });

        render(<AccountSwitcher activeAccount={mockRealActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('shows real accounts only on the real tab', () => {
        render(<AccountSwitcher activeAccount={mockRealActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        expect(screen.getByText('US Dollar')).toBeInTheDocument();
        expect(screen.queryByText('Demo', { selector: '.acc-dropdown__currency' })).not.toBeInTheDocument();
    });

    it('shows demo accounts only on the demo tab', () => {
        render(<AccountSwitcher activeAccount={mockRealActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        fireEvent.click(screen.getByRole('tab', { name: 'Demo' }));
        expect(screen.getByText('Demo', { selector: '.acc-dropdown__currency' })).toBeInTheDocument();
        expect(screen.queryByText('US Dollar')).not.toBeInTheDocument();
    });

    it('displays dot demo loginids unchanged', () => {
        const { useApiBase } = require('@/hooks/useApiBase');
        useApiBase.mockReturnValue({
            accountList: [...mockAccountList, { loginid: 'DOT91317422', currency: 'USD', balance: 700, is_virtual: 1 }],
            activeLoginid: 'CR123',
        });

        render(<AccountSwitcher activeAccount={mockRealActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        fireEvent.click(screen.getByRole('tab', { name: 'Demo' }));

        expect(screen.getByText('DOT91317422')).toBeInTheDocument();
    });

    it('switches account from the demo tab and regenerates the websocket', () => {
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

        render(<AccountSwitcher activeAccount={mockRealActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        fireEvent.click(screen.getByRole('tab', { name: 'Demo' }));
        fireEvent.click(screen.getByRole('option', { name: /Demo\s+VRTC456/i }));

        expect(setItemSpy).toHaveBeenCalledWith('active_loginid', 'VRTC456');
        expect(setItemSpy).toHaveBeenCalledWith('account_type', 'demo');
        expect(mockCheckAndRegenerateWebSocket).toHaveBeenCalledTimes(1);

        setItemSpy.mockRestore();
    });

    it('resets the active demo balance from the demo tab', () => {
        const { useApiBase } = require('@/hooks/useApiBase');
        useApiBase.mockReturnValue({ accountList: mockAccountList, activeLoginid: 'VRTC456' });

        render(<AccountSwitcher activeAccount={mockDemoActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        fireEvent.change(screen.getByLabelText('Demo balance amount'), { target: { value: '2500' } });
        fireEvent.submit(screen.getByText('Reset Demo Account Balance').closest('form') as HTMLFormElement);

        expect(mockResetDemoBalance).toHaveBeenCalledWith('VRTC456', 2500, 'USD');
        expect(screen.getByText('Demo balance reset to 2500.00 USD')).toBeInTheDocument();
    });

    it('shows a helper message when trying to reset while a real account is active', () => {
        render(<AccountSwitcher activeAccount={mockRealActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        fireEvent.click(screen.getByRole('tab', { name: 'Demo' }));
        fireEvent.change(screen.getByLabelText('Demo balance amount'), { target: { value: '1200' } });
        fireEvent.submit(screen.getByText('Reset Demo Account Balance').closest('form') as HTMLFormElement);

        expect(mockResetDemoBalance).not.toHaveBeenCalled();
        expect(screen.getByText('Switch to a demo account to set its starting balance.')).toBeInTheDocument();
    });

    it('closes dropdown on outside click', () => {
        render(<AccountSwitcher activeAccount={mockRealActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        expect(screen.getByRole('listbox')).toBeInTheDocument();
        fireEvent.pointerDown(document.body);
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('collapses and expands the active account group responsively', () => {
        render(<AccountSwitcher activeAccount={mockRealActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));

        const groupToggle = screen.getByRole('button', { name: 'Deriv accounts' });
        expect(screen.getByText('US Dollar')).toBeInTheDocument();

        fireEvent.click(groupToggle);
        expect(screen.queryByText('US Dollar')).not.toBeInTheDocument();

        fireEvent.click(groupToggle);
        expect(screen.getByText('US Dollar')).toBeInTheDocument();
    });

    it('trigger has the correct aria attributes', () => {
        render(<AccountSwitcher activeAccount={mockRealActiveAccount} />);
        const trigger = screen.getByTestId('dt_acc_info');

        expect(trigger).toHaveAttribute('role', 'button');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');

        fireEvent.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
});
