import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { FlashToast } from '@/src/components/FlashBanner';
import { useFlash } from '@/src/context/FlashContext';

const FLASH_ICONS: Record<string, FlashToast['icon']> = {
  'flash.saved': 'checkmark-circle-outline',
  'flash.enrolled': 'person-add-outline',
  'flash.renewed': 'refresh-circle-outline',
  'flash.paymentRecorded': 'cash-outline',
  'flash.planChanged': 'swap-horizontal-outline',
  'flash.transferred': 'git-branch-outline',
  'flash.memberUpdated': 'create-outline',
  'flash.offline': 'cloud-offline-outline',
  'flash.memberDeleted': 'person-remove-outline',
  'flash.paymentDeleted': 'trash-outline',
  'flash.planDeleted': 'trash-outline',
};

export function useSaveFlash() {
  const { showFlash } = useFlash();
  const { t } = useTranslation();

  return useCallback(
    (messageKey = 'flash.saved') => {
      showFlash({
        title: t(`${messageKey}.title`),
        subtitle: t(`${messageKey}.subtitle`),
        icon: FLASH_ICONS[messageKey] ?? 'checkmark-circle-outline',
        variant: 'success',
      });
    },
    [showFlash, t]
  );
}

/** Red toast for destructive actions (delete member / payment / plan). */
export function useDeleteFlash() {
  const { showFlash } = useFlash();
  const { t } = useTranslation();

  return useCallback(
    (messageKey = 'flash.memberDeleted') => {
      showFlash({
        title: t(`${messageKey}.title`),
        subtitle: t(`${messageKey}.subtitle`),
        icon: FLASH_ICONS[messageKey] ?? 'trash-outline',
        variant: 'danger',
      });
    },
    [showFlash, t]
  );
}

export function useOfflineFlash() {
  const { showFlash } = useFlash();
  const { t } = useTranslation();

  return useCallback(() => {
    showFlash({
      title: t('flash.offline.title'),
      subtitle: t('flash.offline.subtitle'),
      icon: FLASH_ICONS['flash.offline'],
      variant: 'offline',
    });
  }, [showFlash, t]);
}
