import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { AppText as Text } from '@/src/components/AppText';
import { BottomSheet } from '@/src/components/BottomSheet';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { SecondaryButton } from '@/src/components/ui/Button';
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
import { formatDisplayDate } from '@/src/utils/date';
import { formatPlanDisplayName } from '@/src/utils/formatPlanDisplayName';
import { isGymOwner } from '@/src/utils/roles';
import { radiusLg } from '@/src/theme/tokens';

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    mark: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#fff',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    markText: { fontSize: 13, fontWeight: '800' as const, color: colors.accent },
    gym: {
      flex: 1,
      fontSize: 11,
      fontWeight: '700' as const,
      letterSpacing: 1.1,
      textTransform: 'uppercase' as const,
      color: '#fff',
    },
    body: { paddingHorizontal: 16, paddingVertical: 16, alignItems: 'stretch' as const },
    identity: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    photo: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.border,
    },
    identityCopy: { flex: 1, minWidth: 0 },
    name: {
      fontSize: 17,
      fontWeight: '600' as const,
      color: colors.text,
      letterSpacing: -0.2,
    },
    phone: { marginTop: 3, fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums' as const] },
    branch: { marginTop: 2, fontSize: 12, color: colors.dim },
    meta: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center' as const,
    },
    qr: {
      width: 180,
      height: 180,
      borderRadius: radiusLg,
      backgroundColor: '#fff',
      marginTop: 14,
      alignSelf: 'center' as const,
    },
    footerLabel: {
      marginTop: 10,
      fontSize: 11,
      color: colors.dim,
      textAlign: 'center' as const,
    },
    error: { color: colors.error, fontSize: 14, textAlign: 'center' as const, marginTop: 12 },
    actions: { flexDirection: 'row' as const, gap: 10, marginTop: 12 },
    actionHalf: { flex: 1 },
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
      }    } catch (err) {
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
      const mark = (gym.match(/[A-Za-z\u1200-\u137F]/)?.[0] || memberName.trim()[0] || 'V').toUpperCase();
      const plan = pass.member?.plan_name ? formatPlanDisplayName(pass.member.plan_name) : '';
      const expiry = pass.member?.end_date ? formatDisplayDate(pass.member.end_date) : '';
      const meta = [plan, expiry ? `${t('checkIn.passValidUntil')} ${expiry}` : '']
        .filter(Boolean)
        .join('  ·  ');
      const photo = pass.member?.photo_data_url
        ? `<img src="${pass.member.photo_data_url}" width="56" height="56" style="border-radius:14px;object-fit:cover;display:block;" />`
        : `<div style="width:56px;height:56px;border-radius:14px;background:#ccfbf1;color:#0f766e;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;">${escapeHtml(
            (memberName.trim().split(/\s+/).map((p) => p[0] || '').join('').slice(0, 2) || 'M').toUpperCase()
          )}</div>`;
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
        <style>
          @page{margin:12mm}
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;margin:0;padding:24px}
          .card{width:85mm;max-width:100%;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-sizing:border-box}
          .header{display:flex;align-items:center;gap:10px;background:#0f766e;padding:12px 14px}
          .mark{width:28px;height:28px;border-radius:999px;background:#fff;color:#0f766e;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center}
          .gym{flex:1;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#fff;font-weight:700;line-height:1.25}
          .inner{padding:16px 14px 14px}
          .id{display:flex;align-items:center;gap:12px;text-align:left}
          .name{font-size:16px;font-weight:700;letter-spacing:-0.2px;color:#0f172a}
          .phone{font-size:12px;color:#64748b;margin-top:3px}
          .branch{font-size:11px;color:#94a3b8;margin-top:2px}
          .meta{margin-top:14px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center}
          .qr-wrap{margin:14px auto 0;width:160px;height:160px;padding:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;box-sizing:border-box}
          .qr{width:100%;height:100%;display:block}
          .foot{margin-top:10px;font-size:10px;color:#94a3b8;text-align:center}
        </style></head><body>
        <div class="card">
          <div class="header">
            <div class="mark">${escapeHtml(mark)}</div>
            ${gym ? `<div class="gym">${escapeHtml(gym)}</div>` : ''}
          </div>
          <div class="inner">
            <div class="id">
              ${photo}
              <div>
                <div class="name">${escapeHtml(memberName)}</div>
                ${memberPhone ? `<div class="phone">${escapeHtml(memberPhone)}</div>` : ''}
                ${pass.member?.branch_name ? `<div class="branch">${escapeHtml(pass.member.branch_name)}</div>` : ''}
              </div>
            </div>
            ${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ''}
            <div class="qr-wrap"><img class="qr" src="${pass.qr_data_url}" /></div>
            <div class="foot">${escapeHtml(t('checkIn.memberPassTitle'))}</div>
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
          <View style={styles.header}>
            <View style={styles.mark}>
              <Text style={styles.markText}>
                {(pass?.gym_name || memberName || 'V').trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            {pass?.gym_name ? (
              <Text style={styles.gym} numberOfLines={2}>
                {pass.gym_name}
              </Text>
            ) : null}
          </View>
          <View style={styles.body}>
            {loading ? (
              <ActivityIndicator color={c.accent} />
            ) : (
              <>
                <View style={styles.identity}>
                  {pass?.member?.photo_data_url ? (
                    <Image source={{ uri: pass.member.photo_data_url }} style={styles.photo} />
                  ) : (
                    <View style={[styles.photo, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(13,148,136,0.15)' }]}>
                      <Text style={{ color: c.accent, fontWeight: '700', fontSize: 16 }}>
                        {memberName
                          .trim()
                          .split(/\s+/)
                          .map((p) => p[0] || '')
                          .join('')
                          .slice(0, 2)
                          .toUpperCase() || 'M'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.identityCopy}>
                    <Text display style={styles.name} numberOfLines={2}>
                      {memberName}
                    </Text>
                    {memberPhone ? <Text style={styles.phone}>{memberPhone}</Text> : null}
                    {pass?.member?.branch_name ? (
                      <Text style={styles.branch}>{pass.member.branch_name}</Text>
                    ) : null}
                  </View>
                </View>

                {pass?.member?.plan_name || pass?.member?.end_date ? (
                  <Text style={styles.meta}>
                    {[
                      pass.member.plan_name ? formatPlanDisplayName(pass.member.plan_name) : null,
                      pass.member.end_date
                        ? `${t('checkIn.passValidUntil')} ${formatDisplayDate(pass.member.end_date)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join('  ·  ')}
                  </Text>
                ) : null}

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
                <Text style={styles.footerLabel}>{t('checkIn.memberPassTitle')}</Text>
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
          <View style={styles.actionHalf}>
            <SecondaryButton
              label={printing ? t('common.processing') : t('checkIn.printPass')}
              onPress={() => void onPrint()}
              disabled={busy || !pass?.qr_data_url}
              loading={printing}
            />
          </View>
          <View style={styles.actionHalf}>
            <SecondaryButton
              label={smsSending ? t('common.processing') : t('checkIn.smsPass')}
              onPress={() => void onSms()}
              disabled={busy || !memberPhone}
              loading={smsSending}
            />
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
