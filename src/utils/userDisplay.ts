export function initialsFrom(name?: string | null, email?: string | null, username?: string | null) {
  const source = (name || email || username || 'U').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.charAt(0).toUpperCase();
}

export function roleSubtitle(role?: string | null) {
  if (role === 'Gym Owner' || role === 'owner') return 'Gym owner';
  if (role === 'Help Desk' || role === 'Gym Staff') return 'Staff';
  return 'Account';
}
