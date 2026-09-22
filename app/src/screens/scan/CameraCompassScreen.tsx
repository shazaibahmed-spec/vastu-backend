import React, { useEffect, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import ImagePicker from 'react-native-image-crop-picker';
import { Camera, Image as ImageIcon, Sliders, X } from 'lucide-react-native';
import { CompassDirection, RoomType } from '../../api/types';
import { CompassHud } from '../../components/compass/CompassHud';
import { useCompass } from '../../hooks/useCompass';
import { useTranslation } from '../../i18n';
import { useScanStore } from '../../store/scan.store';
import { colors } from '../../theme/colors';
import { DIRECTION_INFO_MAP } from '../../utils/compass.util';

interface CameraCompassScreenProps {
  navigation: any;
}

export const CameraCompassScreen: React.FC<CameraCompassScreenProps> = ({
  navigation,
}) => {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const [showManualModal, setShowManualModal] = useState(false);

  const roomType = useScanStore((state) => state.roomType);
  const setCapturedImage = useScanStore((state) => state.setCapturedImage);
  const setHeadingAndDirection = useScanStore(
    (state) => state.setHeadingAndDirection,
  );

  const {
    heading,
    direction,
    isSensorAvailable,
    setManualHeading,
    setManualDirection,
  } = useCompass({ enabled: isFocused });

  // Cancel any active vibration when leaving the camera screen
  useEffect(() => {
    if (!isFocused) {
      try {
        Vibration.cancel();
      } catch (e) {}
    }
  }, [isFocused]);

  const handleCapture = async () => {
    try {
      Vibration.vibrate(40);
      const image = await ImagePicker.openCamera({
        mediaType: 'photo',
        cropping: false,
        compressImageMaxWidth: 1024,
        compressImageMaxHeight: 1024,
        compressImageQuality: 0.75,
        includeBase64: true,
      });

      if (image?.path) {
        setCapturedImage(image.path, image.data || undefined);
        setHeadingAndDirection(heading, direction, false);
        navigation.navigate('ReviewConfirm');
      }
    } catch (err: any) {
      if (err?.message?.includes('cannot be used') || err?.code === 'E_PICKER_NO_CAMERA') {
        // Fallback for iOS simulator
        handlePickGallery();
      }
    }
  };

  const handlePickGallery = async () => {
    try {
      Vibration.vibrate(40);
      const image = await ImagePicker.openPicker({
        mediaType: 'photo',
        cropping: false,
        compressImageMaxWidth: 1024,
        compressImageMaxHeight: 1024,
        compressImageQuality: 0.75,
        includeBase64: true,
      });

      if (image?.path) {
        setCapturedImage(image.path, image.data || undefined);
        setHeadingAndDirection(heading, direction, true);
        navigation.navigate('ReviewConfirm');
      }
    } catch (err: any) {
      if (err?.message !== 'User cancelled image selection') {
        console.warn('Gallery pick error:', err);
      }
    }
  };

  const roomLabel = (type: RoomType): string => {
    switch (type) {
      case 'BEDROOM':
        return t('rooms.masterBedroom');
      case 'KITCHEN':
        return t('rooms.kitchen');
      case 'LIVING_ROOM':
        return t('rooms.livingRoom');
      case 'MAIN_ENTRANCE':
        return t('rooms.mainEntrance');
      case 'OFFICE':
        return t('rooms.office');
      default:
        return type;
    }
  };

  const directions: CompassDirection[] = [
    'NORTH',
    'NORTH_EAST',
    'EAST',
    'SOUTH_EAST',
    'SOUTH',
    'SOUTH_WEST',
    'WEST',
    'NORTH_WEST',
  ];

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]}>
        <Text style={styles.placeholderEmoji}>📸</Text>
        <Text style={styles.placeholderTitle}>
          {roomLabel(roomType)} {t('scan.spatialScan')}
        </Text>
        <Text style={styles.placeholderSubtitle}>
          {t('scan.cameraInstruction')}
        </Text>
      </View>

      <SafeAreaView style={styles.overlayContainer}>
        {/* Top Navigation Row */}
        <View style={styles.topRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={styles.circleBtn}
          >
            <X color="#FFFFFF" size={22} />
          </TouchableOpacity>

          <View style={styles.roomBadge}>
            <Text style={styles.roomBadgeText}>{roomLabel(roomType)}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowManualModal(true)}
            style={styles.circleBtn}
          >
            <Sliders color={colors.gold} size={20} />
          </TouchableOpacity>
        </View>

        {/* Real-time Compass HUD */}
        <View style={styles.compassWrapper}>
          <CompassHud heading={heading} direction={direction} size={190} />
        </View>

        {/* Framing Guide Text */}
        <View style={styles.guideCard}>
          <Text style={styles.guideText}>
            {t('scan.facingGuide', {
              dir: t(`directions.${direction}`),
              deg: Math.round(heading),
            })}
          </Text>
        </View>

        {/* Bottom Shutter Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePickGallery}
            style={styles.galleryBtn}
          >
            <ImageIcon color="#FFFFFF" size={24} />
          </TouchableOpacity>

          {/* Golden Shutter Trigger */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCapture}
            style={styles.shutterOuter}
          >
            <View style={styles.shutterInner}>
              <Camera color="#0B132B" size={28} />
            </View>
          </TouchableOpacity>

          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>

      {/* Manual Compass Selection Modal */}
      <Modal visible={showManualModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('scan.setDirectionManually')}</Text>
              <TouchableOpacity onPress={() => setShowManualModal(false)}>
                <X color="#FFFFFF" size={22} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {t('scan.selectWallOrCamera')}
            </Text>

            <View style={styles.directionGrid}>
              {directions.map((dir) => {
                const info = DIRECTION_INFO_MAP[dir];
                const isCurrent = direction === dir;
                return (
                  <TouchableOpacity
                    key={dir}
                    activeOpacity={0.7}
                    onPress={() => {
                      setManualHeading(info.angleCenter);
                      setManualDirection(dir);
                      setShowManualModal(false);
                    }}
                    style={[
                      styles.directionOption,
                      isCurrent && styles.directionOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dirCodeText,
                        isCurrent && styles.dirCodeTextSelected,
                      ]}
                    >
                      {t(`directions.${dir}`)}
                    </Text>
                    <Text
                      style={[
                        styles.dirLabelText,
                        isCurrent && styles.dirLabelTextSelected,
                      ]}
                    >
                      {t(`directionElements.${dir}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#070C1D',
  },
  placeholderEmoji: {
    fontSize: 54,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    lineHeight: 20,
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11, 19, 43, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(11, 19, 43, 0.85)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  roomBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gold,
  },
  compassWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideCard: {
    marginHorizontal: 30,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(11, 19, 43, 0.75)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  guideText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingBottom: 25,
  },
  galleryBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(11, 19, 43, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: colors.gold,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0B132B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    marginBottom: 20,
  },
  directionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  directionOption: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  directionOptionSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
  },
  dirCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dirCodeTextSelected: {
    color: colors.gold,
  },
  dirLabelText: {
    fontSize: 9,
    color: colors.dark.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  dirLabelTextSelected: {
    color: colors.gold,
  },
});
