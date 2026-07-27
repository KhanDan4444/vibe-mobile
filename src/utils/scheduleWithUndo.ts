import type { FlashToast } from '@/src/components/FlashBanner';

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
