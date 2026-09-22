import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import sharp from 'sharp';
import {
  DEFAULT_DEV_USER_ID,
  SupportedLanguageEnum,
} from '../../../common/constants/index.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import {
  AnalysisResponseDto,
  AnalysisSummaryCardDto,
} from '../dto/analysis-response.dto.js';
import { CreateAnalysisDto } from '../dto/create-analysis.dto.js';
import { QueryAnalysisDto } from '../dto/query-analysis.dto.js';
import { AnalysisPipelineService } from '../services/analysis-pipeline.service.js';
import { AnalysisService } from '../services/analysis.service.js';

@ApiTags('Analysis')
@ApiBearerAuth()
@Public()
@Controller('analysis')
export class AnalysisController {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly pipelineService: AnalysisPipelineService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Upload room photo and execute end-to-end Vastu analysis',
    description:
      'Uploads an architectural room photograph, detects spatial facts via Vision AI, executes deterministic Vastu rules, and synthesizes empathetic remedies.',
  })
  @ApiBody({
    description: 'Image file and contextual room parameters',
    schema: {
      type: 'object',
      required: ['roomType', 'directionSource'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Photographic capture of the room (JPEG/PNG/WebP/HEIC, max 10MB)',
        },
        roomType: {
          type: 'string',
          enum: ['BEDROOM', 'LIVING_ROOM', 'KITCHEN', 'MAIN_ENTRANCE', 'OFFICE'],
        },
        directionSource: {
          type: 'string',
          enum: ['DEVICE_COMPASS', 'USER_SELECTED', 'UNKNOWN'],
        },
        compassHeading: {
          type: 'number',
          minimum: 0,
          maximum: 360,
          example: 180,
        },
        userSelectedDirection: {
          type: 'string',
          enum: [
            'NORTH',
            'NORTH_EAST',
            'EAST',
            'SOUTH_EAST',
            'SOUTH',
            'SOUTH_WEST',
            'WEST',
            'NORTH_WEST',
          ],
        },
        notes: {
          type: 'string',
          maxLength: 500,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Analysis completed successfully',
    type: AnalysisResponseDto,
  })
  async createAnalysis(
    @UploadedFile() file: any,
    @Body() dto: CreateAnalysisDto,
    @CurrentUser('userId') currentUserId?: string,
  ): Promise<AnalysisResponseDto> {
    const resolvedUserId =
      currentUserId || DEFAULT_DEV_USER_ID;

    // If file is provided via multipart/form-data, use it; otherwise generate a valid synthetic image buffer for testing
    let imageBuffer: Buffer;
    let filename = 'room-capture.jpg';

    if (file && file.buffer) {
      imageBuffer = file.buffer;
      filename = file.originalname || 'room-capture.jpg';
    } else if (dto.imageBase64) {
      const cleanBase64 = dto.imageBase64.replace(
        /^data:image\/\w+;base64,/,
        '',
      );
      imageBuffer = Buffer.from(cleanBase64, 'base64');
      filename = 'room-capture.jpg';
    } else {
      // Create a valid synthetic JPEG image buffer for headless JSON testing
      imageBuffer = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 210, g: 180, b: 140 },
        },
      })
        .jpeg()
        .toBuffer();
    }

    return this.pipelineService.executePipeline(
      resolvedUserId,
      imageBuffer,
      filename,
      dto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed analysis report by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the analysis' })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: SupportedLanguageEnum,
    description: 'Target language to view the report in',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed analysis report',
    type: AnalysisResponseDto,
  })
  async getAnalysisById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('lang') lang?: SupportedLanguageEnum,
    @CurrentUser('userId') currentUserId?: string,
  ): Promise<AnalysisResponseDto> {
    return this.analysisService.getAnalysisById(id, currentUserId, lang);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of analyses' })
  @ApiResponse({
    status: 200,
    description: 'Paginated analysis cards',
    type: [AnalysisSummaryCardDto],
  })
  async listAnalyses(
    @Query() query: QueryAnalysisDto,
    @CurrentUser('userId') currentUserId?: string,
  ) {
    const resolvedUserId =
      currentUserId || DEFAULT_DEV_USER_ID;
    return this.analysisService.listUserAnalyses(resolvedUserId, query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an analysis' })
  @ApiParam({ name: 'id', description: 'UUID of the analysis' })
  @ApiResponse({ status: 200, description: 'Analysis soft-deleted' })
  async deleteAnalysis(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('userId') currentUserId?: string,
  ) {
    const resolvedUserId =
      currentUserId || DEFAULT_DEV_USER_ID;
    await this.analysisService.softDeleteAnalysis(id, resolvedUserId);
    return { message: 'Analysis successfully removed.' };
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed analysis pipeline stage' })
  @ApiParam({ name: 'id', description: 'UUID of the failed analysis' })
  @ApiResponse({ status: 200, description: 'Analysis reset to retryable stage' })
  async retryAnalysis(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('userId') currentUserId?: string,
  ) {
    const resolvedUserId =
      currentUserId || DEFAULT_DEV_USER_ID;
    await this.analysisService.retryAnalysis(id, resolvedUserId);
    return { message: 'Analysis retry initiated.' };
  }
}
