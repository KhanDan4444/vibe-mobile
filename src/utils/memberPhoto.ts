import { API_BASE_URL } from '@/src/config/api';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return globalThis.btoa(binary);
}

/** Load a member photo through the authenticated API (RN Image headers are unreliable). */
export async function fetchMemberPhotoDataUri(
  memberId: number,
  token: string
): Promise<string | null> {
  const res = await fetch(`${API_BASE_URL}/api/members/${memberId}/photo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const contentType = res.headers.get('Content-Type') || 'image/jpeg';
  const buffer = await res.arrayBuffer();
  if (!buffer.byteLength) return null;
  return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
}
