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

type IonName = ComponentProps<typeof Ionicons>['name'];

const FOCUS_MS = 160;
const FOCUS_EASE = Easing.out(Easing.cubic);

/**
 * Tab icon shell — soft brand pill when focused + outline→filled icon swap.
 * `emphasis="desk"` = solid teal capsule (Check-in primary).
 * Motion stays short and non-springy (no tab jiggle).
 */
export function AppTabBarIcon({
  name,
  nameFocused,
  color,
  size = 24,
  focused,
  badgeCount = 0,
  emphasis = 'default',
}: {
  name: IonName;
  nameFocused?: IonName;
  color: string;
  size?: number;
  focused: boolean;
  /** Attention count (members). 0 hides the badge. */
  badgeCount?: number;
  /** Desk-primary treatment (Check-in). */
  emphasis?: 'default' | 'desk';
}) {
  const { colors: c } = useTheme();
  const desk = emphasis === 'desk';
  const iconName = focused && nameFocused ? nameFocused : name;
  const iconColor = desk && focused ? '#ffffff' : color;
  const focus = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, {
      duration: FOCUS_MS,
      easing: FOCUS_EASE,
    });
  }, [focused, focus]);

  const softPillStyle = useAnimatedStyle(() => ({
    opacity: desk ? 0 : focus.value,
  }));

  const deskPillStyle = useAnimatedStyle(() => ({
    opacity: desk ? focus.value : 0,
  }));

  const deskIdleStyle = useAnimatedStyle(() => ({
    opacity: desk ? interpolate(focus.value, [0, 1], [1, 0]) : 0,
  }));

  const shellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(focus.value, [0, 1], [1, desk ? 1.04 : 1.02]) }],
  }));

  return (
    <View style={[styles.wrap, desk && styles.wrapDesk]}>
      <Animated.View style={[styles.shell, desk && styles.shellDesk, shellStyle]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { backgroundColor: c.accentSoft }, softPillStyle]}
        />
        {desk ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[styles.pill, { backgroundColor: c.accentSoft }, deskIdleStyle]}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.pill, { backgroundColor: c.accentCta }, deskPillStyle]}
            />
          </>
        ) : null}
        <Ionicons name={iconName} color={iconColor} size={desk ? size + 1 : size} />
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
          <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 48,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapDesk: {
    width: 52,
    height: 32,
  },
  shell: {
    minWidth: 48,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shellDesk: {
    minWidth: 52,
    height: 32,
    paddingHorizontal: 13,
    borderRadius: 16,
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
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
