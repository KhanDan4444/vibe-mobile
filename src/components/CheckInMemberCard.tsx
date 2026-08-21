import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import StatusBadge from '@/src/components/StatusBadge';
import { VisitRing } from '@/src/components/VisitRing';
import { PrimaryButton } from '@/src/components/ui/Button';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import type { AttendanceSettings, CheckInMember } from '@/src/api/checkIns';
import { timings } from '@/src/theme/motion';
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
  const flash = useSharedValue(0);

  useEffect(() => {
    if (!success) return;
    flash.value = withSequence(
      withTiming(1, { duration: 160 }),
      withTiming(0, { duration: timings.enterMs })
    );
  }, [success, flash]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value * 0.55,
  }));

  const styles = useThemedStyles((theme) => ({
    wrap: {
      marginBottom: 0,
      overflow: 'hidden' as const,
      flex: 1,
    },
    card: {
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    cardError: {
      borderWidth: 1,
      borderColor: theme.statusExpired,
      backgroundColor: 'rgba(225,29,72,0.05)',
    },
    flash: {
      ...({ position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 }),
      backgroundColor: theme.accentCta,
      borderRadius: 16,
    },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    identity: { flex: 1, minWidth: 0, gap: 4 },
    name: {
      fontSize: 16,
      fontWeight: '700' as const,
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
      width: 118,
      flexShrink: 0,
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
    checkInBtn: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      minHeight: 40,
      minWidth: 0,
      alignSelf: 'stretch' as const,
    },
  }));

  const enterDelay = Math.min(index, 6) * 45;

  let action: ReactNode;
  if (expired) {
    action = <Text style={styles.statusText}>{t('checkIn.blockedExpired')}</Text>;
  } else if (checkedIn) {
    action = <Text style={styles.statusText}>{t('checkIn.alreadyTodayShort')}</Text>;
  } else if (cardError?.code === 'WEEKLY_LIMIT') {
    action = <Text style={styles.statusText}>{t('checkIn.weeklyLimitShort')}</Text>;
  } else {
    action = (
      <PrimaryButton
        label={busy ? t('common.loading') : t('checkIn.checkInAction')}
        onPress={onCheckIn}
        loading={busy}
        disabled={readOnly || busy}
        style={styles.checkInBtn}
      />
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(enterDelay).duration(320).springify().damping(18)}>
      <SoftSurface
        variant="panel"
        style={[styles.wrap, styles.card, showError ? styles.cardError : null]}
      >
        <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />
        <View style={styles.row}>
          <VisitRing
            visits={member.visits_this_week}
            limit={member.visits_limit}
            size={92}
            stroke={6.5}
            weekStartsOn={settings?.week_starts_on || member.week_starts_on || 'monday'}
            celebrate={success}
            badge={
              <MemberPhoto
                memberId={member.id}
                name={member.name}
                token={token}
                size={28}
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
