import { useCallback, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DBOT_TABS } from '@/constants/bot-contents';
import { load, save_types } from '@/external/bot-skeleton';
import { useStore } from '@/hooks/useStore';
import { API_BASE } from '@/utils/api-base';
import DashboardHero from './dashboard-hero';
import BotPitchForm from './components/submit-form';
import { TBotIdea } from './types';
import './bot-ideas.scss';

const MIN_STRATEGY_LENGTH = 120;
const MIN_RUNS_FOR_RATING = 3;
const DEVELOPER_DISPLAY_NAME = 'Mr Duke';

const formatDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return iso;
    }
};

const formatMoney = (value: number | string | null | undefined) => {
    const n = Number(value || 0);
    const sign = n < 0 ? '-' : '';
    return `${sign}$${Math.abs(n).toFixed(2)}`;
};

const computeStars = (profits: number, losses: number) => {
    const total = (profits || 0) + (losses || 0);
    if (total < MIN_RUNS_FOR_RATING) return 0;
    const rate = profits / total;
    if (rate >= 0.8) return 5;
    if (rate >= 0.6) return 4;
    if (rate >= 0.4) return 3;
    if (rate >= 0.2) return 2;
    return 1;
};

const StarRating = ({ profits, losses }: { profits: number; losses: number }) => {
    const stars = computeStars(profits, losses);
    if (stars === 0) {
        return <span className='bi-idea-card__rating bi-idea-card__rating--new'>New – not enough runs</span>;
    }
    return (
        <span className='bi-idea-card__rating' title={`${stars} out of 5`}>
            {Array.from({ length: 5 }, (_, i) => (
                <span
                    key={i}
                    className={`bi-idea-card__star${i < stars ? ' bi-idea-card__star--filled' : ''}`}
                    aria-hidden='true'
                >
                    ★
                </span>
            ))}
            <span className='bi-idea-card__rating-value'>{stars}/5</span>
        </span>
    );
};

const BotIdeas = observer(() => {
    const { client, dashboard, toolbar } = useStore();
    const { setActiveTab } = dashboard;
    const [ideas, setIdeas] = useState<TBotIdea[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editStrategy, setEditStrategy] = useState('');
    const [savingId, setSavingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [attachingId, setAttachingId] = useState<number | null>(null);
    const [attachError, setAttachError] = useState<string | null>(null);
    const [detachingId, setDetachingId] = useState<number | null>(null);

    const fetchIdeas = useCallback(async (attempt = 1, silent = false) => {
        if (attempt === 1 && !silent) {
            setLoading(true);
            setError(null);
        }
        try {
            const res = await fetch(`${API_BASE}/bot-ideas`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: TBotIdea[] = await res.json();
            setIdeas(data);
            if (!silent) setLoading(false);
        } catch {
            if (attempt < 3) {
                // Stay in loading state while retrying (handles API startup race)
                setTimeout(() => fetchIdeas(attempt + 1, silent), 1000);
                return;
            }
            if (!silent) {
                setError('Could not load bot ideas. Please try again later.');
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchIdeas();
        const interval = setInterval(() => fetchIdeas(1, true), 30_000);
        return () => clearInterval(interval);
    }, [fetchIdeas]);

    const handleIdeaSubmitted = useCallback((idea: TBotIdea) => {
        setIdeas(prev => [idea, ...prev]);
    }, []);

    const startEdit = (idea: TBotIdea) => {
        setEditingId(idea.id);
        setEditName(idea.bot_name);
        setEditStrategy(idea.strategy_description);
        setActionError(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditStrategy('');
        setActionError(null);
    };

    const saveEdit = async (id: number) => {
        if (editStrategy.trim().length <= MIN_STRATEGY_LENGTH) {
            setActionError(`Strategy description must be more than ${MIN_STRATEGY_LENGTH} characters.`);
            return;
        }
        setSavingId(id);
        setActionError(null);
        try {
            const res = await fetch(`${API_BASE}/bot-ideas/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bot_name: editName,
                    strategy_description: editStrategy,
                    submitted_by: client.loginid,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to update idea');
            }
            const updated: TBotIdea = await res.json();
            setIdeas(prev => prev.map(i => (i.id === id ? updated : i)));
            cancelEdit();
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to update idea');
        } finally {
            setSavingId(null);
        }
    };

    const loadBotXml = async (idea: TBotIdea) => {
        if (!idea.has_bot_xml || loadingId) return;
        setLoadingId(idea.id);
        setLoadError(null);
        try {
            const res = await fetch(`${API_BASE}/bot-ideas/${idea.id}/xml`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { bot_xml } = (await res.json()) as { bot_xml: string };
            const workspace = window.Blockly?.derivWorkspace;
            if (!workspace) throw new Error('Workspace not ready');
            await load({
                block_string: bot_xml,
                file_name: idea.bot_name,
                workspace,
                from: save_types.LOCAL,
                drop_event: {},
                strategy_id: null,
                showIncompatibleStrategyDialog: false,
            });
            toolbar.setStrategyProtected(false);
            setActiveTab(DBOT_TABS.BOT_BUILDER);
        } catch (err: unknown) {
            setLoadError(err instanceof Error ? err.message : 'Failed to load bot.');
            setTimeout(() => setLoadError(null), 4000);
        } finally {
            setLoadingId(null);
        }
    };

    const attachBot = async (idea: TBotIdea, file: File) => {
        if (!client.is_logged_in || !client.loginid) {
            setAttachError('Please log in to attach a bot.');
            return;
        }
        if (!file.name.toLowerCase().endsWith('.xml')) {
            setAttachError('Only .xml files are supported.');
            return;
        }
        if (file.size > 1024 * 1024) {
            setAttachError('File is larger than 1 MB.');
            return;
        }
        setAttachingId(idea.id);
        setAttachError(null);
        try {
            const bot_xml = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = () => reject(new Error('Could not read file'));
                reader.readAsText(file);
            });
            const res = await fetch(`${API_BASE}/bot-ideas/${idea.id}/bot-xml`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submitted_by: client.loginid,
                    bot_xml,
                    bot_xml_filename: file.name,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to attach bot');
            }
            const updated: TBotIdea = await res.json();
            setIdeas(prev => prev.map(i => (i.id === idea.id ? updated : i)));
        } catch (err: unknown) {
            setAttachError(err instanceof Error ? err.message : 'Failed to attach bot');
            setTimeout(() => setAttachError(null), 4000);
        } finally {
            setAttachingId(null);
        }
    };

    const detachBot = async (id: number) => {
        // eslint-disable-next-line no-alert
        if (!window.confirm('Remove the attached bot from this idea?')) return;
        setDetachingId(id);
        setAttachError(null);
        try {
            const res = await fetch(`${API_BASE}/bot-ideas/${id}/bot-xml`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submitted_by: client.loginid }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to remove bot');
            }
            const updated: TBotIdea = await res.json();
            setIdeas(prev => prev.map(i => (i.id === id ? updated : i)));
        } catch (err: unknown) {
            setAttachError(err instanceof Error ? err.message : 'Failed to remove bot');
            setTimeout(() => setAttachError(null), 4000);
        } finally {
            setDetachingId(null);
        }
    };

    const deleteIdea = async (id: number) => {
        // eslint-disable-next-line no-alert
        if (!window.confirm('Delete this idea? This cannot be undone.')) return;
        setDeletingId(id);
        setActionError(null);
        try {
            const res = await fetch(`${API_BASE}/bot-ideas/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submitted_by: client.loginid }),
            });
            if (!res.ok && res.status !== 204) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to delete idea');
            }
            setIdeas(prev => prev.filter(i => i.id !== id));
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to delete idea');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className='bot-ideas-page'>
            <DashboardHero />
            <div className='bot-ideas-page__inner'>
                <BotPitchForm onIdeaSubmitted={handleIdeaSubmitted} />

                <section className='bi-ideas-list'>
                    <h3 className='bi-ideas-list__heading'>Community Bot Ideas</h3>

                    {loading && <p className='bi-ideas-list__status'>Loading ideas…</p>}
                    {error && (
                        <div className='bi-ideas-list__error-block'>
                            <p className='bi-ideas-list__status bi-ideas-list__status--error'>{error}</p>
                            <button className='bi-ideas-list__retry-btn' onClick={() => fetchIdeas()}>
                                Retry
                            </button>
                        </div>
                    )}
                    {!loading && !error && ideas.length === 0 && (
                        <p className='bi-ideas-list__status'>No ideas yet. Be the first to submit one!</p>
                    )}

                    {ideas.length > 0 && (
                        <div className='bi-ideas-list__grid'>
                            {ideas.map(idea => {
                                const isOwner = client.is_logged_in && client.loginid === idea.submitted_by;
                                const isDeveloper =
                                    client.is_logged_in && !!idea.developed_by && client.loginid === idea.developed_by;
                                const canManageBot = isOwner || isDeveloper;
                                const isEditing = editingId === idea.id;
                                return (
                                    <div key={idea.id} className='bi-idea-card'>
                                        {isEditing ? (
                                            <>
                                                <input
                                                    className='bi-idea-card__edit-input'
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    placeholder='Bot name'
                                                />
                                                <textarea
                                                    className='bi-idea-card__edit-textarea'
                                                    value={editStrategy}
                                                    onChange={e => setEditStrategy(e.target.value)}
                                                    rows={4}
                                                />
                                                <p className='bi-idea-card__edit-hint'>
                                                    {editStrategy.trim().length}/{MIN_STRATEGY_LENGTH} characters
                                                    minimum
                                                </p>
                                                {actionError && (
                                                    <p className='bi-idea-card__edit-error'>{actionError}</p>
                                                )}
                                                <div className='bi-idea-card__actions'>
                                                    <button
                                                        className='bi-idea-card__action-btn bi-idea-card__action-btn--save'
                                                        onClick={() => saveEdit(idea.id)}
                                                        disabled={savingId === idea.id}
                                                    >
                                                        {savingId === idea.id ? 'Saving…' : 'Save'}
                                                    </button>
                                                    <button
                                                        className='bi-idea-card__action-btn bi-idea-card__action-btn--cancel'
                                                        onClick={cancelEdit}
                                                        disabled={savingId === idea.id}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className='bi-idea-card__header'>
                                                    <span className='bi-idea-card__name'>{idea.bot_name}</span>
                                                    <span className='bi-idea-card__date'>
                                                        {formatDate(idea.submitted_at)}
                                                    </span>
                                                </div>
                                                <p className='bi-idea-card__submitter'>
                                                    Submitted by <strong>{idea.submitted_by}</strong>
                                                    {isOwner && <span className='bi-idea-card__owner-tag'> (you)</span>}
                                                </p>
                                                <p className='bi-idea-card__desc'>{idea.strategy_description}</p>
                                                <div className='bi-idea-card__stats'>
                                                    <span className='bi-idea-card__stat bi-idea-card__stat--runs'>
                                                        🔄 {idea.total_runs ?? 0} Runs
                                                    </span>
                                                    <span className='bi-idea-card__stat bi-idea-card__stat--profit'>
                                                        ✅ {idea.profits} Wins · +{formatMoney(idea.profit_amount)}
                                                    </span>
                                                    <span className='bi-idea-card__stat bi-idea-card__stat--loss'>
                                                        ❌ {idea.losses} Losses · -{formatMoney(idea.loss_amount)}
                                                    </span>
                                                </div>
                                                <StarRating profits={idea.profits} losses={idea.losses} />
                                                {idea.has_bot_xml && (
                                                    <>
                                                        <p className='bi-idea-card__attachment'>
                                                            📎 XML bot attached
                                                            {idea.bot_xml_filename ? `: ${idea.bot_xml_filename}` : ''}
                                                        </p>
                                                        <p className='bi-idea-card__developer'>
                                                            Developed by <strong>{DEVELOPER_DISPLAY_NAME}</strong>
                                                            {isDeveloper && !isOwner && (
                                                                <span className='bi-idea-card__owner-tag'> (you)</span>
                                                            )}
                                                        </p>
                                                    </>
                                                )}
                                                {!idea.has_bot_xml && client.is_logged_in && (
                                                    <p className='bi-idea-card__attachment bi-idea-card__attachment--empty'>
                                                        🛠 No bot attached yet — any developer can contribute one.
                                                    </p>
                                                )}
                                                {loadError && loadingId === null && (
                                                    <p className='bi-idea-card__edit-error'>{loadError}</p>
                                                )}
                                                {attachError && (
                                                    <p className='bi-idea-card__edit-error'>{attachError}</p>
                                                )}
                                                <div className='bi-idea-card__actions'>
                                                    {idea.has_bot_xml && (
                                                        <button
                                                            className='bi-idea-card__action-btn bi-idea-card__action-btn--load'
                                                            onClick={() => loadBotXml(idea)}
                                                            disabled={loadingId === idea.id}
                                                        >
                                                            {loadingId === idea.id ? 'Loading…' : '▶ Load bot'}
                                                        </button>
                                                    )}
                                                    {!idea.has_bot_xml && client.is_logged_in && (
                                                        <label className='bi-idea-card__action-btn bi-idea-card__action-btn--attach'>
                                                            {attachingId === idea.id ? 'Attaching…' : '📎 Attach bot'}
                                                            <input
                                                                type='file'
                                                                accept='.xml,application/xml,text/xml'
                                                                hidden
                                                                disabled={attachingId === idea.id}
                                                                onChange={e => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) attachBot(idea, file);
                                                                    e.target.value = '';
                                                                }}
                                                            />
                                                        </label>
                                                    )}
                                                    {idea.has_bot_xml && canManageBot && (
                                                        <button
                                                            className='bi-idea-card__action-btn bi-idea-card__action-btn--detach'
                                                            onClick={() => detachBot(idea.id)}
                                                            disabled={detachingId === idea.id}
                                                        >
                                                            {detachingId === idea.id ? 'Removing…' : 'Remove bot'}
                                                        </button>
                                                    )}
                                                    {isOwner && (
                                                        <>
                                                            <button
                                                                className='bi-idea-card__action-btn bi-idea-card__action-btn--edit'
                                                                onClick={() => startEdit(idea)}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                className='bi-idea-card__action-btn bi-idea-card__action-btn--delete'
                                                                onClick={() => deleteIdea(idea.id)}
                                                                disabled={deletingId === idea.id}
                                                            >
                                                                {deletingId === idea.id ? 'Deleting…' : 'Delete'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
});

export default BotIdeas;
