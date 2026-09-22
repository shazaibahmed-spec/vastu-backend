import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AnalysisStatusEnum,
  DirectionEnum,
  DirectionSourceEnum,
  RemedyTypeEnum,
  RoomTypeEnum,
  ScoreBandEnum,
  SeverityEnum,
  VerdictEnum,
} from '../../../common/constants/index.js';

export class OrientationResponseDto {
  @ApiProperty({ enum: DirectionSourceEnum })
  source!: DirectionSourceEnum;

  @ApiPropertyOptional()
  heading?: number;

  @ApiPropertyOptional({ enum: DirectionEnum })
  direction?: DirectionEnum;

  @ApiProperty({ example: true })
  isCalibrated!: boolean;
}

export class ImageMetaResponseDto {
  @ApiProperty()
  url!: string;

  @ApiPropertyOptional()
  width?: number;

  @ApiPropertyOptional()
  height?: number;
}

export class DetectedObjectResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  objectType!: string;

  @ApiPropertyOptional({ example: 'bed' })
  type?: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ enum: DirectionEnum })
  zone!: DirectionEnum;

  @ApiProperty({ example: { x: 0.5, y: 0.5 } })
  relativePosition!: { x: number; y: number };

  @ApiProperty({ example: 0.95 })
  confidence!: number;

  @ApiPropertyOptional({ example: { x: 0.1, y: 0.2, width: 0.4, height: 0.3 } })
  boundingBox?: { x: number; y: number; width: number; height: number };

  @ApiPropertyOptional({ example: 'DETECTED' })
  detectionStatus?: string;

  @ApiPropertyOptional()
  attributes?: Record<string, any>;
}

export class FindingRemedyResponseDto {
  @ApiProperty({ enum: RemedyTypeEnum })
  type!: RemedyTypeEnum;

  @ApiProperty()
  action!: string;
}

export class FindingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ruleCode!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty({ enum: VerdictEnum })
  verdict!: VerdictEnum;

  @ApiProperty({ enum: SeverityEnum })
  severity!: SeverityEnum;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: [FindingRemedyResponseDto] })
  remedies!: FindingRemedyResponseDto[];
}

export class ElementalBalanceResponseDto {
  @ApiProperty({ example: 'BALANCED' })
  fire!: string;

  @ApiProperty({ example: 'BALANCED' })
  water!: string;

  @ApiProperty({ example: 'BALANCED' })
  earth!: string;

  @ApiProperty({ example: 'BALANCED' })
  air!: string;

  @ApiProperty({ example: 'BALANCED' })
  space!: string;
}

export class AnalysisResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: AnalysisStatusEnum })
  status!: AnalysisStatusEnum;

  @ApiProperty({ enum: RoomTypeEnum })
  roomType!: RoomTypeEnum;

  @ApiProperty({ type: OrientationResponseDto })
  orientation!: OrientationResponseDto;

  @ApiPropertyOptional({ example: 85 })
  overallScore?: number;

  @ApiPropertyOptional({ enum: ScoreBandEnum })
  scoreBand?: ScoreBandEnum;

  @ApiPropertyOptional({ type: ImageMetaResponseDto })
  image?: ImageMetaResponseDto;

  @ApiPropertyOptional({ type: ElementalBalanceResponseDto })
  elementalBalance?: ElementalBalanceResponseDto;

  @ApiProperty({ type: [DetectedObjectResponseDto] })
  detectedObjects!: DetectedObjectResponseDto[];

  @ApiProperty({ type: [FindingResponseDto] })
  findings!: FindingResponseDto[];

  @ApiProperty({ example: 'en', description: 'Language code used for AI generated report content' })
  language!: string;

  @ApiPropertyOptional()
  aiSummary?: string;

  @ApiPropertyOptional({ example: 0.95 })
  imageQualityScore?: number;

  @ApiPropertyOptional({ example: 'gemini-3.5-flash' })
  visionModelUsed?: string;

  @ApiPropertyOptional({ example: 1240 })
  visionDurationMs?: number;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional()
  completedAt?: string;
}

export class AnalysisSummaryCardDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: RoomTypeEnum })
  roomType!: RoomTypeEnum;

  @ApiProperty({ enum: AnalysisStatusEnum })
  status!: AnalysisStatusEnum;

  @ApiPropertyOptional()
  overallScore?: number;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ enum: DirectionEnum })
  direction?: DirectionEnum;

  @ApiProperty()
  createdAt!: string;
}
