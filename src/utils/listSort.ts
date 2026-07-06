export const MEMBER_SORT_OPTIONS = [
  { id: 'name_asc', label: 'Name A–Z' },
  { id: 'name_desc', label: 'Name Z–A' },
  { id: 'expiry_asc', label: 'Expiry soonest' },
  { id: 'expiry_desc', label: 'Expiry latest' },
] as const;

export const REVENUE_SORT_OPTIONS = [
  { id: 'date_desc', label: 'Newest first' },
  { id: 'date_asc', label: 'Oldest first' },
  { id: 'name_asc', label: 'Member A–Z' },
  { id: 'name_desc', label: 'Member Z–A' },
] as const;

export type MemberSortId = (typeof MEMBER_SORT_OPTIONS)[number]['id'];
export type RevenueSortId = (typeof REVENUE_SORT_OPTIONS)[number]['id'];

export const DEFAULT_MEMBER_SORT: MemberSortId = 'name_asc';
export const DEFAULT_REVENUE_SORT: RevenueSortId = 'date_desc';
