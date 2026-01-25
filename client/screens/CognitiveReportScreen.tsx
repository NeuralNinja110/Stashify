import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { api } from '@/lib/api';

interface GameStats {
  gameType: string;
  gamesPlayed: number;
  averageScore: number;
  highestScore: number;
  averageAccuracy: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface CognitiveReport {
  overallScore: number;
  memoryScore: number;
  attentionScore: number;
  languageScore: number;
  gameStats: GameStats[];
  populationComparison: {
    percentile: number;
    comparison: string;
  };
  recommendations: string[];
  aiAnalysis: string;
}

const GAME_ICONS: Record<string, string> = {
  'memory-grid': 'grid',
  'word-chain': 'link',
  'echo-chronicles': 'mic',
  'riddles': 'help-circle',
  'letter-link': 'type',
  'family-quiz': 'users',
};

const GAME_NAMES: Record<string, string> = {
  'memory-grid': 'Memory Grid',
  'word-chain': 'Word Chain',
  'echo-chronicles': 'Echo Chronicles',
  'riddles': 'Riddles',
  'letter-link': 'Letter Link',
  'family-quiz': 'Family Quiz',
};

function ScoreCircle({ score, label, color }: { score: number; label: string; color: string }) {
  const { theme } = useTheme();
  const size = 80;
  
  return (
    <View style={styles.scoreCircleContainer}>
      <View style={[styles.scoreCircle, { borderColor: color, width: size, height: size }]}>
        <ThemedText type="h2" style={{ color }}>{score}</ThemedText>
      </View>
      <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
        {label}
      </ThemedText>
    </View>
  );
}

function TrendIndicator({ trend }: { trend: 'improving' | 'stable' | 'declining' }) {
  const { theme } = useTheme();
  const colors = {
    improving: theme.success,
    stable: theme.warning,
    declining: theme.error,
  };
  const icons = {
    improving: 'trending-up',
    stable: 'minus',
    declining: 'trending-down',
  };
  
  return (
    <View style={[styles.trendBadge, { backgroundColor: colors[trend] + '20' }]}>
      <Feather name={icons[trend] as any} size={14} color={colors[trend]} />
      <ThemedText type="small" style={{ color: colors[trend], marginLeft: 4 }}>
        {trend.charAt(0).toUpperCase() + trend.slice(1)}
      </ThemedText>
    </View>
  );
}

export default function CognitiveReportScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [report, setReport] = useState<CognitiveReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post(`/api/cognitive-report/${user.id}`);
      setReport(response.data);
    } catch (err: any) {
      console.error('Failed to generate report:', err);
      setError(err.response?.data?.error || 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.success;
    if (score >= 60) return theme.warning;
    return theme.error;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing['3xl'],
        },
      ]}
    >
      {!report && !loading && (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.generateSection}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Feather name="activity" size={48} color={theme.primary} />
          </View>
          <ThemedText type="h3" style={styles.generateTitle}>
            Cognitive Health Report
          </ThemedText>
          <ThemedText type="body" style={[styles.generateDescription, { color: theme.textSecondary }]}>
            Generate a detailed analysis of your cognitive performance based on your game scores, 
            compared against average population data.
          </ThemedText>
          <Button onPress={generateReport} style={styles.generateButton}>
            Generate Report
          </Button>
        </Animated.View>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="body" style={[styles.loadingText, { color: theme.textSecondary }]}>
            Analyzing your cognitive performance...
          </ThemedText>
        </View>
      )}

      {error && (
        <Card style={styles.errorCard}>
          <Feather name="alert-circle" size={24} color={theme.error} />
          <ThemedText type="body" style={{ color: theme.error, marginTop: Spacing.sm }}>
            {error}
          </ThemedText>
          <Button onPress={generateReport} style={styles.retryButton}>
            Try Again
          </Button>
        </Card>
      )}

      {report && (
        <>
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Card style={styles.overallCard}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Overall Cognitive Score
              </ThemedText>
              <View style={styles.overallScore}>
                <View style={[styles.bigScoreCircle, { borderColor: getScoreColor(report.overallScore) }]}>
                  <ThemedText type="h1" style={{ color: getScoreColor(report.overallScore), fontSize: 48 }}>
                    {report.overallScore}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    out of 100
                  </ThemedText>
                </View>
              </View>
              <View style={styles.percentileContainer}>
                <Feather name="award" size={20} color={theme.primary} />
                <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                  {report.populationComparison.percentile}th percentile
                </ThemedText>
              </View>
              <ThemedText type="small" style={[styles.comparisonText, { color: theme.textSecondary }]}>
                {report.populationComparison.comparison}
              </ThemedText>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Card style={styles.scoresCard}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Cognitive Domains
              </ThemedText>
              <View style={styles.scoresRow}>
                <ScoreCircle 
                  score={report.memoryScore} 
                  label="Memory" 
                  color={getScoreColor(report.memoryScore)} 
                />
                <ScoreCircle 
                  score={report.attentionScore} 
                  label="Attention" 
                  color={getScoreColor(report.attentionScore)} 
                />
                <ScoreCircle 
                  score={report.languageScore} 
                  label="Language" 
                  color={getScoreColor(report.languageScore)} 
                />
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Card style={styles.gamesCard}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Game Performance
              </ThemedText>
              {report.gameStats.length === 0 ? (
                <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center', padding: Spacing.lg }}>
                  No games played yet. Play some games to see your performance!
                </ThemedText>
              ) : (
                report.gameStats.map((game, index) => (
                  <View 
                    key={game.gameType} 
                    style={[
                      styles.gameRow, 
                      { borderBottomColor: theme.border },
                      index === report.gameStats.length - 1 && { borderBottomWidth: 0 }
                    ]}
                  >
                    <View style={[styles.gameIcon, { backgroundColor: theme.primary + '20' }]}>
                      <Feather 
                        name={GAME_ICONS[game.gameType] as any || 'play'} 
                        size={20} 
                        color={theme.primary} 
                      />
                    </View>
                    <View style={styles.gameInfo}>
                      <ThemedText type="body" style={{ fontWeight: '600' }}>
                        {GAME_NAMES[game.gameType] || game.gameType}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        {game.gamesPlayed} games • Avg: {Math.round(game.averageScore)} • Best: {game.highestScore}
                      </ThemedText>
                    </View>
                    <TrendIndicator trend={game.trend} />
                  </View>
                ))
              )}
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <Card style={styles.analysisCard}>
              <View style={styles.analysisHeader}>
                <Feather name="cpu" size={20} color={theme.primary} />
                <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
                  AI Analysis
                </ThemedText>
              </View>
              <ThemedText type="body" style={[styles.analysisText, { color: theme.textSecondary }]}>
                {report.aiAnalysis}
              </ThemedText>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500).duration(400)}>
            <Card style={styles.recommendationsCard}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Recommendations
              </ThemedText>
              {report.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationRow}>
                  <View style={[styles.recNumber, { backgroundColor: theme.primary }]}>
                    <ThemedText type="small" style={{ color: 'white', fontWeight: '600' }}>
                      {index + 1}
                    </ThemedText>
                  </View>
                  <ThemedText type="body" style={styles.recText}>
                    {rec}
                  </ThemedText>
                </View>
              ))}
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(600).duration(400)}>
            <Button onPress={generateReport} style={styles.regenerateButton}>
              Generate New Report
            </Button>
          </Animated.View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  generateSection: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  generateTitle: {
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  generateDescription: {
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
    lineHeight: 24,
  },
  generateButton: {
    paddingHorizontal: Spacing['3xl'],
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  loadingText: {
    marginTop: Spacing.lg,
  },
  errorCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  retryButton: {
    marginTop: Spacing.lg,
  },
  overallCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  overallScore: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  bigScoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  comparisonText: {
    textAlign: 'center',
  },
  scoresCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreCircleContainer: {
    alignItems: 'center',
  },
  scoreCircle: {
    borderWidth: 4,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gamesCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  gameIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  gameInfo: {
    flex: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  analysisCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  analysisText: {
    lineHeight: 24,
  },
  recommendationsCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  recNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  recText: {
    flex: 1,
    lineHeight: 22,
  },
  regenerateButton: {
    marginBottom: Spacing.xl,
  },
});
