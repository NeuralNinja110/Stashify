import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TextInput, Pressable } from 'react-native';
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

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const companionName =
    user?.gender === 'female' ? t('companion.thunaivi') : t('companion.thunaivan');

  useEffect(() => {
    const greeting = `Hello ${user?.name}! I'm ${companionName}. ${t('companion.howAreYou')}`;
    
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      },
    ]);

    Speech.speak(greeting, {
      language: user?.language === 'ta' ? 'ta-IN' : 'en-US',
      rate: 0.9,
    });
  }, []);

  const handleVoicePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecording(!isRecording);
    
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        const userMessage = "How are you today?";
        handleSendMessage(userMessage);
      }, 3000);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    setTimeout(() => {
      const responses = [
        `That's wonderful to hear, ${user?.name}! Would you like to share a memory with me today?`,
        `I'm so glad you're here. Remember when you told me about your family? Let's talk about that.`,
        `That sounds lovely! Your interests in ${user?.interests?.[0]} always make for great conversations.`,
        `I'm here for you. Would you like to play a memory game or share a golden moment?`,
      ];

      const response = responses[Math.floor(Math.random() * responses.length)];

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);

      Speech.speak(response, {
        language: user?.language === 'ta' ? 'ta-IN' : 'en-US',
        rate: 0.9,
      });
    }, 1500);
  };

  const handleClose = () => {
    Speech.stop();
    navigation.goBack();
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(300)}
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
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        inverted={false}
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
            testID="input-message"
          />
          <Pressable
            onPress={() => handleSendMessage(inputText)}
            disabled={!inputText.trim()}
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim()
                  ? theme.primary
                  : theme.backgroundSecondary,
              },
            ]}
            testID="button-send"
          >
            <Feather
              name="send"
              size={20}
              color={inputText.trim() ? '#FFFFFF' : theme.textSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.voiceSection}>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginBottom: Spacing.md }}
          >
            {isRecording ? t('companion.listening') : t('companion.tapToSpeak')}
          </ThemedText>
          <VoiceButton isRecording={isRecording} onPress={handleVoicePress} />
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
