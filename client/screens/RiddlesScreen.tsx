import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, ZoomIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { WinningAnimation } from '@/components/WinningAnimation';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { getApiUrl, apiRequest } from '@/lib/query-client';

type GameState = 'ready' | 'playing' | 'answered' | 'roundComplete' | 'gameOver';

const RIDDLES_PER_ROUND = 5;
const RIDDLES_CACHE_KEY = 'stashify_riddles_cache';

interface Riddle {
  question: string;
  answer: string;
  hint: string;
}

interface RiddlesCache {
  date: string;
  riddles: Riddle[];
  usedIndices: number[];
}

export default function RiddlesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [gameState, setGameState] = useState<GameState>('ready');
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [riddles, setRiddles] = useState<Riddle[]>([]);
  const [roundRiddles, setRoundRiddles] = useState<Riddle[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [usedIndices, setUsedIndices] = useState<number[]>([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundScore, setRoundScore] = useState(0);

  const cardScale = useSharedValue(1);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadRiddles();
  }, []);

  const loadRiddles = async () => {
    setIsLoading(true);
    try {
      // Check for cached riddles from today
      const cachedData = await AsyncStorage.getItem(RIDDLES_CACHE_KEY);
      if (cachedData) {
        const cache: RiddlesCache = JSON.parse(cachedData);
        if (cache.date === getTodayDate() && cache.riddles.length >= 10) {
          setRiddles(cache.riddles);
          setUsedIndices(cache.usedIndices || []);
          setIsLoading(false);
          return;
        }
      }

      // Fetch new riddles from API
      const userInterests = user?.interests || [];
      const interestsParam = userInterests.length > 0 ? `&interests=${encodeURIComponent(userInterests.join(','))}` : '';
      
      const response = await fetch(
        new URL(`/api/games/riddles?language=${user?.language || 'en'}&difficulty=easy${interestsParam}`, getApiUrl()).toString()
      );
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setRiddles(data);
          setUsedIndices([]);
          // Cache the riddles for today
          await AsyncStorage.setItem(RIDDLES_CACHE_KEY, JSON.stringify({
            date: getTodayDate(),
            riddles: data,
            usedIndices: [],
          }));
          setIsLoading(false);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load riddles:', error);
    }
    setIsLoading(false);
  };

  const getNextRoundRiddles = (allRiddles: Riddle[], used: number[]): { roundRiddles: Riddle[], newUsedIndices: number[] } => {
    let availableIndices = allRiddles.map((_, i) => i).filter(i => !used.includes(i));
    
    // If not enough unused riddles, reset and reshuffle
    if (availableIndices.length < RIDDLES_PER_ROUND) {
      availableIndices = allRiddles.map((_, i) => i);
      used = [];
    }
    
    // Shuffle available indices and take first RIDDLES_PER_ROUND
    const shuffledIndices = shuffleArray(availableIndices).slice(0, RIDDLES_PER_ROUND);
    const roundRiddles = shuffledIndices.map(i => allRiddles[i]);
    const newUsedIndices = [...used, ...shuffledIndices];
    
    return { roundRiddles, newUsedIndices };
  };

  const saveUsedIndices = async (indices: number[]) => {
    try {
      const cachedData = await AsyncStorage.getItem(RIDDLES_CACHE_KEY);
      if (cachedData) {
        const cache: RiddlesCache = JSON.parse(cachedData);
        cache.usedIndices = indices;
        await AsyncStorage.setItem(RIDDLES_CACHE_KEY, JSON.stringify(cache));
      }
    } catch (error) {
      console.error('Failed to save used indices:', error);
    }
  };

  const startGame = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { roundRiddles: newRoundRiddles, newUsedIndices } = getNextRoundRiddles(riddles, usedIndices);
    setRoundRiddles(newRoundRiddles);
    setUsedIndices(newUsedIndices);
    saveUsedIndices(newUsedIndices);
    setCurrentRoundIndex(0);
    setScore(0);
    setRoundScore(0);
    setStreak(0);
    setUserAnswer('');
    setShowHint(false);
    setIsCorrect(null);
    setRoundNumber(1);
    setGameState('playing');
  };

  const continueGame = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { roundRiddles: newRoundRiddles, newUsedIndices } = getNextRoundRiddles(riddles, usedIndices);
    setRoundRiddles(newRoundRiddles);
    setUsedIndices(newUsedIndices);
    saveUsedIndices(newUsedIndices);
    setCurrentRoundIndex(0);
    setRoundScore(0);
    setUserAnswer('');
    setShowHint(false);
    setIsCorrect(null);
    setRoundNumber(prev => prev + 1);
    setGameState('playing');
  };

  const checkAnswer = () => {
    if (!userAnswer.trim()) return;

    const riddle = roundRiddles[currentRoundIndex];
    if (!riddle) return;
    const userInput = userAnswer.trim().toLowerCase();
    const correctAnswer = riddle.answer.toLowerCase();
    
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
      const pointsEarned = 20 - hintPenalty + streakBonus;
      setScore(prev => prev + pointsEarned);
      setRoundScore(prev => prev + pointsEarned);
      setStreak(prev => prev + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStreak(0);
    }

    setGameState('answered');
  };

  const nextRiddle = () => {
    if (currentRoundIndex < RIDDLES_PER_ROUND - 1) {
      // More riddles in this round
      setCurrentRoundIndex(prev => prev + 1);
      setUserAnswer('');
      setShowHint(false);
      setIsCorrect(null);
      setGameState('playing');
    } else {
      // Completed this round of 5 riddles - ask if user wants to continue
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setGameState('roundComplete');
    }
  };

  const endGame = async () => {
    setGameState('gameOver');
    
    // Show winning animation for score 50+
    if (score >= 50) {
      setShowWinAnimation(true);
    }

    const totalRiddlesSolved = (roundNumber - 1) * RIDDLES_PER_ROUND + currentRoundIndex + 1;
    try {
      await apiRequest('POST', '/api/games/scores', {
        userId: user?.id || 'guest',
        gameType: 'riddles',
        score,
        level: roundNumber,
        accuracy: score > 0 ? (score / (totalRiddlesSolved * 20)) * 100 : 0,
        metadata: { riddlesSolved: totalRiddlesSolved, rounds: roundNumber },
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

  const currentRiddle = roundRiddles[currentRoundIndex] || { question: '', answer: '', hint: '' };

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
              Riddle {currentRoundIndex + 1} of {RIDDLES_PER_ROUND} (Round {roundNumber})
            </ThemedText>
            <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSecondary }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${((currentRoundIndex + 1) / RIDDLES_PER_ROUND) * 100}%`,
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
                {currentRoundIndex < RIDDLES_PER_ROUND - 1 ? 'Next Riddle' : 'Finish Round'}
              </Button>
            </Animated.View>
          )}
        </View>
      )}

      {gameState === 'roundComplete' && (
        <Animated.View entering={ZoomIn.duration(400)} style={styles.roundCompleteState}>
          <Feather name="award" size={64} color={theme.primary} />
          <ThemedText type="h2" style={[styles.roundCompleteTitle, { color: theme.primary }]}>
            Round {roundNumber} Complete!
          </ThemedText>
          <View style={[styles.roundScoreCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.roundScoreRow}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>Round Score</ThemedText>
              <ThemedText type="h3">{roundScore}</ThemedText>
            </View>
            <View style={styles.roundScoreRow}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>Total Score</ThemedText>
              <ThemedText type="h3" style={{ color: theme.primary }}>{score}</ThemedText>
            </View>
            <View style={styles.roundScoreRow}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>Current Streak</ThemedText>
              <ThemedText type="h3">{streak}</ThemedText>
            </View>
          </View>
          <ThemedText type="body" style={[styles.continuePrompt, { color: theme.textSecondary }]}>
            Ready for another round of 5 riddles?
          </ThemedText>
          <View style={styles.roundCompleteButtons}>
            <Button onPress={continueGame} style={styles.continueButton}>
              Continue Playing
            </Button>
            <Button
              onPress={endGame}
              style={[styles.stopButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              I'm Done
            </Button>
          </View>
        </Animated.View>
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
            You completed {roundNumber} round{roundNumber > 1 ? 's' : ''} ({roundNumber * RIDDLES_PER_ROUND} riddles)
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

      <WinningAnimation
        visible={showWinAnimation}
        title="Brilliant!"
        subtitle={`You scored ${score} points!`}
        onAnimationComplete={() => setShowWinAnimation(false)}
      />
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
  roundCompleteState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  roundCompleteTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  roundScoreCard: {
    width: '100%',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  roundScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  continuePrompt: {
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  roundCompleteButtons: {
    gap: Spacing.md,
    width: '100%',
  },
  continueButton: {},
  stopButton: {},
});
