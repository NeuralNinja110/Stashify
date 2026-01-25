import React, { useState, useRef } from 'react';
import { StyleSheet, View, TextInput, Image, Pressable, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { VoiceButton } from '@/components/VoiceButton';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { apiRequest } from '@/lib/query-client';

export default function AddMomentScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const createMomentMutation = useMutation({
    mutationFn: async (momentData: {
      userId: string;
      title: string;
      description?: string;
      photoUri?: string;
      audioUri?: string;
      tags?: string[];
    }) => {
      const response = await apiRequest('POST', '/api/moments', momentData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/moments/user'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    },
    onError: (error) => {
      console.error('Failed to save moment:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

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
    if (Platform.OS === 'web') {
      handlePickImage();
      return;
    }

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

  const handleVoicePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isRecording) {
      // Stop recording
      try {
        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync();
          const uri = recordingRef.current.getURI();
          if (uri) {
            setAudioUri(uri);
            // Convert audio to base64 for storage
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: 'base64',
            });
            setAudioBase64(`data:audio/m4a;base64,${base64}`);
            setHasRecording(true);
          }
          recordingRef.current = null;
        }
      } catch (error) {
        console.error('Error stopping recording:', error);
        Alert.alert('Error', 'Failed to stop recording');
      }
      setIsRecording(false);
    } else {
      // Start recording
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;
        setIsRecording(true);
      } catch (error) {
        console.error('Error starting recording:', error);
        Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    createMomentMutation.mutate({
      userId: user?.id || 'guest',
      title: title.trim(),
      description: description.trim() || undefined,
      photoUri: photoUri || undefined,
      audioUri: audioBase64 || undefined,
      tags: [],
    });
  };

  const canSave = title.trim() && !createMomentMutation.isPending;

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

        <View style={styles.inputSection}>
          <ThemedText type="h4" style={styles.label}>
            Description (optional)
          </ThemedText>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Tell the story behind this moment..."
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.descriptionInput,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            testID="input-description"
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
            {hasRecording && !isRecording ? (
              <View style={styles.recordingStatus}>
                <Feather name="check-circle" size={24} color={theme.success} />
                <ThemedText
                  type="body"
                  style={{ color: theme.success, marginLeft: Spacing.sm }}
                >
                  Recording saved
                </ThemedText>
              </View>
            ) : null}
            {isRecording ? (
              <ThemedText
                type="body"
                style={{ color: theme.error, marginTop: Spacing.lg }}
              >
                Recording...
              </ThemedText>
            ) : null}
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
          disabled={!canSave}
          style={styles.saveButton}
        >
          {createMomentMutation.isPending ? t('common.loading') : t('common.save')}
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
  descriptionInput: {
    minHeight: 120,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
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
