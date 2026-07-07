import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { fetchMemberPhotoDataUri } from '@/src/utils/memberPhoto';
import { memberPhotoBustQueryKey } from '@/src/utils/memberPhotoCache';

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
  const { colors: c } = useTheme();
  const { data: cacheBust = 0 } = useQuery<number>({
    queryKey: memberPhotoBustQueryKey(memberId),
    queryFn: () => 0,
    initialData: 0,
    staleTime: Infinity,
  });
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setFailed(false);
    setExpanded(false);

    if (!hasPhoto || !memberId || !token) {
      setLoading(false);
      if (!hasPhoto) setFailed(true);
      return undefined;
    }

    setLoading(true);
    (async () => {
      try {
        const dataUri = await fetchMemberPhotoDataUri(memberId, token, cacheBust);
        if (cancelled) return;
        if (!dataUri) {
          setFailed(true);
          return;
        }
        setSrc(dataUri);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [memberId, token, hasPhoto, cacheBust]);

  const shellStyle = { width: size, height: size, borderRadius: size / 2 };
  const canExpand = expandable && Boolean(src) && !failed;

  if (loading && !src && !failed) {
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
        onError={() => setFailed(true)}
      />
    );

    return (
      <>
        {canExpand ? (
          <Pressable onPress={() => setExpanded(true)} accessibilityRole="button" accessibilityLabel={`View ${name} photo`}>
            {image}
          </Pressable>
        ) : (
          image
        )}

        {canExpand ? (
          <Modal visible={expanded} transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
            <View style={styles.lightbox}>
              <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setExpanded(false)} />
              <Pressable style={styles.closeBtn} onPress={() => setExpanded(false)} accessibilityRole="button" accessibilityLabel="Close photo">
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
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials || '?'}</Text>
    </View>
  );
}
