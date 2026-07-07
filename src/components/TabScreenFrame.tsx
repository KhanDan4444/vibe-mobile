import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';

/**
 * Centers tab content on tablets with a readable max width; phones stay full-bleed.
 */
export function TabScreenFrame({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { isTablet, contentMaxWidth } = useResponsiveLayout();

  return (
    <View style={[styles.outer, style]}>
      <View
        style={[
          styles.inner,
          isTablet && { maxWidth: contentMaxWidth },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
  },
});
