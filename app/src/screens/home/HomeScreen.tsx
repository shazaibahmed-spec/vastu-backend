import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { Camera, ChevronRight, Compass, Globe, LogOut, Sparkles } from 'lucide-react-native';
import { RoomType } from '../../api/types';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { LanguagePickerModal } from '../../components/common/LanguagePickerModal';
import { useTranslation } from '../../i18n/useTranslation';
import { vastuApi } from '../../api/vastu.api';
import { useAuthStore } from '../../store/auth.store';
import { useHistoryStore } from '../../store/history.store';
import { useScanStore } from '../../store/scan.store';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { VastuPrinciple } from '../../api/types';
import { FEATURES } from '../../config/features';
import { getScoreColor, ROOM_TYPE_META } from '../../utils/formatters';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { t, currentLanguageMeta, language, isMultilingualEnabled } = useTranslation();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isGuest = useAuthStore((state) => state.isGuest);
  const setRoomType = useScanStore((state) => state.setRoomType);
  const resetScan = useScanStore((state) => state.resetScan);
  const historyItems = useHistoryStore((state) => state.items);
  const fetchHistory = useHistoryStore((state) => state.fetchHistory);

  const [tipOffset, setTipOffset] = useState<number>(0);
  const [dailyPrinciple, setDailyPrinciple] = useState<VastuPrinciple | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPrinciple = async () => {
      try {
        const result = await vastuApi.getDailyPrinciple(tipOffset, language);
        if (isMounted && result) {
          setDailyPrinciple(result);
        }
      } catch (e) {
        if (isMounted) {
          setDailyPrinciple({
            id: 'ne-ishanya-clarity',
            zone: language === 'hi' ? 'ईशान कोण (उत्तर-पूर्व)' : 'North-East (Ishanya)',
            element: language === 'hi' ? 'जल तत्व (शांति व स्पष्टता)' : 'Water (Jal)',
            quote:
              language === 'hi'
                ? 'उत्तर-पूर्व दिशा जल तत्व और मानसिक स्पष्टता से संचालित होती है। इसे सदैव हल्का, स्वच्छ और भारी सामान से मुक्त रखें।'
                : 'The North-East quadrant is governed by the water element and supreme mental clarity. Keep it light, clean, and free from heavy clutter.',
            actionTip:
              language === 'hi'
                ? 'इस कोने को खुला रखें; सकारात्मक ऊर्जा के लिए यहां स्फटिक या ताजे पानी का कटोरा रखें।'
                : 'Keep this corner open and clean; place a crystal or clear water bowl to invite positive prana.',
          });
        }
      }
    };
    fetchPrinciple();
    return () => {
      isMounted = false;
    };
  }, [tipOffset, language]);

  const handleNextTip = () => {
    Vibration.vibrate(30);
    setTipOffset((prev) => prev + 1);
  };

  useEffect(() => {
    fetchHistory(1);
  }, []);

  const handleStartScan = (selectedRoom?: RoomType) => {
    resetScan();
    if (selectedRoom) {
      setRoomType(selectedRoom);
      navigation.navigate('CameraCompass');
    } else {
      navigation.navigate('RoomSelect');
    }
  };

  const roomTypes: RoomType[] = [
    'BEDROOM',
    'KITCHEN',
    'LIVING_ROOM',
    'MAIN_ENTRANCE',
    'OFFICE',
  ];

  let displayName = isGuest ? t('home.guestExplorer') : t('home.welcomeHome');
  if (isGuest) {
    displayName = t('home.guestExplorer');
  } else if (user?.name?.trim() && user.name.trim() !== 'Guest Explorer') {
    displayName = user.name.trim();
  } else if (user?.email) {
    const prefix = user.email.split('@')[0] || '';
    const namePart = prefix.split(/[._\d-]/)[0];
    if (namePart && namePart.length >= 2) {
      displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    }
  }

  const roomLabel = (type: RoomType): string => {
    switch (type) {
      case 'BEDROOM':
        return t('rooms.bedroom');
      case 'KITCHEN':
        return t('rooms.kitchen');
      case 'LIVING_ROOM':
        return t('rooms.livingRoom');
      case 'MAIN_ENTRANCE':
        return t('rooms.mainEntrance');
      case 'OFFICE':
        return t('rooms.office');
      default:
        return (ROOM_TYPE_META as Record<string, any>)[type]?.label || (type as string);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingText}>{t('home.greeting')}</Text>
            <Text style={styles.userName}>{displayName}</Text>
          </View>

          <View style={styles.headerActions}>
            {isMultilingualEnabled && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setLangModalVisible(true)}
                style={styles.langBtn}
              >
                <Globe color={colors.gold} size={15} />
                <Text style={styles.langBtnText}>
                  {currentLanguageMeta.code.toUpperCase()}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={logout}
              style={styles.logoutBtn}
            >
              <LogOut color="#94A3B8" size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Scan Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.bannerBadge}>
            <Sparkles color={colors.gold} size={14} />
            <Text style={styles.bannerBadgeText}>{t('home.heroBadge')}</Text>
          </View>

          <Text style={styles.bannerTitle}>{t('home.heroTitle')}</Text>
          <Text style={styles.bannerSubtitle}>
            {t('home.heroSubtitle')}
          </Text>

          <PrimaryButton
            title={t('common.scanRoomNow')}
            onPress={() => handleStartScan()}
            variant="primary"
            style={styles.heroBtn}
          />
        </View>

        {/* 16-Zone Live Vastu Compass Quick Tool */}
        {FEATURES.ENABLE_VASTU_COMPASS && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('VastuCompass')}
            style={styles.compassToolCard}
          >
            <View style={styles.compassToolLeft}>
              <View style={styles.compassToolIconCircle}>
                <Compass color={colors.gold} size={24} />
              </View>
              <View style={styles.compassToolTextWrap}>
                <View style={styles.compassToolBadgeRow}>
                  <Text style={styles.compassToolTitle}>16-Zone Vastu Compass</Text>
                  <View style={styles.liveSensorBadge}>
                    <View style={styles.liveSensorDot} />
                    <Text style={styles.liveSensorText}>360° LIVE</Text>
                  </View>
                </View>
                <Text style={styles.compassToolDesc}>
                  Brahmasthan alignment & real-time directional elemental analyzer
                </Text>
              </View>
            </View>
            <ChevronRight color={colors.gold} size={20} />
          </TouchableOpacity>
        )}

        {/* Quick Space Shortcuts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.selectSpace')}</Text>
          <TouchableOpacity onPress={() => handleStartScan()}>
            <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRoomsRow}
        >
          {roomTypes.map((type) => {
            const meta = ROOM_TYPE_META[type];
            return (
              <TouchableOpacity
                key={type}
                activeOpacity={0.8}
                onPress={() => handleStartScan(type)}
                style={styles.quickRoomCard}
              >
                <Text style={styles.quickRoomEmoji}>
                  {type === 'BEDROOM'
                    ? '🛏️'
                    : type === 'KITCHEN'
                    ? '🍳'
                    : type === 'LIVING_ROOM'
                    ? '🛋️'
                    : type === 'MAIN_ENTRANCE'
                    ? '🚪'
                    : '💼'}
                </Text>
                <Text style={styles.quickRoomTitle}>{roomLabel(type)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Daily Vastu Wisdom */}
        {dailyPrinciple && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNextTip}
            style={styles.tipCard}
          >
            <View style={styles.tipHeader}>
              <View style={styles.tipHeaderLeft}>
                <Compass color={colors.gold} size={18} />
                <Text style={styles.tipLabel}>{t('home.dailyPrinciple')}</Text>
              </View>
              <View style={styles.tipBadge}>
                <Text style={styles.tipBadgeText}>{dailyPrinciple.zone}</Text>
              </View>
            </View>
            <Text style={styles.tipText}>"{dailyPrinciple.quote}"</Text>
            <View style={styles.tipActionContainer}>
              <Text style={styles.tipActionText}>💡 {dailyPrinciple.actionTip}</Text>
              <Text style={styles.tipTapHint}>{t('home.nextTip')} ✦</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Recent Scans Carousel */}
        {historyItems.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('home.recentReports')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('History')}>
                <Text style={styles.viewAllText}>{t('home.history')}</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              horizontal
              data={historyItems.slice(0, 5)}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentList}
              renderItem={({ item }) => {
                const score = item.overallScore || 0;
                const scoreColor = getScoreColor(score);

                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate('HarmonyReport', { reportId: item.id })
                    }
                    style={styles.recentCard}
                  >
                    <View style={styles.recentCardHeader}>
                      <Text style={styles.recentRoomName}>{roomLabel(item.roomType)}</Text>
                      <View
                        style={[
                          styles.recentScoreBadge,
                          { backgroundColor: `${scoreColor}20` },
                        ]}
                      >
                        <Text style={[styles.recentScoreText, { color: scoreColor }]}>
                          {score}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.recentDate}>
                      {item.direction
                        ? `${t('home.facing')} ${t(`directions.${item.direction}`)}`
                        : t('common.calibrated')}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        )}
      </ScrollView>

      {/* Language Selection Modal Sheet */}
      {isMultilingualEnabled && (
        <LanguagePickerModal
          visible={langModalVisible}
          onClose={() => setLangModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  langBtnText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  greetingText: {
    fontFamily: fonts.serif,
    fontStyle: 'italic',
    color: '#94A3B8',
    fontSize: 14,
  },
  userName: {
    fontFamily: fonts.display,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBanner: {
    backgroundColor: colors.dark.surface,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
    marginBottom: 24,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  bannerBadgeText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontFamily: fonts.display,
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 30,
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  bannerSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  heroBtn: {
    marginVertical: 0,
  },
  compassToolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(19, 30, 50, 0.85)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    marginBottom: 24,
  },
  compassToolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  compassToolIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassToolTextWrap: {
    flex: 1,
  },
  compassToolBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  compassToolTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  liveSensorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  liveSensorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveSensorText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#34D399',
  },
  compassToolDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  viewAllText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '600',
  },
  quickRoomsRow: {
    paddingBottom: 20,
    gap: 10,
  },
  quickRoomCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minWidth: 110,
  },
  quickRoomEmoji: {
    fontSize: 26,
    marginBottom: 6,
  },
  quickRoomTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tipCard: {
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    marginBottom: 24,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tipHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  tipBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  tipBadgeText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '700',
  },
  tipText: {
    fontFamily: fonts.serif,
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  tipActionContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.15)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipActionText: {
    color: '#CBD5E1',
    fontSize: 11,
    flex: 1,
    marginRight: 8,
    lineHeight: 16,
  },
  tipTapHint: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '600',
  },
  recentList: {
    gap: 12,
    paddingBottom: 20,
  },
  recentCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minWidth: 160,
  },
  recentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentRoomName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  recentScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recentScoreText: {
    fontSize: 12,
    fontWeight: '800',
  },
  recentDate: {
    color: '#94A3B8',
    fontSize: 12,
  },
});
