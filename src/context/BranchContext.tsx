import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchBranches } from '@/src/api/branches';
import i18n from '@/src/i18n';
import { isGymOwner } from '@/src/utils/roles';

import type { BranchRow } from '@/src/types/api';

export type BranchSelection = 'all' | number;

interface BranchContextValue {
  branches: BranchRow[];
  allBranches: BranchRow[];
  activeBranches: BranchRow[];
  inactiveBranches: BranchRow[];
  selectedBranchId: BranchSelection;
  selectedBranch: BranchRow | null;
  branchReadOnly: boolean;
  setSelectedBranchId: (id: BranchSelection) => void;
  branchQueryParam: Record<string, string> | undefined;
  showBranchFilter: boolean;
  branchLabel: string;
}

const BranchContext = createContext<BranchContextValue | null>(null);
const STORAGE_KEY = 'vibe-selected-branch';

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const owner = isGymOwner(user?.role);
  const [selectedBranchId, setSelectedBranchIdState] = useState<BranchSelection>('all');
  const [hydrated, setHydrated] = useState(false);

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(token!),
    enabled: Boolean(token) && owner,
  });

  const allBranches = branchesQuery.data?.branches ?? [];
  const activeBranches = allBranches.filter((b) => b.is_active !== false);
  const inactiveBranches = allBranches.filter((b) => b.is_active === false);
  const showBranchFilter = owner && (activeBranches.length > 1 || inactiveBranches.length > 0);

  const selectedBranch = useMemo(() => {
    if (selectedBranchId === 'all') return null;
    return allBranches.find((b) => b.id === selectedBranchId) ?? null;
  }, [allBranches, selectedBranchId]);

  const branchReadOnly = Boolean(owner && selectedBranch && selectedBranch.is_active === false);

  useEffect(() => {
    if (!token || !user) {
      setSelectedBranchIdState('all');
      setHydrated(true);
      return;
    }
    if (!owner || !user.gym_id) return;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(`${STORAGE_KEY}:${user.gym_id}`);
        if (stored === 'all') setSelectedBranchIdState('all');
        else if (stored) {
          const n = Number(stored);
          if (Number.isFinite(n)) setSelectedBranchIdState(n);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, [owner, user?.gym_id]);

  const setSelectedBranchId = useCallback(
    (id: BranchSelection) => {
      setSelectedBranchIdState(id);
      if (user?.gym_id) {
        AsyncStorage.setItem(`${STORAGE_KEY}:${user.gym_id}`, String(id)).catch(() => {});
      }
    },
    [user?.gym_id]
  );

  const branchQueryParam = useMemo(() => {
    if (!showBranchFilter || selectedBranchId === 'all') return undefined;
    return { branch_id: String(selectedBranchId) };
  }, [showBranchFilter, selectedBranchId]);

  const branchLabel = useMemo(() => {
    if (selectedBranchId === 'all') return i18n.t('branch.allBranches');
    return selectedBranch?.name ?? i18n.t('branch.single');
  }, [selectedBranch, selectedBranchId]);

  if (!hydrated && owner) {
    return <>{children}</>;
  }

  return (
    <BranchContext.Provider
      value={{
        branches: activeBranches,
        allBranches,
        activeBranches,
        inactiveBranches,
        selectedBranchId,
        selectedBranch,
        branchReadOnly,
        setSelectedBranchId,
        branchQueryParam,
        showBranchFilter,
        branchLabel,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchScope() {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    return {
      branches: [],
      allBranches: [],
      activeBranches: [],
      inactiveBranches: [],
      selectedBranchId: 'all' as BranchSelection,
      selectedBranch: null,
      branchReadOnly: false,
      setSelectedBranchId: () => {},
      branchQueryParam: undefined,
      showBranchFilter: false,
      branchLabel: i18n.t('branch.allBranches'),
    };
  }
  return ctx;
}
