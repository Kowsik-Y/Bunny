import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { WifiOff, DownloadCloud } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/contexts/app-theme-context';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';

interface OfflineStateViewProps {
  message?: string;
}

export function OfflineStateView({ message = "To explore music, please connect to the internet." }: OfflineStateViewProps) {
  const { colors } = useAppTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
        <WifiOff size={64} color={colors.tint} strokeWidth={1.5} />
      </View>
      
      <Typography style={styles.title}>No Internet Connection</Typography>
      
      <Typography style={[styles.description, { color: colors.tabIconDefault }]}>
        {message}
      </Typography>
      
      <View style={styles.buttonContainer}>
        <Button 
          variant="default" 
          size="lg" 
          onPress={() => router.navigate('/profile')}
          style={styles.button}
        >
          <DownloadCloud size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Go to Downloads</Text>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: '80%',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 280,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    paddingVertical: 14,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});
