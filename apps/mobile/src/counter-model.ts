export type CounterState = { version: 2; totalArrows: number; increment: number; history: number[] };
export const COUNTER_STORAGE_KEY = "arc-track-arrow-counter";
export const DEFAULT_COUNTER: CounterState = { version: 2, totalArrows: 0, increment: 6, history: [] };

export function readCounter(value: unknown): CounterState {
  if (!value || typeof value !== "object") return DEFAULT_COUNTER;
  const item = value as Record<string, unknown>;
  if (item.version === 1 && Number.isSafeInteger(item.totalArrows) && Number(item.totalArrows) >= 0)
    return { ...DEFAULT_COUNTER, totalArrows: Number(item.totalArrows) };
  if (item.version !== 2 || !Number.isSafeInteger(item.totalArrows) || Number(item.totalArrows) < 0
    || !Number.isSafeInteger(item.increment) || Number(item.increment) < 1 || !Array.isArray(item.history)
    || !item.history.every((value) => Number.isSafeInteger(value) && value > 0)) return DEFAULT_COUNTER;
  const history = item.history as number[];
  if (history.reduce((sum, value) => sum + value, 0) > Number(item.totalArrows)) return DEFAULT_COUNTER;
  return { version: 2, totalArrows: Number(item.totalArrows), increment: Number(item.increment), history };
}
export function setIncrement(state: CounterState, increment: number): CounterState {
  return Number.isSafeInteger(increment) && increment > 0 ? { ...state, increment } : state;
}
export function addArrows(state: CounterState): CounterState {
  if (state.totalArrows > Number.MAX_SAFE_INTEGER - state.increment) return state;
  return { ...state, totalArrows: state.totalArrows + state.increment, history: [...state.history, state.increment] };
}
export function undoLastAddition(state: CounterState): CounterState {
  const last = state.history.at(-1);
  return last ? { ...state, totalArrows: state.totalArrows - last, history: state.history.slice(0, -1) } : state;
}
export function resetCounter(state: CounterState): CounterState {
  return { ...state, totalArrows: 0, history: [] };
}
