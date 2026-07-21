import { API_BASE_URL } from '@/src/config/api';

const memoryCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

function cacheKey(memberId: number, cacheBust = 0) {
  return `${memberId}:${cacheBust || 0}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return globalThis.btoa(binary);
}

export function invalidateMemberPhotoMemory(memberId: number) {
  for (const key of [...memoryCache.keys()]) {
    if (key.startsWith(`${memberId}:`)) memoryCache.delete(key);
  }
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(`${memberId}:`)) inflight.delete(key);
  }
}

/** Load a member photo through the authenticated API (RN Image headers are unreliable). */
export async function fetchMemberPhotoDataUri(
  memberId: number,
  token: string,
  cacheBust = 0
): Promise<string | null> {
  const key = cacheKey(memberId, cacheBust);
  if (memoryCache.has(key)) return memoryCache.get(key) ?? null;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const query = cacheBust ? `?v=${encodeURIComponent(String(cacheBust))}` : '';
      const res = await fetch(`${API_BASE_URL}/api/members/${memberId}/photo${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        memoryCache.set(key, null);
        return null;
      }
      const contentType = res.headers.get('Content-Type') || 'image/jpeg';
      const buffer = await res.arrayBuffer();
      if (!buffer.byteLength) {
        memoryCache.set(key, null);
        return null;
      }
      const dataUri = `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
      memoryCache.set(key, dataUri);
      return dataUri;
    } catch {
      memoryCache.set(key, null);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}
