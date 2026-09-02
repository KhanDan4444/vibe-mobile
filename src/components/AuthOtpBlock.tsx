import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { FieldError, Label } from '@/src/components/Form';
import { AUTH } from '@/src/theme/authChrome';
import { formatOtpCooldown } from '@/src/hooks/useOtpResendCooldown';
import { maskPhoneForDisplay } from '@/src/utils/phone';
import { radiusLg } from '@/src/theme/tokens';

export const OTP_SLOT_COUNT = 6;

type Props = {
  label: string;
  phone: string;
  destinationFallback?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  cooldown?: number;
  canResend?: boolean;
  resendLoading?: boolean;
  onResend: () => void;
  onChangePhone: () => void;
  changePhoneLabel?: string;
};

export function AuthOtpBlock({
  label,
  phone,
  destinationFallback,
  value,
  onChange,
  error,
  cooldown = 0,
  canResend = true,
  resendLoading = false,
  onResend,
  onChangePhone,
  changePhoneLabel,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const maskedPhone = maskPhoneForDisplay(phone);
  const hasPhoneDestination = Boolean(phone.trim());
  const destinationDisplay = hasPhoneDestination
    ? maskedPhone
    : destinationFallback || t('signup.otpSentRegisteredPhone');
  const digits = value.replace(/\D/g, '').slice(0, OTP_SLOT_COUNT);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (!error) return;
    shakeX.value = withSequence(
      withTiming(-6, { duration: 45 }),
      withTiming(6, { duration: 45 }),
      withTiming(-4, { duration: 45 }),
      withTiming(4, { duration: 45 }),
      withTiming(0, { duration: 45 })
    );
  }, [error, shakeX]);

  const slotsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const focusInput = () => inputRef.current?.focus();

  const otpAccessibilityLabel = t('signup.otpInputAriaLabel', {
    count: digits.length,
    total: OTP_SLOT_COUNT,
  });

  return (
    <View style={styles.panel}>
      <Label>{label}</Label>
      <View style={styles.destinationRow} accessibilityRole="text">
        <Ionicons name="chatbubble-ellipses-outline" size={14} color="rgba(153,246,228,0.75)" style={styles.destinationIcon} />
        <Text style={[styles.destinationText, { color: AUTH.textDim }]}>
          {t('signup.otpSentPrefix')}{' '}
          <Text style={styles.destinationPhone}>{destinationDisplay}</Text>
        </Text>
      </View>

      <Pressable onPress={focusInput} accessibilityRole="none">
        <Animated.View style={[styles.slotsWrap, slotsAnimatedStyle]}>
          <View style={styles.slotsRow}>
            {Array.from({ length: OTP_SLOT_COUNT }).map((_, index) => {
              const filled = Boolean(digits[index]);
              const active =
                digits.length === index || (digits.length >= OTP_SLOT_COUNT && index === OTP_SLOT_COUNT - 1);
              return (
                <View
                  key={index}
                  style={[
                    styles.slot,
                    filled ? styles.slotFilled : null,
                    active ? styles.slotActive : null,
                    error ? styles.slotError : null,
                  ]}
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                >
                  <Text latin style={styles.slotDigit}>
                    {digits[index] ?? ''}
                  </Text>
                </View>
              );
            })}
          </View>
          <TextInput
            ref={inputRef}
            value={digits}
            onChangeText={(next) => onChange(next.replace(/\D/g, '').slice(0, OTP_SLOT_COUNT))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            importantForAutofill="yes"
            maxLength={OTP_SLOT_COUNT}
            caretHidden
            accessibilityLabel={otpAccessibilityLabel}
            accessibilityHint={
              error ? error : `${t('signup.otpSentPrefix')} ${destinationDisplay}`
            }
            style={styles.hiddenInput}
          />
        </Animated.View>
      </Pressable>

      {error ? <FieldError message={error} /> : null}
      <View style={styles.actions}>
        {canResend ? (
          <Pressable onPress={onResend} disabled={resendLoading} hitSlop={6}>
            <Text style={[styles.actionLink, { color: AUTH.link, opacity: resendLoading ? 0.6 : 1 }]}>
              {resendLoading ? t('signup.sendingOtp') : t('signup.otpResend')}
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.cooldown, { color: AUTH.textDim }]}>
            {t('signup.otpResendIn', { time: formatOtpCooldown(cooldown) })}
          </Text>
        )}
        <Text style={[styles.sep, { color: AUTH.textDim }]} accessibilityElementsHidden>
          ·
        </Text>
        <Pressable onPress={onChangePhone} hitSlop={6}>
          <Text style={[styles.actionLink, { color: AUTH.link }]}>{changePhoneLabel || t('signup.changePhone')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radiusLg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 12,
    marginBottom: 4,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
    marginBottom: 12,
  },
  destinationIcon: {
    marginTop: 2,
  },
  destinationText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
  },
  destinationPhone: {
    fontWeight: '600',
    color: 'rgba(153,246,228,0.92)',
    letterSpacing: 0.2,
  },
  slotsWrap: {
    position: 'relative',
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  slot: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 48,
    borderRadius: radiusLg,
    borderWidth: 1,
    borderColor: AUTH.fieldBorder,
    backgroundColor: AUTH.fieldBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: {
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  slotActive: {
    borderColor: AUTH.fieldBorderFocus,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  slotError: {
    borderColor: AUTH.fieldBorderError,
  },
  slotDigit: {
    fontSize: 18,
    fontWeight: '600',
    color: AUTH.text,
    fontVariant: ['tabular-nums'],
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    color: 'transparent',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  actionLink: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  cooldown: {
    fontSize: 13,
    fontWeight: '500',
  },
  sep: {
    fontSize: 13,
    opacity: 0.55,
  },
});
