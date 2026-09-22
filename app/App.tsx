import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/auth.store';
import { useTranslationStore } from './src/i18n/useTranslation';
import { colors } from './src/theme/colors';

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.gold,
    background: colors.dark.background,
    card: colors.dark.surface,
    text: colors.dark.textPrimary,
    border: colors.dark.border,
  },
};

export default function App() {
  const checkSession = useAuthStore((state) => state.checkSession);
  const initLanguage = useTranslationStore((state) => state.initLanguage);

  useEffect(() => {
    initLanguage();
    checkSession();
  }, []);

  return (
    <NavigationContainer theme={CustomDarkTheme}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />
      <RootNavigator />
    </NavigationContainer>
  );
}
