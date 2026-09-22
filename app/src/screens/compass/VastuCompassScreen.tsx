import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  Compass,
  Flame,
  Globe,
  HelpCircle,
  Info,
  Layers,
  RotateCcw,
  RotateCw,
  Sparkles,
  Wind,
  X,
  Zap,
} from 'lucide-react-native';
import { AppHeader } from '../../components/common/AppHeader';
import { Vastu16ZoneDial } from '../../components/compass/Vastu16ZoneDial';
import { useCompass } from '../../hooks/useCompass';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import {
  BRAHMASTHAN_DATA,
  get16ZoneByHeading,
  VASTU_16_ZONES,
  VastuZone16,
} from '../../utils/vastu-16-zones.data';

interface VastuCompassScreenProps {
  navigation: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DIAL_SIZE = Math.min(SCREEN_WIDTH - 48, 320);

export const VastuCompassScreen: React.FC<VastuCompassScreenProps> = ({
  navigation,
}) => {
  const isFocused = useIsFocused();
  const { heading, isSensorAvailable, setManualHeading } = useCompass({
    enabled: isFocused,
  });

  // Cancel any lingering vibration when navigating away
  useEffect(() => {
    if (!isFocused) {
      try {
        Vibration.cancel();
      } catch (e) {}
    }
  }, [isFocused]);

  // Mode: 'live' uses real-time device heading; 'manual' allows tapping & inspecting any zone
  const [mode, setMode] = useState<'live' | 'explorer'>('live');
  const [selectedZone, setSelectedZone] = useState<VastuZone16 | null>(null);
  const [brahmasthanModalVisible, setBrahmasthanModalVisible] = useState<boolean>(false);

  // When in live mode, active zone is derived from current heading
  const liveZone = get16ZoneByHeading(heading);
  const activeZone = mode === 'live' ? liveZone : (selectedZone || liveZone);

  // Trigger subtle haptic pulse when transitioning across zones
  const prevZoneIdRef = useRef<string | null>(null);
  const zoneScrollRef = useRef<ScrollView>(null);

  // Auto-scroll horizontal zone chips to keep active zone in view
  useEffect(() => {
    const activeIndex = VASTU_16_ZONES.findIndex((z) => z.id === activeZone.id);
    if (activeIndex >= 0) {
      zoneScrollRef.current?.scrollTo({
        x: Math.max(0, activeIndex * 58 - 120),
        animated: true,
      });
    }
  }, [activeZone.id]);

  useEffect(() => {
    if (!isFocused || AppState.currentState !== 'active') return;

    if (prevZoneIdRef.current && prevZoneIdRef.current !== activeZone.id) {
      try {
        Vibration.vibrate(10);
      } catch (e) {
        // Silently ignore
      }
    }
    prevZoneIdRef.current = activeZone.id;
  }, [activeZone.id, isFocused]);

  const handleSelectZone = (zone: VastuZone16) => {
    try {
      Vibration.vibrate(12);
    } catch (e) {}
    setSelectedZone(zone);
    setMode('explorer');
  };

  const handleModeToggle = (newMode: 'live' | 'explorer') => {
    try {
      Vibration.vibrate(15);
    } catch (e) {}
    setMode(newMode);
  };

  const handleJogHeading = (delta: number) => {
    try {
      Vibration.vibrate(12);
    } catch (e) {}
    const newH = (heading + delta + 360) % 360;
    setManualHeading(newH);
  };

  const getElementIcon = (element: string) => {
    switch (element) {
      case 'Water':
        return <Globe size={14} color="#0EA5E9" />;
      case 'Fire':
        return <Flame size={14} color="#EF4444" />;
      case 'Air':
        return <Wind size={14} color="#10B981" />;
      case 'Earth':
        return <Layers size={14} color="#D4AF37" />;
      default:
        return <Zap size={14} color="#8B5CF6" />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="16-Zone Vastu Compass"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={() => setBrahmasthanModalVisible(true)}
            activeOpacity={0.7}
          >
            <HelpCircle color={colors.gold} size={22} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode Selector Tabs */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleModeToggle('live')}
            style={[styles.modeTab, mode === 'live' && styles.modeTabActive]}
          >
            <Compass
              size={15}
              color={mode === 'live' ? colors.dark.background : colors.goldLight}
            />
            <Text
              style={[
                styles.modeTabText,
                mode === 'live' && styles.modeTabTextActive,
              ]}
            >
              360° Live Sensor
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleModeToggle('explorer')}
            style={[styles.modeTab, mode === 'explorer' && styles.modeTabActive]}
          >
            <Layers
              size={15}
              color={mode === 'explorer' ? colors.dark.background : colors.goldLight}
            />
            <Text
              style={[
                styles.modeTabText,
                mode === 'explorer' && styles.modeTabTextActive,
              ]}
            >
              Zone Explorer
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live Degree & Cardinal Readout with Nudge Joggers */}
        <View style={styles.headingBadgeCard}>
          <View style={styles.headingTopRow}>
            <TouchableOpacity
              style={styles.jogBtn}
              onPress={() => handleJogHeading(-15)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <RotateCcw size={13} color={colors.goldLight} />
              <Text style={styles.jogText}>-15°</Text>
            </TouchableOpacity>

            <View style={styles.degreePill}>
              <Text style={styles.degreeNumber}>
                {mode === 'live' ? `${Math.round(heading)}°` : `${Math.round(activeZone.angleCenter)}°`}
              </Text>
              <Text style={styles.cardinalCode}>{activeZone.code}</Text>
            </View>

            <TouchableOpacity
              style={styles.jogBtn}
              onPress={() => handleJogHeading(15)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <RotateCw size={13} color={colors.goldLight} />
              <Text style={styles.jogText}>+15°</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headingBottomRow}>
            <View style={styles.zoneNamePill}>
              <Text style={styles.zoneSanskritName} numberOfLines={1}>
                {activeZone.sanskritName}
              </Text>
              <Text style={styles.zoneCardinalName} numberOfLines={1}>
                {activeZone.cardinalName}
              </Text>
            </View>

            <View style={[styles.elementPill, { borderColor: activeZone.elementColor }]}>
              {getElementIcon(activeZone.element)}
              <Text style={[styles.elementText, { color: activeZone.elementColor }]}>
                {activeZone.element}
              </Text>
            </View>
          </View>
        </View>

        {/* 16-Zone Circular Dial */}
        <View style={styles.dialContainer}>
          <Vastu16ZoneDial
            size={DIAL_SIZE}
            heading={mode === 'live' ? heading : activeZone.angleCenter}
            activeZoneId={activeZone.id}
            onZonePress={handleSelectZone}
            onBrahmasthanPress={() => setBrahmasthanModalVisible(true)}
          />
        </View>

        {/* Sensor / Tap Guide Hint */}
        <View style={styles.sensorStatusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: mode === 'live' ? '#10B981' : colors.gold },
            ]}
          />
          <Text style={styles.sensorStatusText}>
            {mode === 'live'
              ? isSensorAvailable
                ? 'Magnetometer active • Point device towards any wall or door'
                : 'Simulator Mode • Rotate phone to align with true North'
              : 'Explorer Mode • Tap any zone below to view ancient guidelines'}
          </Text>
        </View>

        {/* Horizontal Zone Selector Pills */}
        <ScrollView
          ref={zoneScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.zonePillsRow}
        >
          {VASTU_16_ZONES.map((zone) => {
            const isSelected = activeZone.id === zone.id;
            return (
              <TouchableOpacity
                key={zone.id}
                activeOpacity={0.7}
                onPress={() => handleSelectZone(zone)}
                style={[
                  styles.zoneChip,
                  isSelected && {
                    borderColor: zone.elementColor,
                    backgroundColor: `${zone.elementColor}22`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.zoneChipText,
                    isSelected && { color: '#FFFFFF', fontWeight: '700' },
                  ]}
                >
                  {zone.code}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Active Zone Detail Card */}
        <View style={styles.zoneDetailCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardZoneTitle}>
                {activeZone.code} • {activeZone.sanskritName}
              </Text>
              <Text style={styles.cardZoneSubtitle}>
                {activeZone.cardinalName} ({activeZone.degreeStart}° – {activeZone.degreeEnd}°)
              </Text>
            </View>
            <View style={styles.deityBadge}>
              <Sparkles size={12} color={colors.gold} />
              <Text style={styles.deityText}>{activeZone.deity.split(' ')[0]}</Text>
            </View>
          </View>

          {/* Ruling Deity & Energy Attribute */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Governing Force:</Text>
            <Text style={styles.infoValue}>{activeZone.deity}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Energy Inflow:</Text>
            <Text style={styles.infoValue}>{activeZone.attributes}</Text>
          </View>

          {/* Best For (Favorable Placements) */}
          <View style={styles.recommendationBox}>
            <Text style={styles.recommendationTitle}>✓ IDEAL PLACEMENTS</Text>
            <Text style={styles.recommendationText}>{activeZone.bestFor}</Text>
          </View>

          {/* Strictly Avoid (Taboo Placements) */}
          <View style={styles.avoidBox}>
            <Text style={styles.avoidTitle}>✕ STRICTLY AVOID</Text>
            <Text style={styles.avoidText}>{activeZone.avoid}</Text>
          </View>

          {/* Remedial Wisdom Tip */}
          <View style={styles.remedyBox}>
            <View style={styles.remedyTitleRow}>
              <Sparkles size={13} color={colors.gold} />
              <Text style={styles.remedyTitle}>ANCIENT VEDIC REMEDY</Text>
            </View>
            <Text style={styles.remedyText}>{activeZone.remedyTip}</Text>
          </View>
        </View>

        {/* Brahmasthan Center Info Banner */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setBrahmasthanModalVisible(true)}
          style={styles.brahmasthanBanner}
        >
          <View style={styles.brahmasthanIconWrap}>
            <Text style={styles.brahmasthanEmoji}>🪷</Text>
          </View>
          <View style={styles.brahmasthanBannerContent}>
            <Text style={styles.brahmasthanBannerTitle}>
              Brahmasthan Alignment Guide
            </Text>
            <Text style={styles.brahmasthanBannerDesc}>
              Learn how to stand at the cosmic center of your home to survey all 16 directions.
            </Text>
          </View>
          <Info size={18} color={colors.gold} />
        </TouchableOpacity>
      </ScrollView>

      {/* Brahmasthan Tutorial Modal */}
      <Modal
        visible={brahmasthanModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBrahmasthanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Brahmasthan Audit Guide</Text>
              <TouchableOpacity
                onPress={() => setBrahmasthanModalVisible(false)}
                style={styles.closeBtn}
              >
                <X color="#94A3B8" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.stepItem}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Locate the Geometric Center</Text>
                  <Text style={styles.stepDesc}>
                    Find the central intersection of your floor plan or living area. This is the Brahmasthan (Nabhi / Solar Plexus).
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Hold Phone Flat at Chest Height</Text>
                  <Text style={styles.stepDesc}>
                    Keep the device completely level to allow the magnetometer to calibrate smoothly with Earth's magnetic flux.
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Survey Each Space</Text>
                  <Text style={styles.stepDesc}>
                    Rotate slowly towards each room, main door, and kitchen to instantly reveal which of the 16 Vastu zones it occupies.
                  </Text>
                </View>
              </View>

              <View style={styles.modalWisdomCard}>
                <Text style={styles.modalWisdomTitle}>
                  {BRAHMASTHAN_DATA.sanskritName} Rules:
                </Text>
                <Text style={styles.modalWisdomText}>
                  {BRAHMASTHAN_DATA.remedyTip}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 70,
  },
  helpBtn: {
    padding: 6,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 4,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeTabActive: {
    backgroundColor: colors.gold,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.goldLight,
  },
  modeTabTextActive: {
    color: colors.dark.background,
    fontWeight: '700',
  },
  headingBadgeCard: {
    backgroundColor: 'rgba(19, 30, 50, 0.75)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  headingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headingBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  jogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    gap: 4,
  },
  jogText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    color: colors.goldLight,
  },
  degreePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  degreeNumber: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '800',
    color: colors.goldLight,
    letterSpacing: -0.5,
  },
  cardinalCode: {
    fontFamily: fonts.sans,
    fontSize: 16,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  zoneNamePill: {
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  zoneSanskritName: {
    fontFamily: fonts.serif,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  zoneCardinalName: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  elementPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  elementText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  sensorStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sensorStatusText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  zonePillsRow: {
    gap: 8,
    paddingVertical: 6,
    marginBottom: 16,
  },
  zoneChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  zoneChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  zoneDetailCard: {
    backgroundColor: 'rgba(19, 30, 50, 0.7)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardZoneTitle: {
    fontFamily: fonts.display,
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardZoneSubtitle: {
    fontSize: 12,
    color: colors.goldLight,
    marginTop: 2,
  },
  deityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  deityText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.goldLight,
  },
  infoRow: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    color: '#E2E8F0',
    marginTop: 2,
  },
  recommendationBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  recommendationTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  avoidBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  avoidTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F87171',
    marginBottom: 4,
  },
  avoidText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  remedyBox: {
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  remedyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  remedyTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.goldLight,
  },
  remedyText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  brahmasthanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  brahmasthanIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brahmasthanEmoji: {
    fontSize: 20,
  },
  brahmasthanBannerContent: {
    flex: 1,
  },
  brahmasthanBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  brahmasthanBannerDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark.background,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 17,
  },
  modalWisdomCard: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  modalWisdomTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.goldLight,
    marginBottom: 4,
  },
  modalWisdomText: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
  },
});
