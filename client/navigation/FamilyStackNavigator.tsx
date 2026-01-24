import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { HeaderButton } from '@react-navigation/elements';
import { useTranslation } from 'react-i18next';

import FamilyScreen from '@/screens/FamilyScreen';
import { useScreenOptions } from '@/hooks/useScreenOptions';
import { useTheme } from '@/hooks/useTheme';
import type { RootStackParamList } from '@/navigation/RootStackNavigator';

export type FamilyStackParamList = {
  Family: undefined;
};

const Stack = createNativeStackNavigator<FamilyStackParamList>();

export default function FamilyStackNavigator() {
  const screenOptions = useScreenOptions();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Family"
        component={FamilyScreen}
        options={{
          title: t('familyTree.title'),
          headerRight: () => (
            <HeaderButton
              onPress={() => navigation.navigate('AddFamilyMember')}
              accessibilityLabel="Add family member"
            >
              <Feather name="plus" size={24} color={theme.primary} />
            </HeaderButton>
          ),
        }}
      />
    </Stack.Navigator>
  );
}
