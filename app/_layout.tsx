import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogBox , DeviceEventEmitter, Linking, AppState } from 'react-native';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import '../global.css';
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
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Alert } from '@/components/ui/alert';
import TrackPlayer from 'react-native-track-player';
import { NetworkProvider } from '@/contexts/network-context';
import { NetworkStatusBanner } from '@/components/network/NetworkStatusBanner';

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

LogBox.ignoreLogs(['InteractionManager has been deprecated']);

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

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'background') {
        try {
          const state = await TrackPlayer.getPlaybackState();
          if (state.state !== 'playing') {
            await TrackPlayer.stop();
          }
        } catch (_) {}
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const [permAlertVisible, setPermAlertVisible] = useState(false);
  const [globalAlert, setGlobalAlert] = useState<{
    visible: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string | null;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('show_notification_permission_alert', () => {
      setPermAlertVisible(true);
    });
    const alertSub = DeviceEventEmitter.addListener('show_app_alert', (config) => {
      setGlobalAlert({
        visible: true,
        title: config.title,
        description: config.description,
        confirmText: config.confirmText,
        cancelText: config.cancelText,
        onConfirm: async () => {
          if (config.onConfirm) {
            await config.onConfirm();
          }
          setGlobalAlert(null);
        },
      });
    });
    return () => {
      sub.remove();
      alertSub.remove();
    };
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
              <Stack screenOptions={{ animation: 'default' }}>
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
              <Alert
                visible={permAlertVisible}
                onClose={() => setPermAlertVisible(false)}
                title="Enable Notifications"
                description="Notifications are required to display active download progress in the system status bar. Please enable them in Settings."
                confirmText="Settings"
                cancelText="Maybe Later"
                onConfirm={async () => {
                  try {
                    await Linking.openSettings();
                  } catch (e) {
                    console.warn('Failed to open settings:', e);
                  }
                }}
              />
              {globalAlert && (
                <Alert
                  visible={globalAlert.visible}
                  onClose={() => setGlobalAlert(null)}
                  title={globalAlert.title}
                  description={globalAlert.description}
                  confirmText={globalAlert.confirmText}
                  cancelText={globalAlert.cancelText}
                  onConfirm={globalAlert.onConfirm}
                />
              )}
              <NetworkStatusBanner />
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
      <NetworkProvider>
        <RootLayoutWithTheme />
      </NetworkProvider>
    </AppThemeProvider>
  );
}
