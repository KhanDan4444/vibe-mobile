import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';
import {
  SpaceGrotesk_300Light,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
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
    SpaceGrotesk_300Light,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    NotoSansEthiopic_400Regular,
    NotoSansEthiopic_600SemiBold,
    NotoSansEthiopic_700Bold,
  });
  return { loaded, error };
}
