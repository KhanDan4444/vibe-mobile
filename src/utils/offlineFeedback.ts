import { isOfflineQueued } from '@/src/offline/types';

export function onMutationResult<T>(result: T, onOnline: () => void, onOffline?: () => void) {
  if (isOfflineQueued(result)) {
    onOffline?.();
    return;
  }
  onOnline();
}
