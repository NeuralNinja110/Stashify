export interface User {
  id: string;
  name: string;
  pin: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  language: 'en' | 'ta';
  interests: string[];
  createdAt: string;
}

export interface GoldenMoment {
  id: string;
  userId: string;
  title: string;
  photoUri?: string;
  audioUri?: string;
  transcript?: string;
  emotionTags?: string[];
  memoryTags?: string[];
  aiResponse?: string;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  userId: string;
  name: string;
  photoUri?: string;
  relation: string;
  side: 'paternal' | 'maternal' | 'self' | 'friend';
  dateOfBirth?: string;
  association?: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  type: 'medicine' | 'task' | 'appointment';
  time: string;
  days: number[];
  enabled: boolean;
  createdAt: string;
}

export interface GameScore {
  id: string;
  odUserId: string;
  gameType: string;
  score: number;
  level: number;
  timeSpent: number;
  difficulty: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  userName: string;
  gameType: string;
  score: number;
  ageGroup: string;
  rank: number;
}

export interface DailyInteraction {
  id: string;
  userId: string;
  date: string;
  type: 'greeting' | 'memory' | 'question' | 'game';
  content: string;
  response?: string;
  completed: boolean;
}

export interface CognitiveReport {
  id: string;
  userId: string;
  generatedAt: string;
  shortTermMemory: number;
  longTermMemory: number;
  workingMemory: number;
  attention: number;
  language: number;
  reasoning: number;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  gameHistory: GameScore[];
}

export type OnboardingStep = 
  | 'welcome'
  | 'name'
  | 'pin'
  | 'confirmPin'
  | 'dob'
  | 'gender'
  | 'language'
  | 'interests'
  | 'complete';

export interface OnboardingData {
  name: string;
  pin: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | null;
  language: 'en' | 'ta';
  interests: string[];
}
