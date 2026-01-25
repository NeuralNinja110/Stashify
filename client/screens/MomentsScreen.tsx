import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { MomentCard } from '@/components/MomentCard';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Spacing } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/RootStackNavigator';

const emptyMoments = require('../../assets/images/empty-moments.png');

interface Moment {
  id: string;
  userId: string;
  title: string;
  description?: string;
  photoUri?: string;
  audioUri?: string;
  tags?: string[];
  createdAt: string;
}

export default function MomentsScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const { data: moments = [], isLoading, refetch, isRefetching } = useQuery<Moment[]>({
    queryKey: ['/api/moments/user', user?.id || 'guest'],
    enabled: !!user,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleAddMoment = () => {
    navigation.navigate('AddMoment');
  };

  const handleMomentPress = (moment: Moment) => {
    navigation.navigate('MomentDetail', { momentId: moment.id });
  };

  const handlePlayMoment = (moment: Moment) => {
    navigation.navigate('PlayMoment', { momentId: moment.id });
  };

  const renderMoment = ({ item, index }: { item: Moment; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
      <MomentCard
        moment={{
          id: item.id,
          title: item.title,
          description: item.description,
          photoUri: item.photoUri,
          hasAudio: !!item.audioUri,
          createdAt: new Date(item.createdAt),
        }}
        onPress={() => handleMomentPress(item)}
        onPlay={() => handlePlayMoment(item)}
      />
    </Animated.View>
  );

  const renderEmpty = () => (
    <EmptyState
      image={emptyMoments}
      title={t('moments.noMoments')}
      description={t('moments.noMomentsDesc')}
      actionLabel={t('moments.addMoment')}
      onAction={handleAddMoment}
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
        data={moments}
        renderItem={renderMoment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing['3xl'],
          },
          moments.length === 0 && styles.emptyContent,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
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
