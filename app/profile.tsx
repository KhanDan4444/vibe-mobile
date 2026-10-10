import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import {
  createGymTelegramLink,
  fetchGymProfile,
  unlinkGymTelegram,
  updateGymProfile,
} from '@/src/api/profile';
import { FormSuccessView } from '@/src/components/FormSuccessView';
import { EthiopianPhoneField } from '@/src/components/EthiopianPhoneField';
import { ErrorBanner, Field, Label, PrimaryButton, Screen, SecondaryButton } from '@/src/components/Form';
import { PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { TelegramLinkShareRow } from '@/src/components/TelegramLinkShareRow';
import { TelegramLinkStatusRow } from '@/src/components/TelegramLinkStatusRow';
import { SupportContactLine } from '@/src/components/SupportContactLine';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { isOfflineQueued } from '@/src/offline/types';
import { useOfflineFlash } from '@/src/hooks/useSaveFlash';
import { useLoadRetry } from '@/src/hooks/useLoadRetry';
import { runInBackground } from '@/src/utils/runInBackground';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import { isGymOwner } from '@/src/utils/roles';
import type { UpdateProfilePayload } from '@/src/types/api';

type ProfileDone = {
  gymName: string;
  ownerName: string;
  phone?: string;
  username?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, subscription, updateGymName } = useAuth();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const { formMaxWidth, pagePadding } = useResponsiveLayout();

  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState<ProfileDone | null>(null);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramConfigured, setTelegramConfigured] = useState(false);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramError, setTelegramError] = useState('');
  const flashOffline = useOfflineFlash();
  const canEditProfile = Boolean(user && isGymOwner(user.role));
  const readOnly = Boolean(subscription?.readOnly);

  const profileQuery = useQuery({
    queryKey: ['gym-profile'],
    queryFn: () => fetchGymProfile(token!),
    enabled: Boolean(token && canEditProfile),
  });

  const loadRetry = useLoadRetry(profileQuery);

  useEffect(() => {
    if (!profileQuery.data) return;
    setGymName(profileQuery.data.gym.name);
    setOwnerName(profileQuery.data.gym.owner_name);
    setPhone(profileQuery.data.gym.phone || '');
    setEmail(profileQuery.data.user.email || '');
    setUsername(profileQuery.data.user.username || '');
    setTelegramLinked(
      Boolean(profileQuery.data.gym.telegram_linked || profileQuery.data.gym.telegram_chat_id)
    );
    setTelegramConfigured(Boolean(profileQuery.data.telegram_configured));
  }, [profileQuery.data]);

  useEffect(() => {
    if (!token || telegramLinked || !telegramLink) return undefined;
    const id = setInterval(() => {
      void fetchGymProfile(token)
        .then((data) => {
          if (data.gym?.telegram_linked || data.gym?.telegram_chat_id) {
            setTelegramLinked(true);
            setTelegramLink(null);
            queryClient.invalidateQueries({ queryKey: ['gym-profile'] });
          }
        })
        .catch(() => undefined);
    }, 2500);
    return () => clearInterval(id);
  }, [token, telegramLinked, telegramLink, queryClient]);

  const onGetTelegramLink = useCallback(async () => {
    if (!token || telegramBusy) return;
    setTelegramBusy(true);
    setTelegramError('');
    try {
      const data = await createGymTelegramLink(token);
      if (data.already_linked || data.telegram_linked) {
        setTelegramLinked(true);
        setTelegramLink(null);
      } else if (data.link) {
        setTelegramLink(data.link);
      }
    } catch (err) {
      setTelegramError(
        userFacingApiMessage(err, t('auth.connectionFailed'), t('profile.telegramLinkFailed'))
      );
    } finally {
      setTelegramBusy(false);
    }
  }, [token, telegramBusy, t]);

  const onUnlinkTelegram = useCallback(async () => {
    if (!token || telegramBusy) return;
    setTelegramBusy(true);
    setTelegramError('');
    try {
      await unlinkGymTelegram(token);
      setTelegramLinked(false);
      setTelegramLink(null);
      queryClient.invalidateQueries({ queryKey: ['gym-profile'] });
    } catch (err) {
      setTelegramError(
        userFacingApiMessage(err, t('auth.connectionFailed'), t('profile.telegramUnlinkFailed'))
      );
    } finally {
      setTelegramBusy(false);
    }
  }, [token, telegramBusy, t, queryClient]);

  const onShareTelegramLink = useCallback(async () => {
    if (!telegramLink) return;
    try {
      await Share.share({ message: telegramLink });
    } catch {
      /* user dismissed */
    }
  }, [telegramLink]);

  const mutation = useOfflineMutation({
    jobType: 'update-profile',
    mutationFn: (payload: UpdateProfilePayload) => updateGymProfile(token!, payload),
    onSuccess: (data) => {
      if (isOfflineQueued(data)) {
        flashOffline();
        router.back();
        return;
      }
      const nextGym = gymName.trim();
      setDone({
        gymName: nextGym,
        ownerName: ownerName.trim(),
        phone: phone.trim() || undefined,
        username: username.trim() || undefined,
      });
      runInBackground(updateGymName(nextGym));
      queryClient.invalidateQueries({ queryKey: ['gym-profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!canEditProfile) {
    return <Redirect href="/(tabs)/more" />;
  }

  if (loadRetry.showLoading) {
    return (
      <Screen>
        <PageSkeleton variant="form" />
      </Screen>
    );
  }

  if (loadRetry.showError) {
    return (
      <Screen>
        <LoadError
          message={profileQuery.error instanceof Error ? profileQuery.error.message : undefined}
          loading={loadRetry.loading}
          onRetry={loadRetry.onRetry}
        />
      </Screen>
    );
  }

  const canSubmit = gymName.trim().length > 0 && ownerName.trim().length > 0;

  const telegramSection = (
    <View style={styles.telegramBlock}>
      <Text style={[styles.section, styles.sectionFirst, { color: c.muted }]}>
        {t('profile.telegramSection')}
      </Text>
      <Text style={[styles.hint, { color: c.muted }]}>{t('profile.telegramHint')}</Text>
      {telegramError ? <ErrorBanner message={telegramError} /> : null}
      {telegramLinked ? (
        <TelegramLinkStatusRow
          variant="panel"
          disabled={telegramBusy}
          onUnlink={() => void onUnlinkTelegram()}
        />
      ) : telegramConfigured ? (
        <View style={{ marginTop: 10, gap: 10 }}>
          <SecondaryButton
            label={t('profile.telegramGetLink')}
            onPress={() => void onGetTelegramLink()}
            loading={telegramBusy}
            disabled={telegramBusy}
          />
          {telegramBusy && !telegramLink ? <ActivityIndicator color={c.link} /> : null}
          {telegramLink ? (
            <TelegramLinkShareRow
              link={telegramLink}
              shareLabel={t('checkIn.telegramLinkShare')}
              onShare={() => void onShareTelegramLink()}
            />
          ) : null}
        </View>
      ) : (
        <Text style={[styles.hint, { color: c.muted, marginTop: 8 }]}>
          {t('profile.telegramNotConfigured')}
        </Text>
      )}
    </View>
  );

  if (done) {
    const rows = [
      { label: t('forms.ownerName'), value: done.ownerName },
      done.username ? { label: t('forms.username'), value: `@${done.username}`, latin: true } : null,
      done.phone ? { label: t('forms.phone'), value: done.phone, latin: true } : null,
    ].filter(Boolean) as { label: string; value: string; latin?: boolean }[];

    return (
      <Screen>
        <TabScreenFrame>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingHorizontal: pagePadding, alignItems: 'center' }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ width: '100%', maxWidth: formMaxWidth }}>
              <FormSuccessView
                title={t('forms.successAllSet')}
                hero={done.gymName}
                body={t('forms.profileSuccessBody')}
                rows={rows}
                ctaLabel={t('common.done')}
                onCta={() => router.back()}
              />
            </View>
          </ScrollView>
        </TabScreenFrame>
      </Screen>
    );
  }

  if (readOnly) {
    return (
      <Screen>
        <TabScreenFrame>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingHorizontal: pagePadding, alignItems: 'center' }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ width: '100%', maxWidth: formMaxWidth }}>
              <Text style={[styles.readOnly, { color: c.muted }]}>{t('common.readOnly')}</Text>
              {telegramSection}
              <SupportContactLine withSection />
            </View>
          </ScrollView>
        </TabScreenFrame>
      </Screen>
    );
  }

  return (
    <Screen>
      <TabScreenFrame>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingHorizontal: pagePadding, alignItems: 'center' }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ width: '100%', maxWidth: formMaxWidth }}>
              <ErrorBanner message={error} />

              <Text style={[styles.section, styles.sectionFirst, { color: c.muted }]}>
                {t('profile.gymSection')}
              </Text>
              <Label>{t('forms.gymName')}</Label>
              <Field
                value={gymName}
                onChangeText={setGymName}
                autoCapitalize="words"
                textContentType="organizationName"
                autoComplete="organization"
              />

              <Label>{t('forms.ownerName')}</Label>
              <Field
                value={ownerName}
                onChangeText={setOwnerName}
                autoCapitalize="words"
                textContentType="name"
                autoComplete="name"
              />

              <Label>{t('forms.phone')}</Label>
              <EthiopianPhoneField value={phone} onChangeText={setPhone} />

              {telegramSection}

              <SupportContactLine withSection />

              <Text style={[styles.section, { color: c.muted }]}>{t('profile.loginSection')}</Text>
              <Label>{t('forms.email')}</Label>
              <Field
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />

              <Label>{t('forms.username')}</Label>
              <Field
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                textContentType="username"
                autoComplete="username"
              />

              <PrimaryButton
                label={t('common.save')}
                onPress={() => {
                  setError('');
                  mutation.mutate({
                    gym_name: gymName.trim(),
                    name: ownerName.trim(),
                    phone: phone.trim() || undefined,
                    email: email.trim() || undefined,
                    username: username.trim() || undefined,
                  });
                }}
                loading={mutation.isPending}
                disabled={!canSubmit || mutation.isPending}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TabScreenFrame>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // TabScreenFrame already insets under the nav header — avoid stacking extra top pad.
  content: { paddingTop: 0, paddingBottom: 40 },
  section: {
    marginTop: 20,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionFirst: { marginTop: 0 },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  telegramBlock: { marginTop: 20 },
  readOnly: { paddingBottom: 12, fontSize: 15, lineHeight: 22 },
});
