import { View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { initialsFrom } from '@/src/utils/userDisplay';
import { avatarTextProps } from '@/src/theme/typography';

/** Circular initials avatar — same shell language as MemberPhoto fallback. */
export function InitialsAvatar({
  name,
  size = 44,
}: {
  name?: string | null;
  size?: number;
}) {
  const styles = useThemedStyles((colors) => ({
    shell: {
      backgroundColor: colors.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    initials: {
      color: colors.text,
      fontWeight: '700' as const,
    },
  }));

  const shellStyle = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.shell, shellStyle]} accessibilityElementsHidden>
      <Text {...avatarTextProps} style={[styles.initials, { fontSize: size * 0.35 }]}>
        {initialsFrom(name) || '?'}
      </Text>
    </View>
  );
}
