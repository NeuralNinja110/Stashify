import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ReminderCard } from '@/components/ReminderCard';
import { VoiceButton } from '@/components/VoiceButton';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { Reminder } from '@/types';
import type { RootStackParamList } from '@/navigation/RootStackNavigator';

const emptyReminders = require('../../assets/images/empty-reminders.png');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('companion.greeting');
    if (hour < 17) return t('companion.goodAfternoon');
    return t('companion.goodEvening');
  };

  const companionName =
    user?.gender === 'female' ? t('companion.thunaivi') : t('companion.thunaivan');

  const handleVoicePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecording(!isRecording);
    navigation.navigate('VoiceCompanion');
  };

  const handleReminderToggle = (id: string, enabled: boolean) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled } : r))
    );
  };

  const handleAddReminder = () => {
    navigation.navigate('AddReminder');
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
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.greetingSection}
        >
          <View style={styles.greetingCard}>
            <Avatar size="large" gender={user?.gender} />
            <View style={styles.greetingContent}>
              <ThemedText type="h3">
                {getGreeting()}, {user?.name}!
              </ThemedText>
              <ThemedText
                type="body"
                style={[styles.companionMessage, { color: theme.textSecondary }]}
              >
                I'm {companionName}, {t('companion.letsRemember')}
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          style={styles.voiceSection}
        >
          <Card
            style={[
              styles.voiceCard,
              { backgroundColor: theme.primary + '10' },
            ]}
          >
            <View style={styles.voiceCardContent}>
              <View style={styles.voiceTextSection}>
                <ThemedText type="h4" style={{ color: theme.primary }}>
                  {t('companion.tapToSpeak')}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary }}
                >
                  Ask me anything or share a memory
                </ThemedText>
              </View>
              <VoiceButton
                isRecording={isRecording}
                onPress={handleVoicePress}
                size="medium"
              />
            </View>
          </Card>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={styles.remindersSection}
        >
          <View style={styles.sectionHeader}>
            <ThemedText type="h3">{t('reminders.title')}</ThemedText>
            <Pressable
              onPress={handleAddReminder}
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              testID="button-add-reminder"
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {reminders.length > 0 ? (
            reminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onToggle={handleReminderToggle}
                onPress={() => {}}
              />
            ))
          ) : (
            <EmptyState
              image={emptyReminders}
              title={t('reminders.noReminders')}
              description={t('reminders.noRemindersDesc')}
              actionLabel={t('reminders.addReminder')}
              onAction={handleAddReminder}
            />
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(400).duration(500)}
          style={styles.quickActions}
        >
          <ThemedText type="h3" style={styles.sectionTitle}>
            Quick Actions
          </ThemedText>
          <View style={styles.actionsGrid}>
            <Pressable
              onPress={() => navigation.navigate('MainTabs', { screen: 'GamesTab' })}
              style={[
                styles.actionCard,
                { backgroundColor: theme.backgroundDefault },
              ]}
              testID="button-quick-games"
            >
              <Feather name="grid" size={32} color={theme.primary} />
              <ThemedText type="small" style={styles.actionText}>
                {t('gamesTab')}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('MainTabs', { screen: 'MomentsTab' })}
              style={[
                styles.actionCard,
                { backgroundColor: theme.backgroundDefault },
              ]}
              testID="button-quick-moments"
            >
              <Feather name="heart" size={32} color={theme.primary} />
              <ThemedText type="small" style={styles.actionText}>
                {t('momentsTab')}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('MainTabs', { screen: 'FamilyTab' })}
              style={[
                styles.actionCard,
                { backgroundColor: theme.backgroundDefault },
              ]}
              testID="button-quick-family"
            >
              <Feather name="users" size={32} color={theme.primary} />
              <ThemedText type="small" style={styles.actionText}>
                {t('familyTab')}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('MemoryQuiz')}
              style={[
                styles.actionCard,
                { backgroundColor: theme.backgroundDefault },
              ]}
              testID="button-quick-quiz"
            >
              <Feather name="help-circle" size={32} color={theme.primary} />
              <ThemedText type="small" style={styles.actionText}>
                Quiz
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>
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
  greetingSection: {
    marginBottom: Spacing['2xl'],
  },
  greetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingContent: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  companionMessage: {
    marginTop: Spacing.xs,
  },
  voiceSection: {
    marginBottom: Spacing['2xl'],
  },
  voiceCard: {
    borderRadius: BorderRadius.xl,
  },
  voiceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceTextSection: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  remindersSection: {
    marginBottom: Spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  actionCard: {
    width: '47%',
    aspectRatio: 1.5,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    marginTop: Spacing.sm,
  },
});
