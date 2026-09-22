import {
  DirectionEnum,
  DIRECTION_OCTANTS,
  DirectionSourceEnum,
} from '../constants/index.js';

export interface MappedDirectionResult {
  direction: DirectionEnum;
  confidence: number;
  isEstimated: boolean;
  calculatedHeadingDegrees?: number;
}

export class CompassUtil {
  /**
   * Normalizes any angle in degrees to [0, 360) range.
   */
  static normalizeAngle(degrees: number): number {
    let normalized = degrees % 360;
    if (normalized < 0) {
      normalized += 360;
    }
    // Prevent -0 in JS floating point math
    return normalized === 0 ? 0 : normalized;
  }

  /**
   * Converts compass heading in degrees (0 to 360) into an 8-point Direction enum.
   */
  static headingToDirection(degrees: number): DirectionEnum {
    const angle = this.normalizeAngle(degrees);

    for (const octant of DIRECTION_OCTANTS) {
      if (angle >= octant.minDegrees && angle < octant.maxDegrees) {
        return octant.direction;
      }
    }

    // Edge case exactly 360 is normalized to 0, which matches NORTH
    return DirectionEnum.NORTH;
  }

  /**
   * Checks whether compass heading and source are reliable for automated Vastu zone placement.
   */
  static isDirectionReliable(
    heading?: number | null,
    source?: DirectionSourceEnum | null,
  ): boolean {
    if (
      heading === undefined ||
      heading === null ||
      typeof heading !== 'number' ||
      Number.isNaN(heading)
    ) {
      return false;
    }
    if (heading < 0 || heading > 360) {
      return false;
    }
    if (source === DirectionSourceEnum.UNKNOWN) {
      return false;
    }
    return true;
  }

  /**
   * Calculates the spatial zone of an object given the camera heading and relative object position (x: 0..1).
   * 0.0 is left edge of field of view, 0.5 is center, 1.0 is right edge of field of view.
   * Standard camera horizontal field of view assumed at ~60 degrees.
   */
  static calculateObjectZone(
    cameraHeadingDegrees: number,
    relativeX: number,
    horizontalFovDegrees = 60,
  ): DirectionEnum {
    // Offset from center (-0.5 to +0.5)
    const normalizedOffset = relativeX - 0.5;
    const angleOffset = normalizedOffset * horizontalFovDegrees;
    const objectHeading = this.normalizeAngle(cameraHeadingDegrees + angleOffset);
    return this.headingToDirection(objectHeading);
  }

  /**
   * Maps relative normalized image coordinates (x, y: 0..1) and camera heading to a compass direction.
   * Accounts for horizontal field of view (FOV) and assigns a confidence score.
   * If heading is missing or unreliable, flags the result as estimated with lower confidence.
   */
  static mapImagePositionToDirection(
    cameraHeadingDegrees?: number | null,
    relativeX = 0.5,
    relativeY = 0.5,
    horizontalFovDegrees = 60,
    source?: DirectionSourceEnum | null,
  ): MappedDirectionResult {
    if (!this.isDirectionReliable(cameraHeadingDegrees, source)) {
      return {
        direction: DirectionEnum.CENTER,
        confidence: 0.25,
        isEstimated: true,
      };
    }

    const heading = cameraHeadingDegrees as number;
    const clampedX = Math.max(0, Math.min(1, relativeX));
    const normalizedOffset = clampedX - 0.5;
    const angleOffset = normalizedOffset * horizontalFovDegrees;
    const calculatedHeading = this.normalizeAngle(heading + angleOffset);
    const direction = this.headingToDirection(calculatedHeading);

    const baseConfidence =
      source === DirectionSourceEnum.DEVICE_COMPASS ? 0.92 : 0.82;
    const edgeDistance = Math.abs(clampedX - 0.5);
    const distortionPenalty = edgeDistance * 0.1;
    const confidence = Math.max(0.1, Math.min(1, baseConfidence - distortionPenalty));

    return {
      direction,
      confidence: Number(confidence.toFixed(2)),
      isEstimated: false,
      calculatedHeadingDegrees: Number(calculatedHeading.toFixed(1)),
    };
  }

  /**
   * Converts a Direction enum into its nominal cardinal/ordinal degrees (0-360).
   */
  static directionToDegrees(direction: DirectionEnum): number {
    switch (direction) {
      case DirectionEnum.NORTH:
        return 0;
      case DirectionEnum.NORTH_EAST:
        return 45;
      case DirectionEnum.EAST:
        return 90;
      case DirectionEnum.SOUTH_EAST:
        return 135;
      case DirectionEnum.SOUTH:
        return 180;
      case DirectionEnum.SOUTH_WEST:
        return 225;
      case DirectionEnum.WEST:
        return 270;
      case DirectionEnum.NORTH_WEST:
        return 315;
      case DirectionEnum.CENTER:
      default:
        return 0;
    }
  }
}
