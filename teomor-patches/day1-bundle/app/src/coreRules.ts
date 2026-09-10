/** Ядро v2 — константы и чистые функции (без React). */

/** Навык / характеристика: базовый диапазон 0–15, с артефактами до 20. */
export const SKILL_MIN = 0;
export const SKILL_SOFT_CAP = 15;
export const SKILL_HARD_CAP = 20;

/** kN: максимум 3 к20 за бросок (эндгейм — отдельное правило). */
export const MAX_ACTION_DICE = 3;

/** Раны: старт 2, потолок 6. */
export const WOUNDS_MIN = 2;
export const WOUNDS_MAX = 6;

/** КБ = 10 + Уклонение + Броня. */
export const KB_BASE = 10;

/** Аура: авто против целей на 2+ уровня ниже; ±1 — проверка или приём. */
export const AURA_AUTO_BELOW = 2;
export const AURA_CHECK_WITHIN = 1;

/** Таблица сложности броска. */
export const DIFFICULTY = [5, 10, 15, 20, 30, 45, 60, 80] as const;

export type DifficultyTier = (typeof DIFFICULTY)[number];

/** Ресурсы боя на листе / в состоянии приложения. */
export interface CombatState {
  wounds: number;
  woundsMax: number;
  fatigue: number;
  fatigueMax: number;
}

/** Правило ауры: нужна ли проверка против цели заданного уровня. */
export function auraNeedsCheck(
  actorLevel: number,
  targetLevel: number,
  targetIsPc = false,
): boolean {
  if (targetIsPc) return true;
  const diff = actorLevel - targetLevel;
  if (diff >= AURA_AUTO_BELOW) return false;
  if (Math.abs(diff) <= AURA_CHECK_WITHIN) return true;
  return true;
}

/** Краткая подсказка для UI. */
export function auraHint(actorLevel: number, targetLevel: number): string {
  const diff = actorLevel - targetLevel;
  if (diff >= AURA_AUTO_BELOW) return 'Аура: авто';
  if (Math.abs(diff) <= AURA_CHECK_WITHIN) return 'Аура: проверка или приём';
  return 'Аура: проверка или приём';
}

/** КБ из модификаторов древа + ручной брони. */
export function computeKB(
  modifiers: Record<string, number>,
  armorBonus = 0,
): number {
  return (
    KB_BASE +
    (modifiers['Уклонение'] ?? 0) +
    (modifiers['КБ'] ?? 0) +
    (modifiers['Броня'] ?? 0) +
    armorBonus
  );
}

/** Потолок ран: база + бонусы древа, не выше WOUNDS_MAX. */
export function computeWoundsMax(
  level: number,
  modifiers: Record<string, number>,
): number {
  const fromTree = modifiers['Ранения'] ?? 0;
  const fromLevel = level >= 10 ? 1 : 0;
  return Math.min(WOUNDS_MAX, Math.max(WOUNDS_MIN, WOUNDS_MIN + fromTree + fromLevel));
}

/** Потолок усталости: растёт с уровнем + бонусы древа. */
export function computeFatigueMax(
  level: number,
  modifiers: Record<string, number>,
): number {
  const base = 4 + Math.floor(level / 3);
  const fromTree = modifiers['Усталость'] ?? 0;
  return Math.max(4, base + fromTree);
}

export function defaultCombatState(
  level: number,
  modifiers: Record<string, number>,
): CombatState {
  return {
    wounds: 0,
    woundsMax: computeWoundsMax(level, modifiers),
    fatigue: 0,
    fatigueMax: computeFatigueMax(level, modifiers),
  };
}

/** Ограничить значение навыка/характеристики. */
export function clampSkill(value: number, allowArtifacts = false): number {
  const cap = allowArtifacts ? SKILL_HARD_CAP : SKILL_SOFT_CAP;
  return Math.max(SKILL_MIN, Math.min(cap, value));
}
