/** Ядро v3 — константы и чистые функции. SoT: teomor-patches/v3/docs/CORE.md */

export const AURA_MIN = 1;
export const AURA_MAX = 10;
export const AURA_EPIC_MAX = 12;
/** Цель выше ауры на столько → автопровал (или опц. проверка с эхом). */
export const AURA_AUTOFALL_GAP = 4;

export const MASTERY_TIERS = [
  'нет',
  'новичок',
  'ученик',
  'эксперт',
  'адепт',
  'мастер',
  'зверь',
] as const;
export type MasteryTier = (typeof MASTERY_TIERS)[number];

/** ступень 0…6 */
export function masteryStep(tier: MasteryTier | string | number): number {
  if (typeof tier === 'number') return Math.max(0, Math.min(6, Math.floor(tier)));
  const i = MASTERY_TIERS.indexOf(tier as MasteryTier);
  return i < 0 ? 0 : i;
}

export const CHECK_BASE = 5;

/** сложность = 5 + их_ступень − моя */
export function checkDifficulty(myStep: number, theirStep: number): number {
  return CHECK_BASE + masteryStep(theirStep) - masteryStep(myStep);
}

export type CheckGate = 'auto' | 'roll' | 'autofail';

export function resolveCheckGate(
  aura: number,
  targetLevel: number,
  hasCondition = false,
): CheckGate {
  if (!hasCondition && aura > targetLevel) return 'auto';
  if (targetLevel >= aura + AURA_AUTOFALL_GAP) return 'autofail';
  return 'roll';
}

export function auraHint(
  aura: number,
  targetLevel: number,
  hasCondition = false,
): string {
  const gate = resolveCheckGate(aura, targetLevel, hasCondition);
  if (gate === 'auto') return 'Аура: авто';
  if (gate === 'autofail') return 'Аура: автопровал / эхо';
  return 'Аура: проверка к8';
}

export function successOnD8(difficulty: number): string {
  const d = Math.max(1, difficulty);
  if (d > 8) return 'нужен приём / инструмент';
  if (d <= 1) return 'успех на 1+';
  return `успех на ${d}+`;
}

export const WOUNDS_MIN = 2;
export const WOUNDS_MAX = 6;
export const KB_BASE = 10;
export const KVEL_RANK_MAX = 10;

export interface CombatState {
  wounds: number;
  woundsMax: number;
  fatigue: number;
  fatigueMax: number;
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

/** Раны: база от ауры + дерево. */
export function computeWoundsMax(
  aura: number,
  modifiers: Record<string, number>,
): number {
  const fromTree = modifiers['Ранения'] ?? 0;
  const fromAura = Math.min(2, Math.floor(Math.max(0, aura - 1) / 5));
  return Math.min(WOUNDS_MAX, Math.max(WOUNDS_MIN, WOUNDS_MIN + fromAura + fromTree));
}

/** Общий запас усталости героя (не путать с лимитом приёма квеля). */
export function computeFatigueMax(
  aura: number,
  modifiers: Record<string, number>,
): number {
  const base = 3 + Math.floor(aura / 4);
  const fromTree = modifiers['Усталость'] ?? 0;
  return Math.max(3, base + fromTree);
}

export function defaultCombatState(
  aura: number,
  modifiers: Record<string, number>,
): CombatState {
  return {
    wounds: 0,
    woundsMax: computeWoundsMax(aura, modifiers),
    fatigue: 0,
    fatigueMax: computeFatigueMax(aura, modifiers),
  };
}

/** Лимит усталости приёма по рангу квеля (player-rules §1.1 → шкала 1…10). */
export const KVEL_FATIGUE_CAP_BY_RANK = [0, 2, 4, 6, 9, 11, 13, 15, 18, 23, 30] as const;

export function kvelFatigueCap(kvelRank: number): number {
  const r = Math.max(1, Math.min(KVEL_RANK_MAX, Math.floor(kvelRank)));
  return KVEL_FATIGUE_CAP_BY_RANK[r];
}

/** Общий пул холодных приёмов по ауре. */
export const COLD_POOL_BY_AURA = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12] as const;

export type ColdCapKind = 'wide' | 'medium' | 'hard';

export function coldPoolByAura(aura: number): number {
  const a = Math.max(1, Math.min(10, Math.floor(aura)));
  return COLD_POOL_BY_AURA[a];
}

/** Под-лимит холодных одного квеля при данной ауре. */
export function kvelColdCap(kind: ColdCapKind, aura: number): number {
  const pool = coldPoolByAura(aura);
  if (kind === 'wide') return pool;
  if (kind === 'hard') return Math.min(3, pool);
  return Math.ceil(pool / 2);
}
