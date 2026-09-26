export const COUNTER_WHEEL_ROW_HEIGHT = 44;
export const COUNTER_WHEEL_WINDOW = 501;
export const COUNTER_WHEEL_VISIBLE_ROWS = 5;
export const COUNTER_TOTAL_COLUMN_FLEX = 1.05;
export const COUNTER_WHEEL_COLUMN_FLEX = 0.95;

export function counterWheelRangeStart(value: number) {
  return Math.max(1, Math.min(Number.MAX_SAFE_INTEGER - COUNTER_WHEEL_WINDOW + 1, value - Math.floor(COUNTER_WHEEL_WINDOW / 2)));
}

export function shouldRecenterCounterWheel(value: number, start: number, end: number, buffer = 24) {
  return value - start < buffer || end - value < buffer;
}

export function counterWheelValueFromOffset(offset: number, rangeStart: number, rangeEnd: number, current: number) {
  if (!Number.isFinite(offset)) return current;
  return Math.min(rangeEnd, Math.max(rangeStart, Math.round(offset / COUNTER_WHEEL_ROW_HEIGHT) + rangeStart));
}

export function isPositiveCounterIncrement(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

export function shouldTickCounterWheel(previous: number, next: number) {
  return isPositiveCounterIncrement(next) && previous !== next;
}
