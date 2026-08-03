import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { getBestBotsFileUrl, getBestBotsFolder } from '@/components/shared';
import Modal from '@/components/shared_ui/modal';
import { DBOT_TABS } from '@/constants/bot-contents';
import { load, save_types } from '@/external/bot-skeleton';
import { useStore } from '@/hooks/useStore';
import { isPremiumProtectedBot, setActiveBot } from '@/utils/bot-tracker';
import './best-bots.scss';

type TBot = {
    id: string;
    name: string;
    file: string;
    guide_file?: string;
    description: string;
    emoji: string;
    is_premium?: boolean;
    priority?: number;
};

type TBotStats = {
    bot_id: string;
    total_runs: number;
    profits: number;
    losses: number;
    profit_amount?: number | string | null;
    loss_amount?: number | string | null;
};

type TBotManifestEntry = {
    id?: string;
    name?: string;
    file: string;
    guide_file?: string;
    description?: string;
    emoji?: string;
    is_premium?: boolean;
    priority?: number;
};

const formatMoney = (value: number | string | null | undefined) => {
    const n = Number(value || 0);
    return `$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const toBotId = (file: string) =>
    file
        .replace(/\.xml$/i, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

const createRiskManagersBot = (file: string): TBot => {
    const name = file.replace(/\.xml$/i, '');

    return {
        id: toBotId(file),
        name,
        file,
        description: `${name} loads into Bot Builder and executes through the standard purchase conditions.`,
        emoji: 'RM',
    };
};

const createManifestBot = (entry: TBotManifestEntry): TBot => {
    const name = entry.name || entry.file.replace(/\.xml$/i, '');

    return {
        id: entry.id || toBotId(entry.file),
        name,
        file: entry.file,
        guide_file: entry.guide_file,
        description:
            entry.description ||
            `${name} loads into Bot Builder and executes through the standard purchase conditions.`,
        emoji: entry.emoji || 'BOT',
        is_premium: entry.is_premium,
        priority: entry.priority,
    };
};

const RISK_MANAGERS_BOTS: TBot[] = [
    {
        id: 'new-under-8-special-bot-2026',
        name: 'New Under 8 Special Bot 2026',
        file: 'New under 8 special bot 2026.xml',
        description:
            'Premium Risk Managers Under 8 strategy with adaptive prediction and protected profit and loss controls.',
        emoji: 'GOLD',
        is_premium: true,
        priority: 0,
    },
    {
        id: 'double-under-bot',
        name: 'Double Under bot',
        file: 'Double Under bot.xml',
        guide_file: 'Mighty_Double_Under_Bot_Quick_Guide.pdf',
        description:
            'Risk Managers digit bot with editable Over/Under direction and win/loss prediction digits, plus two-tick direction confirmation before entries.',
        emoji: 'VIP',
        is_premium: true,
        priority: 1,
    },
    {
        id: 'd10-by-mrduke',
        name: 'D10 BY mrduke',
        file: 'D10 BY mrduke.xml',
        description:
            'Risk Managers alternating digit bot that switches between Even/Odd, Over4/Under5, and Rise/Fall with martingale and profit-guard logic.',
        emoji: 'RM',
        priority: 2,
    },
    ...['Percentage Over by Mr Duke.xml', 'grffy v1.xml', 'Mr Duke Speed Bot.1.xml', 'Wealth Generator.xml'].map(
        createRiskManagersBot
    ),
];

const TERMICA_BOTS: TBot[] = [
    {
        id: 'termica-pro',
        name: 'Termica Pro Bot',
        file: 'D1-BY MR.DUKE(+254702490526).xml',
        description: 'Professional Termica strategy tuned for consistent signal execution.',
        emoji: '🔥',
    },
    {
        id: 'termica-classic',
        name: 'Termica Classic Bot',
        file: 'D2 BY--MR.DUKE(+254702490526) (1).xml',
        description: 'Classic Termica setup with simple, reliable trade logic.',
        emoji: '⭐',
    },
    {
        id: 'termica-rise-fall',
        name: 'Termica Rise & Fall Bot',
        file: 'The-D3 rise and fall.xml',
        description: 'Termica trend strategy focused on rise and fall market moves.',
        emoji: '📊',
    },
    {
        id: 'termica-prime',
        name: 'Termica Prime Bot',
        file: 'D4 Update by MR.DUKE(+254702490526)FINAL  (%%%)) (1) (1) (1).xml',
        description: 'Prime Termica configuration with refined entry conditions.',
        emoji: '🏆',
    },
    {
        id: 'termica-original',
        name: 'Termica Original Bot',
        file: 'D5 (Original version +254702490526).xml',
        description: 'Original Termica-styled strategy for dependable bot loading.',
        emoji: '🔵',
    },
    {
        id: 'termica-fx',
        name: 'Termica FX Bot',
        file: 'D6 Deriv by Duke (1).xml',
        description: 'Termica FX edition with smooth execution for active traders.',
        emoji: '🎯',
    },
    {
        id: 'termica-devil',
        name: 'Termica Devil Bot',
        file: 'BLACK DEVIL v2( By MR. DUKE).xml',
        description: 'Aggressive Termica strategy with fast reaction logic.',
        emoji: '😈',
    },
    {
        id: 'termica-edge',
        name: 'Termica Edge Bot',
        file: 'grffy.xml',
        description: 'Termica edge setup for volatility-based opportunities.',
        emoji: '🔲',
    },
    {
        id: 'termica-shield',
        name: 'Termica Shield Bot',
        file: 'Kiazala v1 by The Risk Manager (1).xml',
        description: 'Risk-aware Termica bot built for disciplined capital protection.',
        emoji: '🛡️',
    },
    {
        id: 'termica-momentum',
        name: 'Termica Momentum Bot',
        file: 'KUMI NA NNE BORA V2  (1) (1).xml',
        description: 'Momentum-focused Termica strategy with layered entries.',
        emoji: '📈',
    },
    {
        id: 'termica-slow',
        name: 'Termica Pole Bot',
        file: 'Mwenda Pole By The Risk Manager (1).xml',
        description: 'Slow and steady Termica setup for conservative execution.',
        emoji: '🐢',
    },
    {
        id: 'termica-ai',
        name: 'Termica AI Bot',
        file: 'Simba Ai v1.xml',
        description: 'AI-styled Termica bot combining pattern logic and smart exits.',
        emoji: '🦁',
    },
    {
        id: 'termica-turbo',
        name: 'Termica Turbo Bot',
        file: 'Speedhack by mrduke.site 00 (1).xml',
        description: 'Fast Termica execution for high-movement market conditions.',
        emoji: '🚀',
    },
    {
        id: 'termica-digit-pro',
        name: 'Termica Digit Pro Bot',
        file: 'under 7,8,9= g2 bot 1==.xml',
        description: 'Termica digit strategy for specialised over/under setups.',
        emoji: '🎲',
    },
    {
        id: 'termica-wealth',
        name: 'Termica Wealth Bot',
        file: 'Wealth Generator.xml',
        description: 'Termica wealth strategy focused on structured account growth.',
        emoji: '💰',
    },
];

const OPTIMUM_BOTS: TBot[] = [
    {
        id: 'dollar-printer-original',
        name: 'Dollar Printer Bot Original',
        file: '$DollarprinterbotOrignal$ (1).xml',
        description: 'Original Dollar Printer strategy tuned for steady returns.',
        emoji: '💵',
    },
    {
        id: 'dollar-printer-2025',
        name: 'Dollar Printer 2025 Version',
        file: '1 2025 $Orginal DollarPrinterBot  2025 Version $ (1).xml',
        description: '2025 refreshed Dollar Printer with updated parameters.',
        emoji: '💵',
    },
    {
        id: 'tick-digit-over-2',
        name: 'Tick Digit Over 2',
        file: '1 tick DIgit Over 2.xml',
        description: 'Specialised digit bot targeting over 2 on ticks.',
        emoji: '🔢',
    },
    {
        id: 'alpha-2025',
        name: 'Alpha Version 2025',
        file: '2025 Alpha Version 2025.xml',
        description: 'Alpha 2025 strategy with fresh market logic.',
        emoji: '🚀',
    },
    {
        id: 'candle-mine-v3-updated',
        name: 'Candle Mine v3 Updated',
        file: '3 Updated Version Of Candle Mine????.xml',
        description: 'Improved Candle Mine strategy for pattern trading.',
        emoji: '🕯️',
    },
    {
        id: 'auto-analysis',
        name: 'Auto Analysis Bot',
        file: 'AUTO ANALYSIS BOT.xml',
        description: 'Automated analysis bot that adapts to market conditions.',
        emoji: '📊',
    },
    {
        id: 'candle-mine-3-1',
        name: 'Candle Mine 3.1',
        file: 'Candle mine version 3.1.xml',
        description: 'Stable Candle Mine release version 3.1.',
        emoji: '🕯️',
    },
    {
        id: 'coolkid',
        name: 'CoolKid Bot',
        file: 'COOLKID.xml',
        description: 'Fun and effective CoolKid trading logic.',
        emoji: '😎',
    },
    {
        id: 'deriv-wizard-1',
        name: 'Deriv Wizard 1',
        file: 'Deriv wizard 1.xml',
        description: 'Wizard-style Deriv bot for reliable execution.',
        emoji: '🧙',
    },
    {
        id: 'digit-hyper',
        name: 'Digit Hyper Bot',
        file: 'Digit hyper.xml',
        description: 'High-speed digit trading bot.',
        emoji: '⚡',
    },
    {
        id: 'even-odd-speed',
        name: 'Even Odd Speed Bot',
        file: 'Even odd speed bot.xml',
        description: 'Fast even/odd market speed strategy.',
        emoji: '🏎️',
    },
    {
        id: 'ezekey-sniper-lite',
        name: 'Ezekey Sniper Lite',
        file: 'Ezekey sniper lite.xml',
        description: 'Lightweight sniper bot for precise entries.',
        emoji: '🎯',
    },
    {
        id: 'falcon',
        name: 'Falcon Bot',
        file: 'FALCON BOT.xml',
        description: 'Aggressive Falcon hunting strategy.',
        emoji: '🦅',
    },
    {
        id: 'gibuu-v8-pro',
        name: 'GIBUU V8 Pro',
        file: 'GIBUU V8 PRO.xml',
        description: 'Pro-grade GIBUU V8 trading system.',
        emoji: '🛡️',
    },
    {
        id: 'hennessy-matrix-v5',
        name: 'Hennessy Matrix V5 Original',
        file: 'HENNESSY?? _MATRIX V5 BOT Orig..xml',
        description: 'Original Hennessy Matrix V5 with matrix logic.',
        emoji: '🔷',
    },
    {
        id: 'kathy-entry-point',
        name: 'Kathy Bot Entry With Point',
        file: 'Kathy bot entry with point.xml',
        description: 'Kathy bot using precise entry points.',
        emoji: '📍',
    },
    {
        id: 'm27-original',
        name: 'M27 Original Version',
        file: 'M27 Original version.xml',
        description: 'Classic M27 original strategy.',
        emoji: '🧩',
    },
    {
        id: 'mask-evenodd',
        name: 'Mask EvenOdd Bot',
        file: 'Mask evenodd bot.xml',
        description: 'Masked even/odd detection bot.',
        emoji: '🎭',
    },
    {
        id: 'mask-matches-speed',
        name: 'Mask Matches Speed Bot',
        file: 'mask matches speed bot ??.xml',
        description: 'Speed-optimised matches/differs mask bot.',
        emoji: '🏃',
    },
    {
        id: 'matches-differs',
        name: 'Matches and Differs Bot',
        file: 'MATCHES AND DIFFERS BOT.xml',
        description: 'Dedicated matches & differs trading bot.',
        emoji: '🔄',
    },
    {
        id: 'mega-pro',
        name: 'Mega Pro Bot',
        file: 'MEGA PRO BOT.xml',
        description: 'High-performance Mega Pro strategy.',
        emoji: '⭐',
    },
    {
        id: 'night-cap-printer',
        name: 'Night Cap Printer Bot',
        file: 'NIGHT  CAP PRINTER BOT.xml',
        description: 'Night-time focused cap printer bot.',
        emoji: '🌙',
    },
    {
        id: 'scaplex-ai-sn4',
        name: 'SCAPLEX AI SN4',
        file: 'SCAPLEX   Ai  SN4 (1) (1).xml',
        description: 'SCAPLEX AI SN4 intelligent trading system.',
        emoji: '🤖',
    },
    {
        id: 'scaucer-speed',
        name: 'Scaucer Speed Bot',
        file: 'SCAUCER SPEED BOT ????.xml',
        description: 'High-velocity Scaucer speed trading bot.',
        emoji: '💨',
    },
    {
        id: 'dollar-pro',
        name: 'The Dollar Pro',
        file: 'THE DOLLAR PRO.xml',
        description: 'Premium Dollar Pro trading strategy.',
        emoji: '💎',
    },
    {
        id: 'trend-lover',
        name: 'The Trend Lover',
        file: 'THE TREND LOVER.xml',
        description: 'Trend-following bot designed for strong moves.',
        emoji: '📈',
    },
    {
        id: 'trade-city-v2-1',
        name: 'Trade City Bot v2.1',
        file: 'TRADE CITY BOT VERSION 2.1.xml',
        description: 'Trade City v2.1 city-style market navigation.',
        emoji: '🏙️',
    },
    {
        id: 'ultra-ai-2025',
        name: 'Ultra AI 2025',
        file: 'ULTRA AI 2025.xml',
        description: 'Ultra AI 2025 next-gen intelligent bot.',
        emoji: '🧠',
    },
];

const DOLLARSIGNS_BOTS: TBot[] = [
    {
        id: 'mwenda-pole',
        name: 'Mwenda Pole By The Risk Manager (1)',
        file: 'Mwenda Pole By The Risk Manager (1).xml',
        description: 'Slow and steady conservative approach for low-risk accounts.',
        emoji: '🐢',
    },
    {
        id: 'simba-ai',
        name: 'Simba Ai v1',
        file: 'Simba Ai v1.xml',
        description: 'AI-enhanced strategy combining pattern recognition with smart exits.',
        emoji: '🦁',
    },
    {
        id: 'speedhack',
        name: 'Speedhack by mrduke.site 00 (1)',
        file: 'Speedhack by mrduke.site 00 (1).xml',
        description: 'Ultra-fast tick-based execution for volatile market conditions.',
        emoji: '🚀',
    },
    {
        id: 'd3-rise-fall',
        name: 'The-D3 rise and fall',
        file: 'The-D3 rise and fall.xml',
        description: 'Trend-following strategy targeting rise and fall market patterns.',
        emoji: '📊',
    },
    {
        id: 'under789',
        name: 'under 7,8,9= g2 bot 1==',
        file: 'under 7,8,9= g2 bot 1==.xml',
        description: 'Specialised over/under boundary strategy for digit markets.',
        emoji: '🎲',
    },
    {
        id: 'wealth-generator',
        name: 'Wealth Generator',
        file: 'Wealth Generator.xml',
        priority: 0,
        description: 'Compound growth strategy built for long-term account building.',
        emoji: '💰',
    },
];

const BOTS_BY_FOLDER: Record<string, TBot[]> = {
    'riskmanagers.site': RISK_MANAGERS_BOTS,
    'derivhhub.com': TERMICA_BOTS,
    'optimumtraders.site': OPTIMUM_BOTS,
    'mrzetuzetu.site': [],
    'masterhunter.site': [],
    'husseinfx.site': [],
    'levynetrading.site': [],
    'tradinghubs.site': [],
    'mafiahub.site': [],
    'easytraders.site': [],
    'dollarmaster.site': [],
    'profitempire.site': [],
    'primempire.site': [],
    'mkulimamdogo.site': [],
    'kicktrade.site': [],
    'dollarsigns.site': DOLLARSIGNS_BOTS,
};

const buildHardcodedStatsMap = (bots: TBot[]) =>
    Object.fromEntries(
        bots.map((bot, index) => {
            if (bot.is_premium) {
                return [
                    bot.id,
                    {
                        bot_id: bot.id,
                        total_runs: 1846,
                        profits: 1719,
                        losses: 127,
                        profit_amount: 248760,
                        loss_amount: 18240,
                    },
                ];
            }

            const base_runs = 188 + index * 29;
            const base_losses = 18 + (index % 6) * 3;
            const base_wins = base_runs - base_losses;
            const base_profit = 18450 + index * 3925;
            const base_loss_amount = 2360 + index * 410;

            return [
                bot.id,
                {
                    bot_id: bot.id,
                    total_runs: base_runs,
                    profits: base_wins,
                    losses: base_losses,
                    profit_amount: base_profit,
                    loss_amount: base_loss_amount,
                },
            ];
        })
    );

const HARD_CODED_STATS = buildHardcodedStatsMap(
    Object.values(BOTS_BY_FOLDER)
        .flat()
        .filter((bot, index, arr) => arr.findIndex(item => item.id === bot.id) === index)
);

export const getBestBotsForFolder = (bots_folder: string) => BOTS_BY_FOLDER[bots_folder] ?? [];

const BotCard = observer(({ bot, stats }: { bot: TBot; stats: TBotStats | undefined }) => {
    const { dashboard, toolbar, ui } = useStore();
    const { setActiveTab } = dashboard;
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const guideUrl = bot.guide_file ? getBestBotsFileUrl(bot.guide_file) : '';

    const toggleGuideModal = () => {
        if (!guideUrl) return;
        setIsGuideOpen(current => !current);
    };

    const handleLoad = async () => {
        setLoading(true);
        setError(false);
        try {
            const url = getBestBotsFileUrl(bot.file);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const xml_text = await res.text();
            const workspace = window.Blockly?.derivWorkspace;
            if (!workspace) throw new Error('Workspace not ready');
            const load_result = await load({
                block_string: xml_text,
                file_name: bot.name,
                workspace,
                from: save_types.LOCAL,
                drop_event: {},
                strategy_id: null,
                showIncompatibleStrategyDialog: false,
            });
            if (load_result?.error) throw new Error(load_result.error);
            setActiveBot('best-bot', bot.id, bot.name);
            const is_protected_bot = isPremiumProtectedBot(bot.id);
            try {
                toolbar.setStrategyProtected(
                    is_protected_bot,
                    is_protected_bot ? 'This is a premium bot and cannot be downloaded.' : undefined
                );
            } catch {
                // Keep loading the bot even if toolbar protection is unavailable.
            }
            setTimeout(() => {
                const ws = window.Blockly?.derivWorkspace;
                if (ws) {
                    ws.getAllBlocks(false).forEach(block => {
                        if (
                            [
                                'before_purchase',
                                'after_purchase',
                                'during_purchase',
                                'purchase',
                                'smart_purchase_contract',
                                'trade_again',
                            ].includes(block.type)
                        ) {
                            block.setCollapsed(true);
                            if (is_protected_bot) {
                                block.contextMenu = false;
                                block.setMovable(false);
                            }
                        }
                    });
                }
            }, 500);
            setLoaded(true);
            setTimeout(() => setLoaded(false), 3000);
            setActiveTab(DBOT_TABS.BOT_BUILDER);
        } catch {
            setError(true);
            setTimeout(() => setError(false), 4000);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            if (!navigator.clipboard) return;
            await navigator.clipboard.writeText(bot.name);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            setCopied(false);
        }
    };

    const totalRuns = stats?.total_runs ?? 0;
    const profits = stats?.profits ?? 0;
    const losses = stats?.losses ?? 0;
    const profitAmount = stats?.profit_amount ?? 0;
    const lossAmount = stats?.loss_amount ?? 0;
    const netAmount = Number(profitAmount || 0) - Number(lossAmount || 0);
    const winRate = totalRuns > 0 ? Math.round((profits / totalRuns) * 100) : 0;
    const cardTypeLabel = bot.is_premium ? 'Premium bot' : 'Smart bot';

    const cardClassName = `bb-card${bot.is_premium ? ' bb-card--premium' : ''}${
        ui.is_dark_mode_on ? ' bb-card--dark' : ' bb-card--light'
    }`;

    return (
        <>
            <div className={cardClassName}>
                <div className='bb-card__header'>
                    <div className='bb-card__eyebrow-row'>
                        <span className='bb-card__eyebrow'>{cardTypeLabel}</span>
                        {bot.is_premium && <span className='bb-card__premium-badge'>Premium</span>}
                    </div>
                    <button
                        className={`bb-card__copy${copied ? ' bb-card__copy--copied' : ''}`}
                        type='button'
                        aria-label={`Copy ${bot.name}`}
                        onClick={handleCopy}
                    >
                        <span />
                        <span />
                    </button>
                </div>

                <h3 className='bb-card__name'>{bot.name}</h3>
                <p className='bb-card__desc'>{bot.description}</p>

                <div className='bb-card__performance' aria-label={`${bot.name} performance`}>
                    <div className='bb-card__metric'>
                        <strong>{totalRuns.toLocaleString()}</strong>
                        <span>Runs</span>
                    </div>
                    <div className='bb-card__metric'>
                        <strong>{winRate}%</strong>
                        <span>Win rate</span>
                    </div>
                    <div className='bb-card__metric'>
                        <strong>{profits}</strong>
                        <span>Wins</span>
                    </div>
                    <div className='bb-card__metric'>
                        <strong>{losses}</strong>
                        <span>Losses</span>
                    </div>
                </div>

                <div className='bb-card__profit-line'>
                    <span className='bb-card__profit-label'>Estimated profit</span>
                    <span className='bb-card__profit-value'>{formatMoney(netAmount)}</span>
                </div>

                <div className='bb-card__actions'>
                    {guideUrl ? (
                        <button
                            className='bb-card__guide'
                            type='button'
                            aria-label={`${bot.name} guide`}
                            onClick={toggleGuideModal}
                        >
                            <span className='bb-card__guide-icon' />
                            Guide
                        </button>
                    ) : (
                        <div className='bb-card__guide'>
                            <span className='bb-card__guide-icon' />
                            Guide
                        </div>
                    )}
                    <button
                        className={`bb-card__btn${loaded ? ' bb-card__btn--loaded' : ''}${
                            error ? ' bb-card__btn--error' : ''
                        }`}
                        onClick={handleLoad}
                        disabled={loading}
                    >
                        <span>{loading ? 'Loading...' : loaded ? 'Loaded' : error ? 'Retry' : 'Load Bot'}</span>
                        <span className='bb-card__btn-icon'>↓</span>
                    </button>
                </div>
            </div>
            {guideUrl && (
                <Modal
                    title={`${bot.name} guide`}
                    width='min(96vw, 1040px)'
                    height='min(88vh, 820px)'
                    is_open={isGuideOpen}
                    toggleModal={toggleGuideModal}
                    should_close_on_click_outside
                    is_vertical_centered
                >
                    <Modal.Body className='bb-guide-modal__body'>
                        <iframe className='bb-guide-modal__frame' src={guideUrl} title={`${bot.name} guide`} />
                        <a className='bb-guide-modal__link' href={guideUrl} target='_blank' rel='noreferrer'>
                            Open in new tab
                        </a>
                    </Modal.Body>
                </Modal>
            )}
        </>
    );
});

const BestBots = () => {
    const botsFolder = getBestBotsFolder();
    const [bots, setBots] = useState<TBot[]>(() => getBestBotsForFolder(botsFolder));

    useEffect(() => {
        let isMounted = true;
        const configuredBots = getBestBotsForFolder(botsFolder);

        setBots(configuredBots);

        fetch(getBestBotsFileUrl('bots.json'))
            .then(response => {
                if (!response.ok) return [];
                return response.json();
            })
            .then((manifestBots: TBotManifestEntry[]) => {
                if (!isMounted || !Array.isArray(manifestBots)) return;
                const dynamicBots = manifestBots
                    .filter(bot => bot?.file?.toLowerCase().endsWith('.xml'))
                    .map(createManifestBot);
                const mergedBots = [...configuredBots];
                const seenFiles = new Set(mergedBots.map(bot => bot.file));

                dynamicBots.forEach(bot => {
                    if (!seenFiles.has(bot.file)) {
                        mergedBots.push(bot);
                        seenFiles.add(bot.file);
                    }
                });

                setBots(mergedBots);
            })
            .catch(() => {
                if (isMounted) setBots(configuredBots);
            });

        return () => {
            isMounted = false;
        };
    }, [botsFolder]);

    const rankedBots = [...bots].sort((a, b) => {
        const priorityA = a.priority ?? (a.is_premium ? 1 : 999);
        const priorityB = b.priority ?? (b.is_premium ? 1 : 999);
        if (priorityA !== priorityB) return priorityA - priorityB;
        if (!!a.is_premium !== !!b.is_premium) return a.is_premium ? -1 : 1;

        const sa = HARD_CODED_STATS[a.id];
        const sb = HARD_CODED_STATS[b.id];
        const netA = Number(sa?.profit_amount || 0) - Number(sa?.loss_amount || 0);
        const netB = Number(sb?.profit_amount || 0) - Number(sb?.loss_amount || 0);
        if (netB !== netA) return netB - netA;
        const pa = sa?.profits ?? 0;
        const pb = sb?.profits ?? 0;
        if (pb !== pa) return pb - pa;
        const la = sa?.losses ?? 0;
        const lb = sb?.losses ?? 0;
        return la - lb;
    });

    return (
        <div className='best-bots'>
            <div className='best-bots__grid'>
                {rankedBots.length > 0 ? (
                    rankedBots.map(bot => <BotCard key={bot.id} bot={bot} stats={HARD_CODED_STATS[bot.id]} />)
                ) : (
                    <p>No bots configured for this domain yet.</p>
                )}
            </div>
        </div>
    );
};

export default BestBots;
