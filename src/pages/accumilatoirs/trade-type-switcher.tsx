import { useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { CATEGORY_ORDER, getTradeTypeById, TRADE_TYPE_CATALOG, TTradeTypeId } from './trade-type-catalog';

export interface TradeTypeSwitcherProps {
    value: TTradeTypeId;
    onChange: (id: TTradeTypeId) => void;
}

export function TradeTypeSwitcher({ value, onChange }: TradeTypeSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement | null>(null);

    const selected = getTradeTypeById(value);

    const groupedResults = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        const filtered = query
            ? TRADE_TYPE_CATALOG.filter(item => item.label.toLowerCase().includes(query))
            : TRADE_TYPE_CATALOG;

        return CATEGORY_ORDER.map(category => ({
            category,
            items: filtered.filter(item => item.category === category),
        })).filter(group => group.items.length > 0);
    }, [searchTerm]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    return (
        <div className='accumilatoirs-trade-type' ref={containerRef}>
            <button
                aria-expanded={isOpen}
                aria-haspopup='listbox'
                className='accumilatoirs-trade-type__trigger'
                type='button'
                onClick={() => setIsOpen(previous => !previous)}
            >
                <span className='accumilatoirs-trade-type__trigger-glyph'>{selected.glyph}</span>
                <span className='accumilatoirs-trade-type__trigger-label'>{selected.label}</span>
                <span className={classNames('accumilatoirs-trade-type__chevron', { 'is-open': isOpen })}>⌄</span>
            </button>

            {isOpen && (
                <div className='accumilatoirs-trade-type__panel' role='listbox'>
                    <div className='accumilatoirs-trade-type__search'>
                        <input
                            autoFocus
                            placeholder='Search'
                            type='text'
                            value={searchTerm}
                            onChange={event => setSearchTerm(event.target.value)}
                        />
                    </div>

                    <div className='accumilatoirs-trade-type__list'>
                        {groupedResults.length === 0 && (
                            <p className='accumilatoirs-trade-type__empty'>No trade types match your search.</p>
                        )}

                        {groupedResults.map(group => (
                            <div className='accumilatoirs-trade-type__group' key={group.category}>
                                <p className='accumilatoirs-trade-type__group-title'>{group.category}</p>
                                {group.items.map(item => (
                                    <button
                                        aria-selected={item.id === value}
                                        className={classNames('accumilatoirs-trade-type__option', {
                                            'accumilatoirs-trade-type__option--active': item.id === value,
                                        })}
                                        key={item.id}
                                        role='option'
                                        type='button'
                                        onClick={() => {
                                            onChange(item.id);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                    >
                                        <span className='accumilatoirs-trade-type__option-glyph'>{item.glyph}</span>
                                        <span className='accumilatoirs-trade-type__option-label'>{item.label}</span>
                                        {!item.isImplemented && (
                                            <span className='accumilatoirs-trade-type__option-badge'>Preview</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TradeTypeSwitcher;
