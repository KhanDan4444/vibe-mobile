import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
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
    copiedMark: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 3,
      borderColor: colors.statusActive,
    },
    copiedLabel: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700' as const,
      color: colors.statusActive,
    },
    copiedDock: {
      flex: 1,
      justifyContent: 'flex-end' as const,
      alignItems: 'center' as const,
    },
    copiedChip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
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

  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(link);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
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
      <Modal visible={copied} transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View pointerEvents="none" style={[styles.copiedDock, { paddingBottom: Math.max(insets.bottom, 12) + 20 }]}>
          <View style={styles.copiedChip} accessibilityLiveRegion="polite">
            <View style={styles.copiedMark} />
            <Text style={styles.copiedLabel}>{t('checkIn.telegramLinkCopied')}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
