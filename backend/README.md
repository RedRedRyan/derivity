# 🤖 Deriv Bot Backend API

Complete Express.js backend server for the Trading Bot Platform with PostgreSQL (Neon) database integration.

**Status**: ✅ Ready for Production

## 🚀 Quick Start (30 seconds)

```bash
# Clone & setup
git clone https://github.com/DukeNyamasege/deriv-bot-backend.git
cd deriv-bot-backend
npm install

# Configure
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run
npm run dev
# Server at http://localhost:10000
```

## 📡 API Endpoints (11 Total)

### Bot Ideas (8 endpoints)

```
GET    /api/bot-ideas           # List all ideas
POST   /api/bot-ideas           # Create new idea
GET    /api/bot-ideas/:id       # Get specific idea
PUT    /api/bot-ideas/:id       # Update idea
DELETE /api/bot-ideas/:id       # Delete idea
GET    /api/bot-ideas/:id/xml   # Get bot XML
POST   /api/bot-ideas/:id/bot-xml  # Attach XML
DELETE /api/bot-ideas/:id/bot-xml  # Detach XML
```

### Best Bot Stats (3 endpoints)

```
GET    /api/best-bot-stats        # Top performing bots
GET    /api/best-bot-stats/:botId # Single bot stats
POST   /api/best-bot-stats/:botId # Update stats
```

### Scanner (2 endpoints)

```
GET    /api/scanner/signal   # Current market signal
POST   /api/scanner/signal   # Save new signal
```

## 🛠️ Setup Guide

### Prerequisites

- Node.js 20.x
- PostgreSQL database (Neon)
- npm or yarn

### Installation

```bash
git clone https://github.com/DukeNyamasege/deriv-bot-backend.git
cd deriv-bot-backend
npm install
```

### Configuration

Create `.env` file:

```env
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
PORT=10000
NODE_ENV=production
CORS_ORIGIN=https://riskmanagers.site,https://thenewui.netlify.app,http://localhost:5000
```

### Running

**Development:**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

**Render/Docker:**

```bash
npm run server
```

## 🗄️ Database Tables

Auto-created on startup:

**bot_ideas**

- Community-submitted trading strategies
- Stores XML bot implementations
- Tracks performance metrics

**scanner_signals**

- AI-generated market signals
- Market analysis data
- Signal validity tracking

**bot_stats**

- Bot performance statistics
- Win/loss tracking
- Profit/loss metrics

## 🔧 Tech Stack

| Layer          | Technology        |
| -------------- | ----------------- |
| **Runtime**    | Node.js 20.x      |
| **Framework**  | Express.js 4.21   |
| **Database**   | PostgreSQL (Neon) |
| **Security**   | Helmet.js, CORS   |
| **Logging**    | Morgan            |
| **Deployment** | Render.com        |

## 📚 Documentation

| Document                    | Purpose                     |
| --------------------------- | --------------------------- |
| **SETUP.md**                | Local development setup     |
| **DEPLOYMENT.md**           | Deploy to Render guide      |
| **QUICK_REFERENCE.md**      | Common commands & snippets  |
| **BACKEND_SUMMARY.md**      | Technical overview          |
| **FRONTEND_INTEGRATION.md** | Connect frontend to backend |

## 🚀 Deployment

### Render.com Deployment

1. Push to GitHub
2. Connect to Render
3. Set environment variables
4. Deploy

**Service URL**: https://deriv-bot-backend-4y8v.onrender.com

### Environment Variables (Render)

```
DATABASE_URL=postgresql://...
NODE_ENV=production
PORT=10000
CORS_ORIGIN=https://riskmanagers.site
```

## ✅ Features

✅ 11 REST API endpoints
✅ Full CRUD for bot ideas
✅ XML attachment system
✅ Performance statistics
✅ AI scanner integration
✅ Auto-create database tables
✅ PostgreSQL pooling
✅ CORS enabled
✅ Security headers (Helmet)
✅ Error handling
✅ Request logging (Morgan)
✅ Health check endpoint

## 📊 Monitoring

```bash
# Health check
curl http://localhost:10000/health

# All endpoints
curl http://localhost:10000/api/bot-ideas
curl http://localhost:10000/api/scanner/signal
curl http://localhost:10000/api/best-bot-stats
```

## 🔗 Connected Services

- **Frontend**: https://riskmanagers.site
- **Database**: Neon PostgreSQL
- **Hosting**: Render.com
- **CDN**: Global edge caching

## 📄 License

MIT - See LICENSE file

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to GitHub
5. Create Pull Request

## 📞 Support

Check documentation files:

- Local issues → SETUP.md
- Deployment issues → DEPLOYMENT.md
- API issues → API_ENDPOINTS.md
- Integration issues → FRONTEND_INTEGRATION.md
