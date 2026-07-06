/** Decode JWT payload for session restore (UX only — backend validates every request). */
export function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function userFromToken(token: string) {
  const payload = decodeToken(token);
  if (!payload || typeof payload.id !== 'number') return null;
  return {
    id: payload.id as number,
    name: (payload.name as string) ?? null,
    email: (payload.email as string) ?? '',
    username: (payload.username as string) ?? null,
    role: (payload.role as string) ?? '',
    gym_id: (payload.gym_id as number) ?? null,
    branch_id: (payload.branch_id as number) ?? null,
    branch_name: null,
  };
}

/** @returns true if token exp claim is in the past */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  const exp = payload?.exp;
  if (typeof exp !== 'number') return false;
  return Date.now() >= exp * 1000;
}
