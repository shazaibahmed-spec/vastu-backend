import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Circle,
  RotateCcw,
} from 'lucide-react-native';
import { analysisApi } from '../../api/analysis.api';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { useScanStore } from '../../store/scan.store';
import { useTranslation } from '../../i18n/useTranslation';
import { colors } from '../../theme/colors';

interface ProcessingScreenProps {
  navigation: any;
}

const formatErrorMessage = (msg: any): string => {
  if (!msg) return 'An unexpected error occurred. Please try again.';
  const str = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);

  if (
    str.includes('invalid_value') ||
    str.includes('roomTypeDetected') ||
    str.includes('expected one of')
  ) {
    return 'The AI vision response format had a temporary schema mismatch. The backend has been updated to auto-normalize this—please retry.';
  }
  if (str.includes('resolution too low') || str.includes('320x240')) {
    return 'Image resolution too low. Please upload a clear photo of at least 160x120 pixels.';
  }
  if (str.includes('Network Error') || str.includes('ECONNREFUSED')) {
    return 'Could not connect to the backend server. Please verify your local server is running on port 3001.';
  }
  if (str.length > 200) {
    return str.slice(0, 200) + '...';
  }
  return str;
};

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
  navigation,
}) => {
  const { t, language } = useTranslation();
  const roomType = useScanStore((state) => state.roomType);
  const imageUri = useScanStore((state) => state.imageUri);
  const heading = useScanStore((state) => state.heading);
  const direction = useScanStore((state) => state.direction);
  const directionSource = useScanStore((state) => state.directionSource);
  const notes = useScanStore((state) => state.notes);
  const setNotes = useScanStore((state) => state.setNotes);
  const setCurrentReport = useScanStore((state) => state.setCurrentReport);

  const [activeStep, setActiveStep] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);

  const steps = [
    { title: t('scan.securingPhoto'), desc: t('scan.step1Desc') },
    { title: t('scan.visionDetection'), desc: t('scan.step2Desc') },
    { title: t('scan.ruleEvaluation'), desc: t('scan.step3Desc') },
    { title: t('scan.reportSynthesis'), desc: t('scan.step4Desc') },
  ];

  useEffect(() => {
    let timer1: any;
    let timer2: any;
    let timer3: any;

    const runPipeline = async () => {
      setErrorMsg(null);
      setActiveStep(0);

      // Step progression simulation while HTTP request processes
      timer1 = setTimeout(() => setActiveStep(1), 300);
      timer2 = setTimeout(() => setActiveStep(2), 700);
      timer3 = setTimeout(() => setActiveStep(3), 1100);

      try {
        const report = await analysisApi.createAnalysis({
          imageUri: imageUri || undefined,
          roomType,
          directionSource,
          compassHeading: heading !== null ? heading : undefined,
          userSelectedDirection:
            directionSource === 'USER_SELECTED'
              ? direction || 'SOUTH'
              : undefined,
          notes: notes || undefined,
          language,
        });

        Vibration.vibrate(60);
        setCurrentReport(report);
        setNotes('');
        navigation.replace('HarmonyReport', {
          reportId: report.id,
          fromScan: true,
        });
      } catch (err: any) {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        console.warn('Analysis execution error:', err);
        Vibration.vibrate([0, 80, 50, 80]);
        const message =
          err.response?.data?.message ||
          err.message ||
          'Failed to complete analysis. Please ensure backend server is running.';
        setErrorMsg(formatErrorMessage(message));
      }
    };

    runPipeline();

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [retryKey]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar when in error state for easy escape */}
      {errorMsg && (
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <ChevronLeft color="#FFFFFF" size={20} />
            <Text style={styles.backBtnText}>Back to Review</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          {errorMsg ? (
            <AlertCircle
              color={colors.defect}
              size={48}
              style={styles.spinner}
            />
          ) : (
            <ActivityIndicator
              size="large"
              color={colors.gold}
              style={styles.spinner}
            />
          )}
          <Text style={styles.title}>
            {errorMsg ? t('scan.analysisNotice') : t('scan.analyzingSpace')}
          </Text>
          <Text style={styles.subtitle}>
            {errorMsg
              ? 'Processing was interrupted. Please review the notice below.'
              : t('scan.analyzingPipeline')}
          </Text>
        </View>

        {/* Multi-Step Transition Cards */}
        <View style={styles.stepsCard}>
          {steps.map((step, idx) => {
            const isDone = activeStep > idx && !errorMsg;
            const isCurrent = activeStep === idx;

            return (
              <View key={idx} style={styles.stepRow}>
                <View style={styles.stepIconCol}>
                  {isDone ? (
                    <CheckCircle2 color={colors.compliant} size={22} />
                  ) : isCurrent ? (
                    errorMsg ? (
                      <AlertCircle color={colors.defect} size={22} />
                    ) : (
                      <ActivityIndicator size="small" color={colors.gold} />
                    )
                  ) : (
                    <Circle color="#475569" size={20} />
                  )}
                  {idx < steps.length - 1 && <View style={styles.stepLine} />}
                </View>

                <View style={styles.stepContent}>
                  <Text
                    style={[
                      styles.stepTitle,
                      isCurrent &&
                        (errorMsg
                          ? styles.stepTitleError
                          : styles.stepTitleCurrent),
                      isDone && styles.stepTitleDone,
                    ]}
                  >
                    {step.title}
                  </Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {errorMsg ? (
          <View style={styles.errorCard}>
            <View style={styles.errorHeaderRow}>
              <AlertCircle color={colors.defect} size={18} />
              <Text style={styles.errorTitle}>{t('scan.analysisNotice')}</Text>
            </View>
            <Text style={styles.errorText}>{errorMsg}</Text>

            <View style={styles.errorBtnGroup}>
              <PrimaryButton
                title="Try Again"
                onPress={() => setRetryKey((k) => k + 1)}
                variant="primary"
                style={styles.retryBtn}
              />
              <PrimaryButton
                title={t('scan.returnToReview')}
                onPress={() => navigation.goBack()}
                variant="secondary"
              />
            </View>
          </View>
        ) : (
          <View style={styles.quoteCard}>
            <Text style={styles.quoteText}>"{t('scan.processingQuote')}"</Text>
          </View>
        )}
      </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 60,
  },
  headerBlock: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  spinner: {
    marginBottom: 16,
    transform: [{ scale: 1.2 }],
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  stepsCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepIconCol: {
    alignItems: 'center',
    width: 28,
    marginRight: 14,
  },
  stepLine: {
    width: 2,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 4,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  stepTitleCurrent: {
    color: colors.gold,
    fontWeight: '700',
  },
  stepTitleError: {
    color: colors.defect,
    fontWeight: '700',
  },
  stepTitleDone: {
    color: '#E2E8F0',
    fontWeight: '600',
  },
  stepDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    marginBottom: 20,
  },
  errorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  errorTitle: {
    color: colors.defect,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  errorBtnGroup: {
    gap: 10,
  },
  retryBtn: {
    backgroundColor: colors.gold,
  },
  quoteCard: {
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  quoteText: {
    color: colors.goldLight,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
});
