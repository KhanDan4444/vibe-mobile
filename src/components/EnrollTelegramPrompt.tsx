import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Share, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { SecondaryButton } from '@/src/components/Form';
import { createMemberTelegramLink, fetchMember } from '@/src/api/members';
import { useAuth } from '@/src/auth/AuthContext';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import { radiusLg } from '@/src/theme/tokens';

type Props = {
  memberId: number;
  memberName: string;
};

/**
 * Optional Telegram link step on enroll success — member scans on their phone.
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

  const styles = useThemedStyles((colors) => ({
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
    error: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: '500' as const,
      color: colors.error,
      textAlign: 'center' as const,
    },
    qr: {
      width: 180,
      height: 180,
      borderRadius: radiusLg,
      backgroundColor: '#fff',
      marginTop: 20,
      alignSelf: 'center' as const,
    },
    qrPlaceholder: {
      width: 180,
      height: 180,
      borderRadius: radiusLg,
      backgroundColor: colors.border,
      marginTop: 20,
      alignSelf: 'center' as const,
    },
    url: {
      marginTop: 12,
      fontSize: 11,
      lineHeight: 16,
      color: colors.muted,
      textAlign: 'center' as const,
    },
    expires: {
      marginTop: 8,
      fontSize: 11,
      color: colors.muted,
      textAlign: 'center' as const,
    },
    refreshWrap: {
      marginTop: 12,
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
    shareBtn: { marginTop: 12 },
  }));

  const refreshLinked = useCallback(async () => {
    if (!memberId || !token) return false;
    try {
      const data = await fetchMember(token, memberId);
      const isLinked = Boolean(data.telegram_chat_id);
      if (isLinked) {
        setLinked(true);
        setTelegramLink(null);
        setOpen(false);
      }
      return isLinked;
    } catch {
      return false;
    }
  }, [token, memberId]);

  const loadLink = useCallback(async () => {
    if (!memberId || !token || linking) return;
    setLinking(true);
    setError('');
    try {
      const data = await createMemberTelegramLink(token, memberId);
      if (data.already_linked) {
        setLinked(true);
        setOpen(false);
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
  }, [token, memberId, linking, t]);

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
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.outlineBtn, pressed ? { opacity: 0.85 } : null]}
          onPress={handleOpen}
        >
          <Text style={styles.outlineBtnText}>{t('checkIn.telegramLink')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Pressable style={styles.brandLink} onPress={() => setOpen(false)}>
        <Text style={styles.brandLinkText}>← {t('enroll.telegramEnrollLater')}</Text>
      </Pressable>
      <Text style={styles.title}>{t('checkIn.telegramLinkDeskTitle')}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {linking && !telegramLink ? (
        <View style={[styles.qrPlaceholder, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : telegramLink?.qr_data_url ? (
        <Image
          source={{ uri: telegramLink.qr_data_url }}
          style={styles.qr}
          accessibilityLabel={t('checkIn.telegramLinkQrAlt', { name: memberName })}
        />
      ) : null}

      {telegramLink?.link ? (
        <>
          <Text latin style={styles.url}>
            {telegramLink.link}
          </Text>
          <View style={styles.shareBtn}>
            <SecondaryButton label={t('checkIn.telegramLinkShare')} onPress={() => void handleShare()} />
          </View>
          {telegramLink.expires_in_seconds ? (
            <Text style={styles.expires}>
              {t('checkIn.telegramLinkExpires', {
                minutes: Math.max(1, Math.round(telegramLink.expires_in_seconds / 60)),
              })}
            </Text>
          ) : null}
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
