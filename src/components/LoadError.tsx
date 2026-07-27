import { View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { SecondaryButton } from '@/src/components/ui/Button';
import { useTheme } from '@/src/context/PreferencesContext';
import { useTranslation } from 'react-i18next';
import { isNetworkApiError, isNetworkErrorMessage } from '@/src/utils/apiErrorMessage';

type Props = {
  message?: string;
  error?: unknown;
  onRetry: () => void;
};

/** Failed data load — message + retry (avoids empty forms / blank lists). */
export function LoadError({ message, error, onRetry }: Props) {
  const { colors: c } = useTheme();
  const { t } = useTranslation();

  const display =
    isNetworkApiError(error) || isNetworkErrorMessage(message) || !message?.trim()
      ? t('gymBoot.errorBody')
      : message;

  return (
    <View style={{ alignItems: 'center', paddingTop: 48, gap: 12, paddingHorizontal: 24 }}>
      <Text style={{ textAlign: 'center', color: c.error, fontSize: 15 }}>{display}</Text>
      <SecondaryButton label={t('gymBoot.retry')} onPress={onRetry} />
    </View>
  );
}
