# StockPilot AI Service

A small FastAPI microservice that performs object detection on uploaded stock
images and returns aggregated counts. It is an independent integration point;
the main StockPilot backend never crashes if this service is down.

## Endpoints

- `GET /health` — liveness probe.
- `GET /` — service info (whether a model + API key are configured).
- `POST /detect` (multipart, field `file`) — returns
  `{ detections: [{ product, count, confidence }], model, mock }`.

## Run locally

```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit with your Roboflow API key
uvicorn app.main:app --reload --port 8001
```

Without an API key the service returns deterministic placeholder detections,
so the React frontend remains usable during local development.

## Configure Roboflow

1. Sign up at <https://roboflow.com> (free).
2. Pick a model from <https://universe.roboflow.com> or train your own.
3. The model identifier looks like `workspace/project/version`,
   e.g. `cement-bag-counter/cement-bag/2`.
4. Copy your private API key from **Settings → API Keys**.
5. Set `ROBOFLOW_API_KEY` and `ROBOFLOW_MODEL` in `.env`.
