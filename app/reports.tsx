import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
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
import { appTextStyle, metricDisplayStyle } from '@/src/theme/typography';
import type { AppLanguage } from '@/src/i18n';
import type { ThemeColors } from '@/src/theme/tokens';
import { space } from '@/src/theme/tokens';
import { membersToCsv, revenueToCsv } from '@/src/utils/reportExport';
import {
  buildFullReportPdfHtml,
  buildMembersPdfHtml,
  buildRevenuePdfHtml,
  sharePdfFromHtml,
} from '@/src/utils/reportPdf';
import { hasGymPortalAccess } from '@/src/utils/roles';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { MetricStatCard } from '@/src/components/MetricStatCard';
import { PrimaryButton, SecondaryButton } from '@/src/components/ui/Button';
import { formatEtb } from '@/src/utils/formatMoney';

type RevenuePreset = 'this_month' | 'this_week' | 'last_month' | 'this_year';

const REVENUE_PRESET_KEYS: { value: RevenuePreset; labelKey: string }[] = [
  { value: 'this_month', labelKey: 'revenue.periodThisMonth' },
  { value: 'this_week', labelKey: 'revenue.periodThisWeek' },
  { value: 'last_month', labelKey: 'revenue.periodLastMonth' },
  { value: 'this_year', labelKey: 'revenue.periodThisYear' },
];

function buildReportStyles(colors: ThemeColors) {
  return {
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 40 },
    pageTitle: { fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.4, color: colors.text, marginTop: 4 },
    pageSub: { marginTop: 4, marginBottom: space.sm, fontSize: 14, color: colors.dim },
    sectionTitle: {
      marginTop: space.lg,
      marginBottom: 10,
      fontSize: 12,
      fontWeight: '700' as const,
      color: colors.muted,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    statsRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: space.md, marginTop: space.lg },
    exportRow: { flexDirection: 'row' as const, gap: space.md, marginTop: space.lg },
    exportBtn: { flex: 1 },
    revenueSummary: {
      marginTop: space.lg,
      padding: space.lg + 2,
    },
    revenuePeriod: {
      fontSize: 11,
      fontWeight: '600' as const,
      letterSpacing: 0.4,
      textTransform: 'uppercase' as const,
      color: colors.muted,
    },
    revenueTotal: { marginTop: 6, fontSize: 30, letterSpacing: -0.8, color: colors.text },
    revenueTotalLg: { fontSize: 35, letterSpacing: -0.9 },
    revenueMeta: { marginTop: 6, fontSize: 13, color: colors.dim },
    fullSection: {
      marginTop: space.xxl,
      padding: space.lg + 2,
    },
    fullTitle: { fontSize: 16, fontWeight: '600' as const, letterSpacing: -0.2, color: colors.text },
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
  const { pagePadding, reportStatLayoutStyle, isTablet } = useResponsiveLayout();
  const styles = useThemedStyles((colors) => buildReportStyles(colors));
  const [revenuePreset, setRevenuePreset] = useState<RevenuePreset>('this_month');
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState('');
  const canViewReports = Boolean(user && hasGymPortalAccess(user.role));

  const revenuePresets = useMemo(
    () => REVENUE_PRESET_KEYS.map((p) => ({ ...p, label: t(p.labelKey) })),
    [t]
  );

  const branchParam = selectedBranchId !== 'all' ? { branch_id: selectedBranchId } : {};
  const memberFilterLabel = t('reports.allMembers');
  const periodLabel = revenuePresets.find((p) => p.value === revenuePreset)?.label ?? t('revenue.periodThisMonth');
  const displayGym = gymName || t('reports.yourGym');

  const membersQuery = useQuery({
    queryKey: ['report-members-summary', selectedBranchId, revenuePreset],
    queryFn: () => fetchMemberReport(token!, { ...branchParam, preset: revenuePreset, summary: true }),
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
    former: 0,
  };
  const barCounts = membersQuery.data?.barCounts ?? counts;
  const revenueTrend = revenueQuery.data?.chart ?? [];
  const hasExportableData = counts.total > 0 || (revenueSummary?.count ?? 0) > 0;

  const loadFullExportData = async () => {
    const [memberReport, revenueReport] = await Promise.all([
      fetchMemberReport(token!, { ...branchParam, preset: revenuePreset }),
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
      let title = t('reports.vibeReport');

      if (kind === 'members') {
        body = membersToCsv(members, showBranch);
        title = 'members.csv';
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
      let title = t('reports.shareTitle');

      if (kind === 'members') {
        html = buildMembersPdfHtml({
          gymName: displayGym,
          branchLabel,
          filterLabel: memberFilterLabel,
          members,
          showBranch,
        });
        title = t('reports.membersReport');
      } else if (kind === 'revenue') {
        html = buildRevenuePdfHtml({
          gymName: displayGym,
          branchLabel,
          periodLabel,
          payments,
          summary: exportSummary,
          showBranch,
        });
        title = t('reports.revenueReport');
      } else {
        html = buildFullReportPdfHtml({
          gymName: displayGym,
          branchLabel,
          memberFilterLabel,
          periodLabel,
          members,
          payments,
          revenueSummary: exportSummary,
          showBranch,
        });
        title = t('reports.fullGymReport');
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

      <Text display style={styles.pageTitle}>{t('reports.title')}</Text>
      <Text style={appTextStyle(language, styles.pageSub)}>{displayGym} · {branchLabel}</Text>

      <OptionPickerField
        options={revenuePresets.map((p) => ({ value: p.value, label: p.label }))}
        value={revenuePreset}
        onChange={setRevenuePreset}
        placeholder={t('revenue.periodThisMonth')}
        sheetTitle={t('revenue.period')}
      />

      <Text
        style={appTextStyle(language, {
          ...styles.sectionTitle,
          ...(language === 'am' ? { textTransform: 'none', letterSpacing: 0 } : null),
        })}
      >
        {t('reports.membersSection')}
      </Text>

      {loading ? (
        <PageSkeleton variant="reports" padded={false} style={{ marginVertical: 8 }} />
      ) : (
        <>
          <View style={styles.statsRow}>
            <MetricStatCard
              label={t('reports.total')}
              value={counts.total}
              tone="neutral"
              align="center"
              layoutStyle={reportStatLayoutStyle}
            />
            <MetricStatCard
              label={t('reports.active')}
              value={counts.active}
              accent={c.statusActive}
              tone="neutral"
              align="center"
              layoutStyle={reportStatLayoutStyle}
            />
            <MetricStatCard
              label={t('reports.dueSoon')}
              value={counts.dueSoon}
              accent={c.statusDueSoon}
              tone="neutral"
              align="center"
              layoutStyle={reportStatLayoutStyle}
            />
            <MetricStatCard
              label={t('reports.expired')}
              value={counts.expired}
              accent={c.statusExpired}
              tone="attention"
              align="center"
              layoutStyle={reportStatLayoutStyle}
            />
            <MetricStatCard
              label={t('reports.unpaid')}
              value={counts.unpaid}
              accent={c.statusUnpaid}
              tone="neutral"
              align="center"
              layoutStyle={reportStatLayoutStyle}
            />
            <MetricStatCard
              label={t('reports.former')}
              value={counts.former ?? 0}
              accent={c.statusNeutral}
              tone="neutral"
              align="center"
              layoutStyle={reportStatLayoutStyle}
            />
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

      {revenueSummary ? (
        <SoftSurface variant="panel" style={styles.revenueSummary}>
          <Text
            style={appTextStyle(language, {
              ...styles.revenuePeriod,
              ...(language === 'am' ? { textTransform: 'none', letterSpacing: 0 } : null),
            })}
          >
            {periodLabel}
          </Text>
          <Text
            latin
            display
            style={[
              metricDisplayStyle(styles.revenueTotal),
              isTablet ? metricDisplayStyle(styles.revenueTotalLg) : null,
            ]}
          >
            {formatEtb(Number(revenueSummary.total || 0), { forceCompact: false })}
          </Text>
          <Text style={styles.revenueMeta}>
            {t('reports.paymentsInPeriod', { count: revenueSummary.count ?? 0, period: periodLabel.toLowerCase() })}
          </Text>
          {revenueTrend.length > 0 ? <MiniBarChart data={revenueTrend} /> : null}
        </SoftSurface>
      ) : null}

      <SoftSurface variant="panel" style={styles.fullSection}>
        <Text display style={styles.fullTitle}>{t('reports.shareReport')}</Text>
        <Text style={styles.fullSub}>
          {t('reports.shareReportSub', { memberFilter: memberFilterLabel.toLowerCase(), period: periodLabel.toLowerCase() })}
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
      </SoftSurface>
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
      <SecondaryButton
        label={csvLoading ? '…' : t('common.exportCsv')}
        onPress={onCsv}
        disabled={disabled || csvLoading}
        loading={csvLoading}
        style={styles.exportBtn}
      />
      <PrimaryButton
        label={pdfLoading ? '…' : t('common.exportPdf')}
        onPress={onPdf}
        disabled={disabled || pdfLoading}
        loading={pdfLoading}
        style={styles.exportBtn}
      />
    </View>
  );
}
