import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { BottomSheet } from '@/src/components/BottomSheet';
import { useTheme } from '@/src/context/PreferencesContext';
import { radiusLg } from '@/src/theme/tokens';

export function ScanMemberQrSheet({
  visible,
  busy,
  onClose,
  onScan,
}: {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onScan: (token: string) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const handlingRef = useRef(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!visible) {
      handlingRef.current = false;
      setMessage('');
      return;
    }
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handleBarcode = useCallback(
    async (result: BarcodeScanningResult) => {
      const data = result?.data?.trim();
      if (!data || handlingRef.current || busy) return;
      handlingRef.current = true;
      setMessage(t('common.processing'));
      try {
        await onScan(data);
      } finally {
        setTimeout(() => {
          handlingRef.current = false;
          setMessage('');
        }, 1600);
      }
    },
    [busy, onScan, t]
  );

  return (
    <BottomSheet
      visible={visible}
      title={t('checkIn.scanTitle')}
      onClose={() => {
        if (!busy) onClose();
      }}
      showCloseButton
    >
      <Text style={{ color: c.muted, fontSize: 14, lineHeight: 20, marginBottom: 12 }}>
        {t('checkIn.scanBody')}
      </Text>

      {!permission?.granted ? (
        <View style={styles.fallback}>
          <Text style={{ color: c.text, textAlign: 'center', marginBottom: 12 }}>
            {t('checkIn.scanCameraError')}
          </Text>
          <Text
            onPress={() => void requestPermission()}
            style={{ color: c.accentText, textAlign: 'center', fontWeight: '600' }}
          >
            {t('checkIn.scanAllowCamera')}
          </Text>
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={busy ? undefined : handleBarcode}
          />
          <View style={styles.frame} pointerEvents="none" />
        </View>
      )}

      {message || busy ? (
        <Text style={{ marginTop: 12, textAlign: 'center', color: c.muted, fontSize: 13 }}>
          {busy ? t('common.processing') : message}
        </Text>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  cameraWrap: {
    height: 280,
    borderRadius: radiusLg,
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
  },
  frame: {
    ...StyleSheet.absoluteFillObject,
    margin: 36,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 16,
  },
  fallback: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
