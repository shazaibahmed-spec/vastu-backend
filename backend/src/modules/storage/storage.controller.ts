import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import path from 'path';
import { Public } from '../../common/decorators/public.decorator.js';
import { StorageService } from './services/storage.service.js';

@ApiTags('Storage')
@Public()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get(':key')
  @ApiOperation({
    summary: 'Stream stored image or media asset by storage key',
    description:
      'Serves optimized architectural photographs and media assets with HTTP cache headers.',
  })
  @ApiParam({
    name: 'key',
    description: 'Unique storage filename (e.g. uuid.webp)',
    example: '4cb55512-7665-48e6-9a43-cba2735c1f05.webp',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Binary media stream with content-type',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Requested media asset does not exist',
  })
  async getStoredFile(
    @Param('key') key: string,
    @Res() res: Response,
  ): Promise<void> {
    // Basic path traversal protection
    const sanitizedKey = path.basename(key);

    try {
      const buffer = await this.storageService.getFile(sanitizedKey);
      const ext = path.extname(sanitizedKey).toLowerCase();

      let mimeType = 'application/octet-stream';
      if (ext === '.webp') {
        mimeType = 'image/webp';
      } else if (ext === '.png') {
        mimeType = 'image/png';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        mimeType = 'image/jpeg';
      } else if (ext === '.pdf') {
        mimeType = 'application/pdf';
      }

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Accept-Ranges', 'bytes');
      res.end(buffer);
    } catch (err) {
      throw new NotFoundException(`File '${sanitizedKey}' was not found.`);
    }
  }
}
