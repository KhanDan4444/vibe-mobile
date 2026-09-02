import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

type Props = {
  /** When set, shows unlink under the linked label (e.g. pass sheet). Omit on member detail. */
  onUnlink?: () => void;
  disabled?: boolean;
  /** Status-only on member detail; stacked linked + unlink on pass sheet. */
  variant?: 'compact' | 'panel';
};

export function TelegramLinkStatusRow({ onUnlink, disabled, variant = 'panel' }: Props) {
  const { t } = useTranslation();
  const compact = variant === 'compact';
  const canUnlink = typeof onUnlink === 'function';

  const styles = useThemedStyles((c) => ({
    wrap: {
      marginTop: compact ? 6 : 12,
      alignItems: compact ? ('flex-start' as const) : ('center' as const),
      gap: 4,
    },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: compact ? ('flex-start' as const) : ('center' as const),
      gap: 6,
      flexWrap: 'wrap' as const,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.linkDot,
    },
    linked: {
      fontSize: compact ? 13 : 14,
      fontWeight: '600' as const,
      color: c.link,
      letterSpacing: 0.1,
    },
    unlinkBtn: {
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    unlink: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: c.error,
      letterSpacing: 0.1,
    },
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.dot} />
        <Text style={styles.linked}>{t('checkIn.telegramLinked')}</Text>
      </View>
      {canUnlink ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('checkIn.telegramUnlink')}
          disabled={disabled}
          onPress={onUnlink}
          hitSlop={8}
          style={({ pressed }) => [styles.unlinkBtn, pressed && !disabled ? { opacity: 0.72 } : null]}
        >
          <Text style={[styles.unlink, disabled ? { opacity: 0.5 } : null]}>{t('checkIn.telegramUnlink')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
