import React from 'react';

type TLoaderIconProps = {
    size?: number;
    strokeWidth?: number;
};

const iconProps = (size: number, strokeWidth: number) => ({
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
});

export const TrendingUp = ({ size = 24, strokeWidth = 2 }: TLoaderIconProps) => (
    <svg {...iconProps(size, strokeWidth)} aria-hidden='true'>
        <polyline points='22 7 13.5 15.5 8.5 10.5 2 17' />
        <polyline points='16 7 22 7 22 13' />
    </svg>
);

export const Shield = ({ size = 24, strokeWidth = 2 }: TLoaderIconProps) => (
    <svg {...iconProps(size, strokeWidth)} aria-hidden='true'>
        <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z' />
    </svg>
);

export const Wifi = ({ size = 24, strokeWidth = 2 }: TLoaderIconProps) => (
    <svg {...iconProps(size, strokeWidth)} aria-hidden='true'>
        <path d='M5 13a10 10 0 0 1 14 0' />
        <path d='M8.5 16.5a5 5 0 0 1 7 0' />
        <path d='M12 20h.01' />
    </svg>
);

export const CheckCircle = ({ size = 24, strokeWidth = 2 }: TLoaderIconProps) => (
    <svg {...iconProps(size, strokeWidth)} aria-hidden='true'>
        <circle cx='12' cy='12' r='10' />
        <path d='m9 12 2 2 4-4' />
    </svg>
);
