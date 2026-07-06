import { Alert, Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Label } from '@/src/components/Form';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { compressMemberPhoto } from '@/src/utils/compressMemberPhoto';

export function PhotoPickerField({
  previewUri,
  onChange,
  processing,
  setProcessing,
}: {
  previewUri: string;
  onChange: (dataUrl: string, preview: string) => void;
  processing: boolean;
  setProcessing: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles((c) => ({
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 16, marginTop: 4 },
    preview: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.border },
    placeholder: { alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1, borderColor: c.border },
    placeholderText: { color: c.dim, fontSize: 11 },
    actions: { flex: 1, gap: 8 },
    btn: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'center' as const,
    },
    btnSecondary: { backgroundColor: 'transparent' },
    btnText: { color: c.text, fontSize: 14, fontWeight: '600' as const },
    btnTextSecondary: { color: c.muted, fontSize: 14 },
  }));

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('photo.permissionTitle'), t('photo.permissionBody'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) return;

    setProcessing(true);
    try {
      const dataUrl = await compressMemberPhoto(result.assets[0].uri);
      onChange(dataUrl, result.assets[0].uri);
    } catch (e) {
      Alert.alert(t('photo.errorTitle'), e instanceof Error ? e.message : t('common.error'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View>
      <Label>{t('photo.label')}</Label>
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
          <Pressable style={styles.btn} onPress={pickPhoto} disabled={processing}>
            <Text style={styles.btnText}>
              {processing ? t('photo.processing') : previewUri ? t('photo.change') : t('photo.add')}
            </Text>
          </Pressable>
          {previewUri ? (
            <Pressable
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => onChange('', '')}
              disabled={processing}
            >
              <Text style={styles.btnTextSecondary}>{t('photo.remove')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
