import { Injectable, Logger } from '@nestjs/common';
import {
  DirectionEnum,
  RoomTypeEnum,
} from '../../../common/constants/index.js';
import { VISION_PROMPT_VERSION } from '../../../common/constants/vision.constants.js';
import {
  VisionAnalysisInput,
  VisionAnalysisResult,
  VisionProvider,
} from '../interfaces/vision-provider.interface.js';
import { VisionAnalysisResultSchema } from '../schemas/vision-analysis.schema.js';

@Injectable()
export class MockVisionAdapter implements VisionProvider {
  private readonly logger = new Logger(MockVisionAdapter.name);
  private customFixture?: Partial<VisionAnalysisResult>;

  setCustomFixture(fixture?: Partial<VisionAnalysisResult>): void {
    this.customFixture = fixture;
  }

  async analyzeImage(input: VisionAnalysisInput): Promise<VisionAnalysisResult> {
    const startTime = Date.now();
    const direction =
      input.calibratedDirection ||
      this.headingToDirection(input.headingDegrees);

    this.logger.debug(
      `MockVisionAdapter analyzing image for room '${input.roomType}' (direction: ${direction}, heading: ${input.headingDegrees}°)...`,
    );

    let defaultResult: VisionAnalysisResult;

    switch (input.roomType) {
      case RoomTypeEnum.BEDROOM:
        defaultResult = this.generateBedroomResult(direction);
        break;

      case RoomTypeEnum.KITCHEN:
        defaultResult = this.generateKitchenResult(direction);
        break;

      case RoomTypeEnum.MAIN_ENTRANCE:
        defaultResult = this.generateEntranceResult(direction);
        break;

      case RoomTypeEnum.LIVING_ROOM:
        defaultResult = this.generateLivingRoomResult(direction);
        break;

      case RoomTypeEnum.OFFICE:
      default:
        defaultResult = this.generateOfficeResult(direction);
        break;
    }

    // Enrich with new interface fields
    const enriched: VisionAnalysisResult = {
      ...defaultResult,
      roomTypeConfidence: 0.95,
      roomTypeSource: 'VISION_MODEL',
      qualityAssessment: {
        ...defaultResult.qualityAssessment,
        score: defaultResult.qualityAssessment.isClear ? 0.9 : 0.4,
        usable: defaultResult.qualityAssessment.isClear,
        issues: [],
      },
      processingMetadata: {
        provider: 'mock',
        modelName: 'mock-vision-v2',
        modelVersion: '2.0.0',
        promptVersion: VISION_PROMPT_VERSION,
        processingDurationMs: Date.now() - startTime,
        imageSizeBytes: input.imageBuffer.length,
      },
      // Add detectionStatus and normalized boundingBox to each object
      detectedObjects: defaultResult.detectedObjects.map((obj) => {
        const posX = obj.relativePosition?.x ?? 0.5;
        const posY = obj.relativePosition?.y ?? 0.5;
        const w =
          obj.objectType === 'bed'
            ? 0.45
            : obj.objectType === 'sofa' || obj.objectType === 'desk'
              ? 0.4
              : 0.25;
        const h =
          obj.objectType === 'bed'
            ? 0.35
            : obj.objectType === 'door'
              ? 0.5
              : 0.25;

        const boundingBox = obj.boundingBox || {
          x: Math.max(0, Math.min(1 - w, Number((posX - w / 2).toFixed(4)))),
          y: Math.max(0, Math.min(1 - h, Number((posY - h / 2).toFixed(4)))),
          width: w,
          height: h,
        };

        return {
          ...obj,
          boundingBox,
          detectionStatus:
            obj.confidence >= 0.6
              ? ('DETECTED' as const)
              : ('UNCERTAIN' as const),
        };
      }),
    };

    const merged = { ...enriched, ...this.customFixture };
    return VisionAnalysisResultSchema.parse(merged) as VisionAnalysisResult;
  }

  // ─── Edge-Case Fixture Generators ──────────────────────────────────────────

  /**
   * Returns a poor-quality image fixture (unusable for Vastu analysis).
   */
  static poorQualityFixture(): Partial<VisionAnalysisResult> {
    return {
      roomTypeDetected: RoomTypeEnum.BEDROOM,
      roomTypeConfidence: 0.3,
      detectedObjects: [],
      qualityAssessment: {
        isClear: false,
        lighting: 'POOR',
        isBlurry: true,
        isArchitecturalSpace: true,
        score: 0.15,
        usable: false,
        issues: ['TOO_DARK', 'EXCESSIVE_BLUR'],
      },
      observations: [
        'Image is too dark and blurry for reliable object detection.',
      ],
      rawModelName: 'mock-vision-v2',
    };
  }

  /**
   * Returns a non-architectural image fixture (e.g., outdoor scene).
   */
  static nonArchitecturalFixture(): Partial<VisionAnalysisResult> {
    return {
      roomTypeDetected: RoomTypeEnum.BEDROOM,
      roomTypeConfidence: 0.1,
      detectedObjects: [],
      qualityAssessment: {
        isClear: true,
        lighting: 'GOOD',
        isBlurry: false,
        isArchitecturalSpace: false,
        score: 0.8,
        usable: false,
        issues: ['NOT_ARCHITECTURAL_SPACE'],
      },
      observations: [
        'Photograph depicts an outdoor nature scene, not an indoor room.',
      ],
      rawModelName: 'mock-vision-v2',
    };
  }

  /**
   * Returns a fixture with only low-confidence detections.
   */
  static lowConfidenceFixture(): Partial<VisionAnalysisResult> {
    return {
      roomTypeDetected: RoomTypeEnum.BEDROOM,
      roomTypeConfidence: 0.55,
      detectedObjects: [
        {
          objectType: 'bed',
          label: 'Possible Bed',
          zone: DirectionEnum.SOUTH,
          relativePosition: { x: 0.5, y: 0.6 },
          confidence: 0.35,
          detectionStatus: 'UNCERTAIN',
          attributes: {},
        },
        {
          objectType: 'mirror',
          label: 'Possible Mirror',
          zone: DirectionEnum.NORTH,
          relativePosition: { x: 0.8, y: 0.3 },
          confidence: 0.25,
          detectionStatus: 'NOT_DETECTED',
          attributes: {},
        },
      ],
      qualityAssessment: {
        isClear: true,
        lighting: 'MODERATE',
        isBlurry: false,
        isArchitecturalSpace: true,
        score: 0.6,
        usable: true,
        issues: ['LOW_CONTRAST'],
      },
      observations: [
        'Objects partially obscured — low detection confidence.',
      ],
      rawModelName: 'mock-vision-v2',
    };
  }

  private headingToDirection(heading?: number): DirectionEnum {
    if (heading === undefined || heading === null) return DirectionEnum.NORTH;
    const normalized = ((heading % 360) + 360) % 360;
    if (normalized >= 337.5 || normalized < 22.5) return DirectionEnum.NORTH;
    if (normalized >= 22.5 && normalized < 67.5) return DirectionEnum.NORTH_EAST;
    if (normalized >= 67.5 && normalized < 112.5) return DirectionEnum.EAST;
    if (normalized >= 112.5 && normalized < 157.5) return DirectionEnum.SOUTH_EAST;
    if (normalized >= 157.5 && normalized < 202.5) return DirectionEnum.SOUTH;
    if (normalized >= 202.5 && normalized < 247.5) return DirectionEnum.SOUTH_WEST;
    if (normalized >= 247.5 && normalized < 292.5) return DirectionEnum.WEST;
    return DirectionEnum.NORTH_WEST;
  }

  /**
   * Bedroom Layout Scenarios:
   * - SOUTH / SOUTH_WEST: Compliant (Score 100)
   * - WEST / NORTH_WEST: Beam overhead defect (Score ~85)
   * - EAST / SOUTH_EAST: Mirror reflecting bed (Score ~85)
   * - NORTH / NORTH_EAST: Critical head-north & mirror reflection defects (Score ~60)
   */
  private generateBedroomResult(direction: DirectionEnum): VisionAnalysisResult {
    if (
      direction === DirectionEnum.SOUTH ||
      direction === DirectionEnum.SOUTH_WEST
    ) {
      return {
        roomTypeDetected: RoomTypeEnum.BEDROOM,
        detectedObjects: [
          {
            objectType: 'bed',
            label: 'Double Wooden Bed',
            zone: DirectionEnum.SOUTH_WEST,
            relativePosition: { x: 0.5, y: 0.6 },
            confidence: 0.95,
            attributes: {
              headboardDirection: DirectionEnum.SOUTH,
              underCeilingBeam: false,
            },
          },
          {
            objectType: 'mirror',
            label: 'Wardrobe Mirror',
            zone: DirectionEnum.NORTH,
            relativePosition: { x: 0.85, y: 0.4 },
            confidence: 0.91,
            attributes: {
              reflectsBed: false,
            },
          },
        ],
        qualityAssessment: {
          isClear: true,
          lighting: 'GOOD',
          isBlurry: false,
        },
        observations: [
          'Solid wooden bed anchored against South-West stability wall.',
          'Headboard oriented towards South for optimal electromagnetic alignment.',
        ],
        rawModelName: 'mock-vision-v1',
      };
    }

    if (
      direction === DirectionEnum.WEST ||
      direction === DirectionEnum.NORTH_WEST
    ) {
      return {
        roomTypeDetected: RoomTypeEnum.BEDROOM,
        detectedObjects: [
          {
            objectType: 'bed',
            label: 'Double Wooden Bed',
            zone: DirectionEnum.WEST,
            relativePosition: { x: 0.5, y: 0.6 },
            confidence: 0.93,
            attributes: {
              headboardDirection: DirectionEnum.WEST,
              underCeilingBeam: true,
            },
          },
          {
            objectType: 'mirror',
            label: 'Wardrobe Mirror',
            zone: DirectionEnum.NORTH,
            relativePosition: { x: 0.85, y: 0.4 },
            confidence: 0.89,
            attributes: {
              reflectsBed: false,
            },
          },
        ],
        qualityAssessment: {
          isClear: true,
          lighting: 'GOOD',
          isBlurry: false,
        },
        observations: [
          'Bed positioned against West wall beneath visible structural ceiling beam.',
          'Exposed beam creates localized downward compressive pressure over mattress.',
        ],
        rawModelName: 'mock-vision-v1',
      };
    }

    if (
      direction === DirectionEnum.EAST ||
      direction === DirectionEnum.SOUTH_EAST
    ) {
      return {
        roomTypeDetected: RoomTypeEnum.BEDROOM,
        detectedObjects: [
          {
            objectType: 'bed',
            label: 'King Size Bed',
            zone: DirectionEnum.EAST,
            relativePosition: { x: 0.5, y: 0.6 },
            confidence: 0.94,
            attributes: {
              headboardDirection: DirectionEnum.EAST,
              underCeilingBeam: false,
            },
          },
          {
            objectType: 'mirror',
            label: 'Full Length Dressing Mirror',
            zone: DirectionEnum.WEST,
            relativePosition: { x: 0.5, y: 0.2 },
            confidence: 0.92,
            attributes: {
              reflectsBed: true,
            },
          },
        ],
        qualityAssessment: {
          isClear: true,
          lighting: 'GOOD',
          isBlurry: false,
        },
        observations: [
          'Bed oriented with East-facing headboard.',
          'Full-length mirror directly reflects the bed mattress and resting posture.',
        ],
        rawModelName: 'mock-vision-v1',
      };
    }

    // Default / NORTH / NORTH_EAST: High defect layout (Score ~60)
    return {
      roomTypeDetected: RoomTypeEnum.BEDROOM,
      detectedObjects: [
        {
          objectType: 'bed',
          label: 'Master Bed with Upholstered Headboard',
          zone: DirectionEnum.NORTH,
          relativePosition: { x: 0.5, y: 0.6 },
          confidence: 0.96,
          attributes: {
            headboardDirection: DirectionEnum.NORTH,
            underCeilingBeam: false,
          },
        },
        {
          objectType: 'mirror',
          label: 'Vanity Dressing Mirror',
          zone: DirectionEnum.NORTH_EAST,
          relativePosition: { x: 0.8, y: 0.4 },
          confidence: 0.93,
          attributes: {
            reflectsBed: true,
          },
        },
      ],
      qualityAssessment: {
        isClear: true,
        lighting: 'GOOD',
        isBlurry: false,
      },
      observations: [
        'Bed situated with headboard aligned to geomagnetic North wall.',
        'Sleeping with head towards North creates bio-magnetic unrest and disturbed sleep.',
        'Vanity mirror directly reflects the bed surface.',
      ],
      rawModelName: 'mock-vision-v1',
    };
  }

  /**
   * Kitchen Layout Scenarios:
   * - SOUTH_EAST / SOUTH: Compliant Agni placement (Score 100)
   * - WEST / NORTH_WEST: Stove adjacent to sink clash (Score ~80)
   * - NORTH / NORTH_EAST: Critical stove in water zone + clash (Score ~50)
   */
  private generateKitchenResult(direction: DirectionEnum): VisionAnalysisResult {
    if (
      direction === DirectionEnum.SOUTH_EAST ||
      direction === DirectionEnum.SOUTH
    ) {
      return {
        roomTypeDetected: RoomTypeEnum.KITCHEN,
        detectedObjects: [
          {
            objectType: 'gas_stove',
            label: 'Cooking Range / 3-Burner Stove',
            zone: DirectionEnum.SOUTH_EAST,
            relativePosition: { x: 0.75, y: 0.65 },
            confidence: 0.96,
            attributes: {},
          },
          {
            objectType: 'sink',
            label: 'Stainless Steel Water Sink',
            zone: DirectionEnum.NORTH_EAST,
            relativePosition: { x: 0.2, y: 0.35 },
            confidence: 0.93,
            attributes: {},
          },
        ],
        qualityAssessment: {
          isClear: true,
          lighting: 'GOOD',
          isBlurry: false,
        },
        observations: [
          'Cooking stove positioned in South-East (Agni quadrant).',
          'Adequate distance maintained between fire and water elements (> 1.5m).',
        ],
        rawModelName: 'mock-vision-v1',
      };
    }

    if (
      direction === DirectionEnum.WEST ||
      direction === DirectionEnum.NORTH_WEST
    ) {
      return {
        roomTypeDetected: RoomTypeEnum.KITCHEN,
        detectedObjects: [
          {
            objectType: 'gas_stove',
            label: 'Cooking Range / 3-Burner Stove',
            zone: DirectionEnum.SOUTH_EAST,
            relativePosition: { x: 0.55, y: 0.6 },
            confidence: 0.95,
            attributes: {},
          },
          {
            objectType: 'sink',
            label: 'Kitchen Wash Sink',
            zone: DirectionEnum.SOUTH_EAST,
            // Relative distance dx=0.1 -> ~0.4m (triggers DISTANCE_LESS_THAN 0.9m)
            relativePosition: { x: 0.65, y: 0.6 },
            confidence: 0.91,
            attributes: {},
          },
        ],
        qualityAssessment: {
          isClear: true,
          lighting: 'GOOD',
          isBlurry: false,
        },
        observations: [
          'Stove positioned in South-East area.',
          'Water sink is directly adjacent to cooking range (< 0.9m), creating Fire-Water element friction.',
        ],
        rawModelName: 'mock-vision-v1',
      };
    }

    // Default / NORTH / NORTH_EAST: Critical defect (Score ~50)
    return {
      roomTypeDetected: RoomTypeEnum.KITCHEN,
      detectedObjects: [
        {
          objectType: 'gas_stove',
          label: 'Gas Cooking Hob',
          zone: DirectionEnum.NORTH_EAST,
          relativePosition: { x: 0.3, y: 0.4 },
          confidence: 0.97,
          attributes: {},
        },
        {
          objectType: 'sink',
          label: 'Water Sink & Faucet',
          zone: DirectionEnum.NORTH_EAST,
          // Proximity clash: dx=0.1 -> ~0.4m
          relativePosition: { x: 0.4, y: 0.4 },
          confidence: 0.94,
          attributes: {},
        },
      ],
      qualityAssessment: {
        isClear: true,
        lighting: 'GOOD',
        isBlurry: false,
      },
      observations: [
        'Gas stove detected in sacred North-East (Ishanya) water zone.',
        'Fire in this delicate water quadrant produces severe elemental imbalance.',
        'Cooking burner is directly adjacent to water sink.',
      ],
      rawModelName: 'mock-vision-v1',
    };
  }

  /**
   * Main Entrance Layout Scenarios:
   * - NORTH / EAST / NORTH_EAST: Auspicious solar door (Score 100)
   * - WEST / SOUTH: Mirror reflecting door (Score ~85)
   * - SOUTH_WEST: Nairutya door defect & obstruction (Score ~70)
   */
  private generateEntranceResult(direction: DirectionEnum): VisionAnalysisResult {
    if (
      direction === DirectionEnum.NORTH ||
      direction === DirectionEnum.EAST ||
      direction === DirectionEnum.NORTH_EAST
    ) {
      return {
        roomTypeDetected: RoomTypeEnum.MAIN_ENTRANCE,
        detectedObjects: [
          {
            objectType: 'entrance_door',
            label: 'Main Entry Doorway',
            zone: DirectionEnum.NORTH_EAST,
            relativePosition: { x: 0.5, y: 0.5 },
            confidence: 0.98,
            attributes: {
              clockwiseOpening: true,
            },
          },
        ],
        qualityAssessment: {
          isClear: true,
          lighting: 'GOOD',
          isBlurry: false,
        },
        observations: [
          'Main entryway opens into auspicious solar quadrant (North-East).',
          'Foyer threshold is clean, welcoming, and unobstructed.',
        ],
        rawModelName: 'mock-vision-v1',
      };
    }

    if (direction === DirectionEnum.SOUTH_WEST) {
      return {
        roomTypeDetected: RoomTypeEnum.MAIN_ENTRANCE,
        detectedObjects: [
          {
            objectType: 'entrance_door',
            label: 'Main Entry Doorway',
            zone: DirectionEnum.SOUTH_WEST,
            relativePosition: { x: 0.5, y: 0.5 },
            confidence: 0.97,
            attributes: {
              clockwiseOpening: false,
            },
          },
          {
            objectType: 'shoe_rack',
            label: 'Entryway Shoe Cabinet',
            zone: DirectionEnum.SOUTH_WEST,
            relativePosition: { x: 0.45, y: 0.7 },
            confidence: 0.9,
            attributes: {
              obstructsEntrance: true,
            },
          },
        ],
        qualityAssessment: {
          isClear: true,
          lighting: 'GOOD',
          isBlurry: false,
        },
        observations: [
          'Primary threshold opens in South-West (Nairutya quadrant).',
          'Shoe rack and bulky storage obstruct the immediate door swing path.',
        ],
        rawModelName: 'mock-vision-v1',
      };
    }

    // WEST / SOUTH / Default (Score ~85)
    return {
      roomTypeDetected: RoomTypeEnum.MAIN_ENTRANCE,
      detectedObjects: [
        {
          objectType: 'entrance_door',
          label: 'Main Entry Doorway',
          zone: DirectionEnum.WEST,
          relativePosition: { x: 0.5, y: 0.5 },
          confidence: 0.96,
          attributes: {
            clockwiseOpening: true,
          },
        },
        {
          objectType: 'mirror',
          label: 'Foyer Console Mirror',
          zone: DirectionEnum.EAST,
          relativePosition: { x: 0.5, y: 0.2 },
          confidence: 0.91,
          attributes: {
            reflectsEntranceDoor: true,
          },
        },
      ],
      qualityAssessment: {
        isClear: true,
        lighting: 'GOOD',
        isBlurry: false,
      },
      observations: [
        'Main entry door situated in West sector.',
        'Decorative wall mirror directly faces the door, reflecting incoming energy back outwards.',
      ],
      rawModelName: 'mock-vision-v1',
    };
  }

  /**
   * Living Room Layout Scenarios:
   * - SOUTH_WEST / SOUTH / WEST: Grounded seating & SE media (Score 100)
   * - NORTH_EAST / NORTH: TV in NE defect (Score ~90)
   */
  private generateLivingRoomResult(direction: DirectionEnum): VisionAnalysisResult {
    if (
      direction === DirectionEnum.SOUTH_WEST ||
      direction === DirectionEnum.SOUTH ||
      direction === DirectionEnum.WEST
    ) {
      return {
        roomTypeDetected: RoomTypeEnum.LIVING_ROOM,
        detectedObjects: [
          {
            objectType: 'sofa',
            label: 'Sectional Living Room Sofa',
            zone: DirectionEnum.SOUTH_WEST,
            relativePosition: { x: 0.4, y: 0.6 },
            confidence: 0.94,
            attributes: {},
          },
          {
            objectType: 'television',
            label: 'Wall-Mounted Smart TV',
            zone: DirectionEnum.SOUTH_EAST,
            relativePosition: { x: 0.75, y: 0.35 },
            confidence: 0.92,
            attributes: {},
          },
        ],
        qualityAssessment: {
          isClear: true,
          lighting: 'GOOD',
          isBlurry: false,
        },
        observations: [
          'Heavy seating grounded against South-West stability walls.',
          'Electronics and media console housed naturally in South-East fire zone.',
        ],
        rawModelName: 'mock-vision-v1',
      };
    }

    // NORTH_EAST / NORTH / Default (Score ~90)
    return {
      roomTypeDetected: RoomTypeEnum.LIVING_ROOM,
      detectedObjects: [
        {
          objectType: 'sofa',
          label: 'Main Family Sofa',
          zone: DirectionEnum.SOUTH_WEST,
          relativePosition: { x: 0.4, y: 0.6 },
          confidence: 0.93,
          attributes: {},
        },
        {
          objectType: 'television',
          label: 'Large Entertainment Unit & TV',
          zone: DirectionEnum.NORTH_EAST,
          relativePosition: { x: 0.2, y: 0.3 },
          confidence: 0.95,
          attributes: {},
        },
      ],
      qualityAssessment: {
        isClear: true,
        lighting: 'GOOD',
        isBlurry: false,
      },
      observations: [
        'Family sofa situated in South-West corner.',
        'Heavy television console placed in delicate North-East clarity quadrant.',
      ],
      rawModelName: 'mock-vision-v1',
    };
  }

  /**
   * Office Layout Scenarios:
   * - NORTH / EAST / NORTH_EAST: Desk facing North with wall behind (Score 100)
   * - SOUTH / SOUTH_WEST: Desk facing South with window behind (Score ~75)
   */
  private generateOfficeResult(direction: DirectionEnum): VisionAnalysisResult {
    if (
      direction === DirectionEnum.NORTH ||
      direction === DirectionEnum.EAST ||
      direction === DirectionEnum.NORTH_EAST
    ) {
      return {
        roomTypeDetected: RoomTypeEnum.OFFICE,
        detectedObjects: [
          {
            objectType: 'desk',
            label: 'Executive Study Workstation',
            zone: DirectionEnum.SOUTH_WEST,
            relativePosition: { x: 0.5, y: 0.55 },
            confidence: 0.96,
            attributes: {
              facingDirection: DirectionEnum.NORTH,
              hasSolidWallBehind: true,
              windowBehindChair: false,
            },
          },
        ],
        qualityAssessment: {
          isClear: true,
          lighting: 'GOOD',
          isBlurry: false,
        },
        observations: [
          'Work desk positioned with executive occupant facing North.',
          'Solid supporting wall anchored behind the seating position.',
        ],
        rawModelName: 'mock-vision-v1',
      };
    }

    // SOUTH / SOUTH_WEST / Default (Score ~75)
    return {
      roomTypeDetected: RoomTypeEnum.OFFICE,
      detectedObjects: [
        {
          objectType: 'desk',
          label: 'Workstation Desk & Chair',
          zone: DirectionEnum.SOUTH,
          relativePosition: { x: 0.5, y: 0.55 },
          confidence: 0.95,
          attributes: {
            facingDirection: DirectionEnum.SOUTH,
            hasSolidWallBehind: false,
            windowBehindChair: true,
          },
        },
      ],
      qualityAssessment: {
        isClear: true,
        lighting: 'GOOD',
        isBlurry: false,
      },
      observations: [
        'Workstation configured with user facing South, causing mental exhaustion during deep focus.',
        'Large exterior window situated directly behind work chair, lacking structural backing.',
      ],
      rawModelName: 'mock-vision-v1',
    };
  }
}
