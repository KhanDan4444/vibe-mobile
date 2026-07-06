import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { deleteMember, fetchMember, fetchMemberPayments } from '@/src/api/members';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import { MemberActionsBar } from '@/src/components/MemberActionsBar';
import { useTheme } from '@/src/context/PreferencesContext';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import type { ThemeColors } from '@/src/theme/tokens';
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

function Row({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof buildMemberStyles> }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function buildMemberStyles(c: ThemeColors) {
  return {
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, paddingBottom: 32 },
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
    sectionTitle: { fontSize: 14, fontWeight: '700' as const, color: c.muted, marginBottom: 10, textTransform: 'uppercase' as const },
    row: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: 6 },
    rowLabel: { color: c.dim, fontSize: 14 },
    rowValue: { color: c.text, fontSize: 14, fontWeight: '500' as const },
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
  const { t } = useTranslation();
  const styles = useThemedStyles(buildMemberStyles);
  const canViewMember = Boolean(user && hasGymPortalAccess(user.role));

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

  const confirmDeleteMember = () => {
    Alert.alert(
      t('member.deleteTitle'),
      t('member.deleteBody', { name: member.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('member.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMember(token!, member.id);
              queryClient.invalidateQueries({ queryKey: ['members'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
              router.replace('/(tabs)/members');
            } catch (e) {
              Alert.alert(t('common.error'), e instanceof Error ? e.message : t('member.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
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
            <Text style={styles.name}>{member.name}</Text>
            <Text style={styles.phone}>{member.phone || '—'}</Text>
            <Text style={[styles.status, { color: statusColor(member.status, c) }]}>{member.status}</Text>
            {member.is_unpaid ? <Text style={styles.unpaid}>{t('member.paymentRequired')}</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('member.membership')}</Text>
        <Row label={t('member.plan')} value={member.plan_name || '—'} styles={styles} />
        <Row label={t('member.start')} value={formatDisplayDate(member.start_date)} styles={styles} />
        <Row label={t('member.end')} value={formatDisplayDate(member.end_date)} styles={styles} />
        {member.branch_name ? <Row label={t('member.branch')} value={member.branch_name} styles={styles} /> : null}
      </View>

      <MemberActionsBar
        member={member}
        owner={owner}
        readOnly={readOnly}
        onRenew={() => router.push(`/renew/${member.id}`)}
        onPayment={() => router.push(`/payment/${member.id}`)}
        onChangePlan={() => router.push(`/change-plan/${member.id}`)}
        onTransfer={() => router.push(`/transfer/${member.id}`)}
        onEdit={() => router.push(`/member/${member.id}/edit`)}
        onDelete={confirmDeleteMember}
      />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('member.paymentHistory')}</Text>
        {paymentsQuery.isLoading ? (
          <ActivityIndicator color={c.accentText} style={{ marginVertical: 12 }} />
        ) : payments.length === 0 ? (
          <Text style={styles.muted}>{t('member.noPayments')}</Text>
        ) : (
          payments.map((p) => {
            const source = p.source ? paymentSourceLabel(p.source) : null;
            const badge = paymentMethodBadgeStyle(p.method, c);
            return (
            <View key={p.id} style={styles.paymentRow}>
              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text style={styles.paymentAmount}>{Number(p.amount).toLocaleString()} ETB</Text>
                <Text style={styles.paymentMeta}>
                  {formatDisplayDate(p.date)}
                  {source ? ` · ${source}` : ''}
                </Text>
              </View>
              <View style={[styles.methodBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.methodBadgeText, { color: badge.text }]}>{p.method}</Text>
              </View>
            </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
