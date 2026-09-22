import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import {
  AnalysisStatusEnum,
  RoomTypeEnum,
} from '../../../common/constants/index.js';
import { PaginationQueryDto } from '../../../common/dto/api-response.dto.js';

export class QueryAnalysisDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RoomTypeEnum })
  @IsOptional()
  @IsEnum(RoomTypeEnum)
  roomType?: RoomTypeEnum;

  @ApiPropertyOptional({ enum: AnalysisStatusEnum })
  @IsOptional()
  @IsEnum(AnalysisStatusEnum)
  status?: AnalysisStatusEnum;
}
