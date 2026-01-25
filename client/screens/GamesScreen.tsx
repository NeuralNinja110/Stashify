import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Image, ImageSourcePropType } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/RootStackNavigator';
import { useAuth } from '@/context/AuthContext';
import { getApiUrl } from '@/lib/query-client';

const gameGridIcon = require('../../assets/images/game-grid-icon.png');
const gameWordchainIcon = require('../../assets/images/game-wordchain-icon.png');
const gameEchoIcon = require('../../assets/images/game-echo-icon.png');
const gameRiddleIcon = require('../../assets/images/game-riddle-icon.png');

interface GameInfo {
  id: string;
  titleKey: string;
  descKey: string;
  icon: any;
  difficulty: 'easy' | 'medium' | 'hard';
  screen: keyof RootStackParamList;
}

const GAMES: GameInfo[] = [
  {
    id: 'memory-grid',
    titleKey: 'games.memoryGrid',
    descKey: 'games.memoryGridDesc',
    icon: gameGridIcon,
    difficulty: 'easy',
    screen: 'MemoryGrid',
  },
  {
    id: 'word-chain',
    titleKey: 'games.wordChain',
    descKey: 'games.wordChainDesc',
    icon: gameWordchainIcon,
    difficulty: 'medium',
    screen: 'WordChain',
  },
  {
    id: 'echo-chronicles',
    titleKey: 'games.echoChronicles',
    descKey: 'games.echoChroniclesDesc',
    icon: gameEchoIcon,
    difficulty: 'medium',
    screen: 'EchoChronicles',
  },
  {
    id: 'riddles',
    titleKey: 'games.riddles',
    descKey: 'games.riddlesDesc',
    icon: gameRiddleIcon,
    difficulty: 'easy',
    screen: 'Riddles',
  },
  {
    id: 'letter-link',
    titleKey: 'games.letterLink',
    descKey: 'games.letterLinkDesc',
    icon: gameWordchainIcon,
    difficulty: 'medium',
    screen: 'LetterLink',
  },
  {
    id: 'family-quiz',
    titleKey: 'games.familyQuiz',
    descKey: 'games.familyQuizDesc',
    icon: gameGridIcon,
    difficulty: 'easy',
    screen: 'FamilyQuiz',
  },
];

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isCurrentUser?: boolean;
}

interface GridGameCardProps {
  title: string;
  icon: ImageSourcePropType;
  difficulty: 'easy' | 'medium' | 'hard';
  onPress: () => void;
}

function GridGameCard({ title, icon, difficulty, onPress }: GridGameCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'easy': return theme.success;
      case 'medium': return theme.warning;
      case 'hard': return theme.error;
    }
  };

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.gridCard,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      <Image source={icon} style={styles.gridIcon} resizeMode="contain" />
      <ThemedText type="body" style={styles.gridTitle} numberOfLines={2}>
        {title}
      </ThemedText>
      <View style={[styles.difficultyDot, { backgroundColor: getDifficultyColor() }]} />
    </AnimatedPressable>
  );
}

export default function GamesScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const url = new URL('/api/games/leaderboard?limit=3', getApiUrl()).toString();
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const entries: LeaderboardEntry[] = data.map((item: any, idx: number) => ({
          rank: idx + 1,
          name: item.userName || 'Player',
          score: item.totalScore || 0,
          isCurrentUser: user?.id === item.userId,
        }));
        setLeaderboard(entries);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    }
  };

  const handleGamePress = (game: GameInfo) => {
    navigation.navigate(game.screen as any);
  };

  const handleViewLeaderboard = () => {
    navigation.navigate('Leaderboard' as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: tabBarHeight + Spacing['3xl'],
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Leaderboard Section */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Pressable 
            onPress={handleViewLeaderboard}
            style={[styles.leaderboardCard, { backgroundColor: theme.primary + '15' }]}
          >
            <View style={styles.leaderboardHeader}>
              <View style={styles.leaderboardTitleRow}>
                <Ionicons name="trophy" size={24} color={theme.primary} />
                <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
                  Leaderboard
                </ThemedText>
              </View>
              <ThemedText type="caption" style={{ color: theme.primary }}>
                View All
              </ThemedText>
            </View>
            
            {leaderboard.length > 0 ? (
              <View style={styles.leaderboardList}>
                {leaderboard.map((entry) => (
                  <View 
                    key={entry.rank} 
                    style={[
                      styles.leaderboardRow,
                      entry.isCurrentUser && { backgroundColor: theme.primary + '20' }
                    ]}
                  >
                    <View style={styles.rankBadge}>
                      <ThemedText type="caption" style={{ fontWeight: '700' }}>
                        #{entry.rank}
                      </ThemedText>
                    </View>
                    <ThemedText type="body" style={styles.leaderboardName} numberOfLines={1}>
                      {entry.name}
                    </ThemedText>
                    <ThemedText type="body" style={{ color: theme.primary, fontWeight: '600' }}>
                      {entry.score}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: 'center', padding: Spacing.md }}>
                Play games to appear on the leaderboard!
              </ThemedText>
            )}
          </Pressable>
        </Animated.View>

        {/* Games Title */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.sectionHeader}>
          <ThemedText type="h3">
            {t('gamesTab')}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Train your memory
          </ThemedText>
        </Animated.View>

        {/* Games Grid */}
        <View style={styles.gamesGrid}>
          {GAMES.map((game, index) => (
            <Animated.View
              key={game.id}
              entering={FadeInDown.delay(250 + index * 50).duration(400)}
              style={styles.gridCardWrapper}
            >
              <GridGameCard
                title={t(game.titleKey)}
                icon={game.icon}
                difficulty={game.difficulty}
                onPress={() => handleGamePress(game)}
              />
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  leaderboardCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  leaderboardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardList: {
    gap: Spacing.sm,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  rankBadge: {
    width: 32,
    alignItems: 'center',
  },
  leaderboardName: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  sectionHeader: {
    marginBottom: Spacing.lg,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCardWrapper: {
    width: '48%',
    marginBottom: Spacing.md,
  },
  gridCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: 140,
  },
  gridIcon: {
    width: 48,
    height: 48,
    marginBottom: Spacing.sm,
  },
  gridTitle: {
    textAlign: 'center',
    fontWeight: '600',
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
});
