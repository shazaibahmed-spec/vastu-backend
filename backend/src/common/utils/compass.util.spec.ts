import { describe, expect, it } from 'vitest';
import { DirectionEnum } from '../constants/index.js';
import { CompassUtil } from './compass.util.js';

describe('CompassUtil', () => {
  describe('normalizeAngle', () => {
    it('should keep angles in [0, 360) unchanged', () => {
      expect(CompassUtil.normalizeAngle(0)).toBe(0);
      expect(CompassUtil.normalizeAngle(180)).toBe(180);
      expect(CompassUtil.normalizeAngle(359.9)).toBe(359.9);
    });

    it('should wrap angles >= 360', () => {
      expect(CompassUtil.normalizeAngle(360)).toBe(0);
      expect(CompassUtil.normalizeAngle(450)).toBe(90);
      expect(CompassUtil.normalizeAngle(720)).toBe(0);
    });

    it('should wrap negative angles', () => {
      expect(CompassUtil.normalizeAngle(-45)).toBe(315);
      expect(CompassUtil.normalizeAngle(-90)).toBe(270);
      expect(CompassUtil.normalizeAngle(-360)).toBe(0);
    });
  });

  describe('headingToDirection', () => {
    it('should map North boundaries correctly', () => {
      expect(CompassUtil.headingToDirection(0)).toBe(DirectionEnum.NORTH);
      expect(CompassUtil.headingToDirection(15)).toBe(DirectionEnum.NORTH);
      expect(CompassUtil.headingToDirection(22.4)).toBe(DirectionEnum.NORTH);
      expect(CompassUtil.headingToDirection(340)).toBe(DirectionEnum.NORTH);
      expect(CompassUtil.headingToDirection(359.9)).toBe(DirectionEnum.NORTH);
    });

    it('should map North-East correctly', () => {
      expect(CompassUtil.headingToDirection(22.5)).toBe(DirectionEnum.NORTH_EAST);
      expect(CompassUtil.headingToDirection(45)).toBe(DirectionEnum.NORTH_EAST);
      expect(CompassUtil.headingToDirection(67.4)).toBe(DirectionEnum.NORTH_EAST);
    });

    it('should map East correctly', () => {
      expect(CompassUtil.headingToDirection(67.5)).toBe(DirectionEnum.EAST);
      expect(CompassUtil.headingToDirection(90)).toBe(DirectionEnum.EAST);
      expect(CompassUtil.headingToDirection(112.4)).toBe(DirectionEnum.EAST);
    });

    it('should map South-East correctly', () => {
      expect(CompassUtil.headingToDirection(112.5)).toBe(DirectionEnum.SOUTH_EAST);
      expect(CompassUtil.headingToDirection(135)).toBe(DirectionEnum.SOUTH_EAST);
      expect(CompassUtil.headingToDirection(157.4)).toBe(DirectionEnum.SOUTH_EAST);
    });

    it('should map South correctly', () => {
      expect(CompassUtil.headingToDirection(157.5)).toBe(DirectionEnum.SOUTH);
      expect(CompassUtil.headingToDirection(180)).toBe(DirectionEnum.SOUTH);
      expect(CompassUtil.headingToDirection(202.4)).toBe(DirectionEnum.SOUTH);
    });

    it('should map South-West correctly', () => {
      expect(CompassUtil.headingToDirection(202.5)).toBe(DirectionEnum.SOUTH_WEST);
      expect(CompassUtil.headingToDirection(225)).toBe(DirectionEnum.SOUTH_WEST);
      expect(CompassUtil.headingToDirection(247.4)).toBe(DirectionEnum.SOUTH_WEST);
    });

    it('should map West correctly', () => {
      expect(CompassUtil.headingToDirection(247.5)).toBe(DirectionEnum.WEST);
      expect(CompassUtil.headingToDirection(270)).toBe(DirectionEnum.WEST);
      expect(CompassUtil.headingToDirection(292.4)).toBe(DirectionEnum.WEST);
    });

    it('should map North-West correctly', () => {
      expect(CompassUtil.headingToDirection(292.5)).toBe(DirectionEnum.NORTH_WEST);
      expect(CompassUtil.headingToDirection(315)).toBe(DirectionEnum.NORTH_WEST);
      expect(CompassUtil.headingToDirection(337.4)).toBe(DirectionEnum.NORTH_WEST);
    });
  });

  describe('calculateObjectZone', () => {
    it('should calculate direct center object accurately', () => {
      // Facing South (180 deg), object in center (x = 0.5) => SOUTH
      expect(CompassUtil.calculateObjectZone(180, 0.5)).toBe(DirectionEnum.SOUTH);
    });

    it('should shift left when object is on left edge of camera frame', () => {
      // Facing North (0 deg), object at x = 0 (left edge), 60 deg FOV => -30 deg = 330 deg => NORTH_WEST
      expect(CompassUtil.calculateObjectZone(0, 0.0, 60)).toBe(DirectionEnum.NORTH_WEST);
    });

    it('should shift right when object is on right edge of camera frame', () => {
      // Facing North (0 deg), object at x = 1 (right edge), 60 deg FOV => +30 deg = 30 deg => NORTH_EAST
      expect(CompassUtil.calculateObjectZone(0, 1.0, 60)).toBe(DirectionEnum.NORTH_EAST);
    });
  });

  describe('directionToDegrees', () => {
    it('should convert standard cardinal and ordinal directions to nominal degrees', () => {
      expect(CompassUtil.directionToDegrees(DirectionEnum.NORTH)).toBe(0);
      expect(CompassUtil.directionToDegrees(DirectionEnum.NORTH_EAST)).toBe(45);
      expect(CompassUtil.directionToDegrees(DirectionEnum.EAST)).toBe(90);
      expect(CompassUtil.directionToDegrees(DirectionEnum.SOUTH_EAST)).toBe(135);
      expect(CompassUtil.directionToDegrees(DirectionEnum.SOUTH)).toBe(180);
      expect(CompassUtil.directionToDegrees(DirectionEnum.SOUTH_WEST)).toBe(225);
      expect(CompassUtil.directionToDegrees(DirectionEnum.WEST)).toBe(270);
      expect(CompassUtil.directionToDegrees(DirectionEnum.NORTH_WEST)).toBe(315);
      expect(CompassUtil.directionToDegrees(DirectionEnum.CENTER)).toBe(0);
    });
  });

  describe('isDirectionReliable', () => {
    it('should return true for valid headings (0 to 360)', () => {
      expect(CompassUtil.isDirectionReliable(0)).toBe(true);
      expect(CompassUtil.isDirectionReliable(180)).toBe(true);
      expect(CompassUtil.isDirectionReliable(360)).toBe(true);
    });

    it('should return false for missing, undefined, null, or NaN headings', () => {
      expect(CompassUtil.isDirectionReliable(undefined)).toBe(false);
      expect(CompassUtil.isDirectionReliable(null)).toBe(false);
      expect(CompassUtil.isDirectionReliable(NaN)).toBe(false);
    });

    it('should return false for out-of-range headings', () => {
      expect(CompassUtil.isDirectionReliable(-1)).toBe(false);
      expect(CompassUtil.isDirectionReliable(361)).toBe(false);
    });

    it('should return false when source is UNKNOWN', () => {
      expect(
        CompassUtil.isDirectionReliable(90, 'UNKNOWN' as any),
      ).toBe(false);
    });
  });

  describe('mapImagePositionToDirection', () => {
    it('should map center object (x=0.5) accurately with high confidence', () => {
      const result = CompassUtil.mapImagePositionToDirection(180, 0.5, 0.5);
      expect(result.direction).toBe(DirectionEnum.SOUTH);
      expect(result.isEstimated).toBe(false);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.calculatedHeadingDegrees).toBe(180);
    });

    it('should return estimated CENTER with low confidence when heading is missing', () => {
      const result = CompassUtil.mapImagePositionToDirection(undefined, 0.5, 0.5);
      expect(result.direction).toBe(DirectionEnum.CENTER);
      expect(result.isEstimated).toBe(true);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should calculate offset correctly for left and right positions', () => {
      // Facing North (0°), x=0.0 (left), 60° FOV -> -30° -> 330° -> NORTH_WEST
      const leftResult = CompassUtil.mapImagePositionToDirection(0, 0.0, 0.5, 60);
      expect(leftResult.direction).toBe(DirectionEnum.NORTH_WEST);
      expect(leftResult.calculatedHeadingDegrees).toBe(330);

      // Facing North (0°), x=1.0 (right), 60° FOV -> +30° -> 30° -> NORTH_EAST
      const rightResult = CompassUtil.mapImagePositionToDirection(0, 1.0, 0.5, 60);
      expect(rightResult.direction).toBe(DirectionEnum.NORTH_EAST);
      expect(rightResult.calculatedHeadingDegrees).toBe(30);
    });

    it('should clamp out-of-range coordinates [x < 0 or x > 1]', () => {
      const resultUnder = CompassUtil.mapImagePositionToDirection(0, -0.5, 0.5, 60);
      expect(resultUnder.calculatedHeadingDegrees).toBe(330);

      const resultOver = CompassUtil.mapImagePositionToDirection(0, 1.5, 0.5, 60);
      expect(resultOver.calculatedHeadingDegrees).toBe(30);
    });
  });
});
