import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Alert, Switch, ActivityIndicator, Linking, Platform } from 'react-native';
import packageJson from '../package.json';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { cacheDirectory, getInfoAsync, deleteAsync, readDirectoryAsync } from 'expo-file-system/legacy';

import { H1, H3, Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { ThemeVariantOptions, type ThemeFontName, type ThemeMode } from '@/constants/theme';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useDownloads, checkAppUpdates } from '@/services';
import AsyncStorage from '@react-native-async-storage/async-storage';

const themeModes: Array<{ label: string; value: ThemeMode; icon: any }> = [
  { label: 'System', value: 'system', icon: 'gearshape.fill' },
  { label: 'Light', value: 'light', icon: 'house.fill' },
  { label: 'Dark', value: 'dark', icon: 'moon.fill' },
];

const themeFonts: Array<{ label: string; value: ThemeFontName }> = [
  { label: 'Sans', value: 'sans' },
  { label: 'Serif', value: 'serif' },
  { label: 'Rounded', value: 'rounded' },
  { label: 'Mono', value: 'mono' },
  { label: 'Poppins', value: 'poppins' },
  { label: 'Nunito', value: 'nunito' },
  { label: 'Combo', value: 'combo' },
];

type SettingsSection = 'main' | 'appearance' | 'lyrics' | 'audio' | 'downloads' | 'cache' | 'updates' | 'about';

export default function SettingsScreen() {
  const { mode, setMode, variant, setVariant, font, setFont, audioQuality, setAudioQuality, colors, playerStyle, setPlayerStyle, lyricsSize, setLyricsSize, lyricsSpacing, setLyricsSpacing } = useAppTheme();
  const { downloadLocation, changeDownloadLocation, clearDownloads, downloadedTracks } = useDownloads();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SettingsSection>('main');
  const [cacheSize, setCacheSize] = useState<string>('Calculating...');
  const [autoUpdate, setAutoUpdate] = useState<boolean>(true);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);

  useEffect(() => {
    const loadAutoCheckSetting = async () => {
      try {
        const stored = await AsyncStorage.getItem('@bunny_auto_check_updates');
        if (stored !== null) {
          setAutoUpdate(stored === 'true');
        }
      } catch (e) {
        console.warn('Failed to load auto-update setting', e);
      }
    };
    loadAutoCheckSetting();
  }, []);

  const handleToggleAutoUpdate = async (value: boolean) => {
    setAutoUpdate(value);
    try {
      await AsyncStorage.setItem('@bunny_auto_check_updates', String(value));
    } catch (e) {
      console.warn('Failed to save auto-update setting', e);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    await checkAppUpdates(false);
    setCheckingUpdate(false);
  };

  const getDirSize = async (dirUri: string): Promise<number> => {
    try {
      const files = await readDirectoryAsync(dirUri);
      let size = 0;
      for (const file of files) {
        const fileUri = `${dirUri}${file}`;
        const info = await getInfoAsync(fileUri);
        if (info.exists) {
          if (info.isDirectory) {
            size += await getDirSize(fileUri.endsWith('/') ? fileUri : `${fileUri}/`);
          } else {
            size += info.size || 0;
          }
        }
      }
      return size;
    } catch {
      return 0;
    }
  };

  const loadCacheSize = async () => {
    try {
      const dir = cacheDirectory;
      if (!dir) {
        setCacheSize('0.00 MB');
        return;
      }
      const sizeBytes = await getDirSize(dir);
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
      setCacheSize(`${sizeMB} MB`);
    } catch {
      setCacheSize('0.00 MB');
    }
  };

  useEffect(() => {
    if (activeSection === 'cache') {
      loadCacheSize();
    }
  }, [activeSection]);

  const handleClearCache = async () => {
    const dir = cacheDirectory;
    if (!dir) return;
    
    const proceedClear = async () => {
      try {
        setCacheSize('Clearing...');
        const files = await readDirectoryAsync(dir);
        for (const file of files) {
          await deleteAsync(`${dir}${file}`, { idempotent: true });
        }
        Alert.alert('Success', 'App cache files cleared successfully!');
        loadCacheSize();
      } catch (e) {
        console.warn('Failed to clear cache', e);
        Alert.alert('Error', 'Failed to clear cache files.');
        loadCacheSize();
      }
    };

    if (downloadLocation === 'cache' && downloadedTracks.length > 0) {
      Alert.alert(
        'Warning',
        'Your download storage is set to "Temporary Cache". Clearing the cache will delete all your offline downloaded songs. Do you still want to proceed?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => loadCacheSize() },
          { text: 'Clear Anyway', style: 'destructive', onPress: proceedClear }
        ]
      );
    } else {
      Alert.alert(
        'Clear Cache',
        'Clear all temporary images, metadata, and stream cache files from this device?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear Cache', style: 'destructive', onPress: proceedClear }
        ]
      );
    }
  };

  const handleBack = () => {
    if (activeSection !== 'main') {
      setActiveSection('main');
    } else {
      router.back();
    }
  };

  const getHeaderTitle = () => {
    switch (activeSection) {
      case 'appearance':
        return 'Appearance';
      case 'lyrics':
        return 'Player & Lyrics';
      case 'audio':
        return 'Playback & Audio';
      case 'downloads':
        return 'Downloads';
      case 'cache':
        return 'Cache';
      case 'updates':
        return 'App Updates';
      case 'about':
        return 'About';
      default:
        return 'Settings';
    }
  };

  const getHeaderSubtitle = () => {
    switch (activeSection) {
      case 'appearance':
        return 'Themes, variants and app typography';
      case 'lyrics':
        return 'Background styling and lyric behaviors';
      case 'audio':
        return 'Offline and streaming sound options';
      case 'downloads':
        return 'Offline download storage and cleanup';
      case 'cache':
        return 'Clean temporary files and free space';
      case 'updates':
        return 'Manage and check for software updates';
      case 'about':
        return 'Application info and developer details';
      default:
        return 'Customize your bunny experience';
    }
  };

  const handleClearAll = () => {
    if (downloadedTracks.length === 0) {
      Alert.alert('Info', 'You have no offline downloaded songs.');
      return;
    }
    Alert.alert(
      'Clear Downloads',
      `Delete all ${downloadedTracks.length} offline downloaded songs from this device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await clearDownloads();
            Alert.alert('Success', 'All downloaded media tracks deleted.');
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable 
              onPress={handleBack} 
              style={[styles.backButton, { transform: [{ rotate: '180deg' }] }]}
            >
              <IconSymbol 
                name="chevron.right" 
                size={22} 
                color={colors.text} 
              />
            </Pressable>
            <H1 style={styles.titleText}>{getHeaderTitle()}</H1>
          </View>
          <Muted style={{ marginLeft: 34 }}>{getHeaderSubtitle()}</Muted>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          {activeSection === 'main' && (
            <View style={{ gap: 4 }}>
              {/* Appearance Row */}
              <Pressable onPress={() => setActiveSection('appearance')}>
                <BunnyCard style={styles.navCard}>
                  <View style={styles.navSettingRow}>
                    <View style={styles.iconContainer}>
                      <IconSymbol name="paintbrush.fill" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.settingInfo}>
                      <Typography variant="large">Appearance</Typography>
                      <Muted>Choose app theme, accent colors, and fonts</Muted>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
                  </View>
                </BunnyCard>
              </Pressable>

              {/* Player & Lyrics Row */}
              <Pressable onPress={() => setActiveSection('lyrics')}>
                <BunnyCard style={styles.navCard}>
                  <View style={styles.navSettingRow}>
                    <View style={styles.iconContainer}>
                      <IconSymbol name="play.fill" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.settingInfo}>
                      <Typography variant="large">Player & Lyrics</Typography>
                      <Muted>Customize player background and lyric sizing</Muted>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
                  </View>
                </BunnyCard>
              </Pressable>

              {/* Playback & Audio Row */}
              <Pressable onPress={() => setActiveSection('audio')}>
                <BunnyCard style={styles.navCard}>
                  <View style={styles.navSettingRow}>
                    <View style={styles.iconContainer}>
                      <IconSymbol name="antenna.radiowaves.left.and.right" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.settingInfo}>
                      <Typography variant="large">Playback & Audio</Typography>
                      <Muted>Set sound streaming quality presets</Muted>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
                  </View>
                </BunnyCard>
              </Pressable>

              {/* Downloads Row */}
              <Pressable onPress={() => setActiveSection('downloads')}>
                <BunnyCard style={styles.navCard}>
                  <View style={styles.navSettingRow}>
                    <View style={styles.iconContainer}>
                      <Feather name="download" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.settingInfo}>
                      <Typography variant="large">Downloads</Typography>
                      <Muted>Download location and offline library cleanup</Muted>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
                  </View>
                </BunnyCard>
              </Pressable>

              {/* Cache Management Row */}
              <Pressable onPress={() => setActiveSection('cache')}>
                <BunnyCard style={styles.navCard}>
                  <View style={styles.navSettingRow}>
                    <View style={styles.iconContainer}>
                      <Feather name="database" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.settingInfo}>
                      <Typography variant="large">Cache Management</Typography>
                      <Muted>Free up space by cleaning temporary cache files</Muted>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
                  </View>
                </BunnyCard>
              </Pressable>

              {/* App Updates Row */}
              <Pressable onPress={() => setActiveSection('updates')}>
                <BunnyCard style={styles.navCard}>
                  <View style={styles.navSettingRow}>
                    <View style={styles.iconContainer}>
                      <Feather name="refresh-cw" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.settingInfo}>
                      <Typography variant="large">App Updates</Typography>
                      <Muted>Check for updates and manage auto-updates</Muted>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
                  </View>
                </BunnyCard>
              </Pressable>

              {/* About Row */}
              <Pressable onPress={() => setActiveSection('about')}>
                <BunnyCard style={styles.navCard}>
                  <View style={styles.navSettingRow}>
                    <View style={styles.iconContainer}>
                      <Feather name="info" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.settingInfo}>
                      <Typography variant="large">About</Typography>
                      <Muted>Developer details, version, and resources</Muted>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
                  </View>
                </BunnyCard>
              </Pressable>
            </View>
          )}

          {activeSection === 'appearance' && (
            <View>
              {/* Theme Mode Section */}
              <H3 style={styles.sectionTitle}>Theme Mode</H3>
              <BunnyCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.iconContainer}>
                    <IconSymbol name="moon.fill" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Typography variant="large">Theme Mode</Typography>
                    <Muted>Choose how Bunny looks</Muted>
                  </View>
                </View>
                <View style={styles.chipContainer}>
                  {themeModes.map((option) => {
                    const selected = mode === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setMode(option.value)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected ? colors.primary : colors.card,
                            borderColor: selected ? colors.primary : colors.border,
                          },
                        ]}>
                        <Typography
                          style={{
                            color: selected ? colors.primaryForeground : colors.text,
                            fontSize: 13,
                          }}>
                          {option.label}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>
              </BunnyCard>

              {/* Accent Color Section */}
              <H3 style={styles.sectionTitle}>Accent Color</H3>
              <BunnyCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.iconContainer}>
                    <IconSymbol name="paintbrush.fill" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Typography variant="large">Variant</Typography>
                    <Muted>Personalize the app colors</Muted>
                  </View>
                </View>
                <View style={[styles.chipContainer, styles.grid]}>
                  {ThemeVariantOptions.map((option) => {
                    const selected = variant === option;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => setVariant(option)}
                        style={[
                          styles.chip,
                          styles.gridChip,
                          {
                            backgroundColor: selected ? colors.primary : colors.card,
                            borderColor: selected ? colors.primary : colors.border,
                          },
                        ]}>
                        <Typography
                          style={{
                            color: selected ? colors.primaryForeground : colors.text,
                            fontSize: 13,
                          }}>
                          {option}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>
              </BunnyCard>

              {/* Typography Section */}
              <H3 style={styles.sectionTitle}>Typography</H3>
              <BunnyCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.iconContainer}>
                    <IconSymbol name="textformat" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Typography variant="large">Font Family</Typography>
                    <Muted>Select the app typography</Muted>
                  </View>
                </View>
                <View style={[styles.chipContainer, styles.grid]}>
                  {themeFonts.map((option) => {
                    const selected = font === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setFont(option.value)}
                        style={[
                          styles.chip,
                          styles.gridChip,
                          {
                            backgroundColor: selected ? colors.primary : colors.card,
                            borderColor: selected ? colors.primary : colors.border,
                          },
                        ]}>
                        <Typography
                          style={{
                            color: selected ? colors.primaryForeground : colors.text,
                            fontSize: 13,
                          }}>
                          {option.label}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>
              </BunnyCard>
            </View>
          )}

          {activeSection === 'lyrics' && (
            <View>
              {/* Player Background Card */}
              <H3 style={styles.sectionTitle}>Player Style</H3>
              <BunnyCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.iconContainer}>
                    <IconSymbol name="play.fill" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Typography variant="large">Player Background UI</Typography>
                    <Muted>Select background style for player</Muted>
                  </View>
                </View>
                <View style={styles.chipContainer}>
                  {([
                    { label: 'Flat Gradient', value: 'flat' },
                    { label: 'Solid Dark', value: 'solid' }
                  ] as const).map((option) => {
                    const selected = playerStyle === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setPlayerStyle(option.value)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected ? colors.primary : colors.card,
                            borderColor: selected ? colors.primary : colors.border,
                            flex: 1,
                            alignItems: 'center',
                          },
                        ]}>
                        <Typography
                          style={{
                            color: selected ? colors.primaryForeground : colors.text,
                            fontSize: 11,
                          }}>
                          {option.label}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>
              </BunnyCard>

              {/* Lyrics Size Card */}
              <H3 style={styles.sectionTitle}>Lyrics Size</H3>
              <BunnyCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.iconContainer}>
                    <IconSymbol name="textformat" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Typography variant="large">Lyrics Font Size</Typography>
                    <Muted>Select the text size for lyrics</Muted>
                  </View>
                </View>
                <View style={styles.chipContainer}>
                  {([
                    { label: 'Small', value: 'small' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'Large', value: 'large' }
                  ] as const).map((option) => {
                    const selected = lyricsSize === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setLyricsSize(option.value)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected ? colors.primary : colors.card,
                            borderColor: selected ? colors.primary : colors.border,
                            flex: 1,
                            alignItems: 'center',
                          },
                        ]}>
                        <Typography
                          style={{
                            color: selected ? colors.primaryForeground : colors.text,
                            fontSize: 13,
                          }}>
                          {option.label}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>
              </BunnyCard>

              {/* Lyrics Spacing Card */}
              <H3 style={styles.sectionTitle}>Lyrics Spacing</H3>
              <BunnyCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.iconContainer}>
                    <IconSymbol name="quote.bubble" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Typography variant="large">Lyrics Line Spacing</Typography>
                    <Muted>Select vertical spacing for lyrics</Muted>
                  </View>
                </View>
                <View style={styles.chipContainer}>
                  {([
                    { label: 'Compact', value: 'compact' },
                    { label: 'Regular', value: 'regular' },
                    { label: 'Spacious', value: 'spacious' }
                  ] as const).map((option) => {
                    const selected = lyricsSpacing === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setLyricsSpacing(option.value)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected ? colors.primary : colors.card,
                            borderColor: selected ? colors.primary : colors.border,
                            flex: 1,
                            alignItems: 'center',
                          },
                        ]}>
                        <Typography
                          style={{
                            color: selected ? colors.primaryForeground : colors.text,
                            fontSize: 13,
                          }}>
                          {option.label}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>
              </BunnyCard>
            </View>
          )}

          {activeSection === 'audio' && (
            <View>
              {/* Audio Quality Section */}
              <H3 style={styles.sectionTitle}>Audio Presets</H3>
              <BunnyCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.iconContainer}>
                    <IconSymbol name="antenna.radiowaves.left.and.right" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Typography variant="large">Audio Quality</Typography>
                    <Muted>Select stream audio bitrate</Muted>
                  </View>
                </View>
                <View style={styles.chipContainer}>
                  {(['low', 'medium', 'high'] as const).map((option) => {
                    const selected = audioQuality === option;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => setAudioQuality(option)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected ? colors.primary : colors.card,
                            borderColor: selected ? colors.primary : colors.border,
                            flex: 1,
                            alignItems: 'center',
                          },
                        ]}>
                        <Typography
                          style={{
                            color: selected ? colors.primaryForeground : colors.text,
                            fontSize: 13,
                            textTransform: 'capitalize',
                          }}>
                          {option}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>
              </BunnyCard>
            </View>
          )}

          {activeSection === 'downloads' && (
            <View>
              {/* Storage Location preferences */}
              <H3 style={styles.sectionTitle}>Storage Preferences</H3>
              <BunnyCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.iconContainer}>
                    <Feather name="folder" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Typography variant="large">Save Location</Typography>
                    <Muted>Select directory to download audio files</Muted>
                  </View>
                </View>
                <View style={styles.chipContainer}>
                  {([
                    { label: 'Internal Storage', value: 'internal' },
                    { label: 'Temporary Cache', value: 'cache' }
                  ] as const).map((option) => {
                    const selected = downloadLocation === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => changeDownloadLocation(option.value)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected ? colors.primary : colors.card,
                            borderColor: selected ? colors.primary : colors.border,
                            flex: 1,
                            alignItems: 'center',
                          },
                        ]}>
                        <Typography
                          style={{
                            color: selected ? colors.primaryForeground : colors.text,
                            fontSize: 12,
                          }}>
                          {option.label}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>
              </BunnyCard>

              {/* Storage Management cleanup */}
              <H3 style={styles.sectionTitle}>Storage Management</H3>
              <BunnyCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.iconContainer}>
                    <Feather name="trash-2" size={20} color="#FF3B30" />
                  </View>
                  <View style={styles.settingInfo}>
                    <Typography variant="large">Clear Cache</Typography>
                    <Muted>Delete all local offline tracks to free space</Muted>
                  </View>
                </View>
                
                <Pressable
                  onPress={handleClearAll}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: 'rgba(255, 59, 48, 0.1)',
                      borderColor: '#FF3B30',
                      alignItems: 'center',
                      marginTop: 8,
                    },
                  ]}>
                  <Typography
                    style={{
                      color: '#FF3B30',
                      fontSize: 14,
                      fontWeight: '700',
                    }}>
                    Delete All Offline Downloads
                  </Typography>
                </Pressable>
              </BunnyCard>
            </View>
          )}

          {activeSection === 'cache' && (
            <View>
              {/* Cache Details Card */}
              <H3 style={styles.sectionTitle}>App Cache</H3>
              <BunnyCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.iconContainer}>
                    <Feather name="database" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Typography variant="large">Temporary Files Size</Typography>
                    <Muted>Image preloads, logs, and temp player files</Muted>
                  </View>
                  <Typography style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginRight: 8 }}>
                    {cacheSize}
                  </Typography>
                </View>
                
                <Pressable
                  onPress={handleClearCache}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: 'rgba(255, 59, 48, 0.1)',
                      borderColor: '#FF3B30',
                      alignItems: 'center',
                      marginTop: 8,
                    },
                  ]}>
                  <Typography
                    style={{
                      color: '#FF3B30',
                      fontSize: 14,
                      fontWeight: '700',
                    }}>
                    Clear Temporary App Cache
                  </Typography>
                </Pressable>
              </BunnyCard>
            </View>
          )}

          {activeSection === 'updates' && (
            <View>
              <H3 style={styles.sectionTitle}>Update Status</H3>
              <BunnyCard style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.iconContainer}>
                    <Feather name="refresh-cw" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Typography variant="large">Current Version</Typography>
                    <Muted>{packageJson.version} ({__DEV__ ? 'Debug' : 'Release'})</Muted>
                  </View>
                  <Typography style={{ fontSize: 14, color: colors.mutedForeground, marginRight: 8 }}>
                    Up to date
                  </Typography>
                </View>
                
                <View style={[styles.settingRow, { marginTop: 8, marginBottom: 8 }]}>
                  <View style={styles.iconContainer}>
                    <Feather name="bell" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Typography variant="large">Auto-Check for Updates</Typography>
                    <Muted>Check for updates automatically on startup</Muted>
                  </View>
                  <Switch
                    value={autoUpdate}
                    onValueChange={handleToggleAutoUpdate}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={autoUpdate ? '#fff' : colors.mutedForeground}
                  />
                </View>
                
                <Pressable
                  onPress={handleCheckUpdate}
                  disabled={checkingUpdate}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      alignItems: 'center',
                      marginTop: 16,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8,
                      height: 44,
                    },
                  ]}>
                  {checkingUpdate && <ActivityIndicator size="small" color={colors.primaryForeground} />}
                  <Typography
                    style={{
                      color: colors.primaryForeground,
                      fontSize: 14,
                      fontWeight: '700',
                    }}>
                    {checkingUpdate ? 'Checking for updates...' : 'Check for Updates'}
                  </Typography>
                </Pressable>
              </BunnyCard>
            </View>
          )}

          {activeSection === 'about' && (
            <View>
              <H3 style={styles.sectionTitle}>Application Info</H3>
              <BunnyCard style={styles.settingCard}>
                <View style={{ alignItems: 'center', marginVertical: 16 }}>
                  <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Feather name="music" size={40} color={colors.primaryForeground} />
                  </View>
                  <H3 style={{ fontWeight: '800' }}>Bunny</H3>
                  <Muted>Elegant & Premium Music Player</Muted>
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, gap: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography style={{ color: colors.mutedForeground }}>Version</Typography>
                    <Typography style={{ fontWeight: '600' }}>{packageJson.version}</Typography>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography style={{ color: colors.mutedForeground }}>Build Type</Typography>
                    <Typography style={{ fontWeight: '600' }}>{__DEV__ ? 'Debug Build' : 'Release Build'}</Typography>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography style={{ color: colors.mutedForeground }}>Architecture</Typography>
                    <Typography style={{ fontWeight: '600' }}>{Platform.OS === 'android' ? 'arm64-v8a' : 'Universal'}</Typography>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography style={{ color: colors.mutedForeground }}>Developer</Typography>
                    <Typography style={{ fontWeight: '600' }}>Kowsik</Typography>
                  </View>
                </View>
              </BunnyCard>

              <H3 style={styles.sectionTitle}>Links & Resources</H3>
              <BunnyCard style={styles.settingCard}>
                <Pressable onPress={() => Linking.openURL('https://github.com/kowsik')} style={[styles.settingRow, { marginBottom: 0 }]}>
                  <View style={styles.iconContainer}>
                    <Feather name="github" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Typography variant="large">GitHub Profile</Typography>
                    <Muted>Check out the developer profile</Muted>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.mutedForeground} />
                </Pressable>
              </BunnyCard>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  titleText: {
    fontSize: 28,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingCard: {
    marginBottom: 16,
  },
  navCard: {
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  navSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  grid: {
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  gridChip: {
    minWidth: '30%',
    alignItems: 'center',
  },
});
