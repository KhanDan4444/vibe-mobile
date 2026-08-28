import { useCallback, useEffect, useState } from 'react';

export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export function formatOtpCooldown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins > 0) return `${mins}:${String(secs).padStart(2, '0')}`;
  return `${secs}s`;
}

export function useOtpResendCooldown(durationSeconds = OTP_RESEND_COOLDOWN_SECONDS) {
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = useCallback(() => {
    setCooldown(Math.max(0, Math.floor(durationSeconds)));
  }, [durationSeconds]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  return { cooldown, startCooldown, canResend: cooldown <= 0 };
}
