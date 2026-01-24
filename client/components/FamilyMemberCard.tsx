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
import { FamilyMember } from '@/types';
import { format } from 'date-fns';

interface FamilyMemberCardProps {
  member: FamilyMember;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FamilyMemberCard({ member, onPress }: FamilyMemberCardProps) {
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

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getSideColor = () => {
    switch (member.side) {
      case 'paternal':
        return theme.accent;
      case 'maternal':
        return theme.primary;
      case 'friend':
        return theme.success;
      default:
        return theme.warning;
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      {member.photoUri ? (
        <Image source={{ uri: member.photoUri }} style={styles.photo} />
      ) : (
        <View
          style={[
            styles.placeholderPhoto,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="user" size={32} color={theme.textSecondary} />
        </View>
      )}
      <View style={styles.content}>
        <ThemedText type="h4" style={styles.name} numberOfLines={1}>
          {member.name}
        </ThemedText>
        <View style={styles.relationRow}>
          {member.side && (
            <View
              style={[
                styles.sideBadge,
                { backgroundColor: getSideColor() + '20' },
              ]}
            >
              <ThemedText
                type="caption"
                style={[styles.sideText, { color: getSideColor() }]}
              >
                {member.side.charAt(0).toUpperCase() + member.side.slice(1)}
              </ThemedText>
            </View>
          )}
          <ThemedText
            type="small"
            style={[styles.relation, { color: theme.textSecondary }]}
          >
            {member.relation}
          </ThemedText>
        </View>
        {member.dateOfBirth && (
          <ThemedText
            type="caption"
            style={[styles.dob, { color: theme.textSecondary }]}
          >
            Born: {format(new Date(member.dateOfBirth), 'MMM d, yyyy')}
          </ThemedText>
        )}
      </View>
      <Feather name="chevron-right" size={24} color={theme.textSecondary} />
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
  photo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: Spacing.lg,
  },
  placeholderPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  name: {
    marginBottom: Spacing.xs,
  },
  relationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sideBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  sideText: {
    fontWeight: '600',
  },
  relation: {},
  dob: {},
});
