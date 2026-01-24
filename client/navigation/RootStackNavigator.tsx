import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainTabNavigator from '@/navigation/MainTabNavigator';
import OnboardingScreen from '@/screens/OnboardingScreen';
import LoginScreen from '@/screens/LoginScreen';
import VoiceCompanionScreen from '@/screens/VoiceCompanionScreen';
import MemoryGridScreen from '@/screens/MemoryGridScreen';
import WordChainScreen from '@/screens/WordChainScreen';
import EchoChroniclesScreen from '@/screens/EchoChroniclesScreen';
import RiddlesScreen from '@/screens/RiddlesScreen';
import LeaderboardScreen from '@/screens/LeaderboardScreen';
import AddMomentScreen from '@/screens/AddMomentScreen';
import AddFamilyMemberScreen from '@/screens/AddFamilyMemberScreen';
import FamilyMemberDetailScreen from '@/screens/FamilyMemberDetailScreen';
import AddReminderScreen from '@/screens/AddReminderScreen';
import { useScreenOptions } from '@/hooks/useScreenOptions';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  MainTabs: { screen?: string } | undefined;
  VoiceCompanion: undefined;
  MemoryGrid: undefined;
  WordChain: undefined;
  EchoChronicles: undefined;
  Riddles: undefined;
  MemoryQuiz: undefined;
  FamilyQuiz: undefined;
  AddMoment: undefined;
  MomentDetail: { momentId: string };
  PlayMoment: { momentId: string };
  AddFamilyMember: undefined;
  FamilyMemberDetail: { memberId: string };
  AddReminder: undefined;
  Leaderboard: { gameType?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { user, isLoading, isOnboarded } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!isOnboarded ? (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      ) : !user ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="VoiceCompanion"
            component={VoiceCompanionScreen}
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="MemoryGrid"
            component={MemoryGridScreen}
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="WordChain"
            component={WordChainScreen}
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="EchoChronicles"
            component={EchoChroniclesScreen}
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Riddles"
            component={RiddlesScreen}
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="MemoryQuiz"
            component={MemoryGridScreen}
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="FamilyQuiz"
            component={MemoryGridScreen}
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="AddMoment"
            component={AddMomentScreen}
            options={{
              title: 'Add Memory',
            }}
          />
          <Stack.Screen
            name="AddFamilyMember"
            component={AddFamilyMemberScreen}
            options={{
              title: 'Add Family Member',
            }}
          />
          <Stack.Screen
            name="FamilyMemberDetail"
            component={FamilyMemberDetailScreen}
            options={{
              title: 'Edit Family Member',
            }}
          />
          <Stack.Screen
            name="AddReminder"
            component={AddReminderScreen}
            options={{
              title: 'Add Reminder',
            }}
          />
          <Stack.Screen
            name="Leaderboard"
            component={LeaderboardScreen}
            options={{
              title: 'Leaderboard',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
