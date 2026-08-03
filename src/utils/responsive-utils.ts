/**
 * Responsive utility for applying specific classes to document body based on screen size.
 * Allows CSS to easily target mobile, tablet, or desktop devices.
 */
import { useEffect, useState } from 'react';

export const MOBILE_BREAKPOINT = 768;
export const TABLET_BREAKPOINT = 1024;

export const useResponsiveLayout = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
    const [isTablet, setIsTablet] = useState(
        window.innerWidth > MOBILE_BREAKPOINT && window.innerWidth <= TABLET_BREAKPOINT
    );

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
            const tablet = window.innerWidth > MOBILE_BREAKPOINT && window.innerWidth <= TABLET_BREAKPOINT;

            setIsMobile(mobile);
            setIsTablet(tablet);

            // Toggle classes on body for global CSS usage
            if (mobile) {
                document.body.classList.add('is-mobile');
                document.body.classList.remove('is-tablet');
            } else if (tablet) {
                document.body.classList.add('is-tablet');
                document.body.classList.remove('is-mobile');
            } else {
                document.body.classList.remove('is-mobile', 'is-tablet');
            }
        };

        // Initial setup
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return { isMobile, isTablet };
};
