/** Soft rgba wash from a #RRGGBB status accent. */
export function statusWash(hex: string, alpha = 0.12): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
