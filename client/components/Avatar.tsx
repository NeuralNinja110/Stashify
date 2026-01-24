import React from 'react';
import { StyleSheet, View, Image, ImageSourcePropType } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';

interface AvatarProps {
  source?: ImageSourcePropType;
  size?: 'small' | 'medium' | 'large';
  gender?: 'male' | 'female';
}

const thunaivan = require('../../assets/images/thunaivan-avatar.png');
const thunaivi = require('../../assets/images/thunaivi-avatar.png');

export function Avatar({ source, size = 'medium', gender = 'male' }: AvatarProps) {
  const { theme } = useTheme();

  const getSize = () => {
    switch (size) {
      case 'small':
        return Spacing.avatarSmall;
      case 'large':
        return Spacing.avatarLarge;
      default:
        return Spacing.avatarMedium;
    }
  };

  const avatarSize = getSize();
  const defaultSource = gender === 'female' ? thunaivi : thunaivan;

  return (
    <View
      style={[
        styles.container,
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          backgroundColor: theme.backgroundSecondary,
        },
      ]}
    >
      <Image
        source={source || defaultSource}
        style={[
          styles.image,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          },
        ]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {},
});
