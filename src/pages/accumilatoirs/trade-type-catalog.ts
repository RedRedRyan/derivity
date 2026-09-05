export type TTradeTypeId =
    | 'accumulators'
    | 'matches_differs'
    | 'even_odd'
    | 'over_under'
    | 'higher_lower'
    | 'touch_no_touch'
    | 'multipliers'
    | 'turbos'
    | 'vanillas';

export type TTradeTypeCategory =
    | 'Accumulators'
    | 'Digits'
    | 'Ups & Downs'
    | 'Touch & No Touch'
    | 'Multipliers'
    | 'Turbos'
    | 'Vanillas';

export interface TTradeTypeCatalogItem {
    category: TTradeTypeCategory;
    /** Only 'accumulators' has real Deriv proposal/purchase wiring behind it in derivity today. */
    isImplemented: boolean;
    id: TTradeTypeId;
    label: string;
    glyph: string;
}

export const TRADE_TYPE_CATALOG: TTradeTypeCatalogItem[] = [
    { id: 'accumulators', label: 'Accumulators', category: 'Accumulators', glyph: '~', isImplemented: true },
    { id: 'matches_differs', label: 'Matches/Differs', category: 'Digits', glyph: '::', isImplemented: false },
    { id: 'even_odd', label: 'Even/Odd', category: 'Digits', glyph: '##', isImplemented: false },
    { id: 'over_under', label: 'Over/Under', category: 'Digits', glyph: '/\\', isImplemented: false },
    { id: 'higher_lower', label: 'Higher/Lower', category: 'Ups & Downs', glyph: '^v', isImplemented: false },
    { id: 'touch_no_touch', label: 'Touch/No Touch', category: 'Touch & No Touch', glyph: 'x', isImplemented: false },
    { id: 'multipliers', label: 'Multipliers', category: 'Multipliers', glyph: 'x2', isImplemented: false },
    { id: 'turbos', label: 'Turbos', category: 'Turbos', glyph: '>>', isImplemented: false },
    { id: 'vanillas', label: 'Vanillas', category: 'Vanillas', glyph: 'V', isImplemented: false },
];

export const CATEGORY_ORDER: TTradeTypeCategory[] = [
    'Accumulators',
    'Digits',
    'Ups & Downs',
    'Touch & No Touch',
    'Multipliers',
    'Turbos',
    'Vanillas',
];

export const getTradeTypeById = (id: TTradeTypeId): TTradeTypeCatalogItem =>
    TRADE_TYPE_CATALOG.find(item => item.id === id) ?? TRADE_TYPE_CATALOG[0];
