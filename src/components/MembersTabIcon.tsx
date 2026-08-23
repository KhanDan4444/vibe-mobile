import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchDashboard } from '@/src/api/dashboard';
import { AppTabBarIcon } from '@/src/components/AppTabBarIcon';
import { useBranchScope } from '@/src/context/BranchContext';

/** Members tab icon with quiet attention badge (due soon + expired + unpaid). */
export function MembersTabIcon({
  color,
  size = 24,
  focused = false,
}: {
  color: string;
  size?: number;
  focused?: boolean;
}) {
  const { token } = useAuth();
  const { selectedBranchId } = useBranchScope();
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
    <AppTabBarIcon
      name="people-outline"
      nameFocused="people"
      color={color}
      size={size}
      focused={focused}
      badgeCount={badgeCount}
    />
  );
}
