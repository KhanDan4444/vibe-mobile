import { useAuth } from '@/src/auth/AuthContext';
import { useBranchScope } from '@/src/context/BranchContext';

export function useGymReadOnly() {
  const { subscription } = useAuth();
  const { branchReadOnly, selectedBranch } = useBranchScope();
  const subscriptionReadOnly = Boolean(subscription?.readOnly);
  const readOnly = subscriptionReadOnly || branchReadOnly;

  return { readOnly, subscriptionReadOnly, branchReadOnly, selectedBranch };
}
