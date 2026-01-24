import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Image, Pressable } from 'react-native';
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
import { VoiceButton } from '@/components/VoiceButton';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';

export default function AddMomentScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleVoicePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecording(!isRecording);
    
    if (isRecording) {
      setHasRecording(true);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  const canSave = title.trim() && (hasRecording || photoUri);

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
          {photoUri ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photoUri }} style={styles.photo} />
              <Pressable
                onPress={() => setPhotoUri(null)}
                style={[
                  styles.removePhotoButton,
                  { backgroundColor: theme.error },
                ]}
              >
                <Feather name="x" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <Pressable
                onPress={handlePickImage}
                style={[
                  styles.photoButton,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                testID="button-pick-image"
              >
                <Feather name="image" size={32} color={theme.primary} />
                <ThemedText type="small" style={{ marginTop: Spacing.sm }}>
                  Gallery
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleTakePhoto}
                style={[
                  styles.photoButton,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                testID="button-take-photo"
              >
                <Feather name="camera" size={32} color={theme.primary} />
                <ThemedText type="small" style={{ marginTop: Spacing.sm }}>
                  Camera
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.inputSection}>
          <ThemedText type="h4" style={styles.label}>
            Title
          </ThemedText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Give this memory a title..."
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.titleInput,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            testID="input-title"
          />
        </View>

        <View style={styles.voiceSection}>
          <ThemedText type="h4" style={styles.label}>
            {t('moments.recordStory')}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.voiceDescription, { color: theme.textSecondary }]}
          >
            Share your story through voice. Tell me about this memory.
          </ThemedText>

          <View style={styles.voiceControls}>
            <VoiceButton isRecording={isRecording} onPress={handleVoicePress} />
            {hasRecording && !isRecording && (
              <View style={styles.recordingStatus}>
                <Feather name="check-circle" size={24} color={theme.success} />
                <ThemedText
                  type="body"
                  style={{ color: theme.success, marginLeft: Spacing.sm }}
                >
                  Recording saved
                </ThemedText>
              </View>
            )}
            {isRecording && (
              <ThemedText
                type="body"
                style={{ color: theme.error, marginTop: Spacing.lg }}
              >
                Recording...
              </ThemedText>
            )}
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
  photoSection: {
    marginBottom: Spacing['2xl'],
  },
  photoPreview: {
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
  },
  removePhotoButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  photoButton: {
    flex: 1,
    height: 120,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputSection: {
    marginBottom: Spacing['2xl'],
  },
  label: {
    marginBottom: Spacing.md,
  },
  titleInput: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    fontSize: 18,
    borderWidth: 2,
  },
  voiceSection: {
    marginBottom: Spacing['2xl'],
  },
  voiceDescription: {
    marginBottom: Spacing['2xl'],
  },
  voiceControls: {
    alignItems: 'center',
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  saveButton: {},
});
