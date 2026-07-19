import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { deleteMember, fetchMember, fetchMemberPayments } from '@/src/api/members';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import { MemberActionsBar } from '@/src/components/MemberActionsBar';
import { ResponsiveContent } from '@/src/components/ResponsiveContent';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useDeleteFlash } from '@/src/hooks/useSaveFlash';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import type { ThemeColors } from '@/src/theme/tokens';
import { appTextStyle } from '@/src/theme/typography';
import { formatDisplayDate } from '@/src/utils/date';
import { paymentMethodBadgeStyle } from '@/src/constants/payments';
import { paymentSourceLabel } from '@/src/utils/paymentSources';
import { hasGymPortalAccess, isGymOwner } from '@/src/utils/roles';

function statusColor(status: string, c: ThemeColors) {
  const s = status.toLowerCase();
  if (s === 'active') return c.success;
  if (s === 'due soon') return c.warning;
  if (s === 'expired') return '#f87171';
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
  language: 'en' | 'am';
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
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    name: { fontSize: 22, fontWeight: '700' as const, color: c.text },
    headerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14 },
    headerText: { flex: 1 },
    phone: { marginTop: 4, fontSize: 15, color: c.muted },
    status: { marginTop: 8, fontSize: 13, fontWeight: '700' as const, textTransform: 'capitalize' as const },
    unpaid: { marginTop: 6, fontSize: 12, fontWeight: '700' as const, color: '#fb923c' },
    sectionTitle: { fontSize: 14, fontWeight: '700' as const, color: c.muted, marginBottom: 10 },
    row: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, justifyContent: 'space-between' as const, paddingVertical: 8, gap: 12 },
    rowLabel: { color: c.dim, fontSize: 14, flexShrink: 0 },
    rowValue: { color: c.text, fontSize: 14, fontWeight: '500' as const, flex: 1, textAlign: 'right' as const },
    actions: { gap: 10, marginBottom: 12 },
    actionBtn: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center' as const,
    },
    actionBtnSecondary: { backgroundColor: '#0d9488' },
    actionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border },
    actionBtnOutlineText: { color: c.muted },
    actionBtnDanger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(248,113,113,0.5)' },
    actionBtnDangerText: { color: c.error },
    actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
    paymentRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    paymentAmount: { color: c.text, fontSize: 15, fontWeight: '600' as const },
    paymentMeta: { marginTop: 2, color: c.dim, fontSize: 12 },
    methodBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    methodBadgeText: { fontSize: 11, fontWeight: '600' as const },
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
  const flashDeleted = useDeleteFlash();
  const canViewMember = Boolean(user && hasGymPortalAccess(user.role));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  if (memberQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.accentText} size="large" />
      </View>
    );
  }

  if (memberQuery.isError || !memberQuery.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{t('member.loadFailed')}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('member.goBack')}</Text>
        </Pressable>
      </View>
    );
  }

  const member = memberQuery.data;
  const payments = paymentsQuery.data ?? [];
  const owner = Boolean(user && isGymOwner(user.role));

  const confirmDeleteMember = () => setDeleteOpen(true);

  const runDeleteMember = async () => {
    setDeleting(true);
    try {
      await deleteMember(token!, member.id);
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteOpen(false);
      flashDeleted('flash.memberDeleted');
      router.replace('/(tabs)/members');
    } catch (e) {
      setDeleteOpen(false);
      setErrorNotice(e instanceof Error ? e.message : t('member.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <TabScreenFrame>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ResponsiveContent style={{ paddingHorizontal: pagePadding }}>
      <View style={isTablet ? { flexDirection: 'row', gap: 12, alignItems: 'flex-start' } : undefined}>
      <View style={[styles.card, isTablet && { flex: 1 }]}>
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
            <Text style={appTextStyle(language, styles.name)}>{member.name}</Text>
            <Text style={appTextStyle(language, styles.phone)}>{member.phone || '—'}</Text>
            <Text style={appTextStyle(language, { ...styles.status, color: statusColor(member.status, c) })}>{member.status}</Text>
            {member.is_unpaid ? <Text style={appTextStyle(language, styles.unpaid)}>{t('member.paymentRequired')}</Text> : null}
          </View>
        </View>
      </View>

      <View style={[styles.card, isTablet && { flex: 1 }]}>
        <Text style={appTextStyle(language, styles.sectionTitle)}>{t('member.membership')}</Text>
        <Row label={t('member.plan')} value={member.plan_name || '—'} styles={styles} language={language} />
        <Row label={t('member.start')} value={formatDisplayDate(member.start_date)} styles={styles} language={language} />
        <Row label={t('member.end')} value={formatDisplayDate(member.end_date)} styles={styles} language={language} />
        {member.branch_name ? <Row label={t('member.branch')} value={member.branch_name} styles={styles} language={language} /> : null}
      </View>
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

      <View style={styles.card}>
        <Text style={appTextStyle(language, styles.sectionTitle)}>{t('member.paymentHistory')}</Text>
        {paymentsQuery.isLoading ? (
          <ActivityIndicator color={c.accentText} style={{ marginVertical: 12 }} />
        ) : payments.length === 0 ? (
          <Text style={appTextStyle(language, styles.muted)}>{t('member.noPayments')}</Text>
        ) : (
          payments.map((p) => {
            const source = p.source ? paymentSourceLabel(p.source) : null;
            const badge = paymentMethodBadgeStyle(p.method, c);
            return (
            <View key={p.id} style={styles.paymentRow}>
              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text style={appTextStyle(language, styles.paymentAmount)}>{Number(p.amount).toLocaleString()} ETB</Text>
                <Text style={appTextStyle(language, styles.paymentMeta)}>
                  {formatDisplayDate(p.date)}
                  {source ? ` · ${source}` : ''}
                </Text>
              </View>
              <View style={[styles.methodBadge, { backgroundColor: badge.bg }]}>
                <Text style={appTextStyle(language, { ...styles.methodBadgeText, color: badge.text })}>{p.method}</Text>
              </View>
            </View>
            );
          })
        )}
      </View>
      </ResponsiveContent>
    </ScrollView>

    <ConfirmDialog
      visible={deleteOpen}
      title={t('member.deleteTitle')}
      message={t('member.deleteBody', { name: member.name })}
      confirmLabel={t('member.delete')}
      destructive
      confirmLoading={deleting}
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
