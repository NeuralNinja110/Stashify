import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { VoiceButton } from '@/components/VoiceButton';
import { WinningAnimation } from '@/components/WinningAnimation';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { getApiUrl, apiRequest } from '@/lib/query-client';

type GameState = 'ready' | 'prompt' | 'recording' | 'reviewing' | 'gameOver';

interface StoryPrompt {
  prompt: string;
  category: string;
  hints: string[];
}

export default function EchoChroniclesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [gameState, setGameState] = useState<GameState>('ready');
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [prompts, setPrompts] = useState<StoryPrompt[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [storyText, setStoryText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [score, setScore] = useState(0);
  const [storiesShared, setStoriesShared] = useState(0);
  const [showHints, setShowHints] = useState(false);

  const defaultPrompts: StoryPrompt[] = [
    {
      prompt: "Tell me about your favorite childhood game",
      category: "childhood",
      hints: ["Who did you play with?", "Where did you play?", "What made it special?"]
    },
    {
      prompt: "Describe a memorable family festival or celebration",
      category: "festivals",
      hints: ["What foods were prepared?", "Who was there?", "What traditions did you follow?"]
    },
    {
      prompt: "Share a memory from your school days",
      category: "school",
      hints: ["Who were your friends?", "What was your favorite subject?", "Any funny incidents?"]
    },
    {
      prompt: "Tell me about a special place from your past",
      category: "places",
      hints: ["Where was it?", "Why was it special?", "What did you do there?"]
    },
    {
      prompt: "Describe your favorite traditional food and who made it",
      category: "food",
      hints: ["What ingredients were used?", "On what occasions?", "Who taught you the recipe?"]
    },
  ];

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const response = await fetch(
        new URL(`/api/games/echo/prompts?language=${user?.language || 'en'}`, getApiUrl()).toString()
      );
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setPrompts(data);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
    setPrompts(defaultPrompts);
  };

  const startGame = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentPromptIndex(0);
    setScore(0);
    setStoriesShared(0);
    setStoryText('');
    setGameState('prompt');
  };

  const handleVoicePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecording(!isRecording);
    
    if (isRecording) {
      // Stop recording - in real implementation would transcribe audio
      setGameState('reviewing');
    } else {
      setGameState('recording');
    }
  };

  const handleStartWriting = () => {
    setGameState('reviewing');
  };

  const submitStory = async () => {
    if (!storyText.trim() && !isRecording) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Calculate score based on story length and detail
    const words = storyText.split(/\s+/).length;
    const detailScore = Math.min(words * 2, 100);
    const promptBonus = 20;
    const newScore = score + detailScore + promptBonus;
    
    setScore(newScore);
    setStoriesShared(prev => prev + 1);

    // Move to next prompt or end game
    if (currentPromptIndex < prompts.length - 1) {
      setCurrentPromptIndex(prev => prev + 1);
      setStoryText('');
      setShowHints(false);
      setGameState('prompt');
    } else {
      endGame(newScore);
    }
  };

  const skipPrompt = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentPromptIndex < prompts.length - 1) {
      setCurrentPromptIndex(prev => prev + 1);
      setStoryText('');
      setShowHints(false);
      setGameState('prompt');
    } else {
      endGame(score);
    }
  };

  const endGame = async (finalScore: number) => {
    setGameState('gameOver');
    
    // Show winning animation for sharing 2+ stories
    if (storiesShared >= 2) {
      setShowWinAnimation(true);
    }

    try {
      await apiRequest('POST', '/api/games/scores', {
        userId: user?.id || 'guest',
        gameType: 'echo-chronicles',
        score: finalScore,
        level: storiesShared + 1,
        metadata: { storiesShared: storiesShared + 1 },
      });
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  const currentPrompt = prompts[currentPromptIndex] || defaultPrompts[0];

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
              Stories
            </ThemedText>
            <ThemedText type="h3">{storiesShared}</ThemedText>
          </View>
        </View>
      </View>

      {gameState === 'ready' && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.readyState}>
          <ThemedText type="h2" style={styles.title}>
            {t('games.echoChronicles')}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.instructions, { color: theme.textSecondary }]}
          >
            Share your precious memories through stories. I'll give you prompts to help you remember beautiful moments from your past.
          </ThemedText>
          <Button onPress={startGame} style={styles.startButton}>
            {t('games.startGame')}
          </Button>
        </Animated.View>
      )}

      {(gameState === 'prompt' || gameState === 'recording' || gameState === 'reviewing') && (
        <ScrollView
          contentContainerStyle={styles.gameArea}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={[styles.promptCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.promptHeader}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Story {currentPromptIndex + 1} of {prompts.length}
                </ThemedText>
                <View style={[styles.categoryBadge, { backgroundColor: theme.primary + '20' }]}>
                  <ThemedText type="caption" style={{ color: theme.primary }}>
                    {currentPrompt.category}
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="h3" style={styles.promptText}>
                {currentPrompt.prompt}
              </ThemedText>
              
              <Pressable
                onPress={() => setShowHints(!showHints)}
                style={styles.hintsToggle}
              >
                <Feather
                  name={showHints ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.primary}
                />
                <ThemedText type="small" style={{ color: theme.primary, marginLeft: Spacing.xs }}>
                  {showHints ? 'Hide hints' : 'Need help? Show hints'}
                </ThemedText>
              </Pressable>

              {showHints && (
                <Animated.View entering={FadeIn.duration(200)} style={styles.hintsContainer}>
                  {currentPrompt.hints.map((hint, index) => (
                    <View key={index} style={styles.hintItem}>
                      <Feather name="help-circle" size={16} color={theme.textSecondary} />
                      <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm, flex: 1 }}>
                        {hint}
                      </ThemedText>
                    </View>
                  ))}
                </Animated.View>
              )}
            </View>

            {gameState === 'prompt' && (
              <View style={styles.actionButtons}>
                <ThemedText type="body" style={[styles.choiceText, { color: theme.textSecondary }]}>
                  Choose how to share your story:
                </ThemedText>
                <View style={styles.voiceSection}>
                  <VoiceButton isRecording={false} onPress={handleVoicePress} />
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                    Speak your story
                  </ThemedText>
                </View>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginVertical: Spacing.md }}>
                  or
                </ThemedText>
                <Button onPress={handleStartWriting} style={styles.writeButton}>
                  Write your story
                </Button>
                <Pressable onPress={skipPrompt} style={styles.skipButton}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Skip this prompt
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {gameState === 'recording' && (
              <View style={styles.recordingSection}>
                <ThemedText type="body" style={{ color: theme.error, marginBottom: Spacing.lg }}>
                  Recording... Tap to stop
                </ThemedText>
                <VoiceButton isRecording={true} onPress={handleVoicePress} />
              </View>
            )}

            {gameState === 'reviewing' && (
              <View style={styles.reviewSection}>
                <ThemedText type="h4" style={styles.storyLabel}>
                  Your Story
                </ThemedText>
                <TextInput
                  value={storyText}
                  onChangeText={setStoryText}
                  placeholder="Write your memory here... The more details, the better!"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.storyInput,
                    {
                      backgroundColor: theme.backgroundDefault,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                  testID="input-story"
                />
                <View style={styles.reviewButtons}>
                  <Button
                    onPress={submitStory}
                    disabled={!storyText.trim()}
                    style={styles.submitButton}
                  >
                    Share Story
                  </Button>
                  <Pressable onPress={skipPrompt} style={styles.skipButton}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Skip this one
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      )}

      {gameState === 'gameOver' && (
        <Animated.View entering={ZoomIn.duration(400)} style={styles.gameOverState}>
          <ThemedText type="h1" style={{ color: theme.primary }}>
            Beautiful!
          </ThemedText>
          <ThemedText type="h2" style={styles.finalScore}>
            {t('games.score')}: {score}
          </ThemedText>
          <ThemedText type="body" style={[styles.storiesCount, { color: theme.textSecondary }]}>
            You shared {storiesShared} {storiesShared === 1 ? 'story' : 'stories'}
          </ThemedText>
          <ThemedText type="body" style={[styles.encouragement, { color: theme.textSecondary }]}>
            Thank you for sharing your precious memories. They are treasures worth preserving.
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
        title="Beautiful!"
        subtitle={`You shared ${storiesShared} ${storiesShared === 1 ? 'story' : 'stories'}!`}
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
    marginBottom: Spacing['3xl'],
  },
  startButton: {
    minWidth: 200,
  },
  gameArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  promptCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing['2xl'],
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  promptText: {
    marginBottom: Spacing.lg,
  },
  hintsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hintsContainer: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  actionButtons: {
    alignItems: 'center',
  },
  choiceText: {
    marginBottom: Spacing['2xl'],
  },
  voiceSection: {
    alignItems: 'center',
  },
  writeButton: {
    minWidth: 200,
  },
  skipButton: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
  },
  recordingSection: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  reviewSection: {
    marginTop: Spacing.lg,
  },
  storyLabel: {
    marginBottom: Spacing.md,
  },
  storyInput: {
    minHeight: 200,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: 16,
    borderWidth: 2,
    lineHeight: 24,
  },
  reviewButtons: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  submitButton: {
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
  storiesCount: {
    marginBottom: Spacing.lg,
  },
  encouragement: {
    textAlign: 'center',
    marginBottom: Spacing['3xl'],
  },
  gameOverButtons: {
    gap: Spacing.md,
    width: '100%',
  },
  playAgainButton: {},
  exitGameButton: {},
});
