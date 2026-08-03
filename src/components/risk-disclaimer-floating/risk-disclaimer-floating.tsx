import { useState } from 'react';
import styles from './risk-disclaimer-floating.module.scss';

const RiskDisclaimerFloating = () => {
    const [is_open, setIsOpen] = useState(false);

    return (
        <>
            <button className={styles.trigger} onClick={() => setIsOpen(true)} type='button'>
                <span className={styles.icon}>!</span>
                <span>Risk Disclaimer</span>
            </button>

            {is_open && (
                <div className={styles.overlay} onClick={() => setIsOpen(false)}>
                    <div
                        className={styles.modal}
                        onClick={event => event.stopPropagation()}
                        role='dialog'
                        aria-modal='true'
                        aria-labelledby='risk-disclaimer-title'
                    >
                        <div className={styles.header}>
                            <div className={styles.badge}>!</div>
                            <h3 className={styles.title} id='risk-disclaimer-title'>
                                Risk Disclaimer
                            </h3>
                            <button
                                className={styles.close}
                                onClick={() => setIsOpen(false)}
                                type='button'
                                aria-label='Close risk disclaimer'
                            >
                                x
                            </button>
                        </div>

                        <div className={styles.body}>
                            <p>
                                Deriv offers complex derivatives, such as options and contracts for difference
                                (&ldquo;CFDs&rdquo;). These products may not be suitable for all clients, and trading
                                them puts you at risk. Please make sure that you understand the following risks before
                                trading Deriv products:
                            </p>
                            <ul className={styles.list}>
                                <li>You may lose some or all of the money you invest in the trade.</li>
                                <li>
                                    If your trade involves currency conversion, exchange rates will affect your profit
                                    and loss.
                                </li>
                                <li>
                                    You should never trade with borrowed money or with money that you cannot afford to
                                    lose.
                                </li>
                            </ul>
                        </div>

                        <div className={styles.footer}>
                            <button className={styles.confirm} onClick={() => setIsOpen(false)} type='button'>
                                I Understand
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default RiskDisclaimerFloating;
