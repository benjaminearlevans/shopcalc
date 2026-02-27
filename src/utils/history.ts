import { LocalStorage } from "@raycast/api";
import { CalculationType, HistoryEntry } from "../types";

const HISTORY_KEY = "shopcalc_history";
const MAX_ENTRIES = 10;

export async function saveToHistory(
  type: CalculationType,
  input: HistoryEntry["input"],
  summary: string,
): Promise<void> {
  const history = await getHistory();
  const entry: HistoryEntry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp: Date.now(),
    input,
    summary,
  };

  history.unshift(entry);
  if (history.length > MAX_ENTRIES) {
    history.length = MAX_ENTRIES;
  }

  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}
