import React, { useEffect, useState, useRef } from 'react';
import { useDomainLoaderConfig } from '../useDomainLoaderConfig';
import { useLoaderProgress } from '../useLoaderProgress';
import { CircularLoader } from './CircularLoader';
import { FallingMoney } from './FallingMoney';
import { LoadingProgress } from './LoadingProgress';
import { LoadingStatus } from './LoadingStatus';
import './DomainPreloader.scss';

interface DomainPreloaderProps {
    appReady?: boolean;
    disableSessionReduction?: boolean;
    minimumDuration?: number;
    maximumDuration?: number;
    onComplete: () => void;
}

export const DomainPreloader: React.FC<DomainPreloaderProps> = ({
    appReady = false,
    disableSessionReduction = false,
    minimumDuration = 3000,
    maximumDuration = 15000,
    onComplete,
}) => {
    const config = useDomainLoaderConfig();
    const [isExiting, setIsExiting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [showReducedLoader, setShowReducedLoader] = useState(false);
    const completionFiredRef = useRef(false);

    // Check if this is a repeat visit in the same session
    useEffect(() => {
        if (disableSessionReduction) {
            return;
        }

        const hasLoaderShown = sessionStorage.getItem('siteLoaderShown');
        if (hasLoaderShown) {
            setShowReducedLoader(true);
        }
    }, [disableSessionReduction]);

    // Adjust duration for repeat visits
    const effectiveDuration = showReducedLoader ? 1500 : maximumDuration;
    const effectiveMinimum = showReducedLoader ? 500 : minimumDuration;

    const { progress } = useLoaderProgress({
        appReady: appReady || showReducedLoader,
        minimumDuration: effectiveMinimum,
        maximumDuration: effectiveDuration,
    });

    // Handle scroll lock
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        const originalPosition = document.body.style.position;
        const originalWidth = document.body.style.width;

        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.position = originalPosition;
            document.body.style.width = originalWidth;
        };
    }, []);

    // Handle completion
    useEffect(() => {
        if (progress >= 100 && !completionFiredRef.current) {
            completionFiredRef.current = true;
            setIsComplete(true);
            setIsExiting(true);

            // Mark as shown for this session
            sessionStorage.setItem('siteLoaderShown', 'true');

            onComplete();
        }
    }, [progress, onComplete]);

    const cssVariables = {
        '--loader-primary': config.primaryColor,
        '--loader-secondary': config.secondaryColor,
        '--loader-accent': config.accentColor,
        '--loader-background': config.backgroundColor,
    } as React.CSSProperties;

    return (
        <div
            className={`domain-preloader ${isExiting ? 'domain-preloader--exiting' : ''} ${isComplete ? 'domain-preloader--complete' : ''}`}
            style={cssVariables}
        >
            {/* Background layers */}
            <div className='domain-preloader__background' />
            <div className='domain-preloader__grid' />
            <div className='domain-preloader__gradient-orb domain-preloader__gradient-orb--primary' />
            <div className='domain-preloader__gradient-orb domain-preloader__gradient-orb--secondary' />

            {/* Falling money animation */}
            <FallingMoney
                symbols={config.fallingSymbols}
                primaryColor={config.primaryColor}
                secondaryColor={config.secondaryColor}
            />

            {/* Main content */}
            <div className='domain-preloader__content'>
                {/* Header */}
                <div className='domain-preloader__header'>
                    <h1 className='domain-preloader__title' style={{ color: config.accentColor }}>
                        {config.welcomeText}
                    </h1>
                    <p className='domain-preloader__subtitle' style={{ color: config.primaryColor }}>
                        {config.subtitle}
                    </p>
                </div>

                {/* Circular loader */}
                <CircularLoader
                    progress={progress}
                    primaryColor={config.primaryColor}
                    secondaryColor={config.secondaryColor}
                    accentColor={config.accentColor}
                    siteName={config.siteName}
                    isComplete={isComplete}
                />

                {/* Progress bar */}
                <LoadingProgress
                    progress={progress}
                    primaryColor={config.primaryColor}
                    secondaryColor={config.secondaryColor}
                />

                {/* Loading status */}
                <LoadingStatus
                    progress={progress}
                    messages={config.messages}
                    accentColor={config.accentColor}
                    primaryColor={config.primaryColor}
                    isComplete={isComplete}
                />

                {/* Footer */}
                <div className='domain-preloader__footer' style={{ color: `${config.accentColor}60` }}>
                    {config.footerText}
                </div>
            </div>
        </div>
    );
};
