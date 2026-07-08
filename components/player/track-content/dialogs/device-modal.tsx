import { Slider } from '@/components/ui/slider';
import { Typography as Text } from '@/components/ui/typography';
import { addAlpha } from '@/constants/theme';
import { useAppTheme } from '@/contexts/app-theme-context';
import { AudioLines, Bluetooth, Cast, Film, Headphones, Plug, Speaker, Volume1, Volume2, Sliders } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NativeModules, Pressable, StyleSheet, View } from 'react-native';
import { useIsHeadphonesConnected, useIsWiredHeadphonesConnected } from 'react-native-device-info';
import { VolumeManager } from 'react-native-volume-manager';
import { type AppTrack } from '../../Tracks';
import { PlayerSheet } from './player-sheet';

// Check if Native Module is available to avoid crash
const isDeviceInfoNativeAvailable = !!NativeModules.RNDeviceInfo;

function useIsHeadphonesConnectedSafe() {
  if (!isDeviceInfoNativeAvailable) {
    return { loading: false, result: false };
  }
  try {
    return useIsHeadphonesConnected();
  } catch (e) {
    console.warn('[DeviceModal] useIsHeadphonesConnected failed:', e);
    return { loading: false, result: false };
  }
}

function useIsWiredHeadphonesConnectedSafe() {
  if (!isDeviceInfoNativeAvailable) {
    return { loading: false, result: false };
  }
  try {
    return useIsWiredHeadphonesConnected();
  } catch (e) {
    console.warn('[DeviceModal] useIsWiredHeadphonesConnected failed:', e);
    return { loading: false, result: false };
  }
}

let GoogleCastSafe: any = null;
let useCastStateSafe: any = () => null;
let useCastSessionSafe: any = () => null;
let useCastDeviceSafe: any = () => null;
let CastStateSafe: any = {};

try {
  const CastLib = require('react-native-google-cast');
  if (CastLib) {
    GoogleCastSafe = CastLib.default || CastLib;
    useCastStateSafe = CastLib.useCastState || useCastStateSafe;
    useCastSessionSafe = CastLib.useCastSession || useCastSessionSafe;
    useCastDeviceSafe = CastLib.useCastDevice || useCastDeviceSafe;
    CastStateSafe = CastLib.CastState || {};
  }
} catch (e) {
  console.warn('[DeviceModal] react-native-google-cast is not available natively:', e);
}

interface DeviceModalProps {
  visible: boolean;
  onClose: () => void;
  activeDevice?: string;
  realDevices?: any[];
  playerMode: 'audio' | 'video';
  track: AppTrack;
  onQualityPress?: () => void;
}

export function DeviceModal({
  visible,
  onClose,
  playerMode,
  track,
  onQualityPress,
}: DeviceModalProps) {
  const { colors } = useAppTheme();
  const router = useRouter();

  // Interactive Volume states
  const [volume, setVolume] = useState(0.65);

  useEffect(() => {
    if (visible) {
      VolumeManager.getVolume()
        .then(({ volume: currentVolume }) => {
          setVolume(currentVolume);
        })
        .catch((err) => {
          console.warn('[DeviceModal] Failed to get volume:', err);
        });

      const volumeListener = VolumeManager.addVolumeListener((result) => {
        setVolume(result.volume);
      });

      return () => {
        volumeListener.remove();
      };
    }
  }, [visible]);

  const headphonesConnectedState = useIsHeadphonesConnectedSafe();
  const wiredHeadphonesConnectedState = useIsWiredHeadphonesConnectedSafe();

  const isWiredConnected = !!(headphonesConnectedState.result && wiredHeadphonesConnectedState.result);

  const isBluetoothConnected = !!(headphonesConnectedState.result && !wiredHeadphonesConnectedState.result);

  const deviceStatus = {
    audioJack: isWiredConnected,
    bluetooth: isBluetoothConnected,
  };

  // Google Cast status
  const castState = useCastStateSafe();
  const castSession = useCastSessionSafe();
  const castDevice = useCastDeviceSafe();

  const castStateStr = castState as string;
  const isCasting = castStateStr === 'connected' || (typeof CastStateSafe.CONNECTED !== 'undefined' && castState === CastStateSafe.CONNECTED) || !!castSession;
  const isCastAvailable = castStateStr !== 'noDevicesAvailable' && (typeof CastStateSafe.NO_DEVICES_AVAILABLE !== 'undefined' && castState !== CastStateSafe.NO_DEVICES_AVAILABLE) && !!GoogleCastSafe;
  const isConnectingCast = castStateStr === 'connecting' || (typeof CastStateSafe.CONNECTING !== 'undefined' && castState === CastStateSafe.CONNECTING);


  // Build the list of all connected/available devices
  const devices = [
    {
      id: 'speakers',
      name: 'Phone Speakers',
      icon: Speaker,
      connected: true, // Always available
      isActive: !isCasting && !deviceStatus.bluetooth && !deviceStatus.audioJack,
    },
    {
      id: 'wired',
      name: 'Wired Headphones',
      icon: Headphones,
      connected: deviceStatus.audioJack,
      isActive: !isCasting && deviceStatus.audioJack && !deviceStatus.bluetooth,
    },
    {
      id: 'bluetooth',
      name: 'Bluetooth Audio',
      icon: Bluetooth,
      connected: deviceStatus.bluetooth,
      isActive: !isCasting && deviceStatus.bluetooth,
    },
    {
      id: 'cast',
      name: castDevice?.friendlyName || 'Google Cast',
      icon: Cast,
      connected: true, // Always show Cast in outputs list
      isActive: isCasting,
      onPress: () => {
        if (GoogleCastSafe) {
          GoogleCastSafe.showCastDialog();
        }
      },
    },
  ];

  const availableDevices = devices.filter((d) => d.connected);

  const streamQualityString = useMemo(() => {
    const formats = playerMode === 'video' ? track.allVideo : track.allAudio;
    const activeFormat = formats?.find((format: any) =>
      playerMode === 'video'
        ? track.activeVideoItag === format.itag
        : track.activeItag === format.itag
    );
    if (activeFormat) {
      if (playerMode === 'video') {
        return `${activeFormat.quality || 'Standard'} (${(activeFormat.bitrate / 1000).toFixed(0)} kbps)`;
      } else {
        const kbps = (activeFormat.bitrate / 1000).toFixed(0);
        const codec = activeFormat.mimeType.split('codecs="')[1]?.split('"')[0]?.toUpperCase() || 'AAC';
        return `${codec} • ${kbps} kbps`;
      }
    }
    return playerMode === 'video' ? 'Standard Video' : 'Standard • 128 kbps';
  }, [playerMode, track]);



  return (
    <PlayerSheet
      visible={visible}
      onClose={onClose}
      title="Audio Status"
    >
      <View style={styles.content}>



        {/* Unified Available Devices List */}
        {availableDevices.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionHeader, { color: colors.mutedForeground, marginBottom: 10 }]}>
              Available Outputs
            </Text>
            <View style={[styles.devicesListContainer, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              {availableDevices.map((dev, idx) => {
                const DevIcon = dev.icon;
                const isItemActive = dev.isActive || (dev.id === 'speakers' && !isBluetoothConnected && !isWiredConnected && !isCasting) || (dev.id === 'wired' && isWiredConnected && !isCasting) || (dev.id === 'bluetooth' && isBluetoothConnected && !isCasting);

                return (
                  <View key={dev.id} style={[styles.deviceRow, { backgroundColor: isItemActive ? addAlpha(colors.background, 0.01) : colors.background }]}>
                    <View style={[
                      styles.deviceRowIconCircle,
                      { backgroundColor: isItemActive ? addAlpha(colors.primary, 0.1) : addAlpha(colors.text, 0.04) }
                    ]}>
                      <DevIcon size={20} color={isItemActive ? colors.primary : colors.mutedForeground} />
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={{ color: isItemActive ? colors.text : colors.mutedForeground, fontSize: 15, fontWeight: isItemActive ? '800' : '600' }}>
                        {dev.name}
                      </Text>
                      {dev.id === 'cast' && (
                        <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
                          {isItemActive ? 'Streaming audio' : !isCastAvailable ? 'No devices available' : 'Tap to stream audio'}
                        </Text>
                      )}
                    </View>
                    <View style={{ justifyContent: 'center' }}>
                      {isItemActive ? (
                        <View style={[styles.activeStatusPill, { paddingHorizontal: 8, paddingVertical: 4, borderColor: 'rgba(48, 209, 88, 0.2)' }]}>
                          <Plug size={12} color="#30D158" />
                        </View>
                      ) : dev.id === 'cast' ? (
                        isConnectingCast ? (
                          <View style={[styles.connectedBadge, { backgroundColor: colors.background }]}>
                            <Text style={[styles.connectedBadgeText, { color: colors.primary }]}>Connecting</Text>
                          </View>
                        ) : !isCastAvailable ? (
                          <View style={[styles.connectedBadge, { backgroundColor: colors.background }]}>
                            <Text style={[styles.connectedBadgeText, { color: colors.mutedForeground }]}>Not Connected</Text>
                          </View>
                        ) : (
                          <Pressable
                            onPress={dev.onPress}
                            style={[
                              styles.connectPill,
                              {
                                backgroundColor: addAlpha(colors.background, 0.1),
                                borderWidth: 1,
                                borderColor: colors.border,
                              }
                            ]}
                          >
                            <Text style={[styles.connectPillText, { color: colors.primary }]}>Connect</Text>
                          </Pressable>
                        )
                      ) : (
                        <View style={[styles.connectedBadge, { backgroundColor: colors.background }]}>
                          <Text style={[styles.connectedBadgeText, { color: colors.mutedForeground }]}>Ready</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
        {/* Stream Quality / Change Quality Button */}
        <View style={{
          ...styles.qualityButtonCard, backgroundColor: colors.muted,
          borderColor: colors.border,
        }}>
          <View style={[styles.qualityIconCircle, { backgroundColor: addAlpha(colors.primary, 0.1) }]}>
            {playerMode === 'video' ? (
              <Film size={20} color={colors.primary} />
            ) : (
              <AudioLines size={20} color={colors.primary} />
            )}
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={[styles.qualityCardLabel, { color: colors.mutedForeground }]}>
              {playerMode === 'video' ? 'Video Quality' : 'Audio Quality'}
            </Text>
            <Text style={[styles.qualityCardValue, { color: colors.text }]} numberOfLines={1}>
              {streamQualityString}
            </Text>
          </View>
          <Pressable
            onPress={onQualityPress}
            style={[styles.changeBadge, { backgroundColor: addAlpha(colors.primary, 0.1), borderColor: addAlpha(colors.primary, 0.25) }]}
          >
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Change</Text>
          </Pressable>
        </View>

        {/* Equalizer Card */}
        <Pressable
          onPress={() => {
            onClose();
            setTimeout(() => {
              router.push('/settings/equalizer' as any);
            }, 250);
          }}
          style={{
            ...styles.qualityButtonCard,
            backgroundColor: colors.muted,
            borderColor: colors.border,
            marginTop: 0,
            marginBottom: 20,
          }}
        >
          <View style={[styles.qualityIconCircle, { backgroundColor: addAlpha(colors.primary, 0.1) }]}>
            <Sliders size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={[styles.qualityCardLabel, { color: colors.mutedForeground }]}>
              Equalizer Settings
            </Text>
            <Text style={[styles.qualityCardValue, { color: colors.text }]} numberOfLines={1}>
              Adjust constellation controls & presets
            </Text>
          </View>
          <View
            style={[styles.changeBadge, { backgroundColor: addAlpha(colors.primary, 0.1), borderColor: addAlpha(colors.primary, 0.25) }]}
          >
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Open</Text>
          </View>
        </Pressable>
        {/* Volume Slider Section */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground, marginBottom: 6 }]}>
          Device Volume
        </Text>
        <View style={styles.volumeContainer}>
          <Volume1 size={18} color={colors.mutedForeground} />
          <Slider
            value={volume}
            min={0}
            max={1}
            onValueChange={(newVol) => {
              setVolume(newVol);
              VolumeManager.setVolume(newVol).catch((err) => {
                console.warn('[DeviceModal] Failed to set volume:', err);
              });
            }}
            style={{ flex: 1 }}
          />
          <Volume2 size={18} color={colors.mutedForeground} />
        </View>
      </View>
    </PlayerSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 10,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    marginBottom: 10,
  },
  qualityButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  qualityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  qualityCardLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  qualityCardValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'center',
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.3)',
    alignSelf: 'center',
  },

  devicesListContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  deviceDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  deviceRowIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  connectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'center',
  },
  connectPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  connectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'center',
  },
  connectedBadgeText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 12,
    marginBottom: 20,
  },


});
