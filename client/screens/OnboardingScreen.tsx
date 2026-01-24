import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { InterestTag } from '@/components/InterestTag';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { OnboardingStep, OnboardingData } from '@/types';

const splashIcon = require('../../assets/images/splash-icon.png');

const INTERESTS = [
  { id: 'family', icon: 'users' },
  { id: 'travel', icon: 'map' },
  { id: 'food', icon: 'coffee' },
  { id: 'music', icon: 'music' },
  { id: 'spirituality', icon: 'sun' },
  { id: 'nature', icon: 'feather' },
  { id: 'history', icon: 'book' },
  { id: 'movies', icon: 'film' },
];

const YEARS = Array.from({ length: 60 }, (_, i) => 1940 + i);
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { completeOnboarding } = useAuth();
  const { t } = useTranslation();

  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [data, setData] = useState<OnboardingData>({
    name: '',
    pin: '',
    dateOfBirth: '',
    gender: null,
    language: 'en',
    interests: [],
  });
  const [confirmPin, setConfirmPin] = useState('');
  const [selectedYear, setSelectedYear] = useState(1960);
  const [selectedMonth, setSelectedMonth] = useState(0);

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    switch (step) {
      case 'welcome':
        setStep('name');
        break;
      case 'name':
        if (data.name.trim()) setStep('pin');
        break;
      case 'pin':
        if (data.pin.length >= 4) setStep('confirmPin');
        break;
      case 'confirmPin':
        if (confirmPin === data.pin) setStep('dob');
        break;
      case 'dob':
        if (selectedYear) {
          setData((prev) => ({
            ...prev,
            dateOfBirth: new Date(selectedYear, selectedMonth, 15).toISOString(),
          }));
          setStep('gender');
        }
        break;
      case 'gender':
        if (data.gender) setStep('language');
        break;
      case 'language':
        setStep('interests');
        break;
      case 'interests':
        if (data.interests.length > 0) {
          try {
            await completeOnboarding({
              ...data,
              dateOfBirth: new Date(selectedYear, selectedMonth, 15).toISOString(),
            });
          } catch (error) {
            console.error('Onboarding failed:', error);
          }
        }
        break;
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const steps: OnboardingStep[] = [
      'welcome',
      'name',
      'pin',
      'confirmPin',
      'dob',
      'gender',
      'language',
      'interests',
    ];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const toggleInterest = (interest: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const isNextDisabled = () => {
    switch (step) {
      case 'name':
        return !data.name.trim();
      case 'pin':
        return data.pin.length < 4;
      case 'confirmPin':
        return confirmPin !== data.pin;
      case 'dob':
        return !selectedYear;
      case 'gender':
        return !data.gender;
      case 'interests':
        return data.interests.length === 0;
      default:
        return false;
    }
  };

  const getProgress = () => {
    const steps: OnboardingStep[] = [
      'welcome',
      'name',
      'pin',
      'confirmPin',
      'dob',
      'gender',
      'language',
      'interests',
    ];
    return (steps.indexOf(step) + 1) / steps.length;
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <Animated.View
            key="welcome"
            entering={FadeIn.duration(500)}
            exiting={FadeOut.duration(300)}
            style={styles.stepContainer}
          >
            <Image source={splashIcon} style={styles.logo} resizeMode="contain" />
            <ThemedText type="h1" style={styles.welcomeTitle}>
              {t('onboarding.welcome')}
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}
            >
              {t('onboarding.subtitle')}
            </ThemedText>
          </Animated.View>
        );

      case 'name':
        return (
          <Animated.View
            key="name"
            entering={SlideInRight.duration(300)}
            exiting={SlideOutLeft.duration(300)}
            style={styles.stepContainer}
          >
            <ThemedText type="h2" style={styles.questionText}>
              {t('onboarding.whatsYourName')}
            </ThemedText>
            <TextInput
              value={data.name}
              onChangeText={(text) => setData((prev) => ({ ...prev, name: text }))}
              placeholder={t('onboarding.enterName')}
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              autoFocus
              testID="input-name"
            />
          </Animated.View>
        );

      case 'pin':
        return (
          <Animated.View
            key="pin"
            entering={SlideInRight.duration(300)}
            exiting={SlideOutLeft.duration(300)}
            style={styles.stepContainer}
          >
            <ThemedText type="h2" style={styles.questionText}>
              {t('onboarding.createPin')}
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              {t('onboarding.pinSubtitle')}
            </ThemedText>
            <TextInput
              value={data.pin}
              onChangeText={(text) =>
                setData((prev) => ({ ...prev, pin: text.replace(/[^0-9]/g, '').slice(0, 6) }))
              }
              placeholder="* * * *"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.pinInput,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              testID="input-pin"
            />
          </Animated.View>
        );

      case 'confirmPin':
        return (
          <Animated.View
            key="confirmPin"
            entering={SlideInRight.duration(300)}
            exiting={SlideOutLeft.duration(300)}
            style={styles.stepContainer}
          >
            <ThemedText type="h2" style={styles.questionText}>
              {t('onboarding.confirmPin')}
            </ThemedText>
            <TextInput
              value={confirmPin}
              onChangeText={(text) =>
                setConfirmPin(text.replace(/[^0-9]/g, '').slice(0, 6))
              }
              placeholder="* * * *"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.pinInput,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: confirmPin && confirmPin !== data.pin ? theme.error : theme.border,
                },
              ]}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              testID="input-confirm-pin"
            />
          </Animated.View>
        );

      case 'dob':
        return (
          <Animated.View
            key="dob"
            entering={SlideInRight.duration(300)}
            exiting={SlideOutLeft.duration(300)}
            style={styles.stepContainer}
          >
            <ThemedText type="h2" style={styles.questionText}>
              {t('onboarding.dateOfBirth')}
            </ThemedText>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerColumn}>
                <ThemedText type="small" style={[styles.dateLabel, { color: theme.textSecondary }]}>
                  Month
                </ThemedText>
                <ScrollView
                  style={[styles.dateScroll, { backgroundColor: theme.backgroundDefault }]}
                  showsVerticalScrollIndicator={false}
                >
                  {MONTHS.map((month, index) => (
                    <Pressable
                      key={month}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedMonth(index);
                      }}
                      style={[
                        styles.dateOption,
                        selectedMonth === index && {
                          backgroundColor: theme.primary,
                        },
                      ]}
                    >
                      <ThemedText
                        type="body"
                        style={{
                          color: selectedMonth === index ? '#FFFFFF' : theme.text,
                        }}
                      >
                        {month}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.datePickerColumn}>
                <ThemedText type="small" style={[styles.dateLabel, { color: theme.textSecondary }]}>
                  Year
                </ThemedText>
                <ScrollView
                  style={[styles.dateScroll, { backgroundColor: theme.backgroundDefault }]}
                  showsVerticalScrollIndicator={false}
                >
                  {YEARS.map((year) => (
                    <Pressable
                      key={year}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedYear(year);
                      }}
                      style={[
                        styles.dateOption,
                        selectedYear === year && {
                          backgroundColor: theme.primary,
                        },
                      ]}
                    >
                      <ThemedText
                        type="body"
                        style={{
                          color: selectedYear === year ? '#FFFFFF' : theme.text,
                        }}
                      >
                        {year}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Animated.View>
        );

      case 'gender':
        return (
          <Animated.View
            key="gender"
            entering={SlideInRight.duration(300)}
            exiting={SlideOutLeft.duration(300)}
            style={styles.stepContainer}
          >
            <ThemedText type="h2" style={styles.questionText}>
              {t('onboarding.selectGender')}
            </ThemedText>
            <View style={styles.genderOptions}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setData((prev) => ({ ...prev, gender: 'male' }));
                }}
                style={[
                  styles.genderOption,
                  {
                    backgroundColor:
                      data.gender === 'male'
                        ? theme.primary
                        : theme.backgroundDefault,
                    borderColor:
                      data.gender === 'male' ? theme.primary : theme.border,
                  },
                ]}
                testID="button-male"
              >
                <Feather
                  name="user"
                  size={48}
                  color={data.gender === 'male' ? '#FFFFFF' : theme.text}
                />
                <ThemedText
                  type="h4"
                  style={{
                    color: data.gender === 'male' ? '#FFFFFF' : theme.text,
                    marginTop: Spacing.md,
                  }}
                >
                  {t('onboarding.male')}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setData((prev) => ({ ...prev, gender: 'female' }));
                }}
                style={[
                  styles.genderOption,
                  {
                    backgroundColor:
                      data.gender === 'female'
                        ? theme.primary
                        : theme.backgroundDefault,
                    borderColor:
                      data.gender === 'female' ? theme.primary : theme.border,
                  },
                ]}
                testID="button-female"
              >
                <Feather
                  name="user"
                  size={48}
                  color={data.gender === 'female' ? '#FFFFFF' : theme.text}
                />
                <ThemedText
                  type="h4"
                  style={{
                    color: data.gender === 'female' ? '#FFFFFF' : theme.text,
                    marginTop: Spacing.md,
                  }}
                >
                  {t('onboarding.female')}
                </ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        );

      case 'language':
        return (
          <Animated.View
            key="language"
            entering={SlideInRight.duration(300)}
            exiting={SlideOutLeft.duration(300)}
            style={styles.stepContainer}
          >
            <ThemedText type="h2" style={styles.questionText}>
              {t('onboarding.selectLanguage')}
            </ThemedText>
            <View style={styles.languageOptions}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setData((prev) => ({ ...prev, language: 'en' }));
                }}
                style={[
                  styles.languageOption,
                  {
                    backgroundColor:
                      data.language === 'en'
                        ? theme.primary
                        : theme.backgroundDefault,
                    borderColor:
                      data.language === 'en' ? theme.primary : theme.border,
                  },
                ]}
                testID="button-english"
              >
                <ThemedText
                  type="h3"
                  style={{
                    color: data.language === 'en' ? '#FFFFFF' : theme.text,
                  }}
                >
                  English
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setData((prev) => ({ ...prev, language: 'ta' }));
                }}
                style={[
                  styles.languageOption,
                  {
                    backgroundColor:
                      data.language === 'ta'
                        ? theme.primary
                        : theme.backgroundDefault,
                    borderColor:
                      data.language === 'ta' ? theme.primary : theme.border,
                  },
                ]}
                testID="button-tamil"
              >
                <ThemedText
                  type="h3"
                  style={{
                    color: data.language === 'ta' ? '#FFFFFF' : theme.text,
                  }}
                >
                  தமிழ்
                </ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        );

      case 'interests':
        return (
          <Animated.View
            key="interests"
            entering={SlideInRight.duration(300)}
            exiting={SlideOutLeft.duration(300)}
            style={styles.stepContainer}
          >
            <ThemedText type="h2" style={styles.questionText}>
              {t('onboarding.selectInterests')}
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              {t('onboarding.interestsSubtitle')}
            </ThemedText>
            <ScrollView
              style={styles.interestsScroll}
              showsVerticalScrollIndicator={false}
            >
              {INTERESTS.map((interest) => (
                <InterestTag
                  key={interest.id}
                  label={t(`onboarding.${interest.id}`)}
                  icon={interest.icon}
                  selected={data.interests.includes(interest.id)}
                  onPress={() => toggleInterest(interest.id)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing['2xl'] }]}>
      {step !== 'welcome' && (
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton} testID="button-back">
            <Feather name="arrow-left" size={28} color={theme.text} />
          </Pressable>
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${getProgress() * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.placeholder} />
        </View>
      )}

      <View style={styles.content}>{renderStep()}</View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button
          onPress={handleNext}
          disabled={isNextDisabled()}
          style={styles.nextButton}
        >
          {step === 'welcome'
            ? t('onboarding.getStarted')
            : step === 'interests'
            ? t('onboarding.getStarted')
            : t('onboarding.next')}
        </Button>
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
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 160,
    alignSelf: 'center',
    marginBottom: Spacing['3xl'],
  },
  welcomeTitle: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  welcomeSubtitle: {
    textAlign: 'center',
  },
  questionText: {
    marginBottom: Spacing.lg,
  },
  subtitle: {
    marginBottom: Spacing['2xl'],
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    fontSize: 20,
    borderWidth: 2,
  },
  pinInput: {
    height: 80,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    fontSize: 32,
    textAlign: 'center',
    letterSpacing: 16,
    borderWidth: 2,
  },
  datePickerContainer: {
    flexDirection: 'row',
    gap: Spacing.lg,
    flex: 1,
    maxHeight: 300,
  },
  datePickerColumn: {
    flex: 1,
  },
  dateLabel: {
    marginBottom: Spacing.sm,
  },
  dateScroll: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  dateOption: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  genderOption: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  languageOptions: {
    gap: Spacing.md,
  },
  languageOption: {
    height: 80,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  interestsScroll: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.lg,
  },
  nextButton: {
    height: Spacing.buttonHeight,
  },
});
