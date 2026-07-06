import {
  NotoSansEthiopic_400Regular,
  useFonts as useExpoFonts,
} from '@expo-google-fonts/noto-sans-ethiopic';

export function useAppFonts() {
  const [loaded, error] = useExpoFonts({
    NotoSansEthiopic_400Regular,
  });
  return { loaded, error };
}
