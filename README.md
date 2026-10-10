# NAS100 Trading Journal (MLP)

frontend/  -> static site (deploy on Vercel)
backend/   -> Express API + Turso/libSQL (deploy on Render)

## 1. Turso
turso db create nas100-journal
turso db show nas100-journal --url
turso db tokens create nas100-journal

## 2. Backend on Render
- New Web Service -> root directory: backend
- Build: npm install   Start: npm start
- Env vars: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, JWT_SECRET, FRONTEND_URL (your Vercel URL)
- Tables are created automatically on first start.

## 3. Frontend on Vercel
- Edit `const API` at the top of frontend/index.html to your Render URL
- Import repo -> root directory: frontend -> Framework: Other -> Deploy

## Local test
cd backend && npm install && npm run dev   (uses local.db if no Turso vars)
Open frontend/index.html in a browser.
