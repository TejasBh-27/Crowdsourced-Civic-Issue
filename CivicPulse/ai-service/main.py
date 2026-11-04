"""
main.py — CivicPulse Python FastAPI AI Microservice

Endpoints
─────────
GET  /             health probe
GET  /v1/ai/health health probe (backend uses this)
POST /v1/ai/inspect
    multipart/form-data:
        photo       : UploadFile  (JPEG / PNG / WebP)
        category    : str
        description : str
        latitude    : float
        longitude   : float  (optional)
    → JSON response matching AiResultSchema in backend/src/services/aiClient.ts

Real models used:
  CV  → OpenCV Laplacian variance blur detection (cv_module.py)
  NLP → TF-IDF + LogisticRegression             (nlp_module.py)
  ML  → RandomForestClassifier                  (ml_priority.py)
"""

import os
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from cv_module  import inspect_image
from nlp_module import classify_complaint, load_or_train_nlp
from ml_priority import score_priority, load_or_train_rf

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger("civicpulse-ai")


# ── Startup: pre-warm models so first request is fast ────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Pre-warming NLP model …")
    t0 = time.perf_counter()
    load_or_train_nlp()
    log.info(f"NLP ready in {time.perf_counter()-t0:.2f}s")

    log.info("Pre-warming RandomForest ML model …")
    t0 = time.perf_counter()
    load_or_train_rf()
    log.info(f"ML ready in {time.perf_counter()-t0:.2f}s")

    log.info("✅  CivicPulse AI microservice ready — all models loaded")
    yield


app = FastAPI(
    title="CivicPulse AI Microservice",
    description="Real CV (OpenCV) + NLP (TF-IDF/LogReg) + ML (RandomForest) pipeline",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Response schema (matches backend AiResultSchema) ─────────────────────────
class UrgencyResult(BaseModel):
    score: int = Field(..., ge=0, le=100)
    level: str

class AiInspectResponse(BaseModel):
    isValid:           bool
    confidence:        float
    rejectionReason:   Optional[str] = None
    urgency:           UrgencyResult
    cv:                dict
    nlp:               Optional[dict] = None
    ml:                Optional[dict] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/")
@app.get("/v1/ai/health")
async def health():
    return {"ok": True, "service": "CivicPulse AI", "version": "1.0.0"}


@app.post("/v1/ai/inspect", response_model=AiInspectResponse)
async def inspect(
    photo:       UploadFile = File(...,  description="Complaint photo (JPEG/PNG/WebP)"),
    category:    str        = Form(...,  description="Complaint category key"),
    description: str        = Form(...,  description="Complaint description text"),
    latitude:    float      = Form(0.0, description="Latitude of the issue"),
    longitude:   float      = Form(0.0, description="Longitude of the issue"),
    title:       str        = Form("",  description="Complaint title (optional)"),
):
    t_start = time.perf_counter()

    # ── 1. Read file bytes ────────────────────────────────────────────────────
    if photo.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(400, f"Unsupported image type: {photo.content_type}")

    image_bytes = await photo.read()
    file_size_bytes = len(image_bytes)

    log.info(f"Inspect request — category={category!r}  file={file_size_bytes:,}B  lat={latitude}")

    # ── 2. Computer Vision (OpenCV Laplacian) ────────────────────────────────
    cv_result = inspect_image(image_bytes)

    if not cv_result["is_valid"]:
        elapsed = time.perf_counter() - t_start
        log.info(f"CV REJECTED in {elapsed:.3f}s — {cv_result['rejection_reason']}")
        return AiInspectResponse(
            isValid=False,
            confidence=cv_result["confidence"],
            rejectionReason=cv_result["rejection_reason"],
            urgency=UrgencyResult(score=0, level="low"),
            cv={
                "clarityScore":       cv_result["clarity_score"],
                "laplacianVariance":  cv_result["details"].get("laplacian_variance"),
                "algorithm":          "OpenCV Laplacian Variance",
                "model":              "CivicCV-OpenCV v1.0",
                **cv_result["details"],
            },
        )

    # ── 3. NLP Department Classification (TF-IDF + LogisticRegression) ───────
    nlp_result = classify_complaint(
        title=title,
        description=description,
        category_hint=category,
    )

    # ── 4. ML Priority Scoring (RandomForest) ────────────────────────────────
    ml_result = score_priority(
        category=category,
        clarity_score=cv_result["clarity_score"],
        nlp_confidence=nlp_result["confidence"],
        file_size_bytes=file_size_bytes,
        description=f"{title} {description}",
    )

    elapsed = time.perf_counter() - t_start
    log.info(
        f"VERIFIED in {elapsed:.3f}s — "
        f"dept={nlp_result['department_key']!r}  "
        f"priority={ml_result['level']}({ml_result['score']})"
    )

    return AiInspectResponse(
        isValid=True,
        confidence=cv_result["confidence"],
        rejectionReason=None,
        urgency=UrgencyResult(score=ml_result["score"], level=ml_result["level"]),
        cv={
            "clarityScore":      cv_result["clarity_score"],
            "laplacianVariance": cv_result["details"].get("laplacian_variance"),
            "brightness":        cv_result["details"].get("brightness"),
            "contrast":          cv_result["details"].get("contrast"),
            "dimensions":        cv_result["details"].get("dimensions"),
            "algorithm":         "OpenCV Laplacian Variance",
            "model":             "CivicCV-OpenCV v1.0",
        },
        nlp={
            "department":      nlp_result["department_key"],
            "departmentLabel": nlp_result["department_label"],
            "confidence":      nlp_result["confidence"],
            "topFeatures":     nlp_result["top_features"],
            "allProbs":        nlp_result["all_probs"],
            "model":           nlp_result["model"],
        },
        ml={
            "score":               ml_result["score"],
            "level":               ml_result["level"],
            "probs":               ml_result["probs"],
            "featureImportances":  ml_result["feature_importances"],
            "model":               ml_result["model"],
        },
    )
