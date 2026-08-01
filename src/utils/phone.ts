export function normalizeEthiopianPhone(input: string | null | undefined): string | null {
  if (input == null || input === '') return null;

  let digits = String(input).replace(/\D/g, '');
  if (digits.startsWith('251')) {
    // already country code
  } else if (digits.startsWith('0')) {
    digits = `251${digits.slice(1)}`;
  } else if (digits.length === 9) {
    digits = `251${digits}`;
  } else {
    return null;
  }

  if (digits.length !== 12) return null;
  return `+${digits}`;
}

export function isValidEthiopianPhone(input: string): boolean {
  return normalizeEthiopianPhone(input) != null;
}

/** Required Ethiopian mobile for member forms. */
export function validateRequiredEthiopianPhone(
  input: string | null | undefined
): { ok: true } | { ok: false; key: 'validation.phoneRequired' | 'validation.phoneInvalid' } {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) return { ok: false, key: 'validation.phoneRequired' };
  if (!isValidEthiopianPhone(trimmed)) return { ok: false, key: 'validation.phoneInvalid' };
  return { ok: true };
}
