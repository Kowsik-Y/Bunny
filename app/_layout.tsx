import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogBox } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

LogBox.ignoreLogs(['InteractionManager has been deprecated']);
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import { AppThemeProvider, useAppTheme } from '@/contexts/app-theme-context';
import { TrackOptionsProvider } from '@/contexts/track-options-context';
import { ToastProvider } from '@/components/ui/toast';
import { setupPlayer } from '@/services/SetupService';
import { checkAppUpdates } from '@/services';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => { });

function RootLayoutWithTheme() {
  const { colorScheme, colors } = useAppTheme();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  // Hide the splash screen once fonts are loaded
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [fontsLoaded]);

  // Eagerly initialize TrackPlayer and check for app updates in background
  useEffect(() => {
    setupPlayer().catch(() => { });
    checkAppUpdates(true).catch(() => { });
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      primary: colors.tint,
      border: colors.tabIconDefault,
      notification: colors.tint,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme}>
        <BottomSheetModalProvider>
          <TrackOptionsProvider>
            <ToastProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
                <Stack.Screen
                  name="notification.click"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'none',
                    headerShown: false
                  }}
                />
              </Stack>
            </ToastProvider>
            <StatusBar
              style={colorScheme === 'dark' ? 'light' : 'dark'}
              {...({ backgroundColor: colors.background } as any)}
            />
          </TrackOptionsProvider>
        </BottomSheetModalProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutWithTheme />
    </AppThemeProvider>
  );
}
