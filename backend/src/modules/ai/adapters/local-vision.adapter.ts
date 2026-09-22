import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { DirectionEnum, RoomTypeEnum } from '../../../common/constants/index.js';
import { CompassUtil } from '../../../common/utils/compass.util.js';
import { AiProviderException } from '../../../common/exceptions/domain.exception.js';
import type {
  VisionAnalysisInput,
  VisionAnalysisResult,
  VisionProvider,
} from '../interfaces/vision-provider.interface.js';
import { normalizeAndValidateVisionResult } from '../utils/vision-normalization.util.js';

// ─── Class Mapping ────────────────────────────────────────────────────────────

const COCO_TO_VASTU_MAP: Record<string, { objectType: string; label: string }> = {
  bed: { objectType: 'bed', label: 'Bed' },
  couch: { objectType: 'sofa', label: 'Sofa' },
  sofa: { objectType: 'sofa', label: 'Sofa' },
  chair: { objectType: 'chair', label: 'Chair' },
  'dining table': { objectType: 'table', label: 'Dining / Center Table' },
  table: { objectType: 'table', label: 'Table' },
  tv: { objectType: 'television', label: 'Television' },
  television: { objectType: 'television', label: 'Television' },
  refrigerator: { objectType: 'refrigerator', label: 'Refrigerator' },
  microwave: { objectType: 'microwave', label: 'Microwave Oven' },
  oven: { objectType: 'gas_stove', label: 'Cooking Stove / Oven' },
  sink: { objectType: 'kitchen_sink', label: 'Sink / Washbasin' },
  'potted plant': { objectType: 'indoor_plants', label: 'Indoor Plant' },
  plant: { objectType: 'indoor_plants', label: 'Indoor Plant' },
  toilet: { objectType: 'toilet', label: 'Toilet Commode' },
  laptop: { objectType: 'desk', label: 'Study / Work Desk' },
  computer: { objectType: 'desk', label: 'Computer Desk' },
  keyboard: { objectType: 'desk', label: 'Workstation' },
  mouse: { objectType: 'desk', label: 'Workstation' },
  book: { objectType: 'bookshelf', label: 'Books / Shelf' },
  clock: { objectType: 'wall_clock', label: 'Wall Clock' },
  vase: { objectType: 'decorative_item', label: 'Decorative Item / Vase' },
  door: { objectType: 'door', label: 'Door' },
  window: { objectType: 'window', label: 'Window' },
  mirror: { objectType: 'mirror', label: 'Mirror' },
  headboard: { objectType: 'headboard', label: 'Headboard' },
  wardrobe: { objectType: 'wardrobe', label: 'Wardrobe / Cupboard' },
  cabinet: { objectType: 'cabinet', label: 'Cabinet / Cupboard' },
  staircase: { objectType: 'staircase', label: 'Staircase' },
  shoe_rack: { objectType: 'shoe_rack', label: 'Shoe Rack' },
  'shoe rack': { objectType: 'shoe_rack', label: 'Shoe Rack' },
  mandir: { objectType: 'mandir', label: 'Pooja Altar / Mandir' },
  pooja_altar: { objectType: 'mandir', label: 'Pooja Altar / Mandir' },
};

interface LocalModelDetection {
  class_name?: string;
  className?: string;
  confidence: number;
  box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  center: {
    x: number;
    y: number;
  };
}

interface LocalModelResponse {
  success?: boolean;
  model: string;
  device?: string;
  inference_duration_ms?: number;
  inferenceDurationMs?: number;
  image_dimensions?: { width: number; height: number };
  imageWidth?: number;
  imageHeight?: number;
  detections: LocalModelDetection[];
  error?: string;
}

// ─── Adapter Implementation ───────────────────────────────────────────────────

@Injectable()
export class LocalVisionAdapter implements VisionProvider {
  private readonly logger = new Logger(LocalVisionAdapter.name);
  private readonly serviceUrl: string;
  private readonly modelName: string;
  private readonly defaultConfidenceThreshold: number;
  private readonly imageSize: number;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.serviceUrl =
      this.configService.get<string>('ai.localVision.serviceUrl') ||
      this.configService.get<string>('ai.localVision.url') ||
      'http://localhost:8000';
    this.modelName =
      this.configService.get<string>('ai.localVision.model') || 'yolov8s';
    this.defaultConfidenceThreshold =
      this.configService.get<number>('ai.localVision.confidenceThreshold') ?? 0.52;
    this.imageSize =
      this.configService.get<number>('ai.localVision.imageSize') ?? 960;
    this.timeoutMs =
      this.configService.get<number>('ai.localVision.timeoutMs') ?? 15000;
  }

  async analyzeImage(input: VisionAnalysisInput): Promise<VisionAnalysisResult> {
    const startTime = Date.now();
    let optimizedBuffer = input.imageBuffer;
    let imageDimensions = { width: this.imageSize, height: this.imageSize };

    // 1. Shared Image Preprocessing (orientation, dimension scaling, JPEG format)
    try {
      optimizedBuffer = await sharp(input.imageBuffer)
        .rotate()
        .resize(this.imageSize, this.imageSize, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const meta = await sharp(optimizedBuffer).metadata();
      imageDimensions = {
        width: meta.width || this.imageSize,
        height: meta.height || this.imageSize,
      };
    } catch (preprocessErr: unknown) {
      const msg =
        preprocessErr instanceof Error
          ? preprocessErr.message
          : String(preprocessErr);
      this.logger.warn(`Local model image preprocessing warning: ${msg}`);
    }

    // 2. HTTP Request to Local Inference Service
    const url = `${this.serviceUrl.replace(/\/$/, '')}/detect`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let modelResponse: LocalModelResponse;
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(optimizedBuffer)], { type: 'image/jpeg' });
      formData.append('image', blob, 'image.jpg');
      formData.append('file', blob, 'image.jpg');
      formData.append('confidence', this.defaultConfidenceThreshold.toString());
      formData.append('confidenceThreshold', this.defaultConfidenceThreshold.toString());
      formData.append('image_size', this.imageSize.toString());
      formData.append('imageSize', this.imageSize.toString());

      const res = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'No response body');
        throw new AiProviderException(
          'LocalVision',
          `Inference service returned HTTP ${res.status}: ${errorText}`,
        );
      }

      modelResponse = (await res.json()) as LocalModelResponse;
    } catch (err: unknown) {
      if (err instanceof AiProviderException) {
        throw err;
      }
      const isAbort =
        err instanceof Error &&
        (err.name === 'AbortError' || err.message.includes('aborted'));
      const errorMsg = isAbort
        ? `Local vision inference timed out after ${this.timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : String(err);

      this.logger.error(`Local vision service call failed: ${errorMsg}`);
      throw new AiProviderException('LocalVision', errorMsg);
    } finally {
      clearTimeout(timer);
    }

    const durationMs = Date.now() - startTime;
    const rawDetections = modelResponse.detections || [];

    // 3. Map detected objects to Vastu taxonomy and spatial direction zones with room context disambiguation
    const mappedObjects = rawDetections
      .map((det) => {
        const rawName = det.className || det.class_name || 'unknown';
        const mapping = this.resolveRoomContextMapping(
          rawName,
          det.confidence,
          input.roomType,
        );

        if (!mapping) {
          this.logger.debug(
            `Filtered out out-of-context detection '${rawName}' (${(det.confidence * 100).toFixed(0)}%) for room '${input.roomType}'`,
          );
          return null;
        }

        // Calculate directional zone using camera heading and horizontal field of view
        let zone: DirectionEnum = input.calibratedDirection || DirectionEnum.NORTH;
        if (
          input.headingDegrees !== undefined &&
          input.headingDegrees !== null &&
          !Number.isNaN(input.headingDegrees)
        ) {
          zone = CompassUtil.calculateObjectZone(
            input.headingDegrees,
            det.center.x,
            60,
          );
        }

        const rawBox = det.boundingBox || det.box || { x: 0, y: 0, width: 0.1, height: 0.1 };

        return {
          objectType: mapping.objectType,
          label: mapping.label,
          zone,
          relativePosition: {
            x: det.center.x,
            y: det.center.y,
          },
          boundingBox: {
            x: rawBox.x,
            y: rawBox.y,
            width: rawBox.width,
            height: rawBox.height,
          },
          confidence: det.confidence,
          attributes: {
            detectedVia: 'LOCAL_MODEL',
            rawClass: rawName,
            device: modelResponse.device || 'unknown',
            inferenceMs: modelResponse.inferenceDurationMs ?? modelResponse.inference_duration_ms,
          },
        };
      })
      .filter((obj): obj is NonNullable<typeof obj> => obj !== null);

    if (mappedObjects.length > 0) {
      this.logger.log(
        `🎯 Local YOLO detected ${mappedObjects.length} objects: ${mappedObjects
          .map((o) => `${o.label} in ${o.zone} (${(o.confidence * 100).toFixed(0)}%)`)
          .join(', ')}`,
      );
    } else {
      this.logger.log('ℹ️ Local YOLO detected 0 objects above confidence threshold.');
    }

    // 4. Room Type Heuristic
    const detectedRoomType = this.inferDominantRoomType(
      mappedObjects.map((o) => o.objectType),
      input.roomType,
    );

    // 5. Build raw structure and validate via standard normalizer
    const rawPayload = {
      roomTypeDetected: detectedRoomType.roomType,
      roomTypeConfidence: detectedRoomType.confidence,
      roomTypeSource: detectedRoomType.isHeuristic
        ? 'VISION_MODEL'
        : 'USER_PROVIDED',
      detectedObjects: mappedObjects,
      qualityAssessment: {
        isClear: true,
        lighting: 'GOOD',
        isBlurry: false,
        isArchitecturalSpace: true,
        score: 0.9,
        usable: true,
        issues: [],
      },
      observations: [
        `Detected ${mappedObjects.length} objects using local ${modelResponse.model || this.modelName} on ${modelResponse.device || 'host'}.`,
      ],
    };

    return normalizeAndValidateVisionResult(rawPayload, {
      provider: 'local',
      modelName: modelResponse.model || this.modelName,
      modelVersion: '1.0.0',
      durationMs,
      fallbackRoomType: input.roomType,
      imageDimensions,
      imageSizeBytes: optimizedBuffer.length,
    });
  }

  private inferDominantRoomType(
    detectedTypes: string[],
    userRoomType: RoomTypeEnum,
  ): { roomType: RoomTypeEnum; confidence: number; isHeuristic: boolean } {
    const counts = new Set(detectedTypes);

    if (counts.has('bed') || counts.has('headboard')) {
      return { roomType: RoomTypeEnum.BEDROOM, confidence: 0.92, isHeuristic: true };
    }
    if (
      counts.has('gas_stove') ||
      counts.has('microwave') ||
      counts.has('refrigerator')
    ) {
      return { roomType: RoomTypeEnum.KITCHEN, confidence: 0.9, isHeuristic: true };
    }
    if (counts.has('sofa') || counts.has('television')) {
      return { roomType: RoomTypeEnum.LIVING_ROOM, confidence: 0.88, isHeuristic: true };
    }
    if (counts.has('desk') && !counts.has('bed')) {
      return { roomType: RoomTypeEnum.OFFICE, confidence: 0.82, isHeuristic: true };
    }
    if (counts.has('shoe_rack')) {
      return { roomType: RoomTypeEnum.MAIN_ENTRANCE, confidence: 0.85, isHeuristic: true };
    }

    return { roomType: userRoomType, confidence: 0.85, isHeuristic: false };
  }

  /**
   * Disambiguates common COCO classifier false positives using room context priors.
   * E.g. dark rectangular computer monitors in an office or bedroom are frequently
   * misclassified by general YOLO models as 'oven' or 'microwave'.
   */
  private resolveRoomContextMapping(
    rawClass: string,
    confidence: number,
    roomType: RoomTypeEnum,
  ): { objectType: string; label: string } | null {
    const lowerClass = rawClass.toLowerCase().trim();

    // 1. Office context:
    if (roomType === RoomTypeEnum.OFFICE) {
      if (lowerClass === 'tv' || lowerClass === 'television') {
        return { objectType: 'television', label: 'Computer Monitor / Screen' };
      }
      if (lowerClass === 'oven' || lowerClass === 'microwave') {
        // High likelihood of being a computer monitor or dual screen display
        if (confidence < 0.85) {
          return { objectType: 'television', label: 'Computer Monitor / Display' };
        }
      }
      if (lowerClass === 'sink' || lowerClass === 'toilet' || lowerClass === 'bed') {
        // Suppress severe false positives in an office unless confidence is exceptionally high
        if (confidence < 0.80) {
          return null;
        }
      }
    }

    // 2. Bedroom context:
    if (roomType === RoomTypeEnum.BEDROOM) {
      if ((lowerClass === 'oven' || lowerClass === 'microwave') && confidence < 0.80) {
        return { objectType: 'television', label: 'Television Screen' };
      }
      if (lowerClass === 'sink' && confidence < 0.75) {
        return null;
      }
    }

    // 3. Living Room context:
    if (roomType === RoomTypeEnum.LIVING_ROOM) {
      if ((lowerClass === 'oven' || lowerClass === 'microwave') && confidence < 0.80) {
        return { objectType: 'television', label: 'Television / Entertainment Screen' };
      }
    }

    // 4. Default static mapping
    return (
      COCO_TO_VASTU_MAP[lowerClass] || {
        objectType: lowerClass.replace(/\s+/g, '_'),
        label: rawClass.charAt(0).toUpperCase() + rawClass.slice(1),
      }
    );
  }
}
