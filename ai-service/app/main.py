"""StockPilot AI microservice.

A separate FastAPI service that performs object detection on uploaded stock
images. The main StockPilot backend treats this as an independent integration
point: if the service is down or returns no detections, the main system
continues to function and falls back to manual stock entry, as specified in
Sections 4.3 and 5.5 of the thesis.

Detection backend: Roboflow Workflows — specifically YOLO-World, an
open-vocabulary object detector. We pass a list of class names (cement bag,
iron rod, etc.) on every request and the model detects them zero-shot. No
custom training required.

The service is configured via .env:

    ROBOFLOW_API_KEY=...               # required for live detection
    ROBOFLOW_WORKSPACE=...              # required for live detection
    ROBOFLOW_WORKFLOW=yolo-world-medium-demo
    ROBOFLOW_CLASSES="cement bag,iron rod,steel pipe,brick,sandcrete block"
    CONFIDENCE_THRESHOLD=0.15           # YOLO-World runs lower than fixed-class YOLO

If the API key + workflow are blank the service returns a deterministic
placeholder so frontend development continues without external dependencies.
"""

from __future__ import annotations

import base64
import io
import os
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

import requests
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel


def _load_env_file() -> None:
    """Tiny .env loader so the service is self-contained (no dotenv dependency)."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_env_file()


ROBOFLOW_API_KEY  = os.getenv("ROBOFLOW_API_KEY", "").strip()
ROBOFLOW_WORKSPACE = os.getenv("ROBOFLOW_WORKSPACE", "").strip()
ROBOFLOW_WORKFLOW = os.getenv("ROBOFLOW_WORKFLOW", "yolo-world-medium-demo").strip()
ROBOFLOW_BASE = os.getenv("ROBOFLOW_BASE", "https://serverless.roboflow.com").rstrip("/")
ROBOFLOW_CLASSES = [
    c.strip() for c in os.getenv(
        "ROBOFLOW_CLASSES",
        "cement bag,iron rod,steel pipe,brick,sandcrete block,paint drum,plywood sheet,nail box",
    ).split(",") if c.strip()
]
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.15"))
# Hosted inference APIs reject large payloads. We downsize before base64-encoding.
MAX_IMAGE_DIM   = int(os.getenv("MAX_IMAGE_DIM", "1024"))   # longest edge, px
JPEG_QUALITY    = int(os.getenv("JPEG_QUALITY", "82"))

# ── Gemini Vision (optional secondary backend) ──────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-flash-latest").strip()
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
)

# Which backend(s) to use? "gemini" | "roboflow" | "hybrid" (gemini first, roboflow fallback)
DETECTION_BACKEND = os.getenv("DETECTION_BACKEND", "hybrid" if GEMINI_API_KEY else "roboflow").strip().lower()


app = FastAPI(
    title="StockPilot AI Service",
    description="Object-detection microservice for AI-assisted stock counting (Roboflow Workflows + YOLO-World).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Detection(BaseModel):
    product: str
    count: int
    confidence: float


class DetectionResponse(BaseModel):
    detections: list[Detection]
    model: str
    mock: bool


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "stockpilot-ai",
        "model_configured": bool(
            (ROBOFLOW_WORKSPACE and ROBOFLOW_WORKFLOW) or GEMINI_API_KEY
        ),
        "api_key_configured": bool(ROBOFLOW_API_KEY or GEMINI_API_KEY),
        "backend": DETECTION_BACKEND,
        "workflow": ROBOFLOW_WORKFLOW,
        "gemini_model": GEMINI_MODEL if GEMINI_API_KEY else None,
        "classes": ROBOFLOW_CLASSES,
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.post("/detect", response_model=DetectionResponse)
async def detect(file: UploadFile = File(...)) -> DetectionResponse:
    """Run object counting/identification on an uploaded image.

    Dispatch:
      - backend=gemini    → call Gemini Vision only (best counts, no bboxes)
      - backend=roboflow  → call the Roboflow workflow only (bboxes, COCO classes)
      - backend=hybrid    → Gemini first; if it fails, fall back to Roboflow

    The response shape is identical across backends so the frontend stays the same.
    """
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="empty image upload")

    backend = DETECTION_BACKEND

    if backend in ("gemini", "hybrid") and GEMINI_API_KEY:
        try:
            detections = _call_gemini(image_bytes)
            if detections:
                return DetectionResponse(
                    detections=detections,
                    model=f"google/{GEMINI_MODEL}",
                    mock=False,
                )
            # Gemini returned nothing useful — try Roboflow if hybrid
            if backend == "gemini":
                return DetectionResponse(detections=[], model=f"google/{GEMINI_MODEL}", mock=False)
        except requests.RequestException as exc:
            if backend == "gemini":
                raise HTTPException(status_code=502, detail=f"Gemini backend unreachable: {exc}") from exc
            # hybrid: fall through to Roboflow

    if backend in ("roboflow", "hybrid") and ROBOFLOW_API_KEY and ROBOFLOW_WORKSPACE and ROBOFLOW_WORKFLOW:
        try:
            predictions = _call_roboflow_workflow(image_bytes)
        except requests.RequestException as exc:
            raise HTTPException(status_code=502, detail=f"Roboflow backend unreachable: {exc}") from exc
        return DetectionResponse(
            detections=_aggregate(predictions),
            model=f"{ROBOFLOW_WORKSPACE}/{ROBOFLOW_WORKFLOW}",
            mock=False,
        )

    return DetectionResponse(
        detections=_placeholder_detections(file.filename or ""),
        model="placeholder",
        mock=True,
    )


def _preprocess_image(image_bytes: bytes) -> bytes:
    """Resize/normalise an uploaded image so it stays under hosted-API size limits.

    - Forces JPEG (workflows accept JPEG/PNG; JPEG is smaller).
    - Caps the longest edge at MAX_IMAGE_DIM (default 1024 px).
    - Compresses with JPEG_QUALITY (default 82).
    - Strips EXIF metadata that occasionally trips strict parsers.
    """
    img = Image.open(io.BytesIO(image_bytes))
    img = img.convert("RGB")  # JPEG doesn't support alpha
    w, h = img.size
    longest = max(w, h)
    if longest > MAX_IMAGE_DIM:
        scale = MAX_IMAGE_DIM / float(longest)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return buf.getvalue()


import json as _json


def _call_gemini(image_bytes: bytes) -> list[Detection]:
    """Send the image to Gemini Vision and ask for a structured count.

    We prompt Gemini with the same construction-materials class list as Roboflow
    plus an "other" bucket, and ask it to return strict JSON we can parse.
    """
    processed = _preprocess_image(image_bytes)
    encoded = base64.b64encode(processed).decode("ascii")

    classes_hint = ", ".join(ROBOFLOW_CLASSES) if ROBOFLOW_CLASSES else "construction materials"
    instruction = (
        "You are a stock-counting assistant. Look at this photo and identify every distinct "
        "type of countable item visible, then estimate the count of each type. "
        "Count every visible item — do not skip categories. If the items are stacked or "
        "bundled, give your best whole-number estimate (don't return zero). "
        f"When an item matches one of these construction categories, use that name: {classes_hint}. "
        "For anything else, use a short plain-English noun (e.g. 'person', 'car', 'wooden plank', "
        "'water bottle'). "
        "Return ONLY a strict JSON array. NO prose. NO markdown fences. "
        'Schema: [{"product": "<short noun>", "count": <integer>, "confidence": <0.0-1.0>}, ...] '
        "Always return at least one item if anything countable is visible."
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": instruction},
                    {"inline_data": {"mime_type": "image/jpeg", "data": encoded}},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "response_mime_type": "application/json",
        },
    }
    response = requests.post(
        GEMINI_URL,
        json=payload,
        headers={
            "Content-Type": "application/json",
            "X-goog-api-key": GEMINI_API_KEY,
        },
        timeout=60,
    )
    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = response.text[:500]
        raise requests.HTTPError(
            f"{response.status_code} from Gemini: {detail}", response=response
        )

    body = response.json()
    try:
        text = body["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:
        raise requests.RequestException(f"unexpected Gemini response: {body}") from exc

    # Gemini sometimes wraps JSON in ```json … ``` even with response_mime_type set.
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    try:
        items = _json.loads(cleaned)
    except _json.JSONDecodeError:
        # Try to find the first [...] block
        import re
        m = re.search(r"\[.*\]", cleaned, re.DOTALL)
        if not m:
            raise requests.RequestException(f"Gemini did not return parseable JSON: {cleaned[:200]}")
        items = _json.loads(m.group(0))

    out: list[Detection] = []
    for it in (items or []):
        try:
            product = str(it.get("product") or it.get("class") or "").strip()
            count = int(it.get("count", 0))
            conf = float(it.get("confidence", 0.85))
            if product and count > 0:
                out.append(Detection(product=product, count=count, confidence=round(conf, 3)))
        except (TypeError, ValueError):
            continue
    return out


def _call_roboflow_workflow(image_bytes: bytes) -> list[dict[str, Any]]:
    processed = _preprocess_image(image_bytes)
    encoded = base64.b64encode(processed).decode("ascii")
    url = f"{ROBOFLOW_BASE}/{ROBOFLOW_WORKSPACE}/workflows/{ROBOFLOW_WORKFLOW}"
    payload: dict[str, Any] = {
        "api_key": ROBOFLOW_API_KEY,
        "inputs": {
            "image": {"type": "base64", "value": encoded},
        },
    }
    # YOLO-World requires a classes input. Other workflows ignore it gracefully.
    if ROBOFLOW_CLASSES:
        payload["inputs"]["classes"] = ROBOFLOW_CLASSES
    response = requests.post(
        url,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=60,
    )
    if response.status_code >= 400:
        # Surface the upstream error body — much more useful than a bare status.
        try:
            detail = response.json()
        except Exception:
            detail = response.text[:500]
        raise requests.HTTPError(
            f"{response.status_code} from Roboflow: {detail}",
            response=response,
        )
    body = response.json()
    return _extract_predictions(body)


def _extract_predictions(body: Any) -> list[dict[str, Any]]:
    """Roboflow Workflows wrap model output in a results envelope whose shape
    depends on the workflow. We walk the structure and return the first
    detection list we find — using id() to avoid double-walking shared subtrees."""
    seen: set[int] = set()
    found: list[list[dict[str, Any]]] = []
    _walk_for_predictions(body, found, seen)
    # Flatten any lists collected. In practice there's only one per response.
    return [item for batch in found for item in batch]


def _walk_for_predictions(
    node: Any, out: list[list[dict[str, Any]]], seen: set[int]
) -> None:
    if id(node) in seen:
        return
    seen.add(id(node))
    if isinstance(node, dict):
        # Common shape: { "predictions": [ {class, confidence, ...}, ... ] }
        inner = node.get("predictions")
        if isinstance(inner, list) and inner and isinstance(inner[0], dict) and (
            "class" in inner[0] or "label" in inner[0]
        ):
            out.append(inner)
            return  # don't descend further from this node
        for value in node.values():
            _walk_for_predictions(value, out, seen)
    elif isinstance(node, list):
        for item in node:
            _walk_for_predictions(item, out, seen)


def _aggregate(predictions: Iterable[dict[str, Any]]) -> list[Detection]:
    """Group predictions by class label and average their confidence."""
    counts: Counter[str] = Counter()
    confidence_sums: dict[str, float] = {}
    for pred in predictions:
        confidence = float(pred.get("confidence", 0))
        if confidence < CONFIDENCE_THRESHOLD:
            continue
        label = str(pred.get("class") or pred.get("label") or "unknown")
        counts[label] += 1
        confidence_sums[label] = confidence_sums.get(label, 0.0) + confidence
    return [
        Detection(
            product=label,
            count=count,
            confidence=round(confidence_sums[label] / count, 3),
        )
        for label, count in counts.most_common()
    ]


def _placeholder_detections(filename: str) -> list[Detection]:
    haystack = filename.lower()
    catalogue = [
        (("cement", "bag", "portland"), "Portland cement 50kg", 84, 0.96),
        (("rebar", "rod", "iron", "12mm"), "Iron rod 12mm", 56, 0.89),
        (("block", "sandcrete"), "Sandcrete block 6\"", 156, 0.94),
        (("pipe", "gi"), "GI steel pipe 2 inch", 22, 0.85),
        (("nail",), "Common wire nails 3\"", 12, 0.83),
    ]
    matches = [
        Detection(product=name, count=count, confidence=conf)
        for keywords, name, count, conf in catalogue
        if any(k in haystack for k in keywords)
    ]
    if not matches:
        matches = [Detection(product="Unrecognised stock item", count=0, confidence=0.42)]
    return matches
