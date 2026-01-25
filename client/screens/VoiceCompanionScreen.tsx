import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, FlatList, TextInput, Pressable, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, SlideInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useTranslation } from 'react-i18next';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Avatar } from '@/components/Avatar';
import { VoiceButton } from '@/components/VoiceButton';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { getApiUrl } from '@/lib/query-client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function VoiceCompanionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // Expo audio recorder for mobile
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  
  // Web fallback refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const companionName =
    user?.gender === 'female' ? t('companion.thunaivi') : t('companion.thunaivan');

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const response = await fetch(new URL(`/api/chat/${user?.id || 'guest'}`, getApiUrl()).toString());
      if (response.ok) {
        const history = await response.json();
        if (history.length > 0) {
          setMessages(history.map((h: any) => ({
            id: h.id,
            role: h.role,
            content: h.content,
            timestamp: new Date(h.createdAt),
          })));
        } else {
          sendInitialGreeting();
        }
      } else {
        sendInitialGreeting();
      }
    } catch (error) {
      sendInitialGreeting();
    }
  };

  const sendInitialGreeting = async () => {
    const greeting = `Hello ${user?.name || 'friend'}! I'm ${companionName}, your companion. How are you feeling today?`;
    
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      },
    ]);

    if (Platform.OS !== 'web') {
      Speech.speak(greeting, {
        language: user?.language === 'ta' ? 'ta-IN' : 'en-US',
        rate: 0.9,
      });
    }
  };

  // Start recording - uses Expo audio for mobile, MediaRecorder for web
  const startRecording = async () => {
    try {
      // Request permission first
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission Required', 'Please allow microphone access to use voice input.');
        return;
      }
      
      // Start Expo audio recording
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Could not start recording. Please try typing instead.');
    }
  };

  // Stop recording and transcribe
  const stopRecording = async () => {
    if (!isRecording) return;
    
    try {
      setIsRecording(false);
      setIsTranscribing(true);
      
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      
      if (uri) {
        // Read file as base64 - use string 'base64' as fallback if EncodingType is undefined
        const encodingType = FileSystem.EncodingType?.Base64 || 'base64';
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: encodingType as FileSystem.EncodingType,
        });
        
        // Determine mime type from URI
        let mimeType = 'audio/m4a';
        if (uri.endsWith('.wav')) mimeType = 'audio/wav';
        else if (uri.endsWith('.webm')) mimeType = 'audio/webm';
        else if (uri.endsWith('.mp3')) mimeType = 'audio/mp3';
        
        try {
          const response = await fetch(
            new URL('/api/speech-to-text', getApiUrl()).toString(),
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64,
                language: user?.language || 'en',
                mimeType: mimeType,
              }),
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.transcription?.trim()) {
              handleSendMessage(data.transcription);
            } else {
              Alert.alert('Voice Input', 'Could not understand the audio. Please try again.');
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Transcription failed:', errorData);
            Alert.alert('Error', 'Failed to transcribe audio. Please try typing instead.');
          }
        } catch (error) {
          console.error('Transcription error:', error);
          Alert.alert('Error', 'Failed to process voice. Please try typing instead.');
        }
      } else {
        Alert.alert('Recording Error', 'No audio was recorded. Please try again.');
      }
    } catch (error) {
      console.error('Stop recording error:', error);
      Alert.alert('Error', 'Recording failed. Please try typing instead.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleVoicePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch(new URL('/api/chat', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'guest',
          message: text.trim(),
          userName: user?.name || 'Friend',
          userGender: user?.gender,
          userLanguage: user?.language,
          userInterests: user?.interests,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (Platform.OS !== 'web') {
          Speech.speak(data.response, {
            language: user?.language === 'ta' ? 'ta-IN' : 'en-US',
            rate: 0.9,
          });
        }
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    Speech.stop();
    navigation.goBack();
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(300)}
      style={[
        styles.messageContainer,
        item.role === 'user' ? styles.userMessage : styles.assistantMessage,
      ]}
    >
      {item.role === 'assistant' && (
        <Avatar size="small" gender={user?.gender} />
      )}
      <View
        style={[
          styles.messageBubble,
          {
            backgroundColor:
              item.role === 'user'
                ? theme.primary
                : theme.backgroundDefault,
          },
        ]}
      >
        <ThemedText
          type="body"
          style={{
            color: item.role === 'user' ? '#FFFFFF' : theme.text,
          }}
        >
          {item.content}
        </ThemedText>
      </View>
    </Animated.View>
  );

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.lg,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Avatar size="small" gender={user?.gender} />
          <View style={styles.headerText}>
            <ThemedText type="h4">{companionName}</ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.success }}
            >
              Online
            </ThemedText>
          </View>
        </View>
        <Pressable onPress={handleClose} style={styles.closeButton} testID="button-close">
          <Feather name="x" size={28} color={theme.text} />
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {isLoading && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.typingIndicator}
        >
          <Avatar size="small" gender={user?.gender} />
          <View
            style={[
              styles.typingBubble,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              {companionName} is thinking...
            </ThemedText>
          </View>
        </Animated.View>
      )}

      <Animated.View
        entering={SlideInUp.duration(400)}
        style={[
          styles.inputArea,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <View style={styles.inputRow}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
              },
            ]}
            multiline
            onSubmitEditing={() => handleSendMessage(inputText)}
            testID="input-message"
          />
          <Pressable
            onPress={() => handleSendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() && !isLoading
                  ? theme.primary
                  : theme.backgroundSecondary,
              },
            ]}
            testID="button-send"
          >
            <Feather
              name="send"
              size={20}
              color={inputText.trim() && !isLoading ? '#FFFFFF' : theme.textSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.voiceSection}>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginBottom: Spacing.md }}
          >
            {isTranscribing 
              ? t('companion.processing', { defaultValue: 'Processing...' })
              : isRecording 
                ? t('companion.listening', { defaultValue: 'Listening...' })
                : t('companion.tapToSpeak', { defaultValue: 'Tap to speak' })}
          </ThemedText>
          <VoiceButton 
            isRecording={isRecording} 
            onPress={handleVoicePress} 
            disabled={isLoading || isTranscribing}
          />
        </View>
      </Animated.View>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginLeft: Spacing.sm,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  typingBubble: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginLeft: Spacing.sm,
  },
  inputArea: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing['2xl'],
  },
  textInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceSection: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
});
