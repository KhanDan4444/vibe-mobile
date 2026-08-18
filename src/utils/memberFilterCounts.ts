import type { MemberRow } from '@/src/types/api';

export type MemberFilterCounts = {
  all: number;
  active: number;
  unpaid: number;
  dueSoon: number;
  expired: number;
  former: number;
};

/** Exclusive live filter chip (matches Members filter chips). */
export function liveMemberFilterKey(member: MemberRow): keyof Omit<MemberFilterCounts, 'all' | 'former'> | null {
  const status = String(member.status || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ');
  const unpaid = Boolean(member.is_unpaid);
  if (status === 'expired') return 'expired';
  if (status === 'due soon') return 'dueSoon';
  if (unpaid) return 'unpaid';
  if (status === 'active') return 'active';
  return null;
}

/** Instant chip counts while restore (or delete) is pending. */
export function adjustMemberFilterCounts(
  base: MemberFilterCounts,
  { pendingDeletes = [], pendingRestores = [] }: { pendingDeletes?: MemberRow[]; pendingRestores?: MemberRow[] } = {},
): MemberFilterCounts {
  const next: MemberFilterCounts = {
    all: base.all ?? 0,
    active: base.active ?? 0,
    unpaid: base.unpaid ?? 0,
    dueSoon: base.dueSoon ?? 0,
    expired: base.expired ?? 0,
    former: base.former ?? 0,
  };

  const bumpLive = (member: MemberRow, dir: number) => {
    next.all += dir;
    const key = liveMemberFilterKey(member);
    if (key) next[key] += dir;
  };

  for (const member of pendingDeletes) {
    bumpLive(member, -1);
    next.former += 1;
  }
  for (const member of pendingRestores) {
    bumpLive(member, 1);
    next.former -= 1;
  }

  (Object.keys(next) as (keyof MemberFilterCounts)[]).forEach((key) => {
    next[key] = Math.max(0, next[key]);
  });
  return next;
}
