import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';

const OBJECTS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🥝', '🍑', '🍒', '🥥', '🌽', '🥕', '🍆'];

interface GridCell {
  id: number;
  object: string;
  revealed: boolean;
  found: boolean;
}

type GameState = 'ready' | 'memorize' | 'playing' | 'gameOver';

export default function MemoryGridScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [gridSize, setGridSize] = useState(3);
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [targetObject, setTargetObject] = useState('');
  const [gameState, setGameState] = useState<GameState>('ready');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(5);
  const [wrongAttempts, setWrongAttempts] = useState(0);

  const initializeGame = useCallback(() => {
    const totalCells = gridSize * gridSize;
    const objectCount = Math.min(Math.floor(totalCells / 2), 7);
    const selectedObjects = OBJECTS.slice(0, objectCount);
    
    const cells: GridCell[] = [];
    const positions = new Set<number>();
    
    selectedObjects.forEach((obj, index) => {
      let pos: number;
      do {
        pos = Math.floor(Math.random() * totalCells);
      } while (positions.has(pos));
      positions.add(pos);
    });

    for (let i = 0; i < totalCells; i++) {
      cells.push({
        id: i,
        object: '',
        revealed: false,
        found: false,
      });
    }

    const posArray = Array.from(positions);
    posArray.forEach((pos, index) => {
      cells[pos].object = selectedObjects[index];
    });

    setGrid(cells);
    setTargetObject(selectedObjects[Math.floor(Math.random() * selectedObjects.length)]);
    setWrongAttempts(0);
  }, [gridSize]);

  useEffect(() => {
    if (gameState === 'ready') {
      initializeGame();
    }
  }, [gameState, initializeGame]);

  useEffect(() => {
    if (gameState === 'memorize') {
      const timer = setTimeout(() => {
        setGrid((prev) =>
          prev.map((cell) => ({ ...cell, revealed: false }))
        );
        setGameState('playing');
      }, 3000 + level * 500);
      return () => clearTimeout(timer);
    }
  }, [gameState, level]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && timeLeft === 0) {
      setGameState('gameOver');
    }
  }, [gameState, timeLeft]);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGrid((prev) =>
      prev.map((cell) => ({
        ...cell,
        revealed: cell.object !== '',
      }))
    );
    setGameState('memorize');
    setTimeLeft(15 + level * 5);
  };

  const handleCellPress = (cell: GridCell) => {
    if (gameState !== 'playing' || cell.found) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (cell.object === targetObject) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setGrid((prev) =>
        prev.map((c) =>
          c.id === cell.id ? { ...c, found: true, revealed: true } : c
        )
      );
      setScore((s) => s + (10 * level) - (wrongAttempts * 2));
      
      const remaining = grid.filter(
        (c) => c.object === targetObject && !c.found && c.id !== cell.id
      );
      
      if (remaining.length === 0) {
        const availableObjects = grid
          .filter((c) => c.object && !c.found && c.object !== targetObject)
          .map((c) => c.object);
        
        if (availableObjects.length > 0) {
          setTargetObject(
            availableObjects[Math.floor(Math.random() * availableObjects.length)]
          );
          setWrongAttempts(0);
        } else {
          setLevel((l) => l + 1);
          if (level < 4) {
            setGridSize((s) => Math.min(s + 1, 6));
          }
          setGameState('ready');
        }
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setWrongAttempts((w) => w + 1);
      setGrid((prev) =>
        prev.map((c) =>
          c.id === cell.id ? { ...c, revealed: true } : c
        )
      );
      setTimeout(() => {
        setGrid((prev) =>
          prev.map((c) =>
            c.id === cell.id && !c.found ? { ...c, revealed: false } : c
          )
        );
      }, 500);
    }
  };

  const handlePlayAgain = () => {
    setScore(0);
    setLevel(1);
    setGridSize(3);
    setGameState('ready');
  };

  const handleExit = () => {
    navigation.goBack();
  };

  const renderCell = (cell: GridCell) => (
    <Pressable
      key={cell.id}
      onPress={() => handleCellPress(cell)}
      style={[
        styles.cell,
        {
          backgroundColor: cell.found
            ? theme.success + '30'
            : cell.revealed
            ? theme.backgroundDefault
            : theme.backgroundSecondary,
          borderColor: cell.found ? theme.success : theme.border,
          width: `${100 / gridSize - 2}%`,
        },
      ]}
    >
      {(cell.revealed || cell.found) && cell.object ? (
        <ThemedText style={styles.cellEmoji}>{cell.object}</ThemedText>
      ) : null}
    </Pressable>
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
        <Pressable onPress={handleExit} style={styles.exitButton} testID="button-exit">
          <Feather name="x" size={28} color={theme.text} />
        </Pressable>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t('games.level')}
            </ThemedText>
            <ThemedText type="h3">{level}</ThemedText>
          </View>
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
                style={{ color: timeLeft <= 5 ? theme.error : theme.text }}
              >
                {timeLeft}s
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      {gameState === 'ready' && (
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.readyState}
        >
          <ThemedText type="h2" style={styles.title}>
            {t('games.memoryGrid')}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.instructions, { color: theme.textSecondary }]}
          >
            Memorize the positions of objects, then find them!
          </ThemedText>
          <Button onPress={handleStart} style={styles.startButton}>
            {t('games.startGame')}
          </Button>
        </Animated.View>
      )}

      {(gameState === 'memorize' || gameState === 'playing') && (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.gameArea}>
          {gameState === 'playing' && (
            <View style={styles.targetSection}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Find:
              </ThemedText>
              <View
                style={[
                  styles.targetBox,
                  { backgroundColor: theme.primary + '20' },
                ]}
              >
                <ThemedText style={styles.targetEmoji}>{targetObject}</ThemedText>
              </View>
            </View>
          )}
          
          {gameState === 'memorize' && (
            <ThemedText
              type="h3"
              style={[styles.memorizeText, { color: theme.primary }]}
            >
              Memorize the positions!
            </ThemedText>
          )}

          <View style={styles.grid}>
            {grid.map(renderCell)}
          </View>
        </Animated.View>
      )}

      {gameState === 'gameOver' && (
        <Animated.View
          entering={ZoomIn.duration(400)}
          style={styles.gameOverState}
        >
          <ThemedText type="h1" style={{ color: theme.primary }}>
            {t('games.gameOver')}
          </ThemedText>
          <ThemedText type="h2" style={styles.finalScore}>
            {t('games.score')}: {score}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.levelReached, { color: theme.textSecondary }]}
          >
            Level {level} reached
          </ThemedText>
          <View style={styles.gameOverButtons}>
            <Button onPress={handlePlayAgain} style={styles.playAgainButton}>
              {t('games.playAgain')}
            </Button>
            <Button
              onPress={handleExit}
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
    marginBottom: Spacing['2xl'],
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
  targetSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  targetBox: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  targetEmoji: {
    fontSize: 32,
  },
  memorizeText: {
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  cell: {
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmoji: {
    fontSize: 28,
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
  levelReached: {
    marginBottom: Spacing['3xl'],
  },
  gameOverButtons: {
    gap: Spacing.md,
    width: '100%',
  },
  playAgainButton: {},
  exitGameButton: {},
});
