import { useState } from 'react';
import { View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { elevationStyle } from '@/src/theme/elevation';
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
  const { theme } = useTheme();
  const [manageOpen, setManageOpen] = useState(false);
  const styles = useThemedStyles((c) => ({
    row: { flexDirection: 'row' as const, gap: 10, marginBottom: 12 },
    primaryBtn: {
      flex: 1,
      backgroundColor: c.accent,
      paddingVertical: 14,
      alignItems: 'center' as const,
      minHeight: 48,
      justifyContent: 'center' as const,
      borderWidth: 0,
    },
    secondaryBtn: {
      flex: 1,
      backgroundColor: c.accentCta,
      paddingVertical: 14,
      alignItems: 'center' as const,
      minHeight: 48,
      justifyContent: 'center' as const,
      borderWidth: 0,
    },
    manageBtn: {
      paddingVertical: 14,
      alignItems: 'center' as const,
      minHeight: 48,
      justifyContent: 'center' as const,
      marginBottom: 12,
    },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
    manageText: { color: c.muted, fontSize: 15, fontWeight: '600' as const },
    optionDanger: {
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginBottom: 8,
      minHeight: 48,
      justifyContent: 'center' as const,
      borderWidth: 1,
      borderColor: 'rgba(248,113,113,0.45)',
      backgroundColor: c.errorBg,
    },
    dangerText: { color: c.error, fontSize: 15, fontWeight: '600' as const },
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
            <SoftSurface
              key={p.label}
              flat
              onPress={p.onPress}
              style={[p.secondary ? styles.secondaryBtn : styles.primaryBtn, elevationStyle('soft', theme)]}
            >
              <Text style={appTextStyle(language, styles.btnText)}>{p.label}</Text>
            </SoftSurface>
          ))}
        </View>
      ) : null}

      {manageActions.length > 0 ? (
        <>
          <SoftSurface onPress={() => setManageOpen(true)} variant="quiet" style={styles.manageBtn}>
            <Text style={appTextStyle(language, styles.manageText)}>{t('member.manage')}</Text>
          </SoftSurface>

          <BottomSheet visible={manageOpen} title={t('member.manage')} onClose={() => setManageOpen(false)}>
            {manageActions.map((action) =>
              action.destructive ? (
                <SoftSurface
                  key={action.id}
                  flat
                  onPress={() => {
                    setManageOpen(false);
                    action.onPress();
                  }}
                  style={styles.optionDanger}
                >
                  <Text style={appTextStyle(language, styles.dangerText)}>{action.label}</Text>
                </SoftSurface>
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
