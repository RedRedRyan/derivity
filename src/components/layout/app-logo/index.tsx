// Simplified logo component showing "Powered by Deriv" text
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import './app-logo.scss';

export const AppLogo = () => {
    const { isDesktop } = useDevice();

    // Only render on desktop screens
    if (!isDesktop) return null;

    return (
        <a href='/' className='app-header__logo' aria-label={localize('Home')}>
            <span className='powered-by-text'>Powered by Deriv</span>
        </a>
    );
};
