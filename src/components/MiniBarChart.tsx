import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { DashboardChartPoint } from '@/src/types/api';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import {
  aggregateChartByWeek,
  CHART_OTHER_KEY,
  getPeakPoint,
  pickNearestBarIndex,
  pickNearestSliceIndex,
} from '@/src/utils/chartData';
import { formatChartAmount, formatCompactNumber, formatEtb } from '@/src/utils/formatMoney';
import { formatDisplayDate } from '@/src/utils/date';

const CHART_WIDTH = 320;
const CHART_HEIGHT = 132;
const PADDING_X = 12;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 22;

const PIE_PALETTE = [
  { base: '#0f766e', light: '#14b8a6' },
  { base: '#0891b2', light: '#a5f3fc' },
  { base: '#38bdf8', light: '#bae6fd' },
  { base: '#34d399', light: '#a7f3d0' },
  { base: '#fbbf24', light: '#fde68a' },
  { base: '#f472b6', light: '#fbcfe8' },
  { base: '#22d3ee', light: '#a5f3fc' },
  { base: '#fb923c', light: '#fed7aa' },
];

type ChartPoint = {
  x: number;
  y: number;
  amount: number;
  date: string;
};

function shortDate(date: string) {
  return formatDisplayDate(date).replace(/,?\s*\d{4}$/, '');
}

function chartPointLabel(date: string, otherLabel: string) {
  if (date === CHART_OTHER_KEY) return otherLabel;
  return shortDate(date);
}

function buildLinePath(points: ChartPoint[]) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    commands.push(`Q ${current.x} ${current.y} ${midX} ${midY}`);
  }

  const last = points[points.length - 1];
  const previous = points[points.length - 2];
  commands.push(`Q ${previous.x} ${previous.y} ${last.x} ${last.y}`);
  return commands.join(' ');
}

function chartPoints(data: DashboardChartPoint[]): ChartPoint[] {
  const amounts = data.map((d) => Number(d.amount) || 0);
  const max = Math.max(...amounts, 1);
  const min = Math.min(...amounts, 0);
  const range = max - min;
  const plotWidth = CHART_WIDTH - PADDING_X * 2;
  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const step = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  return data.map((point, index) => {
    const amount = Number(point.amount) || 0;
    const normalized = range > 0 ? (amount - min) / range : 0.5;
    return {
      x: data.length > 1 ? PADDING_X + step * index : CHART_WIDTH / 2,
      y: PADDING_TOP + (1 - normalized) * plotHeight,
      amount,
      date: point.date,
    };
  });
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeDonutSlice(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
  offset = 0
) {
  const midAngle = (startAngle + endAngle) / 2;
  const rad = ((midAngle - 90) * Math.PI) / 180;
  const ox = cx + Math.cos(rad) * offset;
  const oy = cy + Math.sin(rad) * offset;
  const outerStart = polarToCartesian(ox, oy, outerR, startAngle);
  const outerEnd = polarToCartesian(ox, oy, outerR, endAngle);
  const innerStart = polarToCartesian(ox, oy, innerR, endAngle);
  const innerEnd = polarToCartesian(ox, oy, innerR, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

function formatPercent(amount: number, total: number) {
  if (total <= 0) return '0%';
  return `${Math.round((amount / total) * 100)}%`;
}

function ChartSummaryFooter({
  start,
  end,
  focus,
  isPeak,
  styles,
}: {
  start: DashboardChartPoint;
  end: DashboardChartPoint;
  focus: DashboardChartPoint;
  isPeak: boolean;
  styles: ReturnType<typeof useChartStyles>;
}) {
  const { t } = useTranslation();
  const focusDate = shortDate(focus.date);
  const caption = isPeak
    ? t('dashboard.chartPeakDayWithDate', { date: focusDate })
    : focusDate;

  return (
    <View style={styles.footerBlock}>
      <View style={styles.labels}>
        <Text style={styles.label} numberOfLines={1}>
          {shortDate(start.date)}
        </Text>
        <View style={styles.labelsCenter}>
          <Text style={styles.footerCaption}>{caption}</Text>
          <Text style={[styles.footerAmount, styles.amountText, styles.footerAmountHero]} numberOfLines={1}>
            {formatEtb(Number(focus.amount), { forceCompact: true })}
          </Text>
        </View>
        <Text style={[styles.label, styles.labelEnd]} numberOfLines={1}>
          {shortDate(end.date)}
        </Text>
      </View>
    </View>
  );
}

function LineChartView({
  data,
  height,
  styles,
}: {
  data: DashboardChartPoint[];
  height: number;
  styles: ReturnType<typeof useChartStyles>;
}) {
  const { t } = useTranslation();
  const points = chartPoints(data);
  const { index: peakIndex, point: peak } = getPeakPoint(data);
  const start = data[0];
  const end = data[data.length - 1] ?? start;
  const linePath = buildLinePath(points);
  const baseline = CHART_HEIGHT - PADDING_BOTTOM;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const focusIndex = selectedIndex ?? peakIndex;
  const focus = data[focusIndex] ?? peak;
  const isPeak = selectedIndex == null;
  const selectedPoint = selectedIndex == null ? null : points[selectedIndex];
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`
      : '';
  const a11yCaption = isPeak
    ? t('dashboard.chartPeakDayWithDate', { date: shortDate(focus.date) })
    : shortDate(focus.date);

  useEffect(() => {
    setSelectedIndex(null);
  }, [data]);

  const selectFromTouch = (event: GestureResponderEvent) => {
    if (layoutWidth <= 0 || points.length === 0) return;
    const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / layoutWidth));
    setSelectedIndex(Math.round(ratio * (points.length - 1)));
  };

  return (
    <>
      <View
        style={[styles.chartShell, { height }]}
        onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={selectFromTouch}
        onResponderMove={selectFromTouch}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={a11yCaption}
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
          <Defs>
            {/* Match web OwnerRevenueChart: soft fill, no heavy glow under the line. */}
            <LinearGradient id="revenueAreaFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.05" stopColor={styles.chartLine.color} stopOpacity="0.1" />
              <Stop offset="0.95" stopColor={styles.chartLine.color} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          {[0.25, 0.5, 0.75].map((ratio) => (
            <Line
              key={ratio}
              x1={PADDING_X}
              x2={CHART_WIDTH - PADDING_X}
              y1={PADDING_TOP + (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * ratio}
              y2={PADDING_TOP + (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * ratio}
              stroke={styles.grid.color}
              strokeOpacity="0.35"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}
          {areaPath ? <Path d={areaPath} fill="url(#revenueAreaFill)" /> : null}
          <Path
            d={linePath}
            fill="none"
            stroke={styles.chartLine.color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {selectedPoint ? (
            <>
              <Line
                x1={selectedPoint.x}
                x2={selectedPoint.x}
                y1={PADDING_TOP}
                y2={baseline}
                stroke={styles.chartLine.color}
                strokeOpacity="0.35"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <Circle
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r={4}
                fill={styles.chartLine.color}
                stroke="white"
                strokeOpacity="0.95"
                strokeWidth={2}
              />
            </>
          ) : null}
        </Svg>
      </View>
      <ChartSummaryFooter
        start={start}
        end={end}
        focus={focus}
        isPeak={isPeak}
        styles={styles}
      />
    </>
  );
}

function barTopRoundedPath(x: number, y: number, width: number, height: number) {
  const radius = Math.min(width / 2, 7);
  if (height <= radius) {
    return `M ${x} ${y + height} A ${width / 2} ${height} 0 0 1 ${x + width} ${y + height} Z`;
  }
  return [
    `M ${x} ${y + height}`,
    `L ${x} ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    `L ${x + width - radius} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + radius}`,
    `L ${x + width} ${y + height}`,
    'Z',
  ].join(' ');
}

function compactAmount(amount: number) {
  return formatChartAmount(amount);
}

function BarChartView({
  data,
  height,
  styles,
}: {
  data: DashboardChartPoint[];
  height: number;
  styles: ReturnType<typeof useChartStyles>;
}) {
  const amounts = data.map((d) => Number(d.amount) || 0);
  const max = Math.max(...amounts, 1);
  const { index: peakIndex, point: peak } = getPeakPoint(data);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const plotHeight = height - PADDING_TOP - PADDING_BOTTOM;
  const barAreaWidth = CHART_WIDTH - PADDING_X * 2;
  const gap = data.length > 10 ? 4 : data.length > 6 ? 6 : 8;
  const barWidth = Math.min(26, Math.max(10, (barAreaWidth - gap * (data.length - 1)) / data.length));
  const clusterWidth = data.length * barWidth + Math.max(0, data.length - 1) * gap;
  const clusterStart = PADDING_X + (barAreaWidth - clusterWidth) / 2;
  const baselineY = PADDING_TOP + plotHeight;
  const start = data[0];
  const end = data[data.length - 1] ?? start;
  const focus = data[selectedIndex ?? peakIndex] ?? peak;
  const isPeak = selectedIndex == null;
  const showValueLabels = data.length <= 7;
  const accent = styles.chartLine.color;
  const barBottom = styles.barBottom.color;
  const barMid = styles.barMid.color;

  useEffect(() => {
    setSelectedIndex(null);
  }, [data]);

  const selectFromTouch = (event: GestureResponderEvent) => {
    if (layout.width <= 0) return;
    const index = pickNearestBarIndex(
      data.length,
      event.nativeEvent.locationX,
      layout.width,
      clusterStart,
      barWidth,
      gap
    );
    setSelectedIndex((current) => (current === index ? null : index));
  };

  return (
    <>
      <View
        style={[styles.chartShell, styles.barShell, { height }]}
        onLayout={(event) => {
          const { width, height: layoutHeight } = event.nativeEvent.layout;
          setLayout({ width, height: layoutHeight });
        }}
        onStartShouldSetResponder={() => true}
        onResponderRelease={selectFromTouch}
      >
        <Svg pointerEvents="none" width="100%" height="100%" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
          <Defs>
            <LinearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={accent} stopOpacity="0.92" />
              <Stop offset="0.55" stopColor={barMid} stopOpacity="0.82" />
              <Stop offset="1" stopColor={barBottom} stopOpacity="0.72" />
            </LinearGradient>
            <LinearGradient id="barPeakFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={accent} stopOpacity="1" />
              <Stop offset="1" stopColor={barBottom} stopOpacity="0.88" />
            </LinearGradient>
            <LinearGradient id="barShine" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <Stop offset="0.45" stopColor="#ffffff" stopOpacity="0.1" />
              <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          {[0.25, 0.5, 0.75].map((ratio) => (
            <Line
              key={ratio}
              x1={PADDING_X}
              x2={CHART_WIDTH - PADDING_X}
              y1={PADDING_TOP + plotHeight * ratio}
              y2={PADDING_TOP + plotHeight * ratio}
              stroke={styles.grid.color}
              strokeOpacity="0.28"
              strokeWidth="1"
              strokeDasharray="4 5"
            />
          ))}
          <Line
            x1={PADDING_X}
            x2={CHART_WIDTH - PADDING_X}
            y1={baselineY}
            y2={baselineY}
            stroke={styles.grid.color}
            strokeOpacity="0.55"
            strokeWidth="1.5"
          />
          {data.map((point, index) => {
            const amount = Number(point.amount) || 0;
            const barHeight = Math.max(6, (amount / max) * (plotHeight - 8));
            const x = clusterStart + index * (barWidth + gap);
            const y = baselineY - barHeight;
            const isPeak = index === peakIndex;
            const isSelected = selectedIndex === index;
            const highlighted = isSelected || (selectedIndex == null && isPeak);

            return (
              <Path
                key={`glow-${point.date}`}
                d={barTopRoundedPath(x - 1, y - 0.5, barWidth + 2, barHeight + 0.5)}
                fill={accent}
                opacity={highlighted ? 0.08 : 0}
              />
            );
          })}
          {data.map((point, index) => {
            const amount = Number(point.amount) || 0;
            const barHeight = Math.max(6, (amount / max) * (plotHeight - 8));
            const x = clusterStart + index * (barWidth + gap);
            const y = baselineY - barHeight;
            const isPeak = index === peakIndex;
            const isSelected = selectedIndex === index;
            const highlighted = isSelected || (selectedIndex == null && isPeak);
            const path = barTopRoundedPath(x, y, barWidth, barHeight);

            return (
              <Path
                key={point.date}
                d={path}
                fill={highlighted ? 'url(#barPeakFill)' : 'url(#barFill)'}
                stroke={accent}
                strokeOpacity={highlighted ? 0.22 : 0.08}
                strokeWidth={highlighted ? 1 : 0.6}
              />
            );
          })}
          {data.map((point, index) => {
            const amount = Number(point.amount) || 0;
            const barHeight = Math.max(6, (amount / max) * (plotHeight - 8));
            const x = clusterStart + index * (barWidth + gap);
            const y = baselineY - barHeight;
            const shineHeight = Math.min(barHeight * 0.28, 14);
            if (shineHeight < 5) return null;

            return (
              <Rect
                key={`shine-${point.date}`}
                x={x + 2}
                y={y + 2}
                width={Math.max(2, barWidth - 4)}
                height={shineHeight}
                rx={3}
                fill="url(#barShine)"
                opacity={0.55}
              />
            );
          })}
          {showValueLabels
            ? data.map((point, index) => {
                const amount = Number(point.amount) || 0;
                const barHeight = Math.max(6, (amount / max) * (plotHeight - 8));
                const x = clusterStart + index * (barWidth + gap) + barWidth / 2;
                const y = baselineY - barHeight - 6;
                const isPeak = index === peakIndex;
                const isSelected = selectedIndex === index;
                const highlighted = isSelected || (selectedIndex == null && isPeak);
                return (
                  <SvgText
                    key={`label-${point.date}`}
                    x={x}
                    y={y}
                    fill={highlighted ? accent : styles.label.color}
                    fontSize={highlighted ? 10 : 9}
                    fontWeight={highlighted ? '700' : '600'}
                    textAnchor="middle"
                  >
                    {compactAmount(amount)}
                  </SvgText>
                );
              })
            : null}
        </Svg>
      </View>
      <ChartSummaryFooter
        start={start}
        end={end}
        focus={focus}
        isPeak={isPeak}
        styles={styles}
      />
    </>
  );
}

function PieChartView({
  data,
  height,
  styles,
}: {
  data: DashboardChartPoint[];
  height: number;
  styles: ReturnType<typeof useChartStyles>;
}) {
  const { t } = useTranslation();
  const otherLabel = t('dashboard.chartOther');
  const amounts = data.map((d) => Number(d.amount) || 0);
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const cx = CHART_WIDTH / 2;
  const cy = (CHART_HEIGHT - PADDING_BOTTOM) / 2 + PADDING_TOP / 2 + 2;
  const outerR = Math.min(CHART_WIDTH, CHART_HEIGHT) * 0.36;
  const innerR = outerR * 0.62;
  const padAngle = data.length > 1 ? Math.min(2.8, 16 / data.length) : 0;
  const drawable = 360 - padAngle * data.length;

  useEffect(() => {
    setSelectedIndex(null);
  }, [data]);

  const slices = useMemo(() => {
    let cursor = padAngle / 2;
    return data.map((point, index) => {
      const amount = Number(point.amount) || 0;
      const sweep = total > 0 ? (amount / total) * drawable : 0;
      const startAngle = cursor;
      const endAngle = cursor + sweep;
      cursor = endAngle + padAngle;
      const palette =
        point.date === CHART_OTHER_KEY
          ? { base: '#94a3b8', light: '#cbd5e1' }
          : PIE_PALETTE[index % PIE_PALETTE.length];
      const isSelected = index === selectedIndex;
      return {
        index,
        date: point.date,
        amount,
        percent: formatPercent(amount, total),
        palette,
        isSelected,
        startAngle,
        endAngle,
        midAngle: (startAngle + endAngle) / 2,
        path:
          sweep > 0
            ? describeDonutSlice(cx, cy, outerR, innerR, startAngle, endAngle, isSelected ? 7 : 0)
            : '',
      };
    });
  }, [data, total, cx, cy, outerR, innerR, padAngle, drawable, selectedIndex]);

  const selectedSlice = selectedIndex != null ? slices[selectedIndex] : null;

  const legendSlices = useMemo(
    () => [...slices].filter((slice) => slice.amount > 0).sort((a, b) => b.amount - a.amount),
    [slices]
  );

  const drawOrder = useMemo(
    () => [...slices].sort((a, b) => Number(a.isSelected) - Number(b.isSelected)),
    [slices]
  );

  const selectSlice = (index: number) => {
    setSelectedIndex((current) => (current === index ? null : index));
  };

  const selectFromTouch = (event: GestureResponderEvent) => {
    if (layout.width <= 0) return;
    const index = pickNearestSliceIndex(
      slices,
      event.nativeEvent.locationX,
      event.nativeEvent.locationY,
      layout,
      cx,
      cy
    );
    if (index != null) selectSlice(index);
  };

  return (
    <>
      <View
        style={[styles.chartShell, styles.pieShell, { height: height + 8 }]}
        onLayout={(event) => {
          const { width, height: layoutHeight } = event.nativeEvent.layout;
          setLayout({ width, height: layoutHeight });
        }}
        onStartShouldSetResponder={() => true}
        onResponderRelease={selectFromTouch}
      >
        <Svg pointerEvents="none" width="100%" height="100%" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 8}`} preserveAspectRatio="xMidYMid meet">
          <Defs>
            {slices.map((slice, index) => (
              <LinearGradient key={`grad-${slice.date}-${index}`} id={`pieSlice${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={slice.palette.light} stopOpacity="1" />
                <Stop offset="100%" stopColor={slice.palette.base} stopOpacity="1" />
              </LinearGradient>
            ))}
          </Defs>
          <Circle cx={cx} cy={cy} r={outerR + 5} fill={styles.pieTrack.color} opacity={0.55} />
          <Path
            d={describeDonutSlice(cx, cy, outerR, innerR, 0, 359.99)}
            fill={styles.pieTrack.color}
            opacity={0.35}
          />
          {drawOrder.map((slice, index) =>
            slice.path ? (
              <Path
                key={`${slice.date}-${index}`}
                d={slice.path}
                fill={`url(#pieSlice${slice.index})`}
                stroke={styles.pieGap.color}
                strokeWidth={slice.isSelected ? 2.2 : 1.6}
                strokeOpacity={slice.isSelected ? 0.95 : 0.75}
              />
            ) : null
          )}
          <Circle cx={cx} cy={cy} r={innerR - 3} fill={styles.pieHub.color} opacity={0.98} />
          <Circle cx={cx} cy={cy} r={innerR - 3} fill="none" stroke={styles.pieGap.color} strokeOpacity={0.35} strokeWidth="1" />
          {selectedSlice ? (
            <>
              <SvgText x={cx} y={cy - 12} fill={styles.label.color} fontSize="10" fontWeight="600" textAnchor="middle">
                {chartPointLabel(selectedSlice.date, otherLabel)}
              </SvgText>
              <SvgText x={cx} y={cy + 4} fill={styles.amountText.color} fontSize="15" fontWeight="700" textAnchor="middle">
                {formatCompactNumber(selectedSlice.amount)}
              </SvgText>
              <SvgText x={cx} y={cy + 18} fill={styles.label.color} fontSize="10" textAnchor="middle">
                ETB · {selectedSlice.percent}
              </SvgText>
            </>
          ) : (
            <>
              <SvgText x={cx} y={cy - 14} fill={styles.label.color} fontSize="10" fontWeight="600" textAnchor="middle">
                {t('dashboard.chartPieTotal')}
              </SvgText>
              <SvgText x={cx} y={cy + 2} fill={styles.amountText.color} fontSize="15" fontWeight="700" textAnchor="middle">
                {formatCompactNumber(total)}
              </SvgText>
              <SvgText x={cx} y={cy + 16} fill={styles.label.color} fontSize="10" textAnchor="middle">
                ETB
              </SvgText>
              <SvgText x={cx} y={cy + 30} fill={styles.muted.color} fontSize="9" fontWeight="600" textAnchor="middle">
                {t('dashboard.chartPieTapHint')}
              </SvgText>
            </>
          )}
        </Svg>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pieLegend}>
        {legendSlices.map((slice, index) => {
          const active = selectedIndex === slice.index;
          return (
            <Pressable
              key={`${slice.date}-legend-${index}`}
              style={[styles.pieLegendCard, active && styles.pieLegendCardSelected]}
              onPress={() => selectSlice(slice.index)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <View style={styles.pieLegendCardTop}>
                <View style={[styles.pieLegendSwatch, { backgroundColor: slice.palette.base }]} />
                <Text style={[styles.pieLegendPercent, active && styles.pieLegendPercentSelected]}>
                  {slice.percent}
                </Text>
              </View>
              <Text style={[styles.pieLegendDate, active && styles.pieLegendDateSelected]} numberOfLines={1}>
                {chartPointLabel(slice.date, otherLabel)}
              </Text>
              <Text style={styles.pieLegendAmount} numberOfLines={1}>
                {formatEtb(slice.amount, { forceCompact: true })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}

function useChartStyles() {
  return useThemedStyles((c) => ({
    wrap: { marginTop: 8 },
    chartShell: {
      marginTop: 10,
      overflow: 'hidden' as const,
      borderRadius: 16,
      backgroundColor: c.inputBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardEdge,
    },
    barShell: {},
    pieShell: {},
    labels: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-end' as const,
      marginTop: 8,
    },
    labelsCenter: { flex: 1, alignItems: 'center' as const, paddingHorizontal: 8 },
    labelEnd: { textAlign: 'right' as const },
    footerBlock: { marginTop: 8 },
    footerCaption: { fontSize: 10, color: c.dim, textTransform: 'uppercase' as const, letterSpacing: 0.4 },
    footerAmount: { marginTop: 2, fontSize: 16, fontWeight: '700' as const },
    footerAmountHero: { fontWeight: '800' as const, letterSpacing: -0.2 },
    amountText: { color: c.text },
    label: { fontSize: 11, color: c.dim },
    muted: { color: c.muted },
    empty: { fontSize: 14, color: c.dim, marginTop: 8 },
    accent: { color: c.accentText },
    chartLine: { color: c.accentText },
    barMid: { color: c.accent },
    barBottom: { color: c.accent },
    grid: { color: c.border },
    pieTrack: { color: c.border },
    pieGap: { color: c.inputBg },
    pieHub: { color: c.inputBg },
    pieLegend: { marginTop: 12, gap: 8, paddingRight: 8 },
    pieLegendCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardEdge,
      minWidth: 108,
    },
    pieLegendCardSelected: {
      borderColor: c.accentText,
      backgroundColor: c.accentSoft,
    },
    pieLegendCardTop: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 6,
    },
    pieLegendSwatch: { width: 18, height: 6, borderRadius: 3 },
    pieLegendPercent: { fontSize: 11, fontWeight: '700' as const, color: c.muted },
    pieLegendPercentSelected: { color: c.accentText },
    pieLegendDate: { fontSize: 12, fontWeight: '600' as const, color: c.text },
    pieLegendDateSelected: { color: c.accentText },
    pieLegendAmount: { marginTop: 2, fontSize: 11, color: c.dim },
    chartNote: { marginTop: 6, fontSize: 11, color: c.dim, textAlign: 'center' as const },
    chartScopeHint: { marginTop: 6, fontSize: 11, color: c.dim, textAlign: 'center' as const },
    chartRevenueHint: { marginTop: 10, fontSize: 11, color: c.dim, textAlign: 'center' as const },
  }));
}

export function MiniBarChart({
  data,
  height = CHART_HEIGHT,
}: {
  data: DashboardChartPoint[];
  height?: number;
}) {
  const { t } = useTranslation();
  const styles = useChartStyles();
  const lineBarBundle = useMemo(() => aggregateChartByWeek(data), [data]);

  const chartNote = lineBarBundle.grouped
    ? t('dashboard.chartWeekGrouped', { count: lineBarBundle.sourceDays })
    : null;

  if (!data.length) {
    return <Text style={styles.empty}>{t('dashboard.noRevenueData')}</Text>;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.chartScopeHint}>{t('dashboard.chartScopeHint')}</Text>
      {chartNote ? <Text style={styles.chartNote}>{chartNote}</Text> : null}
      <LineChartView data={lineBarBundle.points} height={height} styles={styles} />
      <Text style={styles.chartRevenueHint}>{t('dashboard.chartRevenueHint')}</Text>
    </View>
  );
}
