import { useEffect, useRef, useState } from 'react';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import './dashboard-hero.scss';

const TYPING_PHRASES = ['Hello Traders', 'Hello Risk Managers', 'Welcome Back'];
const TYPING_SPEED = 80;
const ERASE_SPEED = 40;
const PAUSE_AFTER_TYPE = 1800;
const PAUSE_AFTER_ERASE = 400;

const TypingHero = () => {
    const [displayed, setDisplayed] = useState('');
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [isTyping, setIsTyping] = useState(true);
    const [showCursor, setShowCursor] = useState(true);
    const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const phrase = TYPING_PHRASES[phraseIndex];

        if (isTyping) {
            if (displayed.length < phrase.length) {
                timeout.current = setTimeout(() => {
                    setDisplayed(phrase.slice(0, displayed.length + 1));
                }, TYPING_SPEED);
            } else {
                timeout.current = setTimeout(() => setIsTyping(false), PAUSE_AFTER_TYPE);
            }
        } else {
            if (displayed.length > 0) {
                timeout.current = setTimeout(() => {
                    setDisplayed(displayed.slice(0, -1));
                }, ERASE_SPEED);
            } else {
                timeout.current = setTimeout(() => {
                    setPhraseIndex(i => (i + 1) % TYPING_PHRASES.length);
                    setIsTyping(true);
                }, PAUSE_AFTER_ERASE);
            }
        }

        return () => {
            if (timeout.current) clearTimeout(timeout.current);
        };
    }, [displayed, isTyping, phraseIndex]);

    useEffect(() => {
        const cursorInterval = setInterval(() => setShowCursor(c => !c), 530);
        return () => clearInterval(cursorInterval);
    }, []);

    return (
        <div className='dh-hero'>
            <h1 className='dh-hero__title'>
                {displayed}
                <span className={`dh-hero__cursor${showCursor ? ' dh-hero__cursor--visible' : ''}`}>|</span>
            </h1>
            <p className='dh-hero__subtitle'>
                <span className='dh-hero__rocket'>🚀</span>
                <em>&ldquo;Every tick is an opportunity. Stay ready.&rdquo;</em>
            </p>
        </div>
    );
};

const QUICK_CARDS = [
    {
        id: 'load-bot',
        icon: '📁',
        iconColor: '#4c97ff',
        title: 'Load Bot',
        desc: 'Import an XML strategy from your device.',
        tab: DBOT_TABS.DASHBOARD,
    },
    {
        id: 'speed-bot',
        icon: '⚡',
        iconColor: '#ff8c42',
        title: 'Speed Bot',
        desc: 'Build a guided strategy quickly.',
        tab: DBOT_TABS.DASHBOARD,
    },
    {
        id: 'premium-bots',
        icon: '👑',
        iconColor: '#ffc107',
        title: 'Premium Bots',
        desc: 'Open advanced ready-made bots.',
        tab: DBOT_TABS.BEST_BOTS,
    },
    {
        id: 'free-bots',
        icon: '🛡️',
        iconColor: '#00d4aa',
        title: 'Free Bots',
        desc: 'Browse free strategies to load and edit.',
        tab: DBOT_TABS.BEST_BOTS,
    },
    {
        id: 'analysis-tool',
        icon: '📊',
        iconColor: '#ff6444',
        title: 'Analysis Tool',
        desc: 'Study signals before opening trades.',
        tab: DBOT_TABS.ANALYSIS_TOOL,
    },
];

const QuickAccessCards = () => {
    const { dashboard } = useStore();
    const { setActiveTab } = dashboard;

    return (
        <div className='dh-cards'>
            {QUICK_CARDS.map(card => (
                <button
                    key={card.id}
                    className='dh-card'
                    onClick={() => setActiveTab(card.tab)}
                    aria-label={card.title}
                >
                    <span className='dh-card__icon' style={{ color: card.iconColor }}>
                        {card.icon}
                    </span>
                    <div className='dh-card__body'>
                        <span className='dh-card__title'>{card.title}</span>
                        <span className='dh-card__desc'>{card.desc}</span>
                    </div>
                    <span className='dh-card__arrow' style={{ color: card.iconColor }}>
                        →
                    </span>
                </button>
            ))}
        </div>
    );
};

const TESTIMONIALS = [
    {
        id: 1,
        stars: 5,
        quote: '"Speed Bot got me from idea to a running strategy in minutes. Incredible tool."',
        name: 'Amara O.',
        role: 'Speed Bot user',
        initial: 'A',
        color: '#4c97ff',
    },
    {
        id: 2,
        stars: 5,
        quote: '"The premium bots are genuinely well-tested and profitable. Worth every cent."',
        name: 'Daniyar K.',
        role: 'Premium Bots user',
        initial: 'D',
        color: '#ff6444',
    },
    {
        id: 3,
        stars: 4,
        quote: '"I check the Analysis Tool before every session. It has saved me from bad trades."',
        name: 'Lucia F.',
        role: 'Analysis Tool user',
        initial: 'L',
        color: '#00d4aa',
    },
    {
        id: 4,
        stars: 5,
        quote: '"Started with the free bots, learned fast. Now running my own custom strategies."',
        name: 'Tunde A.',
        role: 'Free Bots user',
        initial: 'T',
        color: '#ffc107',
    },
    {
        id: 5,
        stars: 5,
        quote: '"Importing my XML strategy was seamless. RiskManagers just works."',
        name: 'Mei L.',
        role: 'Load Bot user',
        initial: 'M',
        color: '#8b5cf6',
    },
    {
        id: 6,
        stars: 4,
        quote: '"The dashboard layout makes everything easy to find. Love the clean design."',
        name: 'Samuel R.',
        role: 'Dashboard user',
        initial: 'S',
        color: '#10b981',
    },
];

const StarRow = ({ count }: { count: number }) => (
    <div className='dh-testimonial__stars'>
        {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={`dh-testimonial__star${i < count ? ' dh-testimonial__star--filled' : ''}`}>
                ★
            </span>
        ))}
    </div>
);

const TestimonialsSection = () => (
    <div className='dh-testimonials'>
        <h2 className='dh-testimonials__title'>WHAT TRADERS ARE SAYING</h2>
        <div className='dh-testimonials__grid'>
            {TESTIMONIALS.map(t => (
                <div key={t.id} className='dh-testimonial'>
                    <StarRow count={t.stars} />
                    <p className='dh-testimonial__quote'>{t.quote}</p>
                    <div className='dh-testimonial__author'>
                        <span className='dh-testimonial__avatar' style={{ background: t.color }}>
                            {t.initial}
                        </span>
                        <div>
                            <div className='dh-testimonial__name'>{t.name}</div>
                            <div className='dh-testimonial__role'>{t.role}</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const DashboardHero = () => (
    <div className='dh-wrapper'>
        <TypingHero />
        <QuickAccessCards />
        <TestimonialsSection />
    </div>
);

export default DashboardHero;
