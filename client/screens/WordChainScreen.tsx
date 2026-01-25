import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  FadeOut, 
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { getApiUrl, apiRequest } from '@/lib/query-client';

type GamePhase = 'lobby' | 'waiting' | 'selecting' | 'memorizing' | 'recalling' | 'gameOver';

interface Player {
  id: string;
  name: string;
  score: number;
}

interface GameState {
  wordChain: string[];
  currentTurn: number;
  player1: Player | null;
  player2: Player | null;
  phase: string;
  wordOptions: string[];
  showWords: boolean;
  currentRecallIndex: number;
  winner: string | null;
  failedPlayer: number | null;
}

export default function WordChainScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [memorizeCountdown, setMemorizeCountdown] = useState(0);
  const [recalledWords, setRecalledWords] = useState<string[]>([]);
  const [shuffledRecallOptions, setShuffledRecallOptions] = useState<string[]>([]);
  
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cardScale = useSharedValue(1);

  const playerNum = gameState?.player1?.id === user?.id ? 1 : 2;
  const isMyTurn = gameState?.currentTurn === playerNum;
  const myPlayer = playerNum === 1 ? gameState?.player1 : gameState?.player2;
  const opponent = playerNum === 1 ? gameState?.player2 : gameState?.player1;

  const startPolling = useCallback((sid: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(
          new URL(`/api/games/wordchain/rooms/${sid}`, getApiUrl()).toString()
        );
        if (response.ok) {
          const data = await response.json();
          setGameState(data.gameState);
          
          const serverPhase = data.gameState.phase;
          if (serverPhase === 'waiting') setPhase('waiting');
          else if (serverPhase === 'selecting') setPhase('selecting');
          else if (serverPhase === 'memorizing') setPhase('memorizing');
          else if (serverPhase === 'recalling') setPhase('recalling');
          else if (serverPhase === 'gameOver') setPhase('gameOver');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  useEffect(() => {
    if (phase === 'memorizing' && isMyTurn && gameState?.showWords) {
      const wordsToMemorize = gameState.wordChain.length;
      const countdown = Math.min(3 + wordsToMemorize, 10);
      setMemorizeCountdown(countdown);
      
      const timer = setInterval(() => {
        setMemorizeCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleReadyToRecall();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [phase, isMyTurn, gameState?.showWords, gameState?.wordChain.length]);

  const createRoom = async () => {
    if (!user?.id || !user?.name) {
      setError('Please log in first');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        new URL('/api/games/wordchain/rooms', getApiUrl()).toString(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, playerName: user.name }),
        }
      );
      
      if (!response.ok) throw new Error('Failed to create room');
      
      const data = await response.json();
      setRoomCode(data.roomCode);
      setSessionId(data.sessionId);
      setGameState(data.gameState);
      setPhase('waiting');
      startPolling(data.sessionId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError('Failed to create room. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!user?.id || !user?.name) {
      setError('Please log in first');
      return;
    }
    
    if (!joinCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        new URL('/api/games/wordchain/rooms/join', getApiUrl()).toString(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            roomCode: joinCode.toUpperCase(), 
            userId: user.id, 
            playerName: user.name 
          }),
        }
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join room');
      }
      
      const data = await response.json();
      setRoomCode(data.roomCode);
      setSessionId(data.sessionId);
      setGameState(data.gameState);
      setPhase('selecting');
      startPolling(data.sessionId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectWord = async (word: string) => {
    if (!sessionId || !user?.id) return;
    
    try {
      const response = await fetch(
        new URL(`/api/games/wordchain/rooms/${sessionId}/move`, getApiUrl()).toString(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, action: 'select', selectedWord: word }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setGameState(data.gameState);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        cardScale.value = withSequence(withSpring(1.1), withSpring(1));
      }
    } catch (err) {
      console.error('Select word error:', err);
    }
  };

  const handleReadyToRecall = async () => {
    if (!sessionId || !user?.id || !gameState) return;
    
    // Shuffle the chain words for recall options
    const shuffled = [...gameState.wordChain].sort(() => Math.random() - 0.5);
    setShuffledRecallOptions(shuffled);
    
    try {
      const response = await fetch(
        new URL(`/api/games/wordchain/rooms/${sessionId}/move`, getApiUrl()).toString(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, action: 'ready_to_recall' }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setGameState(data.gameState);
        setRecalledWords([]);
      }
    } catch (err) {
      console.error('Ready to recall error:', err);
    }
  };

  const recallWord = async (word: string) => {
    if (!sessionId || !user?.id) return;
    
    try {
      const response = await fetch(
        new URL(`/api/games/wordchain/rooms/${sessionId}/move`, getApiUrl()).toString(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, action: 'recall', recalledWord: word }),
        }
      );
      
      const data = await response.json();
      setGameState(data.gameState);
      
      if (data.result === 'wrong') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPhase('gameOver');
        
        // Save score to leaderboard
        const myScore = data.gameState.player1?.id === user?.id 
          ? data.gameState.player1?.score || 0 
          : data.gameState.player2?.score || 0;
        try {
          await apiRequest('POST', '/api/games/scores', {
            userId: user?.id || 'guest',
            gameType: 'word-chain',
            score: myScore,
            level: 1,
            metadata: { chainLength: data.gameState.wordChain?.length || 0 },
          });
        } catch (error) {
          console.error('Failed to save score:', error);
        }
      } else {
        setRecalledWords(prev => [...prev, word]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Recall word error:', err);
    }
  };

  const leaveGame = async () => {
    if (sessionId && user?.id) {
      try {
        await fetch(
          new URL(`/api/games/wordchain/rooms/${sessionId}/leave`, getApiUrl()).toString(),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          }
        );
      } catch (err) {
        console.error('Leave game error:', err);
      }
    }
    stopPolling();
    navigation.goBack();
  };

  const playAgain = () => {
    stopPolling();
    setPhase('lobby');
    setRoomCode('');
    setJoinCode('');
    setSessionId(null);
    setGameState(null);
    setError('');
    setRecalledWords([]);
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const renderLobby = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.lobbyContainer}>
      <ThemedText type="h2" style={styles.title}>
        {t('games.wordChain')}
      </ThemedText>
      <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
        A memory chain game for 2 players. Take turns adding words and recalling the entire chain!
      </ThemedText>

      {error ? (
        <ThemedText type="small" style={[styles.errorText, { color: theme.error }]}>
          {error}
        </ThemedText>
      ) : null}

      <View style={styles.lobbyButtons}>
        <Button 
          onPress={createRoom} 
          style={styles.lobbyButton}
          disabled={isLoading}
        >
          Create Room
        </Button>
        
        <ThemedText type="body" style={[styles.orText, { color: theme.textSecondary }]}>
          — or —
        </ThemedText>
        
        <TextInput
          value={joinCode}
          onChangeText={setJoinCode}
          placeholder="Enter Room Code"
          placeholderTextColor={theme.textSecondary}
          style={[styles.codeInput, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          autoCapitalize="characters"
          maxLength={6}
        />
        
        <Button 
          onPress={joinRoom} 
          style={[styles.lobbyButton, { backgroundColor: theme.accent }]}
          disabled={isLoading}
        >
          Join Room
        </Button>
      </View>
    </Animated.View>
  );

  const renderWaiting = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.waitingContainer}>
      <View style={[styles.codeCard, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Room Code
        </ThemedText>
        <ThemedText type="h1" style={{ color: theme.primary, letterSpacing: 8 }}>
          {roomCode}
        </ThemedText>
        <ThemedText type="body" style={[styles.shareText, { color: theme.textSecondary }]}>
          Share this code with your friend
        </ThemedText>
      </View>
      
      <View style={styles.waitingAnimation}>
        <Ionicons name="people-outline" size={60} color={theme.primary} />
        <ThemedText type="body" style={{ marginTop: Spacing.md }}>
          Waiting for player 2 to join...
        </ThemedText>
      </View>
    </Animated.View>
  );

  const renderSelecting = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.gameContainer}>
      <View style={styles.scoreBoard}>
        <View style={[styles.playerScore, myPlayer && isMyTurn ? { borderColor: theme.primary, borderWidth: 2 } : {}]}>
          <ThemedText type="small">You</ThemedText>
          <ThemedText type="h3" style={{ color: theme.primary }}>{myPlayer?.score || 0}</ThemedText>
        </View>
        <View style={styles.vsContainer}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>VS</ThemedText>
        </View>
        <View style={[styles.playerScore, opponent && !isMyTurn ? { borderColor: theme.accent, borderWidth: 2 } : {}]}>
          <ThemedText type="small">{opponent?.name || 'Player 2'}</ThemedText>
          <ThemedText type="h3" style={{ color: theme.accent }}>{opponent?.score || 0}</ThemedText>
        </View>
      </View>

      <View style={styles.chainDisplay}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Word Chain ({gameState?.wordChain.length || 0} words)
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chainScroll}>
          {gameState?.wordChain.map((word, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(index * 100)}
              style={[styles.chainWord, { backgroundColor: theme.primary + '20' }]}
            >
              <ThemedText type="body" style={{ color: theme.primary }}>
                {word}
              </ThemedText>
            </Animated.View>
          ))}
        </ScrollView>
      </View>

      {isMyTurn ? (
        <>
          <ThemedText type="h3" style={styles.turnText}>
            Your Turn! Select a word to add:
          </ThemedText>
          <View style={styles.wordOptions}>
            {gameState?.wordOptions.map((word, index) => (
              <Pressable
                key={word}
                onPress={() => selectWord(word)}
                style={[styles.wordOption, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
              >
                <ThemedText type="body">{word}</ThemedText>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.waitingTurn}>
          <Ionicons name="hourglass-outline" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
            Waiting for {opponent?.name || 'opponent'} to select...
          </ThemedText>
        </View>
      )}
    </Animated.View>
  );

  const renderMemorizing = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.gameContainer}>
      <View style={styles.scoreBoard}>
        <View style={[styles.playerScore, isMyTurn ? { borderColor: theme.primary, borderWidth: 2 } : {}]}>
          <ThemedText type="small">You</ThemedText>
          <ThemedText type="h3" style={{ color: theme.primary }}>{myPlayer?.score || 0}</ThemedText>
        </View>
        <View style={styles.vsContainer}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>VS</ThemedText>
        </View>
        <View style={[styles.playerScore, !isMyTurn ? { borderColor: theme.accent, borderWidth: 2 } : {}]}>
          <ThemedText type="small">{opponent?.name || 'Player 2'}</ThemedText>
          <ThemedText type="h3" style={{ color: theme.accent }}>{opponent?.score || 0}</ThemedText>
        </View>
      </View>

      {isMyTurn && gameState?.showWords ? (
        <>
          <ThemedText type="h2" style={[styles.memorizeTitle, { color: theme.primary }]}>
            Memorize these words!
          </ThemedText>
          <View style={[styles.countdownCircle, { borderColor: theme.primary }]}>
            <ThemedText type="h1" style={{ color: theme.primary }}>{memorizeCountdown}</ThemedText>
          </View>
          <View style={styles.wordsToMemorize}>
            {gameState?.wordChain.map((word, index) => (
              <Animated.View
                key={index}
                entering={ZoomIn.delay(index * 200)}
                style={[styles.memorizeWord, { backgroundColor: theme.primary }]}
              >
                <ThemedText type="h3" style={{ color: '#FFFFFF' }}>
                  {index + 1}. {word}
                </ThemedText>
              </Animated.View>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.waitingTurn}>
          <Ionicons name="eye-outline" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
            {opponent?.name || 'Opponent'} is memorizing the words...
          </ThemedText>
        </View>
      )}
    </Animated.View>
  );

  const renderRecalling = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.gameContainer}>
      <View style={styles.scoreBoard}>
        <View style={[styles.playerScore, isMyTurn ? { borderColor: theme.primary, borderWidth: 2 } : {}]}>
          <ThemedText type="small">You</ThemedText>
          <ThemedText type="h3" style={{ color: theme.primary }}>{myPlayer?.score || 0}</ThemedText>
        </View>
        <View style={styles.vsContainer}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>VS</ThemedText>
        </View>
        <View style={[styles.playerScore, !isMyTurn ? { borderColor: theme.accent, borderWidth: 2 } : {}]}>
          <ThemedText type="small">{opponent?.name || 'Player 2'}</ThemedText>
          <ThemedText type="h3" style={{ color: theme.accent }}>{opponent?.score || 0}</ThemedText>
        </View>
      </View>

      {isMyTurn ? (
        <>
          <ThemedText type="h2" style={styles.recallTitle}>
            Recall word #{(gameState?.currentRecallIndex || 0) + 1}
          </ThemedText>
          <ThemedText type="body" style={[styles.recallSubtitle, { color: theme.textSecondary }]}>
            {recalledWords.length} of {gameState?.wordChain.length} recalled
          </ThemedText>
          
          <View style={styles.recalledList}>
            {recalledWords.map((word, index) => (
              <View key={index} style={[styles.recalledWord, { backgroundColor: '#4CAF50' + '20' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <ThemedText type="body" style={{ color: '#4CAF50', marginLeft: 8 }}>{word}</ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.wordOptions}>
            {shuffledRecallOptions.map((word) => (
              <Pressable
                key={word}
                onPress={() => recallWord(word)}
                style={[styles.wordOption, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
              >
                <ThemedText type="body">{word}</ThemedText>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.waitingTurn}>
          <Ionicons name="bulb-outline" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
            {opponent?.name || 'Opponent'} is recalling the words...
          </ThemedText>
        </View>
      )}
    </Animated.View>
  );

  const renderGameOver = () => (
    <Animated.View entering={ZoomIn.duration(400)} style={styles.gameOverContainer}>
      <Ionicons 
        name={gameState?.winner === user?.name ? "trophy" : "sad-outline"} 
        size={80} 
        color={gameState?.winner === user?.name ? "#FFD700" : theme.textSecondary} 
      />
      <ThemedText type="h1" style={styles.gameOverTitle}>
        {gameState?.winner === user?.name ? 'You Won!' : 'Game Over'}
      </ThemedText>
      <ThemedText type="body" style={[styles.winnerText, { color: theme.textSecondary }]}>
        {gameState?.winner} wins!
      </ThemedText>
      
      <View style={styles.finalScores}>
        <View style={styles.finalScoreCard}>
          <ThemedText type="small">You</ThemedText>
          <ThemedText type="h2" style={{ color: theme.primary }}>{myPlayer?.score || 0}</ThemedText>
        </View>
        <View style={styles.finalScoreCard}>
          <ThemedText type="small">{opponent?.name}</ThemedText>
          <ThemedText type="h2" style={{ color: theme.accent }}>{opponent?.score || 0}</ThemedText>
        </View>
      </View>

      <ThemedText type="body" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
        Chain Length: {gameState?.wordChain.length} words
      </ThemedText>

      <View style={styles.gameOverButtons}>
        <Button onPress={playAgain} style={styles.playAgainButton}>
          Play Again
        </Button>
        <Button 
          onPress={() => navigation.goBack()} 
          style={[styles.exitButton, { backgroundColor: theme.backgroundSecondary }]}
        >
          Exit
        </Button>
      </View>
    </Animated.View>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg }]}>
      <View style={styles.header}>
        <Pressable onPress={leaveGame} style={styles.exitBtn}>
          <Feather name="x" size={28} color={theme.text} />
        </Pressable>
        {roomCode && phase !== 'lobby' && (
          <View style={[styles.roomBadge, { backgroundColor: theme.primary + '20' }]}>
            <ThemedText type="small" style={{ color: theme.primary }}>Room: {roomCode}</ThemedText>
          </View>
        )}
      </View>

      {phase === 'lobby' && renderLobby()}
      {phase === 'waiting' && renderWaiting()}
      {phase === 'selecting' && renderSelecting()}
      {phase === 'memorizing' && renderMemorizing()}
      {phase === 'recalling' && renderRecalling()}
      {phase === 'gameOver' && renderGameOver()}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  exitBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  lobbyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  errorText: {
    marginBottom: Spacing.md,
  },
  lobbyButtons: {
    width: '100%',
    gap: Spacing.md,
  },
  lobbyButton: {
    width: '100%',
  },
  orText: {
    textAlign: 'center',
    marginVertical: Spacing.sm,
  },
  codeInput: {
    height: 56,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 2,
    letterSpacing: 4,
  },
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  codeCard: {
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  shareText: {
    marginTop: Spacing.md,
  },
  waitingAnimation: {
    alignItems: 'center',
  },
  gameContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  scoreBoard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  playerScore: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  vsContainer: {
    paddingHorizontal: Spacing.md,
  },
  chainDisplay: {
    marginBottom: Spacing.lg,
  },
  chainScroll: {
    marginTop: Spacing.sm,
  },
  chainWord: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
  },
  turnText: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  wordOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  wordOption: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    minWidth: 120,
    alignItems: 'center',
  },
  waitingTurn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memorizeTitle: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  countdownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  wordsToMemorize: {
    gap: Spacing.md,
  },
  memorizeWord: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  recallTitle: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  recallSubtitle: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  recalledList: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  recalledWord: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  gameOverContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  gameOverTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  winnerText: {
    marginBottom: Spacing.xl,
  },
  finalScores: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  finalScoreCard: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  gameOverButtons: {
    marginTop: Spacing['3xl'],
    width: '100%',
    gap: Spacing.md,
  },
  playAgainButton: {},
  exitButton: {},
});
