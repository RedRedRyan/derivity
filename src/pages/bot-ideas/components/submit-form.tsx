import { useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { API_BASE } from '@/utils/api-base';
import { TBotIdea, TNotification } from '../types';

type TBotPitchFormProps = {
    onIdeaSubmitted: (idea: TBotIdea) => void;
};

const MIN_STRATEGY_LENGTH = 120;

const MAX_XML_BYTES = 1024 * 1024; // 1 MB

const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });

const BotPitchForm = observer(({ onIdeaSubmitted }: TBotPitchFormProps) => {
    const { client } = useStore();
    const [botName, setBotName] = useState('');
    const [strategy, setStrategy] = useState('');
    const [xmlFile, setXmlFile] = useState<File | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState<TNotification | null>(null);

    const autoResize = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    };

    const showNotification = (n: TNotification) => {
        setNotification(n);
        setTimeout(() => setNotification(null), 5000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!client.is_logged_in) {
            showNotification({ type: 'error', message: 'Please log in to submit a bot idea.' });
            return;
        }
        const loginid = client.loginid;
        if (!loginid) {
            showNotification({ type: 'error', message: 'Could not retrieve your account ID. Please log in again.' });
            return;
        }
        if (strategy.trim().length <= MIN_STRATEGY_LENGTH) {
            showNotification({
                type: 'error',
                message: `Your idea must be more than ${MIN_STRATEGY_LENGTH} characters. Please add more detail.`,
            });
            return;
        }
        setIsSubmitting(true);
        try {
            let bot_xml: string | undefined;
            let bot_xml_filename: string | undefined;
            if (xmlFile) {
                if (xmlFile.size > MAX_XML_BYTES) {
                    throw new Error('XML file is too large (max 1 MB).');
                }
                bot_xml = await readFileAsText(xmlFile);
                bot_xml_filename = xmlFile.name;
            }
            const res = await fetch(`${API_BASE}/bot-ideas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bot_name: botName,
                    strategy_description: strategy,
                    submitted_by: loginid,
                    bot_xml,
                    bot_xml_filename,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Server error');
            }
            const newIdea: TBotIdea = await res.json();
            setBotName('');
            setStrategy('');
            setXmlFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            showNotification({ type: 'success', message: 'Bot idea submitted successfully!' });
            onIdeaSubmitted(newIdea);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to submit. Please try again.';
            showNotification({ type: 'error', message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className='bpf'>
            <div className='bpf__card'>
                <h2 className='bpf__title'>Describe your bot idea</h2>
                {!client.is_logged_in && (
                    <p className='bpf__login-notice'>Log in with your Deriv account to submit a bot idea.</p>
                )}

                {notification && (
                    <div className={`bpf__notification bpf__notification--${notification.type}`}>
                        {notification.message}
                    </div>
                )}

                <form className='bpf__form' onSubmit={handleSubmit}>
                    <div className='bpf__field'>
                        <label className='bpf__label' htmlFor='bot_name'>
                            Bot Name
                        </label>
                        <input
                            id='bot_name'
                            className='bpf__input'
                            type='text'
                            placeholder=''
                            value={botName}
                            onChange={e => setBotName(e.target.value)}
                            required
                        />
                    </div>

                    <div className='bpf__field'>
                        <label className='bpf__label' htmlFor='strategy_description'>
                            Strategy Description
                        </label>
                        <textarea
                            ref={textareaRef}
                            id='strategy_description'
                            className='bpf__textarea'
                            placeholder=''
                            rows={4}
                            value={strategy}
                            onChange={e => {
                                setStrategy(e.target.value);
                                autoResize();
                            }}
                            required
                        />
                        <p
                            className={`bpf__hint${
                                strategy.trim().length > MIN_STRATEGY_LENGTH ? ' bpf__hint--ok' : ''
                            }`}
                        >
                            {strategy.trim().length}/{MIN_STRATEGY_LENGTH} characters minimum
                        </p>
                    </div>

                    <div className='bpf__field'>
                        <label className='bpf__label' htmlFor='bot_xml_file'>
                            Bot XML file <span className='bpf__label-meta'>(optional, .xml up to 1 MB)</span>
                        </label>
                        <input
                            ref={fileInputRef}
                            id='bot_xml_file'
                            className='bpf__file'
                            type='file'
                            accept='.xml,application/xml,text/xml'
                            onChange={e => setXmlFile(e.target.files?.[0] ?? null)}
                        />
                        {xmlFile && (
                            <div className='bpf__file-row'>
                                <span className='bpf__file-name'>{xmlFile.name}</span>
                                <button
                                    type='button'
                                    className='bpf__file-clear'
                                    onClick={() => {
                                        setXmlFile(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                >
                                    Remove file
                                </button>
                            </div>
                        )}
                    </div>

                    <button className='bpf__submit' type='submit' disabled={isSubmitting || !client.is_logged_in}>
                        {isSubmitting ? 'Submitting…' : '→ Submit Idea'}
                    </button>
                </form>
            </div>
        </div>
    );
});

export default BotPitchForm;
