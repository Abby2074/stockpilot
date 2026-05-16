# StockPilot — Deployment Guide

This guide deploys the three services + the database on free tiers:

| Component        | Where          | Free tier  |
|------------------|----------------|------------|
| Frontend (React) | Vercel         | Yes        |
| Backend (FastAPI)| Render         | Yes        |
| AI service       | Render         | Yes        |
| PostgreSQL       | Render Postgres| Yes (90-day) |

You can use Render for **all three** services using the included `render.yaml`
blueprint (recommended for simplicity), or split frontend off to Vercel for
faster static-asset delivery.

---

## Step 1 — Push to GitHub

The repository should already contain:

```
/backend          # FastAPI app
/ai-service       # Roboflow proxy
/frontend         # React app
render.yaml       # Render blueprint
frontend/vercel.json
```

Create a private GitHub repo and push:

```bash
git init
git add .
git commit -m "StockPilot initial deploy"
git branch -M main
git remote add origin https://github.com/<you>/stockpilot.git
git push -u origin main
```

> `.env`, `venv/`, `node_modules/`, and `__pycache__/` are already in
> `.gitignore`s — make sure your real Roboflow API key is **not** committed.

---

## Step 2 — Deploy with Render Blueprint (one-click)

1. Go to <https://dashboard.render.com> and sign in.
2. **New ▸ Blueprint ▸ Connect repository**, choose your GitHub repo.
3. Render reads `render.yaml` and proposes 3 services + 1 database.
4. Click **Apply**.

After the build finishes, Render generates public URLs like:

* `https://stockpilot-backend.onrender.com`
* `https://stockpilot-ai.onrender.com`
* `https://stockpilot-frontend.onrender.com`

---

## Step 3 — Set secret env vars on the AI service

In the Render dashboard, open **stockpilot-ai → Environment** and set:

* `ROBOFLOW_API_KEY` = your private Roboflow API key

The non-secret values (`ROBOFLOW_WORKSPACE`, `ROBOFLOW_WORKFLOW`,
`ROBOFLOW_CLASSES`, `CONFIDENCE_THRESHOLD`) are already provided by
`render.yaml` and can be edited there for free.

Click **Save & Redeploy**.

---

## Step 4 — Seed the database

Render's free Postgres is empty when first provisioned. Seed it by running:

1. **stockpilot-backend → Shell** (one-off shell in the running container).
2. `python seed.py`

This creates the default branch, Owner user, and 54-product catalogue.

Default credentials (change immediately after first login):

```
Email:    abigail@example.com
Password: StockPilot2026!
```

---

## Alternative — Frontend on Vercel

If you'd rather host the frontend on Vercel (faster static delivery):

1. Remove the `stockpilot-frontend` service block from `render.yaml`.
2. Push and re-deploy on Render (backend + AI only).
3. Go to <https://vercel.com>, **New Project**, import the GitHub repo.
4. Set **Root Directory** = `frontend`.
5. In **Environment Variables** set:
   * `REACT_APP_API_BASE` = `https://stockpilot-backend.onrender.com`
   * `REACT_APP_AI_BASE`  = `https://stockpilot-ai.onrender.com`
6. Deploy.

Vercel reads `frontend/vercel.json` which already configures SPA routing.

---

## Local development

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # edit DATABASE_URL, SECRET_KEY
python seed.py
uvicorn app.main:app --reload --port 8000

# AI service
cd ../ai-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # paste your Roboflow API key
uvicorn app.main:app --reload --port 8001

# Frontend
cd ../frontend
npm install
npm start                         # http://localhost:3000
```

`start.sh` at the project root brings up all three at once for local development.

---

## Troubleshooting

* **Render free instances sleep after 15 min** of inactivity. First request
  after idle takes 30–60 s while the container wakes. This is normal.
* **Build fails with pydantic-core wheel error** — pin Python to 3.12 (already
  done in `render.yaml` via `PYTHON_VERSION=3.12.7`).
* **AI service returns `"mock": true`** — `ROBOFLOW_API_KEY` or
  `ROBOFLOW_WORKSPACE` is missing in the env vars.
* **Frontend can't talk to backend (CORS)** — verify
  `REACT_APP_API_BASE` and `REACT_APP_AI_BASE` are set on the frontend service
  and match the deployed URLs exactly.
