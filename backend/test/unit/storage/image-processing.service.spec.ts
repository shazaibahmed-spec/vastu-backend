import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { UnsupportedImageFormatException } from '../../../src/common/exceptions/domain.exception.js';
import { ImageProcessingService } from '../../../src/modules/storage/services/image-processing.service.js';

describe('ImageProcessingService Unit Tests', () => {
  const service = new ImageProcessingService();

  describe('detectTrueMimeType', () => {
    it('should detect JPEG magic bytes', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      expect(service.detectTrueMimeType(jpegBuffer)).toBe('image/jpeg');
    });

    it('should detect PNG magic bytes', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      expect(service.detectTrueMimeType(pngBuffer)).toBe('image/png');
    });

    it('should detect WebP magic bytes', () => {
      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);
      expect(service.detectTrueMimeType(webpBuffer)).toBe('image/webp');
    });

    it('should throw UnsupportedImageFormatException for non-image buffers', () => {
      const textBuffer = Buffer.from('Hello world this is a test not an image payload');
      expect(() => service.detectTrueMimeType(textBuffer)).toThrow(
        UnsupportedImageFormatException,
      );
    });
  });

  describe('processAndSanitizeImage', () => {
    it('should process a valid JPEG into sanitized WebP with dimensions and hash', async () => {
      // Generate a synthetic valid JPEG using Sharp
      const syntheticJpeg = await sharp({
        create: {
          width: 640,
          height: 480,
          channels: 3,
          background: { r: 200, g: 150, b: 100 },
        },
      })
        .jpeg()
        .toBuffer();

      const result = await service.processAndSanitizeImage(
        syntheticJpeg,
        'test-room.jpg',
      );

      expect(result.mimeType).toBe('image/webp');
      expect(result.extension).toBe('webp');
      expect(result.width).toBe(640);
      expect(result.height).toBe(480);
      expect(result.sha256Hash).toBeDefined();
      expect(result.sha256Hash.length).toBe(64);
      expect(result.processedBuffer.length).toBeGreaterThan(0);
    });
  });
});
