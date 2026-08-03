import { observer } from 'mobx-react-lite';
import useThemeSwitcher from '@/hooks/useThemeSwitcher';
import './dark-mode-toggle.scss';

const DarkModeToggle = observer(() => {
    const { is_dark_mode_on, toggleTheme } = useThemeSwitcher();

    return (
        <button
            className={`dark-mode-toggle ${is_dark_mode_on ? 'dark-mode-toggle--dark' : 'dark-mode-toggle--light'}`}
            onClick={toggleTheme}
            aria-label={is_dark_mode_on ? 'Switch to light mode' : 'Switch to dark mode'}
            title={is_dark_mode_on ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <span className='dark-mode-toggle__track'>
                <span className='dark-mode-toggle__thumb'>
                    {is_dark_mode_on ? (
                        <svg width='12' height='12' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
                            <path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' fill='currentColor' />
                        </svg>
                    ) : (
                        <svg width='12' height='12' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
                            <circle cx='12' cy='12' r='5' fill='currentColor' />
                            <line
                                x1='12'
                                y1='1'
                                x2='12'
                                y2='3'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                            />
                            <line
                                x1='12'
                                y1='21'
                                x2='12'
                                y2='23'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                            />
                            <line
                                x1='4.22'
                                y1='4.22'
                                x2='5.64'
                                y2='5.64'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                            />
                            <line
                                x1='18.36'
                                y1='18.36'
                                x2='19.78'
                                y2='19.78'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                            />
                            <line
                                x1='1'
                                y1='12'
                                x2='3'
                                y2='12'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                            />
                            <line
                                x1='21'
                                y1='12'
                                x2='23'
                                y2='12'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                            />
                            <line
                                x1='4.22'
                                y1='19.78'
                                x2='5.64'
                                y2='18.36'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                            />
                            <line
                                x1='18.36'
                                y1='5.64'
                                x2='19.78'
                                y2='4.22'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                            />
                        </svg>
                    )}
                </span>
            </span>
        </button>
    );
});

export default DarkModeToggle;
