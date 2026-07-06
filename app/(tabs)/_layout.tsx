import { Tabs, useRouter, usePathname } from 'expo-router';
import { View, StyleSheet, Linking, DeviceEventEmitter, BackHandler } from 'react-native';
import { useEffect } from 'react';
import { usePlayerAnimation } from '@/contexts/player-animation-context';
import * as Notifications from 'expo-notifications';

import { HapticTab } from '@/components/haptic-tab';
import { useAppTheme } from '@/contexts/app-theme-context';
import BottomTabBar from '@/components/bottom-tab-bar';
import MusicPlayerModal from '@/components/player/Musicplayermodal';
import { AppTrack } from '@/components/player/Tracks';
import {
  PlayerActions,
  useCurrentTrack,
  usePlayerProgress,
  usePlayerState,
  useQueue,
} from '@/services';
import { PlayerAnimationProvider } from '@/contexts/player-animation-context';

function TabsWithPlayer() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();

  const queue = useQueue();
  const { isPlaying, isBuffering } = usePlayerState();
  const currentTrack = useCurrentTrack();
  const { position, duration } = usePlayerProgress();
  const { expand } = usePlayerAnimation();

  useEffect(() => {
    // Listen for custom expand event from deep links
    const expandSub = DeviceEventEmitter.addListener('expand-player-modal', () => {
      expand();
    });

    // 1. Listen for system notification body clicks (download notifications)
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const identifier = response.notification.request.identifier;
      if (identifier && identifier.startsWith('download-')) {
        // Route to the downloads section under Profile tab
        router.navigate('/profile');
      }
    });

    // 2. Listen for media player notification click deep link
    const handleDeepLink = (event: { url: string }) => {
      if (event.url === 'trackplayer://notification.click' || event.url.includes('notification.click')) {
        expand();
      }
    };

    const linkSubscription = Linking.addEventListener('url', handleDeepLink);

    // Check if the app was opened via notification click initially
    Linking.getInitialURL().then((url) => {
      if (url && (url === 'trackplayer://notification.click' || url.includes('notification.click'))) {
        expand();
      }
    });

    return () => {
      expandSub.remove();
      notificationSubscription.remove();
      linkSubscription.remove();
    };
  }, [expand]);



  return (
      <View style={StyleSheet.absoluteFill}>
        {/* ── Tab navigator ────────────────────────────────────────── */}
        <Tabs
          tabBar={(props) => <BottomTabBar {...props} />}
          backBehavior="history"
          screenOptions={{
            tabBarActiveTintColor: colors.tint,
            tabBarInactiveTintColor: colors.tabIconDefault,
            tabBarShowLabel: false,
            tabBarStyle: {
              height: 64,
              marginHorizontal: 16,
              marginBottom: 10,
              borderTopColor: 'transparent',
              backgroundColor: 'transparent',
              borderRadius: 24,
              position: 'absolute',
              left: 0,
              right: 0,
              elevation: 12,
              shadowColor: '#000',
              shadowOpacity: 0.18,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              alignItems: 'center',
              justifyContent: 'center',
            },
            headerShown: false,
            tabBarButton: HapticTab,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
            }}
          />
          <Tabs.Screen
            name="radio"
            options={{
              title: 'Radio',
            }}
          />
          <Tabs.Screen
            name="explore"
            options={{
              title: 'Explore',
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
            }}
          />
          {/* Hidden Detail Screens - Hidden from Tab Bar but visible with bar */}
          <Tabs.Screen
            name="album/[id]"
            options={{
              href: null,
              headerShown: false,
            }}
          />
          <Tabs.Screen
            name="artist/[id]"
            options={{
              href: null,
              headerShown: false,
            }}
          />
          <Tabs.Screen
            name="playlist/[id]"
            options={{
              href: null,
              headerShown: false,
            }}
          />
        </Tabs>
        <View 
          style={[StyleSheet.absoluteFill, { zIndex: 989 }]} 
          pointerEvents="box-none"
        >
          <MusicPlayerModal
            track={currentTrack ? (currentTrack as AppTrack) : null}
            queue={queue}
            isPlaying={isPlaying}
            isBuffering={isBuffering}
            position={position}
            duration={duration}
            onPlayPause={() => PlayerActions.playPause(isPlaying)}
            onNext={PlayerActions.next}
            onPrev={PlayerActions.previous}
            onSeek={PlayerActions.seekTo}
            onSkipToTrack={PlayerActions.skipToTrack}
          />
        </View>
      </View>
  );
}

// ─── Root layout ─────────────────────────────────────────────────────────────
// Only job: provide the theme. No hooks that depend on it live here.
export default function TabLayout() {
  return (
    <PlayerAnimationProvider>
      <TabsWithPlayer />
    </PlayerAnimationProvider>
  );
}