import { Redirect, useNavigation, useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
  type TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchBranches } from '@/src/api/branches';
import { enrollMember } from '@/src/api/members';
import { fetchPlans } from '@/src/api/plans';
import { BranchPicker } from '@/src/components/BranchPicker';
import { DateField } from '@/src/components/DateField';
import { EnrollStepProgress } from '@/src/components/EnrollStepProgress';
import { PhotoPickerField } from '@/src/components/PhotoPickerField';
import { PlanPickerField } from '@/src/components/PlanPickerField';
import { PaymentMethodPicker } from '@/src/components/PaymentMethodPicker';
import { ErrorBanner, Field, FieldError, FormScroll, Label, MoneyAmountField, PrimaryButton, Screen, SecondaryButton } from '@/src/components/Form';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { SkeletonBone } from '@/src/components/Skeleton';
import { FIELD_MIN_HEIGHT, FIELD_RADIUS } from '@/src/theme/fieldChrome';
import { useTheme } from '@/src/context/PreferencesContext';
import { elevationStyle } from '@/src/theme/elevation';
import { useOfflineFlash } from '@/src/hooks/useSaveFlash';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { PAYMENT_METHODS, paymentMethodLabelKey } from '@/src/constants/payments';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { useNetwork } from '@/src/offline/NetworkProvider';
import { isOfflineQueued } from '@/src/offline/types';
import { bumpMemberPhotoCache } from '@/src/utils/memberPhotoCache';
import { calculateEndDate } from '@/src/utils/changePlan';
import { formatDisplayDate, todayString } from '@/src/utils/date';
import { dismissKeyboard } from '@/src/utils/dismissKeyboard';
import {
  boundsForEnrollStart,
  boundsForPaymentOnTerm,
  clampPaymentToTerm,
} from '@/src/utils/datePickerBounds';
import { formatEtb } from '@/src/utils/formatMoney';
import { formatApiError } from '@/src/utils/paymentValidation';
import { flashHaptic, selectionHaptic } from '@/src/utils/flashHaptic';
import { validateRequiredEthiopianPhone } from '@/src/utils/phone';
import { hasGymPortalAccess, isGymOwner } from '@/src/utils/roles';
import type { EnrollPayload, PlanRow } from '@/src/types/api';

function planPrice(plan: PlanRow): number {
  return Number(plan.price) || 0;
}

type EnrollDone = {
  name: string;
  phone: string;
  branchName: string;
  planName: string;
  startDate: string;
  endDate: string;
  skipPayment: boolean;
  amount?: number;
  method?: string;
};

const SWIPE_HINT_KEY = 'niku.enroll.swipeHintSeen';

export default function EnrollScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { pagePadding, formMaxWidth } = useResponsiveLayout();
  const queryClient = useQueryClient();
  const { token, user } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [planId, setPlanId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(todayString());
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayString());
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>('Cash');
  const [skipPayment, setSkipPayment] = useState(false);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [planError, setPlanError] = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [enrollStep, setEnrollStep] = useState(1);
  const [enrollDone, setEnrollDone] = useState<EnrollDone | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const phoneRef = useRef<TextInput>(null);
  const stepDirectionRef = useRef<1 | -1>(1);
  const checkScale = useRef(new Animated.Value(1)).current;
  const checkOpacity = useRef(new Animated.Value(1)).current;
  const stepOpacity = useRef(new Animated.Value(1)).current;
  const stepTranslate = useRef(new Animated.Value(0)).current;
  const swipeHintOpacity = useRef(new Animated.Value(1)).current;
  const { colors: c, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles((colors) => ({
    hint: { color: colors.dim, fontSize: 14, marginTop: 4 },
    lockedValue: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: FIELD_MIN_HEIGHT,
      justifyContent: 'center' as const,
      borderRadius: FIELD_RADIUS,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBg,
      elevation: 0,
      shadowOpacity: 0,
    },
    switchRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginTop: 4,
      paddingVertical: 8,
    },
    switchLabel: { color: colors.text, fontSize: 15, flex: 1, marginRight: 12 },
    successWrap: {
      alignItems: 'center' as const,
      paddingVertical: 8,
    },
    checkCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: 'rgba(5,150,105,0.14)',
      marginBottom: 22,
    },
    checkInner: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: 'rgba(5,150,105,0.18)',
    },
    successTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
      color: colors.text,
      textAlign: 'center' as const,
    },
    successName: {
      marginTop: 10,
      fontSize: 28,
      fontWeight: '700' as const,
      letterSpacing: -0.4,
      lineHeight: 34,
      color: colors.text,
      textAlign: 'center' as const,
    },
    successSub: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 22,
      color: colors.muted,
      textAlign: 'center' as const,
      paddingHorizontal: 8,
    },
    summary: {
      marginTop: 24,
      width: '100%' as const,
      overflow: 'hidden' as const,
    },
    summaryRow: {
      flexDirection: 'row' as const,
      alignItems: 'baseline' as const,
      justifyContent: 'space-between' as const,
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    summaryRowLast: { borderBottomWidth: 0 },
    summaryLabel: { color: colors.muted, fontSize: 14, flexShrink: 0 },
    summaryValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600' as const,
      flexShrink: 1,
      textAlign: 'right' as const,
    },
    summaryUnpaid: { color: colors.warning },
    actions: { marginTop: 28, width: '100%' as const, gap: 10 },
    stickyFooter: {
      backgroundColor: colors.bg,
      paddingTop: 12,
      alignItems: 'center' as const,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.cardEdge,
    },
    stickyInner: {
      width: '100%' as const,
      gap: 10,
    },
    stickyRow: {
      flexDirection: 'row' as const,
      gap: 10,
    },
    stickyBtn: { flex: 1, marginTop: 0, marginBottom: 0 },
    swipeHint: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      alignSelf: 'flex-start' as const,
      marginTop: -8,
      marginBottom: 14,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.accentSoft,
    },
    swipeHintText: {
      flexShrink: 1,
      color: colors.accentText,
      fontSize: 13,
      fontWeight: '600' as const,
    },
    swipeHintDismiss: {
      padding: 2,
    },
  }));

  const swipeHintVisibleRef = useRef(false);

  const dismissSwipeHint = useCallback(() => {
    if (!swipeHintVisibleRef.current) return;
    swipeHintVisibleRef.current = false;
    void AsyncStorage.setItem(SWIPE_HINT_KEY, '1');
    if (reduceMotion) {
      setShowSwipeHint(false);
      return;
    }
    Animated.timing(swipeHintOpacity, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShowSwipeHint(false);
    });
  }, [reduceMotion, swipeHintOpacity]);

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(SWIPE_HINT_KEY).then((v) => {
      if (!alive || v === '1') return;
      swipeHintOpacity.setValue(1);
      swipeHintVisibleRef.current = true;
      setShowSwipeHint(true);
    });
    return () => {
      alive = false;
    };
  }, [swipeHintOpacity]);

  const canEnroll = Boolean(user && hasGymPortalAccess(user.role));
  const owner = isGymOwner(user?.role);
  const { readOnly } = useGymReadOnly();
  const flashOffline = useOfflineFlash();
  const { isOnline } = useNetwork();
  const photoBlocksOffline = !isOnline && Boolean(photoDataUrl);

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => fetchPlans(token!),
    enabled: Boolean(token && canEnroll),
  });

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(token!),
    enabled: Boolean(token && owner),
  });

  const plans = plansQuery.data ?? [];
  const branches = branchesQuery.data?.branches ?? [];
  const showBranchPicker = owner && branches.filter((b) => b.is_active !== false).length > 1;
  const selectedPlan = plans.find((p) => p.id === planId) ?? null;
  const enrollStartBounds = boundsForEnrollStart(skipPayment);
  const paymentBounds = boundsForPaymentOnTerm(startDate);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: enrollDone ? t('enroll.successTitle') : t('screens.enroll'),
      headerBackVisible: !enrollDone,
      gestureEnabled: !enrollDone,
      headerLeft: enrollDone
        ? () => null
        : undefined,
    });
  }, [enrollDone, navigation, t]);

  useEffect(() => {
    if (!enrollDone) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/(tabs)/members');
      return true;
    });
    return () => sub.remove();
  }, [enrollDone, router]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enrollDone) return;
    flashHaptic('success');
    if (reduceMotion) {
      checkScale.setValue(1);
      checkOpacity.setValue(1);
      return;
    }
    checkScale.setValue(0.72);
    checkOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.timing(checkOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [enrollDone, checkOpacity, checkScale, reduceMotion]);

  useEffect(() => {
    if (enrollDone) return;
    if (reduceMotion) {
      stepOpacity.setValue(1);
      stepTranslate.setValue(0);
      return;
    }
    const fromX = stepDirectionRef.current * 18;
    stepOpacity.setValue(0);
    stepTranslate.setValue(fromX);
    Animated.parallel([
      Animated.timing(stepOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(stepTranslate, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [enrollStep, enrollDone, reduceMotion, stepOpacity, stepTranslate]);

  useEffect(() => {
    if (!showBranchPicker || branchId != null) return;
    const active = branches.filter((b) => b.is_active !== false);
    const preferred = active.find((b) => b.is_default) ?? active[0];
    if (preferred) setBranchId(preferred.id);
  }, [branches, showBranchPicker, branchId]);

  useEffect(() => {
    if (selectedPlan && !skipPayment) {
      setAmount(String(planPrice(selectedPlan)));
    }
  }, [selectedPlan, skipPayment]);

  const resetForm = useCallback(() => {
    setName('');
    setPhone('');
    setPlanId(null);
    setStartDate(todayString());
    setAmount('');
    setPaymentDate(todayString());
    setMethod('Cash');
    setSkipPayment(false);
    setPhotoDataUrl('');
    setPhotoPreview('');
    setError('');
    setNameError('');
    setPhoneError('');
    setPlanError('');
    setStartDateError('');
    stepDirectionRef.current = 1;
    setEnrollStep(1);
    setEnrollDone(null);
    const active = branches.filter((b) => b.is_active !== false);
    const preferred = active.find((b) => b.is_default) ?? active[0];
    setBranchId(preferred?.id ?? null);
  }, [branches]);

  const ensurePhoneValid = useCallback(
    (value = phone) => {
      const result = validateRequiredEthiopianPhone(value);
      if (result.ok) {
        setPhoneError('');
        return true;
      }
      setPhoneError(t(result.key));
      return false;
    },
    [phone, t]
  );

  const ensureNameValid = useCallback(
    (value = name) => {
      if (!value.trim()) {
        setNameError(t('enroll.fullNameRequired'));
        return false;
      }
      setNameError('');
      return true;
    },
    [name, t]
  );

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    const trimmed = value.trim();
    if (!trimmed) {
      setPhoneError('');
      return;
    }
    ensurePhoneValid(trimmed);
  };

  const handlePhoneBlur = () => {
    ensurePhoneValid();
  };

  const buildPayload = (): EnrollPayload => {
    if (!planId) throw new Error('Select a plan.');
    const planAmount = selectedPlan ? planPrice(selectedPlan) : Number(amount);
    return {
      name: name.trim(),
      phone: phone.trim(),
      plan_id: planId,
      start_date: startDate.trim(),
      skip_payment: skipPayment,
      ...(skipPayment
        ? {}
        : {
            amount: planAmount,
            date: paymentDate.trim(),
            method,
          }),
      ...(showBranchPicker && branchId ? { branch_id: branchId } : {}),
      ...(photoDataUrl ? { photo: photoDataUrl } : {}),
    };
  };

  const mutation = useOfflineMutation({
    jobType: 'enroll',
    mutationFn: (payload: EnrollPayload) => enrollMember(token!, payload),
    onSuccess: (data) => {
      if (isOfflineQueued(data)) {
        flashOffline();
        queryClient.invalidateQueries({ queryKey: ['members'] });
        router.replace('/(tabs)/members');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (data.member.photo_url) {
        bumpMemberPhotoCache(queryClient, data.member.id);
      }
      const selectedBranch = branches.find((b) => b.id === branchId);
      const branchLabel = data.member.branch_name
        || (selectedBranch
          ? `${selectedBranch.name}${selectedBranch.is_default ? ` ${t('branch.defaultSuffix')}` : ''}`
          : '');
      setEnrollDone({
        name: data.member.name || name.trim(),
        phone: data.member.phone || phone.trim(),
        branchName: branchLabel,
        planName: data.member.plan_name || selectedPlan?.name || '',
        startDate: data.member.start_date || startDate,
        endDate: data.member.end_date || '',
        skipPayment,
        amount: skipPayment ? undefined : selectedPlan ? planPrice(selectedPlan) : Number(amount) || undefined,
        method: skipPayment ? undefined : method,
      });
    },
    onError: (e: Error) => setError(formatApiError(e.message)),
  });

  const enrollSteps = useMemo(
    () => [
      { id: 'member', label: t('enroll.sectionMember') },
      { id: 'membership', label: t('enroll.sectionMembership') },
      { id: 'payment', label: t('enroll.sectionPayment') },
    ],
    [t]
  );

  const computedEndDate =
    selectedPlan && startDate ? calculateEndDate(startDate, selectedPlan.duration) : '';
  const endDateValue = computedEndDate && computedEndDate !== '—' ? computedEndDate : '';

  const canSubmit = useMemo(() => {
    if (photoBlocksOffline) return false;
    if (!planId || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return false;
    if (showBranchPicker && !branchId) return false;
    if (skipPayment) return true;
    return Number(amount) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(paymentDate);
  }, [
    photoBlocksOffline,
    planId,
    startDate,
    skipPayment,
    amount,
    paymentDate,
    showBranchPicker,
    branchId,
  ]);

  const goToStep = (next: number) => {
    stepDirectionRef.current = next > enrollStep ? 1 : -1;
    setEnrollStep(next);
  };

  const goNext = () => {
    dismissSwipeHint();
    dismissKeyboard();
    setError('');
    if (enrollStep === 1) {
      if (!ensureNameValid()) return;
      if (!ensurePhoneValid()) return;
      if (showBranchPicker && !branchId) {
        setError(t('member.branch'));
        return;
      }
      void selectionHaptic();
      goToStep(2);
      return;
    }
    if (enrollStep === 2) {
      if (!planId) {
        setPlanError(t('validation.planNotSelected'));
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        setStartDateError(t('enroll.startDateRequired'));
        return;
      }
      setPlanError('');
      setStartDateError('');
      void selectionHaptic();
      goToStep(3);
    }
  };

  const goBack = () => {
    if (enrollStep <= 1) return;
    dismissSwipeHint();
    dismissKeyboard();
    setError('');
    void selectionHaptic();
    goToStep(enrollStep - 1);
  };

  const goNextRef = useRef(goNext);
  const goBackRef = useRef(goBack);
  goNextRef.current = goNext;
  goBackRef.current = goBack;

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onMoveShouldSetPanResponderCapture: (_e, g) =>
          Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (_e, g) => {
          const enoughDistance = Math.abs(g.dx) >= 56;
          const enoughVelocity = Math.abs(g.vx) >= 0.35;
          if (!enoughDistance && !enoughVelocity) return;
          dismissSwipeHint();
          if (g.dx < 0) goNextRef.current();
          else goBackRef.current();
        },
      }),
    [dismissSwipeHint]
  );

  const submitEnroll = () => {
    dismissKeyboard();
    setError('');
    if (!ensureNameValid() || !ensurePhoneValid()) {
      goToStep(1);
      return;
    }
    if (!planId) {
      setPlanError(t('validation.planNotSelected'));
      goToStep(2);
      return;
    }
    setPlanError('');
    mutation.mutate(buildPayload());
  };

  if (!canEnroll) {
    return <Redirect href="/login" />;
  }

  if (readOnly) {
    return (
      <Screen>
        <View style={{ padding: 16 }}>
          <Text style={{ color: c.muted, fontSize: 15, lineHeight: 22 }}>{t('common.readOnly')}</Text>
        </View>
      </Screen>
    );
  }

  if (enrollDone) {
    const termLabel =
      enrollDone.startDate && enrollDone.endDate
        ? `${formatDisplayDate(enrollDone.startDate)} → ${formatDisplayDate(enrollDone.endDate)}`
        : enrollDone.startDate
          ? formatDisplayDate(enrollDone.startDate)
          : '';
    const methodKey = enrollDone.method ? paymentMethodLabelKey(enrollDone.method) : null;
    const paymentLabel = enrollDone.skipPayment
      ? t('status.unpaid')
      : [
          enrollDone.amount != null ? formatEtb(enrollDone.amount) : null,
          methodKey ? t(methodKey) : enrollDone.method,
        ]
          .filter(Boolean)
          .join(' · ');

    const rows: { label: string; value: string; unpaid?: boolean }[] = [
      enrollDone.phone ? { label: t('forms.phone'), value: enrollDone.phone } : null,
      enrollDone.branchName ? { label: t('member.branch'), value: enrollDone.branchName } : null,
      enrollDone.planName ? { label: t('forms.plan'), value: enrollDone.planName } : null,
      termLabel ? { label: t('enroll.term'), value: termLabel } : null,
      paymentLabel ? { label: t('enroll.payment'), value: paymentLabel, unpaid: enrollDone.skipPayment } : null,
    ].filter(Boolean) as { label: string; value: string; unpaid?: boolean }[];

    return (
      <Screen>
        <FormScroll>
          <View style={styles.successWrap}>
            <Animated.View style={[styles.checkCircle, { opacity: checkOpacity, transform: [{ scale: checkScale }] }]}>
              <View style={styles.checkInner}>
                <Ionicons name="checkmark" size={36} color={c.success} />
              </View>
            </Animated.View>
            <Text style={styles.successTitle}>{t('enroll.successTitle')}</Text>
            <Text style={styles.successName} latin>
              {enrollDone.name}
            </Text>
            <Text style={styles.successSub}>
              {enrollDone.skipPayment ? t('enroll.successSkip') : t('enroll.successPaid')}
            </Text>

            {rows.length > 0 ? (
              <SoftSurface variant="quiet" style={styles.summary}>
                {rows.map((row, index) => (
                  <View
                    key={row.label}
                    style={[styles.summaryRow, index === rows.length - 1 ? styles.summaryRowLast : null]}
                  >
                    <Text style={styles.summaryLabel}>{row.label}</Text>
                    <Text style={[styles.summaryValue, row.unpaid ? styles.summaryUnpaid : null]} numberOfLines={2}>
                      {row.value}
                    </Text>
                  </View>
                ))}
              </SoftSurface>
            ) : null}

            <View style={styles.actions}>
              <PrimaryButton label={t('enroll.enrollAnother')} onPress={resetForm} />
              <SecondaryButton
                label={t('enroll.viewMembers')}
                onPress={() => router.replace('/(tabs)/members')}
              />
            </View>
          </View>
        </FormScroll>
      </Screen>
    );
  }

  const stickyPadBottom = Math.max(insets.bottom, 10) + 8;

  return (
    <Screen flushBottom>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <FormScroll contentContainerStyle={{ paddingBottom: 24 }}>
          <EnrollStepProgress steps={enrollSteps} current={enrollStep} />

          {showSwipeHint ? (
            <Animated.View style={{ opacity: swipeHintOpacity }}>
              <SoftSurface
                variant="quiet"
                onPress={dismissSwipeHint}
                style={styles.swipeHint}
                accessibilityRole="button"
                accessibilityLabel={t('enroll.swipeHint')}
              >
                <Ionicons name="swap-horizontal" size={16} color={c.accentText} />
                <Text style={styles.swipeHintText}>{t('enroll.swipeHintShort')}</Text>
                <Pressable
                  onPress={dismissSwipeHint}
                  hitSlop={8}
                  style={styles.swipeHintDismiss}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.dismiss')}
                >
                  <Ionicons name="close" size={14} color={c.accentText} />
                </Pressable>
              </SoftSurface>
            </Animated.View>
          ) : null}

          <ErrorBanner
            message={
              error ||
              (photoBlocksOffline && enrollStep === 1 ? t('offline.photoRemoveToEnrollOffline') : '')
            }
          />

          <Animated.View
            style={{ opacity: stepOpacity, transform: [{ translateX: stepTranslate }] }}
            accessibilityHint={t('enroll.swipeHint')}
            {...swipeResponder.panHandlers}
          >
            {enrollStep === 1 ? (
              <>
                <Label>{t('forms.name')}</Label>
                <Field
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    if (nameError) setNameError('');
                  }}
                  placeholder={t('forms.memberName')}
                  autoCapitalize="words"
                  error={Boolean(nameError)}
                  onBlur={() => ensureNameValid()}
                />
                <FieldError message={nameError} />

                <Label>{t('forms.phone')}</Label>
                <Field
                  ref={phoneRef}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder={t('forms.phonePlaceholder')}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  returnKeyType="done"
                  blurOnSubmit
                  error={Boolean(phoneError)}
                  onBlur={handlePhoneBlur}
                  onSubmitEditing={() => {
                    ensurePhoneValid();
                  }}
                />
                <FieldError message={phoneError} />

                {showBranchPicker ? (
                  <BranchPicker branches={branches} value={branchId} onChange={setBranchId} />
                ) : null}

                <PhotoPickerField
                  previewUri={photoPreview}
                  onChange={(dataUrl, preview) => {
                    setPhotoDataUrl(dataUrl);
                    setPhotoPreview(preview);
                    if (!dataUrl) setError('');
                  }}
                  processing={photoProcessing}
                  setProcessing={setPhotoProcessing}
                  pickDisabled={!isOnline}
                  notice={!isOnline ? t('offline.photoNeedsOnline') : undefined}
                />
              </>
            ) : null}

            {enrollStep === 2 ? (
              <>
                {plansQuery.isLoading ? (
                  <View style={{ gap: 10, marginVertical: 8 }}>
                    <SkeletonBone width="40%" height={12} />
                    <SkeletonBone width="100%" height={44} radius={10} />
                  </View>
                ) : plans.length === 0 ? (
                  <Text style={styles.hint}>{t('forms.noPlans')}</Text>
                ) : (
                  <>
                    <PlanPickerField
                      plans={plans}
                      value={planId}
                      onChange={(id) => {
                        setPlanId(id);
                        if (planError) setPlanError('');
                      }}
                      error={Boolean(planError)}
                    />
                    <FieldError message={planError} />
                  </>
                )}

                <Label>{t('forms.startDate')}</Label>
                <DateField
                  value={startDate}
                  onChange={(v) => {
                    setStartDate(v);
                    if (startDateError) setStartDateError('');
                    if (!skipPayment) setPaymentDate(clampPaymentToTerm(v, paymentDate));
                  }}
                  maximumDate={enrollStartBounds.maximumDate}
                />
                <FieldError message={startDateError} />

                <Label>{t('enroll.endDate')}</Label>
                <View style={styles.lockedValue}>
                  <Text style={{ color: c.muted, fontWeight: '500', fontSize: 16 }}>
                    {endDateValue ? formatDisplayDate(endDateValue) : '—'}
                  </Text>
                </View>
                <Text style={styles.hint}>{t('enroll.endDateHint')}</Text>
              </>
            ) : null}

            {enrollStep === 3 ? (
              <>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{t('forms.enrollWithoutPayment')}</Text>
                  <Switch
                    value={skipPayment}
                    onValueChange={(v) => {
                      dismissKeyboard();
                      setSkipPayment(v);
                    }}
                    trackColor={{ false: c.border, true: c.accent }}
                  />
                </View>

                {!skipPayment ? (
                  <>
                    <Label>{t('forms.amount')}</Label>
                    <MoneyAmountField value={amount || ''} onChangeText={() => {}} disabled />
                    <Text style={styles.hint}>{t('forms.amountFromPlan')}</Text>

                    <Label>{t('forms.paymentDate')}</Label>
                    <DateField
                      value={paymentDate}
                      onChange={setPaymentDate}
                      minimumDate={paymentBounds.minimumDate}
                      maximumDate={paymentBounds.maximumDate}
                    />

                    <PaymentMethodPicker value={method} onChange={setMethod} />
                  </>
                ) : (
                  <Text style={styles.hint}>{t('forms.enrollWithoutPayment')}</Text>
                )}
              </>
            ) : null}
          </Animated.View>
        </FormScroll>

        <View
          style={[
            styles.stickyFooter,
            elevationStyle('raised', theme),
            { paddingBottom: stickyPadBottom, paddingHorizontal: pagePadding },
          ]}
        >
          <View style={[styles.stickyInner, { maxWidth: formMaxWidth }]}>
            <View style={styles.stickyRow}>
              {enrollStep > 1 ? (
                <SecondaryButton
                  label={t('common.back')}
                  onPress={goBack}
                  style={styles.stickyBtn}
                />
              ) : null}
              {enrollStep < 3 ? (
                <PrimaryButton
                  label={t('common.continue')}
                  onPress={goNext}
                  style={styles.stickyBtn}
                />
              ) : (
                <PrimaryButton
                  label={t('screens.enroll')}
                  onPress={submitEnroll}
                  loading={mutation.isPending || photoProcessing}
                  disabled={!canSubmit || photoProcessing}
                  style={styles.stickyBtn}
                />
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
