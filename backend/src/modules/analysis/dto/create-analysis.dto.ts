import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DirectionEnum,
  DirectionSourceEnum,
  RoomTypeEnum,
} from '../../../common/constants/index.js';
import { SupportedLanguageEnum } from '../../../common/constants/index.js';

export class CreateAnalysisDto {
  @ApiProperty({
    enum: RoomTypeEnum,
    example: RoomTypeEnum.BEDROOM,
    description: 'Designated functional space type',
  })
  @IsEnum(RoomTypeEnum, {
    message:
      'roomType must be one of: BEDROOM, LIVING_ROOM, KITCHEN, MAIN_ENTRANCE, OFFICE',
  })
  roomType!: RoomTypeEnum;

  @ApiProperty({
    enum: DirectionSourceEnum,
    example: DirectionSourceEnum.DEVICE_COMPASS,
    description: 'Source of the orientation calibration',
  })
  @IsEnum(DirectionSourceEnum, {
    message:
      'directionSource must be one of: DEVICE_COMPASS, USER_SELECTED, UNKNOWN',
  })
  directionSource!: DirectionSourceEnum;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    maximum: 360,
    example: 182.5,
    description:
      'Compass degrees from True/Magnetic North (0.0 to 360.0). Required when directionSource is DEVICE_COMPASS.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'compassHeading must be a valid number' })
  @Min(0, { message: 'compassHeading must be >= 0.0' })
  @Max(360, { message: 'compassHeading must be <= 360.0' })
  compassHeading?: number;

  @ApiPropertyOptional({
    enum: DirectionEnum,
    example: DirectionEnum.SOUTH,
    description:
      'User-selected cardinal/ordinal direction. Required when directionSource is USER_SELECTED.',
  })
  @IsOptional()
  @IsEnum(DirectionEnum, {
    message: 'userSelectedDirection must be a valid cardinal/ordinal direction',
  })
  userSelectedDirection?: DirectionEnum;

  @ApiPropertyOptional({
    type: String,
    maxLength: 500,
    example: 'Master bedroom on 2nd floor facing street',
    description: 'Optional user notes or spatial context (max 500 chars)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'notes cannot exceed 500 characters' })
  notes?: string;

  @ApiPropertyOptional({
    enum: SupportedLanguageEnum,
    example: SupportedLanguageEnum.ENGLISH,
    description:
      'Target language code for AI explanation (en, hi, ta, te, kn, ml, bn, gu, mr, pa). Defaults to user preference or en.',
  })
  @IsOptional()
  @IsEnum(SupportedLanguageEnum, {
    message:
      'language must be one of: en, hi, ta, te, kn, ml, bn, gu, mr, pa',
  })
  language?: SupportedLanguageEnum;
}
