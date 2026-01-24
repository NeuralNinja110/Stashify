import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { apiRequest, getApiUrl } from '@/lib/query-client';
import type { RootStackParamList } from '@/navigation/RootStackNavigator';

type FamilyMemberDetailRouteProp = RouteProp<RootStackParamList, 'FamilyMemberDetail'>;

const RELATIONS = [
  'Mom',
  'Dad',
  'Brother',
  'Sister',
  'Son',
  'Daughter',
  'Husband',
  'Wife',
  'Grandfather',
  'Grandmother',
  'Grandson',
  'Granddaughter',
  'Uncle',
  'Aunt',
  'Nephew',
  'Niece',
  'Cousin',
  'Father-in-law',
  'Mother-in-law',
  'Son-in-law',
  'Daughter-in-law',
  'Brother-in-law',
  'Sister-in-law',
  'Friend',
  'Other',
];

const SIDES = [
  { id: 'paternal', label: 'Paternal' },
  { id: 'maternal', label: 'Maternal' },
  { id: 'self', label: 'My Side' },
  { id: 'friend', label: 'Friend' },
];

interface FamilyMember {
  id: string;
  userId: string;
  name: string;
  relation: string;
  side?: string;
  photoUri?: string;
  association?: string;
}

export default function FamilyMemberDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const route = useRoute<FamilyMemberDetailRouteProp>();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();

  const { memberId } = route.params;

  const [member, setMember] = useState<FamilyMember | null>(null);
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [relation, setRelation] = useState('');
  const [side, setSide] = useState<string>('self');
  const [association, setAssociation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchMember();
  }, [memberId]);

  const fetchMember = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(
        new URL(`/api/family/${user.id}`, getApiUrl()).toString()
      );
      if (response.ok) {
        const members = await response.json();
        const found = members.find((m: FamilyMember) => m.id === memberId);
        if (found) {
          setMember(found);
          setName(found.name);
          setRelation(found.relation);
          setSide(found.side || 'self');
          setPhotoUri(found.photoUri || null);
          setAssociation(found.association || '');
        }
      }
    } catch (error) {
      console.error('Failed to fetch member:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
    try {
      const url = new URL(`/api/family/${memberId}`, getApiUrl()).toString();
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          relation,
          side,
          photoUri: photoUri || undefined,
          association: association.trim() || undefined,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update');
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error: any) {
      console.error('Failed to update family member:', error?.message || error);
      Alert.alert('Error', error?.message || 'Failed to update family member. Please try again.');
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Family Member',
      `Are you sure you want to remove ${name} from your family tree?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await apiRequest('DELETE', `/api/family/${memberId}`, {});
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete family member:', error);
              Alert.alert('Error', 'Failed to delete family member.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const canSave = name.trim() && relation;

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

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
                  Change Photo
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
          />
        </View>

        <Pressable
          onPress={handleDelete}
          disabled={isDeleting}
          style={[styles.deleteButton, { borderColor: theme.error }]}
        >
          <Feather name="trash-2" size={20} color={theme.error} />
          <ThemedText type="body" style={{ color: theme.error, marginLeft: Spacing.sm }}>
            {isDeleting ? 'Deleting...' : 'Remove from Family Tree'}
          </ThemedText>
        </Pressable>
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
          {isSaving ? t('common.loading') : 'Save Changes'}
        </Button>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    marginTop: Spacing.xl,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  saveButton: {},
});
