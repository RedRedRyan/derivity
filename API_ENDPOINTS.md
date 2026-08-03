# API Endpoints Documentation

This document outlines all API endpoints required for the trading bot application to function properly. These endpoints should be implemented in your backend server running on `/api`.

## Base URL

All endpoints use the base URL: `/api`

## Bot Ideas Endpoints

### Get All Bot Ideas

- **URL**: `/bot-ideas`
- **Method**: `GET`
- **Response**: Array of TBotIdea objects
- **Usage**: Fetches all community-submitted bot ideas (auto-refreshes every 30s)

### Create Bot Idea

- **URL**: `/bot-ideas`
- **Method**: `POST`
- **Body**:
    ```json
    {
        "bot_name": "string",
        "strategy_description": "string (min 120 chars)",
        "submitted_by": "string (user ID)",
        "bot_xml": "string (optional)",
        "bot_xml_filename": "string (optional)"
    }
    ```
- **Response**: Created TBotIdea object

### Get Bot Idea XML

- **URL**: `/bot-ideas/{id}/xml`
- **Method**: `GET`
- **Response**: `{ "bot_xml": "string" }`
- **Usage**: Fetch bot XML for loading into Bot Builder

### Attach Bot XML to Idea

- **URL**: `/bot-ideas/{id}/bot-xml`
- **Method**: `POST`
- **Body**:
    ```json
    {
        "submitted_by": "string (user ID)",
        "bot_xml": "string",
        "bot_xml_filename": "string"
    }
    ```
- **Response**: Updated TBotIdea object

### Detach Bot XML from Idea

- **URL**: `/bot-ideas/{id}/bot-xml`
- **Method**: `DELETE`
- **Body**: `{ "submitted_by": "string" }`
- **Response**: Updated TBotIdea object

### Update Bot Idea

- **URL**: `/bot-ideas/{id}`
- **Method**: `PUT`
- **Body**:
    ```json
    {
        "bot_name": "string",
        "strategy_description": "string",
        "submitted_by": "string"
    }
    ```
- **Response**: Updated TBotIdea object

### Delete Bot Idea

- **URL**: `/bot-ideas/{id}`
- **Method**: `DELETE`
- **Body**: `{ "submitted_by": "string" }`
- **Response**: 204 No Content or 200 OK

## Best Bots Endpoints

### Get Best Bot Statistics

- **URL**: `/best-bot-stats`
- **Method**: `GET`
- **Response**: Array of bot statistics
- **Usage**: Fetches performance stats for all best bots (auto-refreshes every 30s)

## Scanner Endpoints

### Get AI Scanner Signal

- **URL**: `/scanner/signal`
- **Method**: `GET`
- **Response**:
    ```json
    {
      "status": "ok | initializing",
      "signal": { signal_data } | null,
      "nextScanTime": "ISO timestamp"
    }
    ```
- **Usage**: Fetches current market signal from AI scanner

## Data Types

### TBotIdea

```typescript
{
  id: number;
  bot_name: string;
  strategy_description: string;
  submitted_by: string;
  submitted_at: string (ISO);
  total_runs?: number;
  profits: number;
  losses: number;
  profit_amount?: number | null;
  loss_amount?: number | null;
  has_bot_xml?: boolean;
  bot_xml_filename?: string | null;
  developed_by?: string | null;
}
```

### TBotStats

```typescript
{
  bot_id: string;
  total_runs: number;
  profits: number;
  losses: number;
  profit_amount?: number | null;
  loss_amount?: number | null;
}
```

### TSignal (Scanner)

```typescript
{
    scanTime: string;
    nextScanTime: string;
    marketSymbol: string;
    marketLabel: string;
    groupName: string;
    tradeType: string;
    contractType: string;
    direction: string;
    barrier: number | null;
    confidence: number;
    edge: number;
    zScore: number;
    recommendedRuns: number;
    signalLabel: string;
    tickCount: number;
    isValid: boolean;
}
```

## Implementation Notes

- **Authentication**: All requests should verify the user's login status via `client.is_logged_in` before executing mutations
- **Error Handling**: Return appropriate HTTP status codes (400, 404, 500)
- **Polling**: Some data refreshes automatically (e.g., best-bot-stats every 30s)
- **Real-time Data**: Combo and Scanner use WebSocket subscriptions for live market data
