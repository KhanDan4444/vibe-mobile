import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { AppText as Text } from '@/src/components/AppText';
import { BottomSheet } from '@/src/components/BottomSheet';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import {
  fetchMemberPass,
  regenerateMemberPass,
  sendMemberPassSms,
  type MemberPassResponse,
} from '@/src/api/members';
import { useAuth } from '@/src/auth/AuthContext';
import { useFlash } from '@/src/context/FlashContext';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import { isGymOwner } from '@/src/utils/roles';
import { radiusMd, radiusLg } from '@/src/theme/tokens';

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function PassActionButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors: c } = useTheme();
  const idle = Boolean(disabled && !loading);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 36,
        borderRadius: radiusMd,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: pressed && !idle ? c.inputBg : c.card,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        opacity: idle ? 0.5 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={c.muted} size="small" />
      ) : (
        <Text style={{ fontSize: 14, fontWeight: '500', color: c.text }} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function MemberPassSheet({
  visible,
  memberId,
  memberName,
  memberPhone,
  onClose,
}: {
  visible: boolean;
  memberId: number;
  memberName: string;
  memberPhone?: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { colors: c } = useTheme();
  const { showFlash } = useFlash();
  const owner = isGymOwner(user?.role);
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
    smsHint: {
      marginTop: 6,
      fontSize: 11,
      lineHeight: 15,
      color: colors.dim,
      textAlign: 'center' as const,
    },
    regenLink: {
      alignSelf: 'center' as const,
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    regenText: { fontSize: 13, fontWeight: '600' as const, color: colors.accentText },
  }));

  const [loading, setLoading] = useState(false);
  const [pass, setPass] = useState<MemberPassResponse | null>(null);
  const [error, setError] = useState('');
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [smsSending, setSmsSending] = useState(false);

  const load = useCallback(async () => {
    if (!token || !memberId) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchMemberPass(token, memberId);
      setPass(data);
    } catch (err) {
      setPass(null);
      setError(userFacingApiMessage(err, t('checkIn.loadPassFailed')));
    } finally {
      setLoading(false);
    }
  }, [token, memberId, t]);

  useEffect(() => {
    if (!visible) {
      setPass(null);
      setError('');
      setConfirmRegen(false);
      return;
    }
    void load();
  }, [visible, load]);

  const onRegenerate = async () => {
    if (!token || regenerating) return;
    setRegenerating(true);
    try {
      const data = await regenerateMemberPass(token, memberId);
      setPass(data);
      setConfirmRegen(false);
      if (data.sms_sent) {
        showFlash({
          title: t('checkIn.passRegeneratedTitle'),
          subtitle: t('checkIn.passRegeneratedSmsSub', {
            name: memberName,
            phone: data.member?.phone || memberPhone,
          }),
          variant: 'success',
        });
      } else {
        showFlash({
          title: t('checkIn.passRegeneratedTitle'),
          subtitle: t('checkIn.passRegeneratedSub', { name: memberName }),
          variant: 'success',
        });
      }
    } catch (err) {
      showFlash({
        title: userFacingApiMessage(err, t('checkIn.regeneratePassFailed')),
        variant: 'danger',
      });
    } finally {
      setRegenerating(false);
    }
  };

  const onPrint = async () => {
    if (!pass?.qr_data_url || printing) return;
    setPrinting(true);
    try {
      const gym = pass.gym_name || '';
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
        <style>
          @page{margin:12mm}
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;margin:0;padding:24px}
          .card{width:85mm;max-width:100%;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-sizing:border-box;padding:0 0 16px;text-align:center}
          .bar{height:18px;background:#0f766e;border-radius:14px 14px 0 0}
          .inner{padding:18px 16px 0}
          .gym{font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;line-height:1.25;margin:0 0 6px}
          .sub{font-size:12px;color:#64748b;font-weight:600;margin:0 0 12px}
          .name{font-size:20px;font-weight:700;letter-spacing:-0.2px;color:#0f172a;margin:0}
          .phone{font-size:13px;color:#64748b;margin-top:6px}
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
            <div class="qr-wrap"><img class="qr" src="${pass.qr_data_url}" /></div>
          </div>
        </div></body></html>`;
      const file = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('checkIn.printPass'),
        });
      } else {
        await Print.printAsync({ html });
      }
      showFlash({
        title: t('checkIn.passPrintedTitle'),
        subtitle: t('checkIn.passPrintedSub', { name: memberName }),
        variant: 'success',
      });
    } catch (err) {
      showFlash({
        title: userFacingApiMessage(err, t('checkIn.printPassFailed')),
        variant: 'danger',
      });
    } finally {
      setPrinting(false);
    }
  };

  const onSms = async () => {
    if (!token || smsSending) return;
    if (!memberPhone) {
      showFlash({ title: t('checkIn.passNoPhone'), variant: 'danger' });
      return;
    }
    setSmsSending(true);
    try {
      const data = await sendMemberPassSms(token, memberId);
      showFlash({
        title: t('checkIn.passSmsSentTitle'),
        subtitle: t('checkIn.passSmsSentSub', { name: memberName, phone: data.phone || memberPhone }),
        variant: 'success',
      });
    } catch (err) {
      showFlash({
        title: userFacingApiMessage(err, t('checkIn.passSmsFailed')),
        variant: 'danger',
      });
    } finally {
      setSmsSending(false);
    }
  };

  const busy = loading || regenerating || printing || smsSending;

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

        <View style={styles.actions}>
          <View style={styles.actionCol}>
            <PassActionButton
              label={printing ? t('common.processing') : t('checkIn.printPass')}
              onPress={() => void onPrint()}
              disabled={busy || !pass?.qr_data_url}
              loading={printing}
            />
          </View>
          <View style={styles.actionCol}>
            <PassActionButton
              label={smsSending ? t('common.processing') : t('checkIn.smsPass')}
              onPress={() => void onSms()}
              disabled={busy || !memberPhone}
              loading={smsSending}
            />
            <Text style={styles.smsHint}>{t('checkIn.smsPassHint')}</Text>
          </View>
        </View>

        {owner ? (
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
    </>
  );
}
