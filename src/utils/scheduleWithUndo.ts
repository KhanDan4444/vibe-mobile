import type { FlashToast } from '@/src/components/FlashBanner';
import { FLASH_COMMITTED_MS } from '@/src/components/FlashBanner';

/** Window to undo a destructive action before it commits. */
export const UNDO_DELAY_MS = 5500;

type TFunction = (key: string, opts?: Record<string, unknown>) => string;

type ScheduleDeleteOptions = {
  showFlash: (toast: FlashToast | string) => void;
  t: TFunction;
  pendingKey: string;
  cancelledKey: string;
  committedKey: string;
  subtitleParams?: Record<string, unknown>;
  onUndo: () => void;
  onCommit: () => void | Promise<void>;
};

export function scheduleDeleteWithUndo({
  showFlash,
  t,
  pendingKey,
  cancelledKey,
  committedKey,
  subtitleParams,
  onUndo,
  onCommit,
}: ScheduleDeleteOptions) {
  let settled = false;
  const timer = setTimeout(async () => {
    if (settled) return;
    settled = true;
    try {
      await onCommit();
      showFlash({
        title: t(`${committedKey}.title`),
        subtitle: t(`${committedKey}.subtitle`, subtitleParams),
        variant: 'danger',
        durationMs: 1000,
      });
    } catch (err) {
      onUndo();
      showFlash({
        title: err instanceof Error ? err.message : t('common.error'),
        variant: 'danger',
      });
    }
  }, UNDO_DELAY_MS);

  showFlash({
    title: t(`${pendingKey}.title`),
    subtitle: t(`${pendingKey}.subtitle`, subtitleParams),
    variant: 'danger',
    durationMs: UNDO_DELAY_MS,
    urgent: true,
    actionHint: t('flash.undoHint'),
    action: {
      label: t('common.undo'),
      onPress: () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        onUndo();
        showFlash({
          title: t(`${cancelledKey}.title`),
          subtitle: t(`${cancelledKey}.subtitle`, subtitleParams),
          variant: 'success',
        });
      },
    },
  });

  return () => {
    settled = true;
    clearTimeout(timer);
  };
}

type RestoreWithUndoOptions = {
  showFlash: (toast: FlashToast | string) => void;
  t: TFunction;
  name: string;
  restore: () => Promise<unknown>;
  rearchive: () => Promise<unknown>;
  onRestored?: () => void;
  onRearchived?: () => void;
  onFailed?: (err: unknown) => void;
};

/** Show the restored toast immediately; run the API in the background. */
export function restoreWithUndoFlash({
  showFlash,
  t,
  name,
  restore,
  rearchive,
  onRestored,
  onRearchived,
  onFailed,
}: RestoreWithUndoOptions) {
  let cancelled = false;
  let restoreFinished = false;
  let restoreFailed = false;
  const subtitleParams = { name };

  const confirmTimer = setTimeout(() => {
    if (cancelled || restoreFailed) return;
    showFlash({
      title: t('flash.memberRestored.title'),
      subtitle: t('flash.memberRestored.subtitle', subtitleParams),
      variant: 'success',
      durationMs: FLASH_COMMITTED_MS,
    });
  }, UNDO_DELAY_MS);

  showFlash({
    title: t('flash.memberRestorePending.title'),
    subtitle: t('flash.memberRestorePending.subtitle', subtitleParams),
    durationMs: UNDO_DELAY_MS,
    urgent: true,
    actionHint: t('flash.undoHint'),
    action: {
      label: t('common.undo'),
      onPress: () => {
        cancelled = true;
        clearTimeout(confirmTimer);
        void (async () => {
          try {
            if (restoreFinished) await rearchive();
            onRearchived?.();
            showFlash({
              title: t('flash.memberRestoreUndone.title'),
              subtitle: t('flash.memberRestoreUndone.subtitle', subtitleParams),
              durationMs: FLASH_COMMITTED_MS,
            });
          } catch (err) {
            showFlash({
              title: err instanceof Error ? err.message : t('member.restoreFailed'),
              variant: 'danger',
            });
          }
        })();
      },
    },
  });

  requestAnimationFrame(() => {
    onRestored?.();
  });

  void (async () => {
    try {
      await restore();
      restoreFinished = true;
      if (cancelled) await rearchive();
    } catch (err) {
      if (cancelled) return;
      restoreFailed = true;
      clearTimeout(confirmTimer);
      onFailed?.(err);
      showFlash({
        title: err instanceof Error ? err.message : t('member.restoreFailed'),
        variant: 'danger',
      });
    }
  })();

  return () => {
    cancelled = true;
    clearTimeout(confirmTimer);
  };
}
