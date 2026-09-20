/** Экономика древа v3. SoT: v3/docs/CORE.md §12 */

import { KVEL_MAX, masteryIndex } from './coreRules';
import { MASTERY_ORDER, type MasteryTier } from './types';

export const TREE_ECONOMY_V3 = {
  /** Стартовые ОР после расы/фона. */
  startOrPoints: 4,
  /** Базовая цена +1 квеля. */
  kvelRankCost: 2,
  /** Базовая цена +1 ступени навыка (растёт на высоких ступенях). */
  masteryStepBaseCost: 1,
  /** Зверь — отдельный кэпстоун. */
  beastCost: 5,
  /** +1 рана героя (до потолка 6). */
  woundCost: 2,
  /** Максимум «зверей» на листах без легендарных квелей. */
  softBeastCapWithoutKvel: 7,
} as const;

export function masteryStepCost(from: MasteryTier): number {
  if (from === 'master') return TREE_ECONOMY_V3.beastCost;
  const i = masteryIndex(from);
  // выше по лестнице — дороже
  return TREE_ECONOMY_V3.masteryStepBaseCost + Math.max(0, i - 1);
}

export function nextMastery(from: MasteryTier): MasteryTier | null {
  const i = masteryIndex(from);
  if (i < 0 || i >= MASTERY_ORDER.length - 1) return null;
  return MASTERY_ORDER[i + 1];
}

export function canRaiseKvel(current: number): boolean {
  return current < KVEL_MAX;
}

/** Слабый квель не держит зверя в связанном навыке. */
export function allowsBeast(kvelRank: number): boolean {
  return kvelRank >= TREE_ECONOMY_V3.softBeastCapWithoutKvel;
}
