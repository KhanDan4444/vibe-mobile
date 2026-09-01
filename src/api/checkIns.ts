import { apiRequest } from '@/src/api/client';

export type AttendanceSettings = {
  visits_per_week: number | null;
  week_starts_on: 'monday' | 'sunday';
  one_checkin_per_day: boolean;
  over_limit_policy: 'block' | 'warn_allow';
};

export type CheckInMember = {
  id: number;
  name: string;
  phone: string | null;
  photo_url: string | null;
  plan_name: string | null;
  branch_id: number | null;
  branch_name: string | null;
  status: string;
  end_date: string | null;
  is_unpaid: boolean;
  trainer_name: string | null;
  visits_this_week: number;
  visits_limit: number | null;
  week_start?: string;
  week_end?: string;
  week_starts_on?: 'monday' | 'sunday';
  one_checkin_per_day?: boolean;
  over_limit_policy?: 'block' | 'warn_allow';
  checked_in_today?: boolean;
};

export type CheckInRow = {
  id: number;
  gym_id: number;
  branch_id: number | null;
  member_id: number;
  checked_in_at: string;
  checked_in_by_user_id: number | null;
  method: string;
  notes: string | null;
  member_name: string | null;
  member_phone: string | null;
  member_photo_url: string | null;
  branch_name: string | null;
  checked_in_by_name: string | null;
};

export type CreateCheckInResult = {
  checkIn: CheckInRow;
  visits_this_week: number;
  visits_limit: number | null;
  week_start: string;
  week_end: string;
  member: {
    id: number;
    name: string;
    phone: string | null;
    photo_url: string | null;
    plan_name: string | null;
    trainer_name: string | null;
    branch_name: string | null;
  };
};

function withBranch(qs: URLSearchParams, branchId?: number | 'all') {
  if (branchId && branchId !== 'all') qs.set('branch_id', String(branchId));
}

export function fetchAttendanceSettings(token: string) {
  return apiRequest<{ settings: AttendanceSettings; canManage: boolean }>('/check-ins/settings', {
    token,
  });
}

export function updateAttendanceSettings(
  token: string,
  payload: Partial<Pick<AttendanceSettings, 'visits_per_week' | 'week_starts_on' | 'one_checkin_per_day' | 'over_limit_policy'>>
) {
  return apiRequest<{ settings: AttendanceSettings }>('/check-ins/settings', {
    token,
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function searchCheckInMembers(
  token: string,
  params: { q: string; limit?: number; branchId?: number | 'all' }
) {
  const qs = new URLSearchParams();
  qs.set('q', params.q);
  if (params.limit) qs.set('limit', String(params.limit));
  withBranch(qs, params.branchId);
  return apiRequest<{ members: CheckInMember[]; settings: AttendanceSettings }>(
    `/check-ins/search?${qs.toString()}`,
    { token }
  );
}

export function listCheckIns(
  token: string,
  params: {
    date?: string;
    from?: string;
    to?: string;
    memberId?: number;
    limit?: number;
    branchId?: number | 'all';
  } = {}
) {
  const qs = new URLSearchParams();
  if (params.date) qs.set('date', params.date);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.memberId) qs.set('member_id', String(params.memberId));
  if (params.limit) qs.set('limit', String(params.limit));
  withBranch(qs, params.branchId);
  const query = qs.toString();
  return apiRequest<{
    date?: string;
    from?: string;
    to?: string;
    total: number;
    checkIns: CheckInRow[];
  }>(`/check-ins${query ? `?${query}` : ''}`, { token });
}

export function createCheckIn(
  token: string,
  payload: {
    member_id?: number;
    member_pass_token?: string;
    force?: boolean;
    notes?: string;
  }
) {
  return apiRequest<CreateCheckInResult>('/check-ins', {
    token,
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type MemberVisitSummary = {
  visits_this_week: number;
  visits_limit: number | null;
  week_starts_on?: 'monday' | 'sunday';
  week_start?: string;
  week_end?: string;
};

export function fetchMemberVisitSummary(token: string, memberId: number) {
  return apiRequest<MemberVisitSummary>(`/check-ins/members/${memberId}/summary`, { token });
}
