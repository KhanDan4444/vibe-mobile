import type { ActivityLogRow } from '@/src/types/api';

const ACTION_LABELS: Record<string, string> = {
  'member.created': 'Member created',
  'member.enrolled': 'Member enrolled',
  'member.renewed': 'Membership renewed',
  'member.plan_changed': 'Plan changed',
  'member.updated': 'Member updated',
  'member.transferred': 'Member transferred',
  'member.deleted': 'Member deleted',
  'payment.recorded': 'Payment recorded',
  'payment.updated': 'Payment updated',
  'payment.deleted': 'Payment deleted',
  'plan.created': 'Plan created',
  'plan.updated': 'Plan updated',
  'plan.deleted': 'Plan deleted',
  'staff.created': 'Staff added',
  'staff.updated': 'Staff updated',
};

export function formatAuditAction(action: string) {
  return ACTION_LABELS[action] || action;
}

export function formatActorRole(role: string | null | undefined) {
  if (role === 'Gym Owner') return 'Owner';
  if (role === 'Gym Staff' || role === 'Help Desk') return 'Staff';
  return role || 'User';
}

export function formatAuditDetails(entry: ActivityLogRow): string | null {
  const d = entry.details || {};
  const parts: string[] = [];

  if (d.payment_amount != null) {
    const method = d.payment_method ? ` · ${d.payment_method}` : '';
    parts.push(`${Number(d.payment_amount).toLocaleString()} ETB${method}`);
  }
  if (d.skip_payment) parts.push('No payment recorded');
  if (d.staff_role) parts.push(`Role: ${d.staff_role}`);
  if (d.is_active === false) parts.push('Account disabled');
  if (d.is_active === true && entry.action === 'staff.updated') parts.push('Account enabled');
  if (d.email && entry.entity_type === 'staff') parts.push(String(d.email));
  if (d.from_branch_name && d.to_branch_name) {
    parts.push(`${d.from_branch_name} → ${d.to_branch_name}`);
  }
  if (d.previous_plan_name && d.plan_name) {
    parts.push(`${d.previous_plan_name} → ${d.plan_name}`);
  }
  if (d.duration != null && d.price != null) {
    parts.push(`${d.duration} mo · ${Number(d.price).toLocaleString()} ETB`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}
