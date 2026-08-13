import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ReadOnlyBanner } from '@/src/components/ReadOnlyBanner';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';

/**
 * Centers tab content on tablets with a readable max width; phones stay full-bleed.
 * Applies a consistent top inset (same as horizontal page padding) under the nav header.
 * Pins the license/branch read-only banner above scrolling tab content.
 */
export function TabScreenFrame({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: c } = useTheme();
  const { isTablet, contentMaxWidth, pagePadding } = useResponsiveLayout();

  return (
    <View style={[styles.outer, { backgroundColor: c.bg }, style]}>
      <View
        style={[
          styles.inner,
          { paddingTop: pagePadding, backgroundColor: c.bg },
          isTablet && { maxWidth: contentMaxWidth },
        ]}
      >
        <View style={{ paddingHorizontal: pagePadding }}>
          <ReadOnlyBanner />
        </View>
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
