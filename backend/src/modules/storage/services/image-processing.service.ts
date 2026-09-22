import { Injectable, Logger } from '@nestjs/common';
import crypto from 'crypto';
import sharp from 'sharp';
import {
  PoorImageQualityException,
  UnsupportedImageFormatException,
} from '../../../common/exceptions/domain.exception.js';

export interface ProcessedImageResult {
  processedBuffer: Buffer;
  mimeType: string;
  extension: string;
  width: number;
  height: number;
  sizeBytes: number;
  sha256Hash: string;
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  private static readonly MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
  private static readonly MIN_FILE_SIZE_BYTES = 512; // 512 bytes minimum to prevent empty/truncated files
  private static readonly MAX_DIMENSION = 2048; // Max width/height to limit AI latency & token cost

  /**
   * Sniffs magic bytes to determine the true MIME type.
   */
  detectTrueMimeType(buffer: Buffer): string {
    if (!buffer || buffer.length < 12) {
      throw new UnsupportedImageFormatException('unknown_or_empty');
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'image/png';
    }

    // WebP: RIFF .... WEBP
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'image/webp';
    }

    // HEIC / HEIF: bytes 4..11 contain ftypheic, ftypmif1, etc.
    const ftyp = buffer.subarray(4, 12).toString('ascii');
    if (
      ftyp.includes('heic') ||
      ftyp.includes('heix') ||
      ftyp.includes('mif1') ||
      ftyp.includes('msf1')
    ) {
      return 'image/heic';
    }

    throw new UnsupportedImageFormatException('unrecognized_binary');
  }

  /**
   * Sanitizes, strips EXIF (including GPS), resizes, and re-encodes the image into WebP format.
   */
  async processAndSanitizeImage(
    rawBuffer: Buffer,
    originalFilename = 'photo.jpg',
  ): Promise<ProcessedImageResult> {
    if (rawBuffer.length > ImageProcessingService.MAX_FILE_SIZE_BYTES) {
      throw new PoorImageQualityException(
        'Image file size exceeds maximum 10MB limit.',
      );
    }

    if (rawBuffer.length < ImageProcessingService.MIN_FILE_SIZE_BYTES) {
      throw new PoorImageQualityException(
        'Image file is too small or corrupt (<10KB).',
      );
    }

    // 1. Verify MIME type via magic bytes
    const detectedMime = this.detectTrueMimeType(rawBuffer);

    // 2. Compute SHA-256 hash of original input
    const sha256Hash = crypto
      .createHash('sha256')
      .update(rawBuffer)
      .digest('hex');

    try {
      // 3. Process via Sharp: auto-orient, downscale, strip EXIF metadata
      const pipeline = sharp(rawBuffer, { failOn: 'error' })
        .rotate() // Respect EXIF orientation before stripping
        .resize({
          width: ImageProcessingService.MAX_DIMENSION,
          height: ImageProcessingService.MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85, effort: 4 });

      const processedBuffer = await pipeline.toBuffer();
      const metadata = await sharp(processedBuffer).metadata();

      const width = metadata.width || 0;
      const height = metadata.height || 0;

      const minDimension = Math.min(width, height);
      const maxDimension = Math.max(width, height);

      // Support portrait, landscape, and mobile capture resolutions (min 120x160)
      if (minDimension < 120 || maxDimension < 160) {
        throw new PoorImageQualityException(
          `Image resolution too low (${width}x${height}). Minimum resolution is 160x120.`,
        );
      }

      this.logger.debug(
        `Sanitized ${originalFilename} (${detectedMime} -> WebP): ${rawBuffer.length}b -> ${processedBuffer.length}b (${width}x${height})`,
      );

      return {
        processedBuffer,
        mimeType: 'image/webp',
        extension: 'webp',
        width,
        height,
        sizeBytes: processedBuffer.length,
        sha256Hash,
      };
    } catch (err: any) {
      if (err instanceof PoorImageQualityException) throw err;
      this.logger.error(`Sharp image sanitization failed: ${err.message}`, err.stack);
      throw new PoorImageQualityException(
        `Corrupt or malformed image payload: ${err.message}`,
      );
    }
  }

  /**
   * Pre-AI image quality assessment using Sharp pixel statistics.
   * Returns a structured assessment to decide whether to proceed with AI analysis.
   */
  async assessImageQuality(buffer: Buffer): Promise<ImageQualityReport> {
    const issues: string[] = [];
    let score = 1.0;

    // 1. File size checks
    if (buffer.length < ImageProcessingService.MIN_FILE_SIZE_BYTES) {
      issues.push('FILE_TOO_SMALL');
      return { usable: false, score: 0, issues };
    }
    if (buffer.length > ImageProcessingService.MAX_FILE_SIZE_BYTES) {
      issues.push('FILE_TOO_LARGE');
      return { usable: false, score: 0, issues };
    }

    try {
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const minDim = Math.min(width, height);
      const maxDim = Math.max(width, height);

      // 2. Resolution check
      if (minDim < 120 || maxDim < 160) {
        issues.push('RESOLUTION_TOO_LOW');
        score -= 0.5;
      } else if (minDim < 200) {
        issues.push('RESOLUTION_LOW');
        score -= 0.15;
      }

      // 3. Brightness / exposure analysis via Sharp stats
      const stats = await sharp(buffer).stats();
      // Mean luminance across all channels (grayscale equivalent)
      const meanLuminance =
        stats.channels.length > 0
          ? stats.channels.reduce((sum, ch) => sum + ch.mean, 0) /
            stats.channels.length
          : 128;

      if (meanLuminance < 30) {
        issues.push('TOO_DARK');
        score -= 0.3;
      } else if (meanLuminance < 60) {
        issues.push('LOW_BRIGHTNESS');
        score -= 0.1;
      }

      if (meanLuminance > 245) {
        issues.push('OVEREXPOSED');
        score -= 0.3;
      } else if (meanLuminance > 230) {
        issues.push('HIGH_BRIGHTNESS');
        score -= 0.1;
      }

      // 4. Extreme aspect ratio (likely a screenshot strip or panorama glitch)
      const aspectRatio = maxDim / Math.max(1, minDim);
      if (aspectRatio > 5) {
        issues.push('EXTREME_ASPECT_RATIO');
        score -= 0.2;
      }

      // Clamp score to [0, 1]
      score = Math.max(0, Math.min(1, score));
      const usable = score >= 0.3 && !issues.includes('FILE_TOO_SMALL');

      this.logger.debug(
        `Image quality assessment: score=${score.toFixed(2)}, usable=${usable}, issues=[${issues.join(', ')}]`,
      );

      return { usable, score, issues };
    } catch (err: any) {
      this.logger.warn(`Image quality assessment failed: ${err.message}`);
      issues.push('CORRUPT_OR_UNREADABLE');
      return { usable: false, score: 0, issues };
    }
  }
}

export interface ImageQualityReport {
  usable: boolean;
  score: number;
  issues: string[];
}
