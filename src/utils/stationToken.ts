/** Extract station JWT from a check-in URL or raw token string. */
export function parseStationToken(input: string | null | undefined): string | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  try {
    if (trimmed.includes('://') || trimmed.startsWith('http')) {
      const url = new URL(trimmed);
      const station = url.searchParams.get('station')?.trim();
      if (station && station.length >= 20) return station;
    }
    if (trimmed.includes('station=')) {
      const query = trimmed.includes('?') ? trimmed.split('?').slice(1).join('?') : trimmed;
      const station = new URLSearchParams(query).get('station')?.trim();
      if (station && station.length >= 20) return station;
    }
  } catch {
    /* fall through */
  }

  return trimmed.length >= 20 ? trimmed : null;
}
