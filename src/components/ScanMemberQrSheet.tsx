import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';

const MASK = 'rgba(0,0,0,0.58)';
const LASER = '#5eead4';
const CORNER_IDLE = 'rgba(255,255,255,0.95)';
const CORNER = 34;
const STROKE = 4;

type ScanPhase = 'starting' | 'ready' | 'locking';

function useReticleSize(width: number, height: number) {
  return useMemo(() => {
    const side = Math.round(Math.min(width * 0.68, height * 0.34, 268));
    return Math.max(200, side);
  }, [width, height]);
}

function ScanMask({
  width,
  height,
  hole,
  holeTop,
}: {
  width: number;
  height: number;
  hole: number;
  holeTop: number;
}) {
  const side = Math.max(0, (width - hole) / 2);
  const bottom = Math.max(0, height - holeTop - hole);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ height: holeTop, backgroundColor: MASK }} />
      <View style={{ height: hole, flexDirection: 'row' }}>
        <View style={{ width: side, backgroundColor: MASK }} />
        <View style={{ width: hole }} />
        <View style={{ width: side, backgroundColor: MASK }} />
      </View>
      <View style={{ height: bottom, backgroundColor: MASK }} />
    </View>
  );
}

function ScanReticle({
  size,
  phase,
  reduceMotion,
}: {
  size: number;
  phase: ScanPhase;
  reduceMotion?: boolean;
}) {
  const pulse = useSharedValue(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (phase === 'ready' && !reduceMotion) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      sweep.value = 0;
      sweep.value = withRepeat(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        -1,
        false
      );
      return;
    }
    if (phase === 'locking') {
      pulse.value = withTiming(0, { duration: 120 });
      sweep.value = withTiming(0.48, { duration: 140 });
      return;
    }
    pulse.value = withTiming(0, { duration: 120 });
    sweep.value = withTiming(0, { duration: 120 });
  }, [phase, reduceMotion, pulse, sweep]);

  const frameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.012 }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.4,
    transform: [{ translateY: interpolate(sweep.value, [0, 1], [10, size - 18]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.22 + pulse.value * 0.2,
    transform: [{ translateY: interpolate(sweep.value, [0, 1], [6, size - 22]) }],
  }));

  const cornerColor = phase === 'locking' ? LASER : CORNER_IDLE;
  const showSweep = phase === 'ready' && !reduceMotion;
  const radius = 12;

  return (
    <Animated.View style={[{ width: size, height: size }, frameStyle]} pointerEvents="none">
      <View
        style={[
          styles.corner,
          {
            top: 0,
            left: 0,
            borderTopWidth: STROKE,
            borderLeftWidth: STROKE,
            borderColor: cornerColor,
            borderTopLeftRadius: radius,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            top: 0,
            right: 0,
            borderTopWidth: STROKE,
            borderRightWidth: STROKE,
            borderColor: cornerColor,
            borderTopRightRadius: radius,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            bottom: 0,
            left: 0,
            borderBottomWidth: STROKE,
            borderLeftWidth: STROKE,
            borderColor: cornerColor,
            borderBottomLeftRadius: radius,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            bottom: 0,
            right: 0,
            borderBottomWidth: STROKE,
            borderRightWidth: STROKE,
            borderColor: cornerColor,
            borderBottomRightRadius: radius,
          },
        ]}
      />
      {showSweep ? (
        <>
          <Animated.View style={[styles.sweepGlow, glowStyle]} />
          <Animated.View style={[styles.sweepLine, lineStyle]} />
        </>
      ) : null}
    </Animated.View>
  );
}

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
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const handlingRef = useRef(false);
  const [phase, setPhase] = useState<ScanPhase>('starting');
  const [cameraKey, setCameraKey] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const hole = useReticleSize(width, height);
  // Optical center: slightly above geometric middle (desk hold angle).
  const holeTop = Math.round((height - hole) * 0.42);
  const granted = Boolean(permission?.granted);
  const locking = phase === 'locking' || Boolean(busy);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (!visible) {
      handlingRef.current = false;
      setPhase('starting');
      setTorchOn(false);
      return;
    }
    setCameraKey((k) => k + 1);
    setPhase('starting');
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [visible, permission, requestPermission]);

  useEffect(() => {
    if (!visible || !granted) return;
    if (busy) setPhase('locking');
  }, [busy, visible, granted]);

  const handleBarcode = useCallback(
    async (result: BarcodeScanningResult) => {
      const data = result?.data?.trim();
      if (!data || handlingRef.current || busy || phase === 'locking') return;
      handlingRef.current = true;
      setPhase('locking');
      setTorchOn(false);
      try {
        await onScan(data);
      } finally {
        // Stay locked longer so the same code isn't hammered while the sheet closes / toast shows.
        setTimeout(() => {
          handlingRef.current = false;
          if (visible) setPhase('ready');
        }, 2400);
      }
    },
    [busy, onScan, phase, visible]
  );

  const hint =
    locking
      ? t('checkIn.scanLocked')
      : phase === 'starting'
        ? t('checkIn.scanStarting')
        : t('checkIn.scanHint');

  const dismiss = () => {
    if (!busy && phase !== 'locking') onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="fullScreen"
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.root}>
        {!granted ? (
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(160)}
            style={[styles.permission, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
          >
            <Pressable
              onPress={dismiss}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={styles.backBtn}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </Pressable>
            <View style={styles.permissionBody}>
              <Text display style={styles.permissionTitle}>
                {t('checkIn.scanTitle')}
              </Text>
              <Text style={styles.permissionCopy}>{t('checkIn.scanCameraError')}</Text>
              <Pressable
                onPress={() => void requestPermission()}
                accessibilityRole="button"
                style={styles.allowBtn}
              >
                <Text style={styles.allowLabel}>{t('checkIn.scanAllowCamera')}</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <>
            <CameraView
              key={cameraKey}
              style={StyleSheet.absoluteFillObject}
              facing="back"
              enableTorch={torchOn}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onCameraReady={() => {
                if (!handlingRef.current && !busy) setPhase('ready');
              }}
              onBarcodeScanned={locking || phase === 'starting' ? undefined : handleBarcode}
            />

            <ScanMask width={width} height={height} hole={hole} holeTop={holeTop} />

            <View
              style={[styles.reticleSlot, { top: holeTop, left: (width - hole) / 2, width: hole, height: hole }]}
              pointerEvents="none"
            >
              <ScanReticle size={hole} phase={phase} reduceMotion={reduceMotion} />
            </View>

            <View
              style={[styles.hintWrap, { top: holeTop + hole + 18 }]}
              pointerEvents="none"
            >
              <Text style={[styles.hint, locking ? styles.hintLock : null]}>{hint}</Text>
            </View>

            <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
              <Pressable
                onPress={dismiss}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                style={styles.backBtn}
                hitSlop={10}
                disabled={busy || phase === 'locking'}
              >
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </Pressable>
            </View>

            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: torchOn }}
                accessibilityLabel={t('checkIn.scanTorch')}
                onPress={() => setTorchOn((v) => !v)}
                disabled={locking}
                style={({ pressed }) => [
                  styles.toolBtn,
                  torchOn ? styles.toolBtnOn : null,
                  { opacity: pressed || locking ? 0.7 : 1 },
                ]}
              >
                <Ionicons
                  name={torchOn ? 'flashlight' : 'flashlight-outline'}
                  size={22}
                  color={torchOn ? '#042f2e' : '#fff'}
                />
                <Text style={[styles.toolLabel, torchOn ? styles.toolLabelOn : null]}>
                  {t('checkIn.scanTorch')}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    zIndex: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleSlot: {
    position: 'absolute',
    zIndex: 2,
  },
  hintWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 3,
  },
  hint: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.15,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hintLock: {
    color: LASER,
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 4,
  },
  toolBtn: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  toolBtnOn: {
    backgroundColor: LASER,
  },
  toolLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  toolLabelOn: {
    color: '#042f2e',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
  },
  sweepLine: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: LASER,
  },
  sweepGlow: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 10,
    borderRadius: 6,
    backgroundColor: LASER,
  },
  permission: {
    flex: 1,
    backgroundColor: '#0a0c10',
    paddingHorizontal: 24,
  },
  permissionBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  permissionCopy: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  allowBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(45,212,191,0.18)',
  },
  allowLabel: {
    color: LASER,
    fontSize: 15,
    fontWeight: '700',
  },
});
