import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '@/src/components/AppText';
import { PrimaryButton } from '@/src/components/Form';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { statusWashOpaque } from '@/src/utils/statusWash';

type SummaryRow = { label: string; value: string; latin?: boolean };

/**
 * In-app premium success state (change password, gym profile, etc.).
 */
export function FormSuccessView({
  title,
  hero,
  body,
  rows = [],
  hint,
  ctaLabel,
  onCta,
}: {
  title: string;
  hero: string;
  body: string;
  rows?: SummaryRow[];
  hint?: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  const { colors: c } = useTheme();
  const styles = useThemedStyles((colors) => ({
    wrap: {
      width: '100%' as const,
      alignItems: 'center' as const,
      paddingTop: 28,
      paddingBottom: 24,
    },
    checkCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: statusWashOpaque(colors.success, colors.bg, 0.14),
      borderWidth: 1,
      borderColor: statusWashOpaque(colors.success, colors.cardEdge, 0.4),
      marginBottom: 22,
    },
    checkInner: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: statusWashOpaque(colors.success, colors.card, 0.18),
    },
    title: {
      fontSize: 15,
      fontWeight: '600' as const,
      letterSpacing: 0.2,
      textAlign: 'center' as const,
      color: colors.success,
    },
    hero: {
      marginTop: 10,
      fontSize: 26,
      fontWeight: '700' as const,
      letterSpacing: -0.4,
      lineHeight: 32,
      textAlign: 'center' as const,
      color: colors.text,
    },
    body: {
      marginTop: 10,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center' as const,
      color: colors.muted,
      maxWidth: 320,
    },
    summary: {
      marginTop: 22,
      width: '100%' as const,
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    summaryRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    summaryRowLast: { borderBottomWidth: 0 },
    summaryLabel: { fontSize: 13, color: colors.dim, flexShrink: 0 },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
      flexShrink: 1,
      textAlign: 'right' as const,
    },
    hint: {
      marginTop: 16,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center' as const,
      color: colors.dim,
      maxWidth: 300,
    },
    cta: { marginTop: 22, width: '100%' as const },
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.checkCircle}>
        <View style={styles.checkInner}>
          <Ionicons name="checkmark" size={34} color={c.success} />
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hero} numberOfLines={2}>
        {hero}
      </Text>
      <Text style={styles.body}>{body}</Text>

      {rows.length > 0 ? (
        <SoftSurface variant="panel" style={styles.summary}>
          {rows.map((row, index) => (
            <View
              key={row.label}
              style={[styles.summaryRow, index === rows.length - 1 ? styles.summaryRowLast : null]}
            >
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text latin={row.latin} style={styles.summaryValue} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          ))}
        </SoftSurface>
      ) : null}

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <PrimaryButton label={ctaLabel} onPress={onCta} style={styles.cta} />
    </View>
  );
}
