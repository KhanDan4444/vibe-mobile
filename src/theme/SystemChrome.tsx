import {
  setBackgroundColorAsync,
  setBorderColorAsync,
  setButtonStyleAsync,
  setStyle,
} from 'expo-navigation-bar/build/NavigationBar';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useTheme } from '@/src/context/PreferencesContext';

/** Keeps Android system nav buttons and status bar readable for the active theme. */
export function SystemChrome() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // `light` = light bar + dark buttons; `dark` = dark bar + light buttons
    setStyle(isDark ? 'dark' : 'light');
    void setButtonStyleAsync(isDark ? 'light' : 'dark');
    void setBackgroundColorAsync(colors.tabBarBg);
    void setBorderColorAsync(colors.tabBarBorder);
  }, [isDark, colors.tabBarBg, colors.tabBarBorder]);

  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
