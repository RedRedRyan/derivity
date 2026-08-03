import React, { useMemo } from 'react';
import { Shield, Wifi, CheckCircle } from '../loader-icons';

interface LoadingStatusProps {
    progress: number;
    messages: string[];
    accentColor: string;
    primaryColor: string;
    isComplete: boolean;
}

export const LoadingStatus: React.FC<LoadingStatusProps> = ({
    progress,
    messages,
    accentColor,
    primaryColor,
    isComplete,
}) => {
    const currentMessage = useMemo(() => {
        if (isComplete) {
            return 'System ready. Launching application...';
        }
        if (progress < 20) return messages[0] || 'Initializing secure environment...';
        if (progress < 40) return messages[1] || 'Connecting to trading services...';
        if (progress < 60) return messages[2] || 'Loading market analysis tools...';
        if (progress < 80) return messages[3] || 'Synchronizing live data...';
        if (progress < 95) return messages[4] || 'Preparing your dashboard...';
        return messages[5] || 'Launching application...';
    }, [progress, messages, isComplete]);

    return (
        <div className='loading-status'>
            <div
                className='loading-status__message'
                key={currentMessage}
                style={{ color: accentColor }}
                role='status'
                aria-live='polite'
            >
                {currentMessage}
            </div>

            <div className='loading-status__indicators'>
                <div className='loading-status__indicator' style={{ color: primaryColor }}>
                    {isComplete ? <CheckCircle size={14} strokeWidth={2} /> : <Shield size={14} strokeWidth={2} />}
                    <span>{isComplete ? 'System Ready' : 'Secure Environment'}</span>
                </div>

                <div className='loading-status__dot' />

                <div className='loading-status__indicator' style={{ color: primaryColor }}>
                    <Wifi size={14} strokeWidth={2} />
                    <span>{isComplete ? 'Connected' : 'Initializing'}</span>
                </div>
            </div>
        </div>
    );
};
