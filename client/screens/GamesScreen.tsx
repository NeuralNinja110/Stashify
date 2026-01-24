import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { GameCard } from '@/components/GameCard';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/RootStackNavigator';

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

export default function GamesScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleGamePress = (game: GameInfo) => {
    navigation.navigate(game.screen as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing['3xl'],
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <ThemedText type="h2" style={styles.title}>
            {t('gamesTab')}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            Choose a game to train your memory
          </ThemedText>
        </Animated.View>

        <View style={styles.gamesContainer}>
          {GAMES.map((game, index) => (
            <Animated.View
              key={game.id}
              entering={FadeInDown.delay(150 + index * 100).duration(400)}
            >
              <GameCard
                title={t(game.titleKey)}
                description={t(game.descKey)}
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
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    marginBottom: Spacing['2xl'],
  },
  gamesContainer: {},
});
