import React from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { H2, Typography } from '@/components/ui/typography';
import { BunnyCard } from '@/components/ui/bunny-card';
import { Radio } from 'lucide-react-native';
import { LiveIndicator } from './LiveIndicator';

const { width } = Dimensions.get('window');

interface FeaturedStationItem {
  id: string;
  title: string;
  sub: string;
  color: string;
}

interface FeaturedStationsProps {
  stations: FeaturedStationItem[];
  loadingGenre: string | null;
  onStartGenreRadio: (genreId: string) => void;
}

export function FeaturedStations({
  stations,
  loadingGenre,
  onStartGenreRadio,
}: FeaturedStationsProps) {
  return (
    <View style={styles.section}>
      <H2 style={styles.sectionTitle}>Featured Stations</H2>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.horizontalScroll}
        contentContainerStyle={{ paddingRight: 20 }}
      >
        {stations.map((station, i) => (
          <Animated.View key={station.id} entering={FadeInDown.delay(i * 100)}>
            <BunnyCard
              tintColor={station.color}
              style={styles.featuredCard}
              onPress={() => onStartGenreRadio(station.id)}
            >
              <View style={styles.cardHeader}>
                <LiveIndicator />
                <View style={styles.featuredLoading}>
                  {loadingGenre === station.id ? (
                    <ActivityIndicator size="small" color={station.color} />
                  ) : (
                    <Radio size={24} color={station.color} />
                  )}
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Typography variant="large" numberOfLines={1}>
                  {station.title}
                </Typography>
                <Typography variant="small" numberOfLines={1}>
                  {station.sub}
                </Typography>
              </View>
            </BunnyCard>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  horizontalScroll: {
    paddingLeft: 20,
  },
  featuredCard: {
    width: width * 0.7,
    height: 180,
    marginRight: 16,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  featuredLoading: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    marginTop: 'auto',
  },
});
