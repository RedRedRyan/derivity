import ClientStore from '../client-store';

describe('ClientStore.resetDemoBalance', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.resetModules();
    });

    it('applies the Deriv reset balance to accounts and account_list', async () => {
        jest.doMock('@/services/oauth-token-exchange.service', () => ({
            OAuthTokenExchangeService: {
                getAccessToken: () => 'oauth-token',
            },
        }));
        jest.doMock('@/services/derivws-accounts.service', () => ({
            DerivWSAccountsService: {
                resetDemoBalance: jest.fn(() =>
                    Promise.resolve({
                        account_id: 'VRTC456',
                        balance: 10000,
                        currency: 'USD',
                    })
                ),
            },
        }));

        const store: any = new ClientStore({} as any);

        store.server_balances = { VRTC456: 1000 };
        store.accounts = {
            VRTC456: {
                loginid: 'VRTC456',
                balance: 1000,
                currency: 'USD',
                is_virtual: true,
            },
        };
        store.account_list = [
            {
                loginid: 'VRTC456',
                balance: 1000,
                currency: 'USD',
                isVirtual: true,
            },
        ];

        const result = await store.resetDemoBalance('VRTC456', 2500, 'USD');

        expect(result).toEqual({
            balance: 10000,
            currency: 'USD',
            loginid: 'VRTC456',
            success: true,
        });
        expect(localStorage.getItem('demo_balance_overrides')).toBeNull();
        expect(store.accounts['VRTC456'].balance).toBe(10000);
        const listAcc = store.account_list.find((a: any) => a.loginid === 'VRTC456');
        expect(listAcc).toBeDefined();
        expect(listAcc.balance).toBe(10000);
    });

    it('does not hydrate local demo balance overrides', () => {
        const store: any = new ClientStore({} as any);

        const override = {
            baseline_server_balance: 1000,
            currency: 'USD',
            custom_balance: 3000,
            last_known_server_balance: 1000,
        };
        localStorage.setItem('demo_balance_overrides', JSON.stringify({ VRTC789: override }));

        const got = store.getDemoBalanceOverride('VRTC789');
        expect(got).toBeUndefined();
    });
});
