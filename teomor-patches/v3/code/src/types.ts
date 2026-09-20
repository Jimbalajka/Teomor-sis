/** Teomor v3 — типы древа и разрешения. SoT: v3/docs/CORE.md */

export type ZoneType =
  | 'center'
  | 'magic'
  | 'strength'
  | 'dexterity'
  | 'wisdom';

/** Ступени мастерства v3 (навык или характеристика). */
export type MasteryTier =
  | 'none'
  | 'novice'
  | 'apprentice'
  | 'expert'
  | 'adept'
  | 'master'
  | 'beast';

export const MASTERY_ORDER: readonly MasteryTier[] = [
  'none',
  'novice',
  'apprentice',
  'expert',
  'adept',
  'master',
  'beast',
] as const;

export const MASTERY_LABEL_RU: Record<MasteryTier, string> = {
  none: 'нет',
  novice: 'новичок',
  apprentice: 'ученик',
  expert: 'эксперт',
  adept: 'адепт',
  master: 'мастер',
  beast: 'зверь',
};

/** Квель 1..10 (больше = сильнее). */
export type KvelRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type NodeCategory =
  | 'root'
  | 'kvel'
  | 'mastery'
  | 'aspect'
  | 'sigil'
  | 'technique'
  | 'feat'
  | 'profession'
  | 'transit';

export type CostType = 'OR';

export type NodeStatus = 'locked' | 'available' | 'unlocked';

export interface SkillNodeV3 {
  id: string;
  x: number;
  y: number;
  label: string;
  zone: ZoneType;
  category: NodeCategory;
  cost: { type: CostType; amount: number };
  description?: string;
  /** Повышает мощь квеля на +1 (до 10). */
  kvelId?: string;
  kvelDelta?: number;
  /** Ключ навыка/характеристики → целевая ступень или +1 шаг. */
  masteryKey?: string;
  masterySet?: MasteryTier;
  masteryDelta?: number;
  /** Разблокировка компонента приёма / пассива (id из каталога). */
  unlockId?: string;
  woundsDelta?: number;
  fatigueDelta?: number;
  requirements?: {
    parentIds?: string[];
    minKvel?: { kvelId: string; rank: number };
    minMastery?: { key: string; tier: MasteryTier };
  };
  exclusiveGroup?: string;
  hub?: 'hex' | 'diamond';
}

export interface SkillEdgeV3 {
  from: string;
  to: string;
}

export interface CheckInput {
  actorKvel: number;
  targetLevel: number;
  mastery: MasteryTier;
  /** Особое условие или ярлык вроде «мастер внимания». */
  specialCondition?: boolean;
}

export type CheckVerdict =
  | { type: 'auto' }
  | { type: 'beast' }
  | { type: 'roll'; die: 8; successOn: number; label: string };
