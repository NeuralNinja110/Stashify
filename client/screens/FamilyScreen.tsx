import React, { useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { FamilyMemberCard } from '@/components/FamilyMemberCard';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';
import { FamilyMember } from '@/types';
import type { RootStackParamList } from '@/navigation/RootStackNavigator';

const emptyFamily = require('../../assets/images/empty-family.png');

export default function FamilyScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddMember = () => {
    navigation.navigate('AddFamilyMember');
  };

  const handleMemberPress = (member: FamilyMember) => {
    navigation.navigate('FamilyMemberDetail', { memberId: member.id });
  };

  const renderMember = ({ item, index }: { item: FamilyMember; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
      <FamilyMemberCard
        member={item}
        onPress={() => handleMemberPress(item)}
      />
    </Animated.View>
  );

  const renderEmpty = () => (
    <EmptyState
      image={emptyFamily}
      title={t('familyTree.noMembers')}
      description={t('familyTree.noMembersDesc')}
      actionLabel={t('familyTree.addMember')}
      onAction={handleAddMember}
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View
          style={[
            styles.loadingContainer,
            { paddingTop: headerHeight + Spacing.xl },
          ]}
        >
          <ListSkeleton count={4} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing['3xl'],
          },
          members.length === 0 && styles.emptyContent,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    paddingHorizontal: Spacing.lg,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
});
