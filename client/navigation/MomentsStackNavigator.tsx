import React from 'react';
import { Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { HeaderButton } from '@react-navigation/elements';
import { useTranslation } from 'react-i18next';

import MomentsScreen from '@/screens/MomentsScreen';
import { useScreenOptions } from '@/hooks/useScreenOptions';
import { useTheme } from '@/hooks/useTheme';
import type { RootStackParamList } from '@/navigation/RootStackNavigator';

export type MomentsStackParamList = {
  Moments: undefined;
};

const Stack = createNativeStackNavigator<MomentsStackParamList>();

export default function MomentsStackNavigator() {
  const screenOptions = useScreenOptions();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Moments"
        component={MomentsScreen}
        options={{
          title: t('moments.goldenMoments'),
          headerRight: () => (
            <HeaderButton
              onPress={() => navigation.navigate('AddMoment')}
              accessibilityLabel="Add memory"
            >
              <Feather name="plus" size={24} color={theme.primary} />
            </HeaderButton>
          ),
        }}
      />
    </Stack.Navigator>
  );
}
