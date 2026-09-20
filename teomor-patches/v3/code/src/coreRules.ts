/** Ядро v3 — чистые функции. SoT: teomor-patches/v3/docs/CORE.md */

import {
  MASTERY_LABEL_RU,
  MASTERY_ORDER,
  type CheckInput,
  type CheckVerdict,
  type MasteryTier,
} from './types';

/** Минимальная грань к8, с которой грань = успех. null = провала нет (зверь). */
export const SUCCESS_ON: Record<MasteryTier, number | null> = {
  none: 8,
  novice: 7,
  apprentice: 6,
  expert: 5,
  adept: 4,
  master: 3,
  beast: null,
};

export const DIE = 8 as const;
export const CRIT_FAIL_FACE = 1;
export const CRIT_SUCCESS_FACE = 8;
/** Способность «крит шире»: успех-взрыв также с этой грани. */
export const WIDE_CRIT_FACE = 7;

export const KVEL_MIN = 1;
export const KVEL_MAX = 10;

export const WOUNDS_PC_MIN = 2;
export const WOUNDS_PC_MAX = 6;

export const INSPIRATION_MAX = 3;
export const DESPAIR_MAX = 3;

/** Аура: цель слабее на столько рангов квеля/уровня → авто. */
export const AURA_AUTO_BELOW = 2;

export const KB_BASE = 10;

export function clampKvel(n: number): number {
  return Math.max(KVEL_MIN, Math.min(KVEL_MAX, Math.floor(n)));
}

export function masteryIndex(tier: MasteryTier): number {
  return MASTERY_ORDER.indexOf(tier);
}

export function masteryAtLeast(have: MasteryTier, need: MasteryTier): boolean {
  return masteryIndex(have) >= masteryIndex(need);
}

export function shiftMastery(tier: MasteryTier, delta: number): MasteryTier {
  const i = Math.max(
    0,
    Math.min(MASTERY_ORDER.length - 1, masteryIndex(tier) + delta),
  );
  return MASTERY_ORDER[i];
}

/**
 * Единая формула §1:
 * квель выше + нет условия → auto;
 * зверь → beast (провала нет);
 * иначе roll с порогом грани.
 */
export function resolveCheck(input: CheckInput): CheckVerdict {
  const kvel = clampKvel(input.actorKvel);
  const target = clampKvel(input.targetLevel);
  const higher = kvel > target;
  const forced = Boolean(input.specialCondition);

  if (input.mastery === 'beast') {
    return { type: 'beast' };
  }

  if (higher && !forced) {
    return { type: 'auto' };
  }

  const successOn = SUCCESS_ON[input.mastery] ?? 8;
  return {
    type: 'roll',
    die: DIE,
    successOn,
    label: `${MASTERY_LABEL_RU[input.mastery]}: успех на ${successOn}+`,
  };
}

export function isSuccessFace(
  face: number,
  mastery: MasteryTier,
  opts?: { wideCrit?: boolean },
): boolean {
  if (mastery === 'beast') return true;
  const need = SUCCESS_ON[mastery] ?? 8;
  if (face >= need) return true;
  // wideCrit сам по себе не делает 7 успехом, если порог выше — только крит-взрыв при уже успехе
  void opts;
  return false;
}

/** Взрыв: 1 → риск крит-провала; 8 (или 7 при wideCrit и успехе) → риск крит-успеха. */
export function explodeHint(
  face: number,
  opts?: { wideCrit?: boolean; beast?: boolean },
): 'crit-fail-risk' | 'crit-success-risk' | null {
  if (face === CRIT_FAIL_FACE && !opts?.beast) return 'crit-fail-risk';
  if (face === CRIT_SUCCESS_FACE) return 'crit-success-risk';
  if (opts?.wideCrit && face === WIDE_CRIT_FACE) return 'crit-success-risk';
  return null;
}

export function auraAuto(
  actorKvel: number,
  targetLevel: number,
  targetIsPc = false,
): boolean {
  if (targetIsPc) return false;
  return clampKvel(actorKvel) - clampKvel(targetLevel) >= AURA_AUTO_BELOW;
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

export function computePcWoundsMax(modifiers: Record<string, number>): number {
  const fromTree = modifiers['Ранения'] ?? modifiers['Раны'] ?? 0;
  return Math.min(
    WOUNDS_PC_MAX,
    Math.max(WOUNDS_PC_MIN, WOUNDS_PC_MIN + fromTree),
  );
}

/** Подсказка для UI/Мастера одной строкой. */
export function checkHint(input: CheckInput): string {
  const v = resolveCheck(input);
  if (v.type === 'auto') return 'Автоуспех (квель выше, условий нет)';
  if (v.type === 'beast') return 'Зверь: провала нет';
  return `к8 · ${v.label}`;
}
