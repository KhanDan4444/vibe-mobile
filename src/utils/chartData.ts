import type { DashboardChartPoint } from '@/src/types/api';

const LINE_BAR_MAX_POINTS = 12;
const PIE_MAX_SLICES = 6;

export function getPeakPoint(data: DashboardChartPoint[]): { index: number; point: DashboardChartPoint } {
  if (!data.length) {
    return { index: 0, point: { date: '', amount: 0 } };
  }
  let index = 0;
  data.forEach((point, i) => {
    if (Number(point.amount) > Number(data[index].amount)) index = i;
  });
  return { index, point: data[index] };
}

export function pickNearestBarIndex(
  dataLength: number,
  locationX: number,
  layoutWidth: number,
  clusterStart: number,
  barWidth: number,
  gap: number
) {
  if (dataLength <= 0 || layoutWidth <= 0) return 0;
  const chartX = (locationX / layoutWidth) * CHART_WIDTH;
  let nearest = 0;
  let nearestDist = Number.POSITIVE_INFINITY;
  for (let index = 0; index < dataLength; index += 1) {
    const center = clusterStart + index * (barWidth + gap) + barWidth / 2;
    const dist = Math.abs(chartX - center);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = index;
    }
  }
  return nearest;
}

export function pickNearestSliceIndex(
  slices: { startAngle: number; endAngle: number }[],
  locationX: number,
  locationY: number,
  layout: { width: number; height: number },
  cx: number,
  cy: number
) {
  if (!slices.length || layout.width <= 0 || layout.height <= 0) return null;
  const x = (locationX / layout.width) * CHART_WIDTH;
  const y = (locationY / layout.height) * (CHART_HEIGHT + 8);
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);
  const innerR = Math.min(CHART_WIDTH, CHART_HEIGHT) * 0.36 * 0.62;
  const outerR = Math.min(CHART_WIDTH, CHART_HEIGHT) * 0.36 + 5;
  if (dist < innerR - 6 || dist > outerR + 10) return null;

  let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (angle < 0) angle += 360;

  for (let index = 0; index < slices.length; index += 1) {
    const slice = slices[index];
    if (angle >= slice.startAngle && angle < slice.endAngle) return index;
  }
  return slices.length > 0 ? slices.length - 1 : null;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 132;

export const CHART_OTHER_KEY = '__other__';

function weekBucket(dateStr: string) {
  const day = Number(dateStr.slice(8, 10));
  if (!Number.isFinite(day) || day < 1) return 1;
  return Math.ceil(day / 7);
}

/** Collapse many payment days into week buckets for line/bar charts. */
export function aggregateChartByWeek(data: DashboardChartPoint[]): {
  points: DashboardChartPoint[];
  grouped: boolean;
  sourceDays: number;
} {
  if (data.length <= LINE_BAR_MAX_POINTS) {
    return { points: data, grouped: false, sourceDays: data.length };
  }

  const buckets = new Map<number, { amount: number; startDate: string }>();
  for (const point of data) {
    const week = weekBucket(point.date);
    const amount = Number(point.amount) || 0;
    const existing = buckets.get(week);
    if (!existing) {
      buckets.set(week, { amount, startDate: point.date });
    } else {
      existing.amount += amount;
      if (point.date < existing.startDate) existing.startDate = point.date;
    }
  }

  const points = Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([, bucket]) => ({
      date: bucket.startDate,
      amount: bucket.amount,
    }));

  return { points, grouped: true, sourceDays: data.length };
}

/** Keep top slices and roll the rest into “Other” for readable pies. */
export function aggregatePieSlices(data: DashboardChartPoint[]): {
  points: DashboardChartPoint[];
  hasOther: boolean;
  sourceDays: number;
} {
  if (data.length <= PIE_MAX_SLICES) {
    return { points: data, hasOther: false, sourceDays: data.length };
  }

  const sorted = [...data].sort((a, b) => Number(b.amount) - Number(a.amount));
  const top = sorted.slice(0, PIE_MAX_SLICES - 1);
  const otherAmount = sorted.slice(PIE_MAX_SLICES - 1).reduce((sum, point) => sum + (Number(point.amount) || 0), 0);

  return {
    points: [...top, { date: CHART_OTHER_KEY, amount: otherAmount }],
    hasOther: true,
    sourceDays: data.length,
  };
}
