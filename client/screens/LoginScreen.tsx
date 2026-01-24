import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';

const splashIcon = require('../../assets/images/splash-icon.png');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { login } = useAuth();
  const { t } = useTranslation();

  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (pin.length < 4) return;

    setIsLoading(true);
    setError(false);

    try {
      const success = await login(pin);
      if (!success) {
        setError(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPin('');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      setError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing['4xl'],
          paddingBottom: insets.bottom + Spacing['2xl'],
        },
      ]}
    >
      <Animated.View entering={FadeIn.duration(500)} style={styles.content}>
        <Image source={splashIcon} style={styles.logo} resizeMode="contain" />
        <ThemedText type="h1" style={styles.title}>
          {t('welcome')}
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          Enter your PIN to continue
        </ThemedText>

        <View style={styles.pinContainer}>
          <TextInput
            value={pin}
            onChangeText={(text) => {
              setError(false);
              setPin(text.replace(/[^0-9]/g, '').slice(0, 6));
            }}
            placeholder="* * * *"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.pinInput,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: error ? theme.error : theme.border,
              },
            ]}
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
            autoFocus
            testID="input-login-pin"
          />
          {error && (
            <ThemedText
              type="small"
              style={[styles.errorText, { color: theme.error }]}
            >
              Incorrect PIN. Please try again.
            </ThemedText>
          )}
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <Button
          onPress={handleLogin}
          disabled={pin.length < 4 || isLoading}
          style={styles.loginButton}
        >
          {isLoading ? t('common.loading') : 'Sign In'}
        </Button>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: Spacing['3xl'],
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing['3xl'],
  },
  pinContainer: {
    width: '100%',
    alignItems: 'center',
  },
  pinInput: {
    width: '100%',
    maxWidth: 240,
    height: 80,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    fontSize: 32,
    textAlign: 'center',
    letterSpacing: 16,
    borderWidth: 2,
  },
  errorText: {
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing['2xl'],
  },
  loginButton: {
    height: Spacing.buttonHeight,
  },
});
