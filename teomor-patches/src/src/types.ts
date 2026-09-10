// Единая модель данных древа навыков системы «Теомор» (ядро v2).
// Экспортирует итоговые модификаторы, которые лист персонажа читает как read-only.

import type { CombatState } from './coreRules';

export type ZoneType =
  | 'center'
  | 'magic'
  | 'strength'
  | 'dexterity'
  | 'wisdom';

export type NodeCategory =
  | 'root'
  | 'transit_general'
  | 'specialization'
  | 'subcategory'
  | 'transit_specialized'
  | 'feat'
  | 'feat_slot'
  | 'craft_slot';

export type NodeStatus = 'locked' | 'available' | 'unlocked';

/** Валюта прокачки узла — одна: ОР (Очко Развития). */
export type CostType = 'OR';

/** Старые сохранения: transit / development → ОР. */
export function normalizeCostType(type: unknown): CostType {
  if (type === 'OR' || type === 'transit' || type === 'development') return 'OR';
  return 'OR';
}

export interface SkillNode {
  id: string;
  x: number;
  y: number;
  label: string;
  zone: ZoneType;
  category: NodeCategory;
  cost: { type: CostType; amount: number };
  level?: number;
  maxLevel?: number;
  isSecret?: boolean;
  secretHint?: string;
  requirements?: {
    parentIds?: string[];
    requiredSpecialization?: { zone: ZoneType; level: number };
    minLevel?: number;
  };
  choices?: NodeChoice[];
  statModifiers?: Record<string, number>;
  description?: string;
  /** Только один узел из группы может быть изучен (развилка билда). */
  exclusiveGroup?: string;
}

export interface NodeChoiceOption {
  id: string;
  label: string;
  desc?: string;
}

export interface NodeChoice {
  id: string;
  title: string;
  pick: number;
  options: NodeChoiceOption[];
}

export interface SkillEdge {
  from: string;
  to: string;
}

export interface SkillTreeData {
  nodes: SkillNode[];
  edges: SkillEdge[];
}

export interface RaceChoice {
  id: string;
  label: string;
  kind: 'char' | 'note';
  amount?: number;
  options: string[];
}

export interface Race {
  id: string;
  name: string;
  blurb: string;
  speed: number;
  statModifiers: Record<string, number>;
  abilities: string[];
  choices?: RaceChoice[];
}

export interface SkillTreeState {
  level: number;
  race: string | null;
  background: string | null;
  raceChoices: Record<string, string>;
  allocatedNodes: string[];
  specializationLevels: Record<ZoneType, number>;
  /** ОР — Очко Развития (единая валюта древа). */
  orPoints: number;
  /** Раны и усталость — считает приложение, игрок только отмечает. */
  combat: CombatState;
  /** Бонус брони вручную (щит, доспех); Уклонение — из древа. */
  armorBonus: number;
  /** Бонусы с листа / пресета (не из древа). */
  manualModifiers: Record<string, number>;
  /** Владения и прочее текстом. */
  proficiencies: string[];
  discoveredSecrets: string[];
  nodeChoices: Record<string, string[]>;
}

/** Миграция сохранений v1 (ОУ + ОО) → v2 (ОР). */
export function migrateLegacyPoints(
  parsed: Partial<SkillTreeState> & {
    developmentPoints?: number;
    transitPoints?: number;
  },
): number | undefined {
  if (typeof parsed.orPoints === 'number') return parsed.orPoints;
  const ou = parsed.developmentPoints;
  const oo = parsed.transitPoints;
  if (ou == null && oo == null) return undefined;
  return (ou ?? 0) + (oo ?? 0);
}
