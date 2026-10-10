import { useEffect, useState } from 'react';
import { fetchSupportContact, type SupportContact } from '@/src/api/support';

const empty: SupportContact = {
  phone: null,
  phone_display: null,
  telegram: null,
  telegram_url: null,
  configured: false,
};

export function useSupportContact() {
  const [contact, setContact] = useState<SupportContact>(empty);

  useEffect(() => {
    let cancelled = false;
    void fetchSupportContact().then((data) => {
      if (!cancelled) setContact(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return contact;
}
