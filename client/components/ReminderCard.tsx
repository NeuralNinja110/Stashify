import React from 'react';
import { StyleSheet, View, Pressable, Switch } from 'react-native';
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
import { Reminder } from '@/types';
import { format } from 'date-fns';

interface ReminderCardProps {
  reminder: Reminder;
  onToggle: (id: string, enabled: boolean) => void;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ReminderCard({ reminder, onToggle, onPress }: ReminderCardProps) {
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

  const getIcon = () => {
    switch (reminder.type) {
      case 'medicine':
        return 'heart';
      case 'appointment':
        return 'calendar';
      default:
        return 'check-circle';
    }
  };

  const getIconColor = () => {
    switch (reminder.type) {
      case 'medicine':
        return theme.error;
      case 'appointment':
        return theme.accent;
      default:
        return theme.success;
    }
  };

  const handleToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(reminder.id, value);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          opacity: reminder.enabled ? 1 : 0.6,
        },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: getIconColor() + '20' },
        ]}
      >
        <Feather name={getIcon()} size={28} color={getIconColor()} />
      </View>
      <View style={styles.content}>
        <ThemedText type="h4" style={styles.title}>
          {reminder.title}
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.time, { color: theme.textSecondary }]}
        >
          {format(new Date(reminder.time), 'h:mm a')}
        </ThemedText>
      </View>
      <Switch
        value={reminder.enabled}
        onValueChange={handleToggle}
        trackColor={{ false: theme.border, true: theme.primary + '60' }}
        thumbColor={reminder.enabled ? theme.primary : theme.backgroundSecondary}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  content: {
    flex: 1,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  time: {},
});
