# Architecture Overview

A comprehensive guide to the application architecture, state management patterns, and key integration points for the Trading Bot platform.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Application Layers](#application-layers)
- [State Management (MobX)](#state-management-mobx)
- [Reactive Streams (RxJS)](#reactive-streams-rxjs)
- [Routing](#routing)
- [Bot Execution Engine](#bot-execution-engine)
- [Technical Indicators](#technical-indicators)
- [Key Integration Points](#key-integration-points)
- [Build System](#build-system)

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        UI Layer (React 18)                           │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Dashboard  │  │Bot Builder │  │  Chart   │  │   Tutorials    │  │
│  │   Page     │  │  (Blockly) │  │  Page    │  │     Page       │  │
│  └─────┬──────┘  └─────┬──────┘  └────┬─────┘  └───────┬────────┘  │
│        │               │              │                 │           │
│  ┌─────┴───────────────┴──────────────┴─────────────────┴────────┐  │
│  │              Layout (Header, Sidebar, Footer)                 │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                   State Layer (MobX + RxJS)                         │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ClientStore │  │ BlocklyStore │  │RunPanelStore │  ... more      │
│  └─────┬──────┘  └──────────────┘  └──────────────┘                │
│        │                                                            │
│  ┌─────┴──────────────────────────────────────────────────────────┐ │
│  │          Observable Streams (RxJS BehaviorSubjects)            │ │
│  │  connectionStatus$ | isAuthorized$ | accountList$ | authData$  │ │
│  └─────┬──────────────────────────────────────────────────────────┘ │
└────────┼────────────────────────────────────────────────────────────┘
         │
┌────────┼────────────────────────────────────────────────────────────┐
│        │              Service Layer                                  │
│  ┌─────┴──────┐  ┌──────────────────────┐  ┌─────────────────────┐ │
│  │  API Base  │  │OAuthTokenExchange    │  │DerivWSAccounts      │ │
│  │ (WebSocket)│  │    Service           │  │   Service           │ │
│  └─────┬──────┘  └──────────────────────┘  └─────────────────────┘ │
└────────┼────────────────────────────────────────────────────────────┘
         │
┌────────┼────────────────────────────────────────────────────────────┐
│        │              Network Layer                                  │
│  ┌─────┴──────┐  ┌──────────────┐                                   │
│  │ WebSocket  │  │  REST APIs   │                                   │
│  │ (DerivAPI) │  │  (OAuth)     │                                   │
│  └────────────┘  └──────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
```

The application follows a layered architecture:

1. **UI Layer** - React components organized as pages with shared layout
2. **State Layer** - MobX stores for component state + RxJS observables for API state
3. **Service Layer** - Business logic services for authentication, accounts, and API
4. **Network Layer** - WebSocket connections (real-time) and REST API calls (auth)

---

## Application Layers

### Entry Point

**File:** `src/main.tsx`

The application bootstraps by:

1. Configuring MobX (`isolateGlobalState: true`)
2. Running optional analytics initialization
3. Rendering the `AuthWrapper` component which handles initial auth state

### Root Component

**File:** `src/app/App.tsx`

Sets up:

- React Router v6 with lazy-loaded routes
- Translation provider (`@deriv-com/translations`) — optional, defaults to English if no Crowdin CDN is configured
- MobX `StoreProvider` wrapping the entire app
- `CoreStoreProvider` bridging API state to MobX stores

### Core Store Provider

**File:** `src/app/CoreStoreProvider.tsx`

This critical component bridges the API/WebSocket layer with MobX stores:

```typescript
// Listens to RxJS observables and syncs to MobX stores
useEffect(() => {
    if (client && activeAccount && isAuthorized) {
        client.setLoginId(activeLoginid);
        client.setAccountList(accountList);
        client.setIsLoggedIn(true);
    }
}, [accountList, activeAccount, activeLoginid, client, isAuthorized]);
```

It also handles WebSocket messages (balance updates, auth errors) and dispatches them to the appropriate stores.

---

## State Management (MobX)

The application uses MobX for reactive state management through a centralized **RootStore** pattern.

### Store Hierarchy

```
RootStore (src/stores/root-store.ts)
├── core
│   ├── ui        (UIStore)       - Theme, responsive state, modals
│   ├── client    (ClientStore)   - Authentication, account data, balance
│   └── common    (CommonStore)   - Shared app-wide state
│
├── blockly       (BlocklyStore)      - Blockly workspace state
├── run_panel     (RunPanelStore)     - Bot execution controls
├── dashboard     (DashboardStore)    - Dashboard data and stats
├── toolbox       (ToolboxStore)      - Available Blockly blocks
├── load_modal    (LoadModalStore)    - Strategy loading UI
├── save_modal    (SaveModalStore)    - Strategy saving UI
├── google_drive  (GoogleDriveStore)  - Google Drive integration
├── journal       (JournalStore)      - Bot execution logs
└── transactions  (TransactionsStore) - Trade history
```

### Accessing Stores in Components

Use the `useStore()` hook with the `observer` HOC:

```typescript
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';

const MyComponent = observer(() => {
    const { run_panel, dashboard } = useStore();

    return (
        <div>
            <p>Balance: {run_panel.balance}</p>
            <button onClick={run_panel.onRunButtonClick}>Run Bot</button>
        </div>
    );
});
```

### Adding a New Store

1. Create the store class in `src/stores/`:

```typescript
import { makeObservable, observable, action } from 'mobx';

export default class MyNewStore {
    my_value = '';

    constructor(root_store) {
        makeObservable(this, {
            my_value: observable,
            setMyValue: action,
        });
        this.root_store = root_store;
    }

    setMyValue(value: string) {
        this.my_value = value;
    }
}
```

2. Register in `src/stores/root-store.ts`:

```typescript
import MyNewStore from './my-new-store';

export default class RootStore {
    constructor(core) {
        // ...existing stores...
        this.my_new = new MyNewStore(this);
    }
}
```

3. Access via `useStore()`:

```typescript
const { my_new } = useStore();
```

---

## Reactive Streams (RxJS)

The API layer uses RxJS `BehaviorSubject` streams for reactive state that bridges WebSocket events to the UI.

**File:** `src/external/bot-skeleton/services/api/observables/connection-status-stream.ts`

### Available Streams

| Stream              | Type                       | Description                   |
| ------------------- | -------------------------- | ----------------------------- |
| `connectionStatus$` | `BehaviorSubject<string>`  | WebSocket connection state    |
| `isAuthorizing$`    | `BehaviorSubject<boolean>` | Whether auth is in progress   |
| `isAuthorized$`     | `BehaviorSubject<boolean>` | Whether user is authenticated |
| `account_list$`     | `BehaviorSubject<array>`   | List of user accounts         |
| `authData$`         | `BehaviorSubject<object>`  | Full authentication data      |

### Data Flow Pattern

```
WebSocket Event → API Base → RxJS Observable → CoreStoreProvider → MobX Store → React Component
```

Example flow for balance updates:

```
WebSocket Message (msg_type: 'balance')
    → api_base.onMessage
    → handleMessages() in CoreStoreProvider
    → client.setBalance(balance)
    → observer() components re-render
```

---

## Routing

**Framework:** React Router v6 with lazy-loaded routes.

### Main Routes

| Path         | Component     | Description                          |
| ------------ | ------------- | ------------------------------------ |
| `/`          | Dashboard     | Bot statistics and quick actions     |
| `/bot`       | Bot Builder   | Blockly visual programming workspace |
| `/chart`     | Chart         | Trading charts with indicators       |
| `/tutorials` | Tutorials     | User guides and help content         |
| `/callback`  | Callback Page | OAuth redirect handler               |

### Route Structure

```typescript
// In App.tsx - routes are lazy-loaded for performance
const Dashboard = lazy(() => import('@/pages/dashboard'));
const BotBuilder = lazy(() => import('@/pages/bot-builder'));
const Chart = lazy(() => import('@/pages/chart'));
const Tutorials = lazy(() => import('@/pages/tutorials'));
```

A shared `Layout` wrapper provides the header, sidebar, and footer for all routes.

---

## Bot Execution Engine

The core bot execution logic resides in `src/external/bot-skeleton/`.

### Directory Structure

```
src/external/bot-skeleton/
├── scratch/           # Blockly block definitions and implementations
│   └── blocks/        # Block categories
│       ├── Advanced/
│       ├── Logic/
│       ├── Math/
│       └── ...
│
├── services/          # Bot runtime services
│   └── api/
│       ├── api-base.ts                # WebSocket connection management
│       ├── appId.js                   # WebSocket instance creation
│       └── observables/               # RxJS observable streams
│           └── connection-status-stream.ts
│
└── utils/             # Helper utilities
    ├── contract-utils.ts
    ├── workspace-utils.ts
    └── error-utils.ts
```

### Bot Execution Workflow

```
1. User creates strategy    → Blockly workspace (drag-and-drop blocks)
2. Strategy serialized      → Workspace XML (can be saved/loaded)
3. User clicks "Run"        → RunPanelStore triggers execution
4. Bot-skeleton interprets  → Block-by-block execution
5. API calls executed       → WebSocket sends trade requests
6. Real-time updates        → Balance, transactions, proposals stream in
7. Logs generated           → JournalStore and TransactionsStore record activity
8. Bot completes/stops      → RunPanelStore updates execution state
```

### Modifying Blockly Blocks

Block definitions are in `src/external/bot-skeleton/scratch/blocks/`. Each category has its own subdirectory. To modify or add blocks:

1. Navigate to the relevant category folder
2. Edit/create block definition files
3. Register blocks in the category index
4. Rebuild and test in the Bot Builder page

---

## Technical Indicators

Custom technical indicator implementations are available in `src/external/indicators/`:

| Indicator                  | Module    | Description                           |
| -------------------------- | --------- | ------------------------------------- |
| Simple Moving Average      | `sma.js`  | Average price over N periods          |
| Exponential Moving Average | `ema.js`  | Weighted moving average               |
| Bollinger Bands            | `bb.js`   | Volatility bands around SMA           |
| MACD                       | `macd.js` | Moving Average Convergence Divergence |
| Relative Strength Index    | `rsi.js`  | Momentum oscillator (0-100)           |

These JavaScript modules are used by bot strategies for market analysis during automated trading.

---

## Key Integration Points

### Deriv API (`@deriv/deriv-api`)

- WebSocket-based API for real-time market data and trade execution
- Managed through `ClientStore` and bot-skeleton services
- API types from `@deriv/api-types`
- Connection managed by `api-base.ts`

### Blockly

- Visual programming interface for strategy building
- Custom blocks defined in `bot-skeleton/scratch/`
- Workspace state managed by `BlocklyStore`
- Strategies serialized as XML for persistence

### SmartCharts (`@deriv-com/smartcharts-champion`)

- TradingView-style charts with technical indicators
- Adapter in `src/adapters/smartcharts-champion/`
- Chart assets copied from `node_modules` during build (configured in `rsbuild.config.ts`)

### Translations (`@deriv-com/translations`) — Optional

- i18n support via `TranslationProvider` wrapping the entire app
- **Optional:** Multi-language support only works when a Crowdin project is configured and translation files are served via a CDN (`TRANSLATIONS_CDN_URL`). Without this setup, the app defaults to English and runs normally.
- Use `localize()` function to wrap translatable strings
- To show the language switcher in the UI, set `enable_language_settings: true` in `brand.config.json`. If not using translations, set it to `false` to hide the selector.
- See the [White Labeling Guide - Footer](./03-white-labeling.md#footer) for language switcher configuration

---

## Build System

**Tool:** RSBuild (fast Rust-based build tool)

**Configuration:** `rsbuild.config.ts`

Key features:

- Path aliases resolution (matching `tsconfig.json`)
- Environment variable injection via `source.define`
- Asset copying for SmartCharts
- HTTPS dev server on port 8443
- Bundle analysis support (port 8888)

### Build Output

```bash
npm run build              # → dist/  (production assets)
npm run build:analyze      # → dist/  + bundle analyzer on :8888
```

---

## Debugging

| Tool            | Purpose                           | How to Use                        |
| --------------- | --------------------------------- | --------------------------------- |
| React DevTools  | Component hierarchy, props, state | Browser extension                 |
| MobX DevTools   | Track state changes and reactions | `mobx-devtools` browser extension |
| Network tab     | WebSocket messages, API calls     | Browser DevTools > Network        |
| Console         | ErrorLogger output, warnings      | Browser DevTools > Console        |
| Bundle Analyzer | Identify large dependencies       | `npm run build:analyze`           |
| Source Maps     | Debug original TypeScript         | Enabled in development builds     |

### Inspecting WebSocket State

```javascript
// In browser console
console.log(api_base.api?.connection?.url); // Current WebSocket URL
console.log(api_base.api?.connection?.readyState); // Connection state (0-3)
console.log(localStorage.getItem('active_loginid')); // Active account
console.log(sessionStorage.getItem('auth_info')); // Auth token info
```

---

## Related Documentation

| Topic                     | Guide                                                  |
| ------------------------- | ------------------------------------------------------ |
| White labeling & branding | [White Labeling Guide](./03-white-labeling.md)         |
| Authentication system     | [Authentication Guide](./04-authentication.md)         |
| WebSocket connections     | [WebSocket Integration](./05-websocket-integration.md) |
| Error handling            | [Error Handling Guide](./06-error-handling.md)         |
| Monitoring & analytics    | [Monitoring & Analytics](./07-monitoring-analytics.md) |
