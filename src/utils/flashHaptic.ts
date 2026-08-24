import * as Haptics from 'expo-haptics';
import type { FlashVariant } from '@/src/components/FlashBanner';

/** Light selection tick for advancing / stepping back in multi-step flows. */
export function selectionHaptic() {
  void Haptics.selectionAsync().catch(() => {
    /* haptics optional */
  });
}

/** Native feedback when a toast appears — sync import so cold path isn’t delayed. */
export function flashHaptic(variant: FlashVariant = 'success') {
  void (async () => {
    try {
      if (variant === 'danger') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      if (variant === 'offline') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
      if (variant === 'warning') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* haptics optional */
    }
  })();
}
