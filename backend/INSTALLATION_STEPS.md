# Installation Steps (Copy-Paste Ready)

## Step 1: Create GitHub Repository

```bash
# Navigate to workspace
cd c:\Users\Admin\Desktop\auth fix\new ui

# Clone or create backend repo
git clone https://github.com/DukeNyamasege/deriv-bot-backend.git
cd deriv-bot-backend
```

## Step 2: Install Dependencies

```bash
npm install
```

**Expected output:**

```
added 67 packages
audited 68 packages
found 0 vulnerabilities
```

## Step 3: Setup Environment

```bash
# Copy template
cp .env.example .env

# Edit with your database URL
# For Windows Notepad:
notepad .env
```

**Paste this into .env:**

```env
DATABASE_URL=postgresql://neondb_owner:npg_PXGYsnqC3i2z@ep-dry-cherry-anulwfjs.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require
PORT=10000
NODE_ENV=production
CORS_ORIGIN=https://riskmanagers.site,https://thenewui.netlify.app,http://localhost:5000
```

## Step 4: Verify Installation

```bash
# Check Node version
node --version
# Should show: v20.x.x

# Check npm version
npm --version
# Should show: 10.x.x

# List dependencies
npm list --depth=0
```

## Step 5: Start Server Locally

```bash
npm run dev
```

**Expected output:**

```
[DB] Database connection successful
[DB] Database tables verified / created.
API server running on http://0.0.0.0:10000
```

## Step 6: Test API (Open new terminal)

```bash
# Health check
curl http://localhost:10000/health

# Get bot ideas
curl http://localhost:10000/api/bot-ideas

# Get scanner signal
curl http://localhost:10000/api/scanner/signal
```

**Expected responses:**

- Health: `{"status":"OK","message":"API server is running"}`
- Ideas: `[]` (empty array, no ideas yet)
- Signal: `{"status":"initializing","signal":null,"nextScanTime":"..."}`

## Step 7: Push to GitHub

```bash
git add .
git commit -m "Initial backend API setup"
git push origin main
```

## Step 8: Deploy to Render.com

1. Go to https://dashboard.render.com/
2. Click "New +" → "Web Service"
3. Select your GitHub repo
4. Configure:
    - Name: `deriv-bot-backend`
    - Runtime: `Node`
    - Build: `npm install`
    - Start: `npm run server`
5. Add environment variable:
    - Key: `DATABASE_URL`
    - Value: `postgresql://...` (your Neon URL)
6. Click "Create Web Service"

**Wait for deploy to complete (2-5 minutes)**

## Step 9: Verify Production

```bash
# Replace with your Render service URL
curl https://deriv-bot-backend-4y8v.onrender.com/health
curl https://deriv-bot-backend-4y8v.onrender.com/api/bot-ideas
```

## Step 10: Update Frontend

In `new-user-interface` project:

```bash
# Add to .env.production
echo "VITE_API_BASE_URL=https://deriv-bot-backend-4y8v.onrender.com/api" >> .env.production

# Add to .env.development
echo "VITE_API_BASE_URL=http://localhost:10000/api" >> .env.development
```

## Troubleshooting

**npm install fails:**

```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

**Port already in use:**

```bash
# Use different port
PORT=3000 npm run dev
```

**Database connection error:**

```bash
# Verify DATABASE_URL
cat .env

# Test connection (install psql first)
psql [DATABASE_URL]
```

**Server won't start:**

```bash
# Check Node version
node --version
# Must be 20.x

# Check logs
npm run dev 2>&1 | head -50
```

## Success Checklist

- [x] Node 20 installed
- [x] npm dependencies installed
- [x] .env configured
- [x] Database URL correct
- [x] Server runs locally
- [x] API endpoints respond
- [x] Pushed to GitHub
- [x] Deployed to Render
- [x] Production working
- [x] Frontend configured

## 🎉 You're Done!

Backend is running and ready for production.

**Next:** Integrate with frontend and test end-to-end.
