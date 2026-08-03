import React, { useMemo } from 'react';
import { TrendingUp } from '../loader-icons';

interface CircularLoaderProps {
    progress: number;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    siteName: string;
    isComplete: boolean;
}

export const CircularLoader: React.FC<CircularLoaderProps> = ({
    progress,
    primaryColor,
    secondaryColor,
    accentColor,
    siteName,
    isComplete,
}) => {
    const particles = useMemo(() => {
        return Array.from({ length: 8 }, (_, i) => ({
            id: i,
            angle: i * 45 + Math.random() * 10,
            delay: i * 0.2,
        }));
    }, []);

    const circumference = 2 * Math.PI * 120;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className='circular-loader'>
            {/* Outer glow ring */}
            <div
                className='circular-loader__glow-ring'
                style={{
                    boxShadow: `0 0 60px ${primaryColor}40, 0 0 100px ${secondaryColor}30`,
                }}
            />

            {/* Background ring */}
            <svg className='circular-loader__svg circular-loader__svg--bg' viewBox='0 0 260 260'>
                <circle cx='130' cy='130' r='120' fill='none' stroke='rgba(255,255,255,0.05)' strokeWidth='4' />
            </svg>

            {/* Progress ring */}
            <svg className='circular-loader__svg circular-loader__svg--progress' viewBox='0 0 260 260'>
                <defs>
                    <linearGradient id='progressGradient' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' stopColor={primaryColor} />
                        <stop offset='50%' stopColor={secondaryColor} />
                        <stop offset='100%' stopColor={primaryColor} />
                    </linearGradient>
                    <filter id='glow'>
                        <feGaussianBlur stdDeviation='3' result='coloredBlur' />
                        <feMerge>
                            <feMergeNode in='coloredBlur' />
                            <feMergeNode in='SourceGraphic' />
                        </feMerge>
                    </filter>
                </defs>
                <circle
                    cx='130'
                    cy='130'
                    r='120'
                    fill='none'
                    stroke='url(#progressGradient)'
                    strokeWidth='6'
                    strokeLinecap='round'
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    filter='url(#glow)'
                    transform='rotate(-90 130 130)'
                    className={isComplete ? 'circular-loader__progress--complete' : ''}
                />
            </svg>

            {/* Dotted secondary ring */}
            <div
                className='circular-loader__dotted-ring'
                style={{
                    borderColor: `${secondaryColor}60`,
                }}
            />

            {/* Floating particles */}
            <div className='circular-loader__particles'>
                {particles.map(particle => (
                    <div
                        key={particle.id}
                        className='circular-loader__particle'
                        style={
                            {
                                '--particle-angle': `${particle.angle}deg`,
                                '--particle-delay': `${particle.delay}s`,
                                backgroundColor: particle.id % 2 === 0 ? primaryColor : secondaryColor,
                                boxShadow: `0 0 10px ${particle.id % 2 === 0 ? primaryColor : secondaryColor}`,
                            } as React.CSSProperties
                        }
                    />
                ))}
            </div>

            {/* Center content */}
            <div
                className='circular-loader__center'
                style={{
                    background: `radial-gradient(circle, ${primaryColor}15 0%, transparent 70%)`,
                }}
            >
                {/* Logo */}
                <div
                    className='circular-loader__logo'
                    style={{
                        color: primaryColor,
                        textShadow: `0 0 20px ${primaryColor}80`,
                    }}
                >
                    <TrendingUp size={40} strokeWidth={1.5} />
                </div>

                {/* Percentage */}
                <div className='circular-loader__percentage' style={{ color: accentColor }}>
                    {Math.round(progress)}
                    <span className='circular-loader__percentage-symbol'>%</span>
                </div>

                {/* Site name */}
                <div className='circular-loader__site-name' style={{ color: `${accentColor}80` }}>
                    {siteName}
                </div>
            </div>

            {/* Complete indicator */}
            {isComplete && (
                <div
                    className='circular-loader__complete-pulse'
                    style={{
                        boxShadow: `0 0 0 0 ${primaryColor}60`,
                    }}
                />
            )}
        </div>
    );
};
