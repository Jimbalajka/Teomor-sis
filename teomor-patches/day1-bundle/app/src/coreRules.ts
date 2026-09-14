/** Ядро v2 — константы и чистые функции. SoT: docs/core/CORE.md */

export const SKILL_MIN = 0;
export const SKILL_SOFT_CAP = 15;
export const SKILL_HARD_CAP = 20;

/** kN по CORE.md §1: к6→…→3к20 (4к20 эндгейм). Макс ~3 кости за бросок. */
export const MAX_ACTION_DICE = 3;

export const KN_BY_LEVEL = [
  { maxLevel: 2, dice: 'к6' },
  { maxLevel: 4, dice: 'к8' },
  { maxLevel: 6, dice: 'к10' },
  { maxLevel: 8, dice: 'к12' },
  { maxLevel: 10, dice: 'к20' },
  { maxLevel: 12, dice: '2к12' },
  { maxLevel: 14, dice: '2к20' },
  { maxLevel: 16, dice: '3к20' },
  { maxLevel: 99, dice: '4к20' },
] as const;

export function actionDiceForLevel(level: number): string {
  const lv = Math.max(1, level);
  for (const row of KN_BY_LEVEL) {
    if (lv <= row.maxLevel) return row.dice;
  }
  return KN_BY_LEVEL[KN_BY_LEVEL.length - 1].dice;
}

export const WOUNDS_MIN = 2;
export const WOUNDS_MAX = 6;
export const KB_BASE = 10;
export const AURA_AUTO_BELOW = 2;
export const AURA_CHECK_WITHIN = 1;

/** CORE.md §1 — ступени сложности для Мастера. */
export const DIFFICULTY_TIERS = [
  { value: 5, label: 'тривиально' },
  { value: 10, label: 'легко' },
  { value: 15, label: 'средне' },
  { value: 20, label: 'сложно' },
  { value: 30, label: 'очень' },
  { value: 45, label: 'героически' },
  { value: 60, label: 'легендарно' },
  { value: 80, label: 'божественно' },
] as const;

export const DIFFICULTY = DIFFICULTY_TIERS.map((d) => d.value);
export type DifficultyTier = (typeof DIFFICULTY_TIERS)[number]['value'];

export interface CombatState {
  wounds: number;
  woundsMax: number;
  fatigue: number;
  fatigueMax: number;
}

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

export function auraHint(actorLevel: number, targetLevel: number): string {
  const diff = actorLevel - targetLevel;
  if (diff >= AURA_AUTO_BELOW) return 'Аура: авто';
  if (Math.abs(diff) <= AURA_CHECK_WITHIN) return 'Аура: проверка или приём';
  return 'Аура: проверка или приём';
}

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

export function computeWoundsMax(
  level: number,
  modifiers: Record<string, number>,
): number {
  const fromTree = modifiers['Ранения'] ?? 0;
  const fromLevel = Math.min(2, Math.floor(Math.max(0, level - 1) / 5));
  return Math.min(WOUNDS_MAX, Math.max(WOUNDS_MIN, WOUNDS_MIN + fromLevel + fromTree));
}

export function computeFatigueMax(
  level: number,
  modifiers: Record<string, number>,
): number {
  const base = 3 + Math.floor(level / 4);
  const fromTree = modifiers['Усталость'] ?? 0;
  return Math.max(3, base + fromTree);
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

export function clampSkill(value: number, allowArtifacts = false): number {
  const cap = allowArtifacts ? SKILL_HARD_CAP : SKILL_SOFT_CAP;
  return Math.max(SKILL_MIN, Math.min(cap, value));
}
