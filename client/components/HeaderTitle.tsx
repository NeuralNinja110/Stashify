import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface HeaderTitleProps {
  title: string;
}

const icon = require('../../assets/images/icon.png');

export function HeaderTitle({ title }: HeaderTitleProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Image
        source={icon}
        style={styles.icon}
        resizeMode="contain"
      />
      <ThemedText style={[styles.title, { color: theme.primary }]}>{title}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  icon: {
    width: 32,
    height: 32,
    marginRight: Spacing.sm,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
});
