# Vastu AI Object Detection Evaluation Benchmark

This directory provides the standardized evaluation framework for benchmarking vision models (both local YOLO microservices and external AI vision providers) against authoritative Vastu ground-truth datasets.

---

## Directory Structure

```text
evaluation/
├── dataset/
│   ├── annotations/
│   │   └── sample_eval.json    # JSON ground-truth annotations with normalized bounding boxes
│   └── images/
│       ├── bedroom/            # Test images for bedroom layouts
│       ├── kitchen/            # Test images for kitchen layouts
│       ├── living-room/        # Test images for living rooms
│       ├── entrance/           # Test images for main entrances
│       └── office/             # Test images for home offices and studies
├── evaluate_accuracy.py        # Benchmark runner computing Precision, Recall, F1, latency, and error rate
└── README.md
```

> **Data Privacy Notice**: Do NOT commit customer images or sensitive floor plans into Git version control. Evaluation images are kept locally or pulled from an encrypted S3 evaluation bucket (`s3://vastu-ai-ml-eval-datasets/v1/`).

---

## Metric Definitions

The evaluation script calculates:

1. **Intersection over Union (IoU)**:
   $$\text{IoU} = \frac{\text{Area of Overlap}}{\text{Area of Union}}$$
   A prediction is matched as **True Positive (TP)** if predicted class matches ground truth and $\text{IoU} \ge 0.50$ (configurable).
2. **Precision**:
   $$\text{Precision} = \frac{\text{TP}}{\text{TP} + \text{FP}}$$
3. **Recall**:
   $$\text{Recall} = \frac{\text{TP}}{\text{TP} + \text{FN}}$$
4. **F1-Score**:
   $$\text{F1} = 2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$$
5. **Inference Latency**:
   - Average, Min, Max, and 95th Percentile ($p95$) in milliseconds.
6. **Failure Rate**:
   - Percentage of requests returning HTTP errors or timeouts.

---

## Running the Benchmark

Ensure the local vision service is running:

```bash
# In services/vision-model/
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Run the benchmark:

```bash
python3 evaluation/evaluate_accuracy.py \
  --annotations evaluation/dataset/annotations/sample_eval.json \
  --images-dir evaluation/dataset/images \
  --service-url http://localhost:8000/detect \
  --iou-threshold 0.50 \
  --confidence-threshold 0.50 \
  --output evaluation/benchmark_results.json
```

---

## Important Policy: Empirical Accuracy Claims

Per project guidelines:
- **Never claim that a local or cloud model is "highly accurate"** without empirical measurement against a representative test set.
- Standard pretrained COCO models (YOLOv8n/s) perform well on general items (`bed`, `sofa`, `chair`, `refrigerator`, `tv`, `sink`), but lack specialized Vastu objects:
  - `mandir` / `pooja_altar`
  - `shoe_rack`
  - `headboard`
  - `water_purifier`
- For missing classes, follow the fine-tuning pipeline documented in `docs/local-vision-model.md`.
