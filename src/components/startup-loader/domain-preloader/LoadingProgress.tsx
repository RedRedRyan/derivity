import React from 'react';

interface LoadingProgressProps {
    progress: number;
    primaryColor: string;
    secondaryColor: string;
}

export const LoadingProgress: React.FC<LoadingProgressProps> = ({ progress, primaryColor, secondaryColor }) => {
    return (
        <div className='loading-progress'>
            <div className='loading-progress__container'>
                <div
                    className='loading-progress__bar'
                    style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor}, ${primaryColor})`,
                        boxShadow: `0 0 20px ${primaryColor}60, 0 0 40px ${primaryColor}30`,
                    }}
                >
                    <div
                        className='loading-progress__shimmer'
                        style={{
                            background: `linear-gradient(90deg, transparent, ${primaryColor}80, transparent)`,
                        }}
                    />
                </div>
            </div>
            <div className='loading-progress__background' />
        </div>
    );
};
