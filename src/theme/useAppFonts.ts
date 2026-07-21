import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';
import {
  NotoSansEthiopic_400Regular,
  NotoSansEthiopic_600SemiBold,
  NotoSansEthiopic_700Bold,
  useFonts as useExpoFonts,
} from '@expo-google-fonts/noto-sans-ethiopic';

export function useAppFonts() {
  const [loaded, error] = useExpoFonts({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    NotoSansEthiopic_400Regular,
    NotoSansEthiopic_600SemiBold,
    NotoSansEthiopic_700Bold,
  });
  return { loaded, error };
}
