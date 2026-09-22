import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { ReportsService } from './reports.service.js';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Public()
  @Get(':analysisId/pdf')
  @ApiOperation({
    summary: 'Download high-resolution Vastu Harmony PDF Certificate',
    description:
      'Generates and streams an authentic, branded vector PDF report containing overall score, 5-element breakdown, rule findings, and prioritized remedies.',
  })
  @ApiParam({
    name: 'analysisId',
    type: 'string',
    format: 'uuid',
    description: 'Unique analysis UUID identifier',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF binary stream successfully generated',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Analysis record not found',
  })
  async downloadReportPdf(
    @Param('analysisId', new ParseUUIDPipe({ version: '4' })) analysisId: string,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.reportsService.generateAnalysisPdf(analysisId);

    const filename = `vastu-harmony-certificate-${analysisId.slice(0, 8)}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'public, max-age=86400',
    });

    res.end(pdfBuffer);
  }
}
