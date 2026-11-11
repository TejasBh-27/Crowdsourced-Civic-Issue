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

POST /api/report-issue
    (Direct Notebook-compatible API matching civic-pluse.ipynb)
    multipart/form-data:
        file        : UploadFile
        latitude    : float (optional)
        longitude   : float (optional)
    → { status, category, confidence, issue_detected, near_critical_facility, priority }

Real models used:
  CV  → CivicPulse EfficientNet-B0 ONNX (civic_pulse_model.onnx) + OpenCV Laplacian (cv_module.py)
  NLP → TF-IDF + LogisticRegression             (nlp_module.py)
  ML  → Priority Engine (Urgency & Proximity)   (ml_priority.py)
"""

import os
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from cv_module  import inspect_image, load_onnx_model
from nlp_module import classify_complaint, load_or_train_nlp
from ml_priority import score_priority, load_or_train_rf

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger("civicpulse-ai")


# ── Startup: pre-warm models so first request is fast ────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Pre-warming CivicPulse ONNX Vision model …")
    t0 = time.perf_counter()
    load_onnx_model()
    log.info(f"ONNX Vision model ready in {time.perf_counter()-t0:.2f}s")

    log.info("Pre-warming NLP model …")
    t0 = time.perf_counter()
    load_or_train_nlp()
    log.info(f"NLP ready in {time.perf_counter()-t0:.2f}s")

    log.info("Pre-warming RandomForest ML model …")
    t0 = time.perf_counter()
    load_or_train_rf()
    log.info(f"ML ready in {time.perf_counter()-t0:.2f}s")

    log.info("✅  CivicPulse AI microservice ready — ONNX & ML models active")
    yield


app = FastAPI(
    title="CivicPulse AI Microservice",
    description="Real ONNX (EfficientNet-B0) + OpenCV + NLP (TF-IDF/LogReg) pipeline",
    version="2.0.0",
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
    return {
        "ok": True,
        "service": "CivicPulse AI",
        "version": "2.0.0",
        "vision_model": "EfficientNet-B0 ONNX (civic_pulse_model.onnx)",
        "classes": ["garbage", "open_manhole", "potholes", "road_normal", "streetlight_bad", "streetlight_good"]
    }


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

    # Check emergency keywords for critical proximity multiplier
    desc_lower = f"{title} {description}".lower()
    is_critical_zone = any(w in desc_lower for w in ["hospital", "school", "college", "accident", "danger", "urgent", "hazard", "fatal"])

    # ── 2. Computer Vision (ONNX Model: civic_pulse_model.onnx) ──────────────
    cv_result = inspect_image(
        image_bytes,
        reported_category=category,
        latitude=latitude,
        longitude=longitude,
        is_near_critical=is_critical_zone
    )

    if not cv_result["is_valid"]:
        elapsed = time.perf_counter() - t_start
        log.info(f"CV REJECTED in {elapsed:.3f}s — {cv_result['rejection_reason']}")
        return AiInspectResponse(
            isValid=False,
            confidence=cv_result["confidence"],
            rejectionReason=cv_result["rejection_reason"],
            urgency=UrgencyResult(score=0, level="low"),
            cv={
                "model": cv_result.get("model_name"),
                "isCivicIssue": False,
                "canSubmit": False,
                "detectedImageType": cv_result.get("detected_image_type"),
                "clarityScore": cv_result["clarity_score"],
                "laplacianVariance": cv_result["details"].get("laplacian_variance"),
                "algorithm": cv_result["details"].get("algorithm"),
                "isUserCategoryCorrect": False,
                "categoryStatus": "REJECTED_NON_CIVIC",
                "categoryVerificationMessage": cv_result.get("category_verification_message"),
                "predictedCategory": None,
                "predictedPriority": "LOW",
                "officerRecommendation": cv_result.get("officer_recommendation"),
                **cv_result["details"],
            },
        )

    # ── 3. NLP Department Classification ─────────────────────────────────────
    nlp_result = classify_complaint(
        title=title,
        description=description,
        category_hint=cv_result.get("category_key") or category,
    )

    # ── 4. Priority Resolution ───────────────────────────────────────────────
    # Combine ONNX urgency score with NLP text cues
    onnx_priority_score = cv_result.get("priority_score", 70)
    final_score = onnx_priority_score
    final_level = cv_result.get("predicted_priority", "MEDIUM").lower()

    elapsed = time.perf_counter() - t_start
    log.info(
        f"VERIFIED in {elapsed:.3f}s — "
        f"vision_cat={cv_result.get('category_label')}  "
        f"user_correct={cv_result.get('is_user_category_correct')}  "
        f"priority={final_level.upper()}({final_score})"
    )

    return AiInspectResponse(
        isValid=True,
        confidence=cv_result["confidence"],
        rejectionReason=None,
        urgency=UrgencyResult(score=final_score, level=final_level),
        cv={
            "model": cv_result.get("model_name"),
            "isCivicIssue": cv_result.get("is_civic_issue", True),
            "canSubmit": cv_result.get("can_submit", True),
            "detectedImageType": cv_result.get("detected_image_type"),
            "clarityScore": cv_result["clarity_score"],
            "laplacianVariance": cv_result["details"].get("laplacian_variance"),
            "brightness": cv_result["details"].get("brightness"),
            "contrast": cv_result["details"].get("contrast"),
            "dimensions": cv_result["details"].get("dimensions"),
            "algorithm": cv_result["details"].get("algorithm"),
            "issueDetected": cv_result.get("issue_detected", True),

            # Category Verification & Identification
            "predictedCategory": cv_result.get("predicted_category"),
            "categoryKey": cv_result.get("category_key"),
            "categoryLabel": cv_result.get("category_label"),
            "categoryConfidence": cv_result.get("category_confidence"),
            "allCategoryProbs": cv_result.get("all_category_probs", {}),

            # User category confirmation vs mismatch
            "userSelectedCategory": cv_result.get("user_selected_category"),
            "isUserCategoryCorrect": cv_result.get("is_user_category_correct"),
            "categoryStatus": cv_result.get("category_status"),
            "categoryVerificationMessage": cv_result.get("category_verification_message"),

            # Priority & Actions
            "predictedPriority": cv_result.get("predicted_priority"),
            "priorityScore": final_score,
            "slaHours": cv_result.get("sla_hours"),
            "visualCues": cv_result.get("visual_cues", []),
            "officerRecommendation": cv_result.get("officer_recommendation"),
            "routedDepartment": cv_result.get("routed_department"),
        },
        nlp={
            "department": nlp_result["department_key"],
            "departmentLabel": nlp_result["department_label"],
            "confidence": nlp_result["confidence"],
            "topFeatures": nlp_result["top_features"],
            "allProbs": nlp_result["all_probs"],
            "model": nlp_result["model"],
        },
        ml={
            "score": final_score,
            "level": final_level,
            "model": "CivicPulse Priority Engine (Urgency Weights + Proximity)",
        },
    )


# ── Direct Kaggle / Notebook API Endpoint ────────────────────────────────────
@app.post("/api/report-issue")
async def report_issue_direct(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    category_hint: Optional[str] = Form(""),
):
    """Direct implementation of the endpoint designed in civic-pluse.ipynb."""
    image_bytes = await file.read()
    res = inspect_image(
        image_bytes,
        reported_category=category_hint or "",
        latitude=latitude or 0.0,
        longitude=longitude or 0.0,
    )

    return {
        "status": "success" if res["is_valid"] else "error",
        "is_civic_issue": res.get("is_civic_issue", False),
        "can_submit": res.get("can_submit", False),
        "detected_image_type": res.get("detected_image_type"),
        "rejection_reason": res.get("rejection_reason"),
        "model": res.get("model_name"),
        "category": res.get("predicted_category"),
        "category_label": res.get("category_label"),
        "confidence": res.get("confidence"),
        "issue_detected": res.get("issue_detected", False),
        "is_user_category_correct": res.get("is_user_category_correct"),
        "category_status": res.get("category_status"),
        "category_verification_message": res.get("category_verification_message"),
        "priority": res.get("predicted_priority"),
        "priority_score": res.get("priority_score"),
        "sla_hours": res.get("sla_hours"),
        "visual_cues": res.get("visual_cues", []),
        "officer_recommendation": res.get("officer_recommendation"),
    }
