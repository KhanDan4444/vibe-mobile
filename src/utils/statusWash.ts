/** Soft rgba wash from a #RRGGBB status accent. */
export function statusWash(hex: string, alpha = 0.12): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Opaque tint — blend accent into a solid surface color.
 * Prefer this for elevated Android cards (rgba + elevation draws a muddy halo).
 */
export function statusWashOpaque(accent: string, surface: string, amount = 0.12): string {
  if (!accent.startsWith('#') || accent.length !== 7) return accent;
  if (!surface.startsWith('#') || surface.length !== 7) return statusWash(accent, amount);
  const mix = (a: number, b: number) => Math.round(a * amount + b * (1 - amount));
  const ar = Number.parseInt(accent.slice(1, 3), 16);
  const ag = Number.parseInt(accent.slice(3, 5), 16);
  const ab = Number.parseInt(accent.slice(5, 7), 16);
  const sr = Number.parseInt(surface.slice(1, 3), 16);
  const sg = Number.parseInt(surface.slice(3, 5), 16);
  const sb = Number.parseInt(surface.slice(5, 7), 16);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(ar, sr))}${toHex(mix(ag, sg))}${toHex(mix(ab, sb))}`;
}
