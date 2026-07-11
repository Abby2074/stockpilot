# StockPilot — Session Handoff
**Last updated:** 2026-06-03 · Continuation of a thesis + Tech Fair build with the user.

> **To resume:** start a new Claude Code session in `/Users/abigail/Desktop/inventory-system` and paste this prompt:
>
> > "Read `SESSION_HANDOFF.md` at the repo root and continue the work from where the previous session stopped. Always ask before committing significant actions (the user has explicitly requested this rule). Use the installed skills (`academic-poster`, `academic-writing`, `advanced-source-checker`, `humanizer`, `university-student-writer`, `anthropic-skills:docx`, `anthropic-skills:pptx`) when relevant. Use TaskCreate / TaskUpdate to track multi-step work."

---

## The user
- **Name:** Adebayo Abigail Adeola
- **Email:** d9iceguy@gmail.com  ·  abigail.adebayo@gimpa.edu.gh
- **Student ID:** 223013501
- **Programme:** BSc Management Information Systems, GIMPA, 2025/2026
- **Supervisor:** Dr. Nana Assyne
- **Working style:** explicit "ask before any significant action" rule. Surface trade-offs. Be honest about limits. Use everything she gives you — if you don't need it, explain why.

---

## The artefact

**StockPilot** — AI-integrated, role-based inventory management system for Ghanaian SMEs. Final-year BSc thesis project.

Three-tier web app, fully deployed, fully open-source:
- **Frontend:** React 19 + Tailwind + Recharts. Hosted on **Vercel**.
- **Backend:** FastAPI + SQLAlchemy 2.0 + JWT auth. Hosted on **Render** (free tier).
- **Database:** PostgreSQL 16 managed by Render.
- **AI service:** Standalone FastAPI microservice. Hybrid Gemini Vision + Roboflow YOLO-World. Hosted on **Render** (free tier).

---

## Live URLs
- **Production frontend:** https://stockpilot-mauve.vercel.app
- **Backend API:** https://stockpilot-backend-egtf.onrender.com
- **AI service:** https://stockpilot-ai-t8c4.onrender.com
- **Swagger docs:** https://stockpilot-backend-egtf.onrender.com/docs
- **GitHub:** https://github.com/Abby2074/stockpilot

## Seed Owner login (demo only — rotate after marking)
- Credentials are defined in `backend/seed.py` (`DEFAULT_OWNER_EMAIL` and
  `DEFAULT_OWNER_PASSWORD`). Use those constants. **Rotate after marking.**

---

## Repo layout
```
inventory-system/
├── backend/                 FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── routes/          auth, products, transactions, users, alerts, audit, branches, ai_count
│   │   ├── models/models.py 10 tables incl. AICountSession, AIDetection, AuditLog, AlertNotification
│   │   ├── schemas/         pydantic
│   │   ├── services/alerts.py role-targeted alert dispatcher
│   │   └── main.py          FastAPI app
│   ├── seed.py              82 products + 3 branches + Owner
│   ├── requirements.txt
│   └── .env (gitignored)    DATABASE_URL, SECRET_KEY
├── ai-service/              standalone Gemini+YOLO microservice
│   ├── app/main.py          /detect endpoint, hybrid Gemini/Roboflow dispatch
│   ├── requirements.txt
│   └── .env (gitignored)    ROBOFLOW_API_KEY (Roboflow workspace key), GEMINI_API_KEY (Google AI Studio key, see local .env), GEMINI_MODEL=gemini-flash-latest
├── frontend/                React app
│   ├── src/
│   │   ├── pages/           Login, Dashboard, Products, Transactions, AICount, Users, AuditLog
│   │   ├── components/      Sidebar (drawer on mobile), Topbar (with alert bell), AppShell
│   │   ├── lib/api.js       all API clients
│   │   └── index.css        Tailwind + custom design tokens
│   └── package.json
├── seed-images/             test images for AI Count demo
│   ├── ai-demo/             bus, dog, etc. (Gemini works well)
│   └── construction/        cement bags, rebar, pipes
├── render.yaml              blueprint deploy
├── DEPLOYMENT.md            full deploy guide
└── SESSION_HANDOFF.md       this file
```

---

## What works today (state as of 2026-06-03)

### Backend routes (all live)
- `POST /auth/register`, `POST /auth/login` — JWT
- `GET/POST/PUT/DELETE /products` (role-gated)
- `GET/POST /transactions`, `POST /transactions/{id}/approve|reject` — separation of duties enforced
- `GET/POST/DELETE /users`, `POST /users/{id}/activate` — soft delete + reactivate (Owner only)
- `GET/POST /branches`
- `GET /alerts`, `GET /alerts/count`, `POST /alerts/{id}/read`, `POST /alerts/read-all`, `POST /alerts/test`
- `GET /audit` (Owner only)
- `GET/POST /ai-count-sessions`, `POST /ai-count-sessions/{id}/approve|reject` — AI count audit + stock update

### Frontend
- All 6 pages (Login, Dashboard, Products, Transactions, AI Count, Users, Audit Log) deployed
- **Dashboard wired to live API** — pending count, recent transactions, approver action panel all real
- **Topbar bell** polls every 20s + listens for `stockpilot:alerts:refresh` window event for instant updates after create/approve/reject
- **Users page:** Owner can deactivate (red) + reactivate (green); status badge reflects DB
- **AI Count:** approve/reject calls backend, creates AICountSession + AIDetection rows, fuzzy-matches AI labels to products, applies matched detections to stock_levels, writes audit log
- **Mobile responsive:** sidebar collapses to drawer + hamburger button on <md; tables horizontal-scroll; modals full-width <480px

### Data
- **82 products** in catalogue (54 original + 28 steel sections/plates added 2026-06-03)
- **3 branches:** Accra Main, Kumasi Branch, Tema Branch
- **7 PENDING transactions** seeded to demonstrate Dashboard + alerts pipeline
- Owner account: abigail@example.com / StockPilot2026!

### AI service
- Backend: `DETECTION_BACKEND=hybrid` — calls Gemini first, falls back to Roboflow workflow
- **Gemini key configured locally** (in ai-service/.env). **Render env var NOT yet set** — user needs to add `GEMINI_API_KEY` + `GEMINI_MODEL=gemini-flash-latest` on Render dashboard for the live AI service to use Gemini. Until then, prod falls back to Roboflow.

---

## Documents on disk (relevant to this work)

| Path | What |
|---|---|
| `~/Documents/FINAL THESEIS.docx` | Final thesis (clean version, no tracked changes). 33 cited sources, all corrections applied (§5.1, §5.3, §5.4, §5.5, §5.7, §5.8 + Table 5.1 + List of Tables entry + cover-page font fix + deployment paragraph in §5.2). |
| `~/Documents/FINAL THESEIS.backup*.docx` | Several timestamped backups. |
| `~/Documents/2026MIS223013501.docx` | Submitted/final-version draft with cover-page font fix + §5.2 deployment paragraph |
| `~/Documents/2026MIS223013501.backup.docx` | Pre-edit backup |
| `~/Downloads/2026MIS223013501.pdf` | Turnitin similarity report — 9% overall, all matches <1%, clean |
| `~/Downloads/StockPilot_Poster_OnePage.html` | GIMPA Tech Fair poster — one-page-fit CSS compression applied. Open in Chrome → Cmd+P → Save as PDF → A1 portrait. |
| `~/Downloads/StockPilot_Poster_GIMPA2026.html` | Original two-page poster (preserved) |
| `~/Downloads/StockPilot_Pitch_Script.md` | 5-minute pitch script + Q&A prep + demo plan + checklist |
| `~/Downloads/StockPilot_Pitch_Slides.pptx` | 12-slide deck for the Tech Fair |
| `~/Downloads/figure-5.3-sidebar-comparison.png` | Side-by-side Owner vs Storekeeper sidebar (embedded in thesis) |

---

## Outstanding / known gaps

1. **GEMINI_API_KEY not on Render yet.** User needs to add it in the AI service Environment tab so production uses Gemini. Without it, prod runs Roboflow-only.
2. **AI detection accuracy on construction images** is fundamentally limited by the model. Gemini works well on everyday objects; for cement-bags/iron-rods specifically, would need a custom-trained Roboflow model. Acknowledged in thesis §5.8.
3. **SMS gateway** (Hubtel/Arkesel) is scaffolded but not wired — SMS_ENABLED=false. Acknowledged as future work.
4. **Production seed user creds** are in this file + in the thesis text. After marking, the user should rotate the password and the DATABASE_URL on Render.
5. **Mobile responsive** is implemented but not exhaustively tested on every screen + every breakpoint. Spot-check on actual phone before showing on June 3rd.
6. **Render free tier sleeps after 15 min** — first request after idle takes 30-60s. Mentioned in thesis §5.2 deployment paragraph and worth saying aloud in the pitch.

---

## Installed Claude Code skills (for next session)

```
~/.claude/skills/
├── academic-writing/        pre-installed
├── academic-poster/         user-uploaded
├── advanced-source-checker/ user-uploaded
├── humanizer/               pre-installed
├── university-student-writer/ user-uploaded
└── drawio-assistant/        pre-installed
```

Plus the `anthropic-skills:*` namespace (`docx`, `pptx`, `pdf`, `xlsx`, etc.) — server-side, auto-available.

---

## User's working rules (verbatim, from session)

- **"Don't ever act independently again. Always ask question before committing an action and use everything I give you and if you think it isn't necessary inform me or something."**
- Wants honest trade-offs surfaced before doing work.
- Prefers numbered options in AskUserQuestion blocks.
- Prefers one-page artefacts when applicable (poster).
- Tone for pitching: confident + numbers-led.

---

## Quick verifications a fresh session can run

```bash
# 1. Backend health
curl https://stockpilot-backend-egtf.onrender.com/health

# 2. Login and count products + pending tx
TOKEN=$(curl -sS -X POST https://stockpilot-backend-egtf.onrender.com/auth/login \
  -H 'Content-Type: application/json' \
  -d "$(python3 -c 'import json,sys; sys.path.insert(0,"backend"); from seed import DEFAULT_OWNER_EMAIL as e, DEFAULT_OWNER_PASSWORD as p; print(json.dumps({"email":e,"password":p}))')" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
echo "Products: $(curl -sS -H "Authorization: Bearer $TOKEN" https://stockpilot-backend-egtf.onrender.com/products | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))')"
echo "Pending tx: $(curl -sS -H "Authorization: Bearer $TOKEN" https://stockpilot-backend-egtf.onrender.com/transactions | python3 -c 'import sys,json,sys; d=json.load(sys.stdin); print(sum(1 for t in d if t.get(\"status\")==\"PENDING\"))')"
echo "Alerts: $(curl -sS -H "Authorization: Bearer $TOKEN" https://stockpilot-backend-egtf.onrender.com/alerts/count)"

# 3. AI service mode
curl -sS https://stockpilot-ai-t8c4.onrender.com/ | python3 -m json.tool

# Expected as of 2026-06-03: 82 products, 7 pending, {"unread":7,"total":8}
# AI backend: "roboflow" (because GEMINI_API_KEY not yet set on Render) or "hybrid" if user added it
```

---

---

## 🟡 IMMEDIATE FIRST TASK for the new session (2026-06-03)

The user uploaded **`/Users/abigail/Downloads/223013501.docx`** — the **official project assessment / marking rubric** from her school.

**She wants:**
1. **Read that docx in full** — every criterion, weighting, and expected deliverable.
2. **Compare it, point-by-point, against what StockPilot actually delivers** (this repo + the thesis at `~/Documents/2026MIS223013501.docx` + the poster at `~/Downloads/StockPilot_Poster_OnePage.html` + the pitch at `~/Downloads/StockPilot_Pitch_*`).
3. **Give her an honest verdict.** For every criterion in the rubric:
   - Where does StockPilot **hit** it? (cite the file / page / section)
   - Where does it **miss or fall short**? (be direct — she prefers honest trade-offs)
   - What **single change** would raise the score most for the effort?
4. Then ask her which of those to act on next.

**How to read the docx (skill route):**
- Use the `anthropic-skills:docx` skill or `pypdf`/unpack for text extraction.
- The `ai-service/venv/bin/python` interpreter has `pypdf` installed.
- Or unpack directly: `unzip "$doc" -d /tmp/rubric_unpacked` then read `word/document.xml`.

**Do NOT dive into implementation.** She has explicitly asked you to just read, compare, and *give her the verdict first* — then she decides next steps.

## End of handoff.
