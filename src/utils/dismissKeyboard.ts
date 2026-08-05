import { Keyboard, TextInput } from 'react-native';

/**
 * Hide the soft keyboard and clear TextInput focus.
 * On Android, Keyboard.dismiss() alone often leaves the cursor blinking.
 */
export function dismissKeyboard() {
  Keyboard.dismiss();
  const focused = TextInput.State.currentlyFocusedInput?.();
  if (focused) {
    TextInput.State.blurTextInput(focused);
  }
}
