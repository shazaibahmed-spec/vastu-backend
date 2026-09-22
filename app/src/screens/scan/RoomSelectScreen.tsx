import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../../i18n';
import { RoomType } from '../../api/types';
import { AppHeader } from '../../components/common/AppHeader';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { RoomTypeCard } from '../../components/room/RoomTypeCard';
import { useScanStore } from '../../store/scan.store';
import { colors } from '../../theme/colors';

interface RoomSelectScreenProps {
  navigation: any;
}

export const RoomSelectScreen: React.FC<RoomSelectScreenProps> = ({
  navigation,
}) => {
  const { t } = useTranslation();
  const currentRoom = useScanStore((state) => state.roomType);
  const setRoomType = useScanStore((state) => state.setRoomType);
  const setNotes = useScanStore((state) => state.setNotes);
  const [selected, setSelected] = useState<RoomType>(currentRoom || 'BEDROOM');

  const roomOptions: RoomType[] = [
    'BEDROOM',
    'KITCHEN',
    'LIVING_ROOM',
    'MAIN_ENTRANCE',
    'OFFICE',
  ];

  const handleContinue = () => {
    setRoomType(selected);
    setNotes('');
    navigation.navigate('CameraCompass');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={t('scan.selectSpaceTitle')}
        subtitle={t('scan.selectSpaceSubtitle')}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.instructions}>
          {t('scan.selectSpaceInstructions')}
        </Text>

        <View style={styles.list}>
          {roomOptions.map((type) => (
            <RoomTypeCard
              key={type}
              roomType={type}
              isSelected={selected === type}
              onSelect={setSelected}
            />
          ))}
        </View>

        <PrimaryButton
          title={t('scan.proceedToCamera')}
          onPress={handleContinue}
          variant="primary"
          style={styles.continueBtn}
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  instructions: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  list: {
    marginBottom: 20,
  },
  continueBtn: {
    marginTop: 10,
  },
});
