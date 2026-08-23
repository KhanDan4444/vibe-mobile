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
  const { colors: c } = useTheme();
  const [focused, setFocused] = useState(false);
  const inset = tone === 'inset';

  const ring = inset
    ? {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: focused ? c.accentText : c.border,
      }
    : fieldRingStyle(c, { focused });

  return (
    <View
      style={[
        fieldChrome.inputShell,
        ring,
        {
          backgroundColor: inset ? c.inputBg : c.card,
          gap: inset ? 10 : 8,
          paddingHorizontal: inset ? 14 : 12,
          minHeight: inset ? 48 : 44,
        },
        style,
      ]}
    >
      <Ionicons
        name={inset ? 'search-outline' : 'search'}
        size={inset ? 20 : 18}
        color={focused ? c.accentText : c.dim}
      />
      <TextInput
        latin
        style={[
          fieldChrome.inputText,
          {
            color: c.text,
            minHeight: inset ? 44 : 40,
            fontSize: inset ? 16 : fieldChrome.inputText.fontSize,
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
