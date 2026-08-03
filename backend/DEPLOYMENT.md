# Deployment Guide for Render.com

## Prerequisites

- GitHub account with forked repo
- Render.com account
- Neon PostgreSQL database
- Node.js 20.x

## Step 1: Prepare GitHub Repository

```bash
# Clone backend repo
git clone https://github.com/DukeNyamasege/deriv-bot-backend.git
cd deriv-bot-backend

# Initialize git (if not already done)
git init
git add .
git commit -m "Initial backend setup"
git push origin main
```

## Step 2: Create Render Service

1. Go to https://dashboard.render.com/
2. Click "New +" → "Web Service"
3. Select "Deploy an existing repository"
4. Choose your GitHub repo
5. Configure:
    - **Name**: `deriv-bot-backend`
    - **Runtime**: Node
    - **Build Command**: `npm install`
    - **Start Command**: `npm run server`
    - **Instance Type**: Free (for testing)

## Step 3: Set Environment Variables

In Render dashboard:

1. Go to Service Settings
2. Environment Variables
3. Add:

```
DATABASE_URL=postgresql://neondb_owner:npg_PXGYsnqC3i2z@ep-dry-cherry-anulwfjs.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require
NODE_ENV=production
PORT=10000
CORS_ORIGIN=https://riskmanagers.site,https://thenewui.netlify.app,http://localhost:5000
```

## Step 4: Deploy

1. Click "Create Web Service"
2. Wait for build to complete
3. Check logs for "API server running"
4. Copy service URL

## Step 5: Test Deployment

```bash
# Test health endpoint
curl https://deriv-bot-backend-4y8v.onrender.com/health

# Test API
curl https://deriv-bot-backend-4y8v.onrender.com/api/bot-ideas
```

## Step 6: Connect Frontend

Update frontend environment:

```env
REACT_APP_API_URL=https://deriv-bot-backend-4y8v.onrender.com/api
```

## Monitoring

- **Logs**: Dashboard → Service → Logs tab
- **Health**: `/health` endpoint
- **Database**: Check Neon console

## Troubleshooting

**Build fails:**

- Check package.json syntax
- Verify all dependencies installed
- Review build logs

**Runtime errors:**

- Check DATABASE_URL format
- Verify Node version 20
- Review service logs

**Port not exposed:**

- Ensure PORT env var set
- Check start command uses PORT

## Auto-Deploy

Enable auto-deploy from GitHub:

1. Service Settings → Repository
2. Enable "Auto-Deploy" toggle
3. Pushes to main auto-trigger builds

## Performance Tips

- Use connection pooling for database
- Enable caching headers
- Monitor response times
- Scale as needed (upgrade from Free)
