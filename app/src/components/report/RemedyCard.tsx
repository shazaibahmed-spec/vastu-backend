import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Finding } from '../../api/types';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { getSeverityColor, getVerdictBadge } from '../../utils/formatters';

interface RemedyCardProps {
  finding: Finding;
}

const cleanFindingText = (text: string | undefined, lang: string): string => {
  if (!text) return '';
  if (lang !== 'hi') return text;

  return text
    .replace(/NORTH_EAST/gi, 'ईशान (उत्तर-पूर्व)')
    .replace(/NORTH_WEST/gi, 'वायव्य (उत्तर-पश्चिम)')
    .replace(/SOUTH_EAST/gi, 'आग्नेय (दक्षिण-पूर्व)')
    .replace(/SOUTH_WEST/gi, 'नैऋत्य (दक्षिण-पश्चिम)')
    .replace(/\bNORTH\b/g, 'उत्तर')
    .replace(/\bSOUTH\b/g, 'दक्षिण')
    .replace(/\bEAST\b/g, 'पूर्व')
    .replace(/\bWEST\b/g, 'पश्चिम')
    .replace(/\bbed\b/gi, 'बिस्तर')
    .replace(/\bmirror\b/gi, 'दर्पण')
    .replace(/\bstove\b/gi, 'चूल्हा')
    .replace(/\bsink\b/gi, 'सिंक')
    .replace(/\bdoor\b/gi, 'द्वार')
    .replace(/\bwindow\b/gi, 'खिड़की')
    .replace(/\bwardrobe\b/gi, 'अलमारी');
};

export const RemedyCard: React.FC<RemedyCardProps> = ({ finding }) => {
  const { t, language } = useTranslation();
  const verdictBadge = getVerdictBadge(finding.verdict);
  const severityColor = getSeverityColor(finding.severity);

  const displayTitle = cleanFindingText(finding.title, language);
  const displayDesc = cleanFindingText(finding.description, language);
  const isDuplicate =
    !displayDesc ||
    displayDesc.trim().replace(/[\.।]+$/, '') ===
      displayTitle.trim().replace(/[\.।]+$/, '');

  const getVerdictText = () => {
    switch (finding.verdict) {
      case 'COMPLIANT':
        return t('report.auspicious');
      case 'DEFECT':
        return t('report.defect');
      case 'NEUTRAL':
        return t('report.neutral');
      default:
        return verdictBadge.label;
    }
  };

  return (
    <View style={styles.card}>
      {/* Top Header: Verdict badge + Severity indicator */}
      <View style={styles.header}>
        <View style={[styles.verdictTag, { backgroundColor: verdictBadge.bg }]}>
          <Text style={[styles.verdictText, { color: verdictBadge.color }]}>
            {getVerdictText()}
          </Text>
        </View>

        {finding.verdict === 'DEFECT' && (
          <View style={[styles.severityTag, { borderColor: severityColor }]}>
            <Text style={[styles.severityText, { color: severityColor }]}>
              {t(`severity.${finding.severity.toLowerCase()}`)}
            </Text>
          </View>
        )}
      </View>

      {/* Title & Description */}
      <Text style={styles.title}>{displayTitle}</Text>
      {!isDuplicate && (
        <Text style={styles.description}>{displayDesc}</Text>
      )}

      {/* Actionable Remedies list */}
      {finding.remedies && finding.remedies.length > 0 && (
        <View style={styles.remediesContainer}>
          <Text style={styles.remediesHeader}>{t('report.actionableRemedies')}:</Text>
          {finding.remedies.map((remedy, idx) => (
            <View key={idx} style={styles.remedyItem}>
              <View style={styles.remedyTypeBadge}>
                <Text style={styles.remedyTypeText}>
                  {t(`remedyType.${remedy.type.toLowerCase()}`)}
                </Text>
              </View>
              <Text style={styles.remedyActionText}>{remedy.action}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  verdictTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verdictText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  severityTag: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 20,
  },
  description: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  remediesContainer: {
    backgroundColor: 'rgba(11, 19, 43, 0.6)',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  remediesHeader: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  remedyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 3,
  },
  remedyTypeBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
    marginTop: 1,
  },
  remedyTypeText: {
    color: colors.gold,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  remedyActionText: {
    color: '#E2E8F0',
    fontSize: 13,
    flex: 1,
    lineHeight: 17,
  },
});
