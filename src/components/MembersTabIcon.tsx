import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchDashboard } from '@/src/api/dashboard';
import { useBranchScope } from '@/src/context/BranchContext';
import { useTheme } from '@/src/context/PreferencesContext';

export function MembersTabIcon({ color }: { color: string }) {
  const { token } = useAuth();
  const { selectedBranchId } = useBranchScope();
  const { colors: c } = useTheme();
  const branchKey = selectedBranchId === 'all' ? 'all' : selectedBranchId;

  const { data } = useQuery({
    queryKey: ['dashboard', branchKey],
    queryFn: () => fetchDashboard(token!, selectedBranchId),
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  const badgeCount = useMemo(() => {
    const dueSoon = data?.dueSoonMembers ?? 0;
    const expired = data?.expiredMembers ?? 0;
    const unpaid = data?.unpaidCount ?? 0;
    return dueSoon + expired + unpaid;
  }, [data?.dueSoonMembers, data?.expiredMembers, data?.unpaidCount]);

  return (
    <View style={styles.wrap}>
      <Ionicons name="people" color={color} size={24} />
      {badgeCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: c.error, borderColor: c.tabBarBg }]}>
          <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
