# Backend Setup Guide

## Step 1: Clone Repository

```bash
git clone https://github.com/DukeNyamasege/deriv-bot-backend.git
cd deriv-bot-backend
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Configure Environment

Create `.env` file with your Neon database URL:

```bash
DATABASE_URL=postgresql://neondb_owner:npg_PXGYsnqC3i2z@ep-dry-cherry-anulwfjs.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require
PORT=10000
NODE_ENV=production
```

## Step 4: Run Locally

```bash
npm run dev
```

Server will start on `http://localhost:10000`

## Step 5: Test API

```bash
# Health check
curl http://localhost:10000/health

# Get bot ideas
curl http://localhost:10000/api/bot-ideas

# Create bot idea
curl -X POST http://localhost:10000/api/bot-ideas \
  -H "Content-Type: application/json" \
  -d '{
    "bot_name": "Test Bot",
    "strategy_description": "This is a test bot with sufficient description length for validation.",
    "submitted_by": "user123"
  }'
```

## Step 6: Deploy to Render

1. Connect GitHub repo to Render
2. Set environment variable `DATABASE_URL`
3. Build command: `npm install`
4. Start command: `npm run server`
5. Port: `10000`

## Database Tables

Tables are auto-created on first run:

- `bot_ideas` - Community submissions
- `scanner_signals` - AI signals
- `bot_stats` - Bot performance

## Troubleshooting

**Port already in use:**

```bash
PORT=3000 npm run dev
```

**Database connection error:**

- Check `DATABASE_URL` in .env
- Verify Neon account credentials
- Test connection: `psql [DATABASE_URL]`

**Missing tables:**

- Tables auto-create on startup
- Check logs for initialization errors

## Next Steps

1. Connect frontend to this backend
2. Update API base URL in frontend config
3. Test all endpoints with Postman/Insomnia
4. Monitor logs in production
