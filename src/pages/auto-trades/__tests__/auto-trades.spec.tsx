import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import { buyContractForUi, streamContractUntilSettled } from '@/utils/trade-purchase';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutoTrades from '../auto-trades';

jest.mock('@/hooks/useStore', () => ({
    useStore: jest.fn(),
}));

jest.mock('@/components/shared_ui/themed-scrollbars', () => ({
    __esModule: true,
    default: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock('@/components/shared_ui/input', () => ({
    __esModule: true,
    default: (props: any) => <input {...props} />,
}));

const mockEmit = jest.fn();
const mockRegister = jest.fn();
const mockUnregister = jest.fn();
const mockUnsubscribe = jest.fn();
const mockApiSend = jest.fn();
const tickSubscribers: Record<string, (data: any) => void> = {};
const candleSubscribers: Record<string, (data: any) => void> = {};
const mockApiSubscribe = jest.fn((request: any) => ({
    subscribe: (callback: (data: any) => void) => {
        if (request?.ticks) tickSubscribers[request.ticks] = callback;
        if (request?.ticks_history) candleSubscribers[request.ticks_history] = callback;
        return { unsubscribe: mockUnsubscribe };
    },
}));

jest.mock('@/external/bot-skeleton', () => ({
    api_base: {
        is_authorized: true,
        account_info: { loginid: 'CR12345' },
        api: {
            subscribe: (...args: unknown[]) => mockApiSubscribe(...args),
            send: (...args: unknown[]) => mockApiSend(...args),
        },
    },
    observer: {
        emit: (...args: unknown[]) => mockEmit(...args),
        register: (...args: unknown[]) => mockRegister(...args),
        unregister: (...args: unknown[]) => mockUnregister(...args),
    },
}));

jest.mock('@/utils/trade-purchase', () => ({
    buyContractForUi: jest.fn(),
    streamContractUntilSettled: jest.fn(() => Promise.resolve({ profit: 0, is_sold: true })),
}));

jest.mock('@/stores/condition-notifier-store', () => ({
    conditionNotifierStore: { setCondition: jest.fn() },
}));

const mockUseStore = useStore as jest.Mock;

const createMockStore = () => ({
    dashboard: {
        active_tab: DBOT_TABS.AUTO_TRADES,
        setActiveTradingModule: jest.fn(),
        registerTradingStopHandler: jest.fn(),
        unregisterTradingStopHandler: jest.fn(),
    },
    client: { currency: 'USD', is_logged_in: true },
    summary_card: { onBotContractEvent: jest.fn() },
    transactions: { pushTransaction: jest.fn() },
    run_panel: {
        run_id: 'run-1',
        is_running: false,
        setIsRunning: jest.fn(),
        setRunId: jest.fn(),
        setHasOpenContract: jest.fn(),
        setContractStage: jest.fn(),
        setShowBotStopMessage: jest.fn(),
        toggleDrawer: jest.fn(),
        registerBotListeners: jest.fn(),
        unregisterBotListeners: jest.fn(),
        onMount: jest.fn(),
        onUnmount: jest.fn(),
        onBotRunningEvent: jest.fn(),
        onContractStatusEvent: jest.fn(),
        onError: jest.fn(),
        onBotContractEvent: jest.fn(),
        SetpurchaseInProgress: jest.fn(),
    },
});

describe('<AutoTrades />', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (streamContractUntilSettled as jest.Mock).mockResolvedValue({ profit: 0, is_sold: true });
        Object.keys(tickSubscribers).forEach(symbol => delete tickSubscribers[symbol]);
        Object.keys(candleSubscribers).forEach(symbol => delete candleSubscribers[symbol]);
        localStorage.clear();
        mockApiSend.mockResolvedValue({
            history: {
                prices: Array.from({ length: 1000 }, (_, index) => 100 + index / 100),
                times: Array.from({ length: 1000 }, (_, index) => 1700000000 + index),
            },
        });
        mockUseStore.mockReturnValue(createMockStore());
    });

    it('allows clearing and reselecting markets', async () => {
        const user = userEvent.setup();

        render(<AutoTrades />);

        expect(screen.getByText('13/13 selected')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Clear' }));

        await waitFor(() => {
            expect(screen.getByText('0/13 selected')).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: /Run Auto Trades/i })).toBeDisabled();
        expect(screen.getByText(/Select at least one market to show live quotes/i)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Select all' }));

        await waitFor(() => {
            expect(screen.getByText('13/13 selected')).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: /Run Auto Trades/i })).not.toBeDisabled();
    });

    it('shows analysis ticks control for all trade types', async () => {
        const user = userEvent.setup();

        render(<AutoTrades />);

        const tradeTypeSelect = screen.getAllByRole('combobox')[0];
        await user.selectOptions(tradeTypeSelect, 'RUNHIGH');

        await waitFor(() => {
            expect(screen.getByText(/Only Ups \(1 ticks\)/i)).toBeInTheDocument();
            expect(screen.getByText(/falling ticks \+ bullish 5m candle/i)).toBeInTheDocument();
        });

        const analysisTickSelect = screen.getAllByRole('combobox')[1];
        await user.selectOptions(analysisTickSelect, '3');

        expect(screen.getByText(/Only Ups \(3 ticks\)/i)).toBeInTheDocument();

        await user.selectOptions(tradeTypeSelect, 'RUNLOW');

        await waitFor(() => {
            expect(screen.getByText(/Only Downs \(3 ticks\)/i)).toBeInTheDocument();
            expect(screen.getByText(/rising ticks \+ bearish 5m candle/i)).toBeInTheDocument();
        });
    });

    it('fully clears the shared run panel state when Auto Trades is stopped', async () => {
        const user = userEvent.setup();
        const store = createMockStore();
        mockUseStore.mockReturnValue(store);

        render(<AutoTrades />);

        await user.click(screen.getByRole('button', { name: /Run Auto Trades/i }));
        await user.click(screen.getByRole('button', { name: /Stop/i }));

        expect(store.run_panel.setIsRunning).toHaveBeenLastCalledWith(false);
        expect(store.run_panel.setHasOpenContract).toHaveBeenLastCalledWith(false);
        expect(store.run_panel.setContractStage).toHaveBeenLastCalledWith(0);
        expect(store.run_panel.setShowBotStopMessage).toHaveBeenLastCalledWith(false);
    });

    it('auto-loads the latest 1000 ticks for percentage mode on initialization', async () => {
        localStorage.setItem('auto_trades_strategyMode', 'PERCENTAGE');

        render(<AutoTrades />);

        await waitFor(() => {
            expect(mockApiSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    ticks_history: '1HZ10V',
                    end: 'latest',
                    count: 1000,
                    style: 'ticks',
                })
            );
        });

        await waitFor(() => {
            expect(screen.getAllByText('109.99').length).toBeGreaterThan(0);
            expect(screen.getAllByText(/Signal needs/i).length).toBeGreaterThan(0);
            expect(screen.getAllByText(/Window 1000\/1000 ticks/i).length).toBeGreaterThan(0);
        });
    });

    it('keeps removed markets removed when older live tick callbacks fire', async () => {
        const user = userEvent.setup();

        render(<AutoTrades />);

        await waitFor(() => {
            expect(tickSubscribers['1HZ15V']).toBeDefined();
        });

        await user.click(screen.getAllByTitle(/Remove from Auto Trades/i)[0]);

        await waitFor(() => {
            expect(screen.getByText('12/13 selected')).toBeInTheDocument();
            expect(screen.getAllByTitle(/Remove from Auto Trades/i)).toHaveLength(12);
        });

        act(() => {
            tickSubscribers['1HZ15V']({ tick: { quote: 123.45 } });
        });

        expect(screen.getByText('12/13 selected')).toBeInTheDocument();
        expect(screen.getAllByTitle(/Remove from Auto Trades/i)).toHaveLength(12);
    });

    it('allows editing the custom martingale loss threshold without forcing a mid-typing reset', async () => {
        const user = userEvent.setup();

        render(<AutoTrades />);

        const martingaleModeSelect = screen
            .getByText('Martingale Strategy')
            .parentElement?.querySelector('select') as HTMLSelectElement;

        expect(martingaleModeSelect).toBeTruthy();

        await user.selectOptions(martingaleModeSelect, 'custom_consecutive_loss_trigger');

        const thresholdInput = screen
            .getByText('Consecutive losses before martingale')
            .parentElement?.querySelector('input') as HTMLInputElement;

        expect(thresholdInput).toBeTruthy();
        expect(thresholdInput.value).toBe('2');

        await user.clear(thresholdInput);
        expect(thresholdInput.value).toBe('');

        await user.type(thresholdInput, '10');
        expect(thresholdInput.value).toBe('10');

        await user.tab();

        expect(screen.getByText(/Martingale engages after 10 consecutive losses/i)).toBeInTheDocument();
    });

    it('requires bullish 5m candle and falling streak before Only Ups execution', async () => {
        const user = userEvent.setup();
        const store = createMockStore();
        store.run_panel.is_running = true;
        mockUseStore.mockReturnValue(store);
        (buyContractForUi as jest.Mock).mockResolvedValue({
            contract_id: 1,
            buy_price: 1,
            transaction_id: 10,
        });

        render(<AutoTrades />);

        await user.selectOptions(screen.getAllByRole('combobox')[0], 'RUNHIGH');
        await user.click(screen.getByRole('button', { name: /Run Auto Trades/i }));

        await waitFor(() => {
            expect(tickSubscribers['1HZ10V']).toBeDefined();
            expect(candleSubscribers['1HZ10V']).toBeDefined();
        });

        act(() => {
            candleSubscribers['1HZ10V']({ ohlc: { open: 100, close: 99 } });
            [105, 104, 103, 102, 101].forEach(quote => tickSubscribers['1HZ10V']({ tick: { quote } }));
        });

        expect(buyContractForUi).not.toHaveBeenCalled();

        act(() => {
            candleSubscribers['1HZ10V']({ ohlc: { open: 100, close: 101 } });
        });

        await waitFor(() => {
            expect(buyContractForUi).toHaveBeenCalledWith(
                expect.objectContaining({
                    parameters: expect.objectContaining({ contract_type: 'RUNHIGH', duration: 1 }),
                })
            );
        });
    });

    it('uses the previous global contract result when selecting Over/Under predictions', async () => {
        const user = userEvent.setup();
        const store = createMockStore();
        mockUseStore.mockReturnValue(store);
        (buyContractForUi as jest.Mock).mockResolvedValue({
            contract_id: 1,
            buy_price: 1,
            transaction_id: 10,
        });
        (streamContractUntilSettled as jest.Mock).mockResolvedValue({ profit: -1, is_sold: true });

        render(<AutoTrades />);

        await user.click(screen.getByRole('button', { name: /Run Auto Trades/i }));

        await waitFor(() => {
            expect(tickSubscribers['1HZ10V']).toBeDefined();
            expect(tickSubscribers['1HZ15V']).toBeDefined();
        });

        act(() => {
            [100.04, 100.14, 100.24, 100.34].forEach(quote => tickSubscribers['1HZ10V']({ tick: { quote } }));
        });

        await waitFor(() => {
            expect(buyContractForUi).toHaveBeenCalledTimes(1);
        });
        expect(buyContractForUi).toHaveBeenLastCalledWith(
            expect.objectContaining({
                parameters: expect.objectContaining({ barrier: '4', symbol: '1HZ10V' }),
            })
        );

        await waitFor(() => {
            expect(screen.getByText(/1 trade/i)).toBeInTheDocument();
        });

        act(() => {
            [100.005, 100.015, 100.025, 100.035].forEach(quote => tickSubscribers['1HZ15V']({ tick: { quote } }));
        });

        await waitFor(() => {
            expect(buyContractForUi).toHaveBeenCalledTimes(2);
        });
        expect(buyContractForUi).toHaveBeenLastCalledWith(
            expect.objectContaining({
                parameters: expect.objectContaining({ barrier: '5', symbol: '1HZ15V' }),
            })
        );
    });

    it('keeps digit 0 as the Differs barrier when purchasing', async () => {
        const user = userEvent.setup();
        const store = createMockStore();
        mockUseStore.mockReturnValue(store);
        localStorage.setItem('auto_trades_tradeType', 'DIGITDIFF');
        localStorage.setItem('auto_trades_barrier', '0');
        localStorage.setItem('auto_trades_streak', '1');
        (buyContractForUi as jest.Mock).mockResolvedValue({
            contract_id: 1,
            buy_price: 1,
            transaction_id: 10,
        });

        render(<AutoTrades />);

        await user.click(screen.getByRole('button', { name: /Run Auto Trades/i }));

        await waitFor(() => {
            expect(tickSubscribers['1HZ10V']).toBeDefined();
        });

        act(() => {
            tickSubscribers['1HZ10V']({ tick: { quote: 100.0 } });
        });

        await waitFor(() => {
            expect(buyContractForUi).toHaveBeenCalledTimes(1);
        });
        expect(buyContractForUi).toHaveBeenLastCalledWith(
            expect.objectContaining({
                parameters: expect.objectContaining({
                    barrier: '0',
                    contract_type: 'DIGITDIFF',
                    symbol: '1HZ10V',
                }),
            })
        );
    });

    it('requires bullish 5m candle and falling streak before Rise execution', async () => {
        const user = userEvent.setup();
        const store = createMockStore();
        mockUseStore.mockReturnValue(store);
        (buyContractForUi as jest.Mock).mockResolvedValue({
            contract_id: 1,
            buy_price: 1,
            transaction_id: 10,
        });

        render(<AutoTrades />);

        await user.selectOptions(screen.getAllByRole('combobox')[0], 'CALL');
        await user.click(screen.getByRole('button', { name: /Run Auto Trades/i }));

        await waitFor(() => {
            expect(tickSubscribers['1HZ10V']).toBeDefined();
            expect(candleSubscribers['1HZ10V']).toBeDefined();
        });

        act(() => {
            [105, 104, 103, 102, 101].forEach(quote => tickSubscribers['1HZ10V']({ tick: { quote } }));
        });

        expect(buyContractForUi).not.toHaveBeenCalled();

        act(() => {
            candleSubscribers['1HZ10V']({ ohlc: { open: 100, close: 99 } });
        });

        expect(buyContractForUi).not.toHaveBeenCalled();

        act(() => {
            candleSubscribers['1HZ10V']({ ohlc: { open: 100, close: 101 } });
        });

        await waitFor(() => {
            expect(buyContractForUi).toHaveBeenCalledWith(
                expect.objectContaining({
                    parameters: expect.objectContaining({ contract_type: 'CALL', duration: 1 }),
                })
            );
        });
    });

    it('allows removing markets directly from market cards', async () => {
        const user = userEvent.setup();

        render(<AutoTrades />);

        // Each market card should have a remove button (minus sign)
        const removeButtons = screen.getAllByTitle(/Remove from Auto Trades/i);
        expect(removeButtons.length).toBeGreaterThan(0);

        // Click the first remove button
        await user.click(removeButtons[0]);

        await waitFor(() => {
            // Market count should decrease
            const text = screen.getByText(/\d+\/13 selected/i).textContent;
            expect(text).toBe('12/13 selected');
        });
    });

    it('shows add-market cards for unavailable markets', async () => {
        const user = userEvent.setup();

        render(<AutoTrades />);

        // Clear all markets first
        await user.click(screen.getByRole('button', { name: 'Clear' }));

        await waitFor(() => {
            expect(screen.getByText('0/13 selected')).toBeInTheDocument();
        });

        // Should show all 13 markets as add cards
        const addMarkets = screen.getAllByTitle(/Add .* to Auto Trades/i);
        expect(addMarkets.length).toBe(13);

        // Click add on first market
        await user.click(addMarkets[0]);

        await waitFor(() => {
            expect(screen.getByText('1/13 selected')).toBeInTheDocument();
        });
    });

    it('keeps live quotes flowing after stopping auto trades', async () => {
        const user = userEvent.setup();
        const store = createMockStore();
        mockUseStore.mockReturnValue(store);

        render(<AutoTrades />);

        await user.click(screen.getByRole('button', { name: /Run Auto Trades/i }));

        await waitFor(() => {
            expect(tickSubscribers['1HZ10V']).toBeDefined();
        });

        act(() => {
            tickSubscribers['1HZ10V']({ tick: { quote: 100.22 } });
        });

        await waitFor(() => {
            expect(screen.getByText('100.22')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: /Stop/i }));

        expect(store.run_panel.onUnmount).not.toHaveBeenCalled();

        act(() => {
            tickSubscribers['1HZ10V']({ tick: { quote: 101.33 } });
        });

        await waitFor(() => {
            expect(screen.getByText('101.33')).toBeInTheDocument();
        });
        expect(screen.getByText('Live data')).toBeInTheDocument();
    });
});
