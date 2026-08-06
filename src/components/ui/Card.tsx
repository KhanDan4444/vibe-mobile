import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/context/PreferencesContext';
import { radiusMd } from '@/src/theme/tokens';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Softer surface for nested metrics / list sections */
  quiet?: boolean;
};

/** Softer surface for nested metrics / list sections (surface tier in light). */
export default function Card({ children, style, quiet = false }: CardProps) {
  const { colors: c } = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: quiet ? c.inputBg : c.card,
          borderColor: c.border,
          borderRadius: radiusMd,
        },
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
  },
});
