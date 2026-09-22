export type RoomType =
  | 'BEDROOM'
  | 'LIVING_ROOM'
  | 'KITCHEN'
  | 'MAIN_ENTRANCE'
  | 'OFFICE';

export type CompassDirection =
  | 'NORTH'
  | 'NORTH_EAST'
  | 'EAST'
  | 'SOUTH_EAST'
  | 'SOUTH'
  | 'SOUTH_WEST'
  | 'WEST'
  | 'NORTH_WEST'
  | 'CENTER';

export type DirectionSource = 'DEVICE_COMPASS' | 'USER_SELECTED' | 'UNKNOWN';

export type AnalysisStatus =
  | 'PENDING'
  | 'IMAGE_UPLOADED'
  | 'AI_ANALYSIS'
  | 'OBJECT_DETECTION'
  | 'RULE_EVALUATION'
  | 'REPORT_GENERATION'
  | 'COMPLETED'
  | 'FAILED_AI_ANALYSIS'
  | 'FAILED_RULE_EVALUATION'
  | 'FAILED_REPORT_GENERATION';

export type ScoreBand = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_ATTENTION';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Verdict = 'COMPLIANT' | 'DEFECT' | 'NEUTRAL';
export type RemedyType = 'STRUCTURAL' | 'ELEMENTAL' | 'DECORATIVE' | 'COLOR';

export interface User {
  id: string;
  email: string;
  name?: string;
  languageCode?: string;
  role: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedObject {
  id: string;
  type?: string;
  objectType: string;
  label: string;
  zone: CompassDirection;
  relativePosition: { x: number; y: number };
  confidence: number;
  boundingBox?: BoundingBox;
  detectionStatus?: string;
  attributes?: Record<string, any>;
}

export interface FindingRemedy {
  type: RemedyType;
  action: string;
}

export interface Finding {
  id: string;
  ruleCode: string;
  category: string;
  verdict: Verdict;
  severity: Severity;
  title: string;
  description: string;
  remedies: FindingRemedy[];
}

export interface ElementalBalance {
  fire: string;
  water: string;
  earth: string;
  air: string;
  space: string;
}

export interface AnalysisReport {
  id: string;
  status: AnalysisStatus;
  roomType: RoomType;
  orientation: {
    source: DirectionSource;
    heading?: number;
    direction?: CompassDirection;
    isCalibrated: boolean;
  };
  overallScore?: number;
  scoreBand?: ScoreBand;
  image?: {
    url: string;
    width?: number;
    height?: number;
  };
  elementalBalance?: ElementalBalance;
  detectedObjects: DetectedObject[];
  findings: Finding[];
  aiSummary?: string;
  language?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AnalysisSummaryCard {
  id: string;
  roomType: RoomType;
  status: AnalysisStatus;
  overallScore?: number;
  thumbnailUrl?: string;
  direction?: CompassDirection;
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    timestamp: string;
    correlationId?: string;
  };
}

export interface VastuPrinciple {
  id: string;
  zone: string;
  element: string;
  quote: string;
  actionTip: string;
  date?: string;
}

