import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { usePreferences } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { appTextStyle } from '@/src/theme/typography';
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
  const { language } = usePreferences();
  const [manageOpen, setManageOpen] = useState(false);
  const styles = useThemedStyles((c) => ({
    row: { flexDirection: 'row' as const, gap: 10, marginBottom: 12 },
    primaryBtn: {
      flex: 1,
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center' as const,
      minHeight: 48,
      justifyContent: 'center' as const,
    },
    secondaryBtn: {
      flex: 1,
      backgroundColor: '#0d9488',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center' as const,
      minHeight: 48,
      justifyContent: 'center' as const,
    },
    manageBtn: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center' as const,
      minHeight: 48,
      justifyContent: 'center' as const,
      marginBottom: 12,
    },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
    manageText: { color: c.muted, fontSize: 15, fontWeight: '600' as const },
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
          {primaries.slice(0, 2).map((p) => (
            <Pressable
              key={p.label}
              style={p.secondary ? styles.secondaryBtn : styles.primaryBtn}
              onPress={p.onPress}
            >
              <Text style={appTextStyle(language, styles.btnText)}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {manageActions.length > 0 ? (
        <>
          <Pressable style={styles.manageBtn} onPress={() => setManageOpen(true)}>
            <Text style={appTextStyle(language, styles.manageText)}>{t('member.manage')}</Text>
          </Pressable>

          <BottomSheet visible={manageOpen} title={t('member.manage')} onClose={() => setManageOpen(false)}>
            {manageActions.map((action) =>
              action.destructive ? (
                <Pressable
                  key={action.id}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(248,113,113,0.5)',
                    marginBottom: 8,
                    minHeight: 48,
                    justifyContent: 'center',
                  }}
                  onPress={() => {
                    setManageOpen(false);
                    action.onPress();
                  }}
                >
                  <Text style={appTextStyle(language, { color: '#f87171', fontSize: 15, fontWeight: '600' })}>{action.label}</Text>
                </Pressable>
              ) : (
                <SheetOption
                  key={action.id}
                  label={action.label}
                  onPress={() => {
                    setManageOpen(false);
                    action.onPress();
                  }}
                />
              )
            )}
          </BottomSheet>
        </>
      ) : null}
    </View>
  );
}
