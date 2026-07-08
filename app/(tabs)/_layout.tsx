import { Tabs, useRouter, usePathname } from 'expo-router';
import { View, StyleSheet, Linking, DeviceEventEmitter, BackHandler } from 'react-native';
import { useEffect } from 'react';
import { usePlayerAnimation , PlayerAnimationProvider } from '@/contexts/player-animation-context';
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
  parseLrc,
  LYRICS_CACHE,
} from '@/services';
import EqualizerModule from '@/modules/equalizer';

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
    const parseFileUri = (url: string): string | null => {
      if (!url) return null;
      if (url.startsWith('/')) {
        return `file://${url}`;
      }
      if (url.startsWith('file://') || url.startsWith('content://')) {
        return url;
      }
      // If expo rewrote content:// to bunny://
      if (url.startsWith('bunny://') && (url.includes('.provider') || url.includes('com.google.android') || url.includes('content/'))) {
        return url.replace('bunny://', 'content://');
      }
      if (url.includes('com.google.android.apps.nbu.files.provider') || url.includes('com.android.providers')) {
        return url.replace('bunny://', 'content://');
      }
      return null;
    };

    const playExternalFile = async (fileUri: string) => {
      try {
        let fileName = 'External Audio';
        const decoded = decodeURIComponent(fileUri);
        if (decoded.includes('/')) {
          const lastPart = decoded.substring(decoded.lastIndexOf('/') + 1);
          if (lastPart) {
            fileName = lastPart.replace(/\.[^/.]+$/, ""); // Strip file extension
          }
        }
        
        let meta: {
          title?: string;
          artist?: string;
          album?: string;
          duration?: number;
          artwork?: string;
          lrc?: string;
        } = {};
        if (EqualizerModule && typeof EqualizerModule.extractMetadata === 'function') {
          meta = await EqualizerModule.extractMetadata(fileUri);
        }

        const trackId = `external-${Date.now()}`;

        // Pre-cache local lyrics if available so the lyrics tab does not query online APIs
        if (meta.lrc) {
          try {
            const parsed = parseLrc(meta.lrc);
            if (Array.isArray(parsed) && parsed.length > 0) {
              LYRICS_CACHE.set(trackId, parsed);
            }
          } catch (err) {
            console.warn('Failed to parse local embedded lyrics:', err);
          }
        }

        const trackToPlay: AppTrack = {
          id: trackId,
          url: fileUri,
          title: `External - ${meta.title || fileName}`,
          artist: meta.artist || 'Unknown Artist',
          album: meta.album || 'External File',
          duration: meta.duration ? meta.duration / 1000 : 0,
          artwork: meta.artwork || '',
          lrc: meta.lrc || '',
        };

        await PlayerActions.playCollection([trackToPlay]);
        expand();
      } catch (err) {
        console.warn('Failed to play external file:', err);
      }
    };

    // Listen for custom expand event from deep links
    const expandSub = DeviceEventEmitter.addListener('expand-player-modal', () => {
      expand();
    });

    // 1. Listen for system notification clicks (downloads & updates)
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const identifier = response.notification.request.identifier;
      if (identifier) {
        if (identifier.startsWith('download-')) {
          // Route to the downloads section under Profile tab
          router.navigate('/profile');
        } else if (identifier === 'app-update') {
          // Route to the updates settings screen
          router.navigate('/settings/updates' as any);
        }
      }
    });

    // 2. Listen for media player notification click deep link or file intent
    const handleDeepLink = (event: { url: string }) => {
      if (event.url === 'trackplayer://notification.click' || event.url.includes('notification.click')) {
        expand();
      } else {
        const resolvedUri = parseFileUri(event.url);
        if (resolvedUri) {
          playExternalFile(resolvedUri);
          router.replace('/' as any);
        }
      }
    };

    const linkSubscription = Linking.addEventListener('url', handleDeepLink);

    // Check if the app was opened via notification click or file intent initially
    Linking.getInitialURL().then((url) => {
      if (url) {
        if (url === 'trackplayer://notification.click' || url.includes('notification.click')) {
          expand();
        } else {
          const resolvedUri = parseFileUri(url);
          if (resolvedUri) {
            playExternalFile(resolvedUri);
            setTimeout(() => {
              router.replace('/' as any);
            }, 500);
          }
        }
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