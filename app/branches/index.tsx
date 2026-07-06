import { Redirect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchBranches } from '@/src/api/branches';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isGymOwner } from '@/src/utils/roles';
import type { BranchRow } from '@/src/types/api';

function BranchCard({
  branch,
  owner,
  onEdit,
}: {
  branch: BranchRow;
  owner: boolean;
  onEdit: () => void;
}) {
  const styles = useThemedStyles((c) => ({
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardMain: { flex: 1 },
    name: { fontSize: 17, fontWeight: '700' as const, color: c.text },
    meta: { marginTop: 4, fontSize: 13, color: c.muted },
    counts: { marginTop: 8, fontSize: 12, color: c.dim },
    inactive: { marginTop: 6, fontSize: 12, fontWeight: '700' as const, color: '#f87171' },
    editBtn: {
      marginTop: 12,
      alignSelf: 'flex-start' as const,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.inputBorder,
    },
    editText: { color: c.accentText, fontSize: 13, fontWeight: '600' as const },
  }));

  return (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <Text style={styles.name}>
          {branch.name}
          {branch.is_default ? ' · Default' : ''}
        </Text>
        {branch.phone ? <Text style={styles.meta}>{branch.phone}</Text> : null}
        {branch.address ? <Text style={styles.meta}>{branch.address}</Text> : null}
        <Text style={styles.counts}>
          {branch.member_count ?? 0} members · {branch.staff_count ?? 0} staff
        </Text>
        {branch.is_active === false ? <Text style={styles.inactive}>Inactive</Text> : null}
      </View>
      {owner ? (
        <Pressable style={styles.editBtn} onPress={onEdit}>
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function BranchesScreen() {
  const router = useRouter();
  const { token, user, subscription } = useAuth();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const fabBottom = 24 + insets.bottom;
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.bg },
    list: { padding: 16, paddingBottom: 88 },
    empty: { textAlign: 'center' as const, color: colors.dim, marginTop: 40, fontSize: 15 },
    fab: {
      position: 'absolute' as const,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      elevation: 4,
    },
    fabText: { color: '#fff', fontSize: 28, fontWeight: '300' as const, marginTop: -2 },
  }));

  const owner = isGymOwner(user?.role);
  const readOnly = Boolean(subscription?.readOnly);

  const query = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(token!),
    enabled: Boolean(token && owner),
  });

  const branches = query.data?.branches ?? [];

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!owner) {
    return <Redirect href="/(tabs)/more" />;
  }

  return (
    <View style={styles.container}>
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.accentText} />
      ) : (
        <FlatList
          data={branches}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <BranchCard
              branch={item}
              owner={owner && !readOnly}
              onEdit={() => router.push(`/branch/${item.id}/edit`)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={c.accentText} />
          }
          ListEmptyComponent={<Text style={styles.empty}>No branches found.</Text>}
        />
      )}

      {owner && !readOnly ? (
        <Pressable style={[styles.fab, { bottom: fabBottom }]} onPress={() => router.push('/branch/new')}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
