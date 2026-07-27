import type { FlashVariant } from '@/src/components/FlashBanner';

/** Light native feedback when a toast appears — fails silently if unavailable. */
export function flashHaptic(variant: FlashVariant = 'success') {
  void (async () => {
    try {
      const Haptics = await import('expo-haptics');
      if (variant === 'danger') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      if (variant === 'offline') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* haptics optional */
    }
  })();
}
