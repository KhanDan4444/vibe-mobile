import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '@/src/components/AppText';
import { PrimaryButton } from '@/src/components/Form';
import { AUTH } from '@/src/theme/authChrome';
import { looksLikeMetricValue, metricDisplayStyle } from '@/src/theme/typography';

export type AuthSuccessRow = {
  label: string;
  value: string;
  latin?: boolean;
};

type Props = {
  title: string;
  hero: string;
  body?: string;
  rows?: AuthSuccessRow[];
  hint?: string;
  ctaLabel: string;
  onCta: () => void;
};

/** Auth-screen success state — matches web AuthSuccessPanel. */
export function AuthSuccessPanel({ title, hero, body, rows = [], hint, ctaLabel, onCta }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.checkCircle}>
        <Ionicons name="checkmark" size={26} color={AUTH.link} />
      </View>

      <Text display style={[styles.title, { color: AUTH.link }]}>
        {title}
      </Text>
      <Text style={[styles.hero, { color: AUTH.text }]} numberOfLines={3}>
        {hero}
      </Text>
      {body ? <Text style={[styles.body, { color: AUTH.textMuted }]}>{body}</Text> : null}

      {rows.length > 0 ? (
        <View style={styles.summary}>
          {rows.map((row, index) => (
            <View
              key={row.label}
              style={[styles.summaryRow, index < rows.length - 1 ? styles.summaryRowBorder : null]}
            >
              <Text style={[styles.summaryLabel, { color: AUTH.textDim }]}>{row.label}</Text>
              <Text
                latin={row.latin || looksLikeMetricValue(row.value)}
                display={looksLikeMetricValue(row.value)}
                style={[
                  styles.summaryValue,
                  { color: AUTH.text },
                  looksLikeMetricValue(row.value)
                    ? metricDisplayStyle({ fontSize: 14, color: AUTH.text })
                    : { fontWeight: '600' as const },
                ]}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {hint ? <Text style={[styles.hint, { color: AUTH.textDim }]}>{hint}</Text> : null}

      <PrimaryButton label={ctaLabel} onPress={onCta} style={styles.cta} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 24,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,212,191,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(45,212,191,0.35)',
    marginBottom: 18,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  hero: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 32,
    textAlign: 'center',
  },
  body: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    letterSpacing: 0.1,
    maxWidth: 320,
  },
  summary: {
    marginTop: 22,
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
  },
  summaryRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  summaryLabel: {
    fontSize: 13,
    flexShrink: 0,
    paddingTop: 1,
  },
  summaryValue: {
    fontSize: 14,
    flexShrink: 1,
    flex: 1,
    textAlign: 'right',
    lineHeight: 20,
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 300,
  },
  cta: {
    marginTop: 22,
    width: '100%',
  },
});
