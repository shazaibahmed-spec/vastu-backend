import sharp from 'sharp';
import { beforeEach, describe, expect, it } from 'vitest';
import { ImageProcessingService } from '../../../src/modules/storage/services/image-processing.service.js';

describe('ImageProcessingService - Quality Assessment', () => {
  let service: ImageProcessingService;

  beforeEach(() => {
    service = new ImageProcessingService();
  });

  it('should reject files smaller than minimum allowed byte size', async () => {
    const tinyBuffer = Buffer.from('too tiny');
    const report = await service.assessImageQuality(tinyBuffer);

    expect(report.usable).toBe(false);
    expect(report.score).toBe(0);
    expect(report.issues).toContain('FILE_TOO_SMALL');
  });

  it('should pass healthy, well-lit indoor room photo buffers', async () => {
    const validImage = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 140, g: 130, b: 120 },
      },
    })
      .jpeg()
      .toBuffer();

    const report = await service.assessImageQuality(validImage);

    expect(report.usable).toBe(true);
    expect(report.score).toBeGreaterThanOrEqual(0.8);
    expect(report.issues).toHaveLength(0);
  });

  it('should flag images with resolution below minimum requirement', async () => {
    // 100x100 resolution has minDim < 120 (RESOLUTION_TOO_LOW)
    // Using random noise ensures the JPEG is > 512 bytes to pass file size check
    const noise = Buffer.alloc(100 * 100 * 3);
    for (let i = 0; i < noise.length; i++) noise[i] = (i * 37) % 256;
    const tinyResolutionImage = await sharp(noise, {
      raw: { width: 100, height: 100, channels: 3 },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    const report = await service.assessImageQuality(tinyResolutionImage);

    expect(report.issues).toContain('RESOLUTION_TOO_LOW');
    expect(report.score).toBeLessThan(0.7);
  });

  it('should flag images that are severely underexposed (too dark)', async () => {
    const darkImage = await sharp({
      create: {
        width: 640,
        height: 480,
        channels: 3,
        background: { r: 10, g: 10, b: 10 }, // near black
      },
    })
      .jpeg()
      .toBuffer();

    const report = await service.assessImageQuality(darkImage);

    expect(report.issues).toContain('TOO_DARK');
    expect(report.score).toBeLessThan(0.8);
  });

  it('should flag images with extreme panoramic or banner aspect ratios', async () => {
    const bannerImage = await sharp({
      create: {
        width: 1200,
        height: 100, // 12:1 aspect ratio
        channels: 3,
        background: { r: 120, g: 120, b: 120 },
      },
    })
      .jpeg()
      .toBuffer();

    const report = await service.assessImageQuality(bannerImage);

    expect(report.issues).toContain('EXTREME_ASPECT_RATIO');
  });

  it('should gracefully handle corrupted image buffers', async () => {
    // 1024 bytes > MIN_FILE_SIZE_BYTES (512) so it passes size check and fails at sharp decode
    const corrupted = Buffer.alloc(1024, 255);
    const report = await service.assessImageQuality(corrupted);

    expect(report.usable).toBe(false);
    expect(report.score).toBe(0);
    expect(report.issues).toContain('CORRUPT_OR_UNREADABLE');
  });
});
