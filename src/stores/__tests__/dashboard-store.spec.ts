import { DBOT_TABS } from '@/constants/bot-contents';
import DashboardStore from '../dashboard-store';

describe('DashboardStore trading navigation guard', () => {
    const createStore = () =>
        new DashboardStore(
            {} as any,
            {
                ui: { is_mobile: false },
            } as any
        );

    it('switches tabs immediately when no guarded trading session is active', () => {
        const store = createStore();

        store.setActiveTab(DBOT_TABS.DASHBOARD);
        store.setActiveTab(DBOT_TABS.ANALYSIS_TOOL);

        expect(store.active_tab).toBe(DBOT_TABS.ANALYSIS_TOOL);
        expect(store.is_leave_trading_dialog_open).toBe(false);
    });

    it('blocks tab switching and opens a confirmation dialog while auto trades is active', () => {
        const store = createStore();

        store.setActiveTab(DBOT_TABS.AUTO_TRADES);
        store.setActiveTradingModule('auto_trades');
        store.setActiveTab(DBOT_TABS.DASHBOARD);

        expect(store.active_tab).toBe(DBOT_TABS.AUTO_TRADES);
        expect(store.pending_active_tab).toBe(DBOT_TABS.DASHBOARD);
        expect(store.is_leave_trading_dialog_open).toBe(true);
    });

    it('cancels the pending navigation when the user chooses to stay', () => {
        const store = createStore();

        store.setActiveTab(DBOT_TABS.AUTO_TRADES);
        store.setActiveTradingModule('auto_trades');
        store.setActiveTab(DBOT_TABS.BEST_BOTS);
        store.cancelPendingTradingNavigation();

        expect(store.active_tab).toBe(DBOT_TABS.AUTO_TRADES);
        expect(store.pending_active_tab).toBeNull();
        expect(store.is_leave_trading_dialog_open).toBe(false);
    });

    it('stops the active trading module before switching tabs', async () => {
        const store = createStore();
        const stopHandler = jest.fn().mockResolvedValue(undefined);

        store.setActiveTab(DBOT_TABS.AUTO_TRADES);
        store.registerTradingStopHandler('auto_trades', stopHandler);
        store.setActiveTradingModule('auto_trades');
        store.setActiveTab(DBOT_TABS.BOT_BUILDER);

        await store.confirmPendingTradingNavigation();

        expect(stopHandler).toHaveBeenCalledTimes(1);
        expect(store.active_tab).toBe(DBOT_TABS.BOT_BUILDER);
        expect(store.active_trading_module).toBeNull();
        expect(store.pending_active_tab).toBeNull();
        expect(store.is_leave_trading_dialog_open).toBe(false);
        expect(store.navigation_stop_in_progress).toBe(false);
    });
});
