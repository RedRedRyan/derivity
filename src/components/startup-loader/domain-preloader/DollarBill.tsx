import React from 'react';

interface DollarBillProps {
    size: number;
    color: string;
    rotation: number;
}

export const DollarBill: React.FC<DollarBillProps> = ({ size, color, rotation }) => {
    const scale = size / 100;

    return (
        <svg
            width={size * 1.5}
            height={size}
            viewBox='0 0 120 60'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
            style={{
                transform: `rotate(${rotation}deg)`,
                filter: `drop-shadow(0 4px 8px ${color}40)`,
            }}
        >
            {/* Bill background */}
            <rect
                x='2'
                y='2'
                width='116'
                height='56'
                rx='4'
                fill={color}
                fillOpacity='0.15'
                stroke={color}
                strokeOpacity='0.6'
                strokeWidth='1.5'
            />

            {/* Inner border */}
            <rect x='6' y='6' width='108' height='48' rx='2' stroke={color} strokeOpacity='0.3' strokeWidth='0.5' />

            {/* Dollar sign */}
            <text
                x='60'
                y='38'
                textAnchor='middle'
                fill={color}
                fillOpacity='0.8'
                fontSize='28'
                fontWeight='bold'
                fontFamily='Georgia, serif'
            >
                $
            </text>

            {/* Corner decorations */}
            <text x='14' y='22' fill={color} fillOpacity='0.5' fontSize='10' fontWeight='bold'>
                $
            </text>
            <text x='102' y='48' fill={color} fillOpacity='0.5' fontSize='10' fontWeight='bold'>
                $
            </text>

            {/* Decorative lines */}
            <line x1='30' y1='8' x2='30' y2='52' stroke={color} strokeOpacity='0.2' strokeWidth='0.5' />
            <line x1='90' y1='8' x2='90' y2='52' stroke={color} strokeOpacity='0.2' strokeWidth='0.5' />
        </svg>
    );
};
