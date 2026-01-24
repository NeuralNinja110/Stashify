import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { getApiUrl } from '@/lib/query-client';

const { width } = Dimensions.get('window');

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  side?: string;
  photoUri?: string;
}

interface QuizQuestion {
  member1: FamilyMember;
  member2: FamilyMember;
  correctRelation: string;
  options: string[];
}

const RELATION_MAP: Record<string, string> = {
  'father-mother': 'Husband & Wife',
  'mother-father': 'Husband & Wife',
  'father-son': 'Father & Son',
  'son-father': 'Father & Son',
  'father-daughter': 'Father & Daughter',
  'daughter-father': 'Father & Daughter',
  'mother-son': 'Mother & Son',
  'son-mother': 'Mother & Son',
  'mother-daughter': 'Mother & Daughter',
  'daughter-mother': 'Mother & Daughter',
  'brother-brother': 'Brothers',
  'sister-sister': 'Sisters',
  'brother-sister': 'Siblings',
  'sister-brother': 'Siblings',
  'grandfather-grandmother': 'Grandparents',
  'grandmother-grandfather': 'Grandparents',
  'grandfather-father': 'Father & Son',
  'father-grandfather': 'Father & Son',
  'grandfather-mother': 'Father & Daughter-in-law',
  'grandmother-father': 'Mother & Son',
  'grandmother-mother': 'Mother & Daughter-in-law',
  'uncle-aunt': 'Husband & Wife',
  'aunt-uncle': 'Husband & Wife',
  'cousin-cousin': 'Cousins',
};

const ALL_RELATIONS = [
  'Husband & Wife',
  'Father & Son',
  'Father & Daughter',
  'Mother & Son',
  'Mother & Daughter',
  'Brothers',
  'Sisters',
  'Siblings',
  'Grandparents',
  'Cousins',
  'Uncle & Nephew',
  'Aunt & Niece',
  'Father & Daughter-in-law',
  'Mother & Daughter-in-law',
];

function getRelationBetween(member1: FamilyMember, member2: FamilyMember): string {
  const key1 = `${member1.relation.toLowerCase()}-${member2.relation.toLowerCase()}`;
  const key2 = `${member2.relation.toLowerCase()}-${member1.relation.toLowerCase()}`;
  
  if (RELATION_MAP[key1]) return RELATION_MAP[key1];
  if (RELATION_MAP[key2]) return RELATION_MAP[key2];
  
  if (member1.relation === member2.relation) {
    return `Both are your ${member1.relation}s`;
  }
  
  return `${member1.relation} & ${member2.relation}`;
}

function generateOptions(correctRelation: string): string[] {
  const options = new Set<string>([correctRelation]);
  
  while (options.size < 4) {
    const randomRelation = ALL_RELATIONS[Math.floor(Math.random() * ALL_RELATIONS.length)];
    if (randomRelation !== correctRelation) {
      options.add(randomRelation);
    }
  }
  
  return Array.from(options).sort(() => Math.random() - 0.5);
}

export default function FamilyQuizScreen() {
  const navigation = useNavigation();
  const { theme: colors } = useTheme();
  const { user } = useAuth();
  
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [usedPairs, setUsedPairs] = useState<Set<string>>(new Set());
  
  const card1Scale = useSharedValue(1);
  const card2Scale = useSharedValue(1);
  const resultOpacity = useSharedValue(0);

  const fetchFamilyMembers = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`${getApiUrl()}/api/family/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setFamilyMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch family members:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchFamilyMembers();
  }, [fetchFamilyMembers]);

  const generateQuestion = useCallback(() => {
    if (familyMembers.length < 2) return null;
    
    let attempts = 0;
    let member1: FamilyMember, member2: FamilyMember;
    let pairKey: string;
    
    do {
      const shuffled = [...familyMembers].sort(() => Math.random() - 0.5);
      member1 = shuffled[0];
      member2 = shuffled[1];
      pairKey = [member1.id, member2.id].sort().join('-');
      attempts++;
    } while (usedPairs.has(pairKey) && attempts < 20);
    
    if (attempts >= 20) {
      setUsedPairs(new Set());
      const shuffled = [...familyMembers].sort(() => Math.random() - 0.5);
      member1 = shuffled[0];
      member2 = shuffled[1];
      pairKey = [member1.id, member2.id].sort().join('-');
    }
    
    setUsedPairs(prev => new Set(prev).add(pairKey));
    
    const correctRelation = getRelationBetween(member1, member2);
    const options = generateOptions(correctRelation);
    
    return {
      member1,
      member2,
      correctRelation,
      options,
    };
  }, [familyMembers, usedPairs]);

  useEffect(() => {
    if (familyMembers.length >= 2 && !currentQuestion && !gameOver) {
      const question = generateQuestion();
      setCurrentQuestion(question);
    }
  }, [familyMembers, currentQuestion, gameOver, generateQuestion]);

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    
    const isCorrect = answer === currentQuestion?.correctRelation;
    
    if (isCorrect) {
      setScore(prev => prev + 10);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      card1Scale.value = withSequence(
        withSpring(1.1),
        withSpring(1)
      );
      card2Scale.value = withSequence(
        withSpring(1.1),
        withSpring(1)
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    resultOpacity.value = withTiming(1, { duration: 300 });
  };

  const handleNext = () => {
    if (questionNumber >= 10) {
      setGameOver(true);
      return;
    }
    
    setQuestionNumber(prev => prev + 1);
    setSelectedAnswer(null);
    setShowResult(false);
    resultOpacity.value = 0;
    
    const question = generateQuestion();
    setCurrentQuestion(question);
  };

  const handlePlayAgain = () => {
    setScore(0);
    setQuestionNumber(1);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameOver(false);
    setUsedPairs(new Set());
    resultOpacity.value = 0;
    
    const question = generateQuestion();
    setCurrentQuestion(question);
  };

  const card1Style = useAnimatedStyle(() => ({
    transform: [{ scale: card1Scale.value }],
  }));

  const card2Style = useAnimatedStyle(() => ({
    transform: [{ scale: card2Scale.value }],
  }));

  const resultStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
  }));

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundRoot }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText style={styles.loadingText}>Loading family members...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (familyMembers.length < 2) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundRoot }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.title}>Family Quiz</ThemedText>
          <View style={{ width: 44 }} />
        </View>
        
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={80} color={colors.textSecondary} />
          <ThemedText style={styles.emptyTitle}>Need More Family Members</ThemedText>
          <ThemedText style={styles.emptyText}>
            Add at least 2 family members to play the Family Quiz game.
          </ThemedText>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <ThemedText style={styles.addButtonText}>Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (gameOver) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundRoot }]}>
        <View style={styles.gameOverContainer}>
          <Ionicons 
            name={score >= 70 ? "trophy" : score >= 40 ? "ribbon" : "heart"} 
            size={80} 
            color={score >= 70 ? "#FFD700" : score >= 40 ? "#C0C0C0" : colors.primary} 
          />
          <ThemedText style={styles.gameOverTitle}>Quiz Complete!</ThemedText>
          <ThemedText style={styles.scoreText}>Your Score: {score}/100</ThemedText>
          <ThemedText style={styles.scoreMessage}>
            {score >= 70 ? "Excellent! You know your family very well!" :
             score >= 40 ? "Good job! Keep connecting with your family." :
             "Keep playing to know your family better!"}
          </ThemedText>
          
          <View style={styles.gameOverButtons}>
            <TouchableOpacity
              style={[styles.gameOverButton, { backgroundColor: colors.primary }]}
              onPress={handlePlayAgain}
            >
              <Ionicons name="refresh" size={24} color="#FFF" />
              <ThemedText style={styles.gameOverButtonText}>Play Again</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.gameOverButton, { backgroundColor: colors.backgroundDefault, borderWidth: 2, borderColor: colors.primary }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="home" size={24} color={colors.primary} />
              <ThemedText style={[styles.gameOverButtonText, { color: colors.primary }]}>Go Home</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundRoot }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Family Quiz</ThemedText>
        <View style={styles.scoreContainer}>
          <ThemedText style={[styles.headerScore, { color: colors.primary }]}>{score}</ThemedText>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View 
            style={[
              styles.progressFill, 
              { backgroundColor: colors.primary, width: `${(questionNumber / 10) * 100}%` }
            ]} 
          />
        </View>
        <ThemedText style={styles.progressText}>Question {questionNumber}/10</ThemedText>
      </View>

      <View style={styles.questionContainer}>
        <ThemedText style={styles.questionText}>
          What is the relationship between these two family members?
        </ThemedText>
      </View>

      <View style={styles.cardsContainer}>
        <Animated.View style={[styles.memberCard, { backgroundColor: colors.backgroundDefault }, card1Style]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="person" size={40} color={colors.primary} />
          </View>
          <ThemedText style={styles.memberName}>{currentQuestion?.member1.name}</ThemedText>
          <ThemedText style={[styles.memberRelation, { color: colors.textSecondary }]}>
            (Your {currentQuestion?.member1.relation})
          </ThemedText>
        </Animated.View>

        <View style={styles.connectionLine}>
          <Ionicons name="link" size={28} color={colors.primary} />
        </View>

        <Animated.View style={[styles.memberCard, { backgroundColor: colors.backgroundDefault }, card2Style]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.accent + '20' }]}>
            <Ionicons name="person" size={40} color={colors.accent} />
          </View>
          <ThemedText style={styles.memberName}>{currentQuestion?.member2.name}</ThemedText>
          <ThemedText style={[styles.memberRelation, { color: colors.textSecondary }]}>
            (Your {currentQuestion?.member2.relation})
          </ThemedText>
        </Animated.View>
      </View>

      <View style={styles.optionsContainer}>
        {currentQuestion?.options.map((option, index) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option === currentQuestion.correctRelation;
          
          let optionStyle = { backgroundColor: colors.backgroundDefault, borderColor: colors.border };
          if (showResult) {
            if (isCorrect) {
              optionStyle = { backgroundColor: '#4CAF50' + '20', borderColor: '#4CAF50' };
            } else if (isSelected && !isCorrect) {
              optionStyle = { backgroundColor: '#F44336' + '20', borderColor: '#F44336' };
            }
          } else if (isSelected) {
            optionStyle = { backgroundColor: colors.primary + '20', borderColor: colors.primary };
          }
          
          return (
            <TouchableOpacity
              key={index}
              style={[styles.optionButton, optionStyle]}
              onPress={() => handleAnswer(option)}
              disabled={showResult}
            >
              <ThemedText style={[
                styles.optionText,
                showResult && isCorrect && { color: '#4CAF50', fontWeight: '700' },
                showResult && isSelected && !isCorrect && { color: '#F44336' },
              ]}>
                {option}
              </ThemedText>
              {showResult && isCorrect && (
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              )}
              {showResult && isSelected && !isCorrect && (
                <Ionicons name="close-circle" size={24} color="#F44336" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {showResult && (
        <Animated.View style={[styles.resultContainer, resultStyle]}>
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: colors.primary }]}
            onPress={handleNext}
          >
            <ThemedText style={styles.nextButtonText}>
              {questionNumber >= 10 ? 'See Results' : 'Next Question'}
            </ThemedText>
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  scoreContainer: {
    width: 44,
    alignItems: 'center',
  },
  headerScore: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  questionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  questionText: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  cardsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  memberCard: {
    width: (width - 80) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  memberRelation: {
    fontSize: 13,
    textAlign: 'center',
  },
  connectionLine: {
    marginHorizontal: 8,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  resultContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 24,
  },
  addButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  gameOverContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '600',
  },
  scoreMessage: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 24,
  },
  gameOverButtons: {
    marginTop: 24,
    gap: 12,
    width: '100%',
  },
  gameOverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  gameOverButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
