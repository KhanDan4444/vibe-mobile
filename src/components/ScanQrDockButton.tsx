import { Platform, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Rect } from 'react-native-svg';
import { AppText as Text } from '@/src/components/AppText';
import { fabElevation } from '@/src/theme/elevation';
import { useTheme } from '@/src/context/PreferencesContext';

const FRAME = '#ffffff';
const CORNER = 12;
const STROKE = 2.2;
const DOT = 2.6;
const DOT_INSET = 3.5;

/**
 * Curved viewfinder corner + inner square — CBE-style QR chrome, tightened.
 */
function QrCorner({ placement }: { placement: 'tl' | 'tr' | 'bl' | 'br' }) {
  const r = 3.5;
  const s = STROKE / 2;
  const path =
    placement === 'tl'
      ? `M ${s} ${CORNER - 0.5} V ${r + s} Q ${s} ${s} ${r + s} ${s} H ${CORNER - 0.5}`
      : placement === 'tr'
        ? `M 0.5 ${s} H ${CORNER - r - s} Q ${CORNER - s} ${s} ${CORNER - s} ${r + s} V ${CORNER - 0.5}`
        : placement === 'bl'
          ? `M ${s} 0.5 V ${CORNER - r - s} Q ${s} ${CORNER - s} ${r + s} ${CORNER - s} H ${CORNER - 0.5}`
          : `M 0.5 ${CORNER - s} H ${CORNER - r - s} Q ${CORNER - s} ${CORNER - s} ${CORNER - s} ${CORNER - r - s} V 0.5`;

  const dot =
    placement === 'tl'
      ? { x: DOT_INSET, y: DOT_INSET }
      : placement === 'tr'
        ? { x: CORNER - DOT_INSET - DOT, y: DOT_INSET }
        : placement === 'bl'
          ? { x: DOT_INSET, y: CORNER - DOT_INSET - DOT }
          : { x: CORNER - DOT_INSET - DOT, y: CORNER - DOT_INSET - DOT };

  const pos =
    placement === 'tl'
      ? styles.tl
      : placement === 'tr'
        ? styles.tr
        : placement === 'bl'
          ? styles.bl
          : styles.br;

  return (
    <View pointerEvents="none" style={[styles.cornerWrap, pos]}>
      <Svg width={CORNER} height={CORNER}>
        <Path d={path} stroke={FRAME} strokeWidth={STROKE} fill="none" strokeLinecap="round" />
        <Rect x={dot.x} y={dot.y} width={DOT} height={DOT} rx={0.5} fill={FRAME} />
      </Svg>
    </View>
  );
}

/** Default gap above the in-flow tab bar. */
export const SCAN_QR_DOCK_BOTTOM = 20;

/**
 * Centered Scan QR pill above the tab bar — curved QR-frame CTA.
 * Corners hug a tight frame around the label (not the outer pill edge).
 */
export function ScanQrDockButton({
  label,
  onPress,
  bottom = SCAN_QR_DOCK_BOTTOM,
}: {
  label: string;
  onPress: () => void;
  bottom?: number;
}) {
  const { theme, colors: c } = useTheme();
  // One step brighter than deep brand teal — more punch without leaving brand.
  const fill = c.accentCta;

  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          if (Platform.OS !== 'web') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          onPress();
        }}
        style={({ pressed }) => [
          styles.pill,
          fabElevation(theme),
          {
            backgroundColor: fill,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          },
        ]}
      >
        <View style={styles.frame}>
          <QrCorner placement="tl" />
          <QrCorner placement="tr" />
          <QrCorner placement="bl" />
          <QrCorner placement="br" />
          <Text style={styles.label}>{label}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  pill: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Corners sit on this box so they track the label, not the pill ends. */
  frame: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  cornerWrap: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
  },
  tl: { top: 0, left: 0 },
  tr: { top: 0, right: 0 },
  bl: { bottom: 0, left: 0 },
  br: { bottom: 0, right: 0 },
});
