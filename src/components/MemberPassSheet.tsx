import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Share, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  cacheQrDataUrl,
  downloadHtmlAsPdf,
  escapeHtml,
  memberPassFilename,
} from '@/src/utils/posterPrint';
import { AppText as Text } from '@/src/components/AppText';
import { BottomSheet } from '@/src/components/BottomSheet';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { TelegramLinkShareRow } from '@/src/components/TelegramLinkShareRow';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import {
  createMemberTelegramLink,
  fetchMember,
  fetchMemberPass,
  regenerateMemberPass,
  sendMemberPassSms,
  unlinkMemberTelegram,
  type MemberPassResponse,
} from '@/src/api/members';
import { useAuth } from '@/src/auth/AuthContext';
import { useFlash } from '@/src/context/FlashContext';
import { FLASH_SHEET_ACTION_MS, type FlashToast } from '@/src/components/FlashBanner';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import { isGymOwner } from '@/src/utils/roles';
import { radiusLg } from '@/src/theme/tokens';

function passToast(toast: Omit<FlashToast, 'durationMs'>) {
  return { durationMs: FLASH_SHEET_ACTION_MS, ...toast };
}

import { QrSheetActionButton } from '@/src/components/QrSheetActionButton';
import { TelegramLinkStatusRow } from '@/src/components/TelegramLinkStatusRow';

export function MemberPassSheet({
  visible,
  memberId,
  memberName,
  memberPhone,
  telegramChatId,
  onClose,
  onTelegramLinked,
}: {
  visible: boolean;
  memberId: number;
  memberName: string;
  memberPhone?: string | null;
  telegramChatId?: string | null;
  onClose: () => void;
  onTelegramLinked?: () => void;
}) {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { colors: c } = useTheme();
  const { showFlash } = useFlash();
  const owner = isGymOwner(user?.role);
  const [liveTelegramChatId, setLiveTelegramChatId] = useState<string | null>(telegramChatId ?? null);
  const [showTelegramSetup, setShowTelegramSetup] = useState(false);
  const [telegramSetupFromSendPass, setTelegramSetupFromSendPass] = useState(false);
  const telegramSetupFromSendPassRef = useRef(false);
  const telegramLinkedRef = useRef(false);
  telegramSetupFromSendPassRef.current = telegramSetupFromSendPass;

  const telegramLinked = Boolean(liveTelegramChatId);
  telegramLinkedRef.current = telegramLinked;
  const canSendPass = telegramLinked;
  const onPassView = telegramLinked || !showTelegramSetup;

  const styles = useThemedStyles((colors) => ({
    card: {
      overflow: 'hidden' as const,
      paddingVertical: 0,
      paddingHorizontal: 0,
      marginTop: 4,
    },
    brandBar: {
      height: 6,
      backgroundColor: colors.accent,
    },
    body: { paddingHorizontal: 16, paddingVertical: 18, alignItems: 'center' as const },
    gym: {
      fontSize: 11,
      fontWeight: '700' as const,
      letterSpacing: 1.4,
      textTransform: 'uppercase' as const,
      color: colors.accentText,
      textAlign: 'center' as const,
      marginBottom: 6,
    },
    passSubtitle: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.muted,
      textAlign: 'center' as const,
      marginBottom: 10,
    },
    name: {
      fontSize: 17,
      fontWeight: '600' as const,
      color: colors.text,
      letterSpacing: -0.2,
      textAlign: 'center' as const,
    },
    phone: {
      marginTop: 4,
      fontSize: 13,
      color: colors.muted,
      fontVariant: ['tabular-nums' as const],
      textAlign: 'center' as const,
    },
    qr: {
      width: 200,
      height: 200,
      borderRadius: radiusLg,
      backgroundColor: '#fff',
      marginTop: 14,
    },
    error: { color: colors.error, fontSize: 14, textAlign: 'center' as const, marginTop: 12 },
    actions: { flexDirection: 'row' as const, gap: 8, marginTop: 12 },
    actionCol: { flex: 1, minWidth: 0 },
    regenLink: {
      alignSelf: 'center' as const,
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    regenText: { fontSize: 13, fontWeight: '600' as const, color: colors.accentText },
    linkTelegramBtn: {
      marginTop: 10,
      alignSelf: 'center' as const,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    linkTelegramText: { fontSize: 12, fontWeight: '600' as const, color: colors.link },
    backToPass: {
      alignSelf: 'flex-start' as const,
      marginBottom: 10,
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    backToPassText: { fontSize: 12, fontWeight: '600' as const, color: colors.accentText },
    telegramBanner: {
      marginBottom: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: `${colors.link}40`,
      backgroundColor: `${colors.link}14`,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    telegramBannerText: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.link,
      textAlign: 'center' as const,
    },
    telegramPanel: {
      marginTop: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    telegramTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
      textAlign: 'center' as const,
    },
    telegramHint: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
      color: colors.muted,
      textAlign: 'center' as const,
    },
    telegramQr: {
      width: 180,
      height: 180,
      borderRadius: radiusLg,
      backgroundColor: '#fff',
      marginTop: 12,
      alignSelf: 'center' as const,
    },
    telegramWaitingRow: {
      marginTop: 12,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      paddingHorizontal: 8,
    },
    telegramWaitingText: {
      flexShrink: 1,
      fontSize: 12,
      lineHeight: 17,
      color: colors.muted,
      textAlign: 'center' as const,
    },
    telegramRefresh: {
      marginTop: 10,
      alignSelf: 'center' as const,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    telegramRefreshText: { fontSize: 12, fontWeight: '600' as const, color: colors.accentText },
  }));

  const [loading, setLoading] = useState(false);
  const [pass, setPass] = useState<MemberPassResponse | null>(null);
  const [error, setError] = useState('');
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [telegramLinking, setTelegramLinking] = useState(false);
  const [telegramUnlinking, setTelegramUnlinking] = useState(false);
  const [confirmTelegramUnlink, setConfirmTelegramUnlink] = useState(false);
  const [telegramLink, setTelegramLink] = useState<{
    link: string;
    qr_data_url?: string | null;
    expires_in_seconds?: number;
  } | null>(null);

  const refreshMember = useCallback(async () => {
    if (!token || !memberId) return null;
    try {
      const data = await fetchMember(token, memberId);
      setLiveTelegramChatId(data.telegram_chat_id ?? null);
      return data;
    } catch {
      return null;
    }
  }, [token, memberId]);

  const sendPassLink = useCallback(async () => {
    if (!token) return false;
    setSmsSending(true);
    try {
      const data = await sendMemberPassSms(token, memberId);
      const viaTelegram = data.channel === 'telegram';
      showFlash(passToast({
        title: t('checkIn.passSmsSentTitle'),
        subtitle: viaTelegram
          ? t('checkIn.passTelegramSentSub', { name: memberName })
          : t('checkIn.passSmsSentSub', { name: memberName, phone: data.phone || memberPhone }),
        variant: 'success',
      }));
      return true;
    } catch (err) {
      showFlash(passToast({
        title: userFacingApiMessage(err, t('auth.connectionFailed'), t('checkIn.passSmsFailed')),
        variant: 'danger',
      }));
      return false;
    } finally {
      setSmsSending(false);
    }
  }, [token, memberId, memberName, memberPhone, showFlash, t]);

  const handleTelegramLinked = useCallback(
    async (fromSendPass: boolean, opts?: { alreadyLinked?: boolean }) => {
      setTelegramLink(null);
      setShowTelegramSetup(false);
      setTelegramSetupFromSendPass(false);
      onTelegramLinked?.();
      if (fromSendPass && opts?.alreadyLinked) {
        await sendPassLink();
        return;
      }
      showFlash(passToast({
        title: t('checkIn.telegramLinked'),
        variant: 'success',
      }));
    },
    [onTelegramLinked, sendPassLink, showFlash, t]
  );

  const handleTelegramUnlinked = useCallback(() => {
    setLiveTelegramChatId(null);
    setTelegramLink(null);
    setShowTelegramSetup(false);
    setTelegramSetupFromSendPass(false);
    onTelegramLinked?.();
    showFlash(passToast({
      title: t('checkIn.telegramUnlinked'),
      variant: 'success',
    }));
  }, [onTelegramLinked, showFlash, t]);

  const onTelegramUnlink = async () => {
    if (!token || telegramUnlinking || !telegramLinked) return;
    setTelegramUnlinking(true);
    try {
      await unlinkMemberTelegram(token, memberId);
      setConfirmTelegramUnlink(false);
      handleTelegramUnlinked();
    } catch (err) {
      showFlash(passToast({
        title: userFacingApiMessage(err, t('auth.connectionFailed'), t('checkIn.telegramUnlinkFailed')),
        variant: 'danger',
      }));
    } finally {
      setTelegramUnlinking(false);
    }
  };

  const load = useCallback(async () => {
    if (!token || !memberId) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchMemberPass(token, memberId);
      setPass(data);
    } catch (err) {
      setPass(null);
      setError(userFacingApiMessage(err, t('auth.connectionFailed'), t('checkIn.loadPassFailed')));
    } finally {
      setLoading(false);
    }
  }, [token, memberId, t]);

  useEffect(() => {
    setLiveTelegramChatId(telegramChatId ?? null);
  }, [telegramChatId]);

  useEffect(() => {
    if (!visible) {
      setPass(null);
      setError('');
      setConfirmRegen(false);
      setTelegramLink(null);
      setShowTelegramSetup(false);
      setTelegramSetupFromSendPass(false);
      return;
    }
    void load();
    void refreshMember();
  }, [visible, load, refreshMember]);

  useEffect(() => {
    if (!visible || (!telegramLinked && !telegramLink)) return undefined;
    const timer = setInterval(() => {
      void refreshMember().then((data) => {
        const wasLinked = telegramLinkedRef.current;
        const nowLinked = Boolean(data?.telegram_chat_id);
        if (!wasLinked && nowLinked) {
          void handleTelegramLinked(telegramSetupFromSendPassRef.current);
        } else if (wasLinked && !nowLinked) {
          handleTelegramUnlinked();
        }
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [visible, telegramLinked, telegramLink, refreshMember, handleTelegramLinked, handleTelegramUnlinked]);

  const onRegenerate = async () => {
    if (!token || regenerating) return;
    setRegenerating(true);
    try {
      const data = await regenerateMemberPass(token, memberId);
      setPass(data);
      setConfirmRegen(false);
      if (data.sms_sent) {
        showFlash(passToast({
          title: t('checkIn.passRegeneratedTitle'),
          subtitle: t('checkIn.passRegeneratedSmsSub', {
            name: memberName,
            phone: data.member?.phone || memberPhone,
          }),
          variant: 'success',
        }));
      } else {
        showFlash(passToast({
          title: t('checkIn.passRegeneratedTitle'),
          subtitle: t('checkIn.passRegeneratedSub', { name: memberName }),
          variant: 'success',
        }));
      }
    } catch (err) {
      showFlash(passToast({
        title: userFacingApiMessage(err, t('auth.connectionFailed'), t('checkIn.regeneratePassFailed')),
        variant: 'danger',
      }));
    } finally {
      setRegenerating(false);
    }
  };

  const onPrint = async () => {
    if (!pass?.qr_data_url || printing) return;
    setPrinting(true);
    let qrUri = '';
    try {
      const gym = pass.gym_name || '';
      qrUri = cacheQrDataUrl(pass.qr_data_url, 'member-pass-qr');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
        <style>
          @page{margin:12mm}
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;margin:0;padding:24px}
          .card{width:85mm;max-width:100%;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-sizing:border-box;padding:0 0 16px;text-align:center}
          .bar{height:18px;background:#0f766e;border-radius:14px 14px 0 0}
          .inner{padding:18px 16px 0}
          .gym{font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;line-height:1.25;margin:0 0 6px}
          .sub{font-size:12px;color:#475569;font-weight:600;margin:0 0 12px}
          .name{font-size:20px;font-weight:700;letter-spacing:-0.2px;color:#0f172a;margin:0}
          .phone{font-size:13px;color:#475569;margin-top:6px}
          .qr-wrap{margin:16px auto 0;width:180px;height:180px;padding:6px;background:#fff;box-sizing:border-box}
          .qr{width:100%;height:100%;display:block}
        </style></head><body>
        <div class="card">
          <div class="bar"></div>
          <div class="inner">
            ${gym ? `<div class="gym">${escapeHtml(gym)}</div>` : ''}
            <div class="sub">${escapeHtml(t('checkIn.memberPassTitle'))}</div>
            <div class="name">${escapeHtml(memberName)}</div>
            ${memberPhone ? `<div class="phone">${escapeHtml(memberPhone)}</div>` : ''}
            <div class="qr-wrap"><img class="qr" src="${qrUri}" /></div>
          </div>
        </div></body></html>`;
      await downloadHtmlAsPdf(html, memberPassFilename(memberName), {
        onPdfReady: () => setPrinting(false),
      });
      showFlash(passToast({
        title: t('checkIn.passPrintedTitle'),
        subtitle: t('checkIn.passPrintedSub', { name: memberName }),
        variant: 'success',
      }));
    } catch (err) {
      showFlash(passToast({
        title: userFacingApiMessage(err, t('auth.connectionFailed'), t('checkIn.printPassFailed')),
        variant: 'danger',
      }));
    } finally {
      setPrinting(false);
    }
  };

  const onSms = async () => {
    if (!token || smsSending) return;
    if (!canSendPass) {
      setTelegramSetupFromSendPass(true);
      setShowTelegramSetup(true);
      if (!telegramLink) void onTelegramLink();
      return;
    }
    await sendPassLink();
  };

  const onTelegramLink = async () => {
    if (!token || telegramLinking || telegramLinked) return;
    setShowTelegramSetup(true);
    setTelegramLinking(true);
    try {
      const data = await createMemberTelegramLink(token, memberId);
      if (data.already_linked) {
        await refreshMember();
        await handleTelegramLinked(telegramSetupFromSendPassRef.current, { alreadyLinked: true });
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
      showFlash(passToast({
        title: userFacingApiMessage(err, t('auth.connectionFailed'), t('checkIn.telegramLinkFailed')),
        variant: 'danger',
      }));
    } finally {
      setTelegramLinking(false);
    }
  };

  const onShareTelegramLink = async () => {
    if (!telegramLink?.link) return;
    try {
      await Share.share({ message: telegramLink.link });
    } catch {
      /* user dismissed */
    }
  };

  const busy = loading || regenerating || printing || smsSending || telegramLinking || telegramUnlinking;

  const passCard = (
    <SoftSurface variant="quiet" style={styles.card}>
      <View style={styles.brandBar} />
      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator color={c.accent} />
        ) : (
          <>
            {pass?.gym_name ? (
              <Text style={styles.gym} numberOfLines={2}>
                {pass.gym_name}
              </Text>
            ) : null}
            <Text style={styles.passSubtitle}>{t('checkIn.memberPassTitle')}</Text>
            <Text display style={styles.name} numberOfLines={2}>
              {memberName}
            </Text>
            {memberPhone ? <Text style={styles.phone}>{memberPhone}</Text> : null}
            {pass?.qr_data_url ? (
              <Image
                source={{ uri: pass.qr_data_url }}
                style={styles.qr}
                accessibilityLabel={t('checkIn.memberPassQrAlt', { name: memberName })}
              />
            ) : (
              <View style={[styles.qr, { alignItems: 'center', justifyContent: 'center', backgroundColor: c.border }]}>
                <Text style={{ color: c.muted }}>—</Text>
              </View>
            )}
          </>
        )}
        {error ? (
          <View>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => void load()} style={{ marginTop: 10 }}>
              <Text style={{ color: c.accentText, textAlign: 'center', fontWeight: '600' }}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SoftSurface>
  );

  const passActions = (
    <View style={styles.actions}>
      <View style={styles.actionCol}>
        <QrSheetActionButton
          label={printing ? t('common.processing') : t('checkIn.printPass')}
          onPress={() => void onPrint()}
          disabled={busy || !pass?.qr_data_url}
          loading={printing}
        />
      </View>
      <View style={styles.actionCol}>
        <QrSheetActionButton
          label={smsSending ? t('common.processing') : t('checkIn.smsPass')}
          onPress={() => void onSms()}
          disabled={smsSending}
          loading={smsSending}
        />
      </View>
    </View>
  );

  const telegramSetupPanel = (
    <View style={styles.telegramPanel}>
      <Pressable
        style={styles.backToPass}
        onPress={() => {
          setShowTelegramSetup(false);
          setTelegramSetupFromSendPass(false);
        }}
      >
        <Text style={styles.backToPassText}>← {t('checkIn.backToPass')}</Text>
      </Pressable>
      {telegramSetupFromSendPass ? (
        <View style={styles.telegramBanner}>
          <Text style={styles.telegramBannerText}>{t('checkIn.telegramLinkThenSendPass')}</Text>
        </View>
      ) : null}
      <Text style={styles.telegramTitle}>{t('checkIn.telegramLink')}</Text>
      {telegramLinking && !telegramLink ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 24 }} />
      ) : telegramLink?.qr_data_url ? (
        <Image
          source={{ uri: telegramLink.qr_data_url }}
          style={styles.telegramQr}
          accessibilityLabel={t('checkIn.telegramLinkQrAlt', { name: memberName })}
        />
      ) : null}
      {telegramLink?.link ? (
        <>
          <TelegramLinkShareRow
            link={telegramLink.link}
            shareLabel={t('checkIn.telegramLinkShare')}
            onShare={() => void onShareTelegramLink()}
          />
          {telegramLink.expires_in_seconds ? (
            <Text style={[styles.telegramHint, { marginTop: 8 }]}>
              {t('checkIn.telegramLinkExpires', {
                minutes: Math.max(1, Math.round(telegramLink.expires_in_seconds / 60)),
              })}
            </Text>
          ) : null}
          <View style={styles.telegramWaitingRow}>
            <ActivityIndicator color={c.link} size="small" />
            <Text style={styles.telegramWaitingText}>{t('enroll.telegramWaitingForMember')}</Text>
          </View>
          <Pressable style={styles.telegramRefresh} disabled={telegramLinking} onPress={() => void onTelegramLink()}>
            <Text style={styles.telegramRefreshText}>
              {telegramLinking ? t('common.processing') : t('checkIn.telegramLinkRefresh')}
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );

  return (
    <>
      <BottomSheet
        visible={visible}
        title={t('checkIn.memberPassTitle')}
        onClose={onClose}
        showCloseButton
        footer={undefined}
      >
        <Text style={{ color: c.muted, fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
          {t('checkIn.memberPassBody', { name: memberName })}
        </Text>

        {onPassView ? (
          <>
            {passCard}
            {passActions}
            {!telegramLinked ? (
              <Text style={[styles.telegramHint, { marginTop: 10, textAlign: 'center' }]}>
                {t('checkIn.passNoTelegram')}
              </Text>
            ) : null}
            {telegramLinked ? (
              <TelegramLinkStatusRow
                variant="panel"
                disabled={busy}
                onUnlink={() => setConfirmTelegramUnlink(true)}
              />
            ) : (
              <Pressable
                style={styles.linkTelegramBtn}
                disabled={busy}
                onPress={() => {
                  setTelegramSetupFromSendPass(false);
                  setShowTelegramSetup(true);
                  if (!telegramLink) void onTelegramLink();
                }}
              >
                {telegramLinking ? (
                  <ActivityIndicator color={c.muted} size="small" />
                ) : (
                  <Text style={styles.linkTelegramText}>{t('checkIn.telegramLink')}</Text>
                )}
              </Pressable>
            )}
          </>
        ) : (
          telegramSetupPanel
        )}

        {owner && onPassView ? (
          <Pressable
            style={styles.regenLink}
            disabled={busy}
            onPress={() => setConfirmRegen(true)}
          >
            <Text style={styles.regenText}>
              {regenerating ? t('common.processing') : t('checkIn.regeneratePass')}
            </Text>
          </Pressable>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        visible={confirmRegen}
        title={t('checkIn.regeneratePassTitle')}
        message={t('checkIn.regeneratePassMessage', { name: memberName })}
        confirmLabel={t('checkIn.regeneratePassConfirm')}
        destructive={false}
        onCancel={() => setConfirmRegen(false)}
        onConfirm={() => void onRegenerate()}
      />

      <ConfirmDialog
        visible={confirmTelegramUnlink}
        title={t('checkIn.telegramUnlink')}
        message={t('checkIn.telegramUnlinkConfirm', { name: memberName })}
        confirmLabel={t('checkIn.telegramUnlink')}
        destructive
        confirmLoading={telegramUnlinking}
        onCancel={() => setConfirmTelegramUnlink(false)}
        onConfirm={() => void onTelegramUnlink()}
      />
    </>
  );
}
