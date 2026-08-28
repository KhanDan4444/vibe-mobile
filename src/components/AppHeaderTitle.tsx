import type { StyleProp, TextStyle } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { usePreferences } from '@/src/context/PreferencesContext';
import { DM_SANS_SEMI, NOTO_ETHIOPIC, scaleLineHeight } from '@/src/theme/typography';

type Props = {
  children: string;
  tintColor?: string;
  style?: StyleProp<TextStyle>;
};

/** Navigation header title — wraps/shrinks instead of truncating when font size is large. */
export function AppHeaderTitle({ children, tintColor, style }: Props) {
  const { language } = usePreferences();
  return (
    <Text
      numberOfLines={2}
      adjustsFontSizeToFit
      minimumFontScale={0.85}
      style={[
        {
          color: tintColor,
          fontSize: 17,
          fontWeight: '600',
          lineHeight: scaleLineHeight(22),
          flexShrink: 1,
        },
        language === 'am' ? { fontFamily: NOTO_ETHIOPIC } : { fontFamily: DM_SANS_SEMI },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
