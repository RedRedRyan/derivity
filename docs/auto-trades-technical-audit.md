# Auto Trades Technical Audit

## Scope

This audit covers the Auto Trades module percentage mode, live percentage display, subscription stability, mobile UX, and crash diagnostics.

## Findings

1. Percentage mode mixed current tick digits with the selected contract type. For example, Digit Over was checking the observed digit bucket instead of the probability of the configured `Over barrier` contract winning.
2. Direction contracts (`Rise`, `Fall`, `Only Ups`, `Only Downs`) did not collect a percentage-mode sample history, so percentage mode could show momentum without a reliable execution signal.
3. `resetSession` rebuilt market state without all required fields, leaving percentage and verification state vulnerable to undefined values during later reads.
4. Invalid stake sanity checks set `state.trading` before validation and returned without clearing the global trading lock.
5. A malformed duplicate `@keyframes at-pulse` block in `auto-trades.scss` could break Sass compilation.
6. Diagnostics were not idempotent. In hot reload or repeated bootstraps, global listeners and memory intervals could stack up.

## Remediation Applied

1. Added per-contract percentage snapshots for Digit Over, Digit Under, Even, Odd, Match, Differs, Rise, Fall, Only Ups, and Only Downs.
2. Percentage execution now requires enough samples, the selected trade type's target percentage, and confidence before buying.
3. Direction trades now collect a bounded sample history and report live Rise/Fall percentages.
4. Market state reset now preserves all required percentage, direction, and verification fields.
5. Invalid stake handling now clears trading locks, refreshes UI, and surfaces an error.
6. Diagnostics setup now avoids duplicate global listeners and duplicate memory intervals.
7. Mobile Auto Trades styles keep controls touch-friendly and pin Run/Stop controls to the bottom on small screens.

## Stability Roadmap

1. Send diagnostic events to a persistent logger with user/session, symbol, trade type, contract ID, and subscription version.
2. Add integration tests for subscription restart after data silence and stale callback rejection.
3. Add a production memory dashboard for heap growth, active subscriptions, and active timers.
4. Add contract-result polling timeout and cancellation when the user stops Auto Trades.
5. Split percentage calculation into a pure utility module so the execution engine and UI share the same tested source.
