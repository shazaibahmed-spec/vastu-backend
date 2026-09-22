import { describe, expect, it } from 'vitest';

/**
 * Mirror of the coordinate-mapping logic for headless unit testing
 */
interface ViewDimensions {
  width: number;
  height: number;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type ImageResizeMode = 'contain' | 'cover' | 'stretch';

function calculateImageRenderMetrics(
  container: ViewDimensions,
  image: ViewDimensions,
  resizeMode: ImageResizeMode = 'contain',
) {
  const containerW = Math.max(container.width, 0);
  const containerH = Math.max(container.height, 0);

  if (containerW === 0 || containerH === 0) {
    return { renderedWidth: 0, renderedHeight: 0, offsetX: 0, offsetY: 0 };
  }

  const imageW = image.width > 0 ? image.width : containerW;
  const imageH = image.height > 0 ? image.height : containerH;

  if (resizeMode === 'stretch') {
    return {
      renderedWidth: containerW,
      renderedHeight: containerH,
      offsetX: 0,
      offsetY: 0,
    };
  }

  const imageAspect = imageW / imageH;
  const containerAspect = containerW / containerH;

  let renderedWidth = containerW;
  let renderedHeight = containerH;
  let offsetX = 0;
  let offsetY = 0;

  if (resizeMode === 'contain') {
    if (imageAspect > containerAspect) {
      renderedWidth = containerW;
      renderedHeight = containerW / imageAspect;
      offsetX = 0;
      offsetY = (containerH - renderedHeight) / 2;
    } else {
      renderedHeight = containerH;
      renderedWidth = containerH * imageAspect;
      offsetX = (containerW - renderedWidth) / 2;
      offsetY = 0;
    }
  } else if (resizeMode === 'cover') {
    if (imageAspect > containerAspect) {
      renderedHeight = containerH;
      renderedWidth = containerH * imageAspect;
      offsetX = (containerW - renderedWidth) / 2;
      offsetY = 0;
    } else {
      renderedWidth = containerW;
      renderedHeight = containerW / imageAspect;
      offsetX = 0;
      offsetY = (containerH - renderedHeight) / 2;
    }
  }

  return { renderedWidth, renderedHeight, offsetX, offsetY };
}

function calculateBoundingBoxPixelStyle(
  box: BoundingBox,
  container: ViewDimensions,
  image: ViewDimensions,
  resizeMode: ImageResizeMode = 'contain',
) {
  const metrics = calculateImageRenderMetrics(container, image, resizeMode);

  const normX = Math.max(0, Math.min(1, box.x ?? 0));
  const normY = Math.max(0, Math.min(1, box.y ?? 0));
  const normW = Math.max(0, Math.min(1 - normX, box.width ?? 0));
  const normH = Math.max(0, Math.min(1 - normY, box.height ?? 0));

  const rawLeft = metrics.offsetX + normX * metrics.renderedWidth;
  const rawTop = metrics.offsetY + normY * metrics.renderedHeight;
  const rawWidth = normW * metrics.renderedWidth;
  const rawHeight = normH * metrics.renderedHeight;

  const left = Math.round(Math.max(0, Math.min(container.width, rawLeft)));
  const top = Math.round(Math.max(0, Math.min(container.height, rawTop)));
  const width = Math.round(Math.max(0, Math.min(container.width - left, rawWidth)));
  const height = Math.round(Math.max(0, Math.min(container.height - top, rawHeight)));

  return { left, top, width, height };
}

describe('Detection Coordinate Mapping & Aspect Ratios', () => {
  describe('calculateImageRenderMetrics', () => {
    it('should calculate vertical letterbox when image is wider than container in contain mode', () => {
      // 16:9 image (1600x900) in 4:3 container (400x300)
      // containerAspect = 400/300 = 1.333, imageAspect = 1600/900 = 1.778
      const metrics = calculateImageRenderMetrics(
        { width: 400, height: 300 },
        { width: 1600, height: 900 },
        'contain',
      );

      expect(metrics.renderedWidth).toBe(400);
      expect(metrics.renderedHeight).toBeCloseTo(225, 1);
      expect(metrics.offsetX).toBe(0);
      expect(metrics.offsetY).toBeCloseTo((300 - 225) / 2, 1); // 37.5
    });

    it('should calculate horizontal pillarbox when image is taller than container in contain mode', () => {
      // 3:4 portrait image (900x1200) in 1:1 container (400x400)
      // containerAspect = 1.0, imageAspect = 0.75
      const metrics = calculateImageRenderMetrics(
        { width: 400, height: 400 },
        { width: 900, height: 1200 },
        'contain',
      );

      expect(metrics.renderedHeight).toBe(400);
      expect(metrics.renderedWidth).toBe(300); // 400 * 0.75
      expect(metrics.offsetY).toBe(0);
      expect(metrics.offsetX).toBe(50); // (400 - 300) / 2
    });

    it('should handle cover mode for wider image by cropping horizontally', () => {
      // 16:9 image (1600x900) in 1:1 container (300x300)
      const metrics = calculateImageRenderMetrics(
        { width: 300, height: 300 },
        { width: 1600, height: 900 },
        'cover',
      );

      expect(metrics.renderedHeight).toBe(300);
      expect(metrics.renderedWidth).toBeCloseTo(300 * (16 / 9), 1);
      expect(metrics.offsetY).toBe(0);
      expect(metrics.offsetX).toBeLessThan(0); // cropped on left and right
    });

    it('should stretch to container dimensions in stretch mode', () => {
      const metrics = calculateImageRenderMetrics(
        { width: 350, height: 250 },
        { width: 1920, height: 1080 },
        'stretch',
      );

      expect(metrics.renderedWidth).toBe(350);
      expect(metrics.renderedHeight).toBe(250);
      expect(metrics.offsetX).toBe(0);
      expect(metrics.offsetY).toBe(0);
    });

    it('should return zeros when container dimensions are zero', () => {
      const metrics = calculateImageRenderMetrics(
        { width: 0, height: 0 },
        { width: 1920, height: 1080 },
        'contain',
      );

      expect(metrics.renderedWidth).toBe(0);
      expect(metrics.renderedHeight).toBe(0);
      expect(metrics.offsetX).toBe(0);
      expect(metrics.offsetY).toBe(0);
    });
  });

  describe('calculateBoundingBoxPixelStyle', () => {
    it('should accurately map normalized coordinates to container pixels', () => {
      // 1:1 container 400x400 and 1:1 image 1000x1000
      const box: BoundingBox = {
        x: 0.1,
        y: 0.2,
        width: 0.5,
        height: 0.3,
      };

      const pixel = calculateBoundingBoxPixelStyle(
        box,
        { width: 400, height: 400 },
        { width: 1000, height: 1000 },
        'contain',
      );

      expect(pixel.left).toBe(40); // 0.1 * 400
      expect(pixel.top).toBe(80); // 0.2 * 400
      expect(pixel.width).toBe(200); // 0.5 * 400
      expect(pixel.height).toBe(120); // 0.3 * 400
    });

    it('should account for letterbox offsets in contain mode', () => {
      // Container: 400x300 (aspect 1.333). Image: 400x200 (aspect 2.0).
      // Rendered height = 200, offsetY = 50, renderedWidth = 400, offsetX = 0
      const box: BoundingBox = {
        x: 0.25,
        y: 0.5,
        width: 0.5,
        height: 0.25,
      };

      const pixel = calculateBoundingBoxPixelStyle(
        box,
        { width: 400, height: 300 },
        { width: 400, height: 200 },
        'contain',
      );

      expect(pixel.left).toBe(100); // 0 + 0.25 * 400
      expect(pixel.top).toBe(150); // 50 (offset) + 0.5 * 200 = 150
      expect(pixel.width).toBe(200); // 0.5 * 400
      expect(pixel.height).toBe(50); // 0.25 * 200
    });

    it('should clamp out-of-bounds coordinates to stay inside viewport', () => {
      const outOfBoundsBox: BoundingBox = {
        x: -0.5,
        y: 0.8,
        width: 1.5,
        height: 0.6,
      };

      const pixel = calculateBoundingBoxPixelStyle(
        outOfBoundsBox,
        { width: 300, height: 300 },
        { width: 300, height: 300 },
        'contain',
      );

      expect(pixel.left).toBeGreaterThanOrEqual(0);
      expect(pixel.top).toBeGreaterThanOrEqual(0);
      expect(pixel.left + pixel.width).toBeLessThanOrEqual(300);
      expect(pixel.top + pixel.height).toBeLessThanOrEqual(300);
    });

    it('should handle overlapping bounding boxes cleanly', () => {
      const bedBox: BoundingBox = { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };
      const pillowBox: BoundingBox = { x: 0.3, y: 0.25, width: 0.2, height: 0.15 };

      const bedPixel = calculateBoundingBoxPixelStyle(
        bedBox,
        { width: 500, height: 500 },
        { width: 500, height: 500 },
      );
      const pillowPixel = calculateBoundingBoxPixelStyle(
        pillowBox,
        { width: 500, height: 500 },
        { width: 500, height: 500 },
      );

      // Pillow is inside bed boundaries
      expect(pillowPixel.left).toBeGreaterThan(bedPixel.left);
      expect(pillowPixel.top).toBeGreaterThan(bedPixel.top);
      expect(pillowPixel.left + pillowPixel.width).toBeLessThan(bedPixel.left + bedPixel.width);
      expect(pillowPixel.top + pillowPixel.height).toBeLessThan(bedPixel.top + bedPixel.height);
    });
  });
});
