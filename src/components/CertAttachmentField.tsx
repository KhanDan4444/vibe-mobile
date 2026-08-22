import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '@/src/components/AppText';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { Label } from '@/src/components/Form';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { compressMemberPhoto } from '@/src/utils/compressMemberPhoto';
import { dismissKeyboardThen } from '@/src/utils/dismissKeyboard';

const PICKER_OPTIONS = {
  mediaTypes: ['images'] as ImagePicker.MediaType[],
  allowsEditing: false,
  quality: 1,
};

/** Optional trainer certification image (PDF on web; photo/scan on mobile). */
export function CertAttachmentField({
  attached,
  fileLabel,
  onChange,
  processing,
  setProcessing,
}: {
  attached: boolean;
  fileLabel?: string;
  onChange: (dataUrl: string | null) => void;
  processing: boolean;
  setProcessing: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const styles = useThemedStyles((colors) => ({
    hint: { marginTop: 4, marginBottom: 10, fontSize: 12, color: colors.muted, lineHeight: 16 },
    panel: {
      padding: 14,
      borderWidth: attached ? 1 : 1,
      borderStyle: attached ? 'solid' : 'dashed',
      borderColor: attached ? 'rgba(13,148,136,0.35)' : colors.border,
      backgroundColor: attached ? 'rgba(13,148,136,0.08)' : colors.card,
    },
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: attached ? 'rgba(13,148,136,0.18)' : colors.inputBg,
    },
    copy: { flex: 1, minWidth: 0 },
    title: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
    subtitle: { marginTop: 2, fontSize: 12, color: colors.muted },
    actions: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
    action: { paddingVertical: 6, paddingHorizontal: 8 },
    actionText: { fontSize: 12, fontWeight: '700' as const, color: colors.accent },
    removeText: { fontSize: 12, fontWeight: '600' as const, color: colors.muted },
  }));

  const closeSheet = () => setSheetOpen(false);

  const applyPickedAsset = async (uri: string) => {
    setProcessing(true);
    try {
      const dataUrl = await compressMemberPhoto(uri);
      onChange(dataUrl);
    } catch (e) {
      Alert.alert(t('team.certErrorTitle'), e instanceof Error ? e.message : t('common.error'));
    } finally {
      setProcessing(false);
    }
  };

  const pickFromLibrary = async () => {
    closeSheet();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('photo.permissionTitle'), t('photo.permissionBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled || !result.assets[0]) return;
    await applyPickedAsset(result.assets[0].uri);
  };

  const pickFromCamera = async () => {
    closeSheet();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('photo.cameraPermissionTitle'), t('photo.cameraPermissionBody'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (result.canceled || !result.assets[0]) return;
    await applyPickedAsset(result.assets[0].uri);
  };

  const openPicker = () => {
    if (processing) return;
    dismissKeyboardThen(() => setSheetOpen(true));
  };

  return (
    <View>
      <Label>{t('team.certification')}</Label>
      {!attached ? <Text style={styles.hint}>{t('team.certificationHint')}</Text> : null}

      <SoftSurface variant="panel" style={styles.panel}>
        <Pressable onPress={openPicker} disabled={processing} style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={attached ? 'document-text' : 'cloud-upload-outline'}
              size={18}
              color={attached ? colors.accent : colors.muted}
            />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>
              {processing
                ? t('photo.processing')
                : attached
                  ? fileLabel || t('team.certAttached')
                  : t('team.attachCertification')}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {attached ? t('team.certificationReady') : t('team.certificationHintShort')}
            </Text>
          </View>
          {attached ? (
            <View style={styles.actions}>
              <Pressable onPress={openPicker} style={styles.action} disabled={processing}>
                <Text style={styles.actionText}>{t('team.changeCertification')}</Text>
              </Pressable>
              <Pressable
                onPress={() => onChange(null)}
                style={styles.action}
                disabled={processing}
              >
                <Text style={styles.removeText}>{t('team.removeCertification')}</Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </SoftSurface>

      <BottomSheet visible={sheetOpen} title={t('team.certification')} onClose={closeSheet} compact>
        <SheetOption label={t('photo.takePhoto')} onPress={() => void pickFromCamera()} />
        <SheetOption label={t('photo.chooseLibrary')} onPress={() => void pickFromLibrary()} />
        <SheetOption label={t('common.cancel')} onPress={closeSheet} />
      </BottomSheet>
    </View>
  );
}
