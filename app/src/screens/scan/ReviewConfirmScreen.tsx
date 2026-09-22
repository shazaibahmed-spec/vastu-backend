import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Compass } from 'lucide-react-native';
import { RoomType } from '../../api/types';
import { AppHeader } from '../../components/common/AppHeader';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { useTranslation } from '../../i18n';
import { useScanStore } from '../../store/scan.store';
import { colors } from '../../theme/colors';

interface ReviewConfirmScreenProps {
  navigation: any;
}

export const ReviewConfirmScreen: React.FC<ReviewConfirmScreenProps> = ({
  navigation,
}) => {
  const { t } = useTranslation();
  const roomType = useScanStore((state) => state.roomType);
  const imageUri = useScanStore((state) => state.imageUri);
  const heading = useScanStore((state) => state.heading);
  const direction = useScanStore((state) => state.direction) || 'SOUTH';
  const notes = useScanStore((state) => state.notes);
  const setNotes = useScanStore((state) => state.setNotes);

  const [localNotes, setLocalNotes] = useState(notes);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

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

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleStartAnalysis = () => {
    setNotes(localNotes);
    navigation.navigate('Processing');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={t('scan.confirmDetailsTitle')}
        subtitle={t('scan.confirmDetailsSubtitle')}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 50 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={true}
      >
        {/* Photo Preview Card */}
        <View style={styles.photoContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.fallbackPreview}>
              <Text style={styles.fallbackEmoji}>📸</Text>
              <Text style={styles.fallbackText}>{t('scan.readyToAnalyzeLayout')}</Text>
            </View>
          )}

          <View style={styles.photoOverlayBadge}>
            <Text style={styles.photoBadgeText}>{roomLabel(roomType)}</Text>
          </View>
        </View>

        {/* Orientation & Zone Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Compass color={colors.gold} size={20} />
            <Text style={styles.cardTitle}>{t('scan.directionalOrientation')}</Text>
          </View>

          <View style={styles.directionHighlightRow}>
            <View>
              <Text style={styles.dirLabel}>{t(`directions.${direction}`)}</Text>
              <Text style={styles.headingLabel}>
                {t('scan.headingFromNorth', { deg: Math.round(heading || 0) })}
              </Text>
            </View>
            <View style={styles.elementBadge}>
              <Text style={styles.elementText}>{t(`directionElements.${direction}`)}</Text>
            </View>
          </View>

          <Text style={styles.dirDescription}>
            {t(`directionDescriptions.${direction}`)}
          </Text>
        </View>

        {/* Notes Input */}
        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>{t('scan.contextNotes')}</Text>
          <TextInput
            style={styles.notesInput}
            value={localNotes}
            onChangeText={setLocalNotes}
            placeholder={t('scan.notesPlaceholder')}
            placeholderTextColor="#64748B"
            maxLength={200}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 120);
            }}
          />
        </View>

        {/* Submit Button */}
        <PrimaryButton
          title={t('scan.analyzeRoomBtn')}
          onPress={handleStartAnalysis}
          variant="primary"
          style={styles.submitBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 50,
  },
  photoContainer: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.dark.surface,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  fallbackPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.surface,
  },
  fallbackEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  fallbackText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  photoOverlayBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(11, 19, 43, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  photoBadgeText: {
    color: colors.goldLight,
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  directionHighlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  dirLabel: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headingLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  elementBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  elementText: {
    color: colors.goldLight,
    fontSize: 12,
    fontWeight: '700',
  },
  dirDescription: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  notesCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  notesLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: 'rgba(11, 19, 43, 0.8)',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  submitBtn: {
    marginBottom: 10,
  },
});
