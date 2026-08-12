import { useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { Label } from '@/src/components/Form';
import { SecondaryButton } from '@/src/components/ui/Button';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { compressMemberPhoto } from '@/src/utils/compressMemberPhoto';
import { dismissKeyboardThen } from '@/src/utils/dismissKeyboard';

const PICKER_OPTIONS = {
  mediaTypes: ['images'] as ImagePicker.MediaType[],
  allowsEditing: true,
  aspect: [1, 1] as [number, number],
  quality: 1,
};

export function PhotoPickerField({
  previewUri,
  onChange,
  processing,
  setProcessing,
  pickDisabled = false,
  notice,
}: {
  previewUri: string;
  onChange: (dataUrl: string, preview: string) => void;
  processing: boolean;
  setProcessing: (v: boolean) => void;
  /** When true, Add/Change is blocked (e.g. offline). Remove stays available. */
  pickDisabled?: boolean;
  notice?: string;
}) {
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const styles = useThemedStyles((colors) => ({
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 16, marginTop: 4 },
    preview: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.border },
    placeholder: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    placeholderText: { color: colors.dim, fontSize: 11 },
    actions: { flex: 1, gap: 8 },
    notice: {
      marginTop: 8,
      marginBottom: 4,
      fontSize: 13,
      lineHeight: 18,
      color: colors.warning,
    },
  }));

  const closeSheet = () => setSheetOpen(false);

  const applyPickedAsset = async (uri: string) => {
    setProcessing(true);
    try {
      const dataUrl = await compressMemberPhoto(uri);
      onChange(dataUrl, uri);
    } catch (e) {
      Alert.alert(t('photo.errorTitle'), e instanceof Error ? e.message : t('common.error'));
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

  const openPhotoActions = () => {
    if (processing || pickDisabled) return;
    dismissKeyboardThen(() => setSheetOpen(true));
  };

  const addLabel = processing ? t('photo.processing') : previewUri ? t('photo.change') : t('photo.add');
  const pickBlocked = processing || pickDisabled;

  return (
    <View>
      <Label>{t('photo.label')}</Label>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <View style={styles.row}>
        <View>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.preview} />
          ) : (
            <View style={[styles.preview, styles.placeholder]}>
              <Text style={styles.placeholderText}>{t('photo.noPhoto')}</Text>
            </View>
          )}
        </View>
        <View style={styles.actions}>
          <SecondaryButton label={addLabel} onPress={openPhotoActions} disabled={pickBlocked} loading={processing} />
          {previewUri ? (
            <SecondaryButton
              label={t('photo.remove')}
              onPress={() => onChange('', '')}
              disabled={processing}
            />
          ) : null}
        </View>
      </View>

      <BottomSheet visible={sheetOpen} title={t('photo.label')} onClose={closeSheet} compact>
        <SheetOption label={t('photo.takePhoto')} onPress={() => void pickFromCamera()} />
        <SheetOption label={t('photo.chooseLibrary')} onPress={() => void pickFromLibrary()} />
        <SheetOption label={t('common.cancel')} onPress={closeSheet} />
      </BottomSheet>
    </View>
  );
}
