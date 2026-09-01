import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

type Props = {
  onUnlink: () => void;
  disabled?: boolean;
  /** Inline row for member detail; panel for pass sheet. */
  variant?: 'compact' | 'panel';
};

export function TelegramLinkStatusRow({ onUnlink, disabled, variant = 'panel' }: Props) {
  const { t } = useTranslation();
  const compact = variant === 'compact';

  const styles = useThemedStyles((c) => ({
    panel: {
      marginTop: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${c.link}30`,
      backgroundColor: `${c.link}0A`,
      alignItems: 'center' as const,
      gap: 6,
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
      fontSize: compact ? 12 : 13,
      fontWeight: '600' as const,
      color: c.link,
      letterSpacing: 0.1,
    },
    unlinkBtn: {
      paddingVertical: compact ? 2 : 4,
      paddingHorizontal: 4,
    },
    unlink: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: c.error,
      letterSpacing: 0.1,
    },
  }));

  const linkedRow = (
    <View style={styles.row}>
      <View style={styles.dot} />
      <Text style={styles.linked}>{t('checkIn.telegramLinked')}</Text>
      {compact ? (
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

  if (compact) {
    return <View style={{ marginTop: 6 }}>{linkedRow}</View>;
  }

  return (
    <View style={styles.panel}>
      {linkedRow}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('checkIn.telegramUnlink')}
        disabled={disabled}
        onPress={onUnlink}
        style={({ pressed }) => [styles.unlinkBtn, pressed && !disabled ? { opacity: 0.72 } : null]}
      >
        <Text style={[styles.unlink, disabled ? { opacity: 0.5 } : null]}>{t('checkIn.telegramUnlink')}</Text>
      </Pressable>
    </View>
  );
}
