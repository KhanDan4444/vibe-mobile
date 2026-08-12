import '@/src/i18n';
import { Stack } from 'expo-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, LogBox, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from '@/src/auth/AuthContext';
import { BootSplashProvider, useBootSplash } from '@/src/context/BootSplashContext';
import { BranchProvider } from '@/src/context/BranchContext';
import { FlashProvider } from '@/src/context/FlashContext';
import { GymBootProvider } from '@/src/context/GymBootContext';
import { PreferencesProvider, usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { NotificationInboxProvider } from '@/src/notifications/NotificationInboxContext';
import { NetworkProvider, useNetwork } from '@/src/offline/NetworkProvider';
import { OfflineStatusStrip, OfflineSyncOverlay } from '@/src/components/OfflineBanner';
import { AppBootSplash, BOOT_SPLASH_BG_DARK, bootSplashExiting } from '@/src/components/AppBootSplash';
import { SubscriptionLockout } from '@/src/components/SubscriptionLockout';
import { PERSISTED_QUERY_KEYS, queryClient, QUERY_CACHE_STORAGE_KEY } from '@/src/query/client';
import { SystemChrome } from '@/src/theme/SystemChrome';
import { NOTO_ETHIOPIC, SPACE_GROTESK_SEMI, lineHeightFor } from '@/src/theme/typography';
import { useAppFonts } from '@/src/theme/useAppFonts';

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 0, fade: false });

if (__DEV__) {
  LogBox.ignoreLogs(['Unable to activate keep awake']);
}

const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: QUERY_CACHE_STORAGE_KEY });

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const { loaded: fontsLoaded } = useAppFonts();

  if (!fontsLoaded) return <AppBootSplash />;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === 'success' && PERSISTED_QUERY_KEYS.has(String(query.queryKey[0])),
        },
      }}
    >
      <AuthProvider>
        <PreferencesProvider>
          <BootSplashProvider>
            <BranchProvider>
              <GymBootProvider>
                <NotificationInboxProvider>
                  <NetworkProvider>
                    <FlashProvider>
                      <RootNavigator />
                    </FlashProvider>
                  </NetworkProvider>
                </NotificationInboxProvider>
              </GymBootProvider>
            </BranchProvider>
          </BootSplashProvider>
        </PreferencesProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}

function RootNavigator() {
  const { loading, subscription, user } = useAuth();
  const { colors: c } = useTheme();
  const { language } = usePreferences();
  const { t } = useTranslation();
  const { isOnline } = useNetwork();
  const { bootVisible, dismissBootSplash } = useBootSplash();

  // Logged-in cold start: tabs never hit login's onHeroReady — dismiss once auth is ready.
  useEffect(() => {
    if (!loading && user) dismissBootSplash();
  }, [loading, user, dismissBootSplash]);

  useEffect(() => {
    if (
      !loading &&
      (subscription?.accessDenied || subscription?.locked || subscription?.status === 'expired')
    ) {
      dismissBootSplash();
    }
  }, [loading, subscription, dismissBootSplash]);

  const stackScreen = {
    headerShown: true as const,
    headerStyle: { backgroundColor: c.headerBg },
    headerTintColor: c.text,
    headerTitleStyle:
      language === 'am'
        ? ({ fontFamily: NOTO_ETHIOPIC, fontWeight: '600' as const, lineHeight: lineHeightFor(17) })
        : ({ fontFamily: SPACE_GROTESK_SEMI, fontWeight: '600' as const }),
    ...(user && !isOnline ? { safeAreaInsets: { top: 0 } } : {}),
  };

  if (loading) {
    return <AppBootSplash />;
  }

  if (subscription?.accessDenied || subscription?.locked || subscription?.status === 'expired') {
    return (
      <>
        <SystemChrome />
        <SubscriptionLockout />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bootVisible ? BOOT_SPLASH_BG_DARK : c.bg }}>
      <SystemChrome />
      {user ? <OfflineStatusStrip /> : null}
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: bootVisible ? BOOT_SPLASH_BG_DARK : c.bg },
            ...(user && !isOnline ? { safeAreaInsets: { top: 0 } } : {}),
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="register-gym" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="account" options={{ ...stackScreen, title: t('screens.account') }} />
          <Stack.Screen name="member/[id]" options={{ ...stackScreen, title: t('screens.member') }} />
          <Stack.Screen name="enroll" options={{ ...stackScreen, title: t('screens.enroll') }} />
          <Stack.Screen name="renew/[id]" options={{ ...stackScreen, title: t('screens.renew') }} />
          <Stack.Screen name="payment/[id]" options={{ ...stackScreen, title: t('screens.recordPayment') }} />
          <Stack.Screen name="change-plan/[id]" options={{ ...stackScreen, title: t('screens.changePlan') }} />
          <Stack.Screen name="member/[id]/edit" options={{ ...stackScreen, title: t('screens.editMember') }} />
          <Stack.Screen name="transfer/[id]" options={{ ...stackScreen, title: t('screens.transfer') }} />
          <Stack.Screen name="plan/new" options={{ ...stackScreen, title: t('screens.newPlan') }} />
          <Stack.Screen name="plan/[id]/edit" options={{ ...stackScreen, title: t('screens.editPlan') }} />
          <Stack.Screen name="payment/edit/[id]" options={{ ...stackScreen, title: t('screens.editPayment') }} />
          <Stack.Screen name="team/index" options={{ ...stackScreen, title: t('screens.team') }} />
          <Stack.Screen name="team/new" options={{ ...stackScreen, title: t('screens.addStaff') }} />
          <Stack.Screen name="team/[id]/edit" options={{ ...stackScreen, title: t('screens.editStaff') }} />
          <Stack.Screen name="branches/index" options={{ ...stackScreen, title: t('screens.branches') }} />
          <Stack.Screen name="branch/new" options={{ ...stackScreen, title: t('screens.newBranch') }} />
          <Stack.Screen name="branch/[id]/edit" options={{ ...stackScreen, title: t('screens.editBranch') }} />
          <Stack.Screen name="messages" options={{ ...stackScreen, title: t('screens.memberSms') }} />
          <Stack.Screen name="activity" options={{ ...stackScreen, title: t('tabs.activity') }} />
          <Stack.Screen name="profile" options={{ ...stackScreen, title: t('screens.gymProfile') }} />
          <Stack.Screen name="change-password" options={{ ...stackScreen, title: t('screens.changePassword') }} />
          <Stack.Screen name="reports" options={{ ...stackScreen, title: t('screens.reports') }} />
        </Stack>
      </View>
      {user ? <OfflineSyncOverlay /> : null}

      {/* Cover the index→login redirect gap so users never see a blank slate shell. */}
      {bootVisible ? (
        <Animated.View
          style={styles.bootOverlay}
          pointerEvents="auto"
          exiting={bootSplashExiting}
        >
          <AppBootSplash />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bootOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
});
