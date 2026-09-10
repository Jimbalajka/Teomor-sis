// Раскладка листа персонажа «Теомор» (из PDF «Лист Перса новый для Теомора»).
// Навыки сгруппированы по 4 характеристикам; значения 0–15 из древа/расы/предыстории.

export interface SkillDef {
  name: string;
  dice?: boolean;
}

export interface SkillGroup {
  char: 'Моторика' | 'Разум' | 'Стержень' | 'Мощь';
  skills: SkillDef[];
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    char: 'Моторика',
    skills: [
      { name: 'Акробатика' },
      { name: 'Уклонение' },
      { name: 'Судовождение' },
      { name: 'Вождение' },
      { name: 'Пилотирование' },
      { name: 'Верховая Езда' },
      { name: 'Скрытность' },
      { name: 'Воровские Навыки' },
      { name: 'Ловкость рук' },
      { name: 'Ближний бой' },
      { name: 'Дальний бой' },
      { name: 'Печати' },
    ],
  },
  {
    char: 'Разум',
    skills: [
      { name: 'Гуманитарная Наука' },
      { name: 'Точная Наука' },
      { name: 'Безумная Наука' },
      { name: 'Медицина' },
      { name: 'Анализ' },
      { name: 'Поиск Информации' },
      { name: 'Природа' },
      { name: 'Ремонт' },
      { name: 'Хакерство' },
      { name: 'ЭлектроМех' },
      { name: 'Волшебство' },
      { name: 'Мистика' },
      { name: 'Алхимия' },
    ],
  },
  {
    char: 'Стержень',
    skills: [
      { name: 'Убеждение' },
      { name: 'Запугивание' },
      { name: 'Обман' },
      { name: 'Выступление' },
      { name: 'Лидерство' },
      { name: 'Дрессировка' },
      { name: 'Внимание' },
      { name: 'Проницательность' },
      { name: 'Интуиция' },
      { name: 'Колдовство' },
      { name: 'Псионика' },
    ],
  },
  {
    char: 'Мощь',
    skills: [
      { name: 'Атлетика' },
      { name: 'Выживание' },
      { name: 'Ближний бой (Мощь)' },
      { name: 'Запугивание (Мощь)' },
      { name: 'Импланты' },
    ],
  },
];

// Прочие поля листа (правый блок) — ввод вручную.
// Раны, усталость и КБ считаются приложением (см. Sidebar / coreRules).
export const DERIVED_FIELDS = [
  'Шаг',
  'Бег',
  'Стойкость',
  'Квель',
  'Владения',
  'Деньги',
] as const;

/** Базовое значение любой характеристики на старте. */
export const BASE_CHAR = 0;

/** Ранг Квеля по уровню персонажа (инвертирован: 10 ученик -> 1 бог). */
export function kvelRankForLevel(level: number): number {
  if (level <= 3) return 10;
  if (level <= 7) return 9; // 9–8
  if (level <= 15) return 7; // 7–5
  return 3; // 4–1
}

/** Потолок характеристики по рангу Квеля (0–15; с артефактами до 20). */
export function charCapForLevel(level: number): number {
  if (level <= 3) return 3;
  if (level <= 7) return 5;
  if (level <= 15) return 12;
  return 15;
}

/** Сырой бонус навыка из древа / расы / предыстории. */
export function rawSkillValue(
  modifiers: Record<string, number>,
  name: string,
): number {
  return BASE_CHAR + (modifiers[name] ?? 0);
}

/** Итог навыка 0–15 с учётом потолка уровня. */
export function skillValue(
  modifiers: Record<string, number>,
  name: string,
  level: number,
): number {
  const cap = charCapForLevel(level);
  const raw = rawSkillValue(modifiers, name);
  return Math.max(0, Math.min(cap, raw));
}
