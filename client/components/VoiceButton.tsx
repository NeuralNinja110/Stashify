import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  WithSpringConfig,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface VoiceButtonProps {
  isRecording: boolean;
  onPress: () => void;
  size?: 'medium' | 'large';
  disabled?: boolean;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.5,
  stiffness: 150,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function VoiceButton({
  isRecording,
  onPress,
  size = 'large',
  disabled = false,
}: VoiceButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withSpring(1.1, { damping: 10 }),
          withSpring(1, { damping: 10 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withSpring(1);
    }
  }, [isRecording]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.95, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const handlePress = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  const buttonSize = size === 'large' ? 96 : 64;
  const iconSize = size === 'large' ? 40 : 28;

  return (
    <View style={styles.container}>
      {isRecording && (
        <View
          style={[
            styles.pulseRing,
            {
              width: buttonSize + 24,
              height: buttonSize + 24,
              borderRadius: (buttonSize + 24) / 2,
              backgroundColor: theme.primary + '20',
            },
          ]}
        />
      )}
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor: isRecording ? theme.error : theme.primary,
            opacity: disabled ? 0.5 : 1,
          },
          Shadows.floating,
          animatedStyle,
        ]}
      >
        <Feather
          name={isRecording ? 'mic-off' : 'mic'}
          size={iconSize}
          color="#FFFFFF"
        />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
  },
});
