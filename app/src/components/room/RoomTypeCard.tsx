import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '../../i18n';
import { RoomType } from '../../api/types';
import { colors } from '../../theme/colors';

interface RoomTypeCardProps {
  roomType: RoomType;
  isSelected: boolean;
  onSelect: (roomType: RoomType) => void;
}

export const RoomTypeCard: React.FC<RoomTypeCardProps> = ({
  roomType,
  isSelected,
  onSelect,
}) => {
  const { t } = useTranslation();

  const getEmoji = (type: RoomType) => {
    switch (type) {
      case 'BEDROOM':
        return '🛏️';
      case 'KITCHEN':
        return '🍳';
      case 'LIVING_ROOM':
        return '🛋️';
      case 'MAIN_ENTRANCE':
        return '🚪';
      case 'OFFICE':
        return '💼';
    }
  };

  const getRoomTitle = (type: RoomType) => {
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
    }
  };

  const getRoomSubtitle = (type: RoomType) => {
    switch (type) {
      case 'BEDROOM':
        return t('rooms.bedroomSub');
      case 'KITCHEN':
        return t('rooms.kitchenSub');
      case 'LIVING_ROOM':
        return t('rooms.livingRoomSub');
      case 'MAIN_ENTRANCE':
        return t('rooms.mainEntranceSub');
      case 'OFFICE':
        return t('rooms.officeSub');
    }
  };

  const getRoomZone = (type: RoomType) => {
    switch (type) {
      case 'BEDROOM':
        return t('rooms.bedroomZone');
      case 'KITCHEN':
        return t('rooms.kitchenZone');
      case 'LIVING_ROOM':
        return t('rooms.livingRoomZone');
      case 'MAIN_ENTRANCE':
        return t('rooms.mainEntranceZone');
      case 'OFFICE':
        return t('rooms.officeZone');
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onSelect(roomType)}
      style={[
        styles.card,
        isSelected && styles.cardSelected,
      ]}
    >
      <View style={styles.left}>
        <Text style={styles.emoji}>{getEmoji(roomType)}</Text>
        <View style={styles.info}>
          <Text style={[styles.title, isSelected && styles.titleSelected]}>
            {getRoomTitle(roomType)}
          </Text>
          <Text style={styles.subtitle}>{getRoomSubtitle(roomType)}</Text>
          <View style={styles.zoneRow}>
            <Text style={styles.zoneLabel}>{t('scan.primeZone')} </Text>
            <Text style={styles.zoneValue}>{getRoomZone(roomType)}</Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.radioCircle,
          isSelected && styles.radioCircleSelected,
        ]}
      >
        {isSelected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 6,
  },
  cardSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(28, 37, 65, 0.95)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 28,
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  titleSelected: {
    color: colors.gold,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoneLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  zoneValue: {
    color: colors.goldLight,
    fontSize: 11,
    fontWeight: '600',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioCircleSelected: {
    borderColor: colors.gold,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.gold,
  },
});
