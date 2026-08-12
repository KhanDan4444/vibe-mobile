import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { PrimaryButton, SecondaryButton } from '@/src/components/ui/Button';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import type { MemberRow } from '@/src/types/api';
import { canChangePlan, canCollectPayment, canRenewMember } from '@/src/utils/memberRenew';

export type MemberAction = {
  id: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

export function MemberActionsBar({
  member,
  owner,
  readOnly,
  onRenew,
  onPayment,
  onChangePlan,
  onEdit,
  onDelete,
}: {
  member: MemberRow;
  owner: boolean;
  readOnly: boolean;
  onRenew: () => void;
  onPayment: () => void;
  onChangePlan: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [manageOpen, setManageOpen] = useState(false);
  const styles = useThemedStyles(() => ({
    row: { flexDirection: 'row' as const, gap: 10, marginBottom: 10 },
    half: { flex: 1 },
    manage: { marginBottom: 4 },
  }));

  const showRenew = canRenewMember(member);
  const showPayment = canCollectPayment(member);
  const showChangePlan = canChangePlan(member);

  const primaryIds = new Set<string>();
  const primaries: { id: string; label: string; onPress: () => void; secondary?: boolean }[] = [];
  if (showRenew) {
    primaries.push({ id: 'renew', label: t('member.renew'), onPress: onRenew });
    primaryIds.add('renew');
  }
  if (showPayment) {
    primaries.push({ id: 'payment', label: t('member.collectPayment'), onPress: onPayment, secondary: true });
    primaryIds.add('payment');
  }
  if (primaries.length === 0 && showChangePlan) {
    primaries.push({ id: 'change-plan', label: t('member.changePlan'), onPress: onChangePlan });
    primaryIds.add('change-plan');
  }

  const manageActions: MemberAction[] = [];
  const maybeManage = (id: string, label: string, onPress: () => void, destructive?: boolean) => {
    if (primaryIds.has(id)) return;
    manageActions.push({ id, label, onPress, destructive });
  };

  if (showChangePlan) maybeManage('change-plan', t('member.changePlan'), onChangePlan);
  if (showRenew) maybeManage('renew', t('member.renew'), onRenew);
  if (showPayment) maybeManage('payment', t('member.collectPayment'), onPayment);
  manageActions.push({ id: 'edit', label: t('member.edit'), onPress: onEdit });
  if (owner && !readOnly) {
    manageActions.push({ id: 'delete', label: t('member.delete'), onPress: onDelete, destructive: true });
  }

  if (primaries.length === 0 && manageActions.length === 0) return null;

  return (
    <View>
      {primaries.length > 0 ? (
        <View style={styles.row}>
          {primaries.slice(0, 2).map((p) =>
            p.secondary ? (
              <SecondaryButton key={p.id} label={p.label} onPress={p.onPress} style={styles.half} />
            ) : (
              <PrimaryButton key={p.id} label={p.label} onPress={p.onPress} style={styles.half} />
            )
          )}
        </View>
      ) : null}

      {manageActions.length > 0 ? (
        <>
          <SecondaryButton
            label={t('member.manage')}
            onPress={() => setManageOpen(true)}
            style={styles.manage}
          />

          <BottomSheet
            visible={manageOpen}
            title={t('member.manage')}
            onClose={() => setManageOpen(false)}
            compact
          >
            {manageActions.map((action) => (
              <SheetOption
                key={action.id}
                label={action.label}
                destructive={action.destructive}
                onPress={() => {
                  setManageOpen(false);
                  action.onPress();
                }}
              />
            ))}
          </BottomSheet>
        </>
      ) : null}
    </View>
  );
}
