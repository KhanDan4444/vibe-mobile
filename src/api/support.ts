import { API_BASE_URL } from '@/src/config/api';
import { fetchWithTimeout } from '@/src/api/fetchWithTimeout';

export type SupportContact = {
  phone: string | null;
  phone_display: string | null;
  telegram: string | null;
  telegram_url: string | null;
  configured: boolean;
};

const empty: SupportContact = {
  phone: null,
  phone_display: null,
  telegram: null,
  telegram_url: null,
  configured: false,
};

let cached: Promise<SupportContact> | null = null;

export function fetchSupportContact() {
  if (!cached) {
    cached = (async () => {
      try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/public/support`, {
          method: 'GET',
        });
        if (!res.ok) return empty;
        const data = (await res.json()) as Partial<SupportContact>;
        return {
          phone: data.phone || null,
          phone_display: data.phone_display || data.phone || null,
          telegram: data.telegram || null,
          telegram_url: data.telegram_url || null,
          configured: Boolean(data.configured),
        };
      } catch {
        return empty;
      }
    })();
  }
  return cached;
}
