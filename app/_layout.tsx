import '@/src/i18n';
import { Redirect, Stack } from 'expo-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, LogBox, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from '@/src/auth/AuthContext';
import { BranchProvider } from '@/src/context/BranchContext';
import { FlashProvider } from '@/src/context/FlashContext';
import { GymBootProvider } from '@/src/context/GymBootContext';
import { PreferencesProvider, usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { NotificationInboxProvider } from '@/src/notifications/NotificationInboxContext';
import { NetworkProvider } from '@/src/offline/NetworkProvider';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { SubscriptionLockout } from '@/src/components/SubscriptionLockout';
import { PERSISTED_QUERY_KEYS, queryClient, QUERY_CACHE_STORAGE_KEY } from '@/src/query/client';
import { SystemChrome } from '@/src/theme/SystemChrome';
import { DM_SANS_SEMI, NOTO_ETHIOPIC, lineHeightFor } from '@/src/theme/typography';
import { useAppFonts } from '@/src/theme/useAppFonts';

SplashScreen.preventAutoHideAsync().catch(() => {});

if (__DEV__) {
  LogBox.ignoreLogs(['Unable to activate keep awake']);
}

const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: QUERY_CACHE_STORAGE_KEY });

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const { loaded: fontsLoaded } = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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

  const stackScreen = {
    headerShown: true as const,
    headerStyle: { backgroundColor: c.headerBg },
    headerTintColor: c.text,
    headerTitleStyle:
      language === 'am'
        ? ({ fontFamily: NOTO_ETHIOPIC, fontWeight: '600' as const, lineHeight: lineHeightFor(17) })
        : ({ fontFamily: DM_SANS_SEMI, fontWeight: '600' as const }),
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
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
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SystemChrome />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
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
      {/* After Stack so Sync modal / chip stay above navigation touch targets */}
      {user ? <OfflineBanner /> : null}
    </View>
  );
}
