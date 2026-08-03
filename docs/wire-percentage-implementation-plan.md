# Wire Percentage Strategy - Implementation Plan

## Phase 1: State & Configuration Types

### Step 1.1: Add Strategy Mode Type

**File:** `src/pages/auto-trades/auto-trades.tsx`

```typescript
type StrategyMode = 'STANDARD' | 'INVERSE' | 'WIRE_PERCENTAGE';

type WirePercentageStrategy = 'DIGITOVER' | 'DIGITUNDER' | 'HOT' | 'COLD' | 'HOTCOLD' | 'RANDOM';

interface WirePercentageConfig {
    historySize: number;
    confidenceThreshold: number;
    hotThreshold: number;
    coldThreshold: number;
    streakTarget: number;
    sampleInterval: number;
}
```

### Step 1.2: Extend MarketState

```typescript
interface MarketState {
    // ... existing fields
    digitHistory: number[];
    digitPercentages: Record<number, number>;
    confidenceScore: number;
    hotDigits: number[];
    coldDigits: number[];
}
```

### Step 1.3: Update createMarketState

```typescript
const createMarketState = (prev?: Partial<MarketState>): MarketState => ({
    // ... existing defaults
    digitHistory: [],
    digitPercentages: {},
    confidenceScore: 0,
    hotDigits: [],
    coldDigits: [],
});
```

---

## Phase 2: Analysis Functions

### Step 2.1: Add Helper Functions

```typescript
const calculateDigitPercentages = (digitHistory: number[]): Record<number, number> => {
    if (digitHistory.length === 0) return {};
    const counts = Array(10).fill(0);
    digitHistory.forEach(d => {
        if (d >= 0 && d <= 9) counts[d]++;
    });
    return Object.fromEntries(counts.map((count, digit) => [digit, (count / digitHistory.length) * 100]));
};

const identifyHotCold = (percentages: Record<number, number>): [number[], number[]] => {
    const hot: number[] = [];
    const cold: number[] = [];
    Object.entries(percentages).forEach(([digit, pct]) => {
        const d = Number(digit);
        if (pct >= 25) hot.push(d);
        else if (pct <= 5) cold.push(d);
    });
    return [hot, cold];
};

const calculateConfidence = (percentages: Record<number, number>): number => {
    const expectedPct = 10;
    const totalDeviation = Object.values(percentages).reduce((sum, pct) => sum + Math.abs(pct - expectedPct), 0);
    const avgDeviation = totalDeviation / 10;
    return Math.max(0, 100 - avgDeviation * 2);
};
```

---

## Phase 3: State Hooks & Refs

### Step 3.1: Add State Variables

```typescript
const [strategyMode, setStrategyMode] = useState<StrategyMode>(() => {
    try {
        return (localStorage.getItem('auto_trades_strategyMode') as StrategyMode) || 'STANDARD';
    } catch {
        return 'STANDARD';
    }
});

const [wirePercentageStrategy, setWirePercentageStrategy] = useState<WirePercentageStrategy>('HOTCOLD');
const [wirePercentageConfig, setWirePercentageConfig] = useState<WirePercentageConfig>({
    historySize: 1000,
    confidenceThreshold: 65,
    hotThreshold: 25,
    coldThreshold: 5,
    streakTarget: 3,
    sampleInterval: 1,
});
```

### Step 3.2: Add Refs

```typescript
const strategyModeRef = useRef(strategyMode);
strategyModeRef.current = strategyMode;

const wirePercentageStrategyRef = useRef(wirePercentageStrategy);
wirePercentageStrategyRef.current = wirePercentageStrategy;

const wirePercentageConfigRef = useRef(wirePercentageConfig);
wirePercentageConfigRef.current = wirePercentageConfig;
```

---

## Phase 4: Signal Generation

### Step 4.1: Add Signal Hook

```typescript
const isWirePercentageSignal = useCallback((symbol: string, digit: number): boolean => {
    const state = marketStatesRef.current[symbol];
    if (!state || strategyModeRef.current !== 'WIRE_PERCENTAGE') return false;

    const config = wirePercentageConfigRef.current;
    const pct = state.digitPercentages[digit] ?? 0;
    const confidence = state.confidenceScore;

    if (confidence < config.confidenceThreshold) return false;

    const strategy = wirePercentageStrategyRef.current;

    switch (strategy) {
        case 'DIGITOVER':
            return pct >= config.hotThreshold;
        case 'DIGITUNDER':
            return pct <= config.coldThreshold;
        case 'HOT':
            return state.hotDigits.includes(digit);
        case 'COLD':
            return state.coldDigits.includes(digit);
        case 'HOTCOLD':
            return state.hotDigits.includes(digit) || state.coldDigits.includes(digit);
        case 'RANDOM':
            const candidates = [...state.hotDigits, ...state.coldDigits];
            return candidates.length > 0 && candidates.includes(digit);
        default:
            return false;
    }
}, []);
```

### Step 4.2: Integrate into handleTick

```typescript
// Inside handleTick, after digit processing
if (strategyMode === 'WIRE_PERCENTAGE') {
    const config = wirePercentageConfig;
    state.digitHistory.push(lastDigit);

    if (state.digitHistory.length > config.historySize) {
        state.digitHistory.shift();
    }

    if (state.digitHistory.length >= 100) {
        state.digitPercentages = calculateDigitPercentages(state.digitHistory);
        [state.hotDigits, state.coldDigits] = identifyHotCold(state.digitPercentages);
        state.confidenceScore = calculateConfidence(state.digitPercentages);
    }
}
```

---

## Phase 5: Trade Execution Integration

### Step 5.1: Modify isPatternDigit

```typescript
const isPatternDigit = useCallback(
    (symbol: string, digit: number, lastResult: 'win' | 'loss' | null): boolean => {
        const ct = tradeTypeRef.current;

        // Wire Percentage Strategy
        if (strategyMode === 'WIRE_PERCENTAGE') {
            return isWirePercentageSignal(symbol, digit);
        }

        // Standard/Inverse Logic (existing)
        const bar = getActiveDigitBarrier(ct, lastResult);
        const inv = inverseModeRef.current;

        if (ct === 'DIGITOVER') return inv ? digit > bar : digit <= bar;
        if (ct === 'DIGITUNDER') return inv ? digit < bar : digit >= bar;
        if (ct === 'DIGITEVEN') return inv ? digit % 2 === 0 : digit % 2 !== 0;
        if (ct === 'DIGITODD') return inv ? digit % 2 !== 0 : digit % 2 === 0;
        if (ct === 'DIGITMATCH') return inv ? digit === bar : digit !== bar;
        if (ct === 'DIGITDIFF') return inv ? digit !== bar : digit === bar;

        return false;
    },
    [isWirePercentageSignal]
);
```

---

## Phase 6: UI Components

### Step 6.1: Strategy Selector

```tsx
<div className='auto-trades-strategy-selector'>
    <label>Strategy</label>
    <select value={strategyMode} onChange={e => setStrategyMode(e.target.value as StrategyMode)}>
        <option value='STANDARD'>Standard</option>
        <option value='INVERSE'>Inverse</option>
        <option value='WIRE_PERCENTAGE'>Wire Percentage</option>
    </select>
</div>
```

### Step 6.2: Wire Percentage Config Panel

```tsx
{
    strategyMode === 'WIRE_PERCENTAGE' && (
        <div className='wire-percentage-config'>
            <div>
                <label>Confidence Threshold: {wirePercentageConfig.confidenceThreshold}%</label>
                <input
                    type='range'
                    min='50'
                    max='90'
                    value={wirePercentageConfig.confidenceThreshold}
                    onChange={e =>
                        setWirePercentageConfig({
                            ...wirePercentageConfig,
                            confidenceThreshold: Number(e.target.value),
                        })
                    }
                />
            </div>
            <div>
                <label>Hot Threshold: {wirePercentageConfig.hotThreshold}%</label>
                <input
                    type='range'
                    min='10'
                    max='50'
                    value={wirePercentageConfig.hotThreshold}
                    onChange={e =>
                        setWirePercentageConfig({
                            ...wirePercentageConfig,
                            hotThreshold: Number(e.target.value),
                        })
                    }
                />
            </div>
            <div>
                <label>Cold Threshold: {wirePercentageConfig.coldThreshold}%</label>
                <input
                    type='range'
                    min='1'
                    max='20'
                    value={wirePercentageConfig.coldThreshold}
                    onChange={e =>
                        setWirePercentageConfig({
                            ...wirePercentageConfig,
                            coldThreshold: Number(e.target.value),
                        })
                    }
                />
            </div>
            <div>
                <label>History Size: {wirePercentageConfig.historySize}</label>
                <input
                    type='range'
                    min='100'
                    max='5000'
                    step='100'
                    value={wirePercentageConfig.historySize}
                    onChange={e =>
                        setWirePercentageConfig({
                            ...wirePercentageConfig,
                            historySize: Number(e.target.value),
                        })
                    }
                />
            </div>
        </div>
    );
}
```

---

## Phase 7: Styles

### File: `src/pages/auto-trades/auto-trades.scss`

```scss
.wire-percentage-config {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;

    > div {
        margin-bottom: 0.75rem;

        label {
            display: block;
            margin-bottom: 0.25rem;
            font-size: 0.875rem;
        }

        input[type='range'] {
            width: 100%;
        }
    }
}
```

---

## Phase 8: Tests

### File: `src/pages/auto-trades/__tests__/auto-trades.spec.tsx`

```typescript
describe('Wire Percentage Strategy', () => {
    describe('calculateDigitPercentages', () => {
        it('returns correct percentages for even distribution', () => {
            const history = Array(100)
                .fill(0)
                .map((_, i) => i % 10);
            const result = calculateDigitPercentages(history);
            expect(result[0]).toBe(10);
            expect(result[5]).toBe(10);
        });

        it('returns empty object for empty history', () => {
            const result = calculateDigitPercentages([]);
            expect(result).toEqual({});
        });
    });

    describe('identifyHotCold', () => {
        it('identifies hot and cold digits', () => {
            const percentages = { 0: 30, 1: 10, 2: 3, 3: 10, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3 };
            const [hot, cold] = identifyHotCold(percentages);
            expect(hot).toContain(0);
            expect(cold).toContain(2);
            expect(cold).toContain(4);
        });
    });

    describe('calculateConfidence', () => {
        it('returns 100 for perfect distribution', () => {
            const percentages = { 0: 10, 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 10, 8: 10, 9: 10 };
            const result = calculateConfidence(percentages);
            expect(result).toBe(100);
        });
    });
});
```

---

## Execution Order

1. **Types & Interfaces** - Add new types without changing logic
2. **State Management** - Extend MarketState, add hooks/refs
3. **Analysis Functions** - Pure functions for calculations
4. **Signal Generation** - Integrate with existing tick flow
5. **UI Components** - Add controls and panels
6. **Styles** - Visual polish
7. **Tests** - Unit and integration coverage
8. **Documentation** - Update this spec

## Risk Mitigation

- **Performance**: Use refs for large arrays, memoize expensive calculations
- **Memory**: Cap history at 5000 entries max
- **Edge Cases**: Handle empty history, NaN percentages
- **Backward Compatibility**: Default to STANDARD mode
