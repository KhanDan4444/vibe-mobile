import { type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import StatusBadge from '@/src/components/StatusBadge';
import { VisitRing } from '@/src/components/VisitRing';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import type { AttendanceSettings, CheckInMember } from '@/src/api/checkIns';
import { useTheme } from '@/src/context/PreferencesContext';
import { springs, timings } from '@/src/theme/motion';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

type CardError = { code: string; message: string };

type Props = {
  member: CheckInMember;
  token: string;
  settings: AttendanceSettings | null;
  cardError?: CardError;
  busy: boolean;
  success: boolean;
  /** Already on today’s check-in list — hide Check in button. */
  alreadyToday?: boolean;
  readOnly: boolean;
  index: number;
  onCheckIn: () => void;
};

function isExpiredStatus(status: string) {
  return (status || '').toLowerCase() === 'expired';
}

/** Compact desk CTA — matches web renew-style check-in chip. */
function CheckInPill({
  label,
  busy,
  disabled,
  onPress,
}: {
  label: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors: c } = useTheme();
  const scale = useSharedValue(1);
  const idle = disabled && !busy;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled || busy}
        onPress={() => {
          if (Platform.OS !== 'web') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onPress();
        }}
        onPressIn={() => {
          if (!idle && !busy) scale.value = withSpring(0.97, springs.press);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, springs.press);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          minHeight: 34,
          paddingHorizontal: 11,
          paddingVertical: 7,
          borderRadius: 8,
          backgroundColor: idle ? c.border : c.accent,
          opacity: idle ? 0.7 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={15} color="#ffffff" />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 0.1,
                color: '#ffffff',
              }}
            >
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** Search result card — ring + identity + right-side action (matches web). */
export function CheckInMemberCard({
  member,
  token,
  settings,
  cardError,
  busy,
  success,
  alreadyToday = false,
  readOnly,
  index,
  onCheckIn,
}: Props) {
  const { t } = useTranslation();
  const expired = isExpiredStatus(member.status);
  const checkedIn = alreadyToday || success || cardError?.code === 'ALREADY_TODAY';
  const showError =
    Boolean(cardError) && !checkedIn && cardError?.code !== 'ALREADY_TODAY';

  const styles = useThemedStyles((theme) => ({
    wrap: {
      marginBottom: 0,
      overflow: 'hidden' as const,
      flex: 1,
    },
    card: {
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    cardError: {
      borderWidth: 1,
      borderColor: theme.statusExpired,
      backgroundColor: 'rgba(225,29,72,0.05)',
    },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    identity: { flex: 1, minWidth: 0, gap: 3 },
    name: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: theme.text,
      letterSpacing: -0.2,
    },
    phone: { fontSize: 13, color: theme.muted },
    badges: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      gap: 6,
      marginTop: 2,
    },
    unpaid: { fontSize: 11, fontWeight: '600' as const, color: theme.statusUnpaid },
    errorText: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: '700' as const,
      lineHeight: 16,
      color: theme.statusExpired,
    },
    actionCol: {
      flexShrink: 0,
      maxWidth: 120,
      alignItems: 'flex-end' as const,
      justifyContent: 'center' as const,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '700' as const,
      textAlign: 'right' as const,
      lineHeight: 16,
      color: theme.statusExpired,
    },
  }));

  const enterDelay = Math.min(index, 4) * 30;

  let action: ReactNode;
  if (expired) {
    action = <Text style={styles.statusText}>{t('checkIn.blockedExpired')}</Text>;
  } else if (checkedIn) {
    action = (
      <Animated.View entering={FadeInRight.duration(180)}>
        <Text style={styles.statusText}>{t('checkIn.alreadyTodayShort')}</Text>
      </Animated.View>
    );
  } else if (cardError?.code === 'WEEKLY_LIMIT') {
    action = <Text style={styles.statusText}>{t('checkIn.weeklyLimitShort')}</Text>;
  } else {
    action = (
      <CheckInPill
        label={busy ? t('common.loading') : t('checkIn.checkInAction')}
        busy={busy}
        disabled={readOnly || busy}
        onPress={onCheckIn}
      />
    );
  }

  return (
    <Animated.View entering={FadeIn.delay(enterDelay).duration(timings.fadeMs)}>
      <SoftSurface
        variant="panel"
        style={[styles.wrap, styles.card, showError ? styles.cardError : null]}
      >
        <View style={styles.row}>
          <VisitRing
            visits={member.visits_this_week}
            limit={member.visits_limit}
            size={88}
            stroke={6}
            weekStartsOn={settings?.week_starts_on || member.week_starts_on || 'monday'}
            celebrate={success}
            badge={
              <MemberPhoto
                memberId={member.id}
                name={member.name}
                token={token}
                size={26}
                hasPhoto={Boolean(member.photo_url)}
              />
            }
          />
          <View style={styles.identity}>
            <Text display style={styles.name} numberOfLines={1}>
              {member.name}
            </Text>
            <Text style={styles.phone} numberOfLines={1}>
              {member.phone || '—'}
            </Text>
            <View style={styles.badges}>
              <StatusBadge status={member.status} showDot={false} />
              {member.is_unpaid ? (
                <Text style={styles.unpaid}>{t('members.unpaidBadge')}</Text>
              ) : null}
            </View>
            {showError ? <Text style={styles.errorText}>{cardError!.message}</Text> : null}
          </View>
          <View style={styles.actionCol}>{action}</View>
        </View>
      </SoftSurface>
    </Animated.View>
  );
}
