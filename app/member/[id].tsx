import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { deleteMember, fetchMember, fetchMemberPayments } from '@/src/api/members';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import { MemberActionsBar } from '@/src/components/MemberActionsBar';
import { ResponsiveContent } from '@/src/components/ResponsiveContent';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import type { AppLanguage } from '@/src/i18n';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useLoadRetry } from '@/src/hooks/useLoadRetry';
import { useFlash } from '@/src/context/FlashContext';
import { scheduleDeleteWithUndo } from '@/src/utils/scheduleWithUndo';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import type { ThemeColors } from '@/src/theme/tokens';
import { appTextStyle } from '@/src/theme/typography';
import { formatDisplayDate } from '@/src/utils/date';
import { paymentMethodBadgeStyle, paymentMethodIcon, paymentMethodLabelKey } from '@/src/constants/payments';
import { paymentSourceKey } from '@/src/utils/termPayments';
import { statusLabelKey } from '@/src/utils/statusLabels';
import { branchDisplayName } from '@/src/utils/branchDisplayName';
import { hasGymPortalAccess, isGymOwner } from '@/src/utils/roles';

function statusColor(status: string, c: ThemeColors) {
  const s = status.toLowerCase();
  if (s === 'active') return c.success;
  if (s === 'due soon') return c.statusDueSoon;
  if (s === 'expired') return c.statusExpired;
  return c.muted;
}

function Row({
  label,
  value,
  styles,
  language,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof buildMemberStyles>;
  language: AppLanguage;
}) {
  return (
    <View style={styles.row}>
      <Text style={appTextStyle(language, styles.rowLabel)}>{label}</Text>
      <Text style={appTextStyle(language, styles.rowValue)}>{value}</Text>
    </View>
  );
}

function buildMemberStyles(c: ThemeColors) {
  return {
    container: { flex: 1, backgroundColor: c.bg },
    content: { paddingBottom: 32 },
    center: { flex: 1, backgroundColor: c.bg, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 24 },
    card: {
      padding: 16,
      marginBottom: 14,
    },
    name: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.4, color: c.text },
    headerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14 },
    headerText: { flex: 1 },
    phone: { marginTop: 4, fontSize: 15, color: c.muted },
    status: { marginTop: 8, fontSize: 13, fontWeight: '700' as const, textTransform: 'capitalize' as const },
    unpaid: { marginTop: 6, fontSize: 12, fontWeight: '700' as const, color: c.statusUnpaid },
    sectionTitle: { fontSize: 14, fontWeight: '600' as const, letterSpacing: -0.15, color: c.muted, marginBottom: 10 },
    row: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, justifyContent: 'space-between' as const, paddingVertical: 8, gap: 12 },
    rowLabel: { color: c.dim, fontSize: 14, flexShrink: 0 },
    rowValue: { color: c.text, fontSize: 14, fontWeight: '500' as const, flex: 1, textAlign: 'right' as const },
    actions: { gap: 10, marginBottom: 12 },
    paymentRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    paymentAmount: { color: c.text, fontSize: 15, fontWeight: '600' as const },
    paymentMeta: { marginTop: 2, color: c.dim, fontSize: 12 },
    methodBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
    },
    methodBadgeText: { fontSize: 11, fontWeight: '700' as const },
    muted: { color: c.dim, fontSize: 14 },
    error: { color: c.error, fontSize: 15, marginBottom: 16 },
    backBtn: { paddingHorizontal: 16, paddingVertical: 10 },
    backBtnText: { color: c.accentText, fontSize: 15 },
  };
}

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user } = useAuth();
  const { readOnly } = useGymReadOnly();
  const { colors: c } = useTheme();
  const { language } = usePreferences();
  const { t } = useTranslation();
  const { pagePadding, isTablet } = useResponsiveLayout();
  const styles = useThemedStyles(buildMemberStyles);
  const { showFlash } = useFlash();
  const canViewMember = Boolean(user && hasGymPortalAccess(user.role));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');

  const memberQuery = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => fetchMember(token!, memberId),
    enabled: Boolean(token && canViewMember) && Number.isFinite(memberId),
  });

  const paymentsQuery = useQuery({
    queryKey: ['member-payments', memberId],
    queryFn: () => fetchMemberPayments(token!, memberId),
    enabled: Boolean(token && canViewMember) && Number.isFinite(memberId),
  });

  const loadRetry = useLoadRetry(memberQuery);

  if (!canViewMember) {
    return <Redirect href="/login" />;
  }

  if (!Number.isFinite(memberId)) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('member.invalid')}</Text>
      </View>
    );
  }

  if (loadRetry.showLoading) {
    return (
      <TabScreenFrame>
        <PageSkeleton variant="detail" />
      </TabScreenFrame>
    );
  }

  if (loadRetry.showError || !memberQuery.data) {
    return (
      <TabScreenFrame>
        <LoadError
          message={
            memberQuery.error instanceof Error
              ? memberQuery.error.message
              : t('member.loadFailed')
          }
          loading={loadRetry.loading}
          onRetry={loadRetry.onRetry}
        />
      </TabScreenFrame>
    );
  }

  const member = memberQuery.data;
  const payments = paymentsQuery.data ?? [];
  const owner = Boolean(user && isGymOwner(user.role));

  const confirmDeleteMember = () => setDeleteOpen(true);

  const runDeleteMember = () => {
    setDeleteOpen(false);
    router.replace('/(tabs)/members');
    scheduleDeleteWithUndo({
      showFlash,
      t,
      pendingKey: 'flash.memberDeletePending',
      cancelledKey: 'flash.memberDeleteCancelled',
      committedKey: 'flash.memberDeleted',
      subtitleParams: { name: member.name },
      onUndo: () => {},
      onCommit: async () => {
        await deleteMember(token!, member.id);
        queryClient.invalidateQueries({ queryKey: ['members'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['member', member.id] });
      },
    });
  };

  return (
    <TabScreenFrame>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ResponsiveContent style={{ paddingHorizontal: pagePadding }}>
      <View style={isTablet ? { flexDirection: 'row', gap: 12, alignItems: 'flex-start' } : undefined}>
      <SoftSurface variant="panel" style={[styles.card, isTablet && { flex: 1 }]}>
        <View style={styles.headerRow}>
          {token ? (
            <MemberPhoto
              memberId={member.id}
              name={member.name}
              token={token}
              size={64}
              hasPhoto={Boolean(member.photo_url)}
              expandable
            />
          ) : null}
          <View style={styles.headerText}>
            <Text display style={styles.name}>{member.name}</Text>
            <Text style={appTextStyle(language, styles.phone)}>{member.phone || '—'}</Text>
            <Text style={appTextStyle(language, { ...styles.status, color: statusColor(member.status, c) })}>
              {t(statusLabelKey(member.status))}
            </Text>
            {member.is_unpaid ? <Text style={appTextStyle(language, styles.unpaid)}>{t('member.paymentRequired')}</Text> : null}
          </View>
        </View>
      </SoftSurface>

      <SoftSurface variant="panel" style={[styles.card, isTablet && { flex: 1 }]}>
        <Text display style={styles.sectionTitle}>{t('member.membership')}</Text>
        <Row label={t('member.plan')} value={member.plan_name || '—'} styles={styles} language={language} />
        <Row label={t('member.start')} value={formatDisplayDate(member.start_date)} styles={styles} language={language} />
        <Row label={t('member.end')} value={formatDisplayDate(member.end_date)} styles={styles} language={language} />
        {member.branch_name ? (
          <Row
            label={t('member.branch')}
            value={branchDisplayName(member.branch_name)}
            styles={styles}
            language={language}
          />
        ) : null}
      </SoftSurface>
      </View>

      <MemberActionsBar
        member={member}
        owner={owner}
        readOnly={readOnly}
        onRenew={() => router.push(`/renew/${member.id}`)}
        onPayment={() => router.push(`/payment/${member.id}`)}
        onChangePlan={() => router.push(`/change-plan/${member.id}`)}
        onEdit={() => router.push(`/member/${member.id}/edit`)}
        onDelete={confirmDeleteMember}
      />

      <SoftSurface variant="panel" style={styles.card}>
        <Text display style={styles.sectionTitle}>{t('member.paymentHistory')}</Text>
        {paymentsQuery.isLoading ? (
          <PageSkeleton variant="list-rows" count={3} padded={false} style={{ marginTop: 8 }} />
        ) : payments.length === 0 ? (
          <Text style={appTextStyle(language, styles.muted)}>{t('member.noPayments')}</Text>
        ) : (
          payments.map((p) => {
            const source = p.source ? t(paymentSourceKey(p.source)) : null;
            const badge = paymentMethodBadgeStyle(p.method, c);
            const methodKey = paymentMethodLabelKey(p.method);
            return (
            <View key={p.id} style={styles.paymentRow}>
              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text display style={styles.paymentAmount}>{Number(p.amount).toLocaleString()} ETB</Text>
                <Text style={appTextStyle(language, styles.paymentMeta)}>
                  {formatDisplayDate(p.date)}
                  {source ? ` · ${source}` : ''}
                </Text>
              </View>
              <View style={[styles.methodBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                <Ionicons name={paymentMethodIcon(p.method)} size={13} color={badge.text} />
                <Text style={appTextStyle(language, { ...styles.methodBadgeText, color: badge.text })}>
                  {methodKey ? t(methodKey) : p.method}
                </Text>
              </View>
            </View>
            );
          })
        )}
      </SoftSurface>
      </ResponsiveContent>
    </ScrollView>

    <ConfirmDialog
      visible={deleteOpen}
      title={t('member.deleteTitle')}
      message={t('member.deleteBody', { name: member.name })}
      confirmLabel={t('member.delete')}
      destructive
      confirmLoading={false}
      onCancel={() => setDeleteOpen(false)}
      onConfirm={() => void runDeleteMember()}
    />
    <ConfirmDialog
      visible={Boolean(errorNotice)}
      title={t('common.error')}
      message={errorNotice}
      alertOnly
      destructive={false}
      onConfirm={() => setErrorNotice('')}
    />
    </TabScreenFrame>
  );
}
