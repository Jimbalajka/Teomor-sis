import type { SkillTreeData, SkillNode, SkillEdge } from './types';

// Древо «Теомор». Специализации (Дары) — прямо от центра. Внутри Дара: школы
// (subcategory) = пути Квеля; под школами — суб-типы профессий (transit_specialized)
// и транзитные навыки/черты. Правится здесь или в редакторе приложения.
//
// Таксономия профессий (по решению автора):
//  РАЗУМ (Дар Медведя): Волшебство {Некромант, Кровавый маг, Хрономант, Иллюзионист,
//    Геомант}; Мистика {Мистик}; Волшебный ремесленник {Алхимик, Зачарователь, Артефактор}.
//  МУДРОСТЬ (Дар Голубя): Колдовство {Колдун, Чародей, Пактер, Призыватель};
//    Псионика {Псионик}; Божественное/Звериная {Шаман, Друид, Жрец, Паладин}; Лидерство.
//  СИЛА (Дар Зюбания): Берсерк, Высвобождение, Кузнечное, Стойкость (+ Боевой маг).
//  ЛОВКОСТЬ (Дар Змея): Дуэль, Стрельба, Скрытность, Акробатика, Перо {Печатник Туо,
//    Рунописец, Художник}.

// Хелперы для краткости.
const school = (id: string, x: number, y: number, label: string, zone: SkillNode['zone'], desc: string): SkillNode => ({
  id, x, y, label, zone, category: 'subcategory', cost: { type: 'OR', amount: 1 },
  requirements: { parentIds: [], requiredSpecialization: { zone, level: 1 } }, description: desc,
});
// Опции для всплывающих окон профессии (редактируются под каждую профессию).
const opt = (label: string, desc?: string) => ({ id: label, label, desc });
const SIGIL_OPTIONS = [
  opt('Урон', 'Наносит урон стихией сборки.'),
  opt('Лечение', 'Снимает 1 рану с цели (по правилам лечения).'),
  opt('Дебафф', 'Накладывает состояние (по Сигилу).'),
  opt('Дистанция', 'Дальнобойное применение.'),
];
// Аспекты по «природе» школы (можно менять в редакторе).
const ASPECTS_ELEMENTAL = ['Огонь', 'Вода', 'Земля', 'Воздух'].map((a) => opt(a));
const ASPECTS_MYSTIC = ['Психический', 'Силовой', 'Иной'].map((a) => opt(a));
const ASPECTS_DIVINE = ['Лучистый', 'Некротический', 'Природный'].map((a) => opt(a));

const prof = (
  id: string, x: number, y: number, label: string, zone: SkillNode['zone'],
  parent: string, desc: string, aspects = ASPECTS_ELEMENTAL,
): SkillNode => ({
  id, x, y, label, zone, category: 'transit_specialized', cost: { type: 'OR', amount: 1 },
  requirements: { parentIds: [parent], requiredSpecialization: { zone, level: 3 } }, description: desc,
  choices: [
    { id: 'aspect', title: 'Выбери аспект', pick: 1, options: aspects },
    { id: 'sigils', title: 'Выбери 2 сигила', pick: 2, options: SIGIL_OPTIONS },
  ],
});

const nodes: SkillNode[] = [
  // ── Центр + общие навыки ─────────────────────────────────
  { id: 'center_start', x: 0, y: 0, label: 'Центр', zone: 'center', category: 'root', cost: { type: 'OR', amount: 0 }, description: 'Исток персонажа (1 уровень после выбора расы). От него — 4 Дара и общие навыки.' },
  { id: 'g_will', x: 0, y: -190, label: 'Воля', zone: 'center', category: 'transit_general', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['center_start'] }, statModifiers: { Интуиция: 1 }, description: 'Общий. +1 к спасброскам воли/Интуиции.' },
  { id: 'g_grit', x: 190, y: 0, label: 'Закалка', zone: 'center', category: 'transit_general', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['center_start'] }, statModifiers: { Ранения: 1 }, description: 'Общий. +1 к макс. ранам.' },
  { id: 'g_swift', x: 0, y: 190, label: 'Проворство', zone: 'center', category: 'transit_general', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['center_start'] }, statModifiers: { Шаг: 1 }, description: 'Общий. +1 к Шагу.' },
  { id: 'g_lore', x: -190, y: 0, label: 'Эрудиция', zone: 'center', category: 'transit_general', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['center_start'] }, statModifiers: { 'Поиск Информации': 1 }, description: 'Общий. +1 к Поиску информации.' },

  // ════════ ДАР МЕДВЕДЯ — МАГИЯ / РАЗУМ (синий) ════════════
  { id: 'spec_magic', x: -340, y: -340, label: 'Дар Медведя', zone: 'magic', category: 'specialization', cost: { type: 'OR', amount: 2 }, level: 0, maxLevel: 10, requirements: { parentIds: ['center_start'] }, description: 'Магия (Разум). Открывает Квель и школы. До 10 за ОР.' },

  // Волшебство + суб-типы
  { ...school('sch_wizardry', -520, -300, 'Волшебство', 'magic', 'Академическая магия (Разум). База маг-профессий.'), requirements: { parentIds: ['spec_magic'], requiredSpecialization: { zone: 'magic', level: 1 } } },
  { id: 'ts_concentration', x: -500, y: -180, label: 'Концентрация', zone: 'magic', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_wizardry'], requiredSpecialization: { zone: 'magic', level: 2 } }, statModifiers: { Усталость: 1 }, description: '+1 к макс. усталости.' },
  { id: 'feat_spellpower', x: -620, y: -140, label: 'Сила заклинаний', zone: 'magic', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['ts_concentration'], requiredSpecialization: { zone: 'magic', level: 3 } }, description: 'Черта. Раз за бой игнорируй ограничение геометрии каскада.' },
  { id: 'secret_truename', x: -740, y: -180, label: 'Истинное Имя', zone: 'magic', category: 'transit_specialized', cost: { type: 'OR', amount: 2 }, isSecret: true, secretHint: 'Требуется 5 ур. Дара Медведя и Концентрация.', requirements: { parentIds: ['ts_concentration'], requiredSpecialization: { zone: 'magic', level: 5 } }, statModifiers: { Усталость: 2 }, description: 'Секрет. Раз за бой игнорируй откат приёма (+1 усталости).' },
  prof('st_necromancer', -700, -320, 'Некромант', 'magic', 'sch_wizardry', 'Суб-тип Волшебства: смерть, нежить, истощение.'),
  prof('st_bloodmage', -720, -400, 'Кровавый маг', 'magic', 'sch_wizardry', 'Суб-тип: питает Квель ранами, больше усталости за мощь.'),
  prof('st_chronomancer', -620, -460, 'Хрономант', 'magic', 'sch_wizardry', 'Суб-тип: время — замедление/ускорение, доп. действия.'),
  prof('st_illusionist', -540, -440, 'Иллюзионист', 'magic', 'sch_wizardry', 'Суб-тип: обман чувств, ослепление, невидимость.'),
  prof('st_geomancer', -820, -360, 'Геомант', 'magic', 'sch_wizardry', 'Суб-тип: земля/камень, зоны, укрепления.'),

  // Мистика
  { ...school('sch_mysticism', -360, -520, 'Мистика', 'magic', 'Тонкие энергии, прорицание (Разум).'), requirements: { parentIds: ['spec_magic'], requiredSpecialization: { zone: 'magic', level: 1 } } },
  { id: 'ts_divination', x: -460, y: -620, label: 'Прорицание', zone: 'magic', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_mysticism'], requiredSpecialization: { zone: 'magic', level: 2 } }, statModifiers: { Мистика: 1 }, description: '+1 к Мистике. Чтение потоков Махтерии.' },
  prof('st_mystic', -300, -640, 'Мистик', 'magic', 'sch_mysticism', 'Суб-тип: психический/силовой урон в обход брони.', ASPECTS_MYSTIC),

  // Волшебный ремесленник
  { ...school('sch_craft', -560, -560, 'Волшебный ремесленник', 'magic', 'Предметная магия (Разум). Замена «Алхимии».'), requirements: { parentIds: ['spec_magic'], requiredSpecialization: { zone: 'magic', level: 1 } } },
  prof('st_alchemist', -740, -540, 'Алхимик', 'magic', 'sch_craft', 'Суб-тип: зелья-сигилы, сильные холодные заготовки.'),
  prof('st_enchanter', -720, -620, 'Зачарователь', 'magic', 'sch_craft', 'Суб-тип: наложение аспектов/эффектов на предметы.'),
  prof('st_artificer', -600, -680, 'Артефактор', 'magic', 'sch_craft', 'Суб-тип: создание артефактов и механо-магии.'),

  // ── Волшебство: плюсы/минусы ──
  { id: 'ts_warding', x: -420, y: -240, label: 'Обереги', zone: 'magic', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_wizardry'], requiredSpecialization: { zone: 'magic', level: 2 } }, statModifiers: { КБ: 1 }, description: 'Плюс: +1 КБ от барьеров. Минус: −1 к дальности Сигилов.' },
  { id: 'ts_overchannel', x: -580, y: -200, label: 'Перегрузка', zone: 'magic', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['ts_concentration'], requiredSpecialization: { zone: 'magic', level: 3 } }, statModifiers: { Волшебство: 1, Усталость: 1 }, description: 'Плюс: +1 Волшебство, Sигилы +1 кость. Минус: +1 усталость за мощный каст.' },
  { id: 'feat_evoker', x: -660, y: -260, label: 'Пламя и гром', zone: 'magic', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['ts_overchannel'], requiredSpecialization: { zone: 'magic', level: 4 } }, description: 'Элементальные Sигилы без подготовки; прочие школы +1 усталость.' },
  { id: 'feat_necrotic', x: -820, y: -280, label: 'Касание смерти', zone: 'magic', category: 'feat', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['st_necromancer'], requiredSpecialization: { zone: 'magic', level: 4 } }, description: 'Некромант: касание = 1 рана; лечишь половину нанесённого.' },
  { id: 'feat_blood_price', x: -760, y: -460, label: 'Цена крови', zone: 'magic', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['st_bloodmage'], requiredSpecialization: { zone: 'magic', level: 4 } }, description: 'Кровавый маг: трать раны вместо усталости (1 рана = 2 усталости каста).' },

  // ── Мистика: контроль vs урон ──
  { id: 'ts_mindshield', x: -400, y: -680, label: 'Щит разума', zone: 'magic', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['ts_divination'], requiredSpecialization: { zone: 'magic', level: 3 } }, statModifiers: { Стержень: 1 }, description: 'Плюс: спасброски vs контроля. Минус: псионический урон −1 кость.' },
  { id: 'feat_psychic_lance', x: -320, y: -760, label: 'Пси-копьё', zone: 'magic', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['st_mystic'], requiredSpecialization: { zone: 'magic', level: 4 } }, description: 'Дальняя атака разумом, игнор брони; после — +1 усталость.' },
  { id: 'ts_void_glimpse', x: -500, y: -720, label: 'Взгляд в пустоту', zone: 'magic', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_mysticism'], requiredSpecialization: { zone: 'magic', level: 3 } }, description: 'Плюс: видишь невидимое 1 раунд. Минус: −1 КБ до конца хода после.' },

  // ── Ремесленник: предметы vs скорость ──
  { id: 'ts_infusion', x: -640, y: -620, label: 'Влив силы', zone: 'magic', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_craft'], requiredSpecialization: { zone: 'magic', level: 2 } }, statModifiers: { Ремесло: 1 }, description: 'Заряжай предметы заранее; импровизация +1 усталость.' },
  { id: 'feat_battle_alchemy', x: -780, y: -600, label: 'Боевой настой', zone: 'magic', category: 'feat', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['st_alchemist'], requiredSpecialization: { zone: 'magic', level: 4 } }, description: 'Зелье = быстрая атака; без заготовки — помеха на бросок.' },
  { id: 'feat_rune_weapon', x: -680, y: -700, label: 'Рунное оружие', zone: 'magic', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['st_enchanter'], requiredSpecialization: { zone: 'magic', level: 4 } }, description: 'Вложи Сигил в оружие (1/отдых); без зарядки — обычный удар.' },

  // ── Синтез школ (2+ родителя) ──
  { id: 'ts_arcane_bridge', x: -440, y: -400, label: 'Синтез школ', zone: 'magic', category: 'transit_specialized', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['ts_concentration', 'ts_divination'], requiredSpecialization: { zone: 'magic', level: 4 } }, description: 'Волшебство + Мистика. 1×/бой контрмагия без усталости после прорицания.' },
  { id: 'feat_artifice_ritual', x: -520, y: -480, label: 'Ритуальный ремесленник', zone: 'magic', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['ts_infusion', 'ts_concentration'], requiredSpecialization: { zone: 'magic', level: 5 } }, description: 'Волшебство + Ремесло. Холодный Sигил из предмета: −1 усталость, но 1 раунд подготовки.' },

  // ── Смежные ветки (Дар Медведя + другой Дар) ──
  { id: 'feat_warmage', x: -240, y: -480, label: 'Рунный дуэлянт', zone: 'magic', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['sch_wizardry'], requiredSpecialization: { zone: 'dexterity', level: 3 } }, description: 'Волшебство + Дар Змея 3. Парирование заряжает клинок Сигилом (1/бой).' },
  { id: 'feat_oracle', x: -280, y: -560, label: 'Оракул', zone: 'magic', category: 'feat', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_mysticism'], requiredSpecialization: { zone: 'wisdom', level: 3 } }, description: 'Мистика + Дар Голубя 3. После пакта — один каст Колдовства без усталости.' },
  { id: 'feat_sigil_scribe', x: -200, y: -400, label: 'Сигил-писец', zone: 'magic', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['sch_craft'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, description: 'Ремесло + Дар Змея 2. Печатай Сигилы как знаки Перо (−1 усталость, нужен инструмент).' },
  { id: 'feat_spellblade', x: -120, y: -520, label: 'Клинок заклинателя', zone: 'magic', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['feat_battlemage'], requiredSpecialization: { zone: 'magic', level: 4 } }, description: 'Боевой маг + 4 ур. Медведя. Ближняя атака накладывает выбранный фокус (1/бой).' },

  // ════════ ДАР ЗЮБАНИЯ — СИЛА (красный) ═══════════════════
  { id: 'spec_strength', x: 340, y: -340, label: 'Дар Зюбания', zone: 'strength', category: 'specialization', cost: { type: 'OR', amount: 2 }, level: 0, maxLevel: 10, requirements: { parentIds: ['center_start'] }, description: 'Ближний бой. Боевые Формы (Квель воина). До 10 за ОР.' },
  { ...school('sch_berserk', 520, -300, 'Берсерк', 'strength', 'Форма Ярости: урон ценой защиты.'), requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'strength', level: 1 } } },
  { id: 'ts_rage', x: 680, y: -260, label: 'Ярость', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_berserk'], requiredSpecialization: { zone: 'strength', level: 2 } }, statModifiers: { 'Ближний бой (Мощь)': 1 }, description: '+1 к урону ближнего боя; -1 КБ в стойке.' },
  { ...school('sch_awaken', 560, -440, 'Высвобождение', 'strength', 'Форма Пробуждения: усталость сбрасывается быстрее в бою.'), requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'strength', level: 2 } } },
  { id: 'feat_awaken', x: 720, y: -460, label: 'Пробуждение', zone: 'strength', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['sch_awaken'], requiredSpecialization: { zone: 'strength', level: 4 } }, description: 'Черта. В начале хода сними 1 усталость (разгон).' },
  { ...school('sch_smith', 420, -520, 'Кузнечное дело', 'strength', 'Рунщик: руны = холодные сигилы, зачарование оружия.'), requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'strength', level: 1 } } },
  { id: 'ts_runeforge', x: 520, y: -640, label: 'Рунная ковка', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_smith'], requiredSpecialization: { zone: 'strength', level: 2 } }, statModifiers: { Ремесло: 1 }, description: 'Наноси руну (холодный сигил) на снаряжение.' },
  { ...school('sch_toughness', 300, -560, 'Стойкость', 'strength', 'Живучесть: порог ран, кости здоровья.'), requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'strength', level: 1 } } },
  { id: 'ts_toughskin', x: 340, y: -700, label: 'Толстая кожа', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_toughness'], requiredSpecialization: { zone: 'strength', level: 2 } }, statModifiers: { Ранения: 2 }, description: '+2 к макс. ранам.' },
  { id: 'ts_multihit', x: 200, y: -640, label: 'Второе дыхание', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['sch_toughness'], requiredSpecialization: { zone: 'strength', level: 4 } }, description: '+1 к максимуму Ран (вторая кость здоровья).' },
  { id: 'feat_battlemage', x: 0, y: -520, label: 'Боевой маг', zone: 'strength', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'magic', level: 2 } }, description: 'Черта. Требует Дар Зюбания + 2 ур. Дара Медведя. Аспект на оружие/пули.' },

  // ════════ ВИЭТ — боевое искусство (Дар Зюбания) ═══════════
  { ...school('sch_viet', 180, -420, 'Виэт', 'strength', 'Боевое искусство: стойки, натиск, контроль дистанции.'), requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'strength', level: 1 } } },
  { id: 'ts_viet_stance_def', x: 80, y: -520, label: 'Стойка Змеи', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_viet'], requiredSpecialization: { zone: 'strength', level: 2 } }, description: 'Оборона: +1 КБ; парирование с преимуществом.' },
  { id: 'ts_viet_stance_assault', x: 200, y: -560, label: 'Стойка Натиска', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_viet'], requiredSpecialization: { zone: 'strength', level: 2 } }, description: 'Атака: быстрая атака с преимуществом после рывка.' },
  { id: 'feat_viet_thunder', x: 300, y: -480, label: 'Громовой клинок', zone: 'strength', category: 'feat', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_viet'], requiredSpecialization: { zone: 'strength', level: 2 } }, description: 'Фокус: зарядить клинок. Быстрая атака +1 рана по металлическим целям.' },
  { id: 'feat_viet_charge', x: 280, y: -620, label: 'Натиск', zone: 'strength', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['ts_viet_stance_assault'], requiredSpecialization: { zone: 'strength', level: 3 } }, description: 'Приём (карта). Рывок + удар, усталость 2.' },
  { id: 'ts_viet_wounding', x: 100, y: -640, label: 'Ранящий стиль', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['ts_viet_stance_def'], requiredSpecialization: { zone: 'strength', level: 3 } }, description: 'Успешная быстрая атака — кровотечение (1 рана в начале хода цели, 1 раунд).' },
  { id: 'ts_viet_stance_trick', x: 160, y: -480, label: 'Обманная стойка', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_viet'], requiredSpecialization: { zone: 'strength', level: 2 } }, description: 'Третья стойка: враги атакуют с помехой; «гадости» дуэлянта сильнее.' },
  { id: 'feat_viet_disarm', x: 240, y: -520, label: 'Обезоруживание', zone: 'strength', category: 'feat', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['ts_viet_stance_trick'], requiredSpecialization: { zone: 'strength', level: 3 } }, description: 'Действие: выбить оружие после успешной атаки с преимуществом в Обманной стойке.' },
  { id: 'feat_viet_rook', x: 60, y: -600, label: 'Рокировка', zone: 'strength', category: 'feat', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['ts_viet_stance_def'], requiredSpecialization: { zone: 'strength', level: 4 } }, description: 'Реакция: обмен местами с союзником в соседней клетке — атака перенаправлена.' },
  { id: 'feat_viet_hare', x: 200, y: -700, label: 'Зайчик', zone: 'strength', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['ts_viet_stance_trick'], requiredSpecialization: { zone: 'strength', level: 4 } }, description: 'Фокус: отражённый луч / вспышка — цель слепа на 1 раунд (спасбросок).' },

  // ════════ ДАР ЗМЕЯ — ЛОВКОСТЬ (зелёный) ══════════════════
  { id: 'spec_dexterity', x: 340, y: 340, label: 'Дар Змея', zone: 'dexterity', category: 'specialization', cost: { type: 'OR', amount: 2 }, level: 0, maxLevel: 10, requirements: { parentIds: ['center_start'] }, description: 'Ловкость. Дальний бой, дуэль, скрытность, Перо. До 10 за ОР.' },
  { ...school('sch_duel', 520, 300, 'Дуэль', 'dexterity', 'Форма Клинка: реакции, парирование.'), requirements: { parentIds: ['spec_dexterity'], requiredSpecialization: { zone: 'dexterity', level: 1 } } },
  { id: 'ts_parry', x: 680, y: 260, label: 'Парирование', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_duel'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, description: 'Реакция: ответная атака на промах врага.' },
  { ...school('sch_ranged', 560, 440, 'Стрельба', 'dexterity', 'Форма Прицела: дальность, точность.'), requirements: { parentIds: ['spec_dexterity'], requiredSpecialization: { zone: 'dexterity', level: 1 } } },
  { id: 'ts_precshot', x: 720, y: 420, label: 'Точный выстрел', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_ranged'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, statModifiers: { 'Дальний бой': 1 }, description: '+1 к Дальнему бою; игнор половины укрытия.' },
  { id: 'ts_volley', x: 700, y: 520, label: 'Шквал', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['sch_ranged'], requiredSpecialization: { zone: 'dexterity', level: 4 } }, description: 'Три снаряда по разным целям со штрафом.' },
  { ...school('sch_stealth', 420, 540, 'Скрытность', 'dexterity', 'Путь тени: невидимость, первый удар.'), requirements: { parentIds: ['spec_dexterity'], requiredSpecialization: { zone: 'dexterity', level: 1 } } },
  { id: 'ts_shadowstrike', x: 560, y: 620, label: 'Удар из тени', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_stealth'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, statModifiers: { Скрытность: 1 }, description: '+1 к Скрытности; урон из невидимости с преимуществом.' },
  { ...school('sch_acrobatics', 300, 560, 'Акробатика', 'dexterity', 'Подвижность, уклонение, инициатива.'), requirements: { parentIds: ['spec_dexterity'], requiredSpecialization: { zone: 'dexterity', level: 1 } } },
  { id: 'ts_evasion', x: 340, y: 700, label: 'Уклонение', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_acrobatics'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, statModifiers: { Уклонение: 1 }, description: '+1 к Уклонению (КБ).' },
  // Перо + суб-типы
  { ...school('sch_pero', 540, 600, 'Перо', 'dexterity', 'Мастерство знаков и образов (Моторика).'), requirements: { parentIds: ['spec_dexterity'], requiredSpecialization: { zone: 'dexterity', level: 1 } } },
  prof('st_scribe', 700, 600, 'Печатник Туо', 'dexterity', 'sch_pero', 'Суб-тип: печати Туо — быстрое черчение боевых знаков.'),
  prof('st_runescribe', 720, 680, 'Рунописец', 'dexterity', 'sch_pero', 'Суб-тип: руны-ловушки и отложенные эффекты.'),
  prof('st_artist', 600, 720, 'Художник', 'dexterity', 'sch_pero', 'Суб-тип: живые образы, иллюзии через рисунок.'),

  // ════════ КИБЕРНЕТИКА — импланты (Дар Змея) ═════════════════
  { ...school('sch_cybernetics', 180, 420, 'Кибернетика', 'dexterity', 'Импланты, протоколы, боевая аугментация (джухдес).'), requirements: { parentIds: ['spec_dexterity'], requiredSpecialization: { zone: 'dexterity', level: 1 } } },
  { id: 'feat_cyb_cold', x: 60, y: 480, label: 'Хладнокровный', zone: 'dexterity', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['sch_cybernetics'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, description: 'Черта. Иммунитет к очарованию и страху.' },
  { id: 'ts_cyb_analysis', x: 180, y: 520, label: 'Тактический анализ', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_cybernetics'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, statModifiers: { Анализ: 2 }, description: '+2 Анализ (сенсорный имплант).' },
  { id: 'feat_cyb_glitch', x: 300, y: 480, label: 'Сбой протокола', zone: 'dexterity', category: 'feat', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_cybernetics'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, description: 'Черта. При провале с «1» на к6 — брось к4: 1–2 имплант даёт сбой.' },
  { id: 'ts_cyb_overclock', x: 120, y: 620, label: 'Разгон', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['ts_cyb_analysis'], requiredSpecialization: { zone: 'dexterity', level: 3 } }, description: 'Открывает приём «Ускорение» (карта).' },
  { id: 'ts_cyb_ordnance', x: 260, y: 640, label: 'Орудийный модуль', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_cybernetics'], requiredSpecialization: { zone: 'dexterity', level: 3 } }, statModifiers: { 'Дальний бой': 1 }, description: 'Встроенное оружие. Карты: бомба, обстрел, деструкция.' },
  { id: 'ts_cyb_plating', x: 360, y: 680, label: 'Бронепластины', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['ts_cyb_ordnance'], requiredSpecialization: { zone: 'dexterity', level: 4 } }, statModifiers: { Броня: 1 }, description: '+1 к броне (встроенная). Суммируется с полем «Броня +» в Sidebar.' },
  { id: 'feat_cyb_nanites', x: 400, y: 560, label: 'Нанорой', zone: 'dexterity', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['ts_cyb_overclock'], requiredSpecialization: { zone: 'dexterity', level: 4 } }, description: 'Раз за отдых сними 1 рану без магии. В бою — +1 к спасброскам от яда/болезни.' },
  { id: 'ts_cyb_ecm', x: 320, y: 720, label: 'РЭБ-модуль', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['feat_cyb_glitch'], requiredSpecialization: { zone: 'dexterity', level: 3 } }, statModifiers: { Уклонение: 1 }, description: '+1 Уклонение против дальнего огня и наведённых систем.' },
  { id: 'feat_cyb_optics', x: 440, y: 640, label: 'Оптический пакет', zone: 'dexterity', category: 'feat', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['ts_cyb_analysis'], requiredSpecialization: { zone: 'dexterity', level: 3 } }, description: 'Фокус: тепловизор и «рентген» лёгких укрытий; скан с усталостью 1 на 1 раунд.' },

  // ════════ ДАР ГОЛУБЯ — МУДРОСТЬ / СТЕРЖЕНЬ (янтарный) ═════
  { id: 'spec_wisdom', x: -340, y: 340, label: 'Дар Голубя', zone: 'wisdom', category: 'specialization', cost: { type: 'OR', amount: 2 }, level: 0, maxLevel: 10, requirements: { parentIds: ['center_start'] }, description: 'Мудрость (Стержень). Влияние, воля, интуитивная/звериная магия. До 10 за ОР.' },
  // Колдовство + суб-типы
  { ...school('sch_witchcraft', -520, 300, 'Колдовство', 'wisdom', 'Интуитивная магия (Стержень).'), requirements: { parentIds: ['spec_wisdom'], requiredSpecialization: { zone: 'wisdom', level: 1 } } },
  { id: 'ts_pact', x: -680, y: 260, label: 'Пакт', zone: 'wisdom', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_witchcraft'], requiredSpecialization: { zone: 'wisdom', level: 2 } }, statModifiers: { Колдовство: 1 }, description: '+1 к Колдовству; дешёвая заморозка холодных.' },
  prof('st_warlock', -700, 340, 'Колдун', 'wisdom', 'sch_witchcraft', 'Суб-тип: канал покровителя, узкий домен, дешёвая заморозка.'),
  { id: 'feat_wlk_patron_ray', x: -780, y: 300, label: 'Дар покровителя', zone: 'wisdom', category: 'feat', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['st_warlock'], requiredSpecialization: { zone: 'wisdom', level: 2 } }, description: 'Фокус: луч покровителя (урон на дистанции). Быстрая атака = 1 рана, 6 клеток.' },
  { id: 'ts_wlk_occult', x: -860, y: 280, label: 'Оккультные знания', zone: 'wisdom', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['feat_wlk_patron_ray'], requiredSpecialization: { zone: 'wisdom', level: 3 } }, statModifiers: { 'Поиск Информации': 1, Колдовство: 1 }, description: 'Дар знаний: +1 к поиску и колдовству; фокус — вспомнить лор о сущности/артефакте.' },
  { id: 'feat_wlk_devils_sight', x: -760, y: 380, label: 'Истинное зрение', zone: 'wisdom', category: 'feat', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['st_warlock'], requiredSpecialization: { zone: 'wisdom', level: 2 } }, description: 'Черта. Видишь в темноте и сквозь иллюзии низкого ранга (фокус).' },
  { id: 'ts_wlk_hex', x: -840, y: 360, label: 'Мастерство сглаза', zone: 'wisdom', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['feat_wlk_devils_sight'], requiredSpecialization: { zone: 'wisdom', level: 3 } }, description: 'Открывает приём «Сглаз». На слабых (аура) — фокус-проклятие без карты.' },
  { id: 'feat_wlk_tongues', x: -920, y: 320, label: 'Языки пакта', zone: 'wisdom', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['ts_wlk_hex'], requiredSpecialization: { zone: 'wisdom', level: 4 } }, description: 'Приём «Глоссолалия» или авто-язык на слабых. Равный — только карта/проверка.' },
  prof('st_sorcerer', -720, 420, 'Чародей', 'wisdom', 'sch_witchcraft', 'Суб-тип: мгновенный живой каст, мало холодных.'),
  { id: 'ts_sor_font', x: -800, y: 440, label: 'Источник силы', zone: 'wisdom', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['st_sorcerer'], requiredSpecialization: { zone: 'wisdom', level: 2 } }, statModifiers: { Усталость: 1 }, description: '+1 к макс. усталости. Раз за отдых сбрось 2 усталости бесплатно.' },
  { id: 'feat_sor_metamagic', x: -880, y: 480, label: 'Метамагия', zone: 'wisdom', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['ts_sor_font'], requiredSpecialization: { zone: 'wisdom', level: 3 } }, description: 'Раз за ход: перебрось Куб Стиля или удвой дистанцию фокуса (+1 усталость).' },
  { id: 'ts_sor_draconic', x: -740, y: 500, label: 'Драконья кровь', zone: 'wisdom', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['st_sorcerer'], requiredSpecialization: { zone: 'wisdom', level: 2 } }, statModifiers: { Ранения: 1 }, description: '+1 к макс. ранам. Фокус: чешуйчатый блеск; приём «Крылья» — усталость 1.' },
  { id: 'feat_divine_channel', x: -820, y: 540, label: 'Божественный канал', zone: 'wisdom', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['ts_sor_draconic'], requiredSpecialization: { zone: 'wisdom', level: 3 } }, description: 'Черта (Divine Magic). Одно «жреческое» заклинание как приём, усталость 1.' },
  { id: 'feat_fate_guard', x: -900, y: 560, label: 'Охрана судьбы', zone: 'wisdom', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['feat_sor_metamagic'], requiredSpecialization: { zone: 'wisdom', level: 4 } }, description: 'Раз за отдых: +1к4 к своему или чужому броску атаки/спаса.' },
  { id: 'feat_sor_subtle', x: -960, y: 500, label: 'Незаметное колдовство', zone: 'wisdom', category: 'feat', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['feat_sor_metamagic'], requiredSpecialization: { zone: 'wisdom', level: 4 } }, description: 'Фокус/приём без жестов и слов; в социалке +2 к скрытому касту.' },
  prof('st_pactmaker', -640, 180, 'Пактер', 'wisdom', 'sch_witchcraft', 'Суб-тип: сделки с сущностями за силу.'),
  prof('st_summoner', -800, 300, 'Призыватель', 'wisdom', 'sch_witchcraft', 'Суб-тип: вызов существ-союзников.'),
  // Псионика
  { ...school('sch_psionics', -540, 460, 'Псионика', 'wisdom', 'Ментальный контур (Стержень).'), requirements: { parentIds: ['spec_wisdom'], requiredSpecialization: { zone: 'wisdom', level: 1 } } },
  { id: 'ts_psiblade', x: -700, y: 480, label: 'Психоклинок', zone: 'wisdom', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_psionics'], requiredSpecialization: { zone: 'wisdom', level: 2 } }, statModifiers: { Псионика: 1 }, description: '+1 к Псионике; урон в обход брони (спасбросок Разума).' },
  // Божественное / Звериная
  { ...school('sch_divine', -420, 560, 'Божественное', 'wisdom', 'Звериная/божественная магия: духи, звери, вера.'), requirements: { parentIds: ['spec_wisdom'], requiredSpecialization: { zone: 'wisdom', level: 1 } } },
  prof('st_shaman', -560, 620, 'Шаман', 'wisdom', 'sch_divine', 'Суб-тип: духи, тотемы, стихийная связь.', ASPECTS_DIVINE),
  prof('st_druid', -600, 680, 'Друид', 'wisdom', 'sch_divine', 'Суб-тип: природа, облик зверя, превращения.', ASPECTS_DIVINE),
  prof('st_priest', -500, 720, 'Жрец', 'wisdom', 'sch_divine', 'Суб-тип: лечение, баффы, ауры.', ASPECTS_DIVINE),
  prof('st_paladin', -380, 700, 'Паладин', 'wisdom', 'sch_divine', 'Суб-тип: боевая вера, защита союзников.', ASPECTS_DIVINE),
  // Лидерство
  { ...school('sch_leader', -280, 560, 'Лидерство', 'wisdom', 'Влияние, командование, вдохновение.'), requirements: { parentIds: ['spec_wisdom'], requiredSpecialization: { zone: 'wisdom', level: 1 } } },
  { id: 'ts_command', x: -300, y: 700, label: 'Командование', zone: 'wisdom', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_leader'], requiredSpecialization: { zone: 'wisdom', level: 2 } }, statModifiers: { Лидерство: 1 }, description: '+1 к Лидерству; союзник смещается на 2 клетки вне хода.' },

  // ── Слоты ЧЕРТ (слева): 1 покупка за 4 уровня, попап выбора черты ──
  ...['feat_slot_1', 'feat_slot_2', 'feat_slot_3'].map((id, i): SkillNode => ({
    id, x: -1080, y: -160 + i * 160, label: 'Черта', zone: 'center', category: 'feat_slot',
    cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['center_start'] },
    description: 'Слот Черты. Доступен раз в 4 уровня. Открывает выбор черты.',
    choices: [{
      id: 'feat', title: 'Выбери черту', pick: 1, options: [
        opt('Толстая кожа', '+1 к макс. ранам'),
        opt('Меткий стрелок', '+1 к Дальнему бою'),
        opt('Живучий', '+1 к максимуму Ран'),
        opt('Внимательный', '+1 к Внимательности/инициативе'),
        opt('Быстрые ноги', '+1 к Шагу'),
        opt('Мастер оружия', 'Владение ещё одним видом оружия'),
      ],
    }],
  })),

  // ── Слоты РЕМЁСЕЛ/ВЛАДЕНИЙ (справа): попап выбора ремесла ──
  ...['craft_slot_1', 'craft_slot_2', 'craft_slot_3'].map((id, i): SkillNode => ({
    id, x: 1080, y: -160 + i * 160, label: 'Ремесло', zone: 'center', category: 'craft_slot',
    cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['center_start'] },
    description: 'Слот Ремесла/владения. Доступен раз в 4 уровня. Открывает выбор ремесла.',
    choices: [{
      id: 'craft', title: 'Выбери ремесло/владение', pick: 1, options: [
        opt('Кузнечное дело'), opt('Алхимия'), opt('Кожевенное дело'),
        opt('Ювелирное дело'), opt('Травничество'), opt('Языки'), opt('Механика'),
      ],
    }],
  })),
];

// ── «Дороги» PoE-стиля: цепочки малых узлов -> ноутейбл -> кейстоун ──
// Генерим из школ наружу от центра. Малый = +мод; ноутейбл/кейстоун = черта.
type RoadStep = { t: 's' | 'n' | 'k'; label: string; mods?: Record<string, number>; desc?: string };
function addRoad(
  parent: string, sx: number, sy: number, zone: SkillNode['zone'], steps: RoadStep[],
) {
  const len = Math.hypot(sx, sy) || 1;
  const ux = sx / len, uy = sy / len; // единичный вектор наружу
  let prev = parent;
  steps.forEach((st, i) => {
    const id = `road_${parent}_${i}`;
    const x = Math.round(sx + ux * (200 + i * 150));
    const y = Math.round(sy + uy * (200 + i * 150));
    const reqLevel = st.t === 's' ? 2 : st.t === 'n' ? 4 : 6;
    nodes.push({
      id, x, y, label: st.label, zone,
      category: st.t === 's' ? 'transit_specialized' : 'feat',
      cost: { type: 'OR', amount: st.t === 'k' ? 2 : 1 },
      requirements: { parentIds: [prev], requiredSpecialization: { zone, level: reqLevel } },
      statModifiers: st.mods,
      description: (st.t === 'k' ? 'Кейстоун. ' : st.t === 'n' ? 'Ноутейбл. ' : '') + (st.desc ?? ''),
    });
    prev = id;
  });
}

addRoad('sch_witchcraft', -520, 300, 'wisdom', [
  { t: 's', label: '+1 Колдовство', mods: { Колдовство: 1 } },
  { t: 's', label: '+1 Интуиция', mods: { Интуиция: 1 } },
  { t: 'n', label: 'Холодный пакт', desc: 'Раз за бой подготовь приём без +1 усталости.' },
  { t: 'k', label: 'Воля покровителя', desc: 'Раз за отдых игнорируй «1» на Кубе Стиля на одном касте.' },
]);
addRoad('sch_wizardry', -520, -300, 'magic', [
  { t: 's', label: 'Арканная мощь', mods: { Волшебство: 1 } },
  { t: 's', label: 'Запас маны', mods: { Усталость: 1 } },
  { t: 'n', label: 'Эхо заклинания', desc: 'Раз в ход повтори Sигил урона без +1 усталости (минус: тот же элемент).' },
  { t: 'k', label: 'Разум как броня', desc: 'Раз/бой: 1 рана → +1 усталость вместо раны (минус: не лечит).' },
]);
addRoad('sch_mysticism', -360, -520, 'magic', [
  { t: 's', label: 'Тонкое зрение', mods: { Мистика: 1 } },
  { t: 's', label: 'Холодный разум', mods: { Проницательность: 1 } },
  { t: 'n', label: 'Третий глаз', desc: 'Видишь магию и ловушки; −1 КБ пока активен (фокус).' },
  { t: 'k', label: 'Пустота разума', desc: 'Иммунитет к чтению мыслей; −2 к социальным проверкам эмпатии.' },
]);
addRoad('sch_craft', -560, -560, 'magic', [
  { t: 's', label: 'Мастерская', mods: { Ремесло: 1 } },
  { t: 's', label: 'Алхимия', mods: { Алхимия: 1 } },
  { t: 'n', label: 'Быстрая сборка', desc: 'Холодные без подготовки; готовые Sигилы −1 кость урона.' },
  { t: 'k', label: 'Душа ремесленника', desc: 'Артефакты +1 ранг; без фокус-инструмента каст невозможен.' },
]);
addRoad('sch_berserk', 520, -300, 'strength', [
  { t: 's', label: '+1 урон б.боя', mods: { 'Ближний бой (Мощь)': 1 } },
  { t: 's', label: '+1 Атлетика', mods: { Атлетика: 1 } },
  { t: 'n', label: 'Кровавая жажда', desc: 'Убил врага -> доп. атака в этот ход.' },
  { t: 'k', label: 'Неистовство', desc: 'Куб Стиля всегда чётный (нет факапов), но не взрывается.' },
]);
addRoad('sch_ranged', 560, 440, 'dexterity', [
  { t: 's', label: '+1 Дальний бой', mods: { 'Дальний бой': 1 } },
  { t: 's', label: '+1 Внимание', mods: { Внимание: 1 } },
  { t: 'n', label: 'Град стрел', desc: 'Шквал бьёт +1 цель.' },
  { t: 'k', label: 'В упор', desc: '+2 кость урона вблизи, -1 на дальней дистанции.' },
]);
addRoad('sch_divine', -420, 560, 'wisdom', [
  { t: 's', label: '+1 к лечению', mods: { Медицина: 1 } },
  { t: 's', label: '+1 Проницательность', mods: { Проницательность: 1 } },
  { t: 'n', label: 'Свет надежды', desc: 'Лечение задевает 2 союзников.' },
  { t: 'k', label: 'Обет исцеления', desc: 'Лечение мгновенно и вдвое, но сам не лечишься в отдых.' },
]);
addRoad('sch_toughness', 300, -560, 'strength', [
  { t: 's', label: '+1 раны', mods: { Ранения: 1 } },
  { t: 's', label: '+1 Выживание', mods: { Выживание: 1 } },
  { t: 'n', label: 'Крепкий орешек', desc: '+1 к максимуму Ран.' },
  { t: 'k', label: 'Несокрушимый', desc: 'Раз за бой игнорируй Рану, но макс Вдохновение -1.' },
]);
addRoad('sch_stealth', 420, 540, 'dexterity', [
  { t: 's', label: '+1 Скрытность', mods: { Скрытность: 1 } },
  { t: 's', label: '+1 Ловкость рук', mods: { 'Ловкость рук': 1 } },
  { t: 'n', label: 'Мокрое дело', desc: 'Первый удар по не заметившему = крит.' },
  { t: 'k', label: 'Тень', desc: 'Невидим, пока не атаковал; выход даёт 1 бесплатный Сигил.' },
]);
addRoad('sch_viet', 180, -420, 'strength', [
  { t: 's', label: '+1 Ближний бой', mods: { 'Ближний бой (Мощь)': 1 } },
  { t: 's', label: '+1 Уклонение', mods: { Уклонение: 1 } },
  { t: 'n', label: 'Смена стойки', desc: 'Раз за раунд меняй стойку без траты действия.' },
  { t: 'k', label: 'Поток Виэт', desc: 'После парирования — контратака без усталости (1/бой).' },
]);
addRoad('sch_cybernetics', 180, 420, 'dexterity', [
  { t: 's', label: '+1 Импланты', mods: { Импланты: 1 } },
  { t: 's', label: '+1 ЭлектроМех', mods: { ЭлектроМех: 1 } },
  { t: 'n', label: 'Тепловизор', desc: 'Фокус: видишь тепло сквозь дым и лёгкие укрытия.' },
  { t: 'k', label: 'Полный разгон', desc: 'Раз за бой удвой шаг и 2 быстрые атаки; после — усталость 3.' },
]);

// Рёбра выводим автоматически из parentIds
const edges: SkillEdge[] = [];
for (const n of nodes) {
  const parents = n.requirements?.parentIds ?? [];
  for (const p of parents) edges.push({ from: p, to: n.id });
}
// Специализации крепим к центру явно (у них parentIds = center_start уже задан выше,
// цикл их учтёт). Секрет/черты цепочки тоже учтены через parentIds.

export const initialSkillTree: SkillTreeData = { nodes, edges };
