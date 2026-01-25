import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WinningAnimationProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onAnimationComplete?: () => void;
}

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
const STAR_COUNT = 12;
const CONFETTI_COUNT = 30;

interface ConfettiPiece {
  id: number;
  color: string;
  left: number;
  delay: number;
  rotation: number;
  size: number;
}

interface Star {
  id: number;
  size: number;
  delay: number;
  angle: number;
  distance: number;
}

const generateConfetti = (): ConfettiPiece[] => {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    left: Math.random() * 100,
    delay: Math.random() * 500,
    rotation: Math.random() * 360,
    size: 8 + Math.random() * 12,
  }));
};

const generateStars = (): Star[] => {
  return Array.from({ length: STAR_COUNT }, (_, i) => ({
    id: i,
    size: 20 + Math.random() * 20,
    delay: i * 100,
    angle: (360 / STAR_COUNT) * i,
    distance: 80 + Math.random() * 40,
  }));
};

const ConfettiPieceComponent: React.FC<{ piece: ConfettiPiece }> = ({ piece }) => {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(piece.rotation);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(
      piece.delay,
      withTiming(600, { duration: 3000, easing: Easing.out(Easing.quad) })
    );
    translateX.value = withDelay(
      piece.delay,
      withRepeat(
        withSequence(
          withTiming(-20, { duration: 500 }),
          withTiming(20, { duration: 500 })
        ),
        -1,
        true
      )
    );
    rotate.value = withDelay(
      piece.delay,
      withRepeat(withTiming(piece.rotation + 720, { duration: 3000 }), -1)
    );
    opacity.value = withDelay(2500, withTiming(0, { duration: 500 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          left: `${piece.left}%`,
          width: piece.size,
          height: piece.size * 0.6,
          backgroundColor: piece.color,
          borderRadius: piece.size / 4,
        },
        animatedStyle,
      ]}
    />
  );
};

const StarComponent: React.FC<{ star: Star; theme: any }> = ({ star, theme }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    const radians = (star.angle * Math.PI) / 180;
    const targetX = Math.cos(radians) * star.distance;
    const targetY = Math.sin(radians) * star.distance;

    scale.value = withDelay(
      star.delay,
      withSpring(1, { damping: 8, stiffness: 100 })
    );
    opacity.value = withDelay(
      star.delay,
      withTiming(1, { duration: 300 })
    );
    translateX.value = withDelay(
      star.delay,
      withSpring(targetX, { damping: 12, stiffness: 80 })
    );
    translateY.value = withDelay(
      star.delay,
      withSpring(targetY, { damping: 12, stiffness: 80 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.star, animatedStyle]}>
      <ThemedText style={[styles.starText, { fontSize: star.size }]}>⭐</ThemedText>
    </Animated.View>
  );
};

export const WinningAnimation: React.FC<WinningAnimationProps> = ({
  visible,
  title = '🎉 Victory!',
  subtitle,
  onAnimationComplete,
}) => {
  const { theme } = useTheme();
  const containerScale = useSharedValue(0);
  const containerOpacity = useSharedValue(0);
  const trophyScale = useSharedValue(0);
  const trophyRotate = useSharedValue(-15);
  const titleScale = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.8);

  const [confetti] = React.useState(generateConfetti);
  const [stars] = React.useState(generateStars);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      containerOpacity.value = withTiming(1, { duration: 200 });
      containerScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      
      trophyScale.value = withDelay(
        200,
        withSpring(1, { damping: 8, stiffness: 80 })
      );
      trophyRotate.value = withDelay(
        200,
        withSequence(
          withSpring(10, { damping: 4, stiffness: 100 }),
          withSpring(-10, { damping: 4, stiffness: 100 }),
          withSpring(0, { damping: 8, stiffness: 100 })
        )
      );
      
      glowScale.value = withDelay(
        300,
        withRepeat(
          withSequence(
            withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.8, { duration: 800, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );
      
      titleScale.value = withDelay(
        500,
        withSpring(1, { damping: 10, stiffness: 100 })
      );
      
      subtitleOpacity.value = withDelay(
        800,
        withTiming(1, { duration: 400 })
      );

      if (onAnimationComplete) {
        setTimeout(() => {
          runOnJS(onAnimationComplete)();
        }, 1500);
      }
    } else {
      containerOpacity.value = withTiming(0, { duration: 200 });
      containerScale.value = 0;
      trophyScale.value = 0;
      titleScale.value = 0;
      subtitleOpacity.value = 0;
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: trophyScale.value },
      { rotate: `${trophyRotate.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, containerStyle]}>
          {confetti.map((piece) => (
            <ConfettiPieceComponent key={piece.id} piece={piece} />
          ))}
          
          <View style={styles.centerContent}>
            <Animated.View style={[styles.glowCircle, { backgroundColor: theme.primary + '30' }, glowStyle]} />
            
            <View style={styles.starsContainer}>
              {stars.map((star) => (
                <StarComponent key={star.id} star={star} theme={theme} />
              ))}
            </View>
            
            <Animated.View style={[styles.trophyContainer, trophyStyle]}>
              <ThemedText style={styles.trophy}>🏆</ThemedText>
            </Animated.View>
            
            <Animated.View style={titleStyle}>
            <ThemedText style={[styles.title, { color: theme.primary }]}>
              {title}
            </ThemedText>
          </Animated.View>
          
          {subtitle && (
            <Animated.View style={subtitleStyle}>
              <ThemedText style={[styles.subtitle, { color: theme.text }]}>
                {subtitle}
              </ThemedText>
            </Animated.View>
          )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    width: SCREEN_WIDTH * 0.9,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  starsContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    position: 'absolute',
  },
  starText: {
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  trophyContainer: {
    marginBottom: 20,
  },
  trophy: {
    fontSize: 100,
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 20,
    textAlign: 'center',
    opacity: 0.9,
  },
  confetti: {
    position: 'absolute',
    top: 0,
  },
});

export default WinningAnimation;
