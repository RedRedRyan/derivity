import { action, makeObservable, observable } from 'mobx';
import { isTouchDevice } from '@/components/shared/utils/screen/responsive';

export default class UiStore {
    static getDefaultChartBackground(is_dark_mode_on: boolean) {
        return is_dark_mode_on ? '#0d1117' : '#ffffff';
    }

    static getDefaultChartSettings(is_dark_mode_on: boolean) {
        return {
            candleUpColor: '#26a69a',
            candleDownColor: '#ef5350',
            backgroundColor: UiStore.getDefaultChartBackground(is_dark_mode_on),
            showGrid: true,
            candleMode: 'close' as 'close' | 'current',
        };
    }

    is_mobile = true;
    is_desktop = true;
    is_tablet = false;
    is_chart_layout_default = true;
    is_dark_mode_on = localStorage.getItem('theme') === 'dark';
    account_switcher_disabled_message = '';
    current_focus = null;
    show_prompt = false;
    is_trading_assessment_for_new_user_enabled = false;
    is_accounts_switcher_on = false;

    // Chart settings
    candleUpColor =
        localStorage.getItem('chartCandleUpColor') ||
        UiStore.getDefaultChartSettings(this.is_dark_mode_on).candleUpColor;
    candleDownColor =
        localStorage.getItem('chartCandleDownColor') ||
        UiStore.getDefaultChartSettings(this.is_dark_mode_on).candleDownColor;
    backgroundColor =
        localStorage.getItem('chartBackgroundColor') ||
        UiStore.getDefaultChartSettings(this.is_dark_mode_on).backgroundColor;
    showGrid = localStorage.getItem('chartShowGrid') === null ? true : localStorage.getItem('chartShowGrid') === 'true';
    candleMode = (localStorage.getItem('chartCandleMode') as 'close' | 'current') || 'close';
    showChartSettingsModal = false;

    // TODO: fix - need to implement this feature
    is_onscreen_keyboard_active = false;

    constructor() {
        makeObservable(this, {
            account_switcher_disabled_message: observable,
            current_focus: observable,
            is_accounts_switcher_on: observable,
            is_dark_mode_on: observable,
            is_desktop: observable,
            is_mobile: observable,
            is_tablet: observable,
            is_trading_assessment_for_new_user_enabled: observable,
            show_prompt: observable,
            candleUpColor: observable,
            candleDownColor: observable,
            backgroundColor: observable,
            showGrid: observable,
            candleMode: observable,
            showChartSettingsModal: observable,
            setAccountSwitcherDisabledMessage: action.bound,
            setCurrentFocus: action.bound,
            setDarkMode: action.bound,
            setDevice: action.bound,
            setPromptHandler: action.bound,
            setIsTradingAssessmentForNewUserEnabled: action.bound,
            toggleAccountsGrid: action.bound,
            toggleOnScreenKeyboard: action.bound,
            setCandleUpColor: action.bound,
            setCandleDownColor: action.bound,
            setBackgroundColor: action.bound,
            setShowGrid: action.bound,
            setCandleMode: action.bound,
            setShowChartSettingsModal: action.bound,
            resetChartSettings: action.bound,
        });
    }

    setPromptHandler = (should_show: boolean) => {
        this.show_prompt = should_show;
    };

    setAccountSwitcherDisabledMessage = (message: string) => {
        if (message) {
            this.account_switcher_disabled_message = message;
        } else {
            this.account_switcher_disabled_message = '';
        }
    };
    setIsTradingAssessmentForNewUserEnabled(value: boolean) {
        this.is_trading_assessment_for_new_user_enabled = value;
    }

    setDarkMode = (value: boolean) => {
        this.is_dark_mode_on = value;
        localStorage.setItem('theme', value ? 'dark' : 'light');
        // Update background color based on theme if not overridden? We'll keep custom backgroundColor separate.
        // Optionally reset backgroundColor to default for theme if user hasn't customized? We'll leave as is.
    };

    setDevice = (value: 'mobile' | 'desktop' | 'tablet') => {
        this.is_mobile = value === 'mobile';
        this.is_desktop = value === 'desktop';
        this.is_tablet = value === 'tablet';
    };

    toggleAccountsGrid(status = !this.is_accounts_switcher_on) {
        this.is_accounts_switcher_on = status;
    }

    toggleOnScreenKeyboard() {
        this.is_onscreen_keyboard_active = this.current_focus !== null && this.is_mobile && isTouchDevice();
    }

    setCurrentFocus(value) {
        this.current_focus = value;
        this.toggleOnScreenKeyboard();
    }

    setCandleUpColor = (color: string) => {
        this.candleUpColor = color;
        localStorage.setItem('chartCandleUpColor', color);
    };

    setCandleDownColor = (color: string) => {
        this.candleDownColor = color;
        localStorage.setItem('chartCandleDownColor', color);
    };

    setBackgroundColor = (color: string) => {
        this.backgroundColor = color;
        localStorage.setItem('chartBackgroundColor', color);
    };

    setShowGrid = (show: boolean) => {
        this.showGrid = show;
        localStorage.setItem('chartShowGrid', String(show));
    };

    setCandleMode = (mode: 'close' | 'current') => {
        this.candleMode = mode;
        localStorage.setItem('chartCandleMode', mode);
    };

    setShowChartSettingsModal = (show: boolean) => {
        this.showChartSettingsModal = show;
    };

    resetChartSettings = () => {
        const defaults = UiStore.getDefaultChartSettings(this.is_dark_mode_on);
        this.candleUpColor = defaults.candleUpColor;
        this.candleDownColor = defaults.candleDownColor;
        this.backgroundColor = defaults.backgroundColor;
        this.showGrid = defaults.showGrid;
        this.candleMode = defaults.candleMode;

        localStorage.setItem('chartCandleUpColor', defaults.candleUpColor);
        localStorage.setItem('chartCandleDownColor', defaults.candleDownColor);
        localStorage.setItem('chartBackgroundColor', defaults.backgroundColor);
        localStorage.setItem('chartShowGrid', String(defaults.showGrid));
        localStorage.setItem('chartCandleMode', defaults.candleMode);
    };
}
