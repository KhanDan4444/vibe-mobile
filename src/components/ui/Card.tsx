import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/context/PreferencesContext';
import { elevationStyle } from '@/src/theme/elevation';
import { radiusLg, radiusMd } from '@/src/theme/tokens';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Softer inset surface for nested metrics / list sections */
  quiet?: boolean;
  /** Soft lift — default on raised cards for a modern, comfortable feel. */
  elevated?: boolean;
};

/** Soft surface with optional elevation — primary building block for calm UI. */
export default function Card({ children, style, quiet = false, elevated }: CardProps) {
  const { colors: c, theme } = useTheme();
  const lift = elevated !== false;
  const level = quiet ? 'soft' : 'raised';

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: quiet ? c.inputBg : c.card,
          borderColor: quiet ? c.border : c.cardEdge,
          borderRadius: quiet ? radiusMd : radiusLg,
        },
        lift ? elevationStyle(level, theme) : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'visible',
  },
});
