# Ghost of Stocktwits — Setup Guide
## Full local + Vercel deployment walkthrough

---

## PART 1 — Local Setup (test before deploying)

### Step 1: Install Node.js
Download from https://nodejs.org — install the LTS version

### Step 2: Open a terminal in the project folder
```bash
cd ghost-app
```

### Step 3: Create your .env.local file
Copy the example file:
```bash
cp .env.local.example .env.local
```

Open .env.local and fill in:
- SESSION_SECRET: go to https://1password.com/password-generator/ — generate a 40-char random string, paste it in
- Everything else is already pre-filled with your credentials

### Step 4: Install dependencies
```bash
npm install
```

### Step 5: Run locally
```bash
npm run dev
```

Open http://localhost:3000 in your browser.
You should see the Ghost of Stocktwits landing page.

Click "Login with Discord" and test the auth flow.

---

## PART 2 — Deploy to Vercel (live URL)

### Step 1: Push to GitHub
1. Go to github.com → New Repository → name it "ghost-of-stocktwits" → Create
2. In your terminal:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ghost-of-stocktwits.git
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to vercel.com → New Project
2. Import your GitHub repo
3. Click Deploy (defaults are fine)
4. Vercel gives you a URL like: https://ghost-of-stocktwits.vercel.app

### Step 3: Add Environment Variables in Vercel
In Vercel → Project → Settings → Environment Variables, add ALL of these:

| Key | Value |
|---|---|
| DISCORD_CLIENT_ID | 1509192200662028339 |
| DISCORD_CLIENT_SECRET | Y70bIxlvvZtP44yWmB_W-7NvX8P3SF_0 |
| DISCORD_SERVER_ID | 1124555639516053606 |
| DISCORD_REDIRECT_URI | https://YOUR-APP.vercel.app/callback |
| SESSION_SECRET | (same random string from .env.local) |
| DISCORD_WEBHOOK_URL | (your webhook URL) |

### Step 4: Add Vercel URL to Discord OAuth
1. Go to discord.com/developers/applications
2. Click your "Ghost of Stocktwits" app
3. Click OAuth2 → Redirects
4. Add: https://YOUR-APP.vercel.app/callback
5. Save Changes

### Step 5: Redeploy on Vercel
In Vercel → Deployments → click the three dots on your latest deploy → Redeploy

---

## PART 3 — Add Your Discord Invite Link

Open pages/index.js and find line:
```javascript
const DISCORD_INVITE = 'https://discord.gg/YOUR_INVITE_LINK'
```
Replace YOUR_INVITE_LINK with your actual Discord invite code.

---

## PART 4 — Add PDUFA Dates Manually

Open pages/api/catalysts.js and find the STATIC_PDUFA array near the top.
Add entries like this:
```javascript
const STATIC_PDUFA = [
  {
    date: '2026-07-15',
    ticker: 'NUVB',
    drug: 'NUV-868',
    catalyst: 'PDUFA — NDA',
    company: 'Nuvation Bio',
  },
  // add more below...
]
```

This is your manual layer for PDUFA dates you track yourself.
ClinicalTrials.gov handles the trial readouts automatically.

---

## DONE ✅
Your site is live at your Vercel URL.
Pin it in your Discord #catalyst-calendar channel.
Members login with Discord and get full access.
Non-members see the teaser page with your invite link.
