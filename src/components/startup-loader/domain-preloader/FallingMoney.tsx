import React, { useMemo, useEffect, useState } from 'react';
import { DollarBill } from './DollarBill';

interface FallingMoneyProps {
    symbols: string[];
    primaryColor: string;
    secondaryColor: string;
}

interface Particle {
    id: number;
    type: 'bill' | 'symbol';
    symbol?: string;
    left: string;
    animationDuration: string;
    animationDelay: string;
    fontSize: string;
    opacity: number;
    color: string;
    rotation: number;
    drift: number;
    billSize: number;
    wobbleSpeed: number;
    spinDuration: string;
}

export const FallingMoney: React.FC<FallingMoneyProps> = ({ symbols, primaryColor, secondaryColor }) => {
    const [particleCount, setParticleCount] = useState(50);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        const updateParticleCount = () => {
            const width = window.innerWidth;
            if (width < 768) {
                setParticleCount(25); // Mobile
            } else if (width < 1024) {
                setParticleCount(40); // Tablet
            } else {
                setParticleCount(55); // Desktop - more particles
            }
        };

        updateParticleCount();
        window.addEventListener('resize', updateParticleCount);
        return () => window.removeEventListener('resize', updateParticleCount);
    }, []);

    const particles: Particle[] = useMemo(() => {
        return Array.from({ length: particleCount }, (_, i) => {
            const isBill = i % 3 !== 2; // 2/3 bills, 1/3 symbols

            return {
                id: i,
                type: isBill ? 'bill' : 'symbol',
                symbol: isBill ? undefined : symbols[Math.floor(Math.random() * symbols.length)],
                left: `${Math.random() * 100}%`,
                animationDuration: `${8 + Math.random() * 12}s`,
                animationDelay: `${Math.random() * 10}s`,
                fontSize: isBill ? 'inherit' : `${16 + Math.random() * 20}px`,
                opacity: 0.12 + Math.random() * 0.35,
                color: i % 3 === 0 ? primaryColor : i % 3 === 1 ? secondaryColor : 'rgba(255,255,255,0.7)',
                rotation: Math.random() * 360,
                drift: -50 + Math.random() * 100,
                billSize: 40 + Math.random() * 40,
                wobbleSpeed: 1 + Math.random() * 2,
                spinDuration: `${3 + Math.random() * 5}s`,
            };
        });
    }, [particleCount, symbols, primaryColor, secondaryColor]);

    if (prefersReducedMotion) {
        return null;
    }

    return (
        <div className='falling-money' aria-hidden='true'>
            {particles.map(particle => (
                <div
                    key={particle.id}
                    className={`falling-money__particle ${particle.type === 'bill' ? 'falling-money__particle--bill' : 'falling-money__particle--symbol'}`}
                    style={
                        {
                            left: particle.left,
                            animationDuration: particle.animationDuration,
                            animationDelay: particle.animationDelay,
                            opacity: particle.opacity,
                            '--particle-drift': `${particle.drift}px`,
                            '--particle-wobble-speed': `${particle.wobbleSpeed}s`,
                            '--particle-spin-duration': particle.spinDuration,
                            '--particle-size': `${particle.billSize}px`,
                        } as React.CSSProperties
                    }
                >
                    {particle.type === 'bill' ? (
                        <DollarBill size={particle.billSize} color={particle.color} rotation={particle.rotation} />
                    ) : (
                        <span
                            className='falling-money__symbol'
                            style={{
                                fontSize: particle.fontSize,
                                color: particle.color,
                                textShadow: `0 0 10px ${particle.color}`,
                            }}
                        >
                            {particle.symbol}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
};
