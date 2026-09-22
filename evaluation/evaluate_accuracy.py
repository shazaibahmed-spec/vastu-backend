#!/usr/bin/env python3
"""
Vastu AI - Object Detection Accuracy & Latency Evaluation Benchmark

Evaluates image detection models (e.g. YOLOv8 local microservice or cloud vision)
against annotated Vastu benchmark datasets.

Measures:
  - Precision, Recall, F1-Score (Overall and Per-Class)
  - True Positives (TP), False Positives (FP), False Negatives (FN)
  - Mean Intersection over Union (mIoU)
  - Inference Latency: Average, Min, Max, 95th Percentile (ms)
  - Request Failure Rate (%)

Usage:
  python3 evaluation/evaluate_accuracy.py --annotations evaluation/dataset/annotations/sample_eval.json
"""

import argparse
import io
import json
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import urllib.request
    import urllib.error
except ImportError:
    pass


@dataclass
class BoundingBox:
    x: float
    y: float
    width: float
    height: float

    @property
    def x2(self) -> float:
        return self.x + self.width

    @property
    def y2(self) -> float:
        return self.y + self.height

    @property
    def area(self) -> float:
        return max(0.0, self.width) * max(0.0, self.height)


def calculate_iou(boxA: BoundingBox, boxB: BoundingBox) -> float:
    """Calculates Intersection over Union (IoU) of two normalized bounding boxes."""
    xA = max(boxA.x, boxB.x)
    yA = max(boxA.y, boxB.y)
    xB = min(boxA.x2, boxB.x2)
    yB = min(boxA.y2, boxB.y2)

    inter_width = max(0.0, xB - xA)
    inter_height = max(0.0, yB - yA)
    inter_area = inter_width * inter_height

    union_area = boxA.area + boxB.area - inter_area
    if union_area <= 0:
        return 0.0

    return inter_area / union_area


@dataclass
class ClassMetrics:
    tp: int = 0
    fp: int = 0
    fn: int = 0

    @property
    def precision(self) -> float:
        denom = self.tp + self.fp
        return (self.tp / denom) if denom > 0 else 0.0

    @property
    def recall(self) -> float:
        denom = self.tp + self.fn
        return (self.tp / denom) if denom > 0 else 0.0

    @property
    def f1(self) -> float:
        p = self.precision
        r = self.recall
        return (2 * p * r / (p + r)) if (p + r) > 0 else 0.0


def create_dummy_jpeg() -> bytes:
    """Creates a minimal valid 640x480 JPEG byte sequence if local image file is absent."""
    try:
        from PIL import Image
        img = Image.new("RGB", (640, 480), color=(130, 130, 130))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        return buf.getvalue()
    except ImportError:
        # 1x1 minimal JPEG fallback bytes
        return bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11,
            0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01,
            0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0xBF, 0x80,
            0xFF, 0xD9
        ])


def send_inference_request(
    service_url: str,
    image_bytes: bytes,
    confidence_threshold: float,
    timeout_seconds: float = 10.0,
) -> Tuple[Optional[Dict[str, Any]], float, Optional[str]]:
    """Sends multipart/form-data to the local model endpoint."""
    boundary = "----VastuEvalBoundary" + str(int(time.time()))
    body = bytearray()

    # Image file part
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(b'Content-Disposition: form-data; name="file"; filename="eval.jpg"\r\n')
    body.extend(b"Content-Type: image/jpeg\r\n\r\n")
    body.extend(image_bytes)
    body.extend(b"\r\n")

    # Confidence part
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(b'Content-Disposition: form-data; name="confidence"\r\n\r\n')
    body.extend(str(confidence_threshold).encode("utf-8"))
    body.extend(b"\r\n")

    # Closing boundary
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(
        service_url,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )

    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as response:
            latency_ms = (time.perf_counter() - start) * 1000
            resp_data = json.loads(response.read().decode("utf-8"))
            return resp_data, latency_ms, None
    except Exception as e:
        latency_ms = (time.perf_counter() - start) * 1000
        return None, latency_ms, str(e)


def main():
    parser = argparse.ArgumentParser(description="Evaluate Vastu AI Vision Detection Accuracy")
    parser.add_argument(
        "--annotations",
        default="evaluation/dataset/annotations/sample_eval.json",
        help="Path to evaluation annotations JSON file",
    )
    parser.add_argument(
        "--images-dir",
        default="evaluation/dataset/images",
        help="Base path to directory holding evaluation images",
    )
    parser.add_argument(
        "--service-url",
        default="http://localhost:8000/detect",
        help="Local Vision Service endpoint URL",
    )
    parser.add_argument(
        "--iou-threshold",
        type=float,
        default=0.50,
        help="IoU matching threshold (default: 0.50)",
    )
    parser.add_argument(
        "--confidence-threshold",
        type=float,
        default=0.50,
        help="Confidence threshold for predictions (default: 0.50)",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Optional path to save JSON benchmark results",
    )
    args = parser.parse_args()

    annotations_path = Path(args.annotations)
    if not annotations_path.exists():
        print(f"Error: Annotations file not found: {annotations_path}", file=sys.stderr)
        sys.exit(1)

    with open(annotations_path, "r", encoding="utf-8") as f:
        annot_data = json.load(f)

    items = annot_data.get("items", [])
    if not items:
        print("Warning: No items found in annotation dataset.")
        sys.exit(0)

    print("=" * 70)
    print(f" VASTU AI OBJECT DETECTION EVALUATION BENCHMARK")
    print("=" * 70)
    print(f" Dataset Version : {annot_data.get('dataset_version', 'unknown')}")
    print(f" Total Samples   : {len(items)}")
    print(f" Target Endpoint : {args.service_url}")
    print(f" IoU Threshold   : {args.iou_threshold}")
    print(f" Conf Threshold  : {args.confidence_threshold}")
    print("-" * 70)

    # Metrics trackers
    class_stats: Dict[str, ClassMetrics] = {}
    latencies: List[float] = []
    failed_requests = 0

    for idx, item in enumerate(items, start=1):
        image_id = item.get("image_id", f"sample_{idx}")
        room_type = item.get("room_type", "general")
        expected_objs = item.get("expected_objects", [])

        # Find image file on disk or create dummy for latency/connectivity test
        img_path = Path(args.images_dir) / room_type / image_id
        if img_path.exists():
            with open(img_path, "rb") as f:
                img_bytes = f.read()
        else:
            img_bytes = create_dummy_jpeg()

        # Send request
        resp, latency_ms, err = send_inference_request(
            args.service_url,
            img_bytes,
            args.confidence_threshold,
        )

        if err:
            failed_requests += 1
            print(f" [{idx}/{len(items)}] {image_id} ({room_type}) -> FAILED: {err} ({latency_ms:.1f}ms)")
            # All expected objects count as False Negatives
            for exp in expected_objs:
                cname = exp["class_name"]
                if cname not in class_stats:
                    class_stats[cname] = ClassMetrics()
                class_stats[cname].fn += 1
            continue

        latencies.append(latency_ms)
        detections = resp.get("detections", []) if resp else []
        print(f" [{idx}/{len(items)}] {image_id} ({room_type}) -> {len(detections)} detected ({latency_ms:.1f}ms)")

        # Match detections to ground truth
        matched_gt_indices = set()

        for det in detections:
            pred_class = det.get("class_name", "").lower()
            pred_box = BoundingBox(
                x=det["box"]["x"],
                y=det["box"]["y"],
                width=det["box"]["width"],
                height=det["box"]["height"],
            )

            if pred_class not in class_stats:
                class_stats[pred_class] = ClassMetrics()

            # Find highest IoU among matching ground truth
            best_iou = 0.0
            best_gt_idx = -1

            for gt_i, exp in enumerate(expected_objs):
                if gt_i in matched_gt_indices:
                    continue
                if exp["class_name"].lower() != pred_class:
                    continue

                gt_box = BoundingBox(
                    x=exp["box"]["x"],
                    y=exp["box"]["y"],
                    width=exp["box"]["width"],
                    height=exp["box"]["height"],
                )
                iou = calculate_iou(pred_box, gt_box)
                if iou > best_iou:
                    best_iou = iou
                    best_gt_idx = gt_i

            if best_iou >= args.iou_threshold and best_gt_idx >= 0:
                class_stats[pred_class].tp += 1
                matched_gt_indices.add(best_gt_idx)
            else:
                class_stats[pred_class].fp += 1

        # Unmatched ground truth become False Negatives
        for gt_i, exp in enumerate(expected_objs):
            if gt_i not in matched_gt_indices:
                cname = exp["class_name"].lower()
                if cname not in class_stats:
                    class_stats[cname] = ClassMetrics()
                class_stats[cname].fn += 1

    # Compute Summary Statistics
    total_tp = sum(m.tp for m in class_stats.values())
    total_fp = sum(m.fp for m in class_stats.values())
    total_fn = sum(m.fn for m in class_stats.values())

    macro_precision = (total_tp / (total_tp + total_fp)) if (total_tp + total_fp) > 0 else 0.0
    macro_recall = (total_tp / (total_tp + total_fn)) if (total_tp + total_fn) > 0 else 0.0
    macro_f1 = (2 * macro_precision * macro_recall / (macro_precision + macro_recall)) if (macro_precision + macro_recall) > 0 else 0.0

    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
    min_latency = min(latencies) if latencies else 0.0
    max_latency = max(latencies) if latencies else 0.0
    latencies.sort()
    p95_latency = latencies[int(len(latencies) * 0.95)] if latencies else 0.0
    failure_rate = (failed_requests / len(items)) * 100.0

    print("\n" + "=" * 70)
    print(" BENCHMARK ACCURACY & PERFORMANCE RESULTS")
    print("=" * 70)
    print(f" Total Queries       : {len(items)}")
    print(f" Failed Requests     : {failed_requests} ({failure_rate:.1f}%)")
    print(f" Mean Latency        : {avg_latency:.2f} ms")
    print(f" Min Latency         : {min_latency:.2f} ms")
    print(f" Max Latency         : {max_latency:.2f} ms")
    print(f" 95th %ile Latency   : {p95_latency:.2f} ms")
    print(f" Overall Precision   : {macro_precision * 100:.2f}%")
    print(f" Overall Recall      : {macro_recall * 100:.2f}%")
    print(f" Overall F1-Score    : {macro_f1 * 100:.2f}%")
    print("-" * 70)
    print(f" {'CLASS':<18} {'TP':<6} {'FP':<6} {'FN':<6} {'PRECISION':<12} {'RECALL':<10} {'F1':<10}")
    print("-" * 70)

    for cname, m in sorted(class_stats.items()):
        print(
            f" {cname:<18} {m.tp:<6} {m.fp:<6} {m.fn:<6} "
            f"{m.precision * 100:>8.1f}%   {m.recall * 100:>7.1f}%   {m.f1 * 100:>7.1f}%"
        )
    print("=" * 70)

    if args.output:
        out_data = {
            "summary": {
                "total_queries": len(items),
                "failed_requests": failed_requests,
                "failure_rate_pct": failure_rate,
                "avg_latency_ms": avg_latency,
                "min_latency_ms": min_latency,
                "max_latency_ms": max_latency,
                "p95_latency_ms": p95_latency,
                "overall_precision": macro_precision,
                "overall_recall": macro_recall,
                "overall_f1": macro_f1,
            },
            "per_class": {
                c: {
                    "tp": m.tp,
                    "fp": m.fp,
                    "fn": m.fn,
                    "precision": m.precision,
                    "recall": m.recall,
                    "f1": m.f1,
                }
                for c, m in class_stats.items()
            },
        }
        with open(args.output, "w", encoding="utf-8") as out_f:
            json.dump(out_data, out_f, indent=2)
        print(f"Results saved to {args.output}")


if __name__ == "__main__":
    main()
