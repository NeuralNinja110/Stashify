import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, FlatList, TextInput, Pressable, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, SlideInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Avatar } from '@/components/Avatar';
import { VoiceButton } from '@/components/VoiceButton';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { getApiUrl } from '@/lib/query-client';

// Web Speech API types
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

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
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

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

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setVoiceSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = user?.language === 'ta' ? 'ta-IN' : 'en-US';
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript.trim()) {
            setInputText(transcript);
            handleSendMessage(transcript);
          }
          setIsRecording(false);
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          if (event.error === 'not-allowed') {
            Alert.alert('Permission Required', 'Please allow microphone access to use voice input.');
          }
        };
        
        recognition.onend = () => {
          setIsRecording(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
  }, [user?.language]);

  const handleVoicePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!voiceSupported) {
      Alert.alert(
        'Voice Input Unavailable', 
        'Voice input is not supported in this browser. Please type your message instead.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recognition:', error);
        Alert.alert('Error', 'Failed to start voice input. Please try again.');
      }
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
            {isRecording 
              ? t('companion.listening', { defaultValue: 'Listening...' })
              : voiceSupported 
                ? t('companion.tapToSpeak', { defaultValue: 'Tap to speak' })
                : t('companion.voiceUnavailable', { defaultValue: 'Voice not supported' })}
          </ThemedText>
          <VoiceButton 
            isRecording={isRecording} 
            onPress={handleVoicePress} 
            disabled={isLoading}
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
