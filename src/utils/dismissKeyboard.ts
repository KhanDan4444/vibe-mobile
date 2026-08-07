import { Keyboard, Platform, TextInput } from 'react-native';

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

/**
 * Dismiss keyboard, then run `fn` after the soft keyboard has time to settle.
 * Android needs a short delay so pickers/sheets don't fight residual focus.
 */
export function dismissKeyboardThen(fn: () => void, delayMs = Platform.OS === 'android' ? 100 : 0) {
  dismissKeyboard();
  if (delayMs <= 0) {
    fn();
    return;
  }
  setTimeout(fn, delayMs);
}
