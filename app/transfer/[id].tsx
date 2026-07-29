import { Redirect, useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchBranches } from '@/src/api/branches';
import { fetchMember, transferMember } from '@/src/api/members';
import { OptionPickerField } from '@/src/components/OptionPickerField';
import { ErrorBanner, FormScroll, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { isOfflineQueued } from '@/src/offline/types';
import { useTranslation } from 'react-i18next';
import { isGymOwner } from '@/src/utils/roles';
import { branchDisplayName } from '@/src/utils/branchDisplayName';

export default function TransferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const [branchId, setBranchId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const flashSaved = useSaveFlash();
  const flashOffline = useOfflineFlash();
  const canTransfer = Boolean(user && isGymOwner(user.role));
  const styles = useThemedStyles((colors) => ({
    body: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 16 },
    bold: { color: colors.text, fontWeight: '600' as const },
    hint: { color: colors.dim, fontSize: 14 },
  }));

  const memberQuery = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => fetchMember(token!, memberId),
    enabled: Boolean(token && canTransfer) && Number.isFinite(memberId),
  });

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(token!),
    enabled: Boolean(token && canTransfer),
  });

  const member = memberQuery.data;
  const activeBranches = (branchesQuery.data?.branches ?? []).filter(
    (b) => b.is_active !== false && b.id !== member?.branch_id
  );

  useEffect(() => {
    if (activeBranches.length > 0 && branchId == null) {
      setBranchId(activeBranches[0].id);
    }
  }, [activeBranches, branchId]);

  const mutation = useOfflineMutation({
    jobType: 'transfer',
    memberId: memberId,
    mutationFn: (payload: { branch_id: number }) => transferMember(token!, memberId, payload.branch_id),
    onSuccess: (data) => {
      if (isOfflineQueued(data)) {
        flashOffline();
        router.replace(`/member/${memberId}`);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      flashSaved('flash.transferred');
      router.replace(`/member/${memberId}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const canSubmit = useMemo(
    () => Number.isFinite(memberId) && branchId != null && activeBranches.length > 0,
    [memberId, branchId, activeBranches.length]
  );

  if (!canTransfer) {
    return <Redirect href="/login" />;
  }

  return (
    <Screen>
      <FormScroll>
        {member ? (
          <Text style={styles.body}>
            {t('forms.transferBody', {
              name: member.name,
              from: member.branch_name
                ? t('forms.transferFrom', { branch: branchDisplayName(member.branch_name) })
                : '',
            })}
          </Text>
        ) : null}

        <ErrorBanner message={error} />

        {activeBranches.length === 0 ? (
          <Text style={styles.hint}>{t('forms.noOtherBranches')}</Text>
        ) : (
          <>
            <OptionPickerField
              label={t('forms.targetBranch')}
              placeholder={t('branch.pickBranch')}
              sheetTitle={t('forms.targetBranch')}
              options={activeBranches.map((b) => ({
                value: String(b.id),
                label: `${branchDisplayName(b.name)}${b.is_default ? ` ${t('branch.defaultSuffix')}` : ''}`,
              }))}
              value={branchId != null ? String(branchId) : undefined}
              onChange={(v) => setBranchId(Number(v))}
            />
          </>
        )}

        <PrimaryButton
          label={t('forms.transferMember')}
          onPress={() => {
            setError('');
            mutation.mutate({ branch_id: branchId! });
          }}
          loading={mutation.isPending}
          disabled={!canSubmit}
        />
      </FormScroll>
    </Screen>
  );
}
