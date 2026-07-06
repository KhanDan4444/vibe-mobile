import { Redirect, Tabs, router, usePathname } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppHeaderRight } from '@/src/components/AppHeaderRight';
import { GymBootError } from '@/src/components/GymBootError';
import { MembersTabIcon } from '@/src/components/MembersTabIcon';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { TabSwipeShell } from '@/src/components/TabSwipeShell';
import { useAuth } from '@/src/auth/AuthContext';
import { useTheme } from '@/src/context/PreferencesContext';
import { hasGymPortalAccess } from '@/src/utils/roles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const headerRight = () => <AppHeaderRight />;
const TAB_ROUTES = [
  { segment: 'index', href: '/(tabs)' },
  { segment: 'members', href: '/(tabs)/members' },
  { segment: 'revenue', href: '/(tabs)/revenue' },
  { segment: 'plans', href: '/(tabs)/plans' },
  { segment: 'more', href: '/(tabs)/more' },
] as const;

function activeTabIndex(pathname: string) {
  if (pathname === '/' || pathname === '') return 0;
  const segment = pathname.split('/').filter(Boolean)[0] ?? 'index';
  const index = TAB_ROUTES.findIndex((route) => route.segment === segment);
  return index >= 0 ? index : 0;
}

export default function TabLayout() {
  const { user, loading } = useAuth();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const tabBarBottom = Math.max(insets.bottom, 6);
  const tabIndex = activeTabIndex(pathname);

  const goToTab = useCallback((nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= TAB_ROUTES.length) return;
    router.navigate(TAB_ROUTES[nextIndex].href);
  }, []);

  const onSwipeLeft = useCallback(() => goToTab(tabIndex + 1), [goToTab, tabIndex]);
  const onSwipeRight = useCallback(() => goToTab(tabIndex - 1), [goToTab, tabIndex]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  if (!user || !hasGymPortalAccess(user.role)) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <OfflineBanner />
      <GymBootError />
      <TabSwipeShell
        onSwipeLeft={tabIndex < TAB_ROUTES.length - 1 ? onSwipeLeft : undefined}
        onSwipeRight={tabIndex > 0 ? onSwipeRight : undefined}
      >
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: c.accentText,
            tabBarInactiveTintColor: c.dim,
            tabBarStyle: {
              backgroundColor: c.tabBarBg,
              borderTopColor: c.tabBarBorder,
              paddingBottom: tabBarBottom,
              height: 52 + tabBarBottom,
            },
            headerStyle: { backgroundColor: c.headerBg },
            headerTintColor: c.text,
            headerTitleStyle: { fontWeight: '600' },
            headerRight,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: t('tabs.dashboard'),
              tabBarIcon: ({ color }) => <Ionicons name="stats-chart" color={color} size={24} />,
            }}
          />
          <Tabs.Screen
            name="members"
            options={{
              title: t('tabs.members'),
              tabBarIcon: ({ color }) => <MembersTabIcon color={color} />,
            }}
          />
          <Tabs.Screen
            name="revenue"
            options={{
              title: t('tabs.revenue'),
              tabBarIcon: ({ color }) => <Ionicons name="cash" color={color} size={24} />,
            }}
          />
          <Tabs.Screen
            name="plans"
            options={{
              title: t('tabs.plans'),
              tabBarIcon: ({ color }) => <Ionicons name="barbell" color={color} size={24} />,
            }}
          />
          <Tabs.Screen
            name="more"
            options={{
              title: t('tabs.more'),
              tabBarIcon: ({ color }) => <Ionicons name="menu" color={color} size={24} />,
            }}
          />
        </Tabs>
      </TabSwipeShell>
    </View>
  );
}
