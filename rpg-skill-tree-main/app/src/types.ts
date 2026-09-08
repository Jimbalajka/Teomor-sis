// Единая модель данных древа навыков системы «Теомор».
// Экспортирует итоговые модификаторы, которые лист персонажа читает как read-only.

export type ZoneType =
  | 'center' // центральный корень
  | 'magic' // Магия / Разум (синий) — Дар Медведя
  | 'strength' // Ближний бой / Мощь (красный) — Дар Зюбания
  | 'dexterity' // Ловкость / Моторика (зелёный) — Дар Змея
  | 'wisdom'; // Мудрость / Стержень (янтарный) — Дар Голубя

export type NodeCategory =
  | 'root' // центральный узел
  | 'transit_general' // общий транзитный навык (от центра)
  | 'specialization' // главный круг специализации (уровень до 10)
  | 'subcategory' // школа/путь внутри специализации
  | 'transit_specialized' // транзитный навык внутри специализации
  | 'feat' // черта/способность (структурное правило, не цифры)
  | 'feat_slot' // слот Черты (слева): 1 покупка за 4 уровня, открывает попап черт
  | 'craft_slot'; // слот Ремесла/владения (справа): попап ремёсел

export type NodeStatus = 'locked' | 'available' | 'unlocked';

// Валюта прокачки узла.
//  - 'OR'      = ОУ (Очки Умений): круги специализаций и особые спец-навыки древа
//  - 'transit' = ОО (Очки Опыта): общие и специализированные транзитные навыки
export type CostType = 'OR' | 'transit';

export interface SkillNode {
  id: string;
  /** Позиция на графе React Flow. */
  x: number;
  y: number;
  label: string;
  zone: ZoneType;
  category: NodeCategory;

  /** Экономика покупки. */
  cost: { type: CostType; amount: number };

  /** Только для специализаций: текущий/максимальный уровень (до 10). */
  level?: number;
  maxLevel?: number;

  /** Секретный узел — до открытия показывается силуэтом «?». */
  isSecret?: boolean;
  secretHint?: string;

  /** Условия разблокировки. */
  requirements?: {
    /** Хотя бы один из родителей должен быть изучен (root игнорируется). */
    parentIds?: string[];
    /** Требуемый уровень ветки-специализации. */
    requiredSpecialization?: { zone: ZoneType; level: number };
    /** Минимальный уровень персонажа. */
    minLevel?: number;
  };

  /**
   * Всплывающие окна выбора при взятии узла (движок попапов).
   * Пример: профессия -> выбрать аспект (pick 1) + 2 сигила (pick 2).
   * Также используется для feat_slot / craft_slot.
   */
  choices?: NodeChoice[];

  /** Итоговые модификаторы, которые узел даёт листу персонажа. */
  statModifiers?: Record<string, number>;
  description?: string;
}

export interface NodeChoiceOption {
  id: string;
  label: string;
  desc?: string;
}

export interface NodeChoice {
  id: string;
  title: string;
  /** Сколько опций выбрать. */
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
  /** 'char' — прибавляет amount к выбранной характеристике; иначе просто запись. */
  kind: 'char' | 'note';
  amount?: number;
  options: string[];
}

export interface Race {
  id: string;
  name: string;
  blurb: string;
  speed: number;
  /** Числовые бонусы, попадающие в лист персонажа. */
  statModifiers: Record<string, number>;
  /** Особенности текстом (не автоматизируются). */
  abilities: string[];
  /** Выборы расы (стихия, +1 к характеристике и т.п.). */
  choices?: RaceChoice[];
}

export interface SkillTreeState {
  /** Уровень персонажа. 0 = ещё не активирован центр (не выбрана раса). */
  level: number;
  /** Выбранная раса (id) или null. */
  race: string | null;
  /** Выбранная предыстория (id) или null. */
  background: string | null;
  /** Выборы расы: choiceId -> выбранное значение. */
  raceChoices: Record<string, string>;
  /** ID изученных узлов. */
  allocatedNodes: string[];
  /** Уровни специализаций (0–10). */
  specializationLevels: Record<ZoneType, number>;
  /** ОУ — Очки Умений (специализации). */
  developmentPoints: number;
  /** ОО — Очки Опыта (транзитные навыки). */
  transitPoints: number;
  /** ID разгаданных секретных узлов (наведение раскрыло подсказку). */
  discoveredSecrets: string[];
  /** Выборы, сделанные во всплывающих окнах узлов: nodeId -> [optionId...]. */
  nodeChoices: Record<string, string[]>;
}
