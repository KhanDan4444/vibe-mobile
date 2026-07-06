/**
 * Expo dev tools call useKeepAwake on boot; on some Android devices the activity
 * isn't ready yet and activateKeepAwakeAsync rejects with "Unable to activate keep awake".
 * Swallow that race in development only.
 */
if (__DEV__) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const keepAwake = require('expo-keep-awake') as typeof import('expo-keep-awake');
    const activate = keepAwake.activateKeepAwakeAsync.bind(keepAwake);
    keepAwake.activateKeepAwakeAsync = async (tag?: string) => {
      try {
        await activate(tag);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes('Unable to activate keep awake')) throw e;
      }
    };
  } catch {
    // expo-keep-awake not installed — nothing to patch
  }
}
