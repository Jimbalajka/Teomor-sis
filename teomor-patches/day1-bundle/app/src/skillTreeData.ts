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

const CHOICE = '⚔ Выбор: нельзя взять другой вариант этой развилки. ';

const prof = (
  id: string, x: number, y: number, label: string, zone: SkillNode['zone'],
  parent: string, desc: string, aspects = ASPECTS_ELEMENTAL,
): SkillNode => ({
  id, x, y, label, zone, category: 'transit_specialized', cost: { type: 'OR', amount: 1 },
  exclusiveGroup: `prof_${parent}`,
  requirements: { parentIds: [parent], requiredSpecialization: { zone, level: 3 } },
  description: `${CHOICE}Суб-класс (один на школу). ${desc}`,
  choices: [
    { id: 'aspect', title: 'Выбери аспект', pick: 1, options: aspects },
    { id: 'sigils', title: 'Выбери 2 сигила', pick: 2, options: SIGIL_OPTIONS },
  ],
});

const fork = (
  id: string, x: number, y: number, label: string, zone: SkillNode['zone'],
  parent: string, group: string, desc: string, cost = 2,
  mods?: Record<string, number>,
): SkillNode => ({
  id, x, y, label, zone, category: 'feat', cost: { type: 'OR', amount: cost },
  exclusiveGroup: group,
  requirements: { parentIds: [parent], requiredSpecialization: { zone, level: 4 } },
  statModifiers: mods,
  description: `${CHOICE}${desc}`,
});

const nodes: SkillNode[] = [
  // ── Центр + общие навыки ─────────────────────────────────
  { id: 'center_start', x: 0, y: 0, label: 'Центр', zone: 'center', category: 'root', cost: { type: 'OR', amount: 0 }, description: 'Исток персонажа (1 уровень после выбора расы). От него — 4 Дара и общие навыки.' },
  { id: 'g_will', x: -95, y: -175, label: 'Воля', zone: 'center', category: 'transit_general', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['center_start'] }, statModifiers: { Интуиция: 1 }, description: 'Общий. +1 к спасброскам воли/Интуиции.' },
  { id: 'g_grit', x: 190, y: 0, label: 'Закалка', zone: 'center', category: 'transit_general', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['center_start'] }, statModifiers: { Ранения: 1 }, description: 'Общий. +1 к макс. ранам.' },
  { id: 'g_swift', x: 0, y: 190, label: 'Проворство', zone: 'center', category: 'transit_general', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['center_start'] }, statModifiers: { Шаг: 1 }, description: 'Общий. +1 к Шагу.' },
  { id: 'g_lore', x: -190, y: 0, label: 'Эрудиция', zone: 'center', category: 'transit_general', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['center_start'] }, statModifiers: { 'Поиск Информации': 1 }, description: 'Общий. +1 к Поиску информации.' },
  { id: 'g_hub', x: 0, y: -95, label: 'Фундамент', zone: 'center', category: 'transit_general', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['center_start'] }, description: 'Общая ветка. Универсальные бонусы для любого билда.' },
  { id: 'g_path_body', x: 130, y: -150, label: 'Путь Тела', zone: 'center', category: 'transit_general', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'general_path', requirements: { parentIds: ['g_hub'] }, statModifiers: { Ранения: 1, Атлетика: 1 }, description: '⚔ Выбор пути. Выносливость и атлетика. Альтернатива: Разум, Мастер.' },
  { id: 'g_path_mind', x: -130, y: -150, label: 'Путь Разума', zone: 'center', category: 'transit_general', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'general_path', requirements: { parentIds: ['g_hub'] }, statModifiers: { 'Поиск Информации': 1, Проницательность: 1 }, description: '⚔ Выбор пути. Эрудиция (как у волшебника D&D). Альтернатива: Тело, Мастер.' },
  { id: 'g_path_master', x: 0, y: -280, label: 'Путь Мастера', zone: 'center', category: 'transit_general', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'general_path', requirements: { parentIds: ['g_hub'] }, statModifiers: { Ремесло: 1, Шаг: 1 }, description: '⚔ Выбор пути. Универсальное ремесло и мобильность (PoE: travel nodes).' },
  { id: 'g_resolve', x: 130, y: 130, label: 'Решимость', zone: 'center', category: 'transit_general', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['center_start'] }, statModifiers: { Стержень: 1 }, description: 'Общий. +1 Стержень — спасброски воли.' },
  { id: 'g_alert', x: -130, y: 130, label: 'Бдительность', zone: 'center', category: 'transit_general', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['center_start'] }, statModifiers: { Внимание: 1 }, description: 'Общий. +1 Внимание — инициатива и поиск.' },
  { id: 'g_second_wind', x: 0, y: 220, label: 'Второе дыхание', zone: 'center', category: 'transit_general', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['g_grit', 'g_swift'] }, description: 'Общий (2 родителя). Раз/отдых сними 2 усталости без магии.' },


  // ════════ ДАР МЕДВЕДЯ — МАГИЯ / РАЗУМ (синий) ════════════
  { id: 'spec_magic', x: -340, y: -340, label: 'Дар Медведя', zone: 'magic', category: 'specialization', cost: { type: 'OR', amount: 2 }, level: 0, maxLevel: 10, requirements: { parentIds: ['center_start'] }, description: 'Магия (Разум). Открывает Квель и школы. До 10 за ОР.' },

  // Волшебство + суб-типы
  { ...school('sch_wizardry', -520, -300, 'Волшебство', 'magic', 'Академическая магия (Разум). База маг-профессий.'), requirements: { parentIds: ['spec_magic'], requiredSpecialization: { zone: 'magic', level: 1 } } },
  { id: 'ts_concentration', x: -500, y: -180, label: 'Концентрация', zone: 'magic', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_wizardry'], requiredSpecialization: { zone: 'magic', level: 2 } }, statModifiers: { Усталость: 1 }, description: '+1 к макс. усталости.' },
  { id: 'feat_arcane_recovery', x: -540, y: -120, label: 'Восстановление маны', zone: 'magic', category: 'feat', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['ts_concentration'], requiredSpecialization: { zone: 'magic', level: 3 } }, description: 'D&D Arcane Recovery. Короткий отдых: сбрось 2 усталости (1×/день).' },
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
  { id: 'feat_portent', x: -520, y: -680, label: 'Предзнаменование', zone: 'magic', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['ts_divination'], requiredSpecialization: { zone: 'magic', level: 3 } }, description: 'D&D Portent. 2×/день подмени d20 союзника или врага на заготовленное значение.' },
  prof('st_mystic', -300, -640, 'Мистик', 'magic', 'sch_mysticism', 'Суб-тип: психический/силовой урон в обход брони.', ASPECTS_MYSTIC),

  // Волшебный ремесленник
  { ...school('sch_craft', -560, -560, 'Волшебный ремесленник', 'magic', 'Предметная магия (Разум). Замена «Алхимии».'), requirements: { parentIds: ['spec_magic'], requiredSpecialization: { zone: 'magic', level: 1 } } },
  prof('st_alchemist', -740, -540, 'Алхимик', 'magic', 'sch_craft', 'Суб-тип: зелья-сигилы, сильные холодные заготовки.'),
  prof('st_enchanter', -720, -620, 'Зачарователь', 'magic', 'sch_craft', 'Суб-тип: наложение аспектов/эффектов на предметы.'),
  prof('st_artificer', -600, -680, 'Артефактор', 'magic', 'sch_craft', 'Суб-тип: создание артефактов и механо-магии.'),

  // ── Волшебство: плюсы/минусы ──
  { id: 'ts_warding', x: -420, y: -240, label: 'Обереги', zone: 'magic', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'wiz_style', requirements: { parentIds: ['sch_wizardry'], requiredSpecialization: { zone: 'magic', level: 2 } }, statModifiers: { КБ: 1 }, description: '⚔ Выбор стиля (D&D: Школа Огражения). +1 КБ; −1 дальность Сигилов.' },
  { id: 'ts_overchannel', x: -580, y: -200, label: 'Перегрузка', zone: 'magic', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'wiz_style', requirements: { parentIds: ['ts_concentration'], requiredSpecialization: { zone: 'magic', level: 3 } }, statModifiers: { Волшебство: 1, Усталость: 1 }, description: '⚔ Выбор стиля (D&D: Школа Воплощения). +1 Волшебство; +1 усталость за мощный каст.' },
  fork('feat_evoker', -660, -260, 'Пламя и гром', 'magic', 'ts_overchannel', 'fork_wiz_school', 'D&D Evoker. Элементальные Sигилы без подготовки.', 2),
  fork('feat_abjurer', -500, -280, 'Магический страж', 'magic', 'ts_warding', 'fork_wiz_school', 'D&D Abjurer Ward. Раз/бой поглощай 1 рану щитом (+2 усталости).', 2),
  fork('feat_necrotic', -820, -280, 'Касание смерти', 'magic', 'st_necromancer', 'fork_necro', 'Некромант: касание = 1 рана; лечишь половину нанесённого.', 1),
  fork('feat_grim_harvest', -900, -320, 'Жатва могил', 'magic', 'st_necromancer', 'fork_necro', 'D&D Grim Harvest. Убил существо заклинанием — +1 усталость или сними 1 рану.', 2),
  fork('feat_blood_price', -760, -460, 'Цена крови', 'magic', 'st_bloodmage', 'fork_blood', 'Трать раны вместо усталости (1 рана = 2 усталости каста).', 2),
  fork('feat_crimson_ward', -840, -420, 'Багряный щит', 'magic', 'st_bloodmage', 'fork_blood', 'Кровь → барьер: +2 КБ на 1 раунд, ценой 1 раны.', 1),
  fork('feat_time_dilation', -680, -500, 'Замедление', 'magic', 'st_chronomancer', 'fork_chrono', 'D&D Slow. Зона 3×3: цели −1 Шаг (спасбросок).', 2),
  fork('feat_haste_self', -580, -520, 'Ускорение', 'magic', 'st_chronomancer', 'fork_chrono', 'D&D Haste. На себя: +1 быстрая атака/раунд; после — усталость 2.', 2),
  fork('feat_phantasm', -560, -480, 'Фантомная боль', 'magic', 'st_illusionist', 'fork_illus', 'D&D Phantasmal Killer. Иллюзия = 1 рана при провале воли.', 2),
  fork('feat_invis_weave', -480, -500, 'Плетение тени', 'magic', 'st_illusionist', 'fork_illus', 'D&D Greater Invisibility. Невидим до атаки; первый Sигил −1 усталость.', 1),
  fork('feat_stone_aegis', -880, -400, 'Каменная кожа', 'magic', 'st_geomancer', 'fork_geo', 'D&D Stoneskin. +1 броня; −1 Шаг.', 1),
  fork('feat_fissure', -920, -340, 'Разлом', 'magic', 'st_geomancer', 'fork_geo', 'Линия 4 клетки: урон + препятствие (1 раунд).', 2),

  // ── Мистика: контроль vs урон ──
  { id: 'ts_mindshield', x: -400, y: -680, label: 'Щит разума', zone: 'magic', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['ts_divination'], requiredSpecialization: { zone: 'magic', level: 3 } }, statModifiers: { Стержень: 1 }, description: 'Плюс: спасброски vs контроля. Минус: псионический урон −1 кость.' },
  fork('feat_psychic_lance', -320, -760, 'Пси-копьё', 'magic', 'st_mystic', 'fork_mystic', 'Дальняя атака разумом, игнор брони; после — +1 усталость.', 2),
  fork('feat_telekinetic', -380, -820, 'Телекинез', 'magic', 'st_mystic', 'fork_mystic', 'D&D Mage Hand+. Толкни цель на 2 клетки; усталость 1.', 1),
  { id: 'ts_void_glimpse', x: -500, y: -720, label: 'Взгляд в пустоту', zone: 'magic', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_mysticism'], requiredSpecialization: { zone: 'magic', level: 3 } }, description: 'Плюс: видишь невидимое 1 раунд. Минус: −1 КБ до конца хода после.' },

  // ── Ремесленник: предметы vs скорость ──
  { id: 'ts_infusion', x: -640, y: -620, label: 'Влив силы', zone: 'magic', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_craft'], requiredSpecialization: { zone: 'magic', level: 2 } }, statModifiers: { Ремесло: 1 }, description: 'Заряжай предметы заранее; импровизация +1 усталость.' },
  fork('feat_battle_alchemy', -780, -600, 'Боевой настой', 'magic', 'st_alchemist', 'fork_alch', 'Зелье = быстрая атака; без заготовки — помеха.', 1),
  fork('feat_elixir_master', -860, -640, 'Мастер эликсиров', 'magic', 'st_alchemist', 'fork_alch', 'D&D Transmutation. Зелья лечат 2 раны; боевые −1 кость.', 2),
  fork('feat_rune_weapon', -680, -700, 'Рунное оружие', 'magic', 'st_enchanter', 'fork_ench', 'Вложи Сигил в оружие (1/отдых).', 2),
  fork('feat_artifice_core', -760, -740, 'Ядро артефакта', 'magic', 'st_artificer', 'fork_artifice', 'PoE: item power. Артефакт +1 ранг; без него каст +2 усталость.', 2),
  fork('feat_gunsmith', -620, -760, 'Мех-маг', 'magic', 'st_artificer', 'fork_artifice', 'Огнестрел + Сигил в одном выстреле (1/бой).', 1),

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
  fork('feat_reckless', 780, -220, 'Безрассудство', 'strength', 'ts_rage', 'fork_berserk', 'PoE: Glass Cannon. +1 кость урона б.боя; −1 КБ.', 1),
  fork('feat_controlled_fury', 760, -320, 'Контроль ярости', 'strength', 'ts_rage', 'fork_berserk', 'D&D: Controlled rage. Ярость без штрафа КБ; урон без бонуса.', 1),
  { ...school('sch_awaken', 560, -440, 'Высвобождение', 'strength', 'Форма Пробуждения: усталость сбрасывается быстрее в бою.'), requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'strength', level: 2 } } },
  fork('feat_awaken_flow', 720, -460, 'Поток', 'strength', 'sch_awaken', 'fork_awaken', 'В начале хода сними 1 усталость (разгон).', 2),
  fork('feat_awaken_burst', 820, -500, 'Всплеск', 'strength', 'sch_awaken', 'fork_awaken', 'Раз/бой: +1 быстрая атака; после — +2 усталости.', 2),
  { ...school('sch_smith', 420, -520, 'Кузнечное дело', 'strength', 'Рунщик: руны = холодные сигилы, зачарование оружия.'), requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'strength', level: 1 } } },
  { id: 'ts_runeforge', x: 520, y: -640, label: 'Рунная ковка', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_smith'], requiredSpecialization: { zone: 'strength', level: 2 } }, statModifiers: { Ремесло: 1 }, description: 'Наноси руну (холодный сигил) на снаряжение.' },
  fork('feat_rune_blade', 620, -680, 'Клинок рун', 'strength', 'ts_runeforge', 'fork_smith', 'Руна на оружии: +1 рана при попадании (1/бой).', 2),
  fork('feat_rune_mail', 480, -720, 'Рунный доспех', 'strength', 'ts_runeforge', 'fork_smith', 'Руна на броне: +1 броня; −1 Шаг.', 1),
  { ...school('sch_toughness', 300, -560, 'Стойкость', 'strength', 'Живучесть: порог ран, кости здоровья.'), requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'strength', level: 1 } } },
  { id: 'ts_toughskin', x: 340, y: -700, label: 'Толстая кожа', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'tough_style', requirements: { parentIds: ['sch_toughness'], requiredSpecialization: { zone: 'strength', level: 2 } }, statModifiers: { Ранения: 2 }, description: '⚔ Выбор. +2 макс. ранам (PoE: life nodes).' },
  { id: 'ts_iron_will', x: 260, y: -760, label: 'Железная воля', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'tough_style', requirements: { parentIds: ['sch_toughness'], requiredSpecialization: { zone: 'strength', level: 2 } }, statModifiers: { Стержень: 1, Ранения: 1 }, description: '⚔ Выбор. +1 Стержень и +1 рана; меньше сырого HP.' },
  { id: 'ts_multihit', x: 200, y: -640, label: 'Второе дыхание', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['sch_toughness'], requiredSpecialization: { zone: 'strength', level: 4 } }, description: '+1 к максимуму Ран (вторая кость здоровья).' },
  { id: 'feat_battlemage', x: 0, y: -520, label: 'Боевой маг', zone: 'strength', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'magic', level: 2 } }, description: 'Черта. Требует Дар Зюбания + 2 ур. Дара Медведя. Аспект на оружие/пули.' },
  { id: 'feat_iron_blood', x: 400, y: -780, label: 'Железная кровь', zone: 'strength', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['ts_toughskin', 'ts_rage'], requiredSpecialization: { zone: 'strength', level: 5 } }, description: 'Стойкость + Берсерк. Раз/бой игнорируй 1 рану от физ. урона.' },

  // ════════ ВИЭТ — боевое искусство (Дар Зюбания) ═══════════
  { ...school('sch_viet', 180, -420, 'Виэт', 'strength', 'Боевое искусство: стойки, натиск, контроль дистанции.'), requirements: { parentIds: ['spec_strength'], requiredSpecialization: { zone: 'strength', level: 1 } } },
  { id: 'ts_viet_stance_def', x: 80, y: -520, label: 'Стойка Змеи', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'viet_stance', requirements: { parentIds: ['sch_viet'], requiredSpecialization: { zone: 'strength', level: 2 } }, description: '⚔ Выбор стойки. Оборона: +1 КБ; парирование с преимуществом.' },
  { id: 'ts_viet_stance_assault', x: 200, y: -560, label: 'Стойка Натиска', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'viet_stance', requirements: { parentIds: ['sch_viet'], requiredSpecialization: { zone: 'strength', level: 2 } }, description: '⚔ Выбор стойки. Атака: быстрая атака с преимуществом после рывка.' },
  { id: 'feat_viet_thunder', x: 300, y: -480, label: 'Громовой клинок', zone: 'strength', category: 'feat', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_viet'], requiredSpecialization: { zone: 'strength', level: 2 } }, description: 'Фокус: зарядить клинок. Быстрая атака +1 рана по металлическим целям.' },
  { id: 'feat_viet_charge', x: 280, y: -620, label: 'Натиск', zone: 'strength', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['ts_viet_stance_assault'], requiredSpecialization: { zone: 'strength', level: 3 } }, description: 'Приём (карта). Рывок + удар, усталость 2.' },
  { id: 'ts_viet_wounding', x: 100, y: -640, label: 'Ранящий стиль', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['ts_viet_stance_def'], requiredSpecialization: { zone: 'strength', level: 3 } }, description: 'Успешная быстрая атака — кровотечение (1 рана в начале хода цели, 1 раунд).' },
  { id: 'ts_viet_stance_trick', x: 160, y: -480, label: 'Обманная стойка', zone: 'strength', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'viet_stance', requirements: { parentIds: ['sch_viet'], requiredSpecialization: { zone: 'strength', level: 2 } }, description: '⚔ Выбор стойки. Враги атакуют с помехой; дуэльные трюки сильнее.' },
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
  { id: 'ts_cyb_analysis', x: 180, y: 520, label: 'Тактический анализ', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_cybernetics'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, statModifiers: { Анализ: 2 }, description: '+2 Анализ (сенсорный имплант).' },
  { id: 'ts_cyb_overclock', x: 120, y: 620, label: 'Разгон', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['ts_cyb_analysis'], requiredSpecialization: { zone: 'dexterity', level: 3 } }, description: 'Открывает приём «Ускорение» (карта).' },
  { id: 'ts_cyb_ordnance', x: 260, y: 640, label: 'Орудийный модуль', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['sch_cybernetics'], requiredSpecialization: { zone: 'dexterity', level: 3 } }, statModifiers: { 'Дальний бой': 1 }, description: 'Встроенное оружие. Карты: бомба, обстрел, деструкция.' },
  { id: 'ts_cyb_plating', x: 360, y: 680, label: 'Бронепластины', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['ts_cyb_ordnance'], requiredSpecialization: { zone: 'dexterity', level: 4 } }, statModifiers: { Броня: 1 }, description: '+1 к броне (встроенная). Суммируется с полем «Броня +» в Sidebar.' },
  { id: 'ts_cyb_ecm', x: 320, y: 720, label: 'РЭБ-модуль', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['feat_cyb_glitch'], requiredSpecialization: { zone: 'dexterity', level: 3 } }, statModifiers: { Уклонение: 1 }, description: '+1 Уклонение против дальнего огня и наведённых систем.' },
  { id: 'feat_cyb_optics', x: 440, y: 640, label: 'Оптический пакет', zone: 'dexterity', category: 'feat', cost: { type: 'OR', amount: 1 }, requirements: { parentIds: ['ts_cyb_analysis'], requiredSpecialization: { zone: 'dexterity', level: 3 } }, description: 'Фокус: тепловизор и «рентген» лёгких укрытий; скан с усталостью 1 на 1 раунд.' },

  // ── Зелёная: развилки школ ──
  fork('feat_riposte', 780, 220, 'Контрудар', 'dexterity', 'ts_parry', 'fork_duel', 'D&D Riposte. Промах врага → атака с преимуществом (+1 рана).', 2),
  fork('feat_feint', 820, 300, 'Финт', 'dexterity', 'ts_parry', 'fork_duel', 'PoE: deception. Следующая атака игнор 1 КБ; −1 КБ до конца хода.', 1),
  { id: 'ts_snap_shot', x: 640, y: 480, label: 'Мгновенный выстрел', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'ranged_style', requirements: { parentIds: ['sch_ranged'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, statModifiers: { 'Дальний бой': 1 }, description: '⚔ Выбор стиля (PoE: Point Blank). +1 урон вблизи; −1 на дальней.' },
  { id: 'ts_mark_target', x: 800, y: 460, label: 'Метка охотника', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'ranged_style', requirements: { parentIds: ['sch_ranged'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, statModifiers: { Внимание: 1 }, description: '⚔ Выбор стиля. Метка: +1 кость vs цель; без метки −1 к дальнему.' },
  fork('feat_sniper', 860, 540, 'Снайпер', 'dexterity', 'ts_volley', 'fork_ranged', 'D&D Sharpshooter-lite. Игнор укрытия; −1 усталость за выстрел.', 2),
  fork('feat_rapid_fire', 760, 580, 'Очередь', 'dexterity', 'ts_volley', 'fork_ranged', 'PoE: GMP. Шквал +1 цель; каждый снаряд −1 кость.', 1),
  fork('feat_assassinate', 640, 680, 'Убийство', 'dexterity', 'ts_shadowstrike', 'fork_stealth', 'D&D Assassinate. Из скрытности первая атака = 2 раны.', 2),
  fork('feat_smoke', 520, 720, 'Дымовая завеса', 'dexterity', 'ts_shadowstrike', 'fork_stealth', 'PoE: blind. Зона дыма: враги с помехой; ты −1 Скрытность вне дыма.', 1),
  { id: 'ts_dodge_roll', x: 420, y: 780, label: 'Кувырок', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'acro_style', requirements: { parentIds: ['sch_acrobatics'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, statModifiers: { Шаг: 1 }, description: '⚔ Выбор. +1 Шаг; −1 Уклонение (PoE: travel).' },
  { id: 'ts_cat_reflex', x: 280, y: 760, label: 'Кошачьи рефлексы', zone: 'dexterity', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'acro_style', requirements: { parentIds: ['sch_acrobatics'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, statModifiers: { Уклонение: 1 }, description: '⚔ Выбор. +1 Уклонение; −1 Шаг.' },
  fork('feat_tuo_seal', 820, 640, 'Печать Туо', 'dexterity', 'st_scribe', 'fork_pero', 'Мгновенная печать: Sигил без подготовки (+1 усталость).', 2),
  fork('feat_trap_rune', 800, 720, 'Рунная ловушка', 'dexterity', 'st_runescribe', 'fork_pero', 'PoE: trap. Отложенный Sигил на клетке (1/бой).', 2),
  fork('feat_living_sketch', 680, 780, 'Живой эскиз', 'dexterity', 'st_artist', 'fork_pero', 'D&D: Minor Illusion+. Иллюзия-прикрытие; −1 КБ пока рисуешь.', 1),
  { id: 'feat_cyb_cold', x: 60, y: 480, label: 'Хладнокровный', zone: 'dexterity', category: 'feat', cost: { type: 'OR', amount: 2 }, exclusiveGroup: 'cyber_path', requirements: { parentIds: ['sch_cybernetics'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, description: '⚔ Выбор протокола. Иммунитет к страху/очарованию; эмпатия −2.' },
  { id: 'feat_cyb_glitch', x: 300, y: 480, label: 'Сбой протокола', zone: 'dexterity', category: 'feat', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'cyber_path', requirements: { parentIds: ['sch_cybernetics'], requiredSpecialization: { zone: 'dexterity', level: 2 } }, description: '⚔ Выбор протокола. На «1» к6 — сбой импланта; +1 урон при успехе.' },
  fork('feat_cyb_nanites', 400, 560, 'Нанорой', 'dexterity', 'ts_cyb_overclock', 'fork_cyber_heal', 'Раз/отдых сними 1 рану; в бою +1 vs яд.', 2),
  fork('feat_cyb_adrenal', 200, 680, 'Адреналин', 'dexterity', 'ts_cyb_overclock', 'fork_cyber_heal', 'PoE: on low life. <50% ран: +1 Шаг; иначе усталость +1 за модуль.', 1),
  { id: 'feat_shadow_dancer', x: 480, y: 380, label: 'Танец теней', zone: 'dexterity', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['sch_stealth', 'sch_duel'], requiredSpecialization: { zone: 'dexterity', level: 4 } }, description: 'Скрытность + Дуэль. Из невидимости парирование без реакции (1/бой).' },

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
  { id: 'ts_inspire', x: -200, y: 780, label: 'Вдохновение', zone: 'wisdom', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'leader_style', requirements: { parentIds: ['sch_leader'], requiredSpecialization: { zone: 'wisdom', level: 2 } }, statModifiers: { Лидерство: 1 }, description: '⚔ Выбор стиля. Союзник +1к4 к броску (1/бой); ты не можешь командовать в тот же ход.' },
  fork('feat_wlk_eldritch', -980, 360, 'Мистический залп', 'wisdom', 'ts_wlk_occult', 'fork_warlock', 'D&D Eldritch Blast+. Луч бьёт 2 цели; −1 усталость на вторую.', 2),
  fork('feat_wlk_dark_ones', -900, 400, 'Дар тьмы', 'wisdom', 'feat_wlk_devils_sight', 'fork_warlock', 'D&D Dark One\'s Blessing. Убийство = +1 временная рана (до отдыха).', 1),
  fork('feat_sor_twinned', -1000, 480, 'Двойной каст', 'wisdom', 'feat_sor_metamagic', 'fork_sor_meta', 'D&D Twin Spell. Один фокус на 2 цели (+2 усталости).', 2),
  fork('feat_sor_quickened', -940, 520, 'Ускоренный каст', 'wisdom', 'feat_sor_metamagic', 'fork_sor_meta', 'D&D Quickened. Фокус как быстрая атака (+1 усталость).', 2),
  fork('feat_sor_wild', -860, 580, 'Дикая магия', 'wisdom', 'ts_sor_draconic', 'fork_sor_blood', 'D&D Wild Magic. На «6» к6 — случайный эффект (может помочь).', 1),
  fork('feat_sor_element', -780, 600, 'Стихийная душа', 'wisdom', 'ts_sor_draconic', 'fork_sor_blood', 'Сопротивление стихии аспекта; другие стихии +1 усталость.', 2),
  fork('feat_pact_bargain', -720, 140, 'Жёсткий пакт', 'wisdom', 'st_pactmaker', 'fork_pactmaker', 'Сделка: +2 Колдовство; 1 рана при каждом отдыхе.', 2),
  fork('feat_pact_trick', -580, 160, 'Хитрый пакт', 'wisdom', 'st_pactmaker', 'fork_pactmaker', 'Обман сущности: −1 усталость на пакт; провал — проклятие.', 1),
  fork('feat_summ_bond', -880, 260, 'Связь с призванным', 'wisdom', 'st_summoner', 'fork_summoner', 'D&D: summon shares HP. Союзник-элементаль +1 рана; ты −1 КБ.', 2),
  fork('feat_summ_horde', -920, 340, 'Рой мелочи', 'wisdom', 'st_summoner', 'fork_summoner', 'Много слабых призывов; каждый −1 кость урона.', 1),
  { id: 'ts_psi_shield', x: -620, y: 520, label: 'Ментальный щит', zone: 'wisdom', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'psi_style', requirements: { parentIds: ['sch_psionics'], requiredSpecialization: { zone: 'wisdom', level: 2 } }, statModifiers: { Стержень: 1 }, description: '⚔ Выбор. +1 vs контроля; псионический урон −1 кость.' },
  { id: 'ts_psi_burst', x: -760, y: 540, label: 'Пси-всплеск', zone: 'wisdom', category: 'transit_specialized', cost: { type: 'OR', amount: 1 }, exclusiveGroup: 'psi_style', requirements: { parentIds: ['sch_psionics'], requiredSpecialization: { zone: 'wisdom', level: 2 } }, statModifiers: { Псионика: 1 }, description: '⚔ Выбор. AoE псионика; после — +1 усталость.' },
  fork('feat_psi_dominate', -680, 600, 'Подчинение', 'wisdom', 'ts_psiblade', 'fork_psion', 'D&D Dominate. Контроль слабой цели (спас); 1/отдых.', 2),
  fork('feat_psi_teleport', -820, 620, 'Фазовый скачок', 'wisdom', 'ts_psiblade', 'fork_psion', 'PoE: blink. Телепорт 4 клетки; усталость 2.', 1),
  fork('feat_shaman_totem', -640, 680, 'Тотемный зов', 'wisdom', 'st_shaman', 'fork_divine', 'D&D Totem. Аура стихии 3×3; −1 социальный бонус в городе.', 1),
  fork('feat_druid_beast', -680, 740, 'Облик зверя', 'wisdom', 'st_druid', 'fork_divine', 'D&D Wild Shape-lite. +1 Шаг и +1 рана; не льёшь в доспехе.', 2),
  fork('feat_priest_heal', -540, 780, 'Массовое исцеление', 'wisdom', 'st_priest', 'fork_divine', 'D&D Mass Cure. 2 союзника −1 рана; ты +1 усталость.', 2),
  fork('feat_paladin_smite', -420, 760, 'Кара', 'wisdom', 'st_paladin', 'fork_divine', 'D&D Divine Smite. +1 рана б.боя; −1 усталость на не-нежить.', 1),
  fork('feat_leader_tact', -240, 820, 'Тактик', 'wisdom', 'ts_command', 'fork_leader', 'Союзник меняет инициативу с тобой (1/бой).', 1),
  fork('feat_leader_rally', -160, 860, 'Подъём', 'wisdom', 'ts_inspire', 'fork_leader', 'D&D Rally. Союзники в 6 кл. −1 усталость (1/отдых).', 2),
  { id: 'feat_witch_oracle', x: -400, y: 240, label: 'Ведьмин оракул', zone: 'wisdom', category: 'feat', cost: { type: 'OR', amount: 2 }, requirements: { parentIds: ['sch_witchcraft', 'sch_psionics'], requiredSpecialization: { zone: 'wisdom', level: 4 } }, description: 'Колдовство + Псионика. Пакт + пси-удар: один каст без усталости (1/бой).' },

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

function addRoadFork(
  parent: string, sx: number, sy: number, zone: SkillNode['zone'],
  steps: RoadStep[],
  forks: { idSuffix: string; label: string; desc: string; group: string }[],
) {
  const len = Math.hypot(sx, sy) || 1;
  const ux = sx / len, uy = sy / len;
  let prev = parent;
  steps.forEach((st, i) => {
    const id = `road_${parent}_${i}`;
    const x = Math.round(sx + ux * (380 + i * 220));
    const y = Math.round(sy + uy * (380 + i * 220));
    const reqLevel = st.t === 's' ? 2 : st.t === 'n' ? 4 : 6;
    nodes.push({
      id, x, y, label: st.label, zone,
      category: st.t === 's' ? 'transit_specialized' : 'feat',
      cost: { type: 'OR', amount: 1 },
      requirements: zone === 'center' ? { parentIds: [prev], minLevel: reqLevel + 2 } : { parentIds: [prev], requiredSpecialization: { zone, level: reqLevel } },
      statModifiers: st.mods,
      description: (st.t === 'n' ? 'Ноутейбл. ' : '') + (st.desc ?? ''),
    });
    prev = id;
  });
  forks.forEach((f, fi) => {
    const id = `road_${parent}_fork_${f.idSuffix}`;
    const x = Math.round(sx + ux * (380 + steps.length * 220 + fi * 130));
    const y = Math.round(sy + uy * (380 + steps.length * 220 + fi * 130));
    nodes.push({
      id, x, y, label: f.label, zone, category: 'feat',
      cost: { type: 'OR', amount: 2 },
      exclusiveGroup: f.group,
      requirements: zone === 'center' ? { parentIds: [prev], minLevel: 8 } : { parentIds: [prev], requiredSpecialization: { zone, level: 6 } },
      description: `${CHOICE}Кейстоун. ${f.desc}`,
    });
  });
}

function addRoad(
  parent: string, sx: number, sy: number, zone: SkillNode['zone'], steps: RoadStep[],
) {
  const len = Math.hypot(sx, sy) || 1;
  const ux = sx / len, uy = sy / len; // единичный вектор наружу
  let prev = parent;
  steps.forEach((st, i) => {
    const id = `road_${parent}_${i}`;
    const x = Math.round(sx + ux * (380 + i * 220));
    const y = Math.round(sy + uy * (380 + i * 220));
    const reqLevel = st.t === 's' ? 2 : st.t === 'n' ? 4 : 6;
    nodes.push({
      id, x, y, label: st.label, zone,
      category: st.t === 's' ? 'transit_specialized' : 'feat',
      cost: { type: 'OR', amount: st.t === 'k' ? 2 : 1 },
      requirements: zone === 'center' ? { parentIds: [prev], minLevel: reqLevel + 2 } : { parentIds: [prev], requiredSpecialization: { zone, level: reqLevel } },
      statModifiers: st.mods,
      description: (st.t === 'k' ? 'Кейстоун. ' : st.t === 'n' ? 'Ноутейбл. ' : '') + (st.desc ?? ''),
    });
    prev = id;
  });
}


addRoad('g_path_body', 130, -150, 'center', [
  { t: 's', label: '+1 Ранения', mods: { Ранения: 1 } },
  { t: 's', label: '+1 Атлетика', mods: { Атлетика: 1 } },
  { t: 'n', label: 'Железные лёгкие', desc: '−1 усталость от марш-броска/бега.' },
  { t: 'k', label: 'Несгибаемый', desc: 'PoE Unwavering. Не падаешь от критов; нет уклонения от магии.' },
]);
addRoad('g_path_mind', -130, -150, 'center', [
  { t: 's', label: '+1 Поиск', mods: { 'Поиск Информации': 1 } },
  { t: 's', label: '+1 Проницательность', mods: { Проницательность: 1 } },
  { t: 'n', label: 'Быстрый ум', desc: 'Раз/бой перебрось проваленную проверку Разума.' },
  { t: 'k', label: 'Энциклопедия', desc: 'D&D: всегда знаешь один релевантный факт (1×/сцена).' },
]);
addRoad('g_path_master', 0, -200, 'center', [
  { t: 's', label: '+1 Ремесло', mods: { Ремесло: 1 } },
  { t: 's', label: '+1 Шаг', mods: { Шаг: 1 } },
  { t: 'n', label: 'Универсальный набор', desc: 'Импровизация ремесла без штрафа (1×/день).' },
  { t: 'k', label: 'Мастер на все руки', desc: 'PoE trade-off. Любое ремесло на −1; все ремесла доступны.' },
]);
addRoadFork('sch_wizardry', -520, -300, 'magic', [
  { t: 's', label: 'Арканная мощь', mods: { Волшебство: 1 } },
  { t: 's', label: 'Запас маны', mods: { Усталость: 1 } },
  { t: 'n', label: 'Эхо заклинания', desc: 'Раз в ход повтори Sигил урона (тот же элемент).' },
], [
  { idSuffix: 'glass', label: 'Стеклянная пушка', group: 'wiz_keystone', desc: 'PoE. Sигилы +1 кость; −1 макс. рана.' },
  { idSuffix: 'battery', label: 'Арканная батарея', group: 'wiz_keystone', desc: 'D&D. +2 усталость макс.; первый каст в бою бесплатен.' },
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
addRoad('sch_awaken', 560, -440, 'strength', [
  { t: 's', label: '+1 Усталость', mods: { Усталость: 1 } },
  { t: 's', label: '+1 Атлетика', mods: { Атлетика: 1 } },
  { t: 'n', label: 'Дыхание битвы', desc: 'Снимай 1 усталость при убийстве.' },
  { t: 'k', label: 'Перерождение', desc: 'Раз/день: на 0 ран остаёшься на ногах (1 рана).' },
]);
addRoad('sch_smith', 420, -520, 'strength', [
  { t: 's', label: '+1 Ремесло', mods: { Ремесло: 1 } },
  { t: 's', label: '+1 Мощь', mods: { Мощь: 1 } },
  { t: 'n', label: 'Закалка стали', desc: 'Оружие +1 рана vs конструктов/нежити.' },
  { t: 'k', label: 'Легендарная ковка', desc: '1×/неделя оружие +1 ранг (нужны материалы).' },
]);
addRoadFork('sch_berserk', 520, -300, 'strength', [
  { t: 's', label: '+1 урон б.боя', mods: { 'Ближний бой (Мощь)': 1 } },
  { t: 's', label: '+1 Атлетика', mods: { Атлетика: 1 } },
  { t: 'n', label: 'Кровавая жажда', desc: 'Убил врага → доп. атака в этот ход.' },
], [
  { idSuffix: 'fury', label: 'Неистовство', group: 'berserk_keystone', desc: 'Куб Стиля чётный; нет взрыва к6.' },
  { idSuffix: 'blood', label: 'Кровавый туман', group: 'berserk_keystone', desc: 'PoE. +1 кость при <50% ран; иначе −1 КБ.' },
]);

addRoad('sch_toughness', 300, -560, 'strength', [
  { t: 's', label: '+1 раны', mods: { Ранения: 1 } },
  { t: 's', label: '+1 Выживание', mods: { Выживание: 1 } },
  { t: 'n', label: 'Крепкий орешек', desc: '+1 к максимуму Ран.' },
  { t: 'k', label: 'Несокрушимый', desc: 'Раз за бой игнорируй Рану, но макс Вдохновение -1.' },
]);
addRoad('sch_viet', 180, -420, 'strength', [
  { t: 's', label: '+1 Ближний бой', mods: { 'Ближний бой (Мощь)': 1 } },
  { t: 's', label: '+1 Уклонение', mods: { Уклонение: 1 } },
  { t: 'n', label: 'Смена стойки', desc: 'Раз за раунд меняй стойку без траты действия.' },
  { t: 'k', label: 'Поток Виэт', desc: 'После парирования — контратака без усталости (1/бой).' },
]);


addRoad('sch_duel', 520, 300, 'dexterity', [
  { t: 's', label: '+1 Ближний бой', mods: { 'Ближний бой (Моторика)': 1 } },
  { t: 's', label: '+1 Уклонение', mods: { Уклонение: 1 } },
  { t: 'n', label: 'Стальная хватка', desc: 'Парирование не тратит реакцию (1/бой).' },
  { t: 'k', label: 'Мастер клинка', desc: 'PoE. Крит из парирования; −1 дальний бой.' },
]);
addRoadFork('sch_ranged', 560, 440, 'dexterity', [
  { t: 's', label: '+1 Дальний бой', mods: { 'Дальний бой': 1 } },
  { t: 's', label: '+1 Внимание', mods: { Внимание: 1 } },
  { t: 'n', label: 'Град стрел', desc: 'Шквал бьёт +1 цель.' },
], [
  { idSuffix: 'point', label: 'В упор', group: 'ranged_keystone', desc: 'PoE Point Blank. +2 кость вблизи; −1 на дистанции.' },
  { idSuffix: 'far', label: 'Дальнобойщик', group: 'ranged_keystone', desc: 'PoE Far Shot. +2 дальность; −1 кость вблизи.' },
]);
addRoad('sch_acrobatics', 300, 560, 'dexterity', [
  { t: 's', label: '+1 Уклонение', mods: { Уклонение: 1 } },
  { t: 's', label: '+1 Акробатика', mods: { Акробатика: 1 } },
  { t: 'n', label: 'Паркур', desc: 'Перепрыгивай 1 клетку препятствия без проверки.' },
  { t: 'k', label: 'Призрак', desc: 'PoE Acrobatics. 30% уклонить магию; −1 броня.' },
]);
addRoadFork('sch_stealth', 420, 540, 'dexterity', [
  { t: 's', label: '+1 Скрытность', mods: { Скрытность: 1 } },
  { t: 's', label: '+1 Ловкость рук', mods: { 'Ловкость рук': 1 } },
  { t: 'n', label: 'Мокрое дело', desc: 'Первый удар по не заметившему = крит.' },
], [
  { idSuffix: 'shadow', label: 'Тень', group: 'stealth_keystone', desc: 'Невидим до атаки; выход — 1 бесплатный Sигил.' },
  { idSuffix: 'assassin', label: 'Палач', group: 'stealth_keystone', desc: 'D&D Assassin. +1 рана по застигнутым; нет бонуса вне скрытности.' },
]);
addRoadFork('sch_cybernetics', 180, 420, 'dexterity', [
  { t: 's', label: '+1 Импланты', mods: { Импланты: 1 } },
  { t: 's', label: '+1 ЭлектроМех', mods: { ЭлектроМех: 1 } },
  { t: 'n', label: 'Тепловизор', desc: 'Фокус: тепло сквозь дым.' },
], [
  { idSuffix: 'over', label: 'Полный разгон', group: 'cyber_keystone', desc: '2 быстрые атаки + двойной шаг; усталость 3 после.' },
  { idSuffix: 'ghost', label: 'Призрачный протокол', group: 'cyber_keystone', desc: 'PoE Ghost Reaver. Лечение → щит; нет ест. реген ран.' },
]);
addRoad('sch_pero', 540, 600, 'dexterity', [
  { t: 's', label: '+1 Перо', mods: { Перо: 1 } },
  { t: 's', label: '+1 Моторика', mods: { Моторика: 1 } },
  { t: 'n', label: 'Быстрый штрих', desc: 'Знак за быструю атаку (−1 усталость).' },
  { t: 'k', label: 'Живая каллиграфия', desc: 'Знак оживает 1 раунд; без чернил каст невозможен.' },
]);
addRoadFork('sch_witchcraft', -520, 300, 'wisdom', [
  { t: 's', label: '+1 Колдовство', mods: { Колдовство: 1 } },
  { t: 's', label: '+1 Интуиция', mods: { Интуиция: 1 } },
  { t: 'n', label: 'Холодный пакт', desc: 'Раз/бой подготовь приём без +1 усталости.' },
], [
  { idSuffix: 'patron', label: 'Воля покровителя', group: 'witch_keystone', desc: 'Игнорируй «1» на Кубе Стиля (1×/отдых).' },
  { idSuffix: 'wild', label: 'Дикий пакт', group: 'witch_keystone', desc: 'PoE: random power. «6» на к6 = бесплатный каст; «1» = +2 усталости.' },
]);
addRoad('sch_psionics', -540, 460, 'wisdom', [
  { t: 's', label: '+1 Псионика', mods: { Псионика: 1 } },
  { t: 's', label: '+1 Стержень', mods: { Стержень: 1 } },
  { t: 'n', label: 'Телепатия', desc: 'Читай поверхностные мысли (фокус).' },
  { t: 'k', label: 'Разум без границ', desc: 'PoE Mind over Matter. Урон → усталость; не лечишь усталость магией.' },
]);
addRoadFork('sch_divine', -420, 560, 'wisdom', [
  { t: 's', label: '+1 Медицина', mods: { Медицина: 1 } },
  { t: 's', label: '+1 Проницательность', mods: { Проницательность: 1 } },
  { t: 'n', label: 'Свет надежды', desc: 'Лечение задевает 2 союзников.' },
], [
  { idSuffix: 'heal', label: 'Обет исцеления', group: 'divine_keystone', desc: 'Лечение ×2; сам не лечишься в отдых.' },
  { idSuffix: 'wrath', label: 'Гнев небес', group: 'divine_keystone', desc: 'D&D Wrath. +1 рана vs нечестивых; лечение −1 кость.' },
]);
addRoadFork('sch_leader', -280, 560, 'wisdom', [
  { t: 's', label: '+1 Лидерство', mods: { Лидерство: 1 } },
  { t: 's', label: '+1 Убеждение', mods: { Убеждение: 1 } },
  { t: 'n', label: 'Боевой приказ', desc: 'Союзник +1 к атаке после твоего приказа.' },
], [
  { idSuffix: 'cmd', label: 'Полководец', group: 'leader_keystone', desc: '2 союзника смещаются; ты −1 КБ.' },
  { idSuffix: 'face', label: 'Лик лидера', group: 'leader_keystone', desc: 'D&D Inspiring Leader. После отдыха союзники +1 рана temp.' },
]);


const LAYOUT_SCALE = 1.55;

function scaleLayout(source: SkillNode[]): SkillNode[] {
  return source.map((n) => ({
    ...n,
    x: Math.round(n.x * LAYOUT_SCALE),
    y: Math.round(n.y * LAYOUT_SCALE),
  }));
}

/** Раздвигает узлы, не трогая центр и специализации (Дары). */
function relaxOverlaps(source: SkillNode[], minDist = 92, iterations = 12): SkillNode[] {
  const out = source.map((n) => ({ ...n }));
  const locked = new Set<SkillNode['category']>(['root', 'specialization']);
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const dx = out[j].x - out[i].x;
        const dy = out[j].y - out[i].y;
        const d = Math.hypot(dx, dy) || 1;
        if (d >= minDist) continue;
        const push = (minDist - d) / 2 + 3;
        const ux = dx / d;
        const uy = dy / d;
        if (!locked.has(out[i].category)) {
          out[i].x -= Math.round(ux * push);
          out[i].y -= Math.round(uy * push);
        }
        if (!locked.has(out[j].category)) {
          out[j].x += Math.round(ux * push);
          out[j].y += Math.round(uy * push);
        }
      }
    }
  }
  return out;
}

function layoutNodes(source: SkillNode[]): SkillNode[] {
  return relaxOverlaps(scaleLayout(source));
}

// Рёбра выводим автоматически из parentIds
const edges: SkillEdge[] = [];
const laidOutNodes = layoutNodes(nodes);
for (const n of laidOutNodes) {
  const parents = n.requirements?.parentIds ?? [];
  for (const p of parents) edges.push({ from: p, to: n.id });
}
// Специализации крепим к центру явно (у них parentIds = center_start уже задан выше,
// цикл их учтёт). Секрет/черты цепочки тоже учтены через parentIds.

export const initialSkillTree: SkillTreeData = { nodes: laidOutNodes, edges };
