/**
 * Public web app origin (privacy policy, etc.).
 * Override with EXPO_PUBLIC_WEB_URL for staging/custom domains.
 */
export const WEB_APP_ORIGIN = (
  process.env.EXPO_PUBLIC_WEB_URL || 'https://niku-saas.vercel.app'
).replace(/\/$/, '');

export const PRIVACY_POLICY_URL = `${WEB_APP_ORIGIN}/privacy`;
