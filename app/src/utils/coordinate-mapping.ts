import { BoundingBox } from '../api/types';
import { getBaseUrl } from '../api/config';

export type ImageResizeMode = 'contain' | 'cover' | 'stretch';

export interface ViewDimensions {
  width: number;
  height: number;
}

export interface RenderedImageMetrics {
  renderedWidth: number;
  renderedHeight: number;
  offsetX: number;
  offsetY: number;
}

export interface PixelBoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Calculates the exact rendered pixel dimensions and letterbox/pillarbox offsets
 * of an image placed inside a container view according to its resizeMode.
 */
export function calculateImageRenderMetrics(
  container: ViewDimensions,
  image: ViewDimensions,
  resizeMode: ImageResizeMode = 'contain',
): RenderedImageMetrics {
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
      // Wider image than container: fits horizontally, letterboxed vertically
      renderedWidth = containerW;
      renderedHeight = containerW / imageAspect;
      offsetX = 0;
      offsetY = (containerH - renderedHeight) / 2;
    } else {
      // Taller image than container: fits vertically, pillarboxed horizontally
      renderedHeight = containerH;
      renderedWidth = containerH * imageAspect;
      offsetX = (containerW - renderedWidth) / 2;
      offsetY = 0;
    }
  } else if (resizeMode === 'cover') {
    if (imageAspect > containerAspect) {
      // Wider image: fills vertically, cropped horizontally
      renderedHeight = containerH;
      renderedWidth = containerH * imageAspect;
      offsetX = (containerW - renderedWidth) / 2;
      offsetY = 0;
    } else {
      // Taller image: fills horizontally, cropped vertically
      renderedWidth = containerW;
      renderedHeight = containerW / imageAspect;
      offsetX = 0;
      offsetY = (containerH - renderedHeight) / 2;
    }
  }

  return {
    renderedWidth,
    renderedHeight,
    offsetX,
    offsetY,
  };
}

/**
 * Maps normalized coordinates (0..1) of a BoundingBox to absolute pixel coordinates
 * for styling an absolutely positioned View on top of the rendered image.
 *
 * Automatically bounds-checks and clamps to prevent out-of-screen overflow.
 */
export function calculateBoundingBoxPixelStyle(
  box: BoundingBox,
  container: ViewDimensions,
  image: ViewDimensions,
  resizeMode: ImageResizeMode = 'contain',
): PixelBoundingBox {
  const metrics = calculateImageRenderMetrics(container, image, resizeMode);

  // Normalize inputs safely
  const normX = Math.max(0, Math.min(1, box.x ?? 0));
  const normY = Math.max(0, Math.min(1, box.y ?? 0));
  const normW = Math.max(0, Math.min(1 - normX, box.width ?? 0));
  const normH = Math.max(0, Math.min(1 - normY, box.height ?? 0));

  const rawLeft = metrics.offsetX + normX * metrics.renderedWidth;
  const rawTop = metrics.offsetY + normY * metrics.renderedHeight;
  const rawWidth = normW * metrics.renderedWidth;
  const rawHeight = normH * metrics.renderedHeight;

  // Viewport clamping
  const left = Math.round(Math.max(0, Math.min(container.width, rawLeft)));
  const top = Math.round(Math.max(0, Math.min(container.height, rawTop)));
  const width = Math.round(Math.max(0, Math.min(container.width - left, rawWidth)));
  const height = Math.round(Math.max(0, Math.min(container.height - top, rawHeight)));

  return { left, top, width, height };
}

/**
 * Resolves a storage URL or image path to a fully qualified URL reachable
 * from React Native.
 */
export function resolveImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;

  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://')) {
    return trimmed;
  }

  const base = getBaseUrl().replace(/\/+$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}
