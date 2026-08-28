import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { fetchMemberPhotoDataUri } from '@/src/utils/memberPhoto';
import { memberPhotoBustQueryKey } from '@/src/utils/memberPhotoCache';
import { avatarTextProps } from '@/src/theme/typography';

export function MemberPhoto({
  memberId,
  name,
  token,
  size = 72,
  hasPhoto = true,
  expandable = false,
}: {
  memberId: number;
  name: string;
  token: string;
  size?: number;
  hasPhoto?: boolean;
  expandable?: boolean;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const { data: cacheBust = 0 } = useQuery<number>({
    queryKey: memberPhotoBustQueryKey(memberId),
    queryFn: () => 0,
    initialData: 0,
    staleTime: Infinity,
  });

  const photoQuery = useQuery({
    queryKey: ['member-photo', memberId, cacheBust],
    queryFn: () => fetchMemberPhotoDataUri(memberId, token, cacheBust),
    enabled: Boolean(hasPhoto && memberId && token),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  const [expanded, setExpanded] = useState(false);
  const styles = useThemedStyles((colors) => ({
    fallback: {
      backgroundColor: colors.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    initials: { color: colors.text, fontWeight: '700' as const },
    lightbox: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 24,
    },
    closeBtn: {
      position: 'absolute' as const,
      top: 48,
      right: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    lightboxImage: {
      width: '100%' as const,
      maxWidth: 420,
      height: '70%' as const,
      maxHeight: 560,
    },
  }));

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  const src = photoQuery.data ?? null;
  const failed = !hasPhoto || photoQuery.isError || photoQuery.data === null;
  const loading = photoQuery.isLoading && !src && !failed;
  const shellStyle = { width: size, height: size, borderRadius: size / 2 };
  const canExpand = expandable && Boolean(src) && !failed;

  if (loading) {
    return (
      <View style={[styles.fallback, shellStyle]}>
        <ActivityIndicator size="small" color={c.accentText} />
      </View>
    );
  }

  if (src && !failed) {
    const image = (
      <Image
        source={{ uri: src }}
        style={[shellStyle, { backgroundColor: c.border }]}
      />
    );

    return (
      <>
        {canExpand ? (
          <Pressable onPress={() => setExpanded(true)} accessibilityRole="button" accessibilityLabel={t('photo.viewPhoto', { name })}>
            {image}
          </Pressable>
        ) : (
          image
        )}

        {canExpand ? (
          <Modal visible={expanded} transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
            <View style={styles.lightbox}>
              <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setExpanded(false)} />
              <Pressable style={styles.closeBtn} onPress={() => setExpanded(false)} accessibilityRole="button" accessibilityLabel={t('common.closePhoto')}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
              <Image source={{ uri: src }} style={styles.lightboxImage} resizeMode="contain" />
            </View>
          </Modal>
        ) : null}
      </>
    );
  }

  return (
    <View style={[styles.fallback, shellStyle]}>
      <Text {...avatarTextProps} style={[styles.initials, { fontSize: size * 0.35 }]}>{initials || '?'}</Text>
    </View>
  );
}
