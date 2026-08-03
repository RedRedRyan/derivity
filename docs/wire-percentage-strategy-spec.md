# Wire Percentage Strategy - Technical Specification

## Overview

A probabilistic trading strategy that analyzes historical digit frequencies and executes contracts based on statistical deviations from expected distributions.

## Core Concept

- Tracks percentage distribution of digits (0-9) over a configurable history window
- Identifies "hot" (over-represented) and "cold" (under-represented) digits
- Executes trades when statistical confidence thresholds are met

## Architecture Integration

### 1. State Management (MarketState Extension)

```typescript
interface MarketState {
    // ... existing fields
    digitHistory: number[]; // Rolling window of last N digits
    digitPercentages: Record<number, number>; // Current percentage per digit (0-9)
    confidenceScore: number; // Overall confidence (0-100)
    hotDigits: number[]; // Digits above threshold
    coldDigits: number[]; // Digits below threshold
}
```

### 2. Strategy Types

```typescript
type WirePercentageStrategy =
    | 'DIGITOVER' // Digit > threshold%
    | 'DIGITUNDER' // Digit < threshold%
    | 'HOT' // Hot digit (highest percentage)
    | 'COLD' // Cold digit (lowest percentage)
    | 'HOTCOLD' // Either hot or cold
    | 'RANDOM'; // Random selection from hot/cold
```

### 3. Configuration Parameters

| Parameter             | Type   | Default | Description                   |
| --------------------- | ------ | ------- | ----------------------------- |
| `historySize`         | number | 1000    | Rolling window size           |
| `confidenceThreshold` | number | 65      | Min confidence %              |
| `hotThreshold`        | number | 70      | % above which digit is "hot"  |
| `coldThreshold`       | number | 30      | % below which digit is "cold" |
| `streakTarget`        | number | 3       | Required consecutive matches  |
| `sampleInterval`      | number | 1       | Ticks between samples         |

### 4. Signal Generation Algorithm

#### 4.1 Digit Frequency Analysis

```typescript
function calculateDigitPercentages(digitHistory: number[]): Record<number, number> {
    const counts = Array(10).fill(0);
    digitHistory.forEach(d => counts[d]++);
    return Object.fromEntries(counts.map((count, digit) => [digit, (count / digitHistory.length) * 100]));
}
```

#### 4.2 Confidence Calculation

```typescript
function calculateConfidence(currentPct: number, expectedPct: number, sampleSize: number): number {
    const deviation = Math.abs(currentPct - expectedPct); // Expected = 10%
    const confidence = Math.max(0, 100 - deviation * 2); // 0-100 scale
    const sampleFactor = Math.min(1, sampleSize / 1000); // Normalize
    return confidence * sampleFactor;
}
```

#### 4.3 Signal Decision Tree

```
IF strategy === 'HOT'
    RETURN digits with pct >= hotThreshold
ELSE IF strategy === 'COLD'
    RETURN digits with pct <= coldThreshold
ELSE IF strategy === 'DIGITOVER'
    RETURN digits with pct >= hotThreshold
ELSE IF strategy === 'DIGITUNDER'
    RETURN digits with pct <= coldThreshold
ELSE IF strategy === 'HOTCOLD'
    RETURN hot OR cold digits
ELSE
    RETURN random hot/cold digit
```

### 5. Integration Points

#### 5.1 State Initialization

```typescript
const createWirePercentageState = (): MarketState => ({
    // ... existing defaults
    digitHistory: [],
    digitPercentages: {},
    confidenceScore: 0,
    hotDigits: [],
    coldDigits: [],
});
```

#### 5.2 Tick Processing Extension

```typescript
// In handleTick()
if (strategyMode === 'WIRE_PERCENTAGE') {
    state.digitHistory.push(lastDigit);
    if (state.digitHistory.length > historySize) {
        state.digitHistory.shift();
    }

    state.digitPercentages = calculateDigitPercentages(state.digitHistory);
    [state.hotDigits, state.coldDigits] = identifyHotCold(state.digitPercentages);
    state.confidenceScore = calculateOverallConfidence(state.digitPercentages);
}
```

#### 5.3 Signal Generation Hook

```typescript
const isWirePercentageSignal = useCallback(
    (digit: number): boolean => {
        const state = marketStatesRef.current[symbol];
        if (!state || strategyMode !== 'WIRE_PERCENTAGE') return false;

        const pct = state.digitPercentages[digit] ?? 0;
        const confidence = state.confidenceScore;

        if (confidence < config.confidenceThreshold) return false;

        switch (wirePercentageStrategy) {
            case 'DIGITOVER':
                return pct >= config.hotThreshold;
            case 'DIGITUNDER':
                return pct <= config.coldThreshold;
            case 'HOT':
                return state.hotDigits.includes(digit);
            case 'COLD':
                return state.coldDigits.includes(digit);
            default:
                return false;
        }
    },
    [strategyMode, wirePercentageStrategy, config]
);
```

### 6. UI Components

#### 6.1 Strategy Selector Dropdown

```tsx
<select value={strategyMode} onChange={e => setStrategyMode(e.target.value as StrategyMode)}>
    <option value='STANDARD'>Standard</option>
    <option value='INVERSE'>Inverse</option>
    <option value='WIRE_PERCENTAGE'>Wire Percentage</option>
</select>
```

#### 6.2 Wire Percentage Config Panel

```tsx
{
    strategyMode === 'WIRE_PERCENTAGE' && (
        <div className='wire-percentage-config'>
            <input type='range' min='50' max='90' defaultValue='65' />
            <input type='range' min='10' max='50' defaultValue='30' />
            <input type='number' min='2' max='10' defaultValue='3' />
        </div>
    );
}
```

### 7. Execution Flow

```
Tick Received
    ↓
Update digitHistory (rolling window)
    ↓
Calculate digitPercentages
    ↓
Identify hot/cold digits
    ↓
Calculate confidenceScore
    ↓
IF strategyMode === 'WIRE_PERCENTAGE'
    IF isWirePercentageSignal(digit) AND confidence >= threshold
        → Execute trade
```

### 8. Safety Mechanisms

1. **Cooldown Period**: 60 ticks between trades
2. **Consecutive Loss Check**: Pause after 2 losses
3. **Data Silence Recovery**: Restart after 15s no data
4. **Sample Size Validation**: Require min 100 samples for confidence

### 9. Performance Considerations

- Use `useRef` for digitHistory to avoid re-renders
- Memoize percentage calculations with `useMemo`
- Batch state updates for high-frequency ticks
- Consider Web Workers for large history windows (>10k)

### 10. Testing Strategy

#### Unit Tests

- `calculateDigitPercentages()` with known inputs
- `calculateConfidence()` edge cases
- `identifyHotCold()` boundary conditions

#### Integration Tests

- Full signal chain with mock tick stream
- Confidence threshold triggering
- Hot/cold digit identification accuracy

#### E2E Tests

- UI selector integration
- Config persistence in localStorage
- Trade execution on valid signals

## Implementation Order

1. [ ] Extend MarketState interface
2. [ ] Add wire percentage state refs
3. [ ] Implement digit analysis functions
4. [ ] Add signal generation logic
5. [ ] Integrate with existing trade flow
6. [ ] Add UI controls
7. [ ] Write unit tests
8. [ ] Performance tuning

## File Changes Summary

| File                   | Changes                                 |
| ---------------------- | --------------------------------------- |
| `auto-trades.tsx`      | State, analysis functions, signal hooks |
| `auto-trades.scss`     | Wire percentage config panel styles     |
| `auto-trades.spec.tsx` | Unit + integration tests                |
