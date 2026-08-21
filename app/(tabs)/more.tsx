import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { ResponsiveContent } from '@/src/components/ResponsiveContent';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { isGymOwner } from '@/src/utils/roles';

type MenuItem = {
  labelKey: keyof typeof MENU_KEYS;
  subtitleKey?: keyof typeof MENU_KEYS;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  ownerOnly?: boolean;
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
  { labelKey: 'plans', subtitleKey: 'plansSub', icon: 'barbell-outline', route: '/plans' },
  { labelKey: 'activity', subtitleKey: 'activitySub', icon: 'time-outline', route: '/activity', ownerOnly: true },
  { labelKey: 'team', subtitleKey: 'teamSub', icon: 'people-outline', route: '/team', ownerOnly: true },
  { labelKey: 'branches', subtitleKey: 'branchesSub', icon: 'business-outline', route: '/branches', ownerOnly: true },
  { labelKey: 'messages', subtitleKey: 'messagesSub', icon: 'chatbubble-outline', route: '/messages', ownerOnly: true },
  { labelKey: 'reports', subtitleKey: 'reportsSub', icon: 'document-text-outline', route: '/reports' },
];

export default function MoreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const { pagePadding } = useResponsiveLayout();
  const owner = isGymOwner(user?.role);

  const items = MENU.filter((item) => !item.ownerOnly || owner);

  return (
    <TabScreenFrame>
      <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
        <ResponsiveContent style={{ paddingHorizontal: pagePadding }}>
          <Text style={[styles.hint, { color: c.dim }]}>{t('more.hint')}</Text>

          <View style={styles.menuGrid}>
            {items.map((item) => (
              <SoftSurface key={item.route} onPress={() => router.push(item.route as never)} style={styles.row}>
                <Ionicons name={item.icon} size={22} color={c.muted} style={styles.rowIcon} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: c.text }]}>{t(MENU_KEYS[item.labelKey])}</Text>
                  {item.subtitleKey ? (
                    <Text style={[styles.rowSub, { color: c.dim }]}>{t(MENU_KEYS[item.subtitleKey])}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.dim} />
              </SoftSurface>
            ))}
          </View>
        </ResponsiveContent>
      </ScrollView>
    </TabScreenFrame>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40, flexGrow: 1 },
  hint: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  menuGrid: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rowIcon: { marginRight: 14 },
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  rowSub: { marginTop: 3, fontSize: 13 },
});
