import { useEffect, useState, type ReactNode } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AppText as Text } from '@/src/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { ResponsiveContent } from '@/src/components/ResponsiveContent';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { APP_LANGUAGES, LANGUAGE_LABEL_KEYS, type AppLanguage } from '@/src/i18n';
import { springs } from '@/src/theme/motion';
import { radiusMd, radiusSm, type AppTheme } from '@/src/theme/tokens';
import { initialsFrom, roleSubtitleKey } from '@/src/utils/userDisplay';
import { hasGymPortalAccess, isGymOwner } from '@/src/utils/roles';

const THEME_SEGMENT_PAD = 3;
const THEME_SEGMENT_GAP = 2;

type ChevronKind = 'forward' | 'down' | 'none';

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  danger?: boolean;
  /** Default: forward for links, down when dropdown, none for actions like logout. */
  chevron?: ChevronKind;
  /** Hide bottom divider when this is the last row in a group. */
  last?: boolean;
  onPress: () => void;
};

function AccountGroup({ children }: { children: ReactNode }) {
  return <SoftSurface variant="group" style={styles.group}>{children}</SoftSurface>;
}

function AccountRow({ icon, label, value, danger, chevron = 'forward', last, onPress }: RowProps) {
  const { colors: c } = useTheme();
  const iconColor = danger ? c.error : c.muted;
  const labelColor = danger ? c.error : c.text;

  return (
    <Pressable
      style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color={iconColor} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
      {value ? <Text style={[styles.rowValue, { color: c.dim }]}>{value}</Text> : null}
      {chevron === 'down' ? (
        <Ionicons name="chevron-down" size={18} color={c.dim} style={styles.rowCaret} />
      ) : chevron === 'forward' ? (
        <Ionicons name="chevron-forward" size={18} color={c.dim} />
      ) : null}
    </Pressable>
  );
}

/** Compact Light | Dark control — sliding thumb, binary choice on the row. */
function AppearanceThemeSegment({
  value,
  onChange,
  lightLabel,
  darkLabel,
}: {
  value: AppTheme;
  onChange: (next: AppTheme) => void;
  lightLabel: string;
  darkLabel: string;
}) {
  const { colors: c } = useTheme();
  const options: { id: AppTheme; label: string }[] = [
    { id: 'light', label: lightLabel },
    { id: 'dark', label: darkLabel },
  ];
  const trackWidth = useSharedValue(0);
  const index = useSharedValue(value === 'dark' ? 1 : 0);

  useEffect(() => {
    index.value = withSpring(value === 'dark' ? 1 : 0, springs.press);
  }, [index, value]);

  const thumbStyle = useAnimatedStyle(() => {
    const measured = trackWidth.value > 0;
    const inner = Math.max(0, trackWidth.value - THEME_SEGMENT_PAD * 2 - THEME_SEGMENT_GAP);
    const optionW = inner / 2;
    return {
      width: optionW,
      opacity: measured ? 1 : 0,
      transform: [
        {
          translateX:
            THEME_SEGMENT_PAD + index.value * (optionW + THEME_SEGMENT_GAP),
        },
      ],
    };
  });

  const pick = (next: AppTheme) => {
    if (next === value) return;
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync().catch(() => undefined);
    }
    onChange(next);
  };

  return (
    <View
      style={[
        styles.themeSegment,
        {
          backgroundColor: c.inputBg,
          borderColor: c.border,
        },
      ]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Appearance"
      onLayout={(e) => {
        trackWidth.value = e.nativeEvent.layout.width;
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.themeSegmentThumb,
          { backgroundColor: c.card, borderColor: c.cardEdge },
          thumbStyle,
        ]}
      />
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.label}
            hitSlop={4}
            onPress={() => pick(opt.id)}
            style={styles.themeSegmentOption}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              style={[
                styles.themeSegmentLabel,
                { color: selected ? c.text : c.dim },
                selected && styles.themeSegmentLabelSelected,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AppearanceRow({ last }: { last?: boolean }) {
  const { colors: c, theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
      ]}
    >
      <Ionicons
        name={theme === 'dark' ? 'moon-outline' : 'sunny-outline'}
        size={22}
        color={c.muted}
        style={styles.rowIcon}
      />
      <Text style={[styles.rowLabel, { color: c.text }]}>{t('profile.appearance')}</Text>
      <AppearanceThemeSegment
        value={theme}
        onChange={(next) => void setTheme(next)}
        lightLabel={t('profile.themeLight')}
        darkLabel={t('profile.themeDark')}
      />
    </View>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors: c } = useTheme();
  const { language, setLanguage } = usePreferences();
  const { t } = useTranslation();
  const { isTablet, pagePadding } = useResponsiveLayout();
  const owner = isGymOwner(user?.role);
  const [langOpen, setLangOpen] = useState(false);

  if (!user || !hasGymPortalAccess(user.role)) {
    return <Redirect href="/login" />;
  }

  const displayName = user.name || user.email || user.username || 'User';
  const langLabel = t(LANGUAGE_LABEL_KEYS[language]);

  const pickLanguage = (lng: AppLanguage) => {
    void setLanguage(lng);
    setLangOpen(false);
  };

  const preferencesBlock = (
    <>
      <Text style={[styles.section, { color: c.dim }]}>{t('account.preferences')}</Text>
      <AccountGroup>
        <AppearanceRow />
        <AccountRow
          icon="language-outline"
          label={t('profile.language')}
          value={langLabel}
          chevron="down"
          last
          onPress={() => setLangOpen(true)}
        />
      </AccountGroup>
    </>
  );

  const securityBlock = (
    <>
      <Text style={[styles.section, { color: c.dim }]}>{t('account.security')}</Text>
      <AccountGroup>
        {owner ? (
          <AccountRow
            icon="storefront-outline"
            label={t('profile.gymProfile')}
            onPress={() => router.push('/profile')}
          />
        ) : null}
        <AccountRow
          icon="key-outline"
          label={t('profile.changePassword')}
          last
          onPress={() => router.push('/change-password')}
        />
      </AccountGroup>
    </>
  );

  const sessionBlock = (
    <>
      <Text style={[styles.section, { color: c.dim }]}>{t('account.session')}</Text>
      <AccountGroup>
        <AccountRow
          icon="log-out-outline"
          label={t('profile.signOut')}
          danger
          chevron="none"
          last
          onPress={() => void logout()}
        />
      </AccountGroup>
    </>
  );

  return (
    <TabScreenFrame>
      <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
        <ResponsiveContent style={{ paddingHorizontal: pagePadding }}>
          <SoftSurface variant="panel" style={styles.profileCard}>
            <View style={[styles.avatar, { backgroundColor: c.accent }]}>
              <Text latin style={styles.avatarText}>
                {initialsFrom(user.name, user.email, user.username)}
              </Text>
            </View>
            <View style={styles.profileText}>
              <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text latin style={[styles.meta, { color: c.muted }]} numberOfLines={1}>
                {user.username || user.email}
              </Text>
              <Text style={[styles.role, { color: c.dim }]}>{t(roleSubtitleKey(user.role))}</Text>
            </View>
          </SoftSurface>

          <View style={[styles.menuGrid, isTablet && styles.menuGridTablet]}>
            <View style={isTablet ? styles.menuColumn : undefined}>
              {preferencesBlock}
              {isTablet ? sessionBlock : null}
            </View>
            <View style={isTablet ? styles.menuColumn : undefined}>{securityBlock}</View>
          </View>

          {!isTablet ? sessionBlock : null}
        </ResponsiveContent>
      </ScrollView>

      <BottomSheet visible={langOpen} title={t('profile.language')} onClose={() => setLangOpen(false)} compact>
        {APP_LANGUAGES.map((lng) => (
          <SheetOption
            key={lng}
            label={t(LANGUAGE_LABEL_KEYS[lng])}
            selected={lng === language}
            onPress={() => pickLanguage(lng)}
          />
        ))}
      </BottomSheet>
    </TabScreenFrame>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 18,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  profileText: { flex: 1 },
  name: { fontSize: 18, fontWeight: '600', letterSpacing: -0.2 },
  meta: { marginTop: 3, fontSize: 13 },
  role: { marginTop: 4, fontSize: 12, fontWeight: '500' },
  section: { marginTop: 14, marginBottom: 8, paddingHorizontal: 4, fontSize: 13, fontWeight: '600' },
  group: {
    overflow: 'hidden',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  rowIcon: { marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  rowValue: { fontSize: 13, fontWeight: '600', marginRight: 4 },
  rowCaret: { marginLeft: 2 },
  themeSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME_SEGMENT_PAD,
    borderRadius: radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    gap: THEME_SEGMENT_GAP,
    maxWidth: 184,
    flexShrink: 0,
    position: 'relative',
  },
  themeSegmentThumb: {
    position: 'absolute',
    top: THEME_SEGMENT_PAD,
    bottom: THEME_SEGMENT_PAD,
    left: 0,
    borderRadius: radiusSm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  themeSegmentOption: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  themeSegmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  themeSegmentLabelSelected: {
    fontWeight: '700',
  },
  menuGrid: { gap: 0 },
  menuGridTablet: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  menuColumn: { width: '48.5%', flexGrow: 0 },
});
