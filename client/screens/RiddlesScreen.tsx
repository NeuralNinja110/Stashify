import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, ZoomIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { getApiUrl, apiRequest } from '@/lib/query-client';

type GameState = 'ready' | 'playing' | 'answered' | 'gameOver';

interface Riddle {
  question: string;
  answer: string;
  hint: string;
}

export default function RiddlesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [gameState, setGameState] = useState<GameState>('ready');
  const [riddles, setRiddles] = useState<Riddle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const cardScale = useSharedValue(1);

  const defaultRiddles: Riddle[] = [
    { question: "What has hands but can't clap?", answer: "clock", hint: "It tells time" },
    { question: "What has a head and a tail but no body?", answer: "coin", hint: "You use it to buy things" },
    { question: "What gets wetter the more it dries?", answer: "towel", hint: "You use it after bathing" },
    { question: "What can you catch but not throw?", answer: "cold", hint: "You might sneeze" },
    { question: "What has keys but no locks?", answer: "piano", hint: "It makes music" },
    { question: "What has one eye but can't see?", answer: "needle", hint: "Used for sewing" },
    { question: "What goes up but never comes down?", answer: "age", hint: "Everyone gets older" },
    { question: "What has a neck but no head?", answer: "bottle", hint: "You drink from it" },
  ];

  useEffect(() => {
    loadRiddles();
  }, []);

  const loadRiddles = async () => {
    setIsLoading(true);
    try {
      const userInterests = user?.interests || [];
      const interestsParam = userInterests.length > 0 ? `&interests=${encodeURIComponent(userInterests.join(','))}` : '';
      
      const response = await fetch(
        new URL(`/api/games/riddles?language=${user?.language || 'en'}&difficulty=easy${interestsParam}`, getApiUrl()).toString()
      );
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setRiddles(data);
          setIsLoading(false);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load riddles:', error);
    }
    setRiddles(defaultRiddles);
    setIsLoading(false);
  };

  const startGame = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setUserAnswer('');
    setShowHint(false);
    setIsCorrect(null);
    setGameState('playing');
  };

  const checkAnswer = () => {
    if (!userAnswer.trim()) return;

    const currentRiddle = riddles[currentIndex];
    const userInput = userAnswer.trim().toLowerCase();
    const correctAnswer = currentRiddle.answer.toLowerCase();
    
    const correct = userInput === correctAnswer || 
      userInput.includes(correctAnswer) || 
      correctAnswer.includes(userInput);

    setIsCorrect(correct);
    cardScale.value = withSpring(1.05, {}, () => {
      cardScale.value = withSpring(1);
    });

    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const hintPenalty = showHint ? 5 : 0;
      const streakBonus = streak * 5;
      setScore(prev => prev + 20 - hintPenalty + streakBonus);
      setStreak(prev => prev + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStreak(0);
    }

    setGameState('answered');
  };

  const nextRiddle = () => {
    if (currentIndex < riddles.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setShowHint(false);
      setIsCorrect(null);
      setGameState('playing');
    } else {
      endGame();
    }
  };

  const endGame = async () => {
    setGameState('gameOver');

    try {
      await apiRequest('POST', '/api/games/scores', {
        userId: user?.id || 'guest',
        gameType: 'riddles',
        score,
        level: currentIndex + 1,
        accuracy: (score / ((currentIndex + 1) * 20)) * 100,
        metadata: { riddlesSolved: currentIndex + 1 },
      });
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  const toggleHint = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowHint(!showHint);
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const currentRiddle = riddles[currentIndex] || defaultRiddles[0];

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + Spacing['2xl'],
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.exitButton} testID="button-exit">
          <Feather name="x" size={28} color={theme.text} />
        </Pressable>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t('games.score')}
            </ThemedText>
            <ThemedText type="h3">{score}</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Streak
            </ThemedText>
            <ThemedText type="h3">{streak}</ThemedText>
          </View>
        </View>
      </View>

      {gameState === 'ready' && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.readyState}>
          <ThemedText type="h2" style={styles.title}>
            {t('games.riddles')}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.instructions, { color: theme.textSecondary }]}
          >
            Solve riddles to exercise your brain! Each correct answer earns points. Build a streak for bonus points!
          </ThemedText>
          {user?.interests && user.interests.length > 0 && (
            <View style={[styles.personalizedBadge, { backgroundColor: theme.primary + '15' }]}>
              <Feather name="star" size={16} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.primary, marginLeft: Spacing.xs }}>
                Personalized for your interests
              </ThemedText>
            </View>
          )}
          <Button 
            onPress={startGame} 
            style={styles.startButton}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : t('games.startGame')}
          </Button>
        </Animated.View>
      )}

      {(gameState === 'playing' || gameState === 'answered') && (
        <View style={styles.gameArea}>
          <View style={styles.progressBar}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Riddle {currentIndex + 1} of {riddles.length}
            </ThemedText>
            <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSecondary }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${((currentIndex + 1) / riddles.length) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>

          <Animated.View
            style={[
              styles.riddleCard,
              { backgroundColor: theme.backgroundDefault },
              cardAnimatedStyle,
            ]}
          >
            <Feather name="help-circle" size={32} color={theme.primary} style={styles.riddleIcon} />
            <ThemedText type="h3" style={styles.riddleText}>
              {currentRiddle.question}
            </ThemedText>

            {showHint && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.hintBox}>
                <Feather name="info" size={16} color={theme.warning} />
                <ThemedText type="small" style={{ color: theme.warning, marginLeft: Spacing.sm }}>
                  Hint: {currentRiddle.hint}
                </ThemedText>
              </Animated.View>
            )}

            {gameState === 'playing' && !showHint && (
              <Pressable onPress={toggleHint} style={styles.hintButton}>
                <ThemedText type="small" style={{ color: theme.primary }}>
                  Need a hint? (-5 points)
                </ThemedText>
              </Pressable>
            )}
          </Animated.View>

          {gameState === 'playing' && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.answerSection}>
              <TextInput
                value={userAnswer}
                onChangeText={setUserAnswer}
                placeholder="Type your answer..."
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.answerInput,
                  {
                    backgroundColor: theme.backgroundDefault,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={checkAnswer}
                testID="input-answer"
              />
              <Button
                onPress={checkAnswer}
                disabled={!userAnswer.trim()}
                style={styles.checkButton}
              >
                Check Answer
              </Button>
            </Animated.View>
          )}

          {gameState === 'answered' && (
            <Animated.View entering={ZoomIn.duration(300)} style={styles.resultSection}>
              <View
                style={[
                  styles.resultCard,
                  {
                    backgroundColor: isCorrect
                      ? theme.success + '20'
                      : theme.error + '20',
                  },
                ]}
              >
                <Feather
                  name={isCorrect ? 'check-circle' : 'x-circle'}
                  size={48}
                  color={isCorrect ? theme.success : theme.error}
                />
                <ThemedText
                  type="h3"
                  style={{
                    color: isCorrect ? theme.success : theme.error,
                    marginTop: Spacing.md,
                  }}
                >
                  {isCorrect ? 'Correct!' : 'Not quite!'}
                </ThemedText>
                {!isCorrect && (
                  <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                    The answer was: {currentRiddle.answer}
                  </ThemedText>
                )}
              </View>
              <Button onPress={nextRiddle} style={styles.nextButton}>
                {currentIndex < riddles.length - 1 ? 'Next Riddle' : 'See Results'}
              </Button>
            </Animated.View>
          )}
        </View>
      )}

      {gameState === 'gameOver' && (
        <Animated.View entering={ZoomIn.duration(400)} style={styles.gameOverState}>
          <ThemedText type="h1" style={{ color: theme.primary }}>
            Well Done!
          </ThemedText>
          <ThemedText type="h2" style={styles.finalScore}>
            {t('games.score')}: {score}
          </ThemedText>
          <ThemedText type="body" style={[styles.riddlesSolved, { color: theme.textSecondary }]}>
            You solved {currentIndex + 1} riddles
          </ThemedText>
          <View style={styles.gameOverButtons}>
            <Button onPress={startGame} style={styles.playAgainButton}>
              {t('games.playAgain')}
            </Button>
            <Button
              onPress={() => navigation.goBack()}
              style={[styles.exitGameButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              Exit
            </Button>
          </View>
        </Animated.View>
      )}
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
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  exitButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing['2xl'],
  },
  statItem: {
    alignItems: 'center',
  },
  readyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  title: {
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  instructions: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  personalizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing['2xl'],
  },
  startButton: {
    minWidth: 200,
  },
  gameArea: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  progressBar: {
    marginBottom: Spacing.xl,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  riddleCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  riddleIcon: {
    marginBottom: Spacing.lg,
  },
  riddleText: {
    textAlign: 'center',
    lineHeight: 32,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  hintButton: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
  },
  answerSection: {
    gap: Spacing.lg,
  },
  answerInput: {
    height: 56,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    fontSize: 18,
    borderWidth: 2,
    textAlign: 'center',
  },
  checkButton: {},
  resultSection: {
    alignItems: 'center',
  },
  resultCard: {
    width: '100%',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  nextButton: {
    minWidth: 200,
  },
  gameOverState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  finalScore: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  riddlesSolved: {
    marginBottom: Spacing['3xl'],
  },
  gameOverButtons: {
    gap: Spacing.md,
    width: '100%',
  },
  playAgainButton: {},
  exitGameButton: {},
});
