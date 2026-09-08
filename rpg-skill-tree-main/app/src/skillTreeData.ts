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
  opt('Лечение', 'Восстанавливает хиты цели.'),
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
  id, x, y, label, zone, category: 'transit_specialized', cost: { type: 'transit', amount: 1 },
  requirements: { parentIds: [parent], requiredSpecialization: { zone, level: 3 } }, description: desc,
  choices: [
    { id: 'aspect', title: 'Выбери аспект', pick: 1, options: aspects },
    { id: 'sigils', title: 'Выбери 2 сигила', pick: 2, options: SIGIL_OPTIONS },
  ],
});

const nodes: SkillNode[] = [
  // ── Центр + общие навыки ─────────────────────────────────
  { id: 'center_start', x: 0, y: 0, label: 'Центр', zone: 'center', category: 'root', cost: { type: 'transit', amount: 0 }, description: 'Исток персонажа (1 уровень после выбора расы). От него — 4 Дара и общие навыки.' },
  { id: 'g_will', x: 0, y: -190, label: 'Воля', zone: 'center', category: 'transit_general', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['center_start'] }, statModifiers: { Интуиция: 1 }, description: 'Общий. +1 к спасброскам воли/Интуиции.' },
  { id: 'g_grit', x: 190, y: 0, label: 'Закалка', zone: 'center', category: 'transit_general', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['center_start'] }, statModifiers: { Порог: 1 }, description: 'Общий. +1 к Порогу ранений.' },
  { id: 'g_swift', x: 0, y: 190, label: 'Проворство', zone: 'center', category: 'transit_general', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['center_start'] }, statModifiers: { Шаг: 1 }, description: 'Общий. +1 к Шагу.' },
  { id: 'g_lore', x: -190, y: 0, label: 'Эрудиция', zone: 'center', category: 'transit_general', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['center_start'] }, statModifiers: { 'Поиск Информации': 1 }, description: 'Общий. +1 к Поиску информации.' },

  // ════════ ДАР МЕДВЕДЯ — МАГИЯ / РАЗУМ (синий) ════════════
  { id: 'spec_magic', x: -340, y: -340, label: 'Дар Медведя', zone: 'magic', category: 'specialization', cost: { type: 'OR', amount: 2 }, level: 0, maxLevel: 10, requirements: { parentIds: ['center_start'] }, description: 'Магия (Разум). Открывает Квель и школы. До 10 за ОУ.' },

  // Волшебство + суб-типы
  { ...school('sch_wizardry', -520, -300, 'Волшебство', 'magic', 'Академическая магия (Разум). База маг-профессий.'), requirements: { parentIds: ['spec_magic'], requiredSpecialization: { zone: 'magic', level: 1 } } },
  { id: 'ts_concentration', x: -500, y: -180, label: 'Концентрация', zone: 'magic', category: 'transit_specialized', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['sch_wizardry'], requiredSpecialization: { zone: 'magic', level: 2 } }, statModifiers: { 'Лимит ОС': 1 }, description: '+1 к лимиту ОС.' },
  { id: 'feat_spellpower', x: -620, y: -140, label: 'Сила заклинаний', zone: 'magic', category: 'feat', cost: { type: 'transit', amount: 2 }, requirements: { parentIds: ['ts_concentration'], requiredSpecialization: { zone: 'magic', level: 3 } }, description: 'Черта. Раз за бой игнорируй ограничение геометрии каскада.' },
  { id: 'secret_truename', x: -740, y: -180, label: 'Истинное Имя', zone: 'magic', category: 'transit_specialized', cost: { type: 'transit', amount: 2 }, isSecret: true, secretHint: 'Требуется 5 ур. Дара Медведя и Концентрация.', requirements: { parentIds: ['ts_concentration'], requiredSpecialization: { zone: 'magic', level: 5 } }, statModifiers: { 'Лимит ОС': 2 }, description: 'Секрет. Раз за бой игнорируй беклеш.' },
  prof('st_necromancer', -700, -320, 'Некромант', 'magic', 'sch_wizardry', 'Суб-тип Волшебства: смерть, нежить, истощение.'),
  prof('st_bloodmage', -720, -400, 'Кровавый маг', 'magic', 'sch_wizardry', 'Суб-тип: питает Квель здоровьем, больше ОС ценой ран.'),
  prof('st_chronomancer', -620, -460, 'Хрономант', 'magic', 'sch_wizardry', 'Суб-тип: время — замедление/ускорение, доп. действия.'),
  prof('st_illusionist', -540, -440, 'Иллюзионист', 'magic', 'sch_wizardry', 'Суб-тип: обман чувств, ослепление, невидимость.'),
  prof('st_geomancer', -820, -360, 'Геомант', 'magic', 'sch_wizardry', 'Суб-тип: земля/камень, зоны, укрепления.'),

  // Мистика
  { ...school('sch_mysticism', -360, -520, 'Мистика', 'magic', 'Тонкие энергии, прорицание (Разум).'), requirements: { parentIds: ['spec_magic'], requiredSpecialization: { zone: 'magic', level: 1 } } },
  { id: 'ts_divination', x: -460, y: -620, label: 'Прорицание', zone: 'magic', category: 'transit_specialized', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['sch_mysticism'], requiredSpecialization: { zone: 'magic', level: 2 } }, statModifiers: { Мистика: 1 }, description: '+1 к Мистике. Чтение потоков Махтерии.' },
  prof('st_mystic', -300, -640, 'Мистик', 'magic', 'sch_mysticism', 'Суб-тип: психический/силовой урон в обход брони.', ASPECTS_MYSTIC),

  // Волшебный ремесленник
  { ...school('sch_craft', -560, -560, 'Волшебный ремесленник', 'magic', 'Предметная магия (Разум). Замена «Алхимии».'), requirements: { parentIds: ['spec_magic'], requiredSpecialization: { zone: 'magic', level: 1 } } },
  prof('st_alchemist', -740, -540, 'Алхимик', 'magic', 'sch_craft', 'Суб-тип: зелья-сигилы, сильные холодные заготовки.'),
  prof('st_enchanter', -720, -620, 'Зачарователь', 'magic', 'sch_craft', 'Суб-тип: наложение аспектов/эффектов на предметы.'),
  prof('st_artificer', -600, -680, 'Артефактор', 'magic', 'sch_craft', 'Суб-тип: создание артефактов и механо-магии.'),

  // ════════ ДАР ЗЮБАНИЯ — СИЛА (красный) ═══════════════════
  { id: 'spec_strength', x: 340, y: -340, label: 'Дар Зюбания', zone: 'strength', category: 'specialization', cost: { type: 'OR', amount: 2 }, level: 0, maxLevel: 10, requirements: { parentIds: ['center_start'] }, description: 'Ближний бой. Боевые Формы (Квель воина). До 10 за ОУ.' },
  { ...school('sch_berserk', 520, -300, 'Берсерк', 'strength', 'Форма Ярости: урон ценой защиты.'), requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'strength', level: 1 } } },
  { id: 'ts_rage', x: 680, y: -260, label: 'Ярость', zone: 'strength', category: 'transit_specialized', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['sch_berserk'], requiredSpecialization: { zone: 'strength', level: 2 } }, statModifiers: { 'Ближний бой (Мощь)': 1 }, description: '+1 к урону ближнего боя; -1 КБ в стойке.' },
  { ...school('sch_awaken', 560, -440, 'Высвобождение', 'strength', 'Форма Пробуждения: лимит ОС растёт в бою.'), requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'strength', level: 2 } } },
  { id: 'feat_awaken', x: 720, y: -460, label: 'Пробуждение', zone: 'strength', category: 'feat', cost: { type: 'transit', amount: 2 }, requirements: { parentIds: ['sch_awaken'], requiredSpecialization: { zone: 'strength', level: 4 } }, description: 'Черта. Лимит ОС +1 в начале каждого твоего хода (разгон).' },
  { ...school('sch_smith', 420, -520, 'Кузнечное дело', 'strength', 'Рунщик: руны = холодные сигилы, зачарование оружия.'), requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'strength', level: 1 } } },
  { id: 'ts_runeforge', x: 520, y: -640, label: 'Рунная ковка', zone: 'strength', category: 'transit_specialized', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['sch_smith'], requiredSpecialization: { zone: 'strength', level: 2 } }, statModifiers: { Ремесло: 1 }, description: 'Наноси руну (холодный сигил) на снаряжение.' },
  { ...school('sch_toughness', 300, -560, 'Стойкость', 'strength', 'Живучесть: порог ран, кости здоровья.'), requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'strength', level: 1 } } },
  { id: 'ts_toughskin', x: 340, y: -700, label: 'Толстая кожа', zone: 'strength', category: 'transit_specialized', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['sch_toughness'], requiredSpecialization: { zone: 'strength', level: 2 } }, statModifiers: { Порог: 2 }, description: '+2 к Порогу ранений.' },
  { id: 'ts_multihit', x: 200, y: -640, label: 'Второе дыхание', zone: 'strength', category: 'transit_specialized', cost: { type: 'transit', amount: 2 }, requirements: { parentIds: ['sch_toughness'], requiredSpecialization: { zone: 'strength', level: 4 } }, description: '+1 к максимуму Ран (вторая кость здоровья).' },
  { id: 'feat_battlemage', x: 0, y: -520, label: 'Боевой маг', zone: 'strength', category: 'feat', cost: { type: 'transit', amount: 2 }, requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'magic', level: 2 } }, description: 'Черта. Требует Дар Зюбания + 2 ур. Дара Медведя. Аспект на оружие/пули.' },

  // ════════ ДАР ЗМЕЯ — ЛОВКОСТЬ (зелёный) ══════════════════
  { id: 'spec_dexterity', x: 340, y: 340, label: 'Дар Змея', zone: 'dexterity', category: 'specialization', cost: { type: 'OR', amount: 2 }, level: 0, maxLevel: 10, requirements: { parentIds: ['center_start'] }, description: 'Ловкость. Дальний бой, дуэль, скрытность, Перо. До 10 за ОУ.' },
  { ...school('sch_duel', 520, 300, 'Дуэль', 'dexterity', 'Форма Клинка: реакции, парирование.'), requirements: { parentIds: ['spec_dexterity'], requiredSpecialization: { zone: 'dexterity', level: 1 } } },
  { id: 'ts_parry', x: 680, y: 260, label: 'Парирование', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['sch_duel'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, description: 'Реакция: ответная атака на промах врага.' },
  { ...school('sch_ranged', 560, 440, 'Стрельба', 'dexterity', 'Форма Прицела: дальность, точность.'), requirements: { parentIds: ['spec_dexterity'], requiredSpecialization: { zone: 'dexterity', level: 1 } } },
  { id: 'ts_precshot', x: 720, y: 420, label: 'Точный выстрел', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['sch_ranged'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, statModifiers: { 'Дальний бой': 1 }, description: '+1 к Дальнему бою; игнор половины укрытия.' },
  { id: 'ts_volley', x: 700, y: 520, label: 'Шквал', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'transit', amount: 2 }, requirements: { parentIds: ['sch_ranged'], requiredSpecialization: { zone: 'dexterity', level: 4 } }, description: 'Три снаряда по разным целям со штрафом.' },
  { ...school('sch_stealth', 420, 540, 'Скрытность', 'dexterity', 'Путь тени: невидимость, первый удар.'), requirements: { parentIds: ['spec_dexterity'], requiredSpecialization: { zone: 'dexterity', level: 1 } } },
  { id: 'ts_shadowstrike', x: 560, y: 620, label: 'Удар из тени', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['sch_stealth'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, statModifiers: { Скрытность: 1 }, description: '+1 к Скрытности; урон из невидимости с преимуществом.' },
  { ...school('sch_acrobatics', 300, 560, 'Акробатика', 'dexterity', 'Подвижность, уклонение, инициатива.'), requirements: { parentIds: ['spec_dexterity'], requiredSpecialization: { zone: 'dexterity', level: 1 } } },
  { id: 'ts_evasion', x: 340, y: 700, label: 'Уклонение', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['sch_acrobatics'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, statModifiers: { КБ: 1 }, description: '+1 к КБ.' },
  // Перо + суб-типы
  { ...school('sch_pero', 540, 600, 'Перо', 'dexterity', 'Мастерство знаков и образов (Моторика).'), requirements: { parentIds: ['spec_dexterity'], requiredSpecialization: { zone: 'dexterity', level: 1 } } },
  prof('st_scribe', 700, 600, 'Печатник Туо', 'dexterity', 'sch_pero', 'Суб-тип: печати Туо — быстрое черчение боевых знаков.'),
  prof('st_runescribe', 720, 680, 'Рунописец', 'dexterity', 'sch_pero', 'Суб-тип: руны-ловушки и отложенные эффекты.'),
  prof('st_artist', 600, 720, 'Художник', 'dexterity', 'sch_pero', 'Суб-тип: живые образы, иллюзии через рисунок.'),

  // ════════ ДАР ГОЛУБЯ — МУДРОСТЬ / СТЕРЖЕНЬ (янтарный) ═════
  { id: 'spec_wisdom', x: -340, y: 340, label: 'Дар Голубя', zone: 'wisdom', category: 'specialization', cost: { type: 'OR', amount: 2 }, level: 0, maxLevel: 10, requirements: { parentIds: ['center_start'] }, description: 'Мудрость (Стержень). Влияние, воля, интуитивная/звериная магия. До 10 за ОУ.' },
  // Колдовство + суб-типы
  { ...school('sch_witchcraft', -520, 300, 'Колдовство', 'wisdom', 'Интуитивная магия (Стержень).'), requirements: { parentIds: ['spec_wisdom'], requiredSpecialization: { zone: 'wisdom', level: 1 } } },
  { id: 'ts_pact', x: -680, y: 260, label: 'Пакт', zone: 'wisdom', category: 'transit_specialized', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['sch_witchcraft'], requiredSpecialization: { zone: 'wisdom', level: 2 } }, statModifiers: { Колдовство: 1 }, description: '+1 к Колдовству; дешёвая заморозка холодных.' },
  prof('st_warlock', -700, 340, 'Колдун', 'wisdom', 'sch_witchcraft', 'Суб-тип: канал покровителя, узкий домен, дешёвая заморозка.'),
  prof('st_sorcerer', -720, 420, 'Чародей', 'wisdom', 'sch_witchcraft', 'Суб-тип: мгновенный живой каст, мало холодных.'),
  prof('st_pactmaker', -640, 180, 'Пактер', 'wisdom', 'sch_witchcraft', 'Суб-тип: сделки с сущностями за силу.'),
  prof('st_summoner', -800, 300, 'Призыватель', 'wisdom', 'sch_witchcraft', 'Суб-тип: вызов существ-союзников.'),
  // Псионика
  { ...school('sch_psionics', -540, 460, 'Псионика', 'wisdom', 'Ментальный контур (Стержень).'), requirements: { parentIds: ['spec_wisdom'], requiredSpecialization: { zone: 'wisdom', level: 1 } } },
  { id: 'ts_psiblade', x: -700, y: 480, label: 'Психоклинок', zone: 'wisdom', category: 'transit_specialized', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['sch_psionics'], requiredSpecialization: { zone: 'wisdom', level: 2 } }, statModifiers: { Псионика: 1 }, description: '+1 к Псионике; урон в обход брони (спасбросок Разума).' },
  // Божественное / Звериная
  { ...school('sch_divine', -420, 560, 'Божественное', 'wisdom', 'Звериная/божественная магия: духи, звери, вера.'), requirements: { parentIds: ['spec_wisdom'], requiredSpecialization: { zone: 'wisdom', level: 1 } } },
  prof('st_shaman', -560, 620, 'Шаман', 'wisdom', 'sch_divine', 'Суб-тип: духи, тотемы, стихийная связь.', ASPECTS_DIVINE),
  prof('st_druid', -600, 680, 'Друид', 'wisdom', 'sch_divine', 'Суб-тип: природа, облик зверя, превращения.', ASPECTS_DIVINE),
  prof('st_priest', -500, 720, 'Жрец', 'wisdom', 'sch_divine', 'Суб-тип: лечение, баффы, ауры.', ASPECTS_DIVINE),
  prof('st_paladin', -380, 700, 'Паладин', 'wisdom', 'sch_divine', 'Суб-тип: боевая вера, защита союзников.', ASPECTS_DIVINE),
  // Лидерство
  { ...school('sch_leader', -280, 560, 'Лидерство', 'wisdom', 'Влияние, командование, вдохновение.'), requirements: { parentIds: ['spec_wisdom'], requiredSpecialization: { zone: 'wisdom', level: 1 } } },
  { id: 'ts_command', x: -300, y: 700, label: 'Командование', zone: 'wisdom', category: 'transit_specialized', cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['sch_leader'], requiredSpecialization: { zone: 'wisdom', level: 2 } }, statModifiers: { Лидерство: 1 }, description: '+1 к Лидерству; союзник смещается на 2 клетки вне хода.' },

  // ── Слоты ЧЕРТ (слева): 1 покупка за 4 уровня, попап выбора черты ──
  ...['feat_slot_1', 'feat_slot_2', 'feat_slot_3'].map((id, i): SkillNode => ({
    id, x: -1080, y: -160 + i * 160, label: 'Черта', zone: 'center', category: 'feat_slot',
    cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['center_start'] },
    description: 'Слот Черты. Доступен раз в 4 уровня. Открывает выбор черты.',
    choices: [{
      id: 'feat', title: 'Выбери черту', pick: 1, options: [
        opt('Толстая кожа', '+1 к Порогу ранений'),
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
    cost: { type: 'transit', amount: 1 }, requirements: { parentIds: ['center_start'] },
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
      cost: { type: 'transit', amount: st.t === 'k' ? 2 : 1 },
      requirements: { parentIds: [prev], requiredSpecialization: { zone, level: reqLevel } },
      statModifiers: st.mods,
      description: (st.t === 'k' ? 'Кейстоун. ' : st.t === 'n' ? 'Ноутейбл. ' : '') + (st.desc ?? ''),
    });
    prev = id;
  });
}

addRoad('sch_wizardry', -520, -300, 'magic', [
  { t: 's', label: '+1 Волшебство', mods: { Волшебство: 1 } },
  { t: 's', label: '+1 Лимит ОС', mods: { 'Лимит ОС': 1 } },
  { t: 'n', label: 'Эхо заклинания', desc: 'Раз в ход повтори последний Сигил урона за -1 ОС.' },
  { t: 'k', label: 'Разум как броня', desc: 'Порог тратится как ОС, но урон бьёт по ОС раньше хитов.' },
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
  { t: 's', label: '+1 Порог', mods: { Порог: 1 } },
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

// Рёбра выводим автоматически из parentIds (плюс явные для центра/специализаций).
const edges: SkillEdge[] = [];
for (const n of nodes) {
  const parents = n.requirements?.parentIds ?? [];
  for (const p of parents) edges.push({ from: p, to: n.id });
}
// Специализации крепим к центру явно (у них parentIds = center_start уже задан выше,
// цикл их учтёт). Секрет/черты цепочки тоже учтены через parentIds.

export const initialSkillTree: SkillTreeData = { nodes, edges };
