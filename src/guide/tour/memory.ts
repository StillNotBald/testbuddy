/**
 * Per-viewer tour memory in localStorage: where a tour was left and whether the resume prompt was dismissed.
 * Every access is wrapped; when storage is blocked the tour still works, it just forgets between visits.
 */
export interface TourMemory {
  goalId?: string;
  index?: number;
  dismissed?: boolean;
}

const PREFIX = 'tb-tour:v1:';

function key(userId?: string): string {
  return `${PREFIX}${userId ?? 'anonymous'}`;
}

export function readMemory(userId?: string): TourMemory {
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const m = parsed as Record<string, unknown>;
    return {
      goalId: typeof m.goalId === 'string' ? m.goalId : undefined,
      index: typeof m.index === 'number' && Number.isInteger(m.index) && m.index >= 0 ? m.index : undefined,
      dismissed: m.dismissed === true,
    };
  } catch {
    return {};
  }
}

export function writeMemory(userId: string | undefined, memory: TourMemory): void {
  try {
    window.localStorage.setItem(key(userId), JSON.stringify(memory));
  } catch {
    /* blocked or full storage: the tour keeps working without memory */
  }
}
