import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SupportedLanguageEnum } from '../../../common/constants/index.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { DailyPrincipleResponseDto } from '../dto/daily-principle-response.dto.js';
import { VastuWisdomService } from '../services/vastu-wisdom.service.js';

@ApiTags('Vastu')
@Controller('vastu')
export class VastuController {
  constructor(private readonly wisdomService: VastuWisdomService) {}

  @Public()
  @Get('daily-principle')
  @ApiOperation({
    summary: 'Get daily authentic Vastu principle',
    description:
      'Returns the classical Vastu principle for the current day, localized in the requested language.',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Offset for cycling through principles on demand',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'ISO Date string (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: SupportedLanguageEnum,
    description: 'Language code for localized content (default: en)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Daily Vastu principle successfully retrieved',
    type: DailyPrincipleResponseDto,
  })
  getDailyPrinciple(
    @Query('offset') offset?: string,
    @Query('date') date?: string,
    @Query('lang') lang?: SupportedLanguageEnum,
  ): DailyPrincipleResponseDto {
    const numOffset = offset ? parseInt(offset, 10) || 0 : 0;
    return this.wisdomService.getDailyPrinciple(date, numOffset, lang);
  }
}
