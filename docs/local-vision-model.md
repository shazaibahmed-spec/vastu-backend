# Local / Self-Hosted Vision Model Architecture

## 1. Overview & Motivation

To ensure data privacy, reduce reliance on external cloud APIs, achieve predictable latency, and minimize operating costs, Vastu AI supports a **local, self-hosted object detection model** running on our internal infrastructure.

The local model operates alongside our existing cloud AI providers (Google Gemini, OpenAI, and Mock) through a unified **`VisionProvider` abstraction** and configurable **`VisionRouterService`**.

```text
                               Image Analysis
                                     │
                              Vision Service
                                     │
                              VisionProvider
                                     │
              ┌──────────────────────┴──────────────────────┐
              │                                             │
              ↓                                             ↓
     Existing AI Provider                          Local Model Provider
   (Gemini, OpenAI, Mock)                          (FastAPI + YOLOv8)
              │                                             │
      Cloud Hosted API                               Internal Hardware
                                                     (CPU / MPS / CUDA)
```

The Vastu Rules Engine, Controllers, and React Native mobile application remain completely agnostic to the active provider and consume identical, normalized `VisionAnalysisResult` payloads.

---

## 2. Model Selection & Rationale

We evaluated several state-of-the-art vision models:

| Model Architecture | Size (MB) | Latency (CPU) | Latency (GPU) | Licensing | Suitability for Vastu AI |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **YOLOv8 / YOLOv11 (Ultralytics)** | **6 MB (nano) / 22 MB (small)** | **~25 ms** | **~3 ms** | **AGPL-3.0 / Enterprise** | **Selected**: Excellent speed, low memory, native ONNX export, straightforward fine-tuning on custom classes. |
| **RT-DETR** | 78 MB | ~110 ms | ~8 ms | Apache 2.0 | High accuracy on complex scenes, but higher latency and memory overhead on edge/CPU. |
| **Grounding DINO** | 680 MB | ~1200 ms | ~45 ms | Apache 2.0 | Open-vocabulary detection; ideal for zero-shot annotation assistance during dataset creation, but too heavy for high-throughput production API inference. |
| **Mask R-CNN** | 165 MB | ~350 ms | ~25 ms | BSD | Provides instance segmentation, but slower inference and unnecessary bounding-box complexity for standard Vastu cardinal zone placement. |

### Why YOLOv8 was Chosen:
1. **Lightweight Footprint**: Can easily be containerized with Docker and runs on both low-power CPU servers and GPU clusters.
2. **Apple Silicon & CUDA Acceleration**: Automatically utilizes `mps` on Apple Silicon (M1/M2/M3) and `cuda` on NVIDIA servers, falling back to CPU without crashing.
3. **ONNX Compatibility**: Can be exported to ONNX format (`model.export(format='onnx')`) for runtime execution via ONNX Runtime if zero-Python C++ embedding is later desired.
4. **Vastu Real-Time Requirement**: End-to-end analysis must feel instantaneous (<1s) for mobile app users.

---

## 3. Isolated Microservice Architecture

To keep the NestJS backend lightweight and prevent Python/C++ machine learning native runtime conflicts, the local model runs in an isolated service directory: `services/vision-model/`.

```text
NestJS Backend (Node.js/TypeScript)
      │
      │  HTTP POST /detect (multipart/form-data)
      ▼
FastAPI Microservice (Python 3.11)
      │
      ├── Hardware Detection (CUDA -> MPS -> CPU)
      ├── OpenCV & Pillow Preprocessing
      └── Ultralytics YOLO Engine (models/yolov8n.pt)
```

### Endpoints
- `GET /health`: Returns service health, uptime, and selected hardware device (`cpu`, `mps`, `cuda`).
- `GET /model-info`: Returns model name, class names count, device, and memory statistics.
- `POST /detect`: Accepts uploaded image with `confidence` and `image_size` parameters, returning normalized bounding boxes `[0, 1]`, centers, and class labels.

---

## 4. Hardware Requirements & Device Configuration

### Minimum Requirements (CPU):
- **RAM**: 2 GB RAM minimum (4 GB recommended).
- **CPU**: 2 vCPUs (x86_64 or ARM64).
- **Disk**: 500 MB for container and PyTorch base layers.

### Recommended Requirements (GPU/MPS):
- **NVIDIA GPU**: 4 GB VRAM (T4, A10G, RTX 3060+) with CUDA 11.8+.
- **Apple Silicon**: M1/M2/M3/M4 with 8 GB unified memory (`device: mps`).

### Device Environment Configuration:
In `.env`:
```env
LOCAL_VISION_DEVICE=auto
```
- `auto`: Dynamically uses CUDA if available; if not, checks for Apple Silicon MPS; otherwise falls back gracefully to CPU.
- `cpu`: Forces CPU inference.
- `gpu`: Enforces CUDA/MPS GPU inference.

---

## 5. Configuration & Provider Switching

The backend controls which vision provider is active through environment variables.

### Provider Selection:
```env
# Values: 'existing' | 'local' | 'mock' | 'gemini' | 'openai'
VISION_PROVIDER=existing

# When VISION_PROVIDER=existing, specifies the underlying engine:
EXISTING_VISION_PROVIDER=mock
```

- To switch to the local model:
  ```env
  VISION_PROVIDER=local
  LOCAL_VISION_URL=http://localhost:8000
  LOCAL_VISION_MODEL=yolov8n.pt
  LOCAL_VISION_CONFIDENCE_THRESHOLD=0.50
  LOCAL_VISION_IMAGE_SIZE=640
  LOCAL_VISION_DEVICE=auto
  ```
- To switch back to existing production provider:
  ```env
  VISION_PROVIDER=existing
  ```

---

## 6. Technical Failure Fallback

If the local model becomes unreachable, times out, or encounters an internal 5xx error, the `VisionRouterService` can automatically fall back to the existing cloud or mock provider when enabled:

```env
VISION_FALLBACK_ENABLED=true
VISION_FALLBACK_PROVIDER=existing
```

> **Note**: Fallback triggers **only on technical errors** (network disconnection, crash, 503, timeout). Fallback is **not** triggered on low confidence detections, preserving deterministic behavior and avoiding unexpected cloud billing.

---

## 7. Standardized Vastu Object Mapping

The local model outputs raw detections that are mapped to authoritative Vastu objects:

| Pretrained Class | Vastu Object Code | Canonical Label |
| :--- | :--- | :--- |
| `bed` | `bed` | Bed |
| `couch` | `sofa` | Sofa |
| `chair` | `chair` | Chair |
| `dining table` / `table` | `table` | Dining / Center Table |
| `tv` / `television` | `television` | Television |
| `refrigerator` | `refrigerator` | Refrigerator |
| `oven` | `gas_stove` | Cooking Stove / Oven |
| `sink` | `kitchen_sink` | Sink / Washbasin |
| `potted plant` | `indoor_plants` | Indoor Plant |
| `toilet` | `toilet` | Toilet Commode |
| `laptop` / `keyboard` / `mouse` | `desk` | Study / Work Desk |
| `book` | `bookshelf` | Books / Shelf |
| `clock` | `wall_clock` | Wall Clock |

### Normalized Bounding Box Coordinates:
Coordinates are normalized from $0.0$ to $1.0$:
- $x = 0 \rightarrow$ Left edge of image; $x = 1 \rightarrow$ Right edge.
- $y = 0 \rightarrow$ Top edge of image; $y = 1 \rightarrow$ Bottom edge.

---

## 8. Direction & Cardinal Zone Calculation

The local model detects visual geometry; it **does not** infer absolute geographic North. Absolute cardinal zones are deterministically computed by combining:
1. Object normalized center $(x, y)$.
2. Device compass camera heading in degrees (0–360°).
3. Horizontal field of view ($\sim 60^\circ$).

$$\text{Offset} = (x - 0.5) \cdot 60^\circ$$
$$\text{Object Heading} = (\text{Camera Heading} + \text{Offset}) \pmod{360}$$

Using `CompassUtil.calculateObjectZone()`, the object is assigned to one of the 8 cardinal/ordinal zones (`NORTH`, `NORTH_EAST`, `EAST`, `SOUTH_EAST`, `SOUTH`, `SOUTH_WEST`, `WEST`, `NORTH_WEST`).

---

## 9. Accuracy Measurement & Evaluation Framework

To prevent unsubstantiated claims regarding model accuracy, all models must be benchmarked using the evaluation framework in `evaluation/`:

```bash
python3 evaluation/evaluate_accuracy.py \
  --annotations evaluation/dataset/annotations/sample_eval.json \
  --images-dir evaluation/dataset/images \
  --service-url http://localhost:8000/detect \
  --iou-threshold 0.50 \
  --confidence-threshold 0.50 \
  --output evaluation/benchmark_results.json
```

The script reports:
- Overall & per-class **Precision**, **Recall**, and **F1-score**.
- True Positives, False Positives, False Negatives.
- Latency profile ($p50$, $p95$, min, max).
- Failure rate percentage.

---

## 10. Fine-Tuning Roadmap for Missing Vastu Classes

Standard COCO pretrained models lack specific Indian architectural elements:
- `mandir` / `pooja_altar`
- `shoe_rack`
- `water_purifier` / RO unit
- `headboard` orientation markings

### Custom Dataset & Fine-Tuning Pipeline:

```text
1. Collect & Curate Domain Images (Bedroom, Kitchen, Living, Entrance, Office)
               │
               ▼
2. Zero-Shot Pre-Annotation (Grounding DINO + Label Studio)
               │
               ▼
3. Human Expert Verification & Bounding Box Quality Control
               │
               ▼
4. Export to YOLO Dataset Format (train/val/test splits, 70/20/10)
               │
               ▼
5. Transfer Learning on Pretrained Weights:
   yolo detect train data=vastu.yaml model=yolov8s.pt epochs=100 imgsz=640
               │
               ▼
6. Benchmark on Validation Test Set (IoU 0.50, F1 > 0.85 target)
               │
               ▼
7. Deploy fine-tuned weights: vastu-yolov8s.pt to services/vision-model/models/
```

### Updating Weights Without Backend Downtime:
1. Place new `.pt` or `.onnx` file in `services/vision-model/models/`.
2. Update `LOCAL_VISION_MODEL=vastu-yolov8s.pt` in `.env`.
3. Restart the container (`docker compose restart vision_model`).
4. The NestJS backend and mobile app continue functioning without changes.

---

## 11. Troubleshooting

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| `ECONNREFUSED 127.0.0.1:8000` | Local vision microservice is not running. | Run `docker compose up vision_model -d` or `python3 -m uvicorn main:app --port 8000` inside `services/vision-model/`. |
| `Local vision inference timed out` | First request downloading model weights or hardware overloaded. | Increase `LOCAL_VISION_TIMEOUT_MS=30000` in `.env` or enable `VISION_FALLBACK_ENABLED=true`. |
| CUDA out of memory | Large batch or insufficient VRAM. | Set `LOCAL_VISION_IMAGE_SIZE=640` or run with `LOCAL_VISION_DEVICE=cpu`. |
| Zero objects detected | Image lighting poor or threshold too high. | Verify `LOCAL_VISION_CONFIDENCE_THRESHOLD=0.40`. |
