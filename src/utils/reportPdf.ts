import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import type { MemberRow, PaymentListRow } from '@/src/types/api';
import { formatPlanDisplayName } from '@/src/utils/formatPlanDisplayName';
import { formatDisplayDate, formatDisplayDateTime } from '@/src/utils/date';
import { membersToCsv, revenueToCsv } from '@/src/utils/reportExport';

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const METHOD_BAR_COLORS = ['#14b8a6', '#f59e0b', '#38bdf8', '#94a3b8', '#fb7185'];

const PDF_STYLES = `
  * { box-sizing: border-box; }
  @page {
    margin: 14mm 12mm 16mm;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #1e293b;
    margin: 0;
    padding: 0;
    font-size: 12px;
  }
  .brand-bar { height: 8px; background: #0f766e; }
  .content { padding: 18px 22px 36px; }
  .header {
    margin-bottom: 6px;
  }
  .eyebrow {
    margin: 0 0 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #0f766e;
  }
  h1 {
    font-size: 22px;
    margin: 0;
    color: #0f172a;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .meta {
    color: #64748b;
    margin: 8px 0 18px;
    font-size: 12px;
    line-height: 1.45;
  }
  h2 {
    font-size: 13px;
    font-weight: 700;
    color: #334155;
    margin: 22px 0 10px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
  }
  th, td {
    text-align: left;
    padding: 8px 8px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }
  th {
    background: #0f766e;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: none;
  }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  th.col-no, td.col-no { width: 36px; text-align: center; color: inherit; }
  td.col-no { color: #64748b; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .status { font-weight: 700; }
  .status-active { color: #10b981; }
  .status-unpaid { color: #f97316; }
  .status-due { color: #38bdf8; }
  .status-expired { color: #fb7185; }
  .status-former { color: #78716c; }
  .page-break { page-break-before: always; break-before: page; padding-top: 8px; }
  .total { font-size: 22px; font-weight: 700; color: #0f766e; margin: 4px 0 8px; }
  .stats { display: flex; gap: 10px; flex-wrap: wrap; margin: 4px 0 8px; }
  .stat {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 10px 14px;
    border-radius: 8px;
    min-width: 88px;
  }
  .stat label { display: block; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
  .stat strong { font-size: 17px; color: #0f172a; }
  .method-rows { margin: 4px 0 14px; }
  .method-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 8px;
    font-size: 12px;
  }
  .method-name { width: 110px; flex-shrink: 0; color: #0f172a; }
  .method-track {
    flex: 1;
    height: 8px;
    background: #f1f5f9;
    border-radius: 999px;
    overflow: hidden;
  }
  .method-fill { height: 100%; border-radius: 999px; }
  .method-amt {
    width: 140px;
    text-align: right;
    color: #64748b;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  .method-total {
    display: flex;
    justify-content: space-between;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    margin-top: 4px;
    font-weight: 700;
    color: #0f766e;
  }
  .doc-footer {
    margin-top: 28px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    font-size: 10px;
    color: #64748b;
  }
`;

function generatedAt() {
  return formatDisplayDateTime(new Date());
}

function statusClass(label: string) {
  const s = label.toLowerCase();
  if (s.includes('unpaid')) return 'status status-unpaid';
  if (s.includes('due')) return 'status status-due';
  if (s.includes('expired')) return 'status status-expired';
  if (s.includes('former')) return 'status status-former';
  if (s.includes('active')) return 'status status-active';
  return 'status';
}

function formatMoneyEtb(amount: number) {
  return `${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ETB`;
}

function plansUsedEntries(members: MemberRow[]) {
  const counts = new Map<string, number>();
  for (const m of members) {
    const name = formatPlanDisplayName(m.plan_name) || 'No plan';
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function plansUsedHtml(members: MemberRow[]) {
  const entries = plansUsedEntries(members);
  if (!entries.length) return '';
  const total = entries.reduce((s, e) => s + e.count, 0);
  const rows = entries
    .map((e, i) => {
      const pct = total > 0 ? Math.round((e.count / total) * 100) : 0;
      const color = METHOD_BAR_COLORS[i % METHOD_BAR_COLORS.length];
      return `<div class="method-row">
        <div class="method-name">${escapeHtml(e.name)}</div>
        <div class="method-track"><div class="method-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="method-amt">${e.count} · ${pct}%</div>
      </div>`;
    })
    .join('');
  return `<h2>Plans used</h2>
    <div class="method-rows">
      ${rows}
      <div class="method-total"><span>${entries.length} plan(s) · ${total} member(s)</span><span></span></div>
    </div>`;
}

function revenueByMethodHtml(summary?: { total?: number; byMethod?: Record<string, number> }) {
  const byMethod = summary?.byMethod || {};
  const entries = Object.entries(byMethod)
    .map(([method, amount]) => ({ method, amount: Number(amount) || 0 }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  if (!entries.length) return '';

  const total = Number(summary?.total ?? entries.reduce((s, e) => s + e.amount, 0));
  const rows = entries
    .map((e, i) => {
      const pct = total > 0 ? Math.round((e.amount / total) * 100) : 0;
      const color = METHOD_BAR_COLORS[i % METHOD_BAR_COLORS.length];
      return `<div class="method-row">
        <div class="method-name">${escapeHtml(e.method)}</div>
        <div class="method-track"><div class="method-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="method-amt">${escapeHtml(formatMoneyEtb(e.amount))} · ${pct}%</div>
      </div>`;
    })
    .join('');

  return `<h2>Revenue by method</h2>
    <div class="method-rows">
      ${rows}
      <div class="method-total"><span>Total</span><span>${escapeHtml(formatMoneyEtb(total))}</span></div>
    </div>`;
}

function reportShell(opts: {
  gymName: string;
  eyebrow: string;
  meta: string;
  body: string;
}) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PDF_STYLES}</style></head><body>
    <div class="brand-bar"></div>
    <div class="content">
      <div class="header">
        <p class="eyebrow">${escapeHtml(opts.eyebrow)}</p>
        <h1>${escapeHtml(opts.gymName)}</h1>
      </div>
      <p class="meta">${opts.meta}</p>
      ${opts.body}
      <div class="doc-footer">
        <span>${escapeHtml(opts.gymName)}</span>
      </div>
    </div>
  </body></html>`;
}

/** Active = valid term and paid. Unpaid is separate (not counted as active). */
export function memberStatusCounts(members: MemberRow[]) {
  let active = 0;
  let dueSoon = 0;
  let expired = 0;
  let unpaid = 0;
  let former = 0;
  for (const m of members) {
    if (m.deleted_at) {
      former += 1;
      continue;
    }
    const s = (m.status || '').toLowerCase();
    if (m.is_unpaid) unpaid += 1;
    if (s === 'active' && !m.is_unpaid) active += 1;
    else if (s === 'due soon') dueSoon += 1;
    else if (s === 'expired') expired += 1;
  }
  return { active, dueSoon, expired, unpaid, former, total: members.length };
}

/**
 * Exclusive buckets for a single stacked bar (each member once).
 * Priority: Former → Expired → Due soon → Unpaid → Active.
 */
export function memberStatusBreakdownExclusive(members: MemberRow[]) {
  let active = 0;
  let dueSoon = 0;
  let expired = 0;
  let unpaid = 0;
  let former = 0;
  for (const m of members) {
    if (m.deleted_at) {
      former += 1;
      continue;
    }
    const s = (m.status || '').toLowerCase();
    if (s === 'expired') expired += 1;
    else if (s === 'due soon') dueSoon += 1;
    else if (m.is_unpaid) unpaid += 1;
    else if (s === 'active') active += 1;
  }
  return { active, dueSoon, expired, unpaid, former, total: members.length };
}

function membersTableHtml(members: MemberRow[], showBranch: boolean) {
  if (!members.length) return '<p>No members in this filter.</p>';
  const headers = showBranch
    ? ['No.', 'Name', 'Phone', 'Branch', 'Plan', 'Status', 'End']
    : ['No.', 'Name', 'Phone', 'Plan', 'Status', 'End'];
  const statusIdx = showBranch ? 5 : 4;
  const rows = members.slice(0, 200).map((m, index) => {
    const status = m.deleted_at ? 'Former' : m.is_unpaid ? `${m.status} (Unpaid)` : m.status || '';
    const cols = showBranch
      ? [String(index + 1), m.name, m.phone || '', m.branch_name || '', m.plan_name || '', status, formatDisplayDate(m.end_date)]
      : [String(index + 1), m.name, m.phone || '', m.plan_name || '', status, formatDisplayDate(m.end_date)];
    return `<tr>${cols
      .map((c, i) => {
        if (i === 0) return `<td class="col-no">${escapeHtml(String(c))}</td>`;
        if (i === statusIdx) return `<td class="${statusClass(String(c))}">${escapeHtml(String(c))}</td>`;
        if (i === cols.length - 1) return `<td class="num">${escapeHtml(String(c))}</td>`;
        return `<td>${escapeHtml(String(c))}</td>`;
      })
      .join('')}</tr>`;
  });
  const more = members.length > 200 ? `<p><em>Showing first 200 of ${members.length} members.</em></p>` : '';
  return `${more}<table><thead><tr>${headers
    .map((h, i) => `<th${i === 0 ? ' class="col-no"' : ''}>${escapeHtml(h)}</th>`)
    .join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function paymentsTableHtml(payments: PaymentListRow[], showBranch: boolean) {
  if (!payments.length) return '<p>No payments in this period.</p>';
  const headers = showBranch
    ? ['No.', 'Member', 'Payment received date', 'Branch', 'Status', 'Method', 'Amount (ETB)']
    : ['No.', 'Member', 'Payment received date', 'Status', 'Method', 'Amount (ETB)'];
  const statusIdx = showBranch ? 4 : 3;
  const rows = payments.slice(0, 300).map((p, index) => {
    const status = p.deleted_at ? 'Former' : (p.status || '').toString();
    const statusLabel = status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
    const cols = showBranch
      ? [String(index + 1), p.member_name || '', formatDisplayDate(p.date), p.branch_name || '', statusLabel, p.method, Number(p.amount).toFixed(2)]
      : [String(index + 1), p.member_name || '', formatDisplayDate(p.date), statusLabel, p.method, Number(p.amount).toFixed(2)];
    return `<tr>${cols
      .map((c, i) => {
        if (i === 0) return `<td class="col-no">${escapeHtml(String(c))}</td>`;
        if (i === statusIdx) return `<td class="${statusClass(String(c))}">${escapeHtml(String(c))}</td>`;
        if (i === cols.length - 1) return `<td class="num">${escapeHtml(String(c))}</td>`;
        return `<td>${escapeHtml(String(c))}</td>`;
      })
      .join('')}</tr>`;
  });
  const more = payments.length > 300 ? `<p><em>Showing first 300 of ${payments.length} payments.</em></p>` : '';
  return `${more}<table><thead><tr>${headers
    .map((h, i) => `<th${i === 0 ? ' class="col-no"' : ''}>${escapeHtml(h)}</th>`)
    .join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

export function buildMembersPdfHtml(opts: {
  gymName: string;
  branchLabel: string;
  filterLabel: string;
  members: MemberRow[];
  showBranch: boolean;
}) {
  const counts = memberStatusCounts(opts.members);
  const plans = plansUsedEntries(opts.members);
  const meta = [
    escapeHtml(opts.branchLabel),
    escapeHtml(opts.filterLabel),
    `${plans.length} plan(s)`,
    `Generated ${escapeHtml(generatedAt())}`,
  ].join(' · ');
  const body = `
    <div class="stats">
      <div class="stat"><label>Total</label><strong>${counts.total}</strong></div>
      <div class="stat"><label>Plans</label><strong>${plans.length}</strong></div>
      <div class="stat"><label>Active</label><strong>${counts.active}</strong></div>
      <div class="stat"><label>Due soon</label><strong>${counts.dueSoon}</strong></div>
      <div class="stat"><label>Expired</label><strong>${counts.expired}</strong></div>
      <div class="stat"><label>Unpaid</label><strong>${counts.unpaid}</strong></div>
      <div class="stat"><label>Former</label><strong>${counts.former}</strong></div>
    </div>
    ${plansUsedHtml(opts.members)}
    <h2>Members</h2>
    ${membersTableHtml(opts.members, opts.showBranch)}
  `;
  return reportShell({
    gymName: opts.gymName,
    eyebrow: 'Members report',
    meta,
    body,
  });
}

export function buildRevenuePdfHtml(opts: {
  gymName: string;
  branchLabel: string;
  periodLabel: string;
  payments: PaymentListRow[];
  summary?: { total: number; count: number; byMethod?: Record<string, number> };
  showBranch: boolean;
}) {
  const total = opts.summary?.total ?? opts.payments.reduce((s, p) => s + Number(p.amount), 0);
  const count = opts.summary?.count ?? opts.payments.length;
  const meta = [
    escapeHtml(opts.branchLabel),
    escapeHtml(opts.periodLabel),
    `Generated ${escapeHtml(generatedAt())}`,
  ].join(' · ');
  const body = `
    <p class="total">${escapeHtml(formatMoneyEtb(total))}</p>
    <p class="meta" style="margin-top:-8px">${count} payments</p>
    ${revenueByMethodHtml(opts.summary)}
    <h2>Transactions</h2>
    ${paymentsTableHtml(opts.payments, opts.showBranch)}
  `;
  return reportShell({
    gymName: opts.gymName,
    eyebrow: 'Revenue report',
    meta,
    body,
  });
}

export function buildFullReportPdfHtml(opts: {
  gymName: string;
  branchLabel: string;
  memberFilterLabel: string;
  periodLabel: string;
  members: MemberRow[];
  payments: PaymentListRow[];
  revenueSummary?: { total: number; count: number; byMethod?: Record<string, number> };
  showBranch: boolean;
}) {
  const counts = memberStatusCounts(opts.members);
  const plans = plansUsedEntries(opts.members);
  const total = opts.revenueSummary?.total ?? opts.payments.reduce((s, p) => s + Number(p.amount), 0);
  const meta = [
    escapeHtml(opts.branchLabel),
    escapeHtml(opts.memberFilterLabel),
    escapeHtml(opts.periodLabel),
    `${plans.length} plan(s)`,
    `Generated ${escapeHtml(generatedAt())}`,
  ].join(' · ');
  const body = `
    <div class="stats">
      <div class="stat"><label>Total</label><strong>${counts.total}</strong></div>
      <div class="stat"><label>Plans</label><strong>${plans.length}</strong></div>
      <div class="stat"><label>Active</label><strong>${counts.active}</strong></div>
      <div class="stat"><label>Unpaid</label><strong>${counts.unpaid}</strong></div>
      <div class="stat"><label>Former</label><strong>${counts.former}</strong></div>
    </div>
    ${plansUsedHtml(opts.members)}
    <h2>Members</h2>
    ${membersTableHtml(opts.members, opts.showBranch)}
    <div class="page-break">
      <h2>Revenue</h2>
      <p class="total">${escapeHtml(formatMoneyEtb(total))}</p>
      <p class="meta" style="margin-top:-8px">${opts.payments.length} payments · ${escapeHtml(opts.periodLabel)}</p>
      ${revenueByMethodHtml(opts.revenueSummary)}
      <h2>Transactions</h2>
      ${paymentsTableHtml(opts.payments, opts.showBranch)}
    </div>
  `;
  return reportShell({
    gymName: opts.gymName,
    eyebrow: 'Gym report',
    meta,
    body,
  });
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
