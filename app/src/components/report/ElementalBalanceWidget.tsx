import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ElementalBalance } from '../../api/types';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';

interface ElementalBalanceProps {
  balance?: ElementalBalance;
}

export const ElementalBalanceWidget: React.FC<ElementalBalanceProps> = ({
  balance,
}) => {
  const { t } = useTranslation();
  if (!balance) return null;

  const elements = [
    { key: 'earth', name: t('elements.earth'), value: balance.earth, color: colors.earth, symbol: '⛰️' },
    { key: 'water', name: t('elements.water'), value: balance.water, color: colors.water, symbol: '💧' },
    { key: 'fire', name: t('elements.fire'), value: balance.fire, color: colors.fire, symbol: '🔥' },
    { key: 'air', name: t('elements.air'), value: balance.air, color: colors.air, symbol: '💨' },
    { key: 'space', name: t('elements.space'), value: balance.space, color: colors.space, symbol: '🌌' },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('report.panchaBhoota')}</Text>
      <View style={styles.grid}>
        {elements.map((el) => {
          const rawVal = (el.value || 'BALANCED').toUpperCase();
          const isBalanced = rawVal === 'BALANCED';
          const isDeficient = rawVal === 'DEFICIENT' || rawVal === 'DEFICIT';
          const isExcessive =
            rawVal === 'EXCESSIVE' || rawVal === 'EXCESS' || rawVal === 'CLASH';

          // Safe localized label resolution with bulletproof fallbacks
          let label = t(`balanceStatus.${rawVal}`);
          if (!label || label.startsWith('balanceStatus.')) {
            if (isDeficient) {
              label = t('balanceStatus.DEFICIENT');
              if (label.startsWith('balanceStatus.')) label = t('balanceStatus.DEFICIT');
              if (label.startsWith('balanceStatus.')) label = 'DEFICIENT';
            } else if (isExcessive) {
              label = t('balanceStatus.EXCESSIVE');
              if (label.startsWith('balanceStatus.')) label = t('balanceStatus.EXCESS');
              if (label.startsWith('balanceStatus.')) label = 'EXCESSIVE';
            } else {
              label = rawVal;
            }
          }

          const badgeBg = isBalanced
            ? 'rgba(16, 185, 129, 0.15)'
            : isDeficient
            ? 'rgba(245, 158, 11, 0.15)'
            : isExcessive
            ? 'rgba(239, 68, 68, 0.15)'
            : 'rgba(148, 163, 184, 0.15)';

          const badgeTextColor = isBalanced
            ? colors.compliant
            : isDeficient
            ? '#F59E0B'
            : isExcessive
            ? colors.defect
            : '#94A3B8';

          return (
            <View key={el.key} style={styles.elementRow}>
              <View style={styles.left}>
                <Text style={styles.symbol}>{el.symbol}</Text>
                <Text style={styles.elementName}>{el.name}</Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                <Text style={[styles.statusText, { color: badgeTextColor }]}>
                  {label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
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
    marginVertical: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  grid: {
    gap: 8,
  },
  elementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symbol: {
    fontSize: 18,
    marginRight: 10,
  },
  elementName: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
