import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, Pressable, Image, Dimensions } from 'react-native';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [objectsToFind, setObjectsToFind] = useState<string[]>([]);
  const [foundCount, setFoundCount] = useState(0);
  const [totalToFind, setTotalToFind] = useState(0);

  const initializeGame = useCallback(() => {
    const totalCells = gridSize * gridSize;
    const objectCount = Math.min(Math.floor(totalCells / 2), 6);
    const shuffledObjects = [...OBJECTS].sort(() => Math.random() - 0.5);
    const selectedObjects = shuffledObjects.slice(0, objectCount);
    
    const cells: GridCell[] = [];
    for (let i = 0; i < totalCells; i++) {
      cells.push({
        id: i,
        object: '',
        revealed: false,
        found: false,
      });
    }
    
    const usedPositions = new Set<number>();
    selectedObjects.forEach((obj) => {
      let pos: number;
      do {
        pos = Math.floor(Math.random() * totalCells);
      } while (usedPositions.has(pos));
      usedPositions.add(pos);
      cells[pos].object = obj;
    });

    const firstTarget = selectedObjects[0];
    setGrid(cells);
    setObjectsToFind(selectedObjects);
    setTargetObject(firstTarget);
    setFoundCount(0);
    setTotalToFind(selectedObjects.length);
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
    if (gameState !== 'playing' || cell.found || cell.revealed) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (cell.object === targetObject) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setGrid((prev) =>
        prev.map((c) =>
          c.id === cell.id ? { ...c, found: true, revealed: true } : c
        )
      );
      
      const points = Math.max(10 * level - wrongAttempts * 2, 5);
      setScore((s) => s + points);
      
      const newFoundCount = foundCount + 1;
      setFoundCount(newFoundCount);
      
      if (newFoundCount >= totalToFind) {
        setTimeout(() => {
          setLevel((l) => l + 1);
          if (level < 5) {
            setGridSize((s) => Math.min(s + 1, 5));
          }
          setGameState('ready');
        }, 800);
      } else {
        const remainingObjects = objectsToFind.filter((obj, idx) => {
          const foundInGrid = grid.find(c => c.object === obj && c.found);
          return !foundInGrid && obj !== targetObject;
        });
        
        if (remainingObjects.length > 0) {
          const nextTarget = remainingObjects[Math.floor(Math.random() * remainingObjects.length)];
          setTargetObject(nextTarget);
          setWrongAttempts(0);
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
      }, 600);
    }
  };

  const handlePlayAgain = () => {
    setScore(0);
    setLevel(1);
    setGridSize(3);
    setFoundCount(0);
    setTotalToFind(0);
    setObjectsToFind([]);
    setGameState('ready');
  };

  const handleExit = () => {
    navigation.goBack();
  };

  const cellSize = useMemo(() => {
    const gridPadding = Spacing.xl * 2;
    const gap = Spacing.sm;
    const availableWidth = SCREEN_WIDTH - gridPadding;
    const totalGaps = (gridSize - 1) * gap;
    return Math.floor((availableWidth - totalGaps) / gridSize);
  }, [gridSize]);

  const emojiSize = useMemo(() => {
    return Math.min(cellSize * 0.6, 48);
  }, [cellSize]);

  const renderCell = (cell: GridCell) => (
    <View
      key={cell.id}
      style={[
        styles.cell,
        {
          backgroundColor: cell.found
            ? theme.success + '20'
            : cell.revealed
            ? theme.primary + '10'
            : theme.backgroundSecondary,
          borderColor: cell.found ? theme.success : theme.border,
          width: cellSize,
          height: cellSize,
          shadowColor: theme.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
      ]}
    >
      <Pressable
        onPress={() => handleCellPress(cell)}
        style={styles.cellPressable}
      >
        {(cell.revealed || cell.found) && cell.object ? (
          <ThemedText style={{ fontSize: emojiSize, lineHeight: emojiSize * 1.2 }}>
            {cell.object}
          </ThemedText>
        ) : (
          <View style={[styles.cellPlaceholder, { backgroundColor: theme.border + '40' }]} />
        )}
      </Pressable>
    </View>
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
              <View style={[styles.progressBadge, { backgroundColor: theme.success + '20' }]}>
                <ThemedText type="small" style={{ color: theme.success }}>
                  {foundCount}/{totalToFind}
                </ThemedText>
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
  progressBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.sm,
  },
  memorizeText: {
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cell: {
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    overflow: 'hidden',
  },
  cellPressable: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
  },
  cellEmoji: {
    fontSize: 32,
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
