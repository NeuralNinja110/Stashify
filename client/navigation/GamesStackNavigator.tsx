import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import GamesScreen from '@/screens/GamesScreen';
import { useScreenOptions } from '@/hooks/useScreenOptions';

export type GamesStackParamList = {
  Games: undefined;
};

const Stack = createNativeStackNavigator<GamesStackParamList>();

export default function GamesStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Games"
        component={GamesScreen}
        options={{
          title: t('games'),
        }}
      />
    </Stack.Navigator>
  );
}
