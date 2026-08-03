# Frontend Integration Guide

## Step 1: Update Frontend Environment

In your frontend project (new-user-interface):

Create `.env.production`:

```env
VITE_API_BASE_URL=https://deriv-bot-backend-4y8v.onrender.com/api
VITE_API_TIMEOUT=30000
```

Create `.env.development`:

```env
VITE_API_BASE_URL=http://localhost:10000/api
VITE_API_TIMEOUT=30000
```

## Step 2: Create API Service

In `src/services/api.ts`:

```typescript
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:10000/api';

export const botIdeasAPI = {
    getAll: () => fetch(`${API_BASE_URL}/bot-ideas`).then(r => r.json()),
    create: data =>
        fetch(`${API_BASE_URL}/bot-ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(r => r.json()),
    getXml: id => fetch(`${API_BASE_URL}/bot-ideas/${id}/xml`).then(r => r.json()),
    updateXml: (id, data) =>
        fetch(`${API_BASE_URL}/bot-ideas/${id}/bot-xml`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(r => r.json()),
};

export const scannerAPI = {
    getSignal: () => fetch(`${API_BASE_URL}/scanner/signal`).then(r => r.json()),
};

export const statsAPI = {
    getAll: () => fetch(`${API_BASE_URL}/best-bot-stats`).then(r => r.json()),
};
```

## Step 3: Update Page Components

In `src/pages/bot-ideas/bot-ideas.tsx`:

```typescript
import { botIdeasAPI } from '@/services/api';

// In component:
const fetchBotIdeas = async () => {
    try {
        const data = await botIdeasAPI.getAll();
        setBotIdeas(data);
    } catch (error) {
        console.error('Failed to fetch bot ideas:', error);
    }
};
```

## Step 4: Update Scanner Page

In `src/pages/scanner/scanner.tsx`:

```typescript
import { scannerAPI } from '@/services/api';

const fetchSignal = async () => {
    const { signal, status } = await scannerAPI.getSignal();
    setCurrentSignal(signal);
    setStatus(status);
};
```

## Step 5: Update Best Bots Page

In `src/pages/best-bots/best-bots.tsx`:

```typescript
import { statsAPI } from '@/services/api';

const fetchStats = async () => {
    const stats = await statsAPI.getAll();
    setTopBots(stats);
};
```

## Step 6: Testing

Test each endpoint locally:

```bash
# Start backend
npm run dev

# In frontend, test API calls:
curl http://localhost:10000/api/bot-ideas
curl http://localhost:10000/api/scanner/signal
curl http://localhost:10000/api/best-bot-stats
```

## Step 7: Deploy Frontend

1. Update API URL in frontend build config
2. Deploy to Netlify/Vercel
3. Test production endpoints
4. Monitor CORS errors

## CORS Configuration

Backend CORS allows:

- https://riskmanagers.site
- https://thenewui.netlify.app
- http://localhost:5000

Add your frontend domain if different.

## Error Handling

Add try-catch for all API calls:

```typescript
try {
    const data = await fetch(`${API_BASE_URL}/endpoint`);
    if (!data.ok) throw new Error(data.statusText);
    return data.json();
} catch (error) {
    console.error('API Error:', error);
    showErrorNotification(error.message);
}
```

## Testing Checklist

- [ ] Bot Ideas create works
- [ ] Bot Ideas list loads
- [ ] XML attach/detach works
- [ ] Scanner signal loads
- [ ] Stats endpoint responds
- [ ] CORS errors resolved
- [ ] Error handling works
- [ ] Timeouts handled

## Production Checklist

- [ ] API URLs use production domain
- [ ] Database verified
- [ ] Logs checked
- [ ] Performance acceptable
- [ ] Security headers enabled
- [ ] Rate limiting considered
