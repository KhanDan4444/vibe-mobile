import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTextInput as TextInput } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';
import { fieldChrome, fieldRingStyle } from '@/src/theme/fieldChrome';

export function SearchField({
  value,
  onChangeText,
  placeholder,
  style,
  /** inset = nested in a desk/hero panel — quieter fill & border, soft focus. */
  tone = 'default',
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'inset';
}) {
  const { colors: c, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const inset = tone === 'inset';

  const insetBg = isDark ? c.inputBg : 'rgba(255,255,255,0.62)';
  const insetBorder = focused
    ? c.accentText
    : isDark
      ? c.border
      : 'rgba(15,118,110,0.14)';

  const ring = inset
    ? {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: insetBorder,
      }
    : fieldRingStyle(c, { focused });

  return (
    <View
      style={[
        fieldChrome.inputShell,
        ring,
        {
          backgroundColor: inset ? insetBg : c.card,
          gap: inset ? 10 : 8,
          paddingHorizontal: inset ? 14 : 12,
          minHeight: inset ? 46 : 44,
          borderRadius: inset ? 14 : fieldChrome.inputShell.borderRadius,
        },
        style,
      ]}
    >
      <Ionicons
        name={inset ? 'search-outline' : 'search'}
        size={inset ? 18 : 18}
        color={focused ? c.accentText : c.dim}
      />
      <TextInput
        latin
        style={[
          fieldChrome.inputText,
          {
            color: c.text,
            minHeight: inset ? 42 : 40,
            fontSize: inset ? 15 : fieldChrome.inputText.fontSize,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.dim}
        selectionColor={c.fieldFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityRole="button">
          <Ionicons name="close-circle" size={18} color={c.dim} />
        </Pressable>
      ) : null}
    </View>
  );
}
