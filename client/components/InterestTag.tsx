import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
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

interface InterestTagProps {
  label: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function InterestTag({ label, icon, selected, onPress }: InterestTagProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        {
          backgroundColor: selected ? theme.primary : theme.backgroundDefault,
          borderColor: selected ? theme.primary : theme.border,
        },
        animatedStyle,
      ]}
    >
      <Feather
        name={icon as any}
        size={24}
        color={selected ? '#FFFFFF' : theme.text}
        style={styles.icon}
      />
      <ThemedText
        type="body"
        style={[
          styles.label,
          { color: selected ? '#FFFFFF' : theme.text },
        ]}
      >
        {label}
      </ThemedText>
      {selected && (
        <Feather name="check" size={20} color="#FFFFFF" style={styles.check} />
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    marginBottom: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.md,
  },
  label: {
    flex: 1,
    fontWeight: '500',
  },
  check: {
    marginLeft: Spacing.sm,
  },
});
