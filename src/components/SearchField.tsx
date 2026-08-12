import { useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTextInput as TextInput } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';
import { fieldChrome, fieldRingStyle } from '@/src/theme/fieldChrome';

export function SearchField({
  value,
  onChangeText,
  placeholder,
  style,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: c } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        fieldChrome.inputShell,
        fieldRingStyle(c, { focused }),
        {
          backgroundColor: c.card,
          gap: 8,
          paddingHorizontal: 12,
          minHeight: 44,
        },
        style,
      ]}
    >
      <Ionicons name="search" size={18} color={focused ? c.accentText : c.dim} />
      <TextInput
        latin
        style={[fieldChrome.inputText, { color: c.text, minHeight: 40 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.dim}
        selectionColor={c.accentText}
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
