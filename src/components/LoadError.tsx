import { useState } from 'react';
import { View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { SecondaryButton } from '@/src/components/ui/Button';
import { useTheme } from '@/src/context/PreferencesContext';
import { space } from '@/src/theme/tokens';
import { useTranslation } from 'react-i18next';
import { isNetworkApiError, isNetworkErrorMessage } from '@/src/utils/apiErrorMessage';

type Props = {
  message?: string;
  error?: unknown;
  onRetry: () => void | Promise<unknown>;
  /** When true, Retry shows a spinner (also set automatically while onRetry is in flight). */
  loading?: boolean;
};

/** Failed data load — message + retry (avoids empty forms / blank lists). */
export function LoadError({ message, error, onRetry, loading = false }: Props) {
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const [localRetrying, setLocalRetrying] = useState(false);
  const busy = loading || localRetrying;

  const display =
    isNetworkApiError(error) || isNetworkErrorMessage(message) || !message?.trim()
      ? t('gymBoot.errorBody')
      : message;

  return (
    <View style={{ alignItems: 'center', paddingTop: space.xxl + 16, paddingHorizontal: space.xl }}>
      <SoftSurface variant="panel" style={{ padding: space.lg, width: '100%', maxWidth: 360, alignItems: 'center' }}>
        <Text style={{ textAlign: 'center', color: c.error, fontSize: 15, lineHeight: 22 }}>{display}</Text>
        <View style={{ marginTop: space.md, alignSelf: 'stretch' }}>
          <SecondaryButton
            label={t('gymBoot.retry')}
            loading={busy}
            disabled={busy}
            onPress={() => {
              if (busy) return;
              setLocalRetrying(true);
              void Promise.resolve(onRetry()).finally(() => {
                setLocalRetrying(false);
              });
            }}
          />
        </View>
      </SoftSurface>
    </View>
  );
}
