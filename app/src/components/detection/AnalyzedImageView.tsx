import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Eye, EyeOff, Layers, Scan, AlertCircle } from 'lucide-react-native';
import { DetectedObject } from '../../api/types';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import {
  ImageResizeMode,
  resolveImageUrl,
  ViewDimensions,
} from '../../utils/coordinate-mapping';
import { DetectionOverlay } from './DetectionOverlay';

export interface AnalyzedImageViewProps {
  imageUrl?: string | null;
  detectedObjects?: DetectedObject[];
  initialImageWidth?: number;
  initialImageHeight?: number;
  resizeMode?: ImageResizeMode;
  aspectRatio?: number;
}

export const AnalyzedImageView: React.FC<AnalyzedImageViewProps> = ({
  imageUrl,
  detectedObjects = [],
  initialImageWidth = 800,
  initialImageHeight = 600,
  resizeMode = 'contain',
  aspectRatio = 4 / 3,
}) => {
  const { t } = useTranslation();
  const [showBoxes, setShowBoxes] = useState(true);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const [containerDimensions, setContainerDimensions] = useState<ViewDimensions>({
    width: 0,
    height: 0,
  });

  const [imageDimensions, setImageDimensions] = useState<ViewDimensions>({
    width: initialImageWidth,
    height: initialImageHeight,
  });

  const resolvedUrl = resolveImageUrl(imageUrl);

  // Fetch actual natural image dimensions dynamically if available
  useEffect(() => {
    if (!resolvedUrl) return;

    Image.getSize(
      resolvedUrl,
      (width, height) => {
        if (width > 0 && height > 0) {
          setImageDimensions({ width, height });
        }
      },
      (error) => {
        // Silently fallback to initial dimensions if getSize fails
        console.log('[AnalyzedImageView] Could not get image size:', error);
      },
    );
  }, [resolvedUrl]);

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerDimensions({ width, height });
    }
  };

  const hasObjects = detectedObjects && detectedObjects.length > 0;
  const objectsWithBoxes = detectedObjects.filter((o) => !!o.boundingBox);

  if (!resolvedUrl || imageError) {
    return null;
  }

  return (
    <View style={styles.cardContainer}>
      {/* Header with Title and Toggle */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.badgeIcon}>
            <Scan color={colors.gold} size={16} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{t('overlay.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {hasObjects
                ? `${objectsWithBoxes.length} ${t('overlay.objectsIdentified')}`
                : t('overlay.noObjectsIdentified')}
            </Text>
          </View>
        </View>

        {hasObjects && (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setShowBoxes(!showBoxes)}
            style={[styles.toggleBtn, showBoxes && styles.toggleBtnActive]}
          >
            {showBoxes ? (
              <Eye size={15} color={colors.goldLight} />
            ) : (
              <EyeOff size={15} color={colors.dark.textMuted} />
            )}
            <Text
              style={[
                styles.toggleBtnText,
                showBoxes ? styles.toggleBtnTextActive : styles.toggleBtnTextInactive,
              ]}
            >
              {showBoxes ? t('overlay.hideBoxes') : t('overlay.showBoxes')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Image Frame with Detection Overlay */}
      <View
        style={[styles.imageFrame, { aspectRatio }]}
        onLayout={handleContainerLayout}
      >
        {imageLoading && (
          <View style={styles.loadingPlaceholder}>
            <ActivityIndicator size="small" color={colors.gold} />
          </View>
        )}

        <Image
          source={{ uri: resolvedUrl }}
          style={styles.image}
          resizeMode={resizeMode}
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
          onError={() => {
            setImageLoading(false);
            setImageError(true);
          }}
        />

        {/* Bounding Box Overlay */}
        <DetectionOverlay
          detectedObjects={objectsWithBoxes}
          containerDimensions={containerDimensions}
          imageDimensions={imageDimensions}
          resizeMode={resizeMode}
          selectedObjectId={selectedObjectId}
          onSelectObject={(obj) => setSelectedObjectId(obj ? obj.id : null)}
          visible={showBoxes}
        />

        {/* Empty State Banner (if no spatial objects identified) */}
        {!hasObjects && !imageLoading && (
          <View style={styles.emptyStateContainer}>
            <AlertCircle size={16} color={colors.gold} />
            <Text style={styles.emptyStateText}>{t('overlay.noObjects')}</Text>
          </View>
        )}
      </View>

      {/* Interactive Object Pills Carousel */}
      {hasObjects && (
        <View style={styles.pillsSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsScrollContainer}
          >
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setSelectedObjectId(null)}
              style={[
                styles.pillItem,
                selectedObjectId === null && styles.pillItemActive,
              ]}
            >
              <Layers
                size={13}
                color={selectedObjectId === null ? colors.dark.background : colors.goldLight}
              />
              <Text
                style={[
                  styles.pillText,
                  selectedObjectId === null && styles.pillTextActive,
                ]}
              >
                {t('overlay.all')} ({objectsWithBoxes.length})
              </Text>
            </TouchableOpacity>

            {objectsWithBoxes.map((obj) => {
              const isSelected = selectedObjectId === obj.id;
              const lookupKey = (obj.type || obj.objectType || '').toLowerCase();
              const objectKey = `objects.${lookupKey}`;
              const localizedLabel = t(objectKey);
              const displayLabel = localizedLabel !== objectKey ? localizedLabel : (obj.label || obj.objectType);
              const confidencePercent = Math.round((obj.confidence ?? 0) * 100);

              return (
                <TouchableOpacity
                  key={obj.id}
                  activeOpacity={0.75}
                  onPress={() => setSelectedObjectId(isSelected ? null : obj.id)}
                  style={[styles.pillItem, isSelected && styles.pillItemActive]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      isSelected && styles.pillTextActive,
                    ]}
                  >
                    {displayLabel}
                    {confidencePercent > 0 ? ` ${confidencePercent}%` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.dark.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.dark.borderLight,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  badgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.sansMedium,
    color: colors.dark.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: fonts.sans,
    color: colors.dark.textSecondary,
    marginTop: 1,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: fonts.sansMedium,
  },
  toggleBtnTextActive: {
    color: colors.goldLight,
  },
  toggleBtnTextInactive: {
    color: colors.dark.textMuted,
  },
  imageFrame: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#050A14',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingPlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emptyStateContainer: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(11, 19, 43, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  emptyStateText: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: fonts.sansMedium,
  },
  pillsSection: {
    marginTop: 12,
  },
  pillsScrollContainer: {
    gap: 8,
    paddingVertical: 2,
  },
  pillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pillItemActive: {
    backgroundColor: colors.gold,
    borderColor: colors.goldLight,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.sansMedium,
    color: colors.dark.textSecondary,
  },
  pillTextActive: {
    color: colors.dark.background,
    fontWeight: '700',
  },
});
