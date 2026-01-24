import React from 'react';
import { StyleSheet, View, Pressable, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GoldenMoment } from '@/types';
import { format } from 'date-fns';

interface MomentCardProps {
  moment: GoldenMoment;
  onPress: () => void;
  onPlay: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MomentCard({ moment, onPress, onPlay }: MomentCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePlay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPlay();
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      {moment.photoUri ? (
        <Image source={{ uri: moment.photoUri }} style={styles.thumbnail} />
      ) : (
        <View
          style={[
            styles.placeholderThumbnail,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="image" size={32} color={theme.textSecondary} />
        </View>
      )}
      <View style={styles.content}>
        <ThemedText type="h4" style={styles.title} numberOfLines={2}>
          {moment.title}
        </ThemedText>
        <ThemedText
          type="caption"
          style={[styles.date, { color: theme.textSecondary }]}
        >
          {format(new Date(moment.createdAt), 'MMM d, yyyy')}
        </ThemedText>
        {moment.emotionTags && moment.emotionTags.length > 0 && (
          <View style={styles.tags}>
            {moment.emotionTags.slice(0, 3).map((tag, index) => (
              <View
                key={index}
                style={[
                  styles.tag,
                  { backgroundColor: theme.primary + '20' },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={[styles.tagText, { color: theme.primary }]}
                >
                  {tag}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>
      <Pressable
        onPress={handlePlay}
        style={[styles.playButton, { backgroundColor: theme.primary }]}
      >
        <Feather name="play" size={20} color="#FFFFFF" />
      </Pressable>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.lg,
  },
  placeholderThumbnail: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  date: {
    marginBottom: Spacing.sm,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.xs,
  },
  tagText: {
    fontWeight: '500',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
});
