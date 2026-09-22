import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DetectedObject } from '../../api/types';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import {
  calculateBoundingBoxPixelStyle,
  ImageResizeMode,
  ViewDimensions,
} from '../../utils/coordinate-mapping';

export interface DetectionOverlayProps {
  detectedObjects: DetectedObject[];
  containerDimensions: ViewDimensions;
  imageDimensions: ViewDimensions;
  resizeMode?: ImageResizeMode;
  selectedObjectId?: string | null;
  onSelectObject?: (obj: DetectedObject | null) => void;
  visible?: boolean;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detectedObjects,
  containerDimensions,
  imageDimensions,
  resizeMode = 'contain',
  selectedObjectId,
  onSelectObject,
  visible = true,
}) => {
  const { t } = useTranslation();

  if (!visible || !detectedObjects || detectedObjects.length === 0) {
    return null;
  }

  // Only render if container dimensions are measured
  if (containerDimensions.width === 0 || containerDimensions.height === 0) {
    return null;
  }

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      {detectedObjects.map((obj, index) => {
        if (!obj.boundingBox) return null;

        const pixelBox = calculateBoundingBoxPixelStyle(
          obj.boundingBox,
          containerDimensions,
          imageDimensions,
          resizeMode,
        );

        // Discard invalid dimensions
        if (pixelBox.width <= 0 || pixelBox.height <= 0) return null;

        const isSelected = selectedObjectId === obj.id;
        const lookupKey = (obj.type || obj.objectType || '').toLowerCase();
        const objectKey = `objects.${lookupKey}`;
        const localizedLabel = t(objectKey);
        const displayLabel =
          localizedLabel !== objectKey ? localizedLabel : (obj.label || obj.objectType);
        const confidencePercent = Math.round((obj.confidence ?? 0) * 100);

        // Smart edge-aware vertical placement
        const isNearTopEdge = pixelBox.top < 26;
        const isSmallHeight = pixelBox.height < 45;
        const placeBelow = isNearTopEdge && isSmallHeight;

        let badgeTop: number;
        if (placeBelow) {
          badgeTop = pixelBox.top + pixelBox.height + 3;
        } else if (isNearTopEdge) {
          badgeTop = pixelBox.top + 4;
        } else {
          badgeTop = pixelBox.top - 24;
        }

        // Smart edge-aware horizontal placement
        // If box is near right edge of the container, anchor badge to the right edge of box
        const estimatedBadgeWidth = Math.max(80, displayLabel.length * 7 + 38);
        const isNearRightEdge =
          pixelBox.left + estimatedBadgeWidth > containerDimensions.width - 8;

        const horizontalStyle = isNearRightEdge
          ? {
              right: Math.max(
                4,
                containerDimensions.width - (pixelBox.left + pixelBox.width),
              ),
            }
          : {
              left: Math.max(4, pixelBox.left),
            };

        return (
          <React.Fragment key={obj.id || `detection-${index}`}>
            {/* 1. Bounding Box Frame */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onSelectObject?.(isSelected ? null : obj)}
              style={[
                styles.boundingBox,
                {
                  left: pixelBox.left,
                  top: pixelBox.top,
                  width: pixelBox.width,
                  height: pixelBox.height,
                  borderColor: isSelected ? colors.goldLight : colors.gold,
                  borderWidth: isSelected ? 2.5 : 1.5,
                  backgroundColor: isSelected
                    ? 'rgba(212, 175, 55, 0.24)'
                    : 'rgba(212, 175, 55, 0.08)',
                  zIndex: isSelected ? 20 : 10 + index,
                },
              ]}
            />

            {/* 2. Detection Tag Badge (Rendered as independent sibling so it is never constrained by box width) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onSelectObject?.(isSelected ? null : obj)}
              style={[
                styles.labelBadge,
                {
                  top: badgeTop,
                  ...horizontalStyle,
                  zIndex: isSelected ? 30 : 15 + index,
                },
                isSelected ? styles.labelBadgeSelected : styles.labelBadgeNormal,
              ]}
            >
              <Text
                style={[
                  styles.labelText,
                  isSelected ? styles.labelTextSelected : styles.labelTextNormal,
                ]}
              >
                {displayLabel}
                {confidencePercent > 0 ? ` • ${confidencePercent}%` : ''}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
  },
  boundingBox: {
    position: 'absolute',
    borderRadius: 6,
    borderStyle: 'solid',
  },
  labelBadge: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  labelBadgeNormal: {
    backgroundColor: 'rgba(11, 19, 43, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.65)',
  },
  labelBadgeSelected: {
    backgroundColor: colors.gold,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.sansMedium,
  },
  labelTextNormal: {
    color: colors.goldLight,
  },
  labelTextSelected: {
    color: colors.dark.background,
  },
});
