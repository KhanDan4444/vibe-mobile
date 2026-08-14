import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import type { MemberRow, PaymentListRow } from '@/src/types/api';
import { formatDisplayDate } from '@/src/utils/date';
import { membersToCsv, revenueToCsv } from '@/src/utils/reportExport';

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const PDF_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; padding: 24px; font-size: 12px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #64748b; margin-bottom: 24px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 24px 0 12px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #e2e8f0; }
  th { font-size: 10px; text-transform: uppercase; color: #64748b; }
  .total { font-size: 22px; font-weight: 700; color: #0f766e; margin: 8px 0; }
  .stats { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 12px; }
  .stat { background: #f8fafc; padding: 12px 16px; border-radius: 8px; min-width: 100px; }
  .stat label { display: block; font-size: 10px; color: #64748b; text-transform: uppercase; }
  .stat strong { font-size: 18px; }
`;

/** Active = valid term and paid. Unpaid is separate (not counted as active). */
export function memberStatusCounts(members: MemberRow[]) {
  let active = 0;
  let dueSoon = 0;
  let expired = 0;
  let unpaid = 0;
  for (const m of members) {
    const s = (m.status || '').toLowerCase();
    if (m.is_unpaid) unpaid += 1;
    if (s === 'active' && !m.is_unpaid) active += 1;
    else if (s === 'due soon') dueSoon += 1;
    else if (s === 'expired') expired += 1;
  }
  return { active, dueSoon, expired, unpaid, total: members.length };
}

/**
 * Exclusive buckets for a single stacked bar (each member once).
 * Priority: Expired → Due soon → Unpaid → Active.
 */
export function memberStatusBreakdownExclusive(members: MemberRow[]) {
  let active = 0;
  let dueSoon = 0;
  let expired = 0;
  let unpaid = 0;
  for (const m of members) {
    const s = (m.status || '').toLowerCase();
    if (s === 'expired') expired += 1;
    else if (s === 'due soon') dueSoon += 1;
    else if (m.is_unpaid) unpaid += 1;
    else if (s === 'active') active += 1;
  }
  return { active, dueSoon, expired, unpaid, total: members.length };
}

function membersTableHtml(members: MemberRow[], showBranch: boolean) {
  if (!members.length) return '<p>No members in this filter.</p>';
  const headers = showBranch
    ? ['Name', 'Phone', 'Branch', 'Plan', 'Status', 'End']
    : ['Name', 'Phone', 'Plan', 'Status', 'End'];
  const rows = members.slice(0, 200).map((m) => {
    const status = m.is_unpaid ? `${m.status} (Unpaid)` : m.status;
    const cols = showBranch
      ? [m.name, m.phone || '', m.branch_name || '', m.plan_name || '', status, formatDisplayDate(m.end_date)]
      : [m.name, m.phone || '', m.plan_name || '', status, formatDisplayDate(m.end_date)];
    return `<tr>${cols.map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`;
  });
  const more = members.length > 200 ? `<p><em>Showing first 200 of ${members.length} members.</em></p>` : '';
  return `${more}<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function paymentsTableHtml(payments: PaymentListRow[], showBranch: boolean) {
  if (!payments.length) return '<p>No payments in this period.</p>';
  const headers = showBranch
    ? ['Member', 'Payment received date', 'Branch', 'Method', 'Amount (ETB)']
    : ['Member', 'Payment received date', 'Method', 'Amount (ETB)'];
  const rows = payments.slice(0, 300).map((p) => {
    const cols = showBranch
      ? [p.member_name || '', formatDisplayDate(p.date), p.branch_name || '', p.method, Number(p.amount).toFixed(2)]
      : [p.member_name || '', formatDisplayDate(p.date), p.method, Number(p.amount).toFixed(2)];
    return `<tr>${cols.map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`;
  });
  const more = payments.length > 300 ? `<p><em>Showing first 300 of ${payments.length} payments.</em></p>` : '';
  return `${more}<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

export function buildMembersPdfHtml(opts: {
  gymName: string;
  branchLabel: string;
  filterLabel: string;
  members: MemberRow[];
  showBranch: boolean;
}) {
  const counts = memberStatusCounts(opts.members);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PDF_STYLES}</style></head><body>
    <h1>${escapeHtml(opts.gymName)}</h1>
    <p class="meta">Members report · ${escapeHtml(opts.branchLabel)} · ${escapeHtml(opts.filterLabel)} · ${escapeHtml(new Date().toLocaleString())}</p>
    <div class="stats">
      <div class="stat"><label>Total</label><strong>${counts.total}</strong></div>
      <div class="stat"><label>Active</label><strong>${counts.active}</strong></div>
      <div class="stat"><label>Due soon</label><strong>${counts.dueSoon}</strong></div>
      <div class="stat"><label>Expired</label><strong>${counts.expired}</strong></div>
      <div class="stat"><label>Unpaid</label><strong>${counts.unpaid}</strong></div>
    </div>
    <h2>Members</h2>
    ${membersTableHtml(opts.members, opts.showBranch)}
  </body></html>`;
}

export function buildRevenuePdfHtml(opts: {
  gymName: string;
  branchLabel: string;
  periodLabel: string;
  payments: PaymentListRow[];
  summary?: { total: number; count: number };
  showBranch: boolean;
}) {
  const total = opts.summary?.total ?? opts.payments.reduce((s, p) => s + Number(p.amount), 0);
  const count = opts.summary?.count ?? opts.payments.length;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PDF_STYLES}</style></head><body>
    <h1>${escapeHtml(opts.gymName)}</h1>
    <p class="meta">Revenue report · ${escapeHtml(opts.branchLabel)} · ${escapeHtml(opts.periodLabel)} · ${escapeHtml(new Date().toLocaleString())}</p>
    <p class="total">${total.toLocaleString()} ETB</p>
    <p class="meta">${count} payments</p>
    <h2>Transactions</h2>
    ${paymentsTableHtml(opts.payments, opts.showBranch)}
  </body></html>`;
}

export function buildFullReportPdfHtml(opts: {
  gymName: string;
  branchLabel: string;
  memberFilterLabel: string;
  periodLabel: string;
  members: MemberRow[];
  payments: PaymentListRow[];
  revenueSummary?: { total: number; count: number };
  showBranch: boolean;
}) {
  const counts = memberStatusCounts(opts.members);
  const total = opts.revenueSummary?.total ?? opts.payments.reduce((s, p) => s + Number(p.amount), 0);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PDF_STYLES}</style></head><body>
    <h1>${escapeHtml(opts.gymName)}</h1>
    <p class="meta">Full gym report · ${escapeHtml(opts.branchLabel)} · ${escapeHtml(new Date().toLocaleString())}</p>
    <h2>Members (${escapeHtml(opts.memberFilterLabel)})</h2>
    <div class="stats">
      <div class="stat"><label>Total</label><strong>${counts.total}</strong></div>
      <div class="stat"><label>Active</label><strong>${counts.active}</strong></div>
      <div class="stat"><label>Unpaid</label><strong>${counts.unpaid}</strong></div>
    </div>
    ${membersTableHtml(opts.members, opts.showBranch)}
    <h2>Revenue (${escapeHtml(opts.periodLabel)})</h2>
    <p class="total">${total.toLocaleString()} ETB</p>
    ${paymentsTableHtml(opts.payments, opts.showBranch)}
  </body></html>`;
}

export async function sharePdfFromHtml(html: string, dialogTitle: string) {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle,
    });
  } else {
    Alert.alert('Share unavailable', 'PDF sharing is not available on this device.');
  }
}

export { membersToCsv, revenueToCsv };
