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
import os
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

import requests
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
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
        "model_configured": bool(ROBOFLOW_WORKSPACE and ROBOFLOW_WORKFLOW),
        "api_key_configured": bool(ROBOFLOW_API_KEY),
        "workflow": ROBOFLOW_WORKFLOW,
        "classes": ROBOFLOW_CLASSES,
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.post("/detect", response_model=DetectionResponse)
async def detect(file: UploadFile = File(...)) -> DetectionResponse:
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="empty image upload")

    if ROBOFLOW_API_KEY and ROBOFLOW_WORKSPACE and ROBOFLOW_WORKFLOW:
        try:
            predictions = _call_roboflow_workflow(image_bytes)
        except requests.RequestException as exc:
            raise HTTPException(
                status_code=502,
                detail=f"detection backend unreachable: {exc}",
            ) from exc
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


def _call_roboflow_workflow(image_bytes: bytes) -> list[dict[str, Any]]:
    encoded = base64.b64encode(image_bytes).decode("ascii")
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
    response.raise_for_status()
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
