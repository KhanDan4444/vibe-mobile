import { Redirect, Stack, useLocalSearchParams, useNavigation, useRouter, type Href } from 'expo-router';
import { useLayoutEffect } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AppText as Text } from '@/src/components/AppText';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchTrainerMembers } from '@/src/api/trainers';
import { EmptyState } from '@/src/components/EmptyState';
import { Screen } from '@/src/components/Form';
import { InitialsAvatar } from '@/src/components/InitialsAvatar';
import { LoadError } from '@/src/components/LoadError';
import { PageSkeleton } from '@/src/components/Skeleton';
import StatusBadge from '@/src/components/StatusBadge';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useBranchScope } from '@/src/context/BranchContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import type { MemberRow } from '@/src/types/api';
import { branchDisplayName } from '@/src/utils/branchDisplayName';
import { formatEtb } from '@/src/utils/formatMoney';
import { isGymOwner } from '@/src/utils/roles';

export default function TrainerMembersScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trainerId = Number(id);
  const router = useRouter();
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const { pagePadding } = useResponsiveLayout();
  const { activeBranches } = useBranchScope();
  const showBranch = activeBranches.length > 1;
  const canManage = Boolean(user && isGymOwner(user.role));

  const query = useQuery({
    queryKey: ['trainer-members', trainerId],
    enabled: Boolean(token) && Number.isFinite(trainerId) && trainerId > 0,
    queryFn: () => fetchTrainerMembers(token as string, trainerId),
  });

  const trainerName = query.data?.trainer?.name;

  useLayoutEffect(() => {
    if (trainerName) navigation.setOptions({ title: trainerName });
  }, [navigation, trainerName]);

  if (!canManage) {
    return <Redirect href="/(tabs)/more" />;
  }

  const members = query.data?.members ?? [];

  return (
    <Screen flushBottom>
      <Stack.Screen options={{ title: trainerName || t('screens.trainerMembers') }} />
      {query.isPending ? (
        <PageSkeleton />
      ) : query.isError ? (
        <LoadError
          error={query.error}
          message={query.error instanceof Error ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: pagePadding,
            paddingTop: pagePadding,
            paddingBottom: 32,
            flexGrow: members.length === 0 ? 1 : undefined,
          }}
          ListHeaderComponent={
            members.length > 0 ? <FeeColumnLabel label={t('team.trainerPaid')} /> : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="barbell-outline"
              title={t('team.trainerMembersEmptyTitle')}
              body={t('team.trainerMembersEmptyBody')}
            />
          }
          renderItem={({ item }) => (
            <TrainerMemberRow
              member={item}
              showBranch={showBranch}
              unpaidLabel={t('members.unpaidBadge')}
              onPress={() => router.push(`/member/${item.id}` as Href)}
            />
          )}
        />
      )}
    </Screen>
  );
}

function FeeColumnLabel({ label }: { label: string }) {
  const styles = useThemedStyles((colors) => ({
    label: {
      marginBottom: 8,
      textAlign: 'right' as const,
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.muted,
    },
  }));
  return <Text style={styles.label}>{label}</Text>;
}

function TrainerMemberRow({
  member,
  showBranch,
  unpaidLabel,
  onPress,
}: {
  member: MemberRow;
  showBranch: boolean;
  unpaidLabel: string;
  onPress: () => void;
}) {
  const paid = Number(member.trainer_paid) > 0;
  const styles = useThemedStyles((colors) => ({
    row: { padding: 14, marginBottom: 10 },
    rowMain: { flex: 1, minWidth: 0, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    copy: { flex: 1, minWidth: 0 },
    name: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
    meta: { marginTop: 2, fontSize: 13, color: colors.muted },
    side: { alignItems: 'flex-end' as const, gap: 4 },
    paid: { minWidth: 88, textAlign: 'right' as const, fontSize: 13, fontWeight: '700' as const, color: colors.text },
    paidZero: { minWidth: 88, textAlign: 'right' as const, fontSize: 13, fontWeight: '500' as const, color: colors.muted },
    unpaid: { fontSize: 12, fontWeight: '600' as const, color: colors.statusUnpaid },
  }));
  const detail = [
    member.phone || '—',
    member.plan_name || null,
    showBranch && member.branch_name ? branchDisplayName(member.branch_name) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <SoftSurface variant="panel" style={styles.row}>
        <View style={styles.rowMain}>
          <InitialsAvatar name={member.name} size={40} />
          <View style={styles.copy}>
            <Text listRow numberOfLines={1} style={styles.name}>
              {member.name}
            </Text>
            <Text numberOfLines={2} style={styles.meta}>
              {detail}
            </Text>
          </View>
          <View style={styles.side}>
            <StatusBadge status={member.status} />
            {member.is_unpaid ? <Text style={styles.unpaid}>{unpaidLabel}</Text> : null}
          </View>
          <Text style={paid ? styles.paid : styles.paidZero} numberOfLines={1}>
            {formatEtb(Number(member.trainer_paid) || 0)}
          </Text>
        </View>
      </SoftSurface>
    </Pressable>
  );
}
