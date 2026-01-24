import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Spacing, BorderRadius } from '@/constants/theme';

interface SettingRowProps {
  icon: string;
  label: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

function SettingRow({ icon, label, onPress, rightElement }: SettingRowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.settingRow, { borderBottomColor: theme.border }]}
      disabled={!onPress && !rightElement}
    >
      <View
        style={[
          styles.settingIcon,
          { backgroundColor: theme.primary + '20' },
        ]}
      >
        <Feather name={icon as any} size={20} color={theme.primary} />
      </View>
      <ThemedText type="body" style={styles.settingLabel}>
        {label}
      </ThemedText>
      {rightElement || (
        <Feather name="chevron-right" size={24} color={theme.textSecondary} />
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { fontSize, setFontSize, language, setLanguage } = useSettings();
  const { t } = useTranslation();

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
  };

  const handleLanguageToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguage(language === 'en' ? 'ta' : 'en');
  };

  const handleFontSizeChange = (increase: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSize = increase
      ? Math.min(fontSize + 0.1, 1.4)
      : Math.max(fontSize - 0.1, 0.8);
    setFontSize(newSize);
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing['3xl'],
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <Animated.View
        entering={FadeInDown.delay(100).duration(400)}
        style={styles.profileSection}
      >
        <Avatar size="large" gender={user?.gender} />
        <ThemedText type="h2" style={styles.userName}>
          {user?.name}
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.userInfo, { color: theme.textSecondary }]}
        >
          {user?.interests?.slice(0, 3).join(' • ')}
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <Card style={styles.settingsCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            {t('profile.settings')}
          </ThemedText>

          <SettingRow
            icon="type"
            label={t('profile.fontSize')}
            rightElement={
              <View style={styles.fontSizeControls}>
                <Pressable
                  onPress={() => handleFontSizeChange(false)}
                  style={[
                    styles.fontSizeButton,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <ThemedText type="body">A-</ThemedText>
                </Pressable>
                <ThemedText type="small" style={styles.fontSizeValue}>
                  {Math.round(fontSize * 100)}%
                </ThemedText>
                <Pressable
                  onPress={() => handleFontSizeChange(true)}
                  style={[
                    styles.fontSizeButton,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <ThemedText type="h4">A+</ThemedText>
                </Pressable>
              </View>
            }
          />

          <SettingRow
            icon="globe"
            label={t('profile.language')}
            onPress={handleLanguageToggle}
            rightElement={
              <View style={styles.languageToggle}>
                <ThemedText
                  type="body"
                  style={{ color: theme.textSecondary }}
                >
                  {language === 'en' ? 'English' : 'தமிழ்'}
                </ThemedText>
                <Feather name="chevron-right" size={24} color={theme.textSecondary} />
              </View>
            }
          />

          <SettingRow
            icon="file-text"
            label={t('profile.reports')}
            onPress={() => {}}
          />

          <SettingRow
            icon="eye"
            label={t('profile.accessibility')}
            onPress={() => {}}
          />
        </Card>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).duration(400)}
        style={styles.logoutSection}
      >
        <Button
          onPress={handleLogout}
          style={[styles.logoutButton, { backgroundColor: theme.error }]}
        >
          {t('profile.logout')}
        </Button>
      </Animated.View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  userName: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  userInfo: {},
  settingsCard: {
    padding: 0,
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  settingLabel: {
    flex: 1,
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fontSizeButton: {
    width: 44,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeValue: {
    width: 48,
    textAlign: 'center',
  },
  languageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutSection: {
    marginTop: Spacing.xl,
  },
  logoutButton: {},
});
