import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Share, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  cacheQrDataUrl,
  downloadHtmlAsPdf,
  escapeHtml,
  gymQrPosterFilename,
} from '@/src/utils/posterPrint';
import { AppText as Text } from '@/src/components/AppText';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { PickerTrigger } from '@/src/components/PickerTrigger';
import { QrSheetActionButton } from '@/src/components/QrSheetActionButton';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import {
  fetchBranchStationPass,
  regenerateBranchStationPass,
  type BranchStationPassResponse,
} from '@/src/api/branches';
import { useFlash } from '@/src/context/FlashContext';
import { FLASH_SHEET_ACTION_MS, type FlashToast } from '@/src/components/FlashBanner';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import { radiusLg } from '@/src/theme/tokens';
import type { BranchRow } from '@/src/types/api';

function stationToast(toast: Omit<FlashToast, 'durationMs'>) {
  return { durationMs: FLASH_SHEET_ACTION_MS, ...toast };
}

export function GymQrSheet({
  visible,
  onClose,
  token,
  branches,
  initialBranchId,
  canRegenerate = false,
  selfCheckInEnabled = false,
}: {
  visible: boolean;
  onClose: () => void;
  token: string | null;
  branches: BranchRow[];
  initialBranchId: number | null;
  canRegenerate?: boolean;
  selfCheckInEnabled?: boolean;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const { showFlash } = useFlash();
  const loadSeq = useRef(0);

  const [branchId, setBranchId] = useState<number | null>(initialBranchId);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState<BranchStationPassResponse | null>(null);

  const activeBranches = useMemo(
    () => branches.filter((b) => b.is_active !== false),
    [branches]
  );

  const resolvedBranchId = useMemo(() => {
    if (branchId && activeBranches.some((b) => b.id === branchId)) return branchId;
    if (initialBranchId && activeBranches.some((b) => b.id === initialBranchId)) return initialBranchId;
    const def = activeBranches.find((b) => b.is_default);
    return def?.id ?? activeBranches[0]?.id ?? null;
  }, [branchId, initialBranchId, activeBranches]);

  const selectedBranchName =
    activeBranches.find((b) => b.id === resolvedBranchId)?.name ?? payload?.branch_name ?? '';

  const flash = useCallback(
    (toast: Omit<FlashToast, 'durationMs'>) => {
      showFlash(stationToast(toast));
    },
    [showFlash]
  );

  const loadPass = useCallback(async () => {
    if (!token || !resolvedBranchId) return;
    const seq = ++loadSeq.current;
    setLoading(true);
    setError('');
    try {
      const data = await fetchBranchStationPass(token, resolvedBranchId);
      if (seq !== loadSeq.current) return;
      setPayload(data);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setPayload(null);
      setError(userFacingApiMessage(err, t('auth.connectionFailed'), t('checkIn.stationLoadFailed')));
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [resolvedBranchId, t, token]);

  useEffect(() => {
    if (!visible) {
      setConfirmRegen(false);
      setBranchPickerOpen(false);
      return;
    }
    setBranchId(initialBranchId);
  }, [visible, initialBranchId]);

  useEffect(() => {
    if (!visible || !token || !resolvedBranchId) return;
    void loadPass();
  }, [visible, token, resolvedBranchId, loadPass]);

  const onDownload = async () => {
    if (!payload?.qr_data_url || downloading) return;
    setDownloading(true);
    const branch = payload.branch_name || '';
    const gym = payload.gym_name || '';
    let qrUri = '';
    try {
      qrUri = cacheQrDataUrl(payload.qr_data_url, 'gym-station-qr');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
        <style>
          @page{margin:12mm}
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;margin:0;padding:24px}
          .card{width:140mm;max-width:100%;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;text-align:center;padding-bottom:20px}
          .bar{height:22px;background:#0f766e}
          .inner{padding:22px 20px 0}
          .gym{font-size:18px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;margin:0 0 4px}
          .branch{font-size:13px;color:#475569;margin:0 0 10px}
          .title{font-size:16px;font-weight:700;color:#0f172a;margin:0 0 16px}
          .qr-wrap{margin:0 auto;width:220px;height:220px;padding:8px;background:#fff}
          .qr{width:100%;height:100%;display:block}
          .steps{text-align:left;margin:18px auto 0;max-width:280px;padding:0 8px}
          .step{font-size:12px;color:#0f172a;margin:0 0 8px;line-height:1.45}
        </style></head><body>
        <div class="card">
          <div class="bar"></div>
          <div class="inner">
            ${gym ? `<div class="gym">${escapeHtml(gym)}</div>` : ''}
            ${branch ? `<div class="branch">${escapeHtml(branch)}</div>` : ''}
            <div class="title">${escapeHtml(t('checkIn.stationPosterTitle'))}</div>
            <div class="qr-wrap"><img class="qr" src="${qrUri}" /></div>
            <div class="steps">
              <p class="step">${escapeHtml(t('checkIn.stationStep1'))}</p>
              <p class="step">${escapeHtml(t('checkIn.stationStep2'))}</p>
              <p class="step">${escapeHtml(t('checkIn.stationStep3'))}</p>
            </div>
          </div>
        </div></body></html>`;
      await downloadHtmlAsPdf(html, gymQrPosterFilename(gym, branch), {
        onPdfReady: () => setDownloading(false),
      });
      flash({
        title: t('checkIn.stationPosterDownloadedTitle'),
        subtitle: t('checkIn.stationPosterDownloadedSub', { branch: branch || gym }),
        variant: 'success',
      });
    } catch (err) {
      flash({
        title: userFacingApiMessage(err, t('auth.connectionFailed'), t('checkIn.stationDownloadFailed')),
        variant: 'danger',
      });
    } finally {
      setDownloading(false);
    }
  };

  const onShareLink = async () => {
    if (!payload?.check_in_url) return;
    try {
      await Share.share({ message: payload.check_in_url });
      flash({ title: t('checkIn.stationLinkCopied'), variant: 'success' });
    } catch {
      /* dismissed */
    }
  };

  const onRegenerate = async () => {
    if (!token || !resolvedBranchId || regenerating) return;
    setRegenerating(true);
    setError('');
    try {
      const data = await regenerateBranchStationPass(token, resolvedBranchId);
      setPayload(data);
      setConfirmRegen(false);
      flash({
        title: t('checkIn.stationRegeneratedTitle'),
        subtitle: t('checkIn.stationRegeneratedSub', { branch: data.branch_name || '' }),
        variant: 'success',
      });
    } catch (err) {
      setError(userFacingApiMessage(err, t('auth.connectionFailed'), t('checkIn.stationRegenFailed')));
    } finally {
      setRegenerating(false);
    }
  };

  const styles = useThemedStyles((colors) => ({
    body: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 8 },
    warn: {
      marginBottom: 12,
      padding: 12,
      borderRadius: radiusLg,
      borderWidth: 1,
      borderColor: 'rgba(245,158,11,0.35)',
      backgroundColor: 'rgba(245,158,11,0.12)',
    },
    warnText: { fontSize: 13, color: colors.text, lineHeight: 18 },
    branchLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase' as const,
      color: colors.muted,
      marginBottom: 8,
    },
    card: {
      overflow: 'hidden' as const,
      paddingVertical: 0,
      paddingHorizontal: 0,
      marginTop: 4,
    },
    brandBar: { height: 6, backgroundColor: colors.accent },
    cardBody: { paddingHorizontal: 16, paddingVertical: 18, alignItems: 'center' as const },
    gym: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.4,
      textTransform: 'uppercase' as const,
      color: colors.accentText,
      textAlign: 'center' as const,
      marginBottom: 6,
    },
    branchName: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.muted,
      textAlign: 'center' as const,
      marginBottom: 10,
    },
    posterTitle: {
      fontSize: 17,
      fontWeight: '600' as const,
      color: colors.text,
      letterSpacing: -0.2,
      textAlign: 'center' as const,
    },
    qr: {
      width: 200,
      height: 200,
      borderRadius: radiusLg,
      backgroundColor: '#fff',
      marginTop: 14,
    },
    steps: { marginTop: 16, width: '100%' as const, gap: 8 },
    stepRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10 },
    stepBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.accentSoft,
    },
    stepBadgeText: { fontSize: 12, fontWeight: '700', color: colors.accentText },
    stepText: { flex: 1, fontSize: 14, color: colors.muted, lineHeight: 20, paddingTop: 2 },
    actions: { flexDirection: 'row' as const, gap: 8, marginTop: 12, alignItems: 'stretch' as const },
    actionCol: { flex: 1, minWidth: 0 },
    regenLink: {
      alignSelf: 'center' as const,
      paddingVertical: 10,
      paddingHorizontal: 8,
      marginTop: 4,
    },
    regenText: { fontSize: 13, fontWeight: '600' as const, color: colors.accentText },
    error: { marginTop: 12, fontSize: 14, color: colors.error, textAlign: 'center' as const },
  }));

  const showBranchPicker = activeBranches.length > 1;
  const actionsLocked = loading || regenerating;
  const canDownload = Boolean(payload?.qr_data_url) && !actionsLocked && !downloading;
  const canShare = Boolean(payload?.check_in_url) && !actionsLocked && !downloading;

  return (
    <>
      <BottomSheet
        visible={visible}
        title={t('checkIn.stationAction')}
        onClose={onClose}
        showCloseButton
      >
        <Text style={styles.body}>{t('checkIn.stationBody')}</Text>

        {!selfCheckInEnabled ? (
          <View style={styles.warn}>
            <Text style={styles.warnText}>{t('checkIn.stationDisabledHint')}</Text>
          </View>
        ) : null}

        {showBranchPicker ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.branchLabel}>{t('checkIn.stationBranch')}</Text>
            <PickerTrigger open={branchPickerOpen} onPress={() => setBranchPickerOpen(true)}>
              <Text style={{ color: c.text, fontSize: 16, flex: 1 }} numberOfLines={1}>
                {selectedBranchName || t('checkIn.stationBranch')}
              </Text>
            </PickerTrigger>
          </View>
        ) : null}

        <SoftSurface variant="quiet" style={styles.card}>
          <View style={styles.brandBar} />
          <View style={styles.cardBody}>
            {loading ? (
              <ActivityIndicator color={c.accent} size="large" style={{ marginVertical: 48 }} />
            ) : (
              <>
                {payload?.gym_name ? (
                  <Text style={styles.gym} numberOfLines={2}>
                    {payload.gym_name}
                  </Text>
                ) : null}
                {payload?.branch_name ? (
                  <Text style={styles.branchName} numberOfLines={1}>
                    {payload.branch_name}
                  </Text>
                ) : null}
                <Text display style={styles.posterTitle}>
                  {t('checkIn.stationPosterTitle')}
                </Text>
                {payload?.qr_data_url ? (
                  <Image
                    source={{ uri: payload.qr_data_url }}
                    style={styles.qr}
                    accessibilityLabel={t('checkIn.stationQrAlt')}
                  />
                ) : (
                  <View
                    style={[styles.qr, { alignItems: 'center', justifyContent: 'center', backgroundColor: c.border }]}
                  >
                    <Text style={{ color: c.muted }}>—</Text>
                  </View>
                )}
                <View style={styles.steps}>
                  {[t('checkIn.stationStep1'), t('checkIn.stationStep2'), t('checkIn.stationStep3')].map(
                    (step, index) => (
                      <View key={step} style={styles.stepRow}>
                        <View style={styles.stepBadge}>
                          <Text style={styles.stepBadgeText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    )
                  )}
                </View>
              </>
            )}
          </View>
        </SoftSurface>

        {error ? (
          <View>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => void loadPass()} style={{ marginTop: 10 }}>
              <Text style={{ color: c.accentText, textAlign: 'center', fontWeight: '600' }}>
                {t('common.retry')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.actions}>
          <View style={styles.actionCol}>
            <QrSheetActionButton
              label={
                downloading ? t('common.processing') : t('checkIn.stationDownloadPoster')
              }
              onPress={() => void onDownload()}
              disabled={!canDownload && !downloading}
              loading={downloading}
            />
          </View>
          <View style={styles.actionCol}>
            <QrSheetActionButton
              label={t('checkIn.stationShareLink')}
              onPress={() => void onShareLink()}
              disabled={!canShare}
            />
          </View>
        </View>

        {canRegenerate ? (
          <Pressable
            style={styles.regenLink}
            disabled={actionsLocked || downloading || !resolvedBranchId}
            onPress={() => setConfirmRegen(true)}
          >
            <Text style={styles.regenText}>
              {regenerating ? t('common.processing') : t('checkIn.stationRegenerate')}
            </Text>
          </Pressable>
        ) : null}
      </BottomSheet>

      {showBranchPicker ? (
        <BottomSheet
          visible={branchPickerOpen}
          title={t('checkIn.stationBranch')}
          onClose={() => setBranchPickerOpen(false)}
        >
          {activeBranches.map((b) => (
            <SheetOption
              key={b.id}
              label={b.name}
              selected={resolvedBranchId === b.id}
              onPress={() => {
                setBranchId(b.id);
                setBranchPickerOpen(false);
              }}
            />
          ))}
        </BottomSheet>
      ) : null}

      <ConfirmDialog
        visible={confirmRegen}
        title={t('checkIn.stationRegenTitle')}
        message={t('checkIn.stationRegenMessage')}
        confirmLabel={t('checkIn.stationRegenerate')}
        destructive
        confirmLoading={regenerating}
        onCancel={() => setConfirmRegen(false)}
        onConfirm={() => void onRegenerate()}
      />
    </>
  );
}
