import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAudioPlayer, AudioSource } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/RootStackNavigator';
import { getApiUrl } from '@/lib/query-client';

interface Moment {
  id: string;
  userId: string;
  title: string;
  description?: string;
  photoUri?: string;
  audioUri?: string;
  tags?: string[];
  createdAt: string;
}

export default function MomentDetailScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'MomentDetail'>>();
  
  const [moment, setMoment] = useState<Moment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const player = useAudioPlayer(moment?.audioUri ? { uri: moment.audioUri } : null);

  useEffect(() => {
    fetchMoment();
  }, [route.params.momentId]);

  const fetchMoment = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(
        new URL(`/api/moments/${route.params.momentId}`, getApiUrl()).toString()
      );
      
      if (response.ok) {
        const data = await response.json();
        setMoment(data);
      }
    } catch (error) {
      console.error('Failed to fetch moment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!moment?.audioUri || !player) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Could not play the audio recording');
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want to delete this memory? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                new URL(`/api/moments/${route.params.momentId}`, getApiUrl()).toString(),
                { method: 'DELETE' }
              );
              
              if (response.ok) {
                navigation.goBack();
              }
            } catch (error) {
              console.error('Failed to delete moment:', error);
              Alert.alert('Error', 'Could not delete the memory');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ThemedText type="body">Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!moment) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ThemedText type="body">Memory not found</ThemedText>
          <Button onPress={() => navigation.goBack()} style={{ marginTop: Spacing.lg }}>
            <ThemedText style={{ color: '#FFFFFF' }}>Go Back</ThemedText>
          </Button>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.text} />
        </Pressable>
        <ThemedText type="h2" style={styles.headerTitle}>Memory</ThemedText>
        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={24} color={theme.error} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {moment.photoUri && (
          <View style={[styles.imageContainer, { backgroundColor: theme.backgroundDefault }]}>
            <Image source={{ uri: moment.photoUri }} style={styles.image} resizeMode="cover" />
          </View>
        )}

        <View style={styles.detailsContainer}>
          <ThemedText type="h1" style={styles.title}>{moment.title}</ThemedText>
          
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
            <ThemedText type="caption" style={[styles.date, { color: theme.textSecondary }]}>
              {format(new Date(moment.createdAt), 'MMMM d, yyyy')}
            </ThemedText>
          </View>

          {moment.description && (
            <View style={styles.descriptionContainer}>
              <ThemedText type="body" style={styles.description}>
                {moment.description}
              </ThemedText>
            </View>
          )}

          {moment.audioUri && (
            <Pressable
              onPress={handlePlayAudio}
              style={[styles.audioButton, { backgroundColor: theme.primary }]}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color="#FFFFFF"
              />
              <ThemedText type="body" style={styles.audioButtonText}>
                {isPlaying ? 'Pause Recording' : 'Play Recording'}
              </ThemedText>
            </Pressable>
          )}

          {moment.tags && moment.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <ThemedText type="caption" style={{ marginBottom: Spacing.sm, fontWeight: '600' }}>Tags</ThemedText>
              <View style={styles.tags}>
                {moment.tags.map((tag, index) => (
                  <View
                    key={index}
                    style={[styles.tag, { backgroundColor: theme.backgroundDefault }]}
                  >
                    <ThemedText type="caption">{tag}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  imageContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  image: {
    width: '100%',
    height: 250,
  },
  detailsContainer: {
    gap: Spacing.md,
  },
  title: {
    fontSize: 28,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  date: {
    fontSize: 14,
  },
  descriptionContainer: {
    marginTop: Spacing.sm,
  },
  description: {
    lineHeight: 24,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  audioButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tagsContainer: {
    marginTop: Spacing.lg,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
});
