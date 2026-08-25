import type { ComponentProps } from 'react';
import type { TFunction } from 'i18next';
import { Ionicons } from '@expo/vector-icons';
import type { ActivityLogRow } from '@/src/types/api';
import { paymentMethodLabelKey } from '@/src/constants/payments';
import { branchDisplayName } from '@/src/utils/branchDisplayName';

const ACTION_KEYS: Record<string, string> = {
  'member.created': 'activity.actions.member_created',
  'member.enrolled': 'activity.actions.member_enrolled',
  'member.renewed': 'activity.actions.member_renewed',
  'member.plan_changed': 'activity.actions.member_plan_changed',
  'member.updated': 'activity.actions.member_updated',
  'member.transferred': 'activity.actions.member_transferred',
  'member.deleted': 'activity.actions.member_deleted',
  'member.restored': 'activity.actions.member_restored',
  'payment.recorded': 'activity.actions.payment_recorded',
  'payment.updated': 'activity.actions.payment_updated',
  'payment.deleted': 'activity.actions.payment_deleted',
  'plan.created': 'activity.actions.plan_created',
  'plan.updated': 'activity.actions.plan_updated',
  'plan.deleted': 'activity.actions.plan_deleted',
  'staff.created': 'activity.actions.staff_created',
  'staff.updated': 'activity.actions.staff_updated',
  'trainer.created': 'activity.actions.trainer_created',
  'trainer.updated': 'activity.actions.trainer_updated',
  'trainer.deleted': 'activity.actions.trainer_deleted',
  'trainer.restored': 'activity.actions.trainer_restored',
};

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export function activityActionIcon(action: string): IoniconName {
  const prefix = action.split('.')[0];
  switch (prefix) {
    case 'member':
      return 'person-outline';
    case 'payment':
      return 'cash-outline';
    case 'plan':
      return 'document-text-outline';
    case 'staff':
      return 'people-outline';
    case 'trainer':
      return 'fitness-outline';
    default:
      return 'ellipse-outline';
  }
}

export function formatAuditAction(action: string, t: TFunction) {
  const key = ACTION_KEYS[action];
  return key ? t(key) : action;
}

export function formatActorRole(role: string | null | undefined, t: TFunction) {
  if (role === 'Gym Owner') return t('activity.roles.owner');
  if (role === 'Gym Staff' || role === 'Help Desk' || role === 'Front Desk') return t('activity.roles.staff');
  return role || t('activity.roles.user');
}

export function formatAuditDetails(entry: ActivityLogRow, t: TFunction): string | null {
  const d = entry.details || {};
  const parts: string[] = [];

  if (d.payment_amount != null) {
    const methodKey = d.payment_method ? paymentMethodLabelKey(String(d.payment_method)) : null;
    const method = methodKey ? ` · ${t(methodKey)}` : d.payment_method ? ` · ${d.payment_method}` : '';
    parts.push(`${Number(d.payment_amount).toLocaleString()} ETB${method}`);
  }
  if (d.skip_payment) parts.push(t('activity.details.noPayment'));
  if (d.staff_role) {
    const role =
      d.staff_role === 'Help Desk' || d.staff_role === 'Gym Staff' || d.staff_role === 'Front Desk'
        ? t('activity.roles.staff')
        : String(d.staff_role);
    parts.push(t('activity.details.role', { role }));
  }
  if (d.is_active === false) parts.push(t('activity.details.accountDisabled'));
  if (d.is_active === true && entry.action === 'staff.updated') parts.push(t('activity.details.accountEnabled'));
  if (d.email && entry.entity_type === 'staff') parts.push(String(d.email));
  if (d.from_branch_name && d.to_branch_name) {
    parts.push(
      `${branchDisplayName(String(d.from_branch_name))} → ${branchDisplayName(String(d.to_branch_name))}`,
    );
  }
  if (d.previous_plan_name && d.plan_name) {
    parts.push(`${d.previous_plan_name} → ${d.plan_name}`);
  }
  if (d.duration != null && d.price != null) {
    parts.push(`${d.duration} mo · ${Number(d.price).toLocaleString()} ETB`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}
