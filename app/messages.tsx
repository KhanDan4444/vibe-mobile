import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '@/src/components/AppText';
import { ListFooterSkeleton, PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchMemberSms } from '@/src/api/memberSms';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { FilterPickerButton } from '@/src/components/FilterPickerButton';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { EmptyState } from '@/src/components/EmptyState';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useBranchScope } from '@/src/context/BranchContext';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { formatLogTimestamp } from '@/src/utils/date';
import {
  SMS_TYPE_FILTER_KEYS,
  formatSmsPreview,
  formatSmsType,
  smsTypeAccent,
  smsTypeIcon,
} from '@/src/utils/smsLabels';
import { branchDisplayName } from '@/src/utils/branchDisplayName';
import { statusWashOpaque } from '@/src/utils/statusWash';
import { useTranslation } from 'react-i18next';
import { isGymOwner } from '@/src/utils/roles';
import type { MemberSmsRow } from '@/src/types/api';

type SmsFilter = (typeof SMS_TYPE_FILTER_KEYS)[number]['value'];

function SmsItem({
  row,
  showBranch,
  isFirst,
  isLight,
  language,
  typeFiltered,
  onPress,
}: {
  row: MemberSmsRow;
  showBranch?: boolean;
  isFirst?: boolean;
  isLight: boolean;
  language: string;
  typeFiltered?: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const accent = smsTypeAccent(row.message_type, c);
  const preview = typeFiltered ? '' : formatSmsPreview(row.message_type, t);
  const phone = row.recipient_phone || row.member_phone || '—';
  const branch = row.branch_name ? branchDisplayName(row.branch_name) : null;
  const iconName = smsTypeIcon(row.message_type);

  const styles = useThemedStyles((theme) => ({
    row: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 14,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isLight ? 'rgba(15,23,42,0.06)' : 'rgba(228,231,238,0.08)',
      marginHorizontal: 14,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginTop: 1,
      // Light keeps a soft accent well; dark stays flat (no glow wash).
      borderWidth: isLight ? StyleSheet.hairlineWidth : 0,
      backgroundColor: isLight ? statusWashOpaque(accent, theme.card, 0.14) : 'transparent',
      borderColor: isLight ? statusWashOpaque(accent, theme.cardEdge, 0.35) : 'transparent',
    },
    body: { flex: 1, minWidth: 0 },
    headerRow: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      justifyContent: 'space-between' as const,
      gap: 10,
    },
    member: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600' as const,
      color: theme.text,
      letterSpacing: -0.2,
    },
    time: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: theme.dim,
      fontVariant: ['tabular-nums' as const],
      letterSpacing: -0.1,
      flexShrink: 0,
    },
    badgeRow: {
      marginTop: 5,
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      justifyContent: 'space-between' as const,
      gap: 8,
    },
    badgeBlock: {
      flex: 1,
      minWidth: 0,
    },
    badge: {
      alignSelf: 'flex-start' as const,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: statusWashOpaque(accent, theme.card, 0.12),
      borderColor: statusWashOpaque(accent, theme.cardEdge, 0.32),
    },
    badgeText: { fontSize: 11, fontWeight: '600' as const, color: accent },
    sentRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      flexShrink: 0,
      marginTop: 2,
    },
    sentBadgeText: {
      fontSize: 11,
      fontWeight: '700' as const,
      letterSpacing: 0.1,
      textTransform: 'lowercase' as const,
      color: accent,
    },
    preview: { marginTop: 4, fontSize: 12, lineHeight: 16, color: theme.muted },
    meta: {
      marginTop: 6,
      fontSize: 12,
      lineHeight: 16,
      color: theme.dim,
    },
  }));

  const metaParts = [phone];
  if (showBranch && branch) metaParts.push(branch);
  const metaLine = metaParts.join(' · ');

  return (
    <View>
      {!isFirst ? <View style={styles.divider} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${row.member_name}, ${formatSmsType(row.message_type, t)}`}
        onPress={onPress}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={iconName} size={17} color={isLight ? accent : c.muted} />
        </View>
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.member} numberOfLines={1}>
              {row.member_name}
            </Text>
            <Text style={styles.time}>{formatLogTimestamp(row.sent_at, t, language)}</Text>
          </View>
          <View style={styles.badgeRow}>
            <View style={styles.badgeBlock}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{formatSmsType(row.message_type, t)}</Text>
              </View>
              {preview ? (
                <Text style={styles.preview} numberOfLines={2}>
                  {preview}
                </Text>
              ) : null}
            </View>
            <View style={styles.sentRow}>
              <Ionicons name="checkmark-circle" size={15} color={accent} />
              <Text style={styles.sentBadgeText}>{t('messages.sentBadge')}</Text>
            </View>
          </View>
          <Text latin style={styles.meta} numberOfLines={1}>
            {metaLine}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { selectedBranchId, showBranchFilter } = useBranchScope();
  const { colors: c, theme } = useTheme();
  const { language } = usePreferences();
  const isLight = theme === 'light';
  const { t } = useTranslation();
  const { pagePadding } = useResponsiveLayout();
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.bg },
    filters: { paddingTop: 10, paddingBottom: 10 },
    listWrap: { flex: 1 },
    statusMeta: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.dim,
      marginBottom: 10,
      letterSpacing: -0.1,
    },
    listCard: {
      flex: 1,
      paddingVertical: 4,
      paddingHorizontal: 0,
      overflow: 'hidden' as const,
    },
    listContent: { paddingBottom: 24, flexGrow: 1 },
    emptyWrap: { paddingVertical: 8 },
  }));

  const branchKey = selectedBranchId === 'all' ? 'all' : selectedBranchId;
  const [typeFilter, setTypeFilter] = useState<SmsFilter>('all');
  const canViewMessages = Boolean(user && isGymOwner(user.role));
  const typeFiltered = typeFilter !== 'all';
  const lang = language || 'en';

  const query = useInfiniteQuery({
    queryKey: ['member-sms', typeFilter, branchKey],
    queryFn: ({ pageParam = 1 }) =>
      fetchMemberSms(token!, {
        page: pageParam,
        limit: 25,
        type: typeFilter,
        ...(selectedBranchId !== 'all' ? { branch_id: selectedBranchId } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: Boolean(token && canViewMessages),
  });

  const typeOptions = useMemo(
    () =>
      SMS_TYPE_FILTER_KEYS.map((f) => ({
        value: f.value,
        label: t(f.labelKey),
        color: f.value === 'all' ? c.statusNeutral : smsTypeAccent(f.value, c),
      })),
    [t, c],
  );

  const filterLabel = useMemo(() => {
    const match = SMS_TYPE_FILTER_KEYS.find((f) => f.value === typeFilter);
    return match ? t(match.labelKey) : t('messages.filterAll');
  }, [typeFilter, t]);

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  const statusLine =
    total > 0
      ? t('messages.statusLine', { count: total, filter: filterLabel })
      : t('messages.statusLineEmpty');

  if (!canViewMessages) {
    return <Redirect href="/(tabs)/more" />;
  }

  return (
    <TabScreenFrame>
      <View style={styles.container}>
        <BranchFilterBar horizontalPadding={pagePadding} />
        <View style={[styles.filters, { paddingHorizontal: pagePadding }]}>
          <FilterPickerButton
            label={t('messages.filterLabel')}
            sheetTitle={t('messages.filterLabel')}
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeOptions}
          />
        </View>

        {query.isLoading ? (
          <PageSkeleton variant="messages" />
        ) : query.isError ? (
          <LoadError
            message={query.error instanceof Error ? query.error.message : undefined}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <View style={[styles.listWrap, { paddingHorizontal: pagePadding }]}>
            {items.length > 0 ? <Text style={styles.statusMeta}>{statusLine}</Text> : null}
            <SoftSurface variant="panel" flat style={styles.listCard}>
              <FlatList
                data={items}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item, index }) => (
                  <SmsItem
                    row={item}
                    showBranch={showBranchFilter && selectedBranchId === 'all'}
                    isFirst={index === 0}
                    isLight={isLight}
                    language={lang}
                    typeFiltered={typeFiltered}
                    onPress={() => router.push(`/member/${item.member_id}`)}
                  />
                )}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl
                    refreshing={query.isRefetching}
                    onRefresh={() => query.refetch()}
                    tintColor={c.accentText}
                  />
                }
                onEndReached={() => {
                  if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
                }}
                onEndReachedThreshold={0.4}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <EmptyState
                      icon="chatbubble-ellipses-outline"
                      title={t('messages.emptyTitle')}
                      body={t('messages.emptyBody')}
                    />
                  </View>
                }
                ListFooterComponent={query.isFetchingNextPage ? <ListFooterSkeleton /> : null}
              />
            </SoftSurface>
          </View>
        )}
      </View>
    </TabScreenFrame>
  );
}
