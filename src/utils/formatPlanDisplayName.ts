/**
 * Humanize gym plan names for UI.
 * "Yearly(Gym)" / "Monthly (Gym)" / "Yearly - Gym" → "Yearly · Gym"
 */
export function formatPlanDisplayName(name: string | null | undefined): string {
  if (name == null) return '';
  const raw = String(name).trim();
  if (!raw) return '';

  const paren = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    const head = paren[1].trim();
    const tag = paren[2].trim();
    if (head && tag) return `${head} · ${tag}`;
  }

  const dash = raw.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dash) {
    const head = dash[1].trim();
    const tag = dash[2].trim();
    if (head && tag && tag.length <= 24 && !/\s{2,}/.test(tag)) {
      return `${head} · ${tag}`;
    }
  }

  return raw;
}
