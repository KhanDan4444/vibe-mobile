export type UserRole = 'Platform Admin' | 'Gym Owner' | 'Front Desk' | 'Help Desk' | string;

export interface AuthUser {
  id: number;
  name: string | null;
  email: string;
  username: string | null;
  role: UserRole;
  gym_id: number | null;
  branch_id: number | null;
  branch_name: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  subscription?: GymSubscription | null;
}

export interface GymSubscription {
  gymName?: string;
  status?: string;
  readOnly?: boolean;
  locked?: boolean;
  accessDenied?: boolean;
  isTrial?: boolean;
  trialDaysLeft?: number | null;
  trialEndDate?: string | null;
}

export interface PublicSaasPlan {
  id: number;
  name: string;
  duration: number;
  price: number;
  description?: string | null;
}

export interface GymSignupCompletePayload {
  sessionId: string;
  code: string;
  gym_name: string;
  owner_name: string;
  username: string;
  password: string;
  phone: string;
  city: string;
  address?: string;
  email?: string;
}

export interface GymSignupCompleteResponse {
  message?: string;
  subscription?: {
    plan_name?: string;
    start_date?: string;
    end_date?: string;
    is_trial?: boolean;
    trial_days?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  archivedTotal?: number;
}

export interface MemberRow {
  id: number;
  name: string;
  phone: string | null;
  plan_id: number | null;
  plan_name: string | null;
  start_date: string;
  end_date: string;
  status: string;
  is_unpaid: boolean;
  branch_id?: number | null;
  branch_name: string | null;
  photo_url?: string | null;
  deleted_at?: string | null;
  trainer_id?: number | null;
  trainer_name?: string | null;
  /** Calendar days since last check-in (or term start if never checked in). */
  days_without_visit?: number | null;
}

export interface BranchRow {
  id: number;
  name: string;
  phone?: string | null;
  address?: string | null;
  is_default?: boolean;
  is_active?: boolean;
  member_count?: number;
  staff_count?: number;
}

export interface StaffRow {
  id: number;
  name: string;
  email: string | null;
  username: string | null;
  staff_role: string;
  branch_id: number;
  branch_name: string | null;
  is_active: boolean;
}

export interface TeamResponse {
  staff: StaffRow[];
  staff_roles: string[];
  canManage: boolean;
}

export interface TrainerRow {
  id: number;
  name: string;
  phone: string | null;
  specialty: string | null;
  branch_id: number;
  branch_name: string | null;
  certification_url?: string | null;
  has_certification?: boolean;
  deleted_at?: string | null;
  member_count?: number;
}

export interface TrainersResponse {
  trainers: TrainerRow[];
  archivedTotal: number;
  canManage: boolean;
}

export interface MemberSmsRow {
  id: number;
  recipient_phone: string;
  message_type: string;
  member_id: number;
  message_id: string | null;
  sent_at: string;
  member_name: string;
  member_phone: string | null;
  member_photo_url?: string | null;
  branch_id: number | null;
  branch_name: string | null;
}

export interface GymProfile {
  id: number;
  name: string;
  owner_name: string;
  phone: string | null;
}

export interface ProfileUser {
  id: number;
  name: string;
  email: string | null;
  username: string | null;
}

export interface GymProfileResponse {
  gym: GymProfile;
  user: ProfileUser;
}

export interface UpdateProfilePayload {
  name?: string;
  gym_name?: string;
  phone?: string;
  email?: string;
  username?: string;
}

export interface DashboardNotification {
  id: string;
  kind?: string;
  memberId?: number;
  memberName?: string;
  planName?: string;
  endDate?: string;
  amount?: number;
  branchName?: string;
  type: string;
  title: string;
  message: string;
  date?: string;
  suggestedAction?: string;
}

export interface DashboardAlertMember {
  id: number;
  name: string;
  plan_id?: number | null;
  plan_name?: string | null;
  end_date: string;
  status: string;
  photo_url?: string | null;
}

export interface DashboardChartPoint {
  date: string;
  amount: number;
}

export interface BranchComparisonRow {
  branchId: number;
  branchName: string;
  isActive?: boolean;
  isDefault?: boolean;
  totalMembers: number;
  activeMembers: number;
  dueSoonMembers?: number;
  expiredMembers?: number;
  unpaidCount?: number;
  monthlyIncome: number;
  revenueTrendPercent?: number | string | null;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  dueSoonMembers: number;
  unpaidCount: number;
  monthlyIncome: number;
  previousMonthIncome?: number;
  revenueTrendPercent?: number | string | null;
  newMembersThisMonth?: number;
  newMembersTrendPercent?: number | string | null;
  inactiveMembersThisWeek?: number;
  notifications?: DashboardNotification[];
  alertMembers?: DashboardAlertMember[];
  revenueChart?: DashboardChartPoint[];
  readOnly?: boolean;
  checkedInToday?: number;
  isTrial?: boolean;
  trialDaysLeft?: number | null;
  trialEndDate?: string | null;
}

export interface PlanRow {
  id: number;
  name: string;
  duration: number;
  price: string | number;
  active_member_count?: number;
}

export interface ActivityLogRow {
  id: number;
  branch_id: number | null;
  branch_name: string | null;
  actor_id: number;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: number;
  entity_label: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface PaymentRow {
  id: number;
  member_id: number;
  amount: string | number;
  date: string;
  method: string;
  source?: string;
}

export interface PaymentListRow extends PaymentRow {
  member_name?: string;
  member_photo_url?: string | null;
  branch_name?: string | null;
  status?: string | null;
  deleted_at?: string | null;
}

export interface UnpaidMemberSummary {
  id: number;
  name: string;
  status: string;
  end_date: string;
}

export interface PaymentsListResponse extends PaginatedResponse<PaymentListRow> {
  summary?: { total: number; count: number; average: number; byMethod?: Record<string, number> };
  trendPercent?: string | null;
  unpaidMembers?: UnpaidMemberSummary[];
}

export interface UpdateMemberPayload {
  name?: string;
  phone?: string;
  branch_id?: number;
  photo?: string | null;
  trainer_id?: number | null;
  trainer_fee?: number;
  trainer_fee_date?: string;
  trainer_fee_method?: string;
}

export interface EnrollPayload {
  name: string;
  phone: string;
  plan_id: number;
  start_date: string;
  skip_payment?: boolean;
  amount?: number;
  date?: string;
  method?: string;
  branch_id?: number;
  photo?: string;
  trainer_id?: number;
  trainer_fee?: number;
  trainer_fee_date?: string;
  trainer_fee_method?: string;
}

export interface ChangePlanPayload {
  plan_id: number;
  start_date?: string;
  amount: number;
  date?: string;
  method?: string;
}

export interface RenewPayload {
  plan_id?: number;
  start_date?: string;
  amount: number;
  date?: string;
  method?: string;
}
