export const MEMBER_SORT_OPTIONS = [
  { id: 'name_asc', labelKey: 'common.sortNameAsc' },
  { id: 'name_desc', labelKey: 'common.sortNameDesc' },
  { id: 'expiry_asc', labelKey: 'common.sortExpiryAsc' },
  { id: 'expiry_desc', labelKey: 'common.sortExpiryDesc' },
] as const;

export const REVENUE_SORT_OPTIONS = [
  { id: 'date_desc', labelKey: 'common.sortNewest' },
  { id: 'date_asc', labelKey: 'common.sortOldest' },
  { id: 'name_asc', labelKey: 'revenue.sortMemberAsc' },
  { id: 'name_desc', labelKey: 'revenue.sortMemberDesc' },
] as const;

export type MemberSortId = (typeof MEMBER_SORT_OPTIONS)[number]['id'];
export type RevenueSortId = (typeof REVENUE_SORT_OPTIONS)[number]['id'];

export const DEFAULT_MEMBER_SORT: MemberSortId = 'name_asc';
export const DEFAULT_REVENUE_SORT: RevenueSortId = 'date_desc';
