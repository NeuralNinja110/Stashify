import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';

const TYPES = [
  { id: 'medicine', label: 'Medicine', icon: 'heart' },
  { id: 'task', label: 'Task', icon: 'check-circle' },
  { id: 'appointment', label: 'Appointment', icon: 'calendar' },
];

const DAYS = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function AddReminderScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<string>('medicine');
  const [selectedHour, setSelectedHour] = useState(8);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [isSaving, setIsSaving] = useState(false);

  const toggleDay = (dayId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays((prev) =>
      prev.includes(dayId)
        ? prev.filter((d) => d !== dayId)
        : [...prev, dayId].sort()
    );
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  const canSave = title.trim() && selectedDays.length > 0;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing['3xl'],
          },
        ]}
      >
        <View style={styles.inputSection}>
          <ThemedText type="h4" style={styles.label}>
            Reminder Title
          </ThemedText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Take morning medicine..."
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            testID="input-title"
          />
        </View>

        <View style={styles.inputSection}>
          <ThemedText type="h4" style={styles.label}>
            Type
          </ThemedText>
          <View style={styles.typeOptions}>
            {TYPES.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setType(t.id);
                }}
                style={[
                  styles.typeButton,
                  {
                    backgroundColor:
                      type === t.id ? theme.primary : theme.backgroundDefault,
                    borderColor: type === t.id ? theme.primary : theme.border,
                  },
                ]}
              >
                <Feather
                  name={t.icon as any}
                  size={28}
                  color={type === t.id ? '#FFFFFF' : theme.text}
                />
                <ThemedText
                  type="small"
                  style={{
                    color: type === t.id ? '#FFFFFF' : theme.text,
                    marginTop: Spacing.sm,
                  }}
                >
                  {t.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.inputSection}>
          <ThemedText type="h4" style={styles.label}>
            Time
          </ThemedText>
          <View style={styles.timeContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.hoursScroll, { backgroundColor: theme.backgroundDefault }]}
              contentContainerStyle={styles.hoursContent}
            >
              {HOURS.map((hour) => (
                <Pressable
                  key={hour}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedHour(hour);
                  }}
                  style={[
                    styles.hourButton,
                    {
                      backgroundColor:
                        selectedHour === hour ? theme.primary : 'transparent',
                    },
                  ]}
                >
                  <ThemedText
                    type="h3"
                    style={{
                      color: selectedHour === hour ? '#FFFFFF' : theme.text,
                    }}
                  >
                    {hour}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.periodButtons}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPeriod('AM');
                }}
                style={[
                  styles.periodButton,
                  {
                    backgroundColor:
                      selectedPeriod === 'AM' ? theme.primary : theme.backgroundDefault,
                  },
                ]}
              >
                <ThemedText
                  type="body"
                  style={{ color: selectedPeriod === 'AM' ? '#FFFFFF' : theme.text }}
                >
                  AM
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPeriod('PM');
                }}
                style={[
                  styles.periodButton,
                  {
                    backgroundColor:
                      selectedPeriod === 'PM' ? theme.primary : theme.backgroundDefault,
                  },
                ]}
              >
                <ThemedText
                  type="body"
                  style={{ color: selectedPeriod === 'PM' ? '#FFFFFF' : theme.text }}
                >
                  PM
                </ThemedText>
              </Pressable>
            </View>
          </View>
          <ThemedText
            type="h2"
            style={[styles.selectedTime, { color: theme.primary }]}
          >
            {selectedHour}:00 {selectedPeriod}
          </ThemedText>
        </View>

        <View style={styles.inputSection}>
          <ThemedText type="h4" style={styles.label}>
            Repeat
          </ThemedText>
          <View style={styles.daysRow}>
            {DAYS.map((day) => (
              <Pressable
                key={day.id}
                onPress={() => toggleDay(day.id)}
                style={[
                  styles.dayButton,
                  {
                    backgroundColor: selectedDays.includes(day.id)
                      ? theme.primary
                      : theme.backgroundDefault,
                    borderColor: selectedDays.includes(day.id)
                      ? theme.primary
                      : theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: selectedDays.includes(day.id)
                      ? '#FFFFFF'
                      : theme.text,
                    fontWeight: '600',
                  }}
                >
                  {day.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <Button
          onPress={handleSave}
          disabled={!canSave || isSaving}
          style={styles.saveButton}
        >
          {isSaving ? t('common.loading') : t('common.save')}
        </Button>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  inputSection: {
    marginBottom: Spacing['2xl'],
  },
  label: {
    marginBottom: Spacing.md,
  },
  textInput: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    fontSize: 18,
    borderWidth: 2,
  },
  typeOptions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  typeButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeContainer: {
    marginBottom: Spacing.lg,
  },
  hoursScroll: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  hoursContent: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  hourButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  periodButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTime: {
    textAlign: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  saveButton: {},
});
