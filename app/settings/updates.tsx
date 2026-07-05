import { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Pressable, ActivityIndicator, Text } from 'react-native';
import { Stack } from 'expo-router';
import { RefreshCw, Bell } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Switch } from '@/components/ui/switch';
import { Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import { checkAppUpdates } from '@/services';
import packageJson from '../../package.json';

export default function UpdatesSettingsScreen() {
  const { colors } = useAppTheme();
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

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'App Updates' }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Text style={[styles.floatingTitle, { color: colors.text }]}>App Updates</Text>
        <BunnyCard style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconContainer}>
              <RefreshCw size={20} color={colors.primary} />
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
              <Bell size={20} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">Auto-Check for Updates</Typography>
              <Muted>Check for updates automatically on startup</Muted>
            </View>
            <Switch
              checked={autoUpdate}
              onCheckedChange={handleToggleAutoUpdate}
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
      </ScrollView>
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
    paddingTop: 100,
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  floatingTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
});
