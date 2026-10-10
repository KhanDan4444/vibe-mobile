/**
 * Mobile Sentry — no-op when EXPO_PUBLIC_SENTRY_DSN is unset (local/dev).
 */

import * as Sentry from '@sentry/react-native';

const dsn = String(process.env.EXPO_PUBLIC_SENTRY_DSN || '').trim();

export const sentryEnabled = Boolean(dsn);

if (sentryEnabled) {
  const tracesSampleRate = Number(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0);
  Sentry.init({
    dsn,
    environment:
      process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ||
      (__DEV__ ? 'development' : 'production'),
    release: process.env.EXPO_PUBLIC_SENTRY_RELEASE || undefined,
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });
}

export { Sentry };
