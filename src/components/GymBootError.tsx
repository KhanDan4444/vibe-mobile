import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { SupportContactLine } from '@/src/components/SupportContactLine';
import { PrimaryButton } from '@/src/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';
import { useAuth } from '@/src/auth/AuthContext';
import { useGymBoot } from '@/src/context/GymBootContext';
import { ApiError } from '@/src/api/client';
import { isNetworkApiError, userFacingApiMessage } from '@/src/utils/apiErrorMessage';

function isLicenseBlockedError(error: Error | null): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.code === 'SUBSCRIPTION_EXPIRED' || error.code === 'GYM_REMOVED' || error.code === 'SUBSCRIPTION_INACTIVE') {
    return true;
  }
  return error.status === 403 && /expired|no longer on the platform|not active/i.test(error.message);
}

export function GymBootError() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const { logout } = useAuth();
  const { bootError, retrying, retryBoot } = useGymBoot();

  if (!bootError) return null;

  const licenseBlocked = isLicenseBlockedError(bootError);
  const showDevDetail = typeof __DEV__ !== 'undefined' && __DEV__;
  const title = licenseBlocked ? t('lockout.title') : t('gymBoot.errorTitle');
  const body = licenseBlocked
    ? t('lockout.body')
    : userFacingApiMessage(bootError, t('gymBoot.errorBody'), t('gymBoot.errorBody'));

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <SoftSurface variant="panel" style={styles.card}>
        <Text display style={[styles.title, { color: c.text }]}>
          {title}
        </Text>
        <Text style={[styles.body, { color: c.muted }]}>{body}</Text>
        {licenseBlocked ? (
          <View style={styles.support}>
            <SupportContactLine />
          </View>
        ) : null}
        {showDevDetail && bootError.message && !licenseBlocked ? (
          <Text style={[styles.detail, { color: c.dim }]} selectable>
            {bootError.message}
            {bootError instanceof ApiError && bootError.code ? ` (${bootError.code})` : ''}
          </Text>
        ) : null}
        {showDevDetail && isNetworkApiError(bootError) && bootError.message?.includes('localhost') ? (
          <Text style={[styles.hint, { color: c.muted }]}>{t('gymBoot.usbHint')}</Text>
        ) : null}
        {licenseBlocked ? (
          <PrimaryButton
            label={t('lockout.signOut')}
            onPress={() => void logout()}
            style={styles.btn}
          />
        ) : (
          <PrimaryButton
            label={retrying ? t('gymBoot.retrying') : t('gymBoot.retry')}
            onPress={retryBoot}
            loading={retrying}
            disabled={retrying}
            style={styles.btn}
          />
        )}
      </SoftSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  support: {
    marginBottom: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  detail: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  btn: {
    alignSelf: 'stretch',
  },
});
