# Quick Reference Card

## 🚀 Start Backend

```bash
# Development
npm run dev

# Production
npm start

# Render
npm run server
```

## 📡 API Endpoints

**Bot Ideas**

- `GET /api/bot-ideas` - List all
- `POST /api/bot-ideas` - Create
- `GET /api/bot-ideas/:id` - Get one
- `PUT /api/bot-ideas/:id` - Update
- `DELETE /api/bot-ideas/:id` - Delete
- `GET /api/bot-ideas/:id/xml` - Get XML
- `POST /api/bot-ideas/:id/bot-xml` - Attach
- `DELETE /api/bot-ideas/:id/bot-xml` - Detach

**Statistics**

- `GET /api/best-bot-stats` - Top bots
- `GET /api/best-bot-stats/:id` - One bot
- `POST /api/best-bot-stats/:id` - Update

**Scanner**

- `GET /api/scanner/signal` - Current signal
- `POST /api/scanner/signal` - New signal

## 📝 Create Bot Idea

```json
POST /api/bot-ideas
{
  "bot_name": "My Strategy",
  "strategy_description": "Detailed description (min 120 chars)",
  "submitted_by": "user_id"
}
```

## 🗄️ Database

```bash
# Connect to Neon
psql [DATABASE_URL]

# View tables
\dt

# Query bot ideas
SELECT * FROM bot_ideas;
```

## 🔐 Environment

```env
DATABASE_URL=postgresql://...
PORT=10000
NODE_ENV=production
CORS_ORIGIN=https://riskmanagers.site
```

## 🧪 Test Endpoints

```bash
# Health
curl http://localhost:10000/health

# Get ideas
curl http://localhost:10000/api/bot-ideas

# Create idea
curl -X POST http://localhost:10000/api/bot-ideas \
  -H "Content-Type: application/json" \
  -d '{"bot_name":"Test","strategy_description":"This is a test bot with sufficient description length...","submitted_by":"user1"}'

# Get signal
curl http://localhost:10000/api/scanner/signal
```

## 📊 Database Schema

```sql
-- Bot Ideas
CREATE TABLE bot_ideas (
  id SERIAL PRIMARY KEY,
  bot_name VARCHAR(255),
  strategy_description TEXT,
  submitted_by VARCHAR(255),
  bot_xml TEXT,
  created_at TIMESTAMP
);

-- Scanner Signals
CREATE TABLE scanner_signals (
  id SERIAL PRIMARY KEY,
  market_symbol VARCHAR(50),
  confidence DECIMAL(5,2),
  scan_time TIMESTAMP
);

-- Bot Stats
CREATE TABLE bot_stats (
  id SERIAL PRIMARY KEY,
  bot_id VARCHAR(255) UNIQUE,
  total_runs INTEGER,
  profits INTEGER
);
```

## 🔧 Common Commands

| Command        | Purpose              |
| -------------- | -------------------- |
| `npm install`  | Install dependencies |
| `npm run dev`  | Start dev server     |
| `npm test`     | Run tests            |
| `npm run lint` | Check code style     |

## 🐛 Debugging

```bash
# Check logs
tail -f logs/app.log

# Monitor database
watch 'psql [DB_URL] -c "SELECT COUNT(*) FROM bot_ideas;"'

# Test API response
http GET http://localhost:10000/api/bot-ideas
```

## 📚 File Locations

- Main: `server/index.js`
- DB Config: `server/db.js`
- Routes: `server/routes/`
- Config: `.env`
- Docs: `*.md`

## 🚢 Deployment

**Render Settings**

- Runtime: Node 20
- Build: `npm install`
- Start: `npm run server`
- Port: 10000

**GitHub Integration**

- Auto-deploy on push
- Environment vars in Render
- Logs available in dashboard

## 📈 Performance

- Connection pooling enabled
- CORS configured
- Helmet security headers
- Morgan request logging
- Error handling implemented

## ✅ Status Checks

✅ Server running on port 10000
✅ Database connected
✅ Tables created
✅ CORS enabled
✅ Logging active
✅ Error handling ready
