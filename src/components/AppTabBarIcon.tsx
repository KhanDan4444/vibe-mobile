import { type ComponentProps, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AppText as Text } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';

type IonName = ComponentProps<typeof Ionicons>['name'];

const FOCUS_MS = 160;
const FOCUS_EASE = Easing.out(Easing.cubic);

/**
 * Tab icon shell — solid brand pill when focused + outline→filled icon swap.
 * Icon turns white on the solid fill (same treatment on every tab).
 */
export function AppTabBarIcon({
  name,
  nameFocused,
  color,
  size = 24,
  focused,
  badgeCount = 0,
}: {
  name: IonName;
  nameFocused?: IonName;
  color: string;
  size?: number;
  focused: boolean;
  /** Attention count (members). 0 hides the badge. */
  badgeCount?: number;
}) {
  const { colors: c } = useTheme();
  const { isTablet } = useResponsiveLayout();
  const shellWidth = isTablet ? 52 : 48;
  const shellHeight = isTablet ? 32 : 30;
  const shellRadius = shellHeight / 2;
  const iconName = focused && nameFocused ? nameFocused : name;
  const iconColor = focused ? '#ffffff' : color;
  const focus = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, {
      duration: FOCUS_MS,
      easing: FOCUS_EASE,
    });
  }, [focused, focus]);

  const solidPillStyle = useAnimatedStyle(() => ({
    opacity: focus.value,
  }));

  const shellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(focus.value, [0, 1], [1, 1.04]) }],
  }));

  return (
    <View style={[styles.wrap, { width: shellWidth, height: shellHeight }]}>
      <Animated.View
        style={[
          styles.shell,
          { minWidth: shellWidth, height: shellHeight, paddingHorizontal: isTablet ? 14 : 12, borderRadius: shellRadius },
          shellStyle,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { backgroundColor: c.accentCta, borderRadius: shellRadius }, solidPillStyle]}
        />
        <Ionicons name={iconName} color={iconColor} size={size} />
      </Animated.View>
      {badgeCount > 0 ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: c.errorSolid,
              borderColor: c.tabBarBg,
            },
          ]}
        >
          <Text fixedLayout style={styles.badgeText}>
            {badgeCount > 9 ? '9+' : badgeCount}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shell: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 11,
  },
});
