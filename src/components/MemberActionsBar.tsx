import { useState, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { PrimaryButton, SecondaryButton } from '@/src/components/ui/Button';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import type { MemberRow } from '@/src/types/api';
import { canChangePlan, canCollectPayment, canRenewMember } from '@/src/utils/memberRenew';

type IonName = ComponentProps<typeof Ionicons>['name'];

export type MemberAction = {
  id: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  accent?: boolean;
  icon?: IonName;
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
  onRestore,
  restoreLoading,
}: {
  member: MemberRow;
  owner: boolean;
  readOnly: boolean;
  onRenew: () => void;
  onPayment: () => void;
  onChangePlan: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRestore?: () => void;
  restoreLoading?: boolean;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [manageOpen, setManageOpen] = useState(false);
  const styles = useThemedStyles(() => ({
    row: { flexDirection: 'row' as const, gap: 10, marginBottom: 10 },
    half: { flex: 1 },
    manage: { marginBottom: 4 },
  }));

  const showRenew = canRenewMember(member);
  const showPayment = canCollectPayment(member);
  const showChangePlan = canChangePlan(member);

  if (member.deleted_at) {
    if (!owner || readOnly || !onRestore) return null;
    return (
      <View style={styles.manage}>
        <PrimaryButton label={t('member.restore')} onPress={onRestore} loading={restoreLoading} />
      </View>
    );
  }

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
  const maybeManage = (
    id: string,
    label: string,
    onPress: () => void,
    icon: IonName,
    destructive?: boolean,
  ) => {
    if (primaryIds.has(id)) return;
    manageActions.push({ id, label, onPress, icon, destructive });
  };

  if (showChangePlan) maybeManage('change-plan', t('member.changePlan'), onChangePlan, 'swap-horizontal-outline');
  if (showRenew) maybeManage('renew', t('member.renew'), onRenew, 'refresh-outline');
  if (showPayment) maybeManage('payment', t('member.collectPayment'), onPayment, 'cash-outline');
  manageActions.push({
    id: 'edit',
    label: t('member.edit'),
    onPress: onEdit,
    icon: 'create-outline',
    accent: true,
  });
  if (owner && !readOnly) {
    manageActions.push({
      id: 'delete',
      label: t('member.delete'),
      onPress: onDelete,
      icon: 'trash-outline',
      destructive: true,
    });
  }

  if (primaries.length === 0 && manageActions.length === 0) return null;

  const sheetTitle = member.name?.trim() || t('member.manage');

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
            title={sheetTitle}
            onClose={() => setManageOpen(false)}
            compact
            footer={
              <View style={[localStyles.cancelWrap, { borderTopColor: c.border }]}>
                <SheetOption
                  label={t('common.cancel')}
                  tone="cancel"
                  onPress={() => setManageOpen(false)}
                />
              </View>
            }
          >
            {manageActions.map((action) => (
              <SheetOption
                key={action.id}
                label={action.label}
                icon={action.icon}
                accent={action.accent}
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

const localStyles = StyleSheet.create({
  cancelWrap: {
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
  },
});
