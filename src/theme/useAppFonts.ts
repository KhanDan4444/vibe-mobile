import {
  DMSans_400Regular,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import {
  NotoSansEthiopic_400Regular,
  useFonts as useExpoFonts,
} from '@expo-google-fonts/noto-sans-ethiopic';

export function useAppFonts() {
  const [loaded, error] = useExpoFonts({
    DMSans_400Regular,
    DMSans_600SemiBold,
    NotoSansEthiopic_400Regular,
  });
  return { loaded, error };
}
