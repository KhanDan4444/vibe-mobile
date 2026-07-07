import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';

/**
 * Inner scroll/list content with consistent horizontal padding and optional max width.
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
  const { pagePadding, isTablet, contentMaxWidth } = useResponsiveLayout();

  return (
    <View
      style={[
        styles.base,
        !noPadding && { paddingHorizontal: pagePadding },
        isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
  },
});
