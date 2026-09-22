import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/auth.store';
import { colors } from '../theme/colors';
import { RootStackParamList } from './types';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { HistoryScreen } from '../screens/history/HistoryScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { HarmonyReportScreen } from '../screens/report/HarmonyReportScreen';
import { CameraCompassScreen } from '../screens/scan/CameraCompassScreen';
import { ProcessingScreen } from '../screens/scan/ProcessingScreen';
import { ReviewConfirmScreen } from '../screens/scan/ReviewConfirmScreen';
import { RoomSelectScreen } from '../screens/scan/RoomSelectScreen';
import { VastuCompassScreen } from '../screens/compass/VastuCompassScreen';
import { FEATURES } from '../config/features';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.dark.background },
        animation: 'slide_from_right',
      }}
    >
      {!isAuthenticated ? (
        // Auth Stack
        <Stack.Group>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Group>
      ) : (
        // Main App Stack
        <Stack.Group>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="RoomSelect" component={RoomSelectScreen} />
          <Stack.Screen
            name="CameraCompass"
            component={CameraCompassScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen name="ReviewConfirm" component={ReviewConfirmScreen} />
          <Stack.Screen
            name="Processing"
            component={ProcessingScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="HarmonyReport" component={HarmonyReportScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          {FEATURES.ENABLE_VASTU_COMPASS && (
            <Stack.Screen name="VastuCompass" component={VastuCompassScreen} />
          )}
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};
