import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { PageSkeleton } from '@/src/components/Skeleton';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchMemberReport, fetchRevenueReport } from '@/src/api/reports';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { MiniBarChart } from '@/src/components/MiniBarChart';
import { StatusBreakdown } from '@/src/components/StatusBreakdown';
import { OptionPickerField } from '@/src/components/OptionPickerField';
import { ResponsiveContent } from '@/src/components/ResponsiveContent';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { useBranchScope } from '@/src/context/BranchContext';
import { useTheme, usePreferences } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { appTextStyle } from '@/src/theme/typography';
import type { AppLanguage } from '@/src/i18n';
import type { ThemeColors } from '@/src/theme/tokens';
import { membersToCsv, revenueToCsv } from '@/src/utils/reportExport';
import {
  buildFullReportPdfHtml,
  buildMembersPdfHtml,
  buildRevenuePdfHtml,
  sharePdfFromHtml,
} from '@/src/utils/reportPdf';
import { hasGymPortalAccess } from '@/src/utils/roles';

type MemberFilter = 'all' | 'active' | 'unpaid' | 'due_soon' | 'expired';

type RevenuePreset = 'this_month' | 'this_week' | 'last_month' | 'this_year';

const MEMBER_FILTER_KEYS: { value: MemberFilter; labelKey: string; query: Record<string, string> }[] = [
  { value: 'all', labelKey: 'reports.allMembers', query: {} },
  { value: 'active', labelKey: 'reports.active', query: { status: 'active' } },
  { value: 'unpaid', labelKey: 'reports.unpaid', query: { filter: 'unpaid' } },
  { value: 'due_soon', labelKey: 'reports.dueSoon', query: { filter: 'due_soon' } },
  { value: 'expired', labelKey: 'reports.expired', query: { filter: 'expired' } },
];

const REVENUE_PRESET_KEYS: { value: RevenuePreset; labelKey: string }[] = [
  { value: 'this_month', labelKey: 'revenue.periodThisMonth' },
  { value: 'this_week', labelKey: 'revenue.periodThisWeek' },
  { value: 'last_month', labelKey: 'revenue.periodLastMonth' },
  { value: 'this_year', labelKey: 'revenue.periodThisYear' },
];

function buildReportStyles(colors: ThemeColors, statCardWidthPercent: string) {
  return {
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 40 },
    pageTitle: { fontSize: 22, fontWeight: '700' as const, color: colors.text, marginTop: 4 },
    pageSub: { marginTop: 4, marginBottom: 8, fontSize: 14, color: colors.dim },
    sectionTitle: {
      marginTop: 16,
      marginBottom: 10,
      fontSize: 12,
      fontWeight: '700' as const,
      color: colors.muted,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    statsRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginTop: 16 },
    statBox: {
      width: statCardWidthPercent as `${number}%`,
      flexGrow: 1,
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center' as const,
    },
    statValue: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
    statLabel: {
      marginTop: 4,
      fontSize: 13,
      color: colors.dim,
      textAlign: 'center' as const,
    },
    exportRow: { flexDirection: 'row' as const, gap: 10, marginTop: 16 },
    exportBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center' as const,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    exportBtnPrimary: { backgroundColor: colors.accentSoft, borderColor: colors.accentText },
    exportDisabled: { opacity: 0.45 },
    exportText: { color: colors.accentText, fontSize: 14, fontWeight: '600' as const },
    exportTextPrimary: { color: colors.text },
    revenueSummary: {
      marginTop: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    revenueTotal: { fontSize: 28, fontWeight: '700' as const, color: colors.accentText },
    revenueMeta: { marginTop: 4, fontSize: 13, color: colors.dim },
    fullSection: {
      marginTop: 32,
      padding: 16,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fullTitle: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
    fullSub: { marginTop: 4, fontSize: 13, color: colors.dim, marginBottom: 4 },
  };
}

type ReportStyles = ReturnType<typeof buildReportStyles>;

export default function ReportsScreen() {
  const { token, user, gymName } = useAuth();
  const { selectedBranchId, showBranchFilter, branchLabel } = useBranchScope();
  const { colors: c } = useTheme();
  const { language } = usePreferences();
  const { t } = useTranslation();
  const { pagePadding, reportStatWidthPercent } = useResponsiveLayout();
  const styles = useThemedStyles((colors) => buildReportStyles(colors, reportStatWidthPercent));
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');
  const [revenuePreset, setRevenuePreset] = useState<RevenuePreset>('this_month');
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState('');
  const canViewReports = Boolean(user && hasGymPortalAccess(user.role));

  const memberFilters = useMemo(
    () => MEMBER_FILTER_KEYS.map((f) => ({ ...f, label: t(f.labelKey) })),
    [t]
  );
  const revenuePresets = useMemo(
    () => REVENUE_PRESET_KEYS.map((p) => ({ ...p, label: t(p.labelKey) })),
    [t]
  );

  const branchParam = selectedBranchId !== 'all' ? { branch_id: selectedBranchId } : {};
  const memberMeta = memberFilters.find((f) => f.value === memberFilter) ?? memberFilters[0];
  const periodLabel = revenuePresets.find((p) => p.value === revenuePreset)?.label ?? t('revenue.periodThisMonth');
  const displayGym = gymName || t('reports.yourGym');

  const membersQuery = useQuery({
    queryKey: ['report-members-summary', memberFilter, selectedBranchId],
    queryFn: () => fetchMemberReport(token!, { ...branchParam, ...memberMeta.query, summary: true }),
    enabled: Boolean(token && canViewReports),
  });

  const revenueQuery = useQuery({
    queryKey: ['report-revenue-summary', revenuePreset, selectedBranchId],
    queryFn: () => fetchRevenueReport(token!, { ...branchParam, preset: revenuePreset, summary: true }),
    enabled: Boolean(token && canViewReports),
  });

  const revenueSummary = revenueQuery.data?.summary;
  const loading = membersQuery.isLoading || revenueQuery.isLoading;
  const counts = membersQuery.data?.counts ?? {
    total: 0,
    active: 0,
    dueSoon: 0,
    expired: 0,
    unpaid: 0,
  };
  const barCounts = membersQuery.data?.barCounts ?? counts;
  const revenueTrend = revenueQuery.data?.chart ?? [];
  const hasExportableData = counts.total > 0 || (revenueSummary?.count ?? 0) > 0;

  const loadFullExportData = async () => {
    const [memberReport, revenueReport] = await Promise.all([
      fetchMemberReport(token!, { ...branchParam, ...memberMeta.query }),
      fetchRevenueReport(token!, { ...branchParam, preset: revenuePreset }),
    ]);
    return {
      members: memberReport.members ?? [],
      payments: revenueReport.payments ?? [],
      revenueSummary: revenueReport.summary,
    };
  };

  if (!canViewReports) {
    return <Redirect href="/(tabs)/more" />;
  }

  const shareCsv = async (kind: 'members' | 'revenue' | 'full') => {
    setExporting(`${kind}-csv`);
    try {
      const { members, payments } = await loadFullExportData();
      const showBranch = showBranchFilter;
      let body = '';
      let title = 'Vibe report';

      if (kind === 'members') {
        body = membersToCsv(members, showBranch);
        title = `members-${memberFilter}.csv`;
      } else if (kind === 'revenue') {
        body = revenueToCsv(payments, showBranch);
        title = `revenue-${revenuePreset}.csv`;
      } else {
        body = [
          `${displayGym} · ${branchLabel} · ${new Date().toLocaleString()}`,
          '',
          '--- Members ---',
          membersToCsv(members, showBranch),
          '',
          '--- Revenue ---',
          revenueToCsv(payments, showBranch),
        ].join('\n');
        title = 'full-report.csv';
      }

      await Share.share({ message: body, title });
    } catch (e) {
      setExportError(e instanceof Error ? e.message : t('reports.exportFailedBody'));
    } finally {
      setExporting(null);
    }
  };

  const sharePdf = async (kind: 'members' | 'revenue' | 'full') => {
    setExporting(`${kind}-pdf`);
    try {
      const { members, payments, revenueSummary: exportSummary } = await loadFullExportData();
      const showBranch = showBranchFilter;
      let html = '';
      let title = 'Report';

      if (kind === 'members') {
        html = buildMembersPdfHtml({
          gymName: displayGym,
          branchLabel,
          filterLabel: memberMeta.label,
          members,
          showBranch,
        });
        title = 'Members report';
      } else if (kind === 'revenue') {
        html = buildRevenuePdfHtml({
          gymName: displayGym,
          branchLabel,
          periodLabel,
          payments,
          summary: exportSummary,
          showBranch,
        });
        title = 'Revenue report';
      } else {
        html = buildFullReportPdfHtml({
          gymName: displayGym,
          branchLabel,
          memberFilterLabel: memberMeta.label,
          periodLabel,
          members,
          payments,
          revenueSummary: exportSummary,
          showBranch,
        });
        title = 'Full gym report';
      }

      await sharePdfFromHtml(html, title);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : t('reports.exportFailedBody'));
    } finally {
      setExporting(null);
    }
  };

  return (
    <TabScreenFrame>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ResponsiveContent style={{ paddingHorizontal: pagePadding }}>
      <BranchFilterBar horizontalPadding={0} />

      <Text style={appTextStyle(language, styles.pageTitle)}>{t('reports.title')}</Text>
      <Text style={appTextStyle(language, styles.pageSub)}>{displayGym} · {branchLabel}</Text>

      <Text
        style={appTextStyle(language, {
          ...styles.sectionTitle,
          ...(language === 'am' ? { textTransform: 'none', letterSpacing: 0 } : null),
        })}
      >
        {t('reports.membersSection')}
      </Text>
      <OptionPickerField
        options={memberFilters.map((f) => ({ value: f.value, label: f.label }))}
        value={memberFilter}
        onChange={setMemberFilter}
        placeholder={t('reports.allMembers')}
        sheetTitle={t('reports.membersSection')}
      />

      {loading ? (
        <PageSkeleton variant="reports" padded={false} style={{ marginVertical: 8 }} />
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatBox label={t('reports.total')} value={counts.total} styles={styles} language={language} />
            <StatBox label={t('reports.active')} value={counts.active} accent="#34d399" styles={styles} language={language} />
            <StatBox label={t('reports.dueSoon')} value={counts.dueSoon} accent="#0284c7" styles={styles} language={language} />
            <StatBox label={t('reports.expired')} value={counts.expired} accent="#f87171" styles={styles} language={language} />
            <StatBox label={t('reports.unpaid')} value={counts.unpaid} accent="#fb923c" styles={styles} language={language} />
          </View>
          <StatusBreakdown counts={counts} barCounts={barCounts} />
        </>
      )}

      <Text
        style={appTextStyle(language, {
          ...styles.sectionTitle,
          marginTop: 28,
          ...(language === 'am' ? { textTransform: 'none', letterSpacing: 0 } : null),
        })}
      >
        {t('reports.revenueSection')}
      </Text>
      <OptionPickerField
        options={revenuePresets.map((p) => ({ value: p.value, label: p.label }))}
        value={revenuePreset}
        onChange={setRevenuePreset}
        placeholder={t('revenue.periodThisMonth')}
        sheetTitle={t('reports.revenueSection')}
      />

      {revenueSummary ? (
        <View style={styles.revenueSummary}>
          <Text style={styles.revenueTotal}>{Number(revenueSummary.total || 0).toLocaleString()} ETB</Text>
          <Text style={styles.revenueMeta}>
            {t('reports.paymentsInPeriod', { count: revenueSummary.count ?? 0, period: periodLabel.toLowerCase() })}
          </Text>
          {revenueTrend.length > 0 ? <MiniBarChart data={revenueTrend} /> : null}
        </View>
      ) : null}

      <View style={styles.fullSection}>
        <Text style={styles.fullTitle}>{t('reports.shareReport')}</Text>
        <Text style={styles.fullSub}>
          {t('reports.shareReportSub', { memberFilter: memberMeta.label.toLowerCase(), period: periodLabel.toLowerCase() })}
        </Text>
        <ExportRow
          disabled={!hasExportableData || exporting != null}
          onCsv={() => shareCsv('full')}
          onPdf={() => sharePdf('full')}
          csvLoading={exporting === 'full-csv'}
          pdfLoading={exporting === 'full-pdf'}
          styles={styles}
          t={t}
        />
      </View>
      </ResponsiveContent>
    </ScrollView>
    <ConfirmDialog
      visible={Boolean(exportError)}
      title={t('reports.exportFailed')}
      message={exportError}
      alertOnly
      destructive={false}
      onConfirm={() => setExportError('')}
    />
    </TabScreenFrame>
  );
}

function StatBox({
  label,
  value,
  accent,
  styles,
  language,
}: {
  label: string;
  value: number;
  accent?: string;
  styles: ReportStyles;
  language: AppLanguage;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={appTextStyle(language, styles.statLabel)}>{label}</Text>
    </View>
  );
}

function ExportRow({
  disabled,
  onCsv,
  onPdf,
  csvLoading,
  pdfLoading,
  styles,
  t,
}: {
  disabled: boolean;
  onCsv: () => void;
  onPdf: () => void;
  csvLoading: boolean;
  pdfLoading: boolean;
  styles: ReportStyles;
  t: (key: string) => string;
}) {
  return (
    <View style={styles.exportRow}>
      <Pressable style={[styles.exportBtn, disabled && styles.exportDisabled]} onPress={onCsv} disabled={disabled}>
        <Text style={styles.exportText}>{csvLoading ? '…' : t('common.exportCsv')}</Text>
      </Pressable>
      <Pressable style={[styles.exportBtn, styles.exportBtnPrimary, disabled && styles.exportDisabled]} onPress={onPdf} disabled={disabled}>
        <Text style={[styles.exportText, styles.exportTextPrimary]}>{pdfLoading ? '…' : t('common.exportPdf')}</Text>
      </Pressable>
    </View>
  );
}
