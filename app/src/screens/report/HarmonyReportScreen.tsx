import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CheckCircle2,
  Compass,
  Download,
  FileText,
  Share2,
  Sparkles,
} from 'lucide-react-native';
import { analysisApi } from '../../api/analysis.api';
import { reportsApi } from '../../api/reports.api';
import { AnalysisReport } from '../../api/types';
import { AppHeader } from '../../components/common/AppHeader';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { ElementalBalanceWidget } from '../../components/report/ElementalBalanceWidget';
import { RemedyCard } from '../../components/report/RemedyCard';
import { ScoreGauge } from '../../components/report/ScoreGauge';
import { AnalyzedImageView } from '../../components/detection';
import { useTranslation } from '../../i18n';
import { useScanStore } from '../../store/scan.store';
import { FEATURES } from '../../config/features';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

interface HarmonyReportScreenProps {
  route: any;
  navigation: any;
}

const cleanSummaryText = (text: string | undefined, lang: string): string => {
  if (!text) return '';
  if (lang !== 'hi') return text;
  return text
    .replace(/\bbedroom\b/gi, 'शयनकक्ष')
    .replace(/\bkitchen\b/gi, 'रसोई')
    .replace(/\bliving room\b/gi, 'बैठक कक्ष')
    .replace(/\bmain entrance\b/gi, 'मुख्य द्वार')
    .replace(/\boffice\b/gi, 'कार्यालय');
};

export const HarmonyReportScreen: React.FC<HarmonyReportScreenProps> = ({
  route,
  navigation,
}) => {
  const { t, language } = useTranslation();
  const currentReportFromStore = useScanStore((state) => state.currentReport);
  const resetScan = useScanStore((state) => state.resetScan);
  const reportId = route.params?.reportId;

  const roomLabel = (type: string): string => {
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

  const [report, setReport] = useState<AnalysisReport | null>(
    currentReportFromStore?.id === reportId ? currentReportFromStore : null,
  );
  const [loading, setLoading] = useState<boolean>(!report);

  useEffect(() => {
    const targetId = reportId || report?.id;
    if (!targetId) return;

    // Fetch if no report or if report language differs from selected language
    if (!report || report.language !== language) {
      const fetchReport = async () => {
        try {
          setLoading(true);
          const res = await analysisApi.getAnalysisById(targetId, language);
          setReport(res);
        } catch (err) {
          console.warn('Failed to load report:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchReport();
    }
  }, [reportId, language]);

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!report?.id) return;
    try {
      setDownloadingPdf(true);
      const pdfUrl = reportsApi.getPdfUrl(report.id);
      const canOpen = await Linking.canOpenURL(pdfUrl);
      if (canOpen) {
        await Linking.openURL(pdfUrl);
      } else {
        await Share.share({
          url: pdfUrl,
          message: `🪷 Vastu Harmony Certificate for my ${roomLabel(report.roomType)} (Score: ${report.overallScore}/100): ${pdfUrl}`,
        });
      }
    } catch (err) {
      console.warn('PDF download error:', err);
      try {
        const pdfUrl = reportsApi.getPdfUrl(report.id);
        await Share.share({
          url: pdfUrl,
          message: `🪷 Vastu Harmony Certificate: ${pdfUrl}`,
        });
      } catch (e) {
        // ignore
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleShare = async () => {
    if (!report) return;
    const pdfUrl = reportsApi.getPdfUrl(report.id);
    try {
      await Share.share({
        url: pdfUrl,
        message: `🪷 Vastu Harmony Report for my ${roomLabel(report.roomType)}: Overall Score ${report.overallScore}/100 (${report.scoreBand}).\nDownload official certificate: ${pdfUrl}`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const fromScan = Boolean(route.params?.fromScan);

  const handleBack = () => {
    if (fromScan) {
      resetScan();
      navigation.navigate('Home');
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const handleScanAnother = () => {
    resetScan();
    navigation.navigate('RoomSelect');
  };

  if (loading || !report) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title={t('report.title')} onBack={handleBack} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>{t('report.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const score = report.overallScore || 0;
  const compliantCount = report.findings.filter((f) => f.verdict === 'COMPLIANT').length;
  const defectCount = report.findings.filter((f) => f.verdict === 'DEFECT').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={`${roomLabel(report.roomType)} ${t('report.title')}`}
        subtitle={t('report.subtitle')}
        onBack={handleBack}
        rightAction={
          FEATURES.ENABLE_REPORT_EXPORT_SHARE ? (
            <TouchableOpacity activeOpacity={0.7} onPress={handleShare} style={styles.iconBtn}>
              <Share2 color="#FFFFFF" size={20} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Hero Score Card */}
        <View style={styles.scoreHeroCard}>
          <ScoreGauge score={score} scoreBand={report.scoreBand} size={180} />

          {/* Orientation Pill */}
          {(() => {
            const fallbackHeading =
              report.orientation.direction === 'NORTH'
                ? 0
                : report.orientation.direction === 'EAST'
                ? 90
                : report.orientation.direction === 'SOUTH'
                ? 180
                : report.orientation.direction === 'WEST'
                ? 270
                : 0;
            const displayHeading = Math.round(report.orientation.heading ?? fallbackHeading);
            return (
              <View style={styles.orientationPill}>
                <Compass color={colors.gold} size={16} />
                <Text style={styles.orientationText}>
                  {t('home.facing')} {report.orientation.direction ? t(`directions.${report.orientation.direction}`) : ''} ({displayHeading}°)
                </Text>
              </View>
            );
          })()}

          {/* Quick Metrics Bar */}
          <View style={styles.metricsBar}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{compliantCount}</Text>
              <Text style={styles.metricLabel}>{t('report.auspicious')}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: defectCount > 0 ? colors.defect : colors.compliant }]}>
                {defectCount}
              </Text>
              <Text style={styles.metricLabel}>{t('report.defect')}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{report.detectedObjects.length}</Text>
              <Text style={styles.metricLabel}>{t('report.objectsDetected')}</Text>
            </View>
          </View>
        </View>

        {/* Visual Spatial Detection Overlay */}
        {report.image?.url && (
          <AnalyzedImageView
            imageUrl={report.image.url}
            detectedObjects={report.detectedObjects}
            initialImageWidth={report.image.width || 800}
            initialImageHeight={report.image.height || 600}
            resizeMode="contain"
          />
        )}

        {/* AI Empathetic Summary */}
        {report.aiSummary && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Sparkles color={colors.gold} size={16} />
              <Text style={styles.summaryTitle}>{t('report.summaryReading')}</Text>
            </View>
            <Text style={styles.summaryText}>{cleanSummaryText(report.aiSummary, language)}</Text>
          </View>
        )}

        {/* Pancha Bhoota Elements Balance */}
        <ElementalBalanceWidget balance={report.elementalBalance} />

        {/* Detected Objects Section */}
        {report.detectedObjects.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('report.detectedItems')}</Text>
            <View style={styles.objectsList}>
              {report.detectedObjects.map((obj) => {
                const objectKey = `objects.${obj.objectType.toLowerCase()}`;
                const localizedLabel = t(objectKey);
                const displayLabel = localizedLabel !== objectKey ? localizedLabel : obj.label;

                return (
                  <View key={obj.id} style={styles.objectItem}>
                    <View style={styles.objectLeft}>
                      <CheckCircle2 color={colors.compliant} size={16} />
                      <Text style={styles.objectLabel}>{displayLabel}</Text>
                    </View>
                    <View style={styles.objectZoneBadge}>
                      <Text style={styles.objectZoneText}>{t(`directions.${obj.zone}`)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Detailed Findings & Remedies */}
        <View style={styles.findingsSection}>
          <Text style={styles.sectionTitle}>{t('report.observationsAndRemedies')}</Text>
          {report.findings.length > 0 ? (
            report.findings.map((finding) => (
              <RemedyCard key={finding.id} finding={finding} />
            ))
          ) : (
            <View style={styles.emptyFindingsCard}>
              <CheckCircle2 color={colors.compliant} size={22} />
              <View style={styles.emptyFindingsContent}>
                <Text style={styles.emptyFindingsTitle}>All Fixtures in Harmony</Text>
                <Text style={styles.emptyFindingsText}>
                  No directional defects or conflicts were identified for this space. The layout maintains positive baseline alignment.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* PDF Certificate Export Card */}
        {FEATURES.ENABLE_REPORT_EXPORT_SHARE && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleDownloadPdf}
            disabled={downloadingPdf}
            style={styles.pdfExportCard}
          >
            <View style={styles.pdfIconWrap}>
              <FileText color={colors.gold} size={22} />
            </View>
            <View style={styles.pdfTextWrap}>
              <Text style={styles.pdfTitle}>Export Vastu Certificate (PDF)</Text>
              <Text style={styles.pdfSubtitle}>
                Download branded spatial audit with score, 5-element breakdown & remedies
              </Text>
            </View>
            {downloadingPdf ? (
              <ActivityIndicator size="small" color={colors.gold} />
            ) : (
              <Download color={colors.gold} size={20} />
            )}
          </TouchableOpacity>
        )}

        {/* Bottom Actions */}
        <View style={styles.actionsBlock}>
          <PrimaryButton
            title={t('report.scanAnother')}
            onPress={handleScanAnother}
            variant="primary"
          />
          <PrimaryButton
            title={t('report.viewHistory')}
            onPress={() => navigation.navigate('History')}
            variant="secondary"
          />
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 70,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreHeroCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    marginBottom: 16,
  },
  orientationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  orientationText: {
    color: colors.goldLight,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  metricsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontFamily: fonts.display,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryCard: {
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryTitle: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.4,
  },
  summaryText: {
    fontFamily: fonts.serif,
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  sectionCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  objectsList: {
    gap: 8,
  },
  objectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  objectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  objectLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  objectZoneBadge: {
    backgroundColor: 'rgba(11, 19, 43, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  objectZoneText: {
    color: colors.goldLight,
    fontSize: 11,
    fontWeight: '700',
  },
  findingsSection: {
    marginBottom: 20,
  },
  pdfExportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 30, 50, 0.9)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    marginBottom: 20,
    gap: 12,
  },
  pdfIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfTextWrap: {
    flex: 1,
  },
  pdfTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  pdfSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  actionsBlock: {
    marginTop: 10,
    gap: 6,
  },
  emptyFindingsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    gap: 12,
  },
  emptyFindingsContent: {
    flex: 1,
  },
  emptyFindingsTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '700',
    color: colors.compliant,
    marginBottom: 4,
  },
  emptyFindingsText: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 18,
  },
});
