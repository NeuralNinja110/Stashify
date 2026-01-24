import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { getApiUrl } from '@/lib/query-client';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  score: number;
  ageGroup: string;
  gamesPlayed: number;
}

const gameTypes = [
  { id: 'memory-grid', name: 'Memory Grid' },
  { id: 'word-chain', name: 'Word Chain' },
  { id: 'echo-chronicles', name: 'Echo Chronicles' },
  { id: 'riddles', name: 'Riddles' },
];

const ageGroups = [
  { id: 'all', name: 'All Ages' },
  { id: '50-59', name: '50-59' },
  { id: '60-69', name: '60-69' },
  { id: '70-79', name: '70-79' },
  { id: '80+', name: '80+' },
];

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [selectedGame, setSelectedGame] = useState('memory-grid');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, [selectedGame, selectedAgeGroup]);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    try {
      const ageParam = selectedAgeGroup !== 'all' ? `&ageGroup=${selectedAgeGroup}` : '';
      const response = await fetch(
        new URL(`/api/leaderboard/${selectedGame}?${ageParam}`, getApiUrl()).toString()
      );
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
    setIsLoading(false);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { color: '#FFD700', icon: 'award' as const };
    if (rank === 2) return { color: '#C0C0C0', icon: 'award' as const };
    if (rank === 3) return { color: '#CD7F32', icon: 'award' as const };
    return null;
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const badge = getRankBadge(item.rank);
    const isCurrentUser = item.userId === user?.id;

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).duration(300)}
        style={[
          styles.leaderboardItem,
          {
            backgroundColor: isCurrentUser
              ? theme.primary + '20'
              : theme.backgroundDefault,
            borderColor: isCurrentUser ? theme.primary : 'transparent',
            borderWidth: isCurrentUser ? 2 : 0,
          },
        ]}
      >
        <View style={styles.rankSection}>
          {badge ? (
            <View style={[styles.rankBadge, { backgroundColor: badge.color + '30' }]}>
              <Feather name={badge.icon} size={20} color={badge.color} />
            </View>
          ) : (
            <View style={[styles.rankNumber, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="body">{item.rank}</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <ThemedText type="body" style={{ fontWeight: isCurrentUser ? '700' : '400' }}>
            {item.userName} {isCurrentUser ? '(You)' : ''}
          </ThemedText>
          <View style={styles.userMeta}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {item.gamesPlayed} games
            </ThemedText>
            <View style={[styles.ageGroupBadge, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {item.ageGroup}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.scoreSection}>
          <ThemedText type="h4" style={{ color: theme.primary }}>
            {item.score.toLocaleString()}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            points
          </ThemedText>
        </View>
      </Animated.View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing['2xl'],
          },
        ]}
      >
        <View style={styles.filtersSection}>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
            Game
          </ThemedText>
          <View style={styles.filterRow}>
            {gameTypes.map((game) => (
              <Pressable
                key={game.id}
                onPress={() => setSelectedGame(game.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      selectedGame === game.id
                        ? theme.primary
                        : theme.backgroundDefault,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: selectedGame === game.id ? '#FFFFFF' : theme.text,
                  }}
                >
                  {game.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
            Age Group
          </ThemedText>
          <View style={styles.filterRow}>
            {ageGroups.map((group) => (
              <Pressable
                key={group.id}
                onPress={() => setSelectedAgeGroup(group.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      selectedAgeGroup === group.id
                        ? theme.primary
                        : theme.backgroundDefault,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: selectedAgeGroup === group.id ? '#FFFFFF' : theme.text,
                  }}
                >
                  {group.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Loading leaderboard...
            </ThemedText>
          </View>
        ) : leaderboard.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="users" size={48} color={theme.textSecondary} />
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary, marginTop: Spacing.lg, textAlign: 'center' }}
            >
              No scores yet for this category.{'\n'}Be the first to play!
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={leaderboard}
            renderItem={renderLeaderboardItem}
            keyExtractor={(item) => `${item.userId}-${item.rank}`}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  filtersSection: {
    marginBottom: Spacing.xl,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  listContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  rankSection: {
    marginRight: Spacing.lg,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  ageGroupBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  scoreSection: {
    alignItems: 'flex-end',
  },
});
