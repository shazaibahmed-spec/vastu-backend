import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Compass, FileDown, Trash2 } from 'lucide-react-native';
import { reportsApi } from '../../api/reports.api';
import { RoomType } from '../../api/types';
import { AppHeader } from '../../components/common/AppHeader';
import { useTranslation } from '../../i18n';
import { useHistoryStore } from '../../store/history.store';
import { FEATURES } from '../../config/features';
import { colors } from '../../theme/colors';
import { getScoreColor } from '../../utils/formatters';

interface HistoryScreenProps {
  navigation: any;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const items = useHistoryStore((state) => state.items);
  const isLoading = useHistoryStore((state) => state.isLoading);
  const isRefreshing = useHistoryStore((state) => state.isRefreshing);
  const selectedFilter = useHistoryStore((state) => state.selectedFilter);
  const setFilter = useHistoryStore((state) => state.setFilter);
  const fetchHistory = useHistoryStore((state) => state.fetchHistory);
  const refreshHistory = useHistoryStore((state) => state.refreshHistory);
  const removeItem = useHistoryStore((state) => state.removeItem);

  useEffect(() => {
    fetchHistory(1);
  }, []);

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

  const filterOptions: { label: string; value?: RoomType }[] = [
    { label: t('history.all'), value: undefined },
    { label: t('rooms.bedroom'), value: 'BEDROOM' },
    { label: t('rooms.kitchen'), value: 'KITCHEN' },
    { label: t('rooms.livingRoom'), value: 'LIVING_ROOM' },
    { label: t('rooms.mainEntrance'), value: 'MAIN_ENTRANCE' },
    { label: t('rooms.office'), value: 'OFFICE' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('history.title')} onBack={() => navigation.goBack()} />

      {/* Filter Chips Row */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filterOptions.map((opt, idx) => {
            const isSelected = selectedFilter === opt.value;
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                onPress={() => setFilter(opt.value)}
                style={[styles.filterChip, isSelected && styles.filterChipSelected]}
              >
                <Text
                  style={[styles.filterText, isSelected && styles.filterTextSelected]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshHistory}
            tintColor={colors.gold}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>{t('history.noHistory')}</Text>
              <Text style={styles.emptyText}>
                {selectedFilter
                  ? `${roomLabel(selectedFilter)}`
                  : t('common.scanRoomNow')}
              </Text>
            </View>
          ) : (
            <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 40 }} />
          )
        }
        renderItem={({ item }) => {
          const score = item.overallScore || 0;
          const scoreColor = getScoreColor(score);

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('HarmonyReport', { reportId: item.id })
              }
              style={styles.card}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}20` }]}>
                  <Text style={[styles.scoreNumber, { color: scoreColor }]}>
                    {score}
                  </Text>
                </View>

                <View style={styles.cardInfo}>
                  <Text style={styles.cardRoomTitle}>{roomLabel(item.roomType)}</Text>
                  <View style={styles.cardMetaRow}>
                    <Compass color="#94A3B8" size={13} />
                    <Text style={styles.cardMetaText}>
                      {item.direction
                        ? `${t('home.facing')} ${t(`directions.${item.direction}`)}`
                        : t('common.calibrated')}
                    </Text>
                  </View>
                  <Text style={styles.cardDate}>
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                {FEATURES.ENABLE_REPORT_EXPORT_SHARE && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={async () => {
                      const url = reportsApi.getPdfUrl(item.id);
                      try {
                        await Linking.openURL(url);
                      } catch (e) {
                        // ignore
                      }
                    }}
                    style={styles.pdfQuickBtn}
                  >
                    <FileDown color={colors.gold} size={17} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => removeItem(item.id)}
                  style={styles.deleteBtn}
                >
                  <Trash2 color="#64748B" size={16} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  filterWrapper: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    backgroundColor: colors.dark.surface,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextSelected: {
    color: colors.gold,
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 30,
    gap: 10,
  },
  card: {
    backgroundColor: colors.dark.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scoreBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  scoreNumber: {
    fontSize: 20,
    fontWeight: '900',
  },
  cardInfo: {
    flex: 1,
  },
  cardRoomTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardMetaText: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 4,
  },
  cardDate: {
    color: '#64748B',
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pdfQuickBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  deleteBtn: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
