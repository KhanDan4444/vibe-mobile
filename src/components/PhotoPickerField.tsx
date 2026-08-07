import { useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { Label } from '@/src/components/Form';
import { useTheme } from '@/src/context/PreferencesContext';
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
  const { colors: c } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const styles = useThemedStyles((colors) => ({
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 16, marginTop: 4 },
    preview: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.border },
    placeholder: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 1,
      borderColor: colors.border,
    },
    placeholderText: { color: colors.dim, fontSize: 11 },
    actions: { flex: 1, gap: 8 },
    btn: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      minHeight: 44,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    btnDisabled: { opacity: 0.45 },
    btnSecondary: { backgroundColor: 'transparent' },
    btnText: { color: colors.text, fontSize: 14, fontWeight: '600' as const },
    btnTextSecondary: { color: colors.muted, fontSize: 14 },
    notice: {
      marginTop: 8,
      marginBottom: 4,
      fontSize: 13,
      lineHeight: 18,
      color: colors.warning,
    },
    optionRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    optionIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.accentSoft,
    },
    cancelWrap: { marginTop: 8 },
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

      <BottomSheet
        visible={sheetOpen}
        title={t('photo.label')}
        onClose={closeSheet}
        showCloseButton
      >
        <Pressable
          style={[
            {
              paddingVertical: 14,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.card,
              marginBottom: 8,
              minHeight: 56,
              justifyContent: 'center',
            },
          ]}
          onPress={() => void pickFromCamera()}
          accessibilityRole="button"
        >
          <View style={styles.optionRow}>
            <View style={styles.optionIcon}>
              <Ionicons name="camera-outline" size={22} color={c.accentText} />
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: c.text }}>
              {t('photo.takePhoto')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={c.muted} />
          </View>
        </Pressable>

        <Pressable
          style={[
            {
              paddingVertical: 14,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.card,
              marginBottom: 8,
              minHeight: 56,
              justifyContent: 'center',
            },
          ]}
          onPress={() => void pickFromLibrary()}
          accessibilityRole="button"
        >
          <View style={styles.optionRow}>
            <View style={styles.optionIcon}>
              <Ionicons name="images-outline" size={22} color={c.accentText} />
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: c.text }}>
              {t('photo.chooseLibrary')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={c.muted} />
          </View>
        </Pressable>

        <View style={styles.cancelWrap}>
          <SheetOption label={t('common.cancel')} onPress={closeSheet} />
        </View>
      </BottomSheet>
    </View>
  );
}
