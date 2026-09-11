// Модель и стартовый набор карт «Теомор» (Квель / Аспект / Сигил / Инструмент).
// Формат = данные; вид рисуется из шаблона (CardPreview). Редактируется в приложении
// (вкладка «Карты») и хранится в localStorage.

export type CardCategory =
  | 'kvel'
  | 'aspect'
  | 'sigil'
  | 'instrument'
  | 'build';

export const CATEGORY_LABEL: Record<CardCategory, string> = {
  kvel: 'Квель',
  aspect: 'Аспект',
  sigil: 'Сигил',
  instrument: 'Инструмент',
  build: 'Приём',
};

export interface GameCard {
  id: string;
  category: CardCategory;
  name: string;
  cost: number; // усталость при использовании приёма
  rank?: number; // Квель: ранг 10..1
  /** Квель: потолок усталости билда (раньше «лимит ОС»). */
  fatigueMax?: number;
  damage?: string; // «1к8»
  range?: string; // «6 клеток»
  area?: string; // «2х2»
  states?: string; // «Ослепление»
  profession?: string;
  description: string;
  buildParts?: {
    kvelId?: string;
    aspectId?: string;
    sigilIds: string[];
    instrumentId?: string;
  };
  mechanicalNote?: string;
}

export const initialCards: GameCard[] = [
  // ── Квели ────────────────────────────────────────────────
  {
    id: 'kvel_istok',
    category: 'kvel',
    name: 'Квель Истока',
    cost: 0,
    rank: 10,
    fatigueMax: 2,
    profession: 'Волшебник',
    description: 'Ученический старт. +1 к ментальному сопротивлению. Много холодных слотов.',
  },
  {
    id: 'kvel_potok',
    category: 'kvel',
    name: 'Квель Потока Крови',
    cost: 0,
    rank: 10,
    fatigueMax: 2,
    profession: 'Чародей',
    description: 'Живой каст мгновенный, холодных слотов мало.',
  },

  {
    id: 'kvel_viet',
    category: 'kvel',
    name: 'Квель Виэта',
    cost: 0,
    rank: 10,
    fatigueMax: 0,
    profession: 'Виэт',
    description: 'Стойки и ● приёмы. Холодные: 0.',
  },
  {
    id: 'kvel_portal',
    category: 'kvel',
    name: 'Квель Порталов',
    cost: 0,
    rank: 10,
    fatigueMax: 0,
    profession: 'чародей',
    description: 'Порталы как фокусы. Холодные: 0.',
  },
  {
    id: 'kvel_cyborg',
    category: 'kvel',
    name: 'Квель Кибер-сети',
    cost: 0,
    rank: 10,
    fatigueMax: 2,
    profession: 'киборг',
    description: 'Импланты и протоколы. Холодные: 0.',
  },
  {
    id: 'asp_water',
    category: 'aspect',
    name: 'Аспект Воды',
    cost: 1,
    profession: 'маг',
    description: 'Тип: вода. Замедление; союзникам — щит без урона.',
  },
  {
    id: 'asp_illusion',
    category: 'aspect',
    name: 'Аспект Иллюзии',
    cost: 1,
    profession: 'маг',
    description: 'Образ/звук. Проницательность vs каст для сомнения.',
  },
  {
    id: 'sig_haste',
    category: 'sigil',
    name: 'Ускорение',
    cost: 3,
    profession: 'маг',
    description: 'Квель преобразования. ×2 шаг, +2 КБ, +1 быстрое действие, 1 мин. После — заторможен 1 ход.',
  },
  {
    id: 'sig_portal_step',
    category: 'sigil',
    name: 'Шаг через грань',
    cost: 0,
    profession: 'чародей',
    description: 'Фокус квеля Порталов. Телепорт 6 клеток.',
  },
  {
    id: 'sig_minor_illusion',
    category: 'sigil',
    name: 'Малый образ',
    cost: 0,
    profession: 'маг',
    description: 'Фокус + аспект иллюзии. Звук или статичный образ.',
  },
  {
    id: 'sig_cyb_restrain',
    category: 'sigil',
    name: 'Протокол сдерживания',
    cost: 2,
    range: '9 клеток',
    profession: 'киборг',
    description: 'Приём. Сеть/энерго-цепь. Стержень vs Сл 13 или обездвижен.',
  },
  {
    id: 'sig_cyb_repair',
    category: 'sigil',
    name: 'Ремонт дрона',
    cost: 1,
    profession: 'киборг',
    description: 'Приём. Восстановить союзному конструкту 1–2 раны.',
  },
  {
    id: 'ins_duel_sword',
    category: 'instrument',
    name: 'Дуэльный меч Виэт',
    cost: 0,
    profession: 'Виэт',
    description: '1к8 колющий/рубящий. Фехтовальное, универсальное 1к10.',
  },
  {
    id: 'ins_saber',
    category: 'instrument',
    name: 'Сабля',
    cost: 0,
    profession: 'Виэт',
    description: '1к6 рубящий. Лёгкое, фехтовальное.',
  },
  {
    id: 'kvel_forma_yarosti',
    category: 'kvel',
    name: 'Форма Ярости',
    cost: 0,
    rank: 10,
    fatigueMax: 2,
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

  // ── Инструменты (0 усталости, пассив) ───────────────────────────
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

  // ── Плейтест: приёмы (cost = усталость) ───────────────────
  {
    id: 'sig_wlk_patron_ray',
    category: 'sigil',
    name: 'Луч покровителя',
    cost: 1,
    damage: '1к10',
    range: '6 клеток',
    profession: 'колдун',
    description: 'Приём/фокус. Дистанционная атака пакта. Быстрая версия = 1 рана.',
  },
  {
    id: 'sig_glossolalia',
    category: 'sigil',
    name: 'Глоссолалия',
    cost: 1,
    description: 'Приём. Понимаешь и говоришь на любом языке ~10 мин. Равный уровень — только эта карта или проверка.',
  },
  {
    id: 'sig_evil_eye',
    category: 'sigil',
    name: 'Сглаз',
    cost: 2,
    states: 'Проклятие',
    description: 'Приём. Штраф к броскам цели. Защита: Стержень vs Сложность мастера.',
  },
  {
    id: 'sig_fireball',
    category: 'sigil',
    name: 'Огненный шар',
    cost: 2,
    damage: '3к6',
    area: '1 клетка',
    description: 'Приём. Урон огнём.',
  },
  {
    id: 'sig_lightning',
    category: 'sigil',
    name: 'Молния',
    cost: 2,
    damage: '3к6',
    range: '8 клеток',
    description: 'Приём. Электричество. Игнор металлической брони.',
  },
  {
    id: 'sig_counterspell',
    category: 'sigil',
    name: 'Контрмагия',
    cost: 2,
    description: 'Приём. Реакция: гасит чужой приём/фокус на Сложности каста.',
  },
  {
    id: 'sig_healing',
    category: 'sigil',
    name: 'Усиленное исцеление',
    cost: 2,
    description: 'Приём. Снимает 1–2 раны с союзника или себя.',
  },
  {
    id: 'sig_wings',
    category: 'sigil',
    name: 'Крылья',
    cost: 1,
    description: 'Приём. Полёт / парение на 1 раунд.',
  },
  {
    id: 'sig_viet_charge',
    category: 'sigil',
    name: 'Натиск',
    cost: 2,
    damage: '1к8',
    profession: 'Виэт',
    description: 'Приём. Рывок + удар. 1 рана при успехе.',
  },
  {
    id: 'sig_cyb_bomb',
    category: 'sigil',
    name: 'Бомба',
    cost: 2,
    area: '2х2',
    damage: '2к6',
    profession: 'киборг',
    description: 'Приём. Взрыв по зоне.',
  },
  {
    id: 'sig_cyb_overclock',
    category: 'sigil',
    name: 'Ускорение',
    cost: 2,
    profession: 'киборг',
    description: 'Приём. +шаг, уклонение с преимуществом или доп. быстрая атака.',
  },
  {
    id: 'sig_cyb_barrage',
    category: 'sigil',
    name: 'Обстрел',
    cost: 2,
    damage: '2к4',
    range: '6 клеток',
    profession: 'киборг',
    description: 'Приём. Серия выстрелов по одной цели.',
  },
  {
    id: 'sig_cyb_destruction',
    category: 'sigil',
    name: 'Деструкция',
    cost: 3,
    damage: '3к8',
    range: '8 клеток',
    profession: 'киборг',
    description: 'Приём. Мощный выстрел; пробивает лёгкое укрытие.',
  },
  {
    id: 'ins_scythe_pistol',
    category: 'instrument',
    name: 'Серпы-пистолеты',
    cost: 0,
    profession: 'киборг',
    description: 'Инструмент. Ближний и дальний режим без смены оружия.',
  },
  // ── D&D распространённые + персонажи ─────────────────
  { id: 'kvel_pact', category: 'kvel', name: 'Квель Пакта', cost: 0, rank: 10, fatigueMax: 2, profession: 'колдун', description: 'Пакт. Холодные: 2–3. Сигилы покровителя.' },
  { id: 'sig_magic_missile', category: 'sigil', name: 'Волшебная стрела', cost: 1, damage: '1к4+1', range: '36 клеток', profession: 'маг', description: 'Приём. Три стрелы, автопопадание.' },
  { id: 'sig_shield', category: 'sigil', name: 'Щит', cost: 1, profession: 'маг', description: 'Реакция. +5 КБ до следующего хода.' },
  { id: 'sig_misty_step', category: 'sigil', name: 'Туманный шаг', cost: 1, range: '6 клеток', profession: 'маг', description: 'Приём. Телепорт.' },
  { id: 'sig_dispel', category: 'sigil', name: 'Рассеивание', cost: 2, profession: 'маг', description: 'Приём. Снять магический эффект с цели.' },
  { id: 'sig_polymorph', category: 'sigil', name: 'Облик', cost: 3, profession: 'маг', description: 'Приём. Форма зверя или гуманоида, 1 мин.' },
  { id: 'sig_detect_magic', category: 'sigil', name: 'Обнаружение магии', cost: 0, profession: 'маг', description: 'Фокус. Чувствуешь магию 10 мин.' },
  { id: 'sig_bless', category: 'sigil', name: 'Благословение', cost: 1, profession: 'маг', description: 'Приём. До 3 целей: +1к4 к атакам и спасброскам.' },
  { id: 'sig_cure_wounds', category: 'sigil', name: 'Лечение ран', cost: 1, profession: 'маг', description: 'Приём. Снимает 1–2 раны.' },
  { id: 'sig_invisibility', category: 'sigil', name: 'Невидимость', cost: 2, profession: 'маг', description: 'Приём. Невидим до атаки или 1 мин.' },
  { id: 'sig_thunder_blade', category: 'sigil', name: 'Громовой клинок', cost: 1, damage: '1к8+урон аспекта', profession: 'Виэт', description: 'С аспектом молнии: оружие +1к8 молнии на 1 мин.' },
  { id: 'sig_viet_assault', category: 'sigil', name: 'Нatiск', cost: 0, profession: 'Виэт', description: 'Сигил стойки Нatiска. ● — две атаки дуэльным мечом.' },
  { id: 'sig_viet_disarm', category: 'sigil', name: 'Обезоруживание', cost: 0, profession: 'Виэт', description: '● — выбить предмет (спасбросок ловкости).' },
  { id: 'sig_viet_rook', category: 'sigil', name: 'Рокировка', cost: 0, profession: 'Виэт', description: '● реакция — обмен с союзником, перенаправить атаку.' },
  { id: 'sig_viet_hare', category: 'sigil', name: 'Зайчик', cost: 0, profession: 'Виэт', description: '● — ослепить на 1 раунд (на солнце).' },
  { id: 'sig_viet_wounding', category: 'sigil', name: 'Ранение', cost: 0, profession: 'Виэт', description: '● — кровотечение 1к6/раунд (с 10 ур.).' },
  { id: 'ins_hidden_blade', category: 'instrument', name: 'Скрытый клинок', cost: 0, profession: 'киборг', description: '1к4 колющий. Лёгкое, метательное 6/18 клеток.' },
  { id: 'sig_cyb_absorb', category: 'sigil', name: 'Absorver Energia', cost: 1, profession: 'киборг', description: 'Reação. Absorve dano de efeito em área.' },
  { id: 'sig_cyb_target_lock', category: 'sigil', name: 'Bloqueio de Alvo', cost: 1, range: '12 клеток', profession: 'киборг', description: 'Vantagem no próximo ataque à distância contra o alvo.' },
  { id: 'sig_cyb_confusion', category: 'sigil', name: 'Confusão Coordenada', cost: 1, profession: 'киборг', description: 'Feint: você e droide aliado ganham vantagem no próximo ataque.' },
  { id: 'sig_cyb_second_skin', category: 'sigil', name: 'Segunda Pele', cost: 0, profession: 'киборг', description: 'Passivo. 17 escudos; resistência física com escudos ativos.' },

];

export const LS_CARDS_KEY = 'teomor_cards_v2';
export const LS_CARDS_LEGACY = 'teomor_cards_v1';

/** Справочник = initialCards + сохранённые; новые карты плейтеста не теряются. */
export function mergeCatalog(stored: GameCard[]): GameCard[] {
  const byId = new Map<string, GameCard>();
  for (const c of initialCards) byId.set(c.id, { ...c });
  for (const c of stored) {
    const base = byId.get(c.id);
    byId.set(c.id, base ? { ...base, ...c } : c);
  }
  return Array.from(byId.values());
}

export function loadCatalogFromStorage(): GameCard[] {
  try {
    const raw =
      localStorage.getItem(LS_CARDS_KEY) ??
      localStorage.getItem(LS_CARDS_LEGACY);
    if (!raw) return [...initialCards];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...initialCards];
    const normalized = parsed.map((c: GameCard & { osLimit?: number }) => ({
      ...c,
      fatigueMax: c.fatigueMax ?? c.osLimit,
    }));
    return mergeCatalog(normalized);
  } catch {
    return [...initialCards];
  }
}

export function saveCatalogToStorage(cards: GameCard[]): void {
  localStorage.setItem(LS_CARDS_KEY, JSON.stringify(mergeCatalog(cards)));
}

/** Сброс каталога: все initialCards + приёмы игрока. */
export function resetCatalogToDefault(): GameCard[] {
  const builds = loadCatalogFromStorage().filter((c) => c.category === 'build');
  const merged = mergeCatalog([...initialCards, ...builds]);
  saveCatalogToStorage(merged);
  return merged;
}

/** Подмешать карты пресета плейтеста в localStorage. */
export function applyPlaytestCatalog(cardIds: string[]): void {
  const current = loadCatalogFromStorage();
  const ensure = initialCards.filter((c) => cardIds.includes(c.id));
  saveCatalogToStorage(mergeCatalog([...current, ...ensure]));
  window.dispatchEvent(new Event('teomor-catalog-updated'));
}
