import { ActionSheetIOS, Alert, Image, Platform, Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Label } from '@/src/components/Form';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { compressMemberPhoto } from '@/src/utils/compressMemberPhoto';

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
  const styles = useThemedStyles((c) => ({
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 16, marginTop: 4 },
    preview: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.border },
    placeholder: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 1,
      borderColor: c.border,
    },
    placeholderText: { color: c.dim, fontSize: 11 },
    actions: { flex: 1, gap: 8 },
    btn: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      minHeight: 44,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    btnDisabled: { opacity: 0.45 },
    btnSecondary: { backgroundColor: 'transparent' },
    btnText: { color: c.text, fontSize: 14, fontWeight: '600' as const },
    btnTextSecondary: { color: c.muted, fontSize: 14 },
    notice: {
      marginTop: 8,
      marginBottom: 4,
      fontSize: 13,
      lineHeight: 18,
      color: c.warning,
    },
  }));

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

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('photo.takePhoto'), t('photo.chooseLibrary')],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) void pickFromCamera();
          if (buttonIndex === 2) void pickFromLibrary();
        },
      );
      return;
    }

    Alert.alert(t('photo.label'), undefined, [
      { text: t('photo.takePhoto'), onPress: () => void pickFromCamera() },
      { text: t('photo.chooseLibrary'), onPress: () => void pickFromLibrary() },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
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
          <Pressable
            style={[styles.btn, pickBlocked ? styles.btnDisabled : null]}
            onPress={openPhotoActions}
            disabled={pickBlocked}
            accessibilityLabel={addLabel}
          >
            <Text style={styles.btnText}>{addLabel}</Text>
          </Pressable>
          {previewUri ? (
            <Pressable
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => onChange('', '')}
              disabled={processing}
              accessibilityLabel={t('photo.remove')}
            >
              <Text style={styles.btnTextSecondary}>{t('photo.remove')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
