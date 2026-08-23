import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { Label } from '@/src/components/Form';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { radiusMd } from '@/src/theme/tokens';
import { compressMemberPhoto } from '@/src/utils/compressMemberPhoto';
import { dismissKeyboardThen } from '@/src/utils/dismissKeyboard';

const PICKER_OPTIONS = {
  mediaTypes: ['images'] as ImagePicker.MediaType[],
  allowsEditing: true,
  aspect: [1, 1] as [number, number],
  quality: 1,
};

/**
 * One composed photo control — avatar + action in a single tappable surface
 * (not a placeholder disc beside a separate Add button).
 */
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

  const hasPhoto = Boolean(previewUri);
  const title = processing
    ? t('photo.processing')
    : hasPhoto
      ? t('photo.changePhoto')
      : t('photo.add');
  const subtitle = hasPhoto ? t('photo.tapToReplace') : t('photo.optionalHint');
  const pickBlocked = processing || pickDisabled;

  return (
    <View>
      <Label>{t('photo.label')}</Label>
      {notice ? <Text style={[styles.notice, { color: c.warning }]}>{notice}</Text> : null}

      <SoftSurface
        variant="quiet"
        flat
        onPress={pickBlocked ? undefined : openPhotoActions}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={[styles.tile, pickBlocked && styles.tileDisabled]}
      >
        <View style={[styles.avatar, { backgroundColor: c.accentSoft }]}>
          {processing ? (
            <ActivityIndicator color={c.accentText} />
          ) : hasPhoto ? (
            <Image source={{ uri: previewUri }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="camera-outline" size={22} color={c.accentText} />
          )}
        </View>

        <View style={styles.copy}>
          <Text style={[styles.title, { color: pickBlocked ? c.dim : c.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: c.dim }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        {!processing ? (
          <Ionicons
            name={hasPhoto ? 'create-outline' : 'add-circle-outline'}
            size={20}
            color={pickBlocked ? c.dim : c.accentText}
          />
        ) : null}
      </SoftSurface>

      {hasPhoto && !processing ? (
        <Pressable
          onPress={() => onChange('', '')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('photo.remove')}
          style={styles.removeHit}
        >
          <Text style={[styles.remove, { color: c.dim }]}>{t('photo.remove')}</Text>
        </Pressable>
      ) : null}

      <BottomSheet visible={sheetOpen} title={t('photo.label')} onClose={closeSheet} compact>
        <SheetOption label={t('photo.takePhoto')} onPress={() => void pickFromCamera()} />
        <SheetOption label={t('photo.chooseLibrary')} onPress={() => void pickFromLibrary()} />
        <SheetOption label={t('common.cancel')} onPress={closeSheet} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
    borderRadius: radiusMd,
  },
  tileDisabled: {
    opacity: 0.72,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '600', letterSpacing: -0.1 },
  subtitle: { marginTop: 2, fontSize: 13, lineHeight: 18 },
  removeHit: {
    alignSelf: 'flex-start',
    marginTop: 10,
    marginLeft: 4,
    minHeight: 32,
    justifyContent: 'center',
  },
  remove: { fontSize: 14, fontWeight: '500' },
});
