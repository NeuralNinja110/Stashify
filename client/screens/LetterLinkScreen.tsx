import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  FadeOut, 
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { getApiUrl } from '@/lib/query-client';

type GamePhase = 'lobby' | 'waiting' | 'playing' | 'gameOver';

interface Player {
  id: string;
  name: string;
  score: number;
}

interface GameState {
  usedWords: string[];
  currentLetter: string;
  currentTurn: number;
  player1: Player | null;
  player2: Player | null;
  phase: string;
  wordOptions: string[];
  winner: string | null;
  loser: string | null;
  reason: string | null;
}

export default function LetterLinkScreen() {
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
          new URL(`/api/games/letterlink/rooms/${sid}`, getApiUrl()).toString()
        );
        if (response.ok) {
          const data = await response.json();
          setGameState(data.gameState);
          
          const serverPhase = data.gameState.phase;
          if (serverPhase === 'waiting') setPhase('waiting');
          else if (serverPhase === 'playing') setPhase('playing');
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

  const createRoom = async () => {
    if (!user) return;
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        new URL('/api/games/letterlink/rooms', getApiUrl()).toString(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            playerName: user.name || 'Player 1',
          }),
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
      setError('Failed to create room');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!user || !joinCode.trim()) return;
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        new URL('/api/games/letterlink/rooms/join', getApiUrl()).toString(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode: joinCode.toUpperCase(),
            userId: user.id,
            playerName: user.name || 'Player 2',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join room');
      }

      const data = await response.json();
      setRoomCode(data.roomCode);
      setSessionId(data.sessionId);
      setGameState(data.gameState);
      setPhase('playing');
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
    if (!sessionId || !user || !isMyTurn) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cardScale.value = withSequence(withSpring(0.95), withSpring(1));

    try {
      const response = await fetch(
        new URL(`/api/games/letterlink/rooms/${sessionId}/move`, getApiUrl()).toString(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            selectedWord: word,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to select word');
        return;
      }

      const data = await response.json();
      setGameState(data.gameState);
      
      if (data.gameState.phase === 'gameOver') {
        setPhase('gameOver');
        Haptics.notificationAsync(
          data.result === 'win' 
            ? Haptics.NotificationFeedbackType.Success 
            : Haptics.NotificationFeedbackType.Error
        );
      }
    } catch (err) {
      console.error('Select word error:', err);
    }
  };

  const leaveGame = async () => {
    if (sessionId && user) {
      try {
        await fetch(
          new URL(`/api/games/letterlink/rooms/${sessionId}/leave`, getApiUrl()).toString(),
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

  const resetGame = () => {
    stopPolling();
    setPhase('lobby');
    setRoomCode('');
    setJoinCode('');
    setSessionId(null);
    setGameState(null);
    setError('');
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const renderLobby = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.lobbyContainer}>
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
        <MaterialCommunityIcons name="link-variant" size={64} color={theme.primary} />
      </View>
      
      <ThemedText type="h1" style={styles.title}>Letter Link</ThemedText>
      <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
        Pick words starting with the given letter. Each word's last letter becomes the next starting letter!
      </ThemedText>

      <View style={styles.buttonGroup}>
        <Button
          onPress={createRoom}
          disabled={isLoading}
          style={styles.primaryButton}
        >
          {isLoading ? 'Creating...' : 'Create Room'}
        </Button>
        
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>OR</ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        <View style={styles.joinContainer}>
          <TextInput
            style={[
              styles.codeInput,
              { 
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              }
            ]}
            placeholder="Enter Room Code"
            placeholderTextColor={theme.textSecondary}
            value={joinCode}
            onChangeText={(text) => setJoinCode(text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
          />
          <Button
            onPress={joinRoom}
            disabled={isLoading || joinCode.length < 4}
            variant="secondary"
          >
            {isLoading ? 'Joining...' : 'Join'}
          </Button>
        </View>
      </View>

      {error ? (
        <Animated.View entering={FadeIn} style={[styles.errorBox, { backgroundColor: theme.error + '20' }]}>
          <ThemedText style={{ color: theme.error }}>{error}</ThemedText>
        </Animated.View>
      ) : null}
    </Animated.View>
  );

  const renderWaiting = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.waitingContainer}>
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
        <Feather name="users" size={48} color={theme.primary} />
      </View>
      
      <ThemedText type="h2">Waiting for opponent...</ThemedText>
      
      <View style={[styles.codeDisplay, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>Room Code</ThemedText>
        <ThemedText type="h1" style={[styles.codeText, { color: theme.primary }]}>
          {roomCode}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          Share this code with your friend
        </ThemedText>
      </View>

      <Button
        onPress={leaveGame}
        variant="secondary"
        style={styles.cancelButton}
      >
        Cancel
      </Button>
    </Animated.View>
  );

  const renderPlaying = () => (
    <ScrollView 
      contentContainerStyle={styles.playingContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.playersRow}>
        <View style={[
          styles.playerCard, 
          { backgroundColor: playerNum === 1 ? theme.primary + '20' : theme.backgroundDefault }
        ]}>
          <ThemedText type="caption">{gameState?.player1?.name || 'Player 1'}</ThemedText>
          <ThemedText type="h2" style={{ color: theme.primary }}>
            {gameState?.player1?.score || 0}
          </ThemedText>
          {gameState?.currentTurn === 1 && (
            <View style={[styles.turnBadge, { backgroundColor: theme.primary }]}>
              <ThemedText type="caption" style={{ color: '#fff' }}>Turn</ThemedText>
            </View>
          )}
        </View>
        
        <View style={styles.vsContainer}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>VS</ThemedText>
        </View>
        
        <View style={[
          styles.playerCard, 
          { backgroundColor: playerNum === 2 ? theme.primary + '20' : theme.backgroundDefault }
        ]}>
          <ThemedText type="caption">{gameState?.player2?.name || 'Player 2'}</ThemedText>
          <ThemedText type="h2" style={{ color: theme.primary }}>
            {gameState?.player2?.score || 0}
          </ThemedText>
          {gameState?.currentTurn === 2 && (
            <View style={[styles.turnBadge, { backgroundColor: theme.primary }]}>
              <ThemedText type="caption" style={{ color: '#fff' }}>Turn</ThemedText>
            </View>
          )}
        </View>
      </View>

      <View style={styles.letterSection}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          Pick a word starting with
        </ThemedText>
        <View style={[styles.letterCircle, { backgroundColor: theme.primary }]}>
          <ThemedText type="h1" style={styles.letterText}>
            {gameState?.currentLetter?.toUpperCase()}
          </ThemedText>
        </View>
      </View>

      {gameState?.usedWords && gameState.usedWords.length > 0 && (
        <View style={styles.usedWordsSection}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
            Recent words:
          </ThemedText>
          <View style={styles.usedWordsRow}>
            {gameState.usedWords.slice(-4).map((word, idx) => (
              <View key={idx} style={[styles.usedWordChip, { backgroundColor: theme.backgroundDefault }]}>
                <ThemedText type="caption">{word}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}

      {isMyTurn ? (
        <Animated.View entering={FadeInDown.delay(200)} style={styles.optionsContainer}>
          <ThemedText type="body" style={[styles.turnLabel, { color: theme.primary }]}>
            Your Turn! Pick a word:
          </ThemedText>
          <View style={styles.optionsGrid}>
            {gameState?.wordOptions?.map((word, idx) => (
              <Animated.View 
                key={word} 
                entering={ZoomIn.delay(idx * 100)}
                style={animatedCardStyle}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.wordOption,
                    { 
                      backgroundColor: pressed ? theme.primary : theme.backgroundDefault,
                      borderColor: theme.primary,
                    }
                  ]}
                  onPress={() => selectWord(word)}
                >
                  <ThemedText 
                    type="h3" 
                    style={[styles.wordText]}
                  >
                    {word}
                  </ThemedText>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      ) : (
        <View style={styles.waitingTurn}>
          <Ionicons name="hourglass-outline" size={32} color={theme.textSecondary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            Waiting for {opponent?.name || 'opponent'}...
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );

  const renderGameOver = () => {
    const didWin = gameState?.winner === (playerNum === 1 ? gameState?.player1?.name : gameState?.player2?.name);
    
    return (
      <Animated.View entering={FadeInDown.duration(500)} style={styles.gameOverContainer}>
        <View style={[
          styles.iconContainer, 
          { backgroundColor: didWin ? theme.success + '20' : theme.error + '20' }
        ]}>
          <Ionicons 
            name={didWin ? "trophy" : "sad"} 
            size={64} 
            color={didWin ? theme.success : theme.error} 
          />
        </View>
        
        <ThemedText type="h1" style={[styles.resultTitle, { color: didWin ? theme.success : theme.error }]}>
          {didWin ? 'You Won!' : 'You Lost!'}
        </ThemedText>
        
        {gameState?.reason && (
          <ThemedText type="body" style={[styles.reasonText, { color: theme.textSecondary }]}>
            {gameState.reason}
          </ThemedText>
        )}
        
        <View style={styles.finalScores}>
          <View style={styles.scoreCard}>
            <ThemedText type="caption">{gameState?.player1?.name}</ThemedText>
            <ThemedText type="h2" style={{ color: theme.primary }}>{gameState?.player1?.score || 0}</ThemedText>
          </View>
          <View style={styles.scoreCard}>
            <ThemedText type="caption">{gameState?.player2?.name}</ThemedText>
            <ThemedText type="h2" style={{ color: theme.primary }}>{gameState?.player2?.score || 0}</ThemedText>
          </View>
        </View>

        {gameState?.usedWords && gameState.usedWords.length > 0 && (
          <View style={styles.wordsPlayedSection}>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
              All words played ({gameState.usedWords.length}):
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.usedWordsRow}>
                {gameState.usedWords.map((word, idx) => (
                  <View key={idx} style={[styles.usedWordChip, { backgroundColor: theme.backgroundDefault }]}>
                    <ThemedText type="caption">{word}</ThemedText>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={styles.gameOverButtons}>
          <Button
            onPress={resetGame}
            style={styles.primaryButton}
          >
            Play Again
          </Button>
          <Button
            onPress={leaveGame}
            variant="secondary"
          >
            Back to Games
          </Button>
        </View>
      </Animated.View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={leaveGame} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3">Letter Link</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {phase === 'lobby' && renderLobby()}
        {phase === 'waiting' && renderWaiting()}
        {phase === 'playing' && renderPlaying()}
        {phase === 'gameOver' && renderGameOver()}
      </View>
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
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  lobbyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  buttonGroup: {
    width: '100%',
    gap: Spacing.lg,
  },
  primaryButton: {
    width: '100%',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  joinContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  codeInput: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
  },
  errorBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  codeDisplay: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 48,
    letterSpacing: 8,
  },
  cancelButton: {
    minWidth: 200,
  },
  playingContainer: {
    paddingBottom: Spacing['3xl'],
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  playerCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    position: 'relative',
  },
  vsContainer: {
    paddingHorizontal: Spacing.sm,
  },
  turnBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  letterSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  letterCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  letterText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '700',
  },
  usedWordsSection: {
    marginBottom: Spacing.xl,
  },
  usedWordsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  usedWordChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  optionsContainer: {
    gap: Spacing.lg,
  },
  turnLabel: {
    textAlign: 'center',
    fontWeight: '600',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'center',
  },
  wordOption: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    minWidth: 140,
    alignItems: 'center',
  },
  wordText: {
    textTransform: 'capitalize',
  },
  waitingTurn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  gameOverContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  resultTitle: {
    textAlign: 'center',
  },
  reasonText: {
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  finalScores: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginVertical: Spacing.lg,
  },
  scoreCard: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  wordsPlayedSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  gameOverButtons: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
});
