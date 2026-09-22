export enum RoomTypeEnum {
  BEDROOM = 'BEDROOM',
  LIVING_ROOM = 'LIVING_ROOM',
  KITCHEN = 'KITCHEN',
  MAIN_ENTRANCE = 'MAIN_ENTRANCE',
  OFFICE = 'OFFICE',
}

export enum DirectionEnum {
  NORTH = 'NORTH',
  NORTH_EAST = 'NORTH_EAST',
  EAST = 'EAST',
  SOUTH_EAST = 'SOUTH_EAST',
  SOUTH = 'SOUTH',
  SOUTH_WEST = 'SOUTH_WEST',
  WEST = 'WEST',
  NORTH_WEST = 'NORTH_WEST',
  CENTER = 'CENTER',
}

export enum DirectionSourceEnum {
  DEVICE_COMPASS = 'DEVICE_COMPASS',
  USER_SELECTED = 'USER_SELECTED',
  UNKNOWN = 'UNKNOWN',
}

export enum AnalysisStatusEnum {
  PENDING = 'PENDING',
  IMAGE_UPLOADED = 'IMAGE_UPLOADED',
  AI_ANALYSIS = 'AI_ANALYSIS',
  OBJECT_DETECTION = 'OBJECT_DETECTION',
  RULE_EVALUATION = 'RULE_EVALUATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
  COMPLETED = 'COMPLETED',
  FAILED_AI_ANALYSIS = 'FAILED_AI_ANALYSIS',
  FAILED_RULE_EVALUATION = 'FAILED_RULE_EVALUATION',
  FAILED_REPORT_GENERATION = 'FAILED_REPORT_GENERATION',
  FAILED_INVALID_INPUT = 'FAILED_INVALID_INPUT',
}

export enum VerdictEnum {
  COMPLIANT = 'COMPLIANT',
  DEFECT = 'DEFECT',
  NEUTRAL = 'NEUTRAL',
}

export enum SeverityEnum {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RemedyTypeEnum {
  STRUCTURAL = 'STRUCTURAL',
  ELEMENTAL = 'ELEMENTAL',
  DECORATIVE = 'DECORATIVE',
  COLOR = 'COLOR',
}

export enum ScoreBandEnum {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  NEEDS_ATTENTION = 'NEEDS_ATTENTION',
}

export const DIRECTION_OCTANTS: ReadonlyArray<{
  direction: DirectionEnum;
  minDegrees: number;
  maxDegrees: number;
}> = [
  { direction: DirectionEnum.NORTH, minDegrees: 337.5, maxDegrees: 360 },
  { direction: DirectionEnum.NORTH, minDegrees: 0, maxDegrees: 22.5 },
  { direction: DirectionEnum.NORTH_EAST, minDegrees: 22.5, maxDegrees: 67.5 },
  { direction: DirectionEnum.EAST, minDegrees: 67.5, maxDegrees: 112.5 },
  { direction: DirectionEnum.SOUTH_EAST, minDegrees: 112.5, maxDegrees: 157.5 },
  { direction: DirectionEnum.SOUTH, minDegrees: 157.5, maxDegrees: 202.5 },
  { direction: DirectionEnum.SOUTH_WEST, minDegrees: 202.5, maxDegrees: 247.5 },
  { direction: DirectionEnum.WEST, minDegrees: 247.5, maxDegrees: 292.5 },
  { direction: DirectionEnum.NORTH_WEST, minDegrees: 292.5, maxDegrees: 337.5 },
];

export enum SupportedLanguageEnum {
  ENGLISH = 'en',
  HINDI = 'hi',
  TAMIL = 'ta',
  TELUGU = 'te',
  KANNADA = 'kn',
  MALAYALAM = 'ml',
  BENGALI = 'bn',
  GUJARATI = 'gu',
  MARATHI = 'mr',
  PUNJABI = 'pa',
}

export type SupportedLanguage = `${SupportedLanguageEnum}`;

export interface LanguageMeta {
  code: SupportedLanguageEnum;
  name: string;
  nativeName: string;
  script: string;
}

export const SUPPORTED_LANGUAGES: ReadonlyArray<LanguageMeta> = [
  { code: SupportedLanguageEnum.ENGLISH, name: 'English', nativeName: 'English', script: 'Latin' },
  { code: SupportedLanguageEnum.HINDI, name: 'Hindi', nativeName: 'हिन्दी', script: 'Devanagari' },
  { code: SupportedLanguageEnum.TAMIL, name: 'Tamil', nativeName: 'தமிழ்', script: 'Tamil' },
  { code: SupportedLanguageEnum.TELUGU, name: 'Telugu', nativeName: 'తెలుగు', script: 'Telugu' },
  { code: SupportedLanguageEnum.KANNADA, name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Kannada' },
  { code: SupportedLanguageEnum.MALAYALAM, name: 'Malayalam', nativeName: 'മലയാളം', script: 'Malayalam' },
  { code: SupportedLanguageEnum.BENGALI, name: 'Bengali', nativeName: 'বাংলা', script: 'Bengali' },
  { code: SupportedLanguageEnum.GUJARATI, name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujarati' },
  { code: SupportedLanguageEnum.MARATHI, name: 'Marathi', nativeName: 'मराठी', script: 'Devanagari' },
  { code: SupportedLanguageEnum.PUNJABI, name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
];

export const DEFAULT_LANGUAGE = SupportedLanguageEnum.ENGLISH;

export const DEFAULT_DEV_USER_ID = '00000000-0000-0000-0000-000000000001';
