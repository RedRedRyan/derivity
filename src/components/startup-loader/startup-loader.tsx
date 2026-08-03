import React, { useEffect, useState } from 'react';
import { DomainPreloader } from './domain-preloader';

type TStartupLoaderProps = {
    children: React.ReactNode;
};

const STARTUP_LOADER_DURATION = 6000;

const StartupLoader = ({ children }: TStartupLoaderProps) => {
    const [is_ready, setIsReady] = useState(false);
    const [is_complete, setIsComplete] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setIsReady(true);
            setIsComplete(true);
        }, STARTUP_LOADER_DURATION);

        return () => window.clearTimeout(timer);
    }, []);

    return (
        <>
            {!is_complete && (
                <DomainPreloader
                    appReady={is_ready}
                    disableSessionReduction
                    minimumDuration={STARTUP_LOADER_DURATION}
                    maximumDuration={STARTUP_LOADER_DURATION}
                    onComplete={() => setIsComplete(true)}
                />
            )}
            {is_complete ? children : null}
        </>
    );
};

export default StartupLoader;
