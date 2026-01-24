import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Image,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';

const RELATIONS = [
  'Parent',
  'Sibling',
  'Spouse',
  'Child',
  'Grandparent',
  'Grandchild',
  'Aunt/Uncle',
  'Cousin',
  'Friend',
  'Other',
];

const SIDES = [
  { id: 'paternal', label: 'Paternal' },
  { id: 'maternal', label: 'Maternal' },
  { id: 'self', label: 'My Side' },
  { id: 'friend', label: 'Friend' },
];

export default function AddFamilyMemberScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [relation, setRelation] = useState('');
  const [side, setSide] = useState<string>('self');
  const [association, setAssociation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !relation) return;

    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  const canSave = name.trim() && relation;

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
        <View style={styles.photoSection}>
          <Pressable
            onPress={handlePickImage}
            style={[
              styles.photoButton,
              { backgroundColor: theme.backgroundDefault },
            ]}
            testID="button-add-photo"
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <>
                <Feather name="user" size={48} color={theme.textSecondary} />
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
                >
                  Add Photo
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.inputSection}>
          <ThemedText type="h4" style={styles.label}>
            Name
          </ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter name..."
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            testID="input-name"
          />
        </View>

        <View style={styles.inputSection}>
          <ThemedText type="h4" style={styles.label}>
            {t('familyTree.relation')}
          </ThemedText>
          <View style={styles.optionsGrid}>
            {RELATIONS.map((rel) => (
              <Pressable
                key={rel}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRelation(rel);
                }}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor:
                      relation === rel ? theme.primary : theme.backgroundDefault,
                    borderColor:
                      relation === rel ? theme.primary : theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{ color: relation === rel ? '#FFFFFF' : theme.text }}
                >
                  {rel}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.inputSection}>
          <ThemedText type="h4" style={styles.label}>
            Side
          </ThemedText>
          <View style={styles.sideOptions}>
            {SIDES.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSide(s.id);
                }}
                style={[
                  styles.sideButton,
                  {
                    backgroundColor:
                      side === s.id ? theme.primary : theme.backgroundDefault,
                    borderColor: side === s.id ? theme.primary : theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{ color: side === s.id ? '#FFFFFF' : theme.text }}
                >
                  {s.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.inputSection}>
          <ThemedText type="h4" style={styles.label}>
            How are they associated? (Optional)
          </ThemedText>
          <TextInput
            value={association}
            onChangeText={setAssociation}
            placeholder="e.g., Lives nearby, childhood friend..."
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            multiline
            numberOfLines={2}
            testID="input-association"
          />
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
  photoSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: {
    width: 120,
    height: 120,
  },
  inputSection: {
    marginBottom: Spacing['2xl'],
  },
  label: {
    marginBottom: Spacing.md,
  },
  textInput: {
    minHeight: Spacing.inputHeight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 18,
    borderWidth: 2,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
  },
  sideOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sideButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  saveButton: {},
});
