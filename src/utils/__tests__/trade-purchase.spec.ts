const mockSend = jest.fn();
const mockSubscribe = jest.fn();
const mockEmit = jest.fn();
const mockGetState = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('@/external/bot-skeleton', () => ({
    api_base: {
        is_authorized: true,
        api: {
            send: (...args: unknown[]) => mockSend(...args),
            subscribe: (...args: unknown[]) => mockSubscribe(...args),
        },
    },
    observer: {
        emit: (...args: unknown[]) => mockEmit(...args),
        getState: (...args: unknown[]) => mockGetState(...args),
    },
}));

jest.mock('@/utils/api-token-permissions', () => ({
    assertApiTokenScope: jest.fn(),
}));

import { setRequestWebSocketURL } from '@/external/bot-skeleton/services/api/legacy-request';
import { buyContractForUi, getContractSnapshot } from '../trade-purchase';
import { streamContractUntilSettled } from '../trade-purchase';

const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
};

describe('buyContractForUi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
        mockSubscribe.mockReset();
        mockUnsubscribe.mockReset();
        setRequestWebSocketURL('wss://ws.derivws.com/websockets/v3?app_id=1089');
        mockGetState.mockImplementation(key => {
            if (key !== 'client.store') return undefined;

            return {
                loginid: 'VRTC123456',
                currency: 'USD',
                getAccountCurrency: () => 'USD',
                getDisplayBalanceAmount: () => 20,
                hasSufficientDemoBalance: (amount: number) => amount <= 20,
            };
        });
    });

    afterEach(() => {
        jest.useRealTimers();
        setRequestWebSocketURL(null);
    });

    it('blocks demo purchases that exceed the available displayed balance', async () => {
        mockSend.mockResolvedValueOnce({
            proposal: {
                id: 'proposal-1',
                ask_price: 25,
            },
        });

        await expect(
            buyContractForUi({
                parameters: {
                    contract_type: 'CALL',
                    duration: 1,
                    duration_unit: 't',
                    symbol: 'R_10',
                },
                price: 25,
                source: 'Auto Trades',
            })
        ).rejects.toThrow(
            'Auto Trades could not purchase this contract. Insufficient demo balance: available 20.00 USD, required 25.00 USD.'
        );

        expect(mockSend).toHaveBeenCalledTimes(1);
        expect(mockSend).toHaveBeenCalledWith(
            expect.objectContaining({
                proposal: 1,
                contract_type: 'CALL',
            })
        );
    });

    it('allows demo purchases when the displayed balance covers the contract cost', async () => {
        mockSend
            .mockResolvedValueOnce({
                proposal: {
                    id: 'proposal-2',
                    ask_price: 15,
                },
            })
            .mockResolvedValueOnce({
                buy: {
                    contract_id: 42,
                    transaction_id: 99,
                    buy_price: 15,
                },
            });

        await expect(
            buyContractForUi({
                parameters: {
                    contract_type: 'CALL',
                    duration: 1,
                    duration_unit: 't',
                    symbol: 'R_10',
                },
                price: 15,
                source: 'Auto Trades',
            })
        ).resolves.toEqual(
            expect.objectContaining({
                contract_id: 42,
                transaction_id: 99,
                buy_price: 15,
            })
        );

        expect(mockSend).toHaveBeenCalledTimes(2);
        expect(mockSend).toHaveBeenLastCalledWith({ buy: 'proposal-2', price: 15 });
    });

    it('preserves Deriv input validation messages when a UI purchase fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const invalidInputResponse = {
            error: {
                code: 'InputValidationFailed',
                details: {},
                message: 'Input validation failed: Properties not allowed: underlying_symbol.',
            },
        };

        mockSend.mockResolvedValue(invalidInputResponse);

        await expect(
            buyContractForUi({
                parameters: {
                    contract_type: 'CALL',
                    duration: 1,
                    duration_unit: 't',
                    symbol: 'R_10',
                },
                price: 1,
                source: 'Auto Trades',
            })
        ).rejects.toThrow('Input validation failed: Properties not allowed: underlying_symbol.');

        expect(mockSend).toHaveBeenCalledTimes(1);
        errorSpy.mockRestore();
    });

    it('uses underlying_symbol when purchasing through a new Options API session', async () => {
        setRequestWebSocketURL('wss://api.derivws.com/trading/v1/options/ws/demo?otp=example');
        mockSend
            .mockResolvedValueOnce({
                proposal: {
                    id: 'proposal-new-api',
                    ask_price: 1,
                },
            })
            .mockResolvedValueOnce({
                buy: {
                    contract_id: 43,
                    transaction_id: 100,
                    buy_price: 1,
                },
            });

        await buyContractForUi({
            parameters: {
                amount: 1,
                basis: 'stake',
                contract_type: 'CALL',
                currency: 'USD',
                duration: 1,
                duration_unit: 't',
                symbol: 'R_100',
            },
            price: 1,
            source: 'Auto Trades',
        });

        expect(mockSend).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                proposal: 1,
                underlying_symbol: 'R_100',
            })
        );
        expect(mockSend.mock.calls[0][0]).not.toHaveProperty('symbol');
    });

    it('prefers exact display tick values for one-tick entry and exit spots', () => {
        expect(
            getContractSnapshot(
                {
                    contract_id: 55,
                    entry_spot: 2805.55,
                    entry_tick: 2805.55,
                    entry_tick_display_value: '2805.550',
                    exit_spot: 2805.55,
                    exit_tick: 2805.551,
                    exit_tick_display_value: '2805.551',
                    is_sold: true,
                    profit: -0.7,
                },
                { currency: 'USD' }
            )
        ).toEqual(
            expect.objectContaining({
                entry_spot: '2805.550',
                exit_spot: '2805.551',
                entry_tick: 2805.55,
                exit_tick: 2805.551,
            })
        );
    });

    it('streams live open-contract updates until the exact sold tick arrives', async () => {
        const onUpdate = jest.fn();
        let subscriber: ((data: any) => void) | undefined;

        mockSubscribe.mockImplementation(() => ({
            subscribe: (callback: (data: any) => void) => {
                subscriber = callback;
                return { unsubscribe: mockUnsubscribe };
            },
        }));

        const contractPromise = streamContractUntilSettled({
            contractId: 42,
            fallback: {
                transaction_ids: { buy: 99 },
                currency: 'USD',
                shortcode: 'AUTO_DIGITOVER_R_10',
            },
            onUpdate,
            source: 'Auto Trades',
        });

        subscriber?.({
            proposal_open_contract: {
                contract_id: 42,
                status: 'open',
                entry_tick: 100.12,
                entry_tick_time: 1700000001,
                transaction_ids: { buy: 99 },
                currency: 'USD',
            },
        });
        subscriber?.({
            proposal_open_contract: {
                contract_id: 42,
                status: 'won',
                is_sold: true,
                profit: 2.5,
                entry_tick: 100.12,
                entry_tick_time: 1700000001,
                exit_tick: 100.45,
                exit_tick_time: 1700000002,
                transaction_ids: { buy: 99, sell: 101 },
                currency: 'USD',
            },
        });

        await expect(contractPromise).resolves.toEqual(
            expect.objectContaining({
                contract_id: 42,
                is_sold: true,
                profit: 2.5,
                entry_tick: 100.12,
                exit_tick: 100.45,
            })
        );

        expect(onUpdate).toHaveBeenCalledTimes(2);
        expect(mockEmit).toHaveBeenCalledWith(
            'contract.status',
            expect.objectContaining({
                id: 'contract.sold',
                contract: expect.objectContaining({
                    contract_id: 42,
                    is_sold: true,
                    profit: 2.5,
                }),
            })
        );
        expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('keeps checking snapshots when the stream only reports an open contract', async () => {
        const onUpdate = jest.fn();
        let subscriber: ((data: any) => void) | undefined;

        mockSubscribe.mockImplementation(() => ({
            subscribe: (callback: (data: any) => void) => {
                subscriber = callback;
                return { unsubscribe: mockUnsubscribe };
            },
        }));
        mockSend
            .mockResolvedValueOnce({
                proposal_open_contract: {
                    contract_id: 77,
                    status: 'open',
                    entry_tick: 94.0888,
                    transaction_ids: { buy: 700 },
                },
            })
            .mockResolvedValueOnce({
                proposal_open_contract: {
                    contract_id: 77,
                    status: 'lost',
                    is_sold: true,
                    profit: -0.7,
                    entry_tick: 94.0888,
                    exit_tick: 94.1524,
                    transaction_ids: { buy: 700, sell: 701 },
                },
            });

        const contractPromise = streamContractUntilSettled({
            contractId: 77,
            fallback: {
                transaction_ids: { buy: 700 },
                currency: 'USD',
            },
            onUpdate,
            settlementCheckMs: 1,
            source: 'Auto Trades',
            timeoutMs: 1000,
        });

        subscriber?.({
            proposal_open_contract: {
                contract_id: 77,
                status: 'open',
                entry_tick: 94.0888,
                transaction_ids: { buy: 700 },
            },
        });

        await expect(contractPromise).resolves.toEqual(
            expect.objectContaining({
                contract_id: 77,
                is_sold: true,
                profit: -0.7,
                exit_tick: 94.1524,
            })
        );

        expect(mockSend).toHaveBeenCalledWith({
            proposal_open_contract: 1,
            contract_id: 77,
        });
        expect(onUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                contract_id: 77,
                is_sold: false,
            }),
            expect.objectContaining({
                status: 'open',
            })
        );
        expect(onUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                contract_id: 77,
                is_sold: true,
                profit: -0.7,
            }),
            expect.objectContaining({
                status: 'lost',
            })
        );
    });

    it('does not fake-close stale contracts and recovers the sold result from the profit table', async () => {
        jest.useFakeTimers();
        const onUpdate = jest.fn();

        mockSubscribe.mockImplementation(() => ({
            subscribe: () => ({ unsubscribe: mockUnsubscribe }),
        }));
        mockSend.mockImplementation((request: Record<string, any>) => {
            if (request?.proposal_open_contract) {
                return Promise.resolve({
                    proposal_open_contract: {
                        contract_id: 88,
                        status: 'open',
                        buy_price: 0.7,
                        entry_tick: 770520.07,
                        entry_tick_time: 1700000001,
                        transaction_ids: { buy: 800 },
                    },
                });
            }

            if (request?.profit_table) {
                return Promise.resolve({
                    profit_table: {
                        transactions: [
                            {
                                contract_id: 88,
                                contract_type: 'DIGITOVER',
                                underlying_symbol: 'R_25',
                                shortcode: 'AUTO_DIGITOVER_R_25',
                                buy_price: 0.7,
                                sell_price: 1.29,
                                payout: 1.29,
                                purchase_time: 1700000001,
                                sell_time: 1700000002,
                                transaction_id: 801,
                            },
                        ],
                    },
                });
            }

            return Promise.resolve({});
        });

        let settled = false;
        const contractPromise = streamContractUntilSettled({
            contractId: 88,
            fallback: {
                buy_price: 0.7,
                transaction_ids: { buy: 800 },
                currency: 'USD',
                shortcode: 'AUTO_DIGITOVER_R_25',
            },
            onUpdate,
            settlementCheckMs: 10,
            source: 'Auto Trades',
            timeoutMs: 10,
        }).then(contract => {
            settled = true;
            return contract;
        });

        await flushPromises();
        expect(settled).toBe(false);

        jest.advanceTimersByTime(10);
        await flushPromises();

        await expect(contractPromise).resolves.toEqual(
            expect.objectContaining({
                contract_id: 88,
                is_sold: true,
                profit: 0.59,
                sell_price: 1.29,
                exit_tick_time: 1700000002,
            })
        );

        expect(mockSend).toHaveBeenCalledWith(
            expect.objectContaining({
                proposal_open_contract: 1,
                contract_id: 88,
            })
        );
        expect(mockSend).toHaveBeenCalledWith(
            expect.objectContaining({
                profit_table: 1,
                limit: 25,
                sort: 'DESC',
            })
        );
        expect(mockEmit).toHaveBeenCalledWith(
            'contract.status',
            expect.objectContaining({
                id: 'contract.settlement_recovery',
                data: 88,
            })
        );
        expect(mockEmit).toHaveBeenCalledWith(
            'contract.status',
            expect.objectContaining({
                id: 'contract.sold',
                contract: expect.objectContaining({
                    contract_id: 88,
                    is_sold: true,
                    profit: 0.59,
                }),
            })
        );
        expect(onUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                contract_id: 88,
                is_sold: true,
                profit: 0.59,
            }),
            expect.objectContaining({
                contract_id: 88,
            })
        );
    });
});
