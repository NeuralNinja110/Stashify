import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, TextInput, Pressable, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { getApiUrl, apiRequest } from '@/lib/query-client';

type GameState = 'ready' | 'playing' | 'gameOver';

interface WordEntry {
  word: string;
  isUser: boolean;
  isValid: boolean;
}

export default function WordChainScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [gameState, setGameState] = useState<GameState>('ready');
  const [words, setWords] = useState<WordEntry[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [inputWord, setInputWord] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());

  const startingWords = ['apple', 'elephant', 'tree', 'garden', 'night', 'table', 'house', 'earth'];

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && timeLeft === 0) {
      endGame();
    }
  }, [gameState, timeLeft]);

  const startGame = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const startWord = startingWords[Math.floor(Math.random() * startingWords.length)];
    setWords([{ word: startWord, isUser: false, isValid: true }]);
    setCurrentWord(startWord);
    setUsedWords(new Set([startWord.toLowerCase()]));
    setScore(0);
    setTimeLeft(60);
    setGameState('playing');
    setErrorMessage('');
  };

  const validateAndSubmitWord = async () => {
    if (!inputWord.trim() || isValidating) return;

    const word = inputWord.trim().toLowerCase();
    setIsValidating(true);
    setErrorMessage('');

    // Check if word starts with correct letter
    const requiredLetter = currentWord.slice(-1).toLowerCase();
    if (word.charAt(0) !== requiredLetter) {
      setErrorMessage(`Word must start with "${requiredLetter.toUpperCase()}"`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsValidating(false);
      return;
    }

    // Check if word already used
    if (usedWords.has(word)) {
      setErrorMessage('This word has already been used!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsValidating(false);
      return;
    }

    // Check minimum length
    if (word.length < 3) {
      setErrorMessage('Word must be at least 3 letters');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsValidating(false);
      return;
    }

    try {
      const response = await fetch(new URL('/api/games/wordchain/validate', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word,
          previousWord: currentWord,
          language: user?.language || 'en',
        }),
      });

      const result = await response.json();

      if (result.valid) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        const userEntry: WordEntry = { word: inputWord.trim(), isUser: true, isValid: true };
        setWords(prev => [...prev, userEntry]);
        setUsedWords(prev => new Set([...prev, word]));
        setCurrentWord(word);
        setScore(prev => prev + (word.length * 10));
        setInputWord('');

        // AI responds with a word
        setTimeout(() => generateAIWord(word), 500);
      } else {
        setErrorMessage(result.reason || 'Not a valid word');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      // On error, accept the word
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const userEntry: WordEntry = { word: inputWord.trim(), isUser: true, isValid: true };
      setWords(prev => [...prev, userEntry]);
      setUsedWords(prev => new Set([...prev, word]));
      setCurrentWord(word);
      setScore(prev => prev + (word.length * 10));
      setInputWord('');
      setTimeout(() => generateAIWord(word), 500);
    }

    setIsValidating(false);
  };

  const generateAIWord = async (lastWord: string) => {
    const lastLetter = lastWord.slice(-1).toLowerCase();
    
    // Simple AI word generation - find a word starting with the last letter
    const commonWords: Record<string, string[]> = {
      'a': ['apple', 'ant', 'arrow', 'animal', 'air'],
      'b': ['ball', 'bird', 'book', 'bread', 'bright'],
      'c': ['cat', 'car', 'cloud', 'cake', 'chair'],
      'd': ['dog', 'door', 'day', 'dance', 'dream'],
      'e': ['egg', 'elephant', 'earth', 'eye', 'eagle'],
      'f': ['fish', 'flower', 'fire', 'friend', 'forest'],
      'g': ['garden', 'green', 'gift', 'game', 'gold'],
      'h': ['house', 'heart', 'hand', 'happy', 'hope'],
      'i': ['ice', 'island', 'idea', 'ink', 'iron'],
      'j': ['jungle', 'joy', 'jump', 'jar', 'juice'],
      'k': ['king', 'kite', 'key', 'kind', 'kitchen'],
      'l': ['love', 'light', 'leaf', 'lion', 'lake'],
      'm': ['moon', 'morning', 'music', 'mountain', 'mother'],
      'n': ['night', 'nature', 'name', 'nest', 'nice'],
      'o': ['orange', 'ocean', 'open', 'owl', 'old'],
      'p': ['peace', 'picture', 'plant', 'paper', 'purple'],
      'q': ['queen', 'quiet', 'quick', 'quilt', 'question'],
      'r': ['rain', 'river', 'rose', 'road', 'rainbow'],
      's': ['sun', 'star', 'song', 'sweet', 'smile'],
      't': ['tree', 'table', 'time', 'tiger', 'train'],
      'u': ['umbrella', 'uncle', 'universe', 'unique', 'up'],
      'v': ['village', 'valley', 'voice', 'visit', 'view'],
      'w': ['water', 'wind', 'world', 'winter', 'warm'],
      'x': ['xylophone', 'x-ray'],
      'y': ['yellow', 'year', 'young', 'yesterday', 'yoga'],
      'z': ['zebra', 'zero', 'zone', 'zoo', 'zip'],
    };

    const possibleWords = commonWords[lastLetter] || ['unknown'];
    const validWords = possibleWords.filter(w => !usedWords.has(w.toLowerCase()));
    
    if (validWords.length === 0) {
      // AI can't find a word, player wins bonus
      setScore(prev => prev + 50);
      return;
    }

    const aiWord = validWords[Math.floor(Math.random() * validWords.length)];
    const aiEntry: WordEntry = { word: aiWord, isUser: false, isValid: true };
    setWords(prev => [...prev, aiEntry]);
    setUsedWords(prev => new Set([...prev, aiWord.toLowerCase()]));
    setCurrentWord(aiWord);
  };

  const endGame = async () => {
    setGameState('gameOver');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Save score
    try {
      await apiRequest('POST', '/api/games/scores', {
        userId: user?.id || 'guest',
        gameType: 'word-chain',
        score,
        level: Math.floor(words.length / 5) + 1,
        metadata: { wordsPlayed: words.length },
      });
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  const renderWordItem = ({ item, index }: { item: WordEntry; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(200)}
      style={[
        styles.wordItem,
        {
          backgroundColor: item.isUser ? theme.primary + '20' : theme.backgroundDefault,
          alignSelf: item.isUser ? 'flex-end' : 'flex-start',
        },
      ]}
    >
      <ThemedText type="body" style={{ color: item.isUser ? theme.primary : theme.text }}>
        {item.word}
      </ThemedText>
    </Animated.View>
  );

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
          {gameState === 'playing' && (
            <View style={styles.statItem}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t('games.time')}
              </ThemedText>
              <ThemedText
                type="h3"
                style={{ color: timeLeft <= 10 ? theme.error : theme.text }}
              >
                {timeLeft}s
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      {gameState === 'ready' && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.readyState}>
          <ThemedText type="h2" style={styles.title}>
            {t('games.wordChain')}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.instructions, { color: theme.textSecondary }]}
          >
            Continue the word chain! Each word must start with the last letter of the previous word.
          </ThemedText>
          <Button onPress={startGame} style={styles.startButton}>
            {t('games.startGame')}
          </Button>
        </Animated.View>
      )}

      {gameState === 'playing' && (
        <View style={styles.gameArea}>
          <View style={styles.currentWordBox}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Current word ends with:
            </ThemedText>
            <View style={[styles.letterBox, { backgroundColor: theme.primary }]}>
              <ThemedText type="h1" style={{ color: '#FFFFFF' }}>
                {currentWord.slice(-1).toUpperCase()}
              </ThemedText>
            </View>
          </View>

          <FlatList
            data={words}
            renderItem={renderWordItem}
            keyExtractor={(item, index) => `${item.word}-${index}`}
            contentContainerStyle={styles.wordsList}
            showsVerticalScrollIndicator={false}
            style={styles.wordsListContainer}
          />

          {errorMessage ? (
            <ThemedText type="small" style={[styles.errorText, { color: theme.error }]}>
              {errorMessage}
            </ThemedText>
          ) : null}

          <View style={styles.inputRow}>
            <TextInput
              value={inputWord}
              onChangeText={setInputWord}
              placeholder={`Type a word starting with "${currentWord.slice(-1).toUpperCase()}"...`}
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={validateAndSubmitWord}
              testID="input-word"
            />
            <Pressable
              onPress={validateAndSubmitWord}
              disabled={!inputWord.trim() || isValidating}
              style={[
                styles.submitButton,
                {
                  backgroundColor:
                    inputWord.trim() && !isValidating
                      ? theme.primary
                      : theme.backgroundSecondary,
                },
              ]}
              testID="button-submit"
            >
              <Feather
                name={isValidating ? 'loader' : 'check'}
                size={24}
                color={inputWord.trim() && !isValidating ? '#FFFFFF' : theme.textSecondary}
              />
            </Pressable>
          </View>
        </View>
      )}

      {gameState === 'gameOver' && (
        <Animated.View entering={ZoomIn.duration(400)} style={styles.gameOverState}>
          <ThemedText type="h1" style={{ color: theme.primary }}>
            {t('games.gameOver')}
          </ThemedText>
          <ThemedText type="h2" style={styles.finalScore}>
            {t('games.score')}: {score}
          </ThemedText>
          <ThemedText type="body" style={[styles.wordsPlayed, { color: theme.textSecondary }]}>
            {words.length} words played
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
    marginBottom: Spacing['3xl'],
  },
  startButton: {
    minWidth: 200,
  },
  gameArea: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  currentWordBox: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  letterBox: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  wordsListContainer: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  wordsList: {
    paddingVertical: Spacing.md,
  },
  wordItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    maxWidth: '70%',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    height: 56,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    fontSize: 18,
    borderWidth: 2,
  },
  submitButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
  wordsPlayed: {
    marginBottom: Spacing['3xl'],
  },
  gameOverButtons: {
    gap: Spacing.md,
    width: '100%',
  },
  playAgainButton: {},
  exitGameButton: {},
});
