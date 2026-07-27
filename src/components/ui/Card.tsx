import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/context/PreferencesContext';
import { radiusMd } from '@/src/theme/tokens';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Softer surface for nested metrics / list sections */
  quiet?: boolean;
};

export default function Card({ children, style, quiet = false }: CardProps) {
  const { colors: c } = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: quiet ? c.card : c.card,
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
