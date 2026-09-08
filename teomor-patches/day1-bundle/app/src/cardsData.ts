// Модель и стартовый набор карт «Теомор» (Квель / Аспект / Сигил / Инструмент).
// Формат = данные; вид рисуется из шаблона (CardPreview). Редактируется в приложении
// (вкладка «Карты») и хранится в localStorage.

export type CardCategory = 'kvel' | 'aspect' | 'sigil' | 'instrument';

export const CATEGORY_LABEL: Record<CardCategory, string> = {
  kvel: 'Квель',
  aspect: 'Аспект',
  sigil: 'Сигил',
  instrument: 'Инструмент',
};

export interface GameCard {
  id: string;
  category: CardCategory;
  name: string;
  cost: number; // ОС (Инструмент = 0; Квель — не тратит, см. osLimit)
  rank?: number; // Квель: ранг 10..1
  osLimit?: number; // Квель: лимит ОС
  damage?: string; // «1к8»
  range?: string; // «6 клеток»
  area?: string; // «2х2»
  states?: string; // «Ослепление»
  profession?: string;
  description: string;
}

export const initialCards: GameCard[] = [
  // ── Квели ────────────────────────────────────────────────
  {
    id: 'kvel_istok',
    category: 'kvel',
    name: 'Квель Истока',
    cost: 0,
    rank: 10,
    osLimit: 2,
    profession: 'Волшебник',
    description: 'Ученический старт. +1 к ментальному сопротивлению. Много холодных слотов.',
  },
  {
    id: 'kvel_potok',
    category: 'kvel',
    name: 'Квель Потока Крови',
    cost: 0,
    rank: 10,
    osLimit: 2,
    profession: 'Чародей',
    description: 'Живой каст мгновенный, холодных слотов мало.',
  },
  {
    id: 'kvel_forma_yarosti',
    category: 'kvel',
    name: 'Форма Ярости',
    cost: 0,
    rank: 10,
    osLimit: 2,
    profession: 'Берсерк',
    description: '+урон ценой -защиты. Стойка воина.',
  },

  // ── Аспекты (базовые = только тип урона) ─────────────────
  {
    id: 'asp_fire',
    category: 'aspect',
    name: 'Аспект Огня',
    cost: 1,
    profession: 'маг',
    description: 'Тип урона: огонь. (Базовый — без состояний.)',
  },
  {
    id: 'asp_ice',
    category: 'aspect',
    name: 'Аспект Инея',
    cost: 1,
    profession: 'маг',
    description: 'Тип урона: холод.',
  },
  {
    id: 'asp_lightning',
    category: 'aspect',
    name: 'Аспект Молнии',
    cost: 1,
    profession: 'маг',
    description: 'Тип урона: электричество. Игнор металлической брони.',
  },

  // ── Сигилы ───────────────────────────────────────────────
  {
    id: 'sig_thrust',
    category: 'sigil',
    name: 'Выпад',
    cost: 1,
    damage: '1к6',
    range: 'вплотную',
    description: 'Базовая атака ближнего боя.',
  },
  {
    id: 'sig_bolt',
    category: 'sigil',
    name: 'Снаряд',
    cost: 1,
    damage: '1к6',
    range: '6 клеток',
    description: 'Базовая дистанционная атака.',
  },
  {
    id: 'sig_blast',
    category: 'sigil',
    name: 'Взрыв',
    cost: 2,
    area: '2х2',
    description: 'Зона поражения. Все внутри получают урон сборки.',
  },
  {
    id: 'sig_blind',
    category: 'sigil',
    name: 'Слепящий',
    cost: 1,
    states: 'Ослепление',
    description: 'Накладывает Ослепление до конца хода цели.',
  },
  {
    id: 'sig_dot',
    category: 'sigil',
    name: 'Тлеющий',
    cost: 1,
    states: 'DoT',
    damage: '↻1к4',
    description: 'Периодический урон (тип — по стихии сборки).',
  },

  // ── Инструменты (0 ОС, пассив) ───────────────────────────
  {
    id: 'ins_wand',
    category: 'instrument',
    name: 'Палочка',
    cost: 0,
    profession: 'маг',
    description: '+1 к Быстрому действию (холодные касты).',
  },
  {
    id: 'ins_hammer',
    category: 'instrument',
    name: 'Тяжёлый молот',
    cost: 0,
    profession: 'воин',
    description: 'Дробящий урон. Игнор 1 брони; Оглушение — спасбросок с помехой.',
  },
];
