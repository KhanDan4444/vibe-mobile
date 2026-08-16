import type { MemberRow, PaymentListRow } from '@/src/types/api';
import { formatDisplayDate } from '@/src/utils/date';

function escapeCsv(value: string | number | null | undefined) {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function memberStatus(m: MemberRow) {
  if (m.deleted_at) return 'Former';
  const base = m.status || 'Unknown';
  return m.is_unpaid ? `${base} (Unpaid)` : base;
}

export function membersToCsv(members: MemberRow[], showBranch: boolean) {
  const header = showBranch
    ? 'Name,Phone,Branch,Plan,Status,Start,End'
    : 'Name,Phone,Plan,Status,Start,End';
  const rows = members.map((m) => {
    const cols = [m.name, m.phone || '', ...(showBranch ? [m.branch_name || ''] : []), m.plan_name || '', memberStatus(m), formatDisplayDate(m.start_date), formatDisplayDate(m.end_date)];
    return cols.map(escapeCsv).join(',');
  });
  return [header, ...rows].join('\n');
}

function paymentMemberStatus(p: PaymentListRow) {
  if (p.deleted_at) return 'Former';
  const raw = (p.status || 'Unknown').toString();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function revenueToCsv(payments: PaymentListRow[], showBranch: boolean) {
  const header = showBranch
    ? 'Member,Payment received date,Branch,Status,Method,Amount (ETB)'
    : 'Member,Payment received date,Status,Method,Amount (ETB)';
  const rows = payments.map((p) => {
    const cols = [
      p.member_name || '',
      formatDisplayDate(p.date),
      ...(showBranch ? [p.branch_name || ''] : []),
      paymentMemberStatus(p),
      p.method,
      Number(p.amount).toFixed(2),
    ];
    return cols.map(escapeCsv).join(',');
  });
  return [header, ...rows].join('\n');
}
