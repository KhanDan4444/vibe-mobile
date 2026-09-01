import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { AuthFormEnter } from '@/src/components/AuthFormEnter';
import { AuthOtpBlock } from '@/src/components/AuthOtpBlock';
import { AuthScreen } from '@/src/components/AuthScreen';
import { AuthSuccessPanel } from '@/src/components/AuthSuccessPanel';
import { ErrorBanner, Field, FieldError, FormScroll, Label, PrimaryButton } from '@/src/components/Form';
import {
  fetchStationSession,
  requestStationOtp,
  trustedStationCheckIn,
  verifyStationOtp,
  type StationCheckInSuccess,
} from '@/src/api/publicStationCheckIn';
import { useBootSplash } from '@/src/context/BootSplashContext';
import { useOtpResendCooldown } from '@/src/hooks/useOtpResendCooldown';
import { AUTH, authSubtitle, authTitle } from '@/src/theme/authChrome';
import { effectiveVisitsLimit } from '@/src/utils/attendanceCap';
import { isValidEthiopianPhone, validateRequiredEthiopianPhone } from '@/src/utils/phone';
import { parseStationToken } from '@/src/utils/stationToken';

const LOGIN_BRAND_MARK = require('@/assets/images/login-brand-mark.png');

const STEPS = {
  LOADING: 'loading',
  ERROR: 'error',
  TRUSTED: 'trusted',
  PHONE: 'phone',
  OTP: 'otp',
  SUCCESS: 'success',
} as const;

type Step = (typeof STEPS)[keyof typeof STEPS];

export default function StationCheckInScreen() {
  const { t } = useTranslation();
  const { dismissBootSplash } = useBootSplash();
  const params = useLocalSearchParams<{ station?: string }>();
  const stationToken = parseStationToken(typeof params.station === 'string' ? params.station : '');

  const [step, setStep] = useState<Step>(STEPS.LOADING);
  const [session, setSession] = useState<{
    gym_name?: string;
    branch_name?: string;
    trusted?: { member_name?: string } | null;
  } | null>(null);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [successData, setSuccessData] = useState<StationCheckInSuccess | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string }>({});
  const [genericNotice, setGenericNotice] = useState('');
  const { cooldown, startCooldown, canResend } = useOtpResendCooldown();
  const otpRequestInFlight = useRef(false);

  useEffect(() => {
    dismissBootSplash();
  }, [dismissBootSplash]);

  const loadSession = useCallback(async () => {
    if (!stationToken) {
      setStep(STEPS.ERROR);
      setError(t('publicStationCheckIn.missingStation'));
      return;
    }
    setStep(STEPS.LOADING);
    setError('');
    try {
      const { res, data } = await fetchStationSession(stationToken);
      if (!res.ok) {
        setStep(STEPS.ERROR);
        if (data.code === 'SELF_CHECKIN_DISABLED') {
          setError(t('publicStationCheckIn.selfCheckinDisabled'));
        } else {
          setError(data.error || t('publicStationCheckIn.loadFailed'));
        }
        return;
      }
      setSession(data);
      if (data.trusted) {
        setStep(STEPS.TRUSTED);
      } else {
        setStep(STEPS.PHONE);
      }
    } catch {
      setStep(STEPS.ERROR);
      setError(t('publicStationCheckIn.loadFailed'));
    }
  }, [stationToken, t]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const handleRequestOtp = async () => {
    if (!stationToken || otpRequestInFlight.current || busy) return;
    setError('');
    setGenericNotice('');
    const validation = validateRequiredEthiopianPhone(phone);
    if (!validation.ok) {
      setFieldErrors({ phone: validation.key });
      return;
    }
    setFieldErrors({});
    otpRequestInFlight.current = true;
    setBusy(true);
    try {
      const { res, data } = await requestStationOtp(stationToken, phone);
      if (!res.ok) {
        if (data.code === 'TELEGRAM_NOT_LINKED') {
          setError(data.error || t('publicStationCheckIn.telegramRequired'));
        } else {
          setError(data.error || t('publicStationCheckIn.otpRequestFailed'));
        }
        return;
      }
      if (data.generic) {
        setGenericNotice(data.message || t('publicStationCheckIn.otpSentGeneric'));
        return;
      }
      setSessionId(data.session_id || '');
      setStep(STEPS.OTP);
      startCooldown();
    } catch {
      setError(t('publicStationCheckIn.otpRequestFailed'));
    } finally {
      otpRequestInFlight.current = false;
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || busy || otpRequestInFlight.current) return;
    await handleRequestOtp();
  };

  const handleVerifyOtp = async () => {
    if (!stationToken || busy) return;
    setError('');
    const code = otp.replace(/\D/g, '');
    if (code.length !== 6) {
      setError(t('validation.otpInvalid'));
      return;
    }
    if (!sessionId) {
      setError(t('publicStationCheckIn.otpRequestFailed'));
      return;
    }
    setBusy(true);
    try {
      const { res, data } = await verifyStationOtp(stationToken, {
        phone,
        sessionId,
        otp: code,
      });
      if (!res.ok) {
        if (data.code === 'ALREADY_TODAY') {
          setError(t('publicStationCheckIn.alreadyToday'));
        } else if (data.code === 'WEEKLY_LIMIT') {
          setError(t('publicStationCheckIn.weeklyLimit'));
        } else {
          setError(data.error || t('publicStationCheckIn.verifyFailed'));
        }
        return;
      }
      setSuccessData(data);
      setStep(STEPS.SUCCESS);
    } catch {
      setError(t('publicStationCheckIn.verifyFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleTrustedCheckIn = async () => {
    if (!stationToken || busy) return;
    setError('');
    setBusy(true);
    try {
      const { res, data } = await trustedStationCheckIn(stationToken);
      if (!res.ok) {
        if (data.code === 'DEVICE_NOT_TRUSTED') {
          setStep(STEPS.PHONE);
          setError('');
          return;
        }
        if (data.code === 'ALREADY_TODAY') {
          setError(t('publicStationCheckIn.alreadyToday'));
        } else if (data.code === 'WEEKLY_LIMIT') {
          setError(t('publicStationCheckIn.weeklyLimit'));
        } else {
          setError(data.error || t('publicStationCheckIn.checkInFailed'));
        }
        return;
      }
      setSuccessData(data);
      setStep(STEPS.SUCCESS);
    } catch {
      setError(t('publicStationCheckIn.checkInFailed'));
    } finally {
      setBusy(false);
    }
  };

  const memberName =
    successData?.member?.name || successData?.member_name || session?.trusted?.member_name;
  const visitsLimit = effectiveVisitsLimit(successData?.visits_limit);
  const showHeader = step !== STEPS.SUCCESS;

  const successRows =
    successData?.visits_this_week != null && visitsLimit != null
      ? [
          {
            label: t('checkIn.ringLabel'),
            value: t('publicStationCheckIn.visitsThisWeek', {
              count: successData.visits_this_week,
              limit: visitsLimit,
            }),
          },
        ]
      : [];

  const handleDone = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/login');
  };

  return (
    <AuthScreen hero>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll contentContainerStyle={styles.scroll}>
          {showHeader ? (
            <AuthFormEnter delay={40}>
              <Image
                source={LOGIN_BRAND_MARK}
                style={styles.brandMark}
                resizeMode="contain"
                accessibilityLabel="ንቁ"
              />
              {session?.gym_name ? (
                <Text style={styles.gymEyebrow}>{session.gym_name}</Text>
              ) : null}
              {session?.branch_name ? (
                <Text style={[styles.branchName, { color: AUTH.textMuted }]}>{session.branch_name}</Text>
              ) : null}
              <Text display style={[styles.title, { color: AUTH.text }]}>
                {t('publicStationCheckIn.title')}
              </Text>
              {step === STEPS.PHONE ? (
                <Text style={[styles.subtitle, { color: AUTH.textMuted }]}>
                  {t('publicStationCheckIn.phoneBody')}
                </Text>
              ) : null}
              {step === STEPS.TRUSTED && session?.trusted?.member_name ? (
                <Text style={[styles.subtitle, { color: AUTH.textMuted }]}>
                  {t('publicStationCheckIn.welcome', { name: session.trusted.member_name })}
                </Text>
              ) : null}
            </AuthFormEnter>
          ) : null}

          <AuthFormEnter delay={showHeader ? 120 : 40}>
            {step === STEPS.LOADING ? (
              <View style={styles.stateCard}>
                <ActivityIndicator color={AUTH.link} size="large" />
                <Text style={[styles.stateText, { color: AUTH.textMuted }]}>
                  {t('publicStationCheckIn.loading')}
                </Text>
              </View>
            ) : null}

            {step === STEPS.ERROR ? (
              <View style={styles.stateCard}>
                <ErrorBanner message={error} />
                {router.canGoBack() ? (
                  <Pressable style={styles.secondary} onPress={() => router.back()}>
                    <Text style={[styles.secondaryText, { color: AUTH.link }]}>{t('common.back')}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {step === STEPS.TRUSTED ? (
              <View style={styles.stateCard}>
                <ErrorBanner message={error} />
                <PrimaryButton
                  label={
                    busy ? t('publicStationCheckIn.checkingIn') : t('publicStationCheckIn.checkInAction')
                  }
                  onPress={() => void handleTrustedCheckIn()}
                  loading={busy}
                  disabled={busy}
                />
                <Pressable
                  style={styles.secondary}
                  onPress={() => {
                    setStep(STEPS.PHONE);
                    setError('');
                  }}
                >
                  <Text style={[styles.secondaryText, { color: AUTH.link }]}>
                    {t('publicStationCheckIn.useAnotherPhone')}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {step === STEPS.PHONE ? (
              <View style={styles.stateCard}>
                <Label>{t('publicStationCheckIn.phoneLabel')}</Label>
                <Field
                  value={phone}
                  onChangeText={(value) => {
                    setPhone(value);
                    setFieldErrors({});
                    setError('');
                  }}
                  keyboardType="phone-pad"
                  placeholder={t('publicStationCheckIn.phonePlaceholder')}
                  error={Boolean(fieldErrors.phone)}
                  latin
                />
                <FieldError message={fieldErrors.phone ? t(fieldErrors.phone) : undefined} />
                {genericNotice ? (
                  <Text style={[styles.notice, { color: AUTH.link }]}>{genericNotice}</Text>
                ) : null}
                <ErrorBanner message={error} />
                <PrimaryButton
                  label={busy ? t('publicStationCheckIn.sendingCode') : t('publicStationCheckIn.sendCode')}
                  onPress={() => void handleRequestOtp()}
                  loading={busy}
                  disabled={busy || !isValidEthiopianPhone(phone)}
                />
              </View>
            ) : null}

            {step === STEPS.OTP ? (
              <View style={styles.stateCard}>
                <AuthOtpBlock
                  label={t('signup.otpCode')}
                  phone={phone}
                  destinationFallback={t('publicStationCheckIn.otpDestination')}
                  value={otp}
                  onChange={(value) => {
                    setOtp(value);
                    setError('');
                  }}
                  error={error}
                  cooldown={cooldown}
                  canResend={canResend}
                  resendLoading={busy}
                  onResend={() => void handleResendOtp()}
                  onChangePhone={() => {
                    setStep(STEPS.PHONE);
                    setOtp('');
                    setError('');
                  }}
                  changePhoneLabel={t('publicStationCheckIn.changePhone')}
                />
                <PrimaryButton
                  label={
                    busy ? t('publicStationCheckIn.verifying') : t('publicStationCheckIn.verifyAndCheckIn')
                  }
                  onPress={() => void handleVerifyOtp()}
                  loading={busy}
                  disabled={busy || otp.replace(/\D/g, '').length !== 6 || !sessionId}
                />
              </View>
            ) : null}

            {step === STEPS.SUCCESS ? (
              <AuthSuccessPanel
                title={t('publicStationCheckIn.successTitle')}
                hero={memberName || t('publicStationCheckIn.title')}
                rows={successRows}
                hint={t('publicStationCheckIn.trustedHint')}
                ctaLabel={t('common.done')}
                onCta={handleDone}
              />
            ) : null}
          </AuthFormEnter>
        </FormScroll>
      </KeyboardAvoidingView>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingTop: 12,
    paddingBottom: 32,
  },
  brandMark: {
    width: 64,
    height: 78,
    alignSelf: 'center',
    marginBottom: 16,
  },
  gymEyebrow: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: AUTH.link,
    marginBottom: 4,
  },
  branchName: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
    marginBottom: 4,
  },
  title: authTitle,
  subtitle: authSubtitle,
  stateCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 4,
  },
  stateText: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  notice: {
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0.1,
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
});
