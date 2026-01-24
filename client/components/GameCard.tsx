import React from 'react';
import { StyleSheet, Pressable, View, Image, ImageSourcePropType } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface GameCardProps {
  title: string;
  description: string;
  icon: ImageSourcePropType;
  difficulty?: 'easy' | 'medium' | 'hard';
  onPress: () => void;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GameCard({
  title,
  description,
  icon,
  difficulty = 'easy',
  onPress,
}: GameCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'easy':
        return theme.success;
      case 'medium':
        return theme.warning;
      case 'hard':
        return theme.error;
      default:
        return theme.success;
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.iconContainer}>
        <Image source={icon} style={styles.icon} resizeMode="contain" />
      </View>
      <View style={styles.content}>
        <ThemedText type="h4" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.description, { color: theme.textSecondary }]}
        >
          {description}
        </ThemedText>
      </View>
      <View style={styles.footer}>
        <View
          style={[
            styles.difficultyBadge,
            { backgroundColor: getDifficultyColor() + '20' },
          ]}
        >
          <View
            style={[
              styles.difficultyDot,
              { backgroundColor: getDifficultyColor() },
            ]}
          />
          <ThemedText
            type="caption"
            style={[styles.difficultyText, { color: getDifficultyColor() }]}
          >
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={24} color={theme.textSecondary} />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    marginBottom: Spacing.md,
  },
  icon: {
    width: 64,
    height: 64,
  },
  content: {
    marginBottom: Spacing.md,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  description: {},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  difficultyText: {
    fontWeight: '600',
  },
});
