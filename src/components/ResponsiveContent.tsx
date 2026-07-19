import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';

/**
 * Inner scroll/list content with consistent horizontal padding.
 * Max-width centering belongs to TabScreenFrame — do not nest both.
 */
export function ResponsiveContent({
  children,
  style,
  noPadding,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
}) {
  const { pagePadding } = useResponsiveLayout();

  return (
    <View style={[styles.base, !noPadding && { paddingHorizontal: pagePadding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
  },
});
