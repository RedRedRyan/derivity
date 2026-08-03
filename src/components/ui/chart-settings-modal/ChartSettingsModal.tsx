import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import UiStore from '@/stores/ui-store';
import styles from './ChartSettingsModal.module.scss';

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const isValidHexColor = (color: string) => HEX_COLOR_PATTERN.test(color);

const ChartSettingsModal = observer(() => {
    const { ui } = useStore();
    const {
        candleUpColor,
        candleDownColor,
        backgroundColor,
        showGrid,
        candleMode,
        setCandleUpColor,
        setCandleDownColor,
        setBackgroundColor,
        setShowGrid,
        setCandleMode,
        setShowChartSettingsModal,
    } = ui;

    const [draftSettings, setDraftSettings] = React.useState(() => ({
        candleUpColor,
        candleDownColor,
        backgroundColor,
        showGrid,
        candleMode,
    }));
    const [error_message, setErrorMessage] = React.useState('');

    React.useEffect(() => {
        if (!ui.showChartSettingsModal) return;

        setDraftSettings({
            candleUpColor,
            candleDownColor,
            backgroundColor,
            showGrid,
            candleMode,
        });
        setErrorMessage('');
    }, [backgroundColor, candleDownColor, candleMode, candleUpColor, showGrid, ui.showChartSettingsModal]);

    const handleClose = () => {
        setShowChartSettingsModal(false);
    };

    const handleApply = () => {
        try {
            if (
                !isValidHexColor(draftSettings.candleUpColor) ||
                !isValidHexColor(draftSettings.candleDownColor) ||
                !isValidHexColor(draftSettings.backgroundColor)
            ) {
                setErrorMessage('Choose valid chart colors before applying changes.');
                return;
            }

            setCandleUpColor(draftSettings.candleUpColor);
            setCandleDownColor(draftSettings.candleDownColor);
            setBackgroundColor(draftSettings.backgroundColor);
            setShowGrid(draftSettings.showGrid);
            setCandleMode(draftSettings.candleMode);
            setShowChartSettingsModal(false);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Chart settings could not be applied.');
        }
    };

    const handleReset = () => {
        const defaults = UiStore.getDefaultChartSettings(ui.is_dark_mode_on);
        setDraftSettings(defaults);
    };

    return (
        <div
            className={styles.backdrop}
            onClick={e => {
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
        >
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>Chart Settings</h3>
                    <button
                        className={styles.close}
                        onClick={handleClose}
                        type='button'
                        aria-label='Close chart settings'
                    >
                        &times;
                    </button>
                </div>
                <div className={styles.body}>
                    {error_message && <div className={styles.error_message}>{error_message}</div>}
                    <div className={styles.row}>
                        <label>Up Candle Color</label>
                        <input
                            type='color'
                            value={draftSettings.candleUpColor}
                            onChange={e => setDraftSettings(current => ({ ...current, candleUpColor: e.target.value }))}
                        />
                    </div>
                    <div className={styles.row}>
                        <label>Down Candle Color</label>
                        <input
                            type='color'
                            value={draftSettings.candleDownColor}
                            onChange={e =>
                                setDraftSettings(current => ({ ...current, candleDownColor: e.target.value }))
                            }
                        />
                    </div>
                    <div className={styles.row}>
                        <label>Background Color</label>
                        <input
                            type='color'
                            value={draftSettings.backgroundColor}
                            onChange={e =>
                                setDraftSettings(current => ({ ...current, backgroundColor: e.target.value }))
                            }
                        />
                    </div>
                    <div className={styles.row}>
                        <label>Show Grid</label>
                        <label className={styles.switch}>
                            <input
                                type='checkbox'
                                checked={draftSettings.showGrid}
                                onChange={e =>
                                    setDraftSettings(current => ({ ...current, showGrid: e.target.checked }))
                                }
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>
                    <div className={styles.row}>
                        <label>Candle Mode</label>
                        <select
                            value={draftSettings.candleMode}
                            onChange={e =>
                                setDraftSettings(current => ({
                                    ...current,
                                    candleMode: e.target.value as 'close' | 'current',
                                }))
                            }
                        >
                            <option value='close'>Closed Candles</option>
                            <option value='current'>Current Forming Candle</option>
                        </select>
                    </div>
                </div>
                <div className={styles.footer}>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleReset} type='button'>
                        Reset
                    </button>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleClose} type='button'>
                        Cancel
                    </button>
                    <button className={styles.btn} onClick={handleApply} type='button'>
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
});

export default ChartSettingsModal;
