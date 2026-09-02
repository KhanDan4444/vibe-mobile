import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Share, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { createMemberTelegramLink, fetchMember } from '@/src/api/members';
import { useAuth } from '@/src/auth/AuthContext';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import { radiusLg } from '@/src/theme/tokens';
import { TelegramLinkShareRow } from '@/src/components/TelegramLinkShareRow';

type Props = {
  memberId: number;
  memberName: string;
};

function SkyOutlineButton({
  label,
  onPress,
  disabled,
  loading,
  styles,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  styles: ReturnType<typeof buildStyles>;
}) {
  const { colors: c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.outlineBtn,
        (disabled || loading) && { opacity: 0.55 },
        pressed && !disabled && !loading ? { opacity: 0.85 } : null,
      ]}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={c.link} size="small" />
      ) : (
        <Text style={styles.outlineBtnText}>{label}</Text>
      )}
    </Pressable>
  );
}

function buildStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return {
    panel: { marginTop: 24, width: '100%' as const },
    outlineBtn: {
      width: '100%' as const,
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${colors.link}80`,
      backgroundColor: 'transparent',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    outlineBtnText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.link,
    },
    brandLink: {
      alignSelf: 'flex-start' as const,
      paddingVertical: 4,
      paddingHorizontal: 2,
      marginBottom: 12,
    },
    brandLinkText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.accentText,
    },
    title: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
      textAlign: 'center' as const,
    },
    hint: {
      marginTop: 8,
      fontSize: 12,
      lineHeight: 18,
      color: colors.muted,
      textAlign: 'center' as const,
    },
    error: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: '500' as const,
      color: colors.error,
      textAlign: 'center' as const,
    },
    loadingWrap: {
      marginTop: 20,
      minHeight: 44,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    qr: {
      width: 180,
      height: 180,
      borderRadius: radiusLg,
      backgroundColor: '#fff',
      marginTop: 12,
      alignSelf: 'center' as const,
    },
    expires: {
      marginTop: 10,
      fontSize: 11,
      color: colors.muted,
      textAlign: 'center' as const,
    },
    waitingRow: {
      marginTop: 12,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      paddingHorizontal: 8,
    },
    waitingText: {
      flexShrink: 1,
      fontSize: 12,
      lineHeight: 17,
      color: colors.muted,
      textAlign: 'center' as const,
    },
    refreshWrap: {
      marginTop: 8,
      alignItems: 'center' as const,
    },
    linkedRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 6,
    },
    linkedDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.linkDot,
    },
    linkedText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.link,
      textAlign: 'center' as const,
    },
  };
}

/**
 * Optional Telegram link on enroll success — share-first for staff phone at desk.
 */
export function EnrollTelegramPrompt({ memberId, memberName }: Props) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { colors: c } = useTheme();
  const [open, setOpen] = useState(false);
  const [linked, setLinked] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');
  const [telegramLink, setTelegramLink] = useState<{
    link: string;
    qr_data_url?: string | null;
    expires_in_seconds?: number;
  } | null>(null);

  const styles = useThemedStyles((colors) => buildStyles(colors));

  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  const refreshLinked = useCallback(async () => {
    if (!memberId || !token) return false;
    try {
      const data = await fetchMember(token, memberId);
      const isLinked = Boolean(data.telegram_chat_id);
      if (isLinked) {
        setLinked(true);
        setTelegramLink(null);
        closePanel();
      }
      return isLinked;
    } catch {
      return false;
    }
  }, [token, memberId, closePanel]);

  const loadLink = useCallback(async () => {
    if (!memberId || !token || linking) return;
    setLinking(true);
    setError('');
    try {
      const data = await createMemberTelegramLink(token, memberId);
      if (data.already_linked) {
        setLinked(true);
        closePanel();
        setTelegramLink(null);
        return;
      }
      if (data.link) {
        setTelegramLink({
          link: data.link,
          qr_data_url: data.qr_data_url,
          expires_in_seconds: data.expires_in_seconds,
        });
      }
    } catch (err) {
      setError(userFacingApiMessage(err, t('auth.connectionFailed'), t('checkIn.telegramLinkFailed')));
    } finally {
      setLinking(false);
    }
  }, [token, memberId, linking, t, closePanel]);

  useEffect(() => {
    if (!open || linked || !telegramLink) return undefined;
    const timer = setInterval(() => {
      void refreshLinked();
    }, 5000);
    return () => clearInterval(timer);
  }, [open, linked, telegramLink, refreshLinked]);

  const handleOpen = () => {
    setOpen(true);
    if (!telegramLink) void loadLink();
  };

  const handleShare = async () => {
    if (!telegramLink?.link) return;
    try {
      await Share.share({ message: telegramLink.link });
    } catch {
      /* user dismissed */
    }
  };

  if (!memberId || !token) return null;

  if (linked) {
    return (
      <View style={styles.panel}>
        <View style={styles.linkedRow}>
          <View style={styles.linkedDot} />
          <Text style={styles.linkedText}>{t('checkIn.telegramLinked')}</Text>
        </View>
      </View>
    );
  }

  if (!open) {
    return (
      <View style={styles.panel}>
        <SkyOutlineButton label={t('checkIn.telegramLink')} onPress={handleOpen} styles={styles} />
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Pressable style={styles.brandLink} onPress={closePanel}>
        <Text style={styles.brandLinkText}>← {t('enroll.telegramEnrollLater')}</Text>
      </Pressable>
      <Text style={styles.title}>{t('checkIn.telegramLinkDeskTitle')}</Text>
      <Text style={styles.hint}>{t('checkIn.telegramLinkDeskHint')}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {linking && !telegramLink ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={c.link} />
        </View>
      ) : null}

      {telegramLink?.link ? (
        <>
          {telegramLink.qr_data_url ? (
            <Image
              source={{ uri: telegramLink.qr_data_url }}
              style={styles.qr}
              accessibilityLabel={t('checkIn.telegramLinkQrAlt', { name: memberName })}
            />
          ) : null}

          <TelegramLinkShareRow
            link={telegramLink.link}
            shareLabel={t('checkIn.telegramLinkShare')}
            onShare={() => void handleShare()}
          />

          {telegramLink.expires_in_seconds ? (
            <Text style={styles.expires}>
              {t('checkIn.telegramLinkExpires', {
                minutes: Math.max(1, Math.round(telegramLink.expires_in_seconds / 60)),
              })}
            </Text>
          ) : null}

          <View style={styles.waitingRow}>
            <ActivityIndicator color={c.link} size="small" />
            <Text style={styles.waitingText}>{t('enroll.telegramWaitingForMember')}</Text>
          </View>

          <View style={styles.refreshWrap}>
            <Pressable disabled={linking} onPress={() => void loadLink()}>
              <Text style={styles.brandLinkText}>
                {linking ? t('common.processing') : t('checkIn.telegramLinkRefresh')}
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}
