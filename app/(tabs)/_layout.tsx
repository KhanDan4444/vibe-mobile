import { PlatformPressable } from '@react-navigation/elements';
import { Redirect, Tabs, router, usePathname, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, type ComponentProps } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppBootSplash } from '@/src/components/AppBootSplash';
import { AppHeaderRight } from '@/src/components/AppHeaderRight';
import { AppHeaderTitle } from '@/src/components/AppHeaderTitle';
import { AppTabBarIcon } from '@/src/components/AppTabBarIcon';
import { AppText as Text } from '@/src/components/AppText';
import { GymBootError } from '@/src/components/GymBootError';
import { MembersTabIcon } from '@/src/components/MembersTabIcon';
import { TabSwipeShell } from '@/src/components/TabSwipeShell';
import { useAuth } from '@/src/auth/AuthContext';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useNetwork } from '@/src/offline/NetworkProvider';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useTabBarMetrics } from '@/src/theme/tabBar';
import { DM_SANS, DM_SANS_SEMI, NOTO_ETHIOPIC, scaleLineHeight } from '@/src/theme/typography';
import { hasGymPortalAccess } from '@/src/utils/roles';

const headerRight = () => <AppHeaderRight />;
const TAB_ROUTES = [
  { segment: 'index', href: '/(tabs)' },
  { segment: 'members', href: '/(tabs)/members' },
  { segment: 'revenue', href: '/(tabs)/revenue' },
  { segment: 'check-in', href: '/(tabs)/check-in' },
  { segment: 'more', href: '/(tabs)/more' },
] as const;

function activeTabIndex(pathname: string) {
  if (pathname === '/' || pathname === '') return 0;
  const segment = pathname.split('/').filter(Boolean)[0] ?? 'index';
  const index = TAB_ROUTES.findIndex((route) => route.segment === segment);
  return index >= 0 ? index : 0;
}

function TabBarButton(props: ComponentProps<typeof PlatformPressable>) {
  return (
    <PlatformPressable
      {...props}
      pressOpacity={0.72}
      onPressIn={(e) => {
        void Haptics.selectionAsync();
        props.onPressIn?.(e);
      }}
    />
  );
}

export default function TabLayout() {
  const { user, loading } = useAuth();
  const { colors: c } = useTheme();
  const { language } = usePreferences();
  const { t } = useTranslation();
  const { isOnline } = useNetwork();
  const { tabIconSize, isTablet } = useResponsiveLayout();
  const { bottomPadding: tabBarBottom, totalHeight: tabBarHeight } = useTabBarMetrics();
  const pathname = usePathname();
  const tabLabelSize = isTablet ? 13 : 11;
  const tabLabelGap = isTablet ? 3 : 2;
  const tabBarTopPad = isTablet ? 5 : 3;
  const tabBarExtraBottom = 1;
  const tabIndex = activeTabIndex(pathname);
  const isAm = language === 'am';

  const renderLabel = (title: string) =>
    function TabLabel({ focused, color }: { focused: boolean; color: string }) {
      return (
        <Text
          fixedLayout
          style={[
            {
              color,
              marginTop: tabLabelGap,
              letterSpacing: focused ? 0.15 : 0,
              fontSize: tabLabelSize,
              lineHeight: tabLabelSize + 5,
              fontFamily: isAm ? NOTO_ETHIOPIC : focused ? DM_SANS_SEMI : DM_SANS,
              fontWeight: isAm ? (focused ? '600' : '500') : undefined,
              textAlign: 'center',
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      );
    };

  const goToTab = useCallback((nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= TAB_ROUTES.length) return;
    void Haptics.selectionAsync();
    router.navigate(TAB_ROUTES[nextIndex].href as Href);
  }, []);

  const onSwipeLeft = useCallback(() => goToTab(tabIndex + 1), [goToTab, tabIndex]);
  const onSwipeRight = useCallback(() => goToTab(tabIndex - 1), [goToTab, tabIndex]);

  if (loading) {
    return <AppBootSplash />;
  }

  if (!user || !hasGymPortalAccess(user.role)) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GymBootError />
      <TabSwipeShell
        onSwipeLeft={tabIndex < TAB_ROUTES.length - 1 ? onSwipeLeft : undefined}
        onSwipeRight={tabIndex > 0 ? onSwipeRight : undefined}
      >
        <Tabs
          screenOptions={{
            sceneStyle: { backgroundColor: c.bg },
            tabBarActiveTintColor: c.accentText,
            tabBarInactiveTintColor: c.dim,
            tabBarHideOnKeyboard: true,
            tabBarButton: TabBarButton,
            tabBarStyle: {
              backgroundColor: c.tabBarBg,
              borderTopColor: c.tabBarBorder,
              borderTopWidth: StyleSheet.hairlineWidth,
              paddingTop: tabBarTopPad,
              paddingBottom: tabBarBottom + tabBarExtraBottom,
              height: tabBarHeight + tabBarExtraBottom,
              elevation: 0,
              shadowOpacity: 0,
            },
            tabBarItemStyle: {
              paddingTop: 0,
              paddingBottom: 0,
            },
            tabBarIconStyle: {
              marginTop: 0,
              marginBottom: 0,
            },
            headerTitle: ({ children, tintColor }) => (
              <AppHeaderTitle tintColor={tintColor}>{children}</AppHeaderTitle>
            ),
            headerStyle: {
              backgroundColor: c.headerBg,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: c.tabBarBorder,
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTintColor: c.text,
            headerTitleStyle: isAm
              ? { fontFamily: NOTO_ETHIOPIC, fontWeight: '600', lineHeight: scaleLineHeight(22) }
              : { fontFamily: DM_SANS_SEMI, fontWeight: '600' },
            headerRight,
            // Root offline strip already owns the top inset.
            ...(!isOnline ? { safeAreaInsets: { top: 0 } } : {}),
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: t('tabs.dashboard'),
              tabBarLabel: renderLabel(t('tabs.dashboard')),
              tabBarIcon: ({ color, focused }) => (
                <AppTabBarIcon
                  name="stats-chart-outline"
                  nameFocused="stats-chart"
                  color={color}
                  size={tabIconSize}
                  focused={focused}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="members"
            options={{
              title: t('tabs.members'),
              tabBarLabel: renderLabel(t('tabs.members')),
              tabBarIcon: ({ color, focused }) => (
                <MembersTabIcon color={color} size={tabIconSize} focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="revenue"
            options={{
              title: t('tabs.revenue'),
              tabBarLabel: renderLabel(t('tabs.revenue')),
              tabBarIcon: ({ color, focused }) => (
                <AppTabBarIcon
                  name="cash-outline"
                  nameFocused="cash"
                  color={color}
                  size={tabIconSize}
                  focused={focused}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="check-in"
            options={{
              title: t('tabs.checkIn'),
              tabBarLabel: renderLabel(t('tabs.checkIn')),
              tabBarIcon: ({ color, focused }) => (
                <AppTabBarIcon
                  name="scan-outline"
                  nameFocused="scan"
                  color={color}
                  size={tabIconSize}
                  focused={focused}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="more"
            options={{
              title: t('tabs.more'),
              tabBarLabel: renderLabel(t('tabs.more')),
              tabBarIcon: ({ color, focused }) => (
                <AppTabBarIcon
                  name="ellipsis-horizontal-outline"
                  nameFocused="ellipsis-horizontal"
                  color={color}
                  size={tabIconSize}
                  focused={focused}
                />
              ),
            }}
          />
        </Tabs>
      </TabSwipeShell>
    </View>
  );
}
