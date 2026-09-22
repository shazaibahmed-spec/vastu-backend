import { DirectionEnum, RoomTypeEnum } from '../../../common/constants/index.js';

export interface EvaluatedObjectFact {
  id?: string;
  objectType: string;
  label: string;
  zone: DirectionEnum;
  relativePosition: {
    x: number; // 0.0 to 1.0 (left to right)
    y: number; // 0.0 to 1.0 (top to bottom)
  };
  confidence: number;
  attributes: Record<string, any>;
}

export interface EvaluationContext {
  roomType: RoomTypeEnum;
  detectedRoomType?: RoomTypeEnum;
  isArchitecturalSpace?: boolean;
  primaryDirection?: DirectionEnum;
  headingDegrees?: number;
  detectedObjects: EvaluatedObjectFact[];
  layoutObservations?: string[];
}
