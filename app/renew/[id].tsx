import { Redirect, useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '@/src/components/AppText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchMember, renewMember } from '@/src/api/members';
import { fetchPlans } from '@/src/api/plans';
import { DateField } from '@/src/components/DateField';
import { PlanPickerField } from '@/src/components/PlanPickerField';
import { PaymentMethodPicker } from '@/src/components/PaymentMethodPicker';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import StatusBadge from '@/src/components/StatusBadge';
import { ErrorBanner, FormScroll, Label, MoneyAmountField, PrimaryButton, Screen } from '@/src/components/Form';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useTranslation } from 'react-i18next';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import { useFlash } from '@/src/context/FlashContext';
import { useLoadRetry } from '@/src/hooks/useLoadRetry';
import { PAYMENT_METHODS } from '@/src/constants/payments';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { isOfflineQueued } from '@/src/offline/types';
import { daysUntilDate, formatDisplayDate, isDateRangeValid, todayString } from '@/src/utils/date';
import { formatPlanDisplayName } from '@/src/utils/formatPlanDisplayName';
import { defaultRenewStartDate, canRenewMember } from '@/src/utils/memberRenew';
import {
  boundsForRenewPaymentOnTerm,
  boundsForRenewStart,
  clampRenewPaymentToTerm,
  paymentDateForRenewTermStart,
  type DateBounds,
} from '@/src/utils/datePickerBounds';
import { hasGymPortalAccess } from '@/src/utils/roles';
import type { MemberRow, PlanRow, RenewPayload } from '@/src/types/api';
import type { TFunction } from 'i18next';

function planPrice(plan: PlanRow): number {
  return Number(plan.price) || 0;
}

function renewMemberEndLabel(member: MemberRow, t: TFunction): string {
  const statusLower = String(member.status || '').toLowerCase();
  if (statusLower === 'expired') {
    return t('dashboard.expiredOn', { date: formatDisplayDate(member.end_date) });
  }
  const days = daysUntilDate(member.end_date);
  if (days == null) return formatDisplayDate(member.end_date);
  if (days <= 0) return t('dashboard.expiresToday');
  return t('dashboard.daysLeft', { count: days });
}

export default function RenewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user } = useAuth();
  const { colors: c } = useTheme();

  const [planId, setPlanId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(todayString());
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayString());
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>('Cash');
  const [error, setError] = useState('');
  const flashSaved = useSaveFlash();
  const flashOffline = useOfflineFlash();
  const { showFlash } = useFlash();
  const { t } = useTranslation();
  const canRenew = Boolean(user && hasGymPortalAccess(user.role));
  const styles = useThemedStyles((colors) => ({
    center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
    memberChip: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 14,
    },
    memberRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    memberBody: { flex: 1, minWidth: 0 },
    memberName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
    },
    memberMeta: {
      marginTop: 3,
      color: colors.dim,
      fontSize: 13,
      lineHeight: 17,
    },
    memberRight: {
      alignItems: 'flex-end' as const,
      gap: 8,
    },
    hint: { color: colors.dim, fontSize: 14, marginTop: 6 },
    useTodayBtn: {
      alignSelf: 'flex-start' as const,
      marginTop: 8,
      paddingVertical: 8,
      paddingHorizontal: 4,
      minHeight: 44,
      justifyContent: 'center' as const,
    },
    useTodayText: { color: colors.accentText, fontSize: 14, fontWeight: '600' as const },
  }));

  const memberQuery = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => fetchMember(token!, memberId),
    enabled: Boolean(token && canRenew) && Number.isFinite(memberId),
  });

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => fetchPlans(token!),
    enabled: Boolean(token && canRenew),
  });

  const loadRetry = useLoadRetry(memberQuery);

  const member = memberQuery.data;
  const plans = plansQuery.data ?? [];
  const renewStartBounds: DateBounds = member ? boundsForRenewStart(member) : {};
  const paymentBounds = boundsForRenewPaymentOnTerm(startDate);
  const paymentRangeValid = isDateRangeValid(paymentBounds.minimumDate, paymentBounds.maximumDate);
  const today = todayString();
  const prepaidRenew = Boolean(startDate && startDate > today);
  const minStartIso = member ? defaultRenewStartDate(member) : today;
  const canSetStartToToday = !paymentRangeValid && today >= minStartIso;

  useEffect(() => {
    if (member) {
      const nextStart = defaultRenewStartDate(member);
      setStartDate(nextStart);
      setPaymentDate(paymentDateForRenewTermStart(nextStart));
      if (member.plan_id) setPlanId(member.plan_id);
    }
  }, [member]);

  const selectedPlan = plans.find((p) => p.id === planId) ?? null;

  useEffect(() => {
    if (selectedPlan) setAmount(String(planPrice(selectedPlan)));
  }, [selectedPlan]);

  const memberMeta = useMemo(() => {
    if (!member) return '';
    const plan = formatPlanDisplayName(member.plan_name) || t('members.noPlan');
    return `${plan} · ${renewMemberEndLabel(member, t)}`;
  }, [member, t]);

  const buildPayload = (): RenewPayload => {
    if (!planId) throw new Error('Select a plan.');
    return {
      plan_id: planId,
      start_date: startDate.trim(),
      amount: Number(amount),
      date: paymentDate.trim(),
      method,
    };
  };

  const mutation = useOfflineMutation({
    jobType: 'renew',
    memberId: memberId,
    mutationFn: (payload: RenewPayload) => renewMember(token!, memberId, payload),
    onSuccess: (data) => {
      if (isOfflineQueued(data)) {
        flashOffline();
        router.replace(`/member/${memberId}`);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      queryClient.invalidateQueries({ queryKey: ['member-payments', memberId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (data.sms_sent === false && Boolean(member?.phone?.trim())) {
        showFlash({
          title: t('flash.renewedSmsFailed.title'),
          subtitle: t('flash.renewedSmsFailed.subtitle'),
          icon: 'refresh-circle-outline',
          variant: 'warning',
        });
      } else {
        flashSaved('flash.renewed');
      }
      router.replace(`/member/${memberId}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const canSubmit = useMemo(() => {
    return (
      Number.isFinite(memberId) &&
      planId != null &&
      Number(amount) > 0 &&
      /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
      /^\d{4}-\d{2}-\d{2}$/.test(paymentDate) &&
      paymentRangeValid
    );
  }, [memberId, planId, amount, startDate, paymentDate, paymentRangeValid]);

  if (!canRenew) {
    return <Redirect href="/login" />;
  }

  if (loadRetry.showLoading) {
    return (
      <Screen>
        <PageSkeleton variant="form" count={5} />
      </Screen>
    );
  }

  if (loadRetry.showError) {
    return (
      <Screen>
        <LoadError
          message={memberQuery.error instanceof Error ? memberQuery.error.message : undefined}
          loading={loadRetry.loading}
          onRetry={loadRetry.onRetry}
        />
      </Screen>
    );
  }

  if (member && !canRenewMember(member)) {
    return <Redirect href={`/member/${memberId}`} />;
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll>
          {member ? (
            <SoftSurface
              variant="quiet"
              onPress={() => router.push(`/member/${member.id}` as never)}
              style={styles.memberChip}
              accessibilityRole="button"
              accessibilityLabel={t('forms.openMember', { name: member.name })}
            >
              <View style={styles.memberRow}>
                <MemberPhoto
                  memberId={member.id}
                  name={member.name || '?'}
                  token={token!}
                  size={44}
                  hasPhoto={Boolean(member.photo_url)}
                />
                <View style={styles.memberBody}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {member.name}
                  </Text>
                  <Text style={styles.memberMeta} numberOfLines={2}>
                    {memberMeta}
                  </Text>
                </View>
                <View style={styles.memberRight}>
                  <StatusBadge status={member.status} />
                  <Ionicons name="chevron-forward" size={16} color={c.dim} />
                </View>
              </View>
            </SoftSurface>
          ) : null}
          <ErrorBanner message={error} />

          {plans.length === 0 ? (
            <Text style={styles.hint}>{t('forms.noPlans')}</Text>
          ) : (
            <PlanPickerField plans={plans} value={planId} onChange={setPlanId} />
          )}

          <Label>{t('forms.startDate')}</Label>
          <DateField
            value={startDate}
            onChange={(v) => {
              setStartDate(v);
              setPaymentDate(clampRenewPaymentToTerm(v, paymentDate));
            }}
            minimumDate={renewStartBounds.minimumDate}
          />

          <Label>{t('forms.amount')}</Label>
          <MoneyAmountField value={amount} onChangeText={setAmount} />

          <Label>{t('forms.paymentDate')}</Label>
          <DateField
            value={paymentDate}
            onChange={setPaymentDate}
            minimumDate={paymentBounds.minimumDate}
            maximumDate={paymentBounds.maximumDate}
            rangeInvalidMessage={t('forms.paymentDateFutureStart', {
              date: formatDisplayDate(startDate),
            })}
          />
          {prepaidRenew ? (
            <Text style={styles.hint}>{t('forms.renewPrepaidHint', { date: formatDisplayDate(startDate) })}</Text>
          ) : null}
          {canSetStartToToday ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('forms.useTodayAsStart')}
              onPress={() => {
                setStartDate(today);
                setPaymentDate(clampRenewPaymentToTerm(today, paymentDate));
              }}
              style={({ pressed }) => [styles.useTodayBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.useTodayText}>{t('forms.useTodayAsStart')}</Text>
            </Pressable>
          ) : null}

          <PaymentMethodPicker value={method} onChange={setMethod} />

          <PrimaryButton
            label={t('forms.renewMembership')}
            onPress={() => {
              setError('');
              mutation.mutate(buildPayload());
            }}
            loading={mutation.isPending}
            disabled={!canSubmit}
          />
        </FormScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}
