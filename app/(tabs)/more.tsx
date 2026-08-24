import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppText as Text } from '@/src/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { ResponsiveContent } from '@/src/components/ResponsiveContent';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { timings } from '@/src/theme/motion';
import { useTabBarOverlayInset } from '@/src/theme/tabBar';
import { radiusMd } from '@/src/theme/tokens';
import { isGymOwner } from '@/src/utils/roles';

type MenuItem = {
  labelKey: keyof typeof MENU_KEYS;
  subtitleKey?: keyof typeof MENU_KEYS;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  ownerOnly?: boolean;
  section: 'gym' | 'insights';
};

const MENU_KEYS = {
  plans: 'more.plans',
  plansSub: 'more.plansSub',
  activity: 'more.activity',
  activitySub: 'more.activitySub',
  team: 'more.team',
  teamSub: 'more.teamSub',
  branches: 'more.branches',
  branchesSub: 'more.branchesSub',
  messages: 'more.messages',
  messagesSub: 'more.messagesSub',
  reports: 'more.reports',
  reportsSub: 'more.reportsSub',
} as const;

const MENU: MenuItem[] = [
  { labelKey: 'plans', subtitleKey: 'plansSub', icon: 'barbell-outline', route: '/plans', section: 'gym' },
  { labelKey: 'team', subtitleKey: 'teamSub', icon: 'people-outline', route: '/team', ownerOnly: true, section: 'gym' },
  {
    labelKey: 'branches',
    subtitleKey: 'branchesSub',
    icon: 'business-outline',
    route: '/branches',
    ownerOnly: true,
    section: 'gym',
  },
  {
    labelKey: 'activity',
    subtitleKey: 'activitySub',
    icon: 'time-outline',
    route: '/activity',
    ownerOnly: true,
    section: 'insights',
  },
  {
    labelKey: 'messages',
    subtitleKey: 'messagesSub',
    icon: 'chatbubble-outline',
    route: '/messages',
    ownerOnly: true,
    section: 'insights',
  },
  {
    labelKey: 'reports',
    subtitleKey: 'reportsSub',
    icon: 'document-text-outline',
    route: '/reports',
    section: 'insights',
  },
];

function MenuRow({
  item,
  showDivider,
  onPress,
}: {
  item: MenuItem;
  showDivider: boolean;
  onPress: () => void;
}) {
  const { colors: c, theme } = useTheme();
  const { t } = useTranslation();
  const isLight = theme === 'light';

  return (
    <View>
      {showDivider ? <View style={[styles.divider, { backgroundColor: c.border }]} /> : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t(MENU_KEYS[item.labelKey])}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.72 }]}
      >
        <View style={[styles.iconWell, { backgroundColor: isLight ? c.accentSoft : c.inputBg }]}>
          <Ionicons name={item.icon} size={20} color={isLight ? c.accentText : c.muted} />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, { color: c.text }]}>{t(MENU_KEYS[item.labelKey])}</Text>
          {item.subtitleKey ? (
            <Text style={[styles.rowSub, { color: c.dim }]} numberOfLines={1}>
              {t(MENU_KEYS[item.subtitleKey])}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={c.dim} />
      </Pressable>
    </View>
  );
}

function MenuSection({
  title,
  items,
  delay,
}: {
  title: string;
  items: MenuItem[];
  delay: number;
}) {
  const router = useRouter();
  const { colors: c } = useTheme();
  if (items.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(timings.fadeMs).delay(delay)}>
      <Text style={[styles.sectionLabel, { color: c.dim }]}>{title}</Text>
      <SoftSurface variant="group" flat style={styles.group}>
        {items.map((item, index) => (
          <MenuRow
            key={item.route}
            item={item}
            showDivider={index > 0}
            onPress={() => router.push(item.route as never)}
          />
        ))}
      </SoftSurface>
    </Animated.View>
  );
}

export default function MoreScreen() {
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const { pagePadding } = useResponsiveLayout();
  const tabOverlayInset = useTabBarOverlayInset();
  const owner = isGymOwner(user?.role);

  const { gymItems, insightItems } = useMemo(() => {
    const visible = MENU.filter((item) => !item.ownerOnly || owner);
    return {
      gymItems: visible.filter((item) => item.section === 'gym'),
      insightItems: visible.filter((item) => item.section === 'insights'),
    };
  }, [owner]);

  return (
    <TabScreenFrame>
      <ScrollView
        style={[styles.container, { backgroundColor: c.bg }]}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + tabOverlayInset }]}
      >
        <ResponsiveContent style={{ paddingHorizontal: pagePadding }}>
          <View style={styles.sections}>
            <MenuSection title={t('more.sectionGym')} items={gymItems} delay={40} />
            <MenuSection title={t('more.sectionInsights')} items={insightItems} delay={100} />
          </View>
        </ResponsiveContent>
      </ScrollView>
    </TabScreenFrame>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40, flexGrow: 1 },
  sections: { gap: 22 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  group: {
    paddingVertical: 2,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 16, fontWeight: '600', letterSpacing: -0.15 },
  rowSub: { marginTop: 2, fontSize: 13, lineHeight: 18 },
});
