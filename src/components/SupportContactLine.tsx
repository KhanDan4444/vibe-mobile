import { Linking, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useSupportContact } from '@/src/hooks/useSupportContact';
import { useTheme } from '@/src/context/PreferencesContext';

type Props = {
  /** auth = light text on dark auth screens; banner = warning tones; default = app theme */
  variant?: 'default' | 'auth' | 'banner';
  /** When true, wrap in a titled section (hidden if support not configured). */
  withSection?: boolean;
  sectionStyle?: object;
};

export function SupportContactLine({ variant = 'default', withSection = false, sectionStyle }: Props) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const { phone, phone_display, telegram, telegram_url, configured } = useSupportContact();

  if (!configured) return null;

  const muted =
    variant === 'auth' ? 'rgba(255,255,255,0.55)' : variant === 'banner' ? c.muted : c.muted;
  const link =
    variant === 'auth' ? '#5eead4' : variant === 'banner' ? c.warning : c.link;

  const line = (
    <View style={{ marginTop: withSection ? 0 : 8, gap: 4 }}>
      <Text style={{ fontSize: 13, lineHeight: 18, color: muted }}>{t('support.needHelp')}</Text>
      {phone ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(`tel:${phone}`)}
          hitSlop={6}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: link }}>
            {t('support.callPhone', { phone: phone_display || phone })}
          </Text>
        </Pressable>
      ) : null}
      {telegram_url ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(telegram_url)}
          hitSlop={6}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: link }}>
            {t('support.telegram', { handle: telegram })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (!withSection) return line;

  return (
    <View style={sectionStyle}>
      <Text
        style={{
          marginTop: 20,
          marginBottom: 4,
          fontSize: 13,
          fontWeight: '700',
          textTransform: 'uppercase',
          color: c.muted,
        }}
      >
        {t('support.sectionTitle')}
      </Text>
      {line}
    </View>
  );
}
