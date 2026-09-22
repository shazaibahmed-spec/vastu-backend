import io
import logging
import os
import platform
import time
from typing import Any, Dict, List, Optional

# Enable MPS CPU fallback if an operator is missing on Apple Silicon / macOS
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel, Field

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("vastu-vision-service")

# ─── Hardware Device Detection ──────────────────────────────────────────────────

def detect_best_device(requested_device: Optional[str] = None) -> str:
    """Detects available hardware acceleration (CUDA, Apple Silicon MPS, or CPU)."""
    if requested_device and requested_device.lower() != "auto":
        req = requested_device.lower()
        if req in ("cuda", "gpu"):
            try:
                import torch
                if torch.cuda.is_available():
                    return "cuda:0"
                logger.warning("CUDA requested but not available. Falling back to CPU.")
            except ImportError:
                pass
            return "cpu"
        elif req == "mps":
            try:
                import torch
                if torch.backends.mps.is_available():
                    return "mps"
                logger.warning("Apple MPS requested but not available. Falling back to CPU.")
            except ImportError:
                pass
            return "cpu"
        elif req == "cpu":
            return "cpu"

    try:
        import torch
        is_arm = platform.machine().lower() in ("arm64", "aarch64")

        if torch.cuda.is_available():
            device_name = torch.cuda.get_device_name(0)
            logger.info(f"CUDA GPU detected: {device_name}")
            return "cuda:0"
        elif is_arm and hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            logger.info("Apple Silicon Metal Performance Shaders (MPS) acceleration detected.")
            return "mps"
    except Exception as err:
        logger.warning(f"Error checking hardware devices: {err}")

    logger.info("Using standard CPU inference engine (optimized for Intel/x86_64).")
    return "cpu"

# ─── Application Setup ──────────────────────────────────────────────────────────

app = FastAPI(
    title="Vastu Local Vision Inference Service",
    description="Self-hosted object detection microservice for architectural & Vastu room analysis.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model state
_base_dir = os.path.dirname(os.path.abspath(__file__))
_has_v8m = os.path.exists(os.path.join(_base_dir, "models", "yolov8m.pt")) or os.path.exists(os.path.join(_base_dir, "yolov8m.pt"))
MODEL_NAME = os.getenv("LOCAL_VISION_MODEL", "yolov8m" if _has_v8m else "yolov8s")
MODEL_PATH = os.getenv("LOCAL_VISION_MODEL_PATH", None)
ACTIVE_DEVICE = detect_best_device(os.getenv("LOCAL_VISION_DEVICE", "auto"))
yolo_model = None

def get_or_load_model():
    """Lazy loader for the YOLO model weights."""
    global yolo_model
    if yolo_model is None:
        try:
            from ultralytics import YOLO
            weight_filename = MODEL_NAME if MODEL_NAME.endswith(".pt") else f"{MODEL_NAME}.pt"
            base_dir = os.path.dirname(os.path.abspath(__file__))
            models_dir_path = os.path.join(base_dir, "models", weight_filename)
            local_dir_path = os.path.join(base_dir, weight_filename)

            if MODEL_PATH and os.path.exists(MODEL_PATH):
                target_weights = MODEL_PATH
            elif os.path.exists(models_dir_path):
                target_weights = models_dir_path
            elif os.path.exists(local_dir_path):
                target_weights = local_dir_path
            else:
                target_weights = weight_filename

            logger.info(f"Loading YOLO model from '{target_weights}' onto device '{ACTIVE_DEVICE}'...")
            start_load = time.time()
            yolo_model = YOLO(target_weights)
            logger.info(f"YOLO model successfully loaded in {(time.time() - start_load):.2f}s")
        except Exception as e:
            logger.error(f"Failed loading YOLO model: {e}", exc_info=True)
            raise RuntimeError(f"Could not load local YOLO model: {e}")
    return yolo_model

# ─── Response Schemas ──────────────────────────────────────────────────────────

class BoundingBox(BaseModel):
    x: float = Field(..., description="Top-left X normalized coordinate [0, 1]")
    y: float = Field(..., description="Top-left Y normalized coordinate [0, 1]")
    width: float = Field(..., description="Normalized width [0, 1]")
    height: float = Field(..., description="Normalized height [0, 1]")

class Point(BaseModel):
    x: float = Field(..., description="Center X normalized coordinate [0, 1]")
    y: float = Field(..., description="Center Y normalized coordinate [0, 1]")

class DetectedObjectItem(BaseModel):
    className: str = Field(..., description="Raw detected object class from model")
    class_name: Optional[str] = None
    confidence: float = Field(..., description="Confidence score [0.0, 1.0]")
    boundingBox: BoundingBox
    box: Optional[BoundingBox] = None
    center: Point

class DetectionResponse(BaseModel):
    model: str
    device: str
    inferenceDurationMs: int
    imageWidth: int
    imageHeight: int
    objectCount: int
    detections: List[DetectedObjectItem]

class HealthResponse(BaseModel):
    status: str
    model: str
    device: str
    isLoaded: bool

# ─── API Routes & Lifecycle ───────────────────────────────────────────────────

@app.on_event("startup")
async def startup_warmup():
    """Warms up the YOLO model on startup so that incoming requests run in ~30ms without cold-start lag."""
    logger.info(f"Initializing and pre-warming YOLO model on device '{ACTIVE_DEVICE}'...")
    try:
        model = get_or_load_model()
        dummy = Image.new("RGB", (640, 640), color=(128, 128, 128))
        model.predict(source=dummy, conf=0.45, imgsz=640, device=ACTIVE_DEVICE, verbose=False)
        logger.info("YOLO model pre-warmup complete! Ready for instantaneous sub-50ms inference.")
    except Exception as warm_err:
        logger.warning(f"Startup warmup encountered non-fatal notice: {warm_err}")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint confirming service and model readiness."""
    return HealthResponse(
        status="ok",
        model=MODEL_NAME,
        device=ACTIVE_DEVICE,
        isLoaded=yolo_model is not None,
    )

@app.get("/model-info")
async def model_info():
    """Returns metadata about the active model and supported class taxonomy."""
    model = get_or_load_model()
    names = getattr(model, "names", {})
    return {
        "modelName": MODEL_NAME,
        "device": ACTIVE_DEVICE,
        "classCount": len(names),
        "classes": names,
    }

@app.post("/detect", response_model=DetectionResponse)
async def detect_objects(
    image: Optional[UploadFile] = File(None, description="Uploaded image file (JPEG, PNG, WebP)"),
    file: Optional[UploadFile] = File(None, description="Alias upload file field"),
    confidenceThreshold: Optional[float] = Form(None),
    confidence: Optional[float] = Form(None),
    imageSize: Optional[int] = Form(None),
    image_size: Optional[int] = Form(None),
):
    """
    Executes object detection on the provided image buffer.
    Returns normalized bounding boxes [0..1] and confidence scores.
    """
    start_time = time.time()
    target_file = image or file
    if target_file is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Missing image upload. Field name 'image' or 'file' is required.",
        )
    contents = await target_file.read()

    if not contents or len(contents) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image payload is empty or too small.",
        )

    try:
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
        img_width, img_height = pil_image.size
    except Exception as img_err:
        logger.error(f"Image decode error: {img_err}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unable to decode image: {img_err}",
        )

    model = get_or_load_model()
    effective_conf = confidenceThreshold if confidenceThreshold is not None else (confidence if confidence is not None else 0.45)
    effective_size = imageSize if imageSize is not None else (image_size if image_size is not None else 640)

    try:
        # Run inference
        results = model.predict(
            source=pil_image,
            conf=effective_conf,
            imgsz=effective_size,
            device=ACTIVE_DEVICE,
            verbose=False,
        )
    except Exception as inf_err:
        logger.error(f"Inference execution failed on device '{ACTIVE_DEVICE}': {inf_err}", exc_info=True)
        # Fallback to CPU if GPU failed during inference
        if ACTIVE_DEVICE != "cpu":
            logger.warning("Attempting emergency CPU inference fallback...")
            try:
                results = model.predict(
                    source=pil_image,
                    conf=effective_conf,
                    imgsz=effective_size,
                    device="cpu",
                    verbose=False,
                )
            except Exception as cpu_err:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Inference execution failed on both '{ACTIVE_DEVICE}' and CPU: {cpu_err}",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Inference execution failed: {inf_err}",
            )

    detections: List[DetectedObjectItem] = []
    first_result = results[0]

    if hasattr(first_result, "boxes") and first_result.boxes is not None:
        boxes = first_result.boxes
        class_names = first_result.names

        for box in boxes:
            cls_id = int(box.cls[0].item())
            class_name = class_names.get(cls_id, f"class_{cls_id}")
            conf = float(box.conf[0].item())

            # xyxy: [x1, y1, x2, y2] in pixel coordinates
            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = xyxy[0], xyxy[1], xyxy[2], xyxy[3]

            # Normalize to 0.0 - 1.0
            norm_x1 = max(0.0, min(1.0, x1 / img_width))
            norm_y1 = max(0.0, min(1.0, y1 / img_height))
            norm_x2 = max(0.0, min(1.0, x2 / img_width))
            norm_y2 = max(0.0, min(1.0, y2 / img_height))

            box_width = max(0.001, min(1.0, norm_x2 - norm_x1))
            box_height = max(0.001, min(1.0, norm_y2 - norm_y1))

            center_x = (norm_x1 + norm_x2) / 2.0
            center_y = (norm_y1 + norm_y2) / 2.0

            bbox_obj = BoundingBox(
                x=round(norm_x1, 4),
                y=round(norm_y1, 4),
                width=round(box_width, 4),
                height=round(box_height, 4),
            )

            detections.append(
                DetectedObjectItem(
                    className=class_name,
                    class_name=class_name,
                    confidence=round(conf, 4),
                    boundingBox=bbox_obj,
                    box=bbox_obj,
                    center=Point(
                        x=round(center_x, 4),
                        y=round(center_y, 4),
                    ),
                )
            )

    duration_ms = int((time.time() - start_time) * 1000)
    logger.info(
        f"Inference completed in {duration_ms}ms | device={ACTIVE_DEVICE} | objects={len(detections)}"
    )
    if detections:
        for idx, d in enumerate(detections, 1):
            logger.info(
                f"  [{idx}] 🎯 {d.className.upper()} ({d.confidence * 100:.1f}%) "
                f"at box=[x:{d.boundingBox.x:.2f}, y:{d.boundingBox.y:.2f}, w:{d.boundingBox.width:.2f}, h:{d.boundingBox.height:.2f}] "
                f"center=({d.center.x:.2f}, {d.center.y:.2f})"
            )
    else:
        logger.info("  ℹ️ No objects met the confidence threshold.")

    return DetectionResponse(
        model=MODEL_NAME,
        device=ACTIVE_DEVICE,
        inferenceDurationMs=duration_ms,
        imageWidth=img_width,
        imageHeight=img_height,
        objectCount=len(detections),
        detections=detections,
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")
