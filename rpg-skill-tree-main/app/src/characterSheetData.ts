// Раскладка листа персонажа «Теомор» (из PDF «Лист Перса новый для Теомора»).
// Навыки сгруппированы по 4 характеристикам. dice:true — навык-кость.

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
      { name: 'Акробатика', dice: true },
      { name: 'Уклонение', dice: true },
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
      { name: 'Здоровье', dice: true },
      { name: 'Атлетика', dice: true },
      { name: 'Выживание' },
      { name: 'Ближний бой (Мощь)' },
      { name: 'Запугивание (Мощь)' },
      { name: 'Импланты' },
    ],
  },
];

// Прочие поля листа (правый блок).
export const DERIVED_FIELDS = [
  'Шаг',
  'Бег',
  'Защита',
  'Стойкость',
  'Ранения',
  'Усталость',
  'ОС Макс',
  'ОС Тек',
  'Квель',
  'Владения',
  'Деньги',
];

/** Базовое значение любой характеристики на старте. */
export const BASE_CHAR = -2;

/** Ранг Квеля по уровню персонажа (инвертирован: 10 ученик -> 1 бог). */
export function kvelRankForLevel(level: number): number {
  if (level <= 3) return 10;
  if (level <= 7) return 9; // 9–8
  if (level <= 15) return 7; // 7–5
  return 3; // 4–1
}

/** Потолок характеристики по рангу Квеля (не разогнаться раньше времени). */
export function charCapForLevel(level: number): number {
  if (level <= 3) return 3; // Квель 10
  if (level <= 7) return 5; // Квель 9–8
  if (level <= 15) return 8; // Квель 7–5
  return 10; // Квель 4–1
}
