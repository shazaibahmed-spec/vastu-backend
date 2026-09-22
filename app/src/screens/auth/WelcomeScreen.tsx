import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Globe } from 'lucide-react-native';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { LanguagePickerModal } from '../../components/common/LanguagePickerModal';
import { useAuthStore } from '../../store/auth.store';
import { useTranslation } from '../../i18n/useTranslation';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

interface WelcomeScreenProps {
  navigation: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { t, currentLanguageMeta, isMultilingualEnabled } = useTranslation();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);

  const handleGuest = () => {
    continueAsGuest();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar with Language Selector */}
      {isMultilingualEnabled && (
        <View style={styles.topBar}>
          <View />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setLangModalVisible(true)}
            style={styles.langBtn}
          >
            <Globe size={16} color={colors.gold} />
            <Text style={styles.langBtnText}>{currentLanguageMeta.nativeName}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.container}>
        {/* Sacred Geometry / Logo Icon */}
        <View style={styles.heroSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🪷</Text>
          </View>
          <Text style={styles.brandTitle}>VASTU AI</Text>
          <Text style={styles.brandSubtitle}>
            {t('welcome.subtitle')}
          </Text>
        </View>

        {/* Value Proposition Points */}
        <View style={styles.featuresCard}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📐</Text>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>{t('welcome.feat1Title')}</Text>
              <Text style={styles.featureDesc}>
                {t('welcome.feat1Desc')}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🧭</Text>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>{t('welcome.feat2Title')}</Text>
              <Text style={styles.featureDesc}>
                {t('welcome.feat2Desc')}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🌿</Text>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>{t('welcome.feat3Title')}</Text>
              <Text style={styles.featureDesc}>
                {t('welcome.feat3Desc')}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <PrimaryButton
            title={t('auth.continueAsGuest')}
            onPress={handleGuest}
            variant="primary"
          />
          <PrimaryButton
            title={t('auth.signIn')}
            onPress={() => navigation.navigate('Login')}
            variant="secondary"
          />
        </View>
      </View>

      {/* Language Picker Modal */}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  langBtnText: {
    color: colors.goldLight,
    fontSize: 13,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 44,
  },
  brandTitle: {
    fontFamily: fonts.display,
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 2.5,
  },
  brandSubtitle: {
    fontFamily: fonts.serif,
    fontStyle: 'italic',
    color: colors.goldLight,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.4,
  },
  featuresCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 10,
  },
  featureIcon: {
    fontSize: 22,
    marginRight: 14,
    marginTop: 2,
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    marginBottom: 10,
  },
});
