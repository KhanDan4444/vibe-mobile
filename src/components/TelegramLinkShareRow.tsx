import { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useFlash } from '@/src/context/FlashContext';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

type Props = {
  link: string;
  shareLabel: string;
  onShare: () => void;
};

export function TelegramLinkShareRow({ link, shareLabel, onShare }: Props) {
  const { t } = useTranslation();
  const { showFlash } = useFlash();
  const { colors: c } = useTheme();
  const styles = useThemedStyles((colors) => ({
    row: {
      marginTop: 10,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      height: 48,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: `${colors.link}40`,
      backgroundColor: `${colors.link}0A`,
      overflow: 'hidden' as const,
    },
    copyArea: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      minWidth: 0,
      height: '100%' as const,
      paddingLeft: 12,
      paddingRight: 8,
    },
    url: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500' as const,
      color: colors.text,
    },
    shareBtn: {
      width: 48,
      height: 48,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: `${colors.link}30`,
      backgroundColor: `${colors.link}14`,
    },
  }));

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(link);
      showFlash({ title: t('checkIn.telegramLinkCopied'), variant: 'success' });
    } catch {
      showFlash({ title: t('checkIn.telegramLinkCopyFailed'), variant: 'danger' });
    }
  }, [link, showFlash, t]);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('checkIn.telegramLinkCopy')}
        style={({ pressed }) => [styles.copyArea, pressed ? { opacity: 0.75 } : null]}
        onPress={() => void handleCopy()}
      >
        <Ionicons name="copy-outline" size={16} color={c.link} />
        <Text latin style={styles.url} numberOfLines={1} ellipsizeMode="middle">
          {link}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shareLabel}
        hitSlop={4}
        style={({ pressed }) => [styles.shareBtn, pressed ? { opacity: 0.75 } : null]}
        onPress={onShare}
      >
        <Ionicons
          name={Platform.OS === 'ios' ? 'share-outline' : 'share-social-outline'}
          size={18}
          color={c.link}
        />
      </Pressable>
    </View>
  );
}
