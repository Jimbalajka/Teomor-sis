import type { SkillNode } from './types';

/** Дар Змея — профессии, развилки и импланты (ядро v2, 2026-09). */

const Z = 'dexterity' as const;
const or1 = { type: 'OR' as const, amount: 1 };
const or2 = { type: 'OR' as const, amount: 2 };

const dex = (level: number) => ({ requiredSpecialization: { zone: Z, level } });

const school = (
  id: string, x: number, y: number, label: string, desc: string,
): SkillNode => ({
  id, x, y, label, zone: Z, category: 'subcategory', cost: or1,
  requirements: { parentIds: ['spec_dexterity'], ...dex(1) }, description: desc,
});

const base = (
  id: string, x: number, y: number, label: string, parent: string, desc: string,
  mods?: Record<string, number>,
): SkillNode => ({
  id, x, y, label, zone: Z, category: 'transit_specialized', cost: or1,
  requirements: { parentIds: [parent], ...dex(2) },
  statModifiers: mods, description: desc,
});

/** Продолжение основы ИЛИ одно из двух углублений (взаимоисключающие — следить вручную). */
const fork = (
  id: string, x: number, y: number, label: string, parent: string,
  desc: string, specLevel = 3,
  extraReq?: SkillNode['requirements'],
): SkillNode => ({
  id, x, y, label, zone: Z, category: 'transit_specialized', cost: or1,
  requirements: { parentIds: [parent], ...dex(specLevel), ...extraReq },
  description: desc,
});

const deep = (
  id: string, x: number, y: number, label: string, parent: string,
  desc: string, level = 4, cost = or1, category: SkillNode['category'] = 'transit_specialized',
  mods?: Record<string, number>,
): SkillNode => ({
  id, x, y, label, zone: Z, category, cost,
  requirements: { parentIds: [parent], ...dex(level) },
  statModifiers: mods, description: desc,
});

/** Имплант = Сигил (кибернетика). */
const implant = (
  id: string, x: number, y: number, label: string, parent: string, desc: string, level = 4,
  mods?: Record<string, number>,
): SkillNode => deep(id, x, y, label, parent, `Имплант (Сигил). ${desc}`, level, or1, 'feat', mods);

/** Клан наёмника Туо — выбор на 3 ур. без общего продолжения. */
const tuoClan = (
  id: string, x: number, y: number, label: string, desc: string,
): SkillNode => ({
  id, x, y, label, zone: Z, category: 'transit_specialized', cost: or1,
  requirements: { parentIds: ['ts_tuo_base2'], ...dex(3) },
  description: `Клан Туо. ${desc} (только один клан на персонажа).`,
});

export const dexterityProfessionNodes: SkillNode[] = [
  // ── Аристократ (Дуэль) ───────────────────────────────────────
  school('sch_duel', 520, 300, 'Аристократ', 'Дуэльщик: авторитет, точность, мало действий. Лёгкое фехтовальное оружие.'),
  base('ts_arist_precision', 640, 280, 'Точный укол', 'sch_duel', '+1 к попаданию фехтовальным оружием; −1 действие в раунде.', { 'Ближний бой (Точность)': 1 }),
  base('ts_arist_authority', 640, 340, 'Сила авторитета', 'sch_duel', 'В бою: Запугивание/Убеждение как бонусное; вызов на дуэль.', { Запугивание: 1 }),
  fork('prof_arist_continue', 780, 300, 'Придворный фехтовальщик', 'ts_arist_authority', 'Продолжение основы: универсальный аристократ.'),
  fork('prof_arist_duelist', 780, 240, 'Дуэлист', 'ts_arist_precision', 'Углубление: одна цель, одна рука, бонусы в дуэли; выявляет сильнейшего.'),
  fork('prof_arist_virtuoso', 780, 360, 'Виртуоз', 'ts_arist_precision', 'Углубление: две руки; одна атака на цель за ход, затем повтор по той же цели.'),
  deep('feat_arist_riposte', 920, 300, 'Riposte de cour', 'prof_arist_continue', 'Реакция: ответ на промах в дуэльной дистанции (+1 рана).', 4, or1, 'feat'),
  deep('feat_arist_duel_focus', 920, 220, 'Фокус дуэли', 'prof_arist_duelist', 'Атакуешь одну цель — +2 к попаданию и игнор половины КБ.', 4, or1, 'feat'),
  deep('feat_arist_challenge', 920, 260, 'Вызов', 'prof_arist_duelist', 'Действием вызови сильнейшего; он атакует только тебя 1 раунд.', 4, or1, 'feat'),
  deep('feat_arist_virt_sequence', 920, 340, 'Каскад ударов', 'prof_arist_virtuoso', 'После атак по всем целям — бесплатная атака по выбранной.', 4, or1, 'feat'),
  deep('feat_arist_virt_flurry', 920, 380, 'Буря клинков', 'prof_arist_virtuoso', 'Две руки: +1 кость урона, но только одна цель за ход.', 4, or1, 'feat'),

  // ── Стрелок (Стрельба) ───────────────────────────────────────
  school('sch_ranged', 560, 440, 'Стрелок', 'Универсальный дальний бой: лук, арбалет, огнестрел — один Квель.'),
  base('ts_shoot_aim', 680, 420, 'Прицел', 'sch_ranged', '+1 Дальний бой; игнор половины укрытия.', { 'Дальний бой': 1 }),
  base('ts_shoot_kit', 680, 480, 'Универсальное оружие', 'sch_ranged', 'Владение луком, арбалетом и огнестрелом под одним Квелем.'),
  fork('prof_shoot_continue', 820, 440, 'Меткий стрелок', 'ts_shoot_kit', 'Продолжение: чистый снайпер/лучник.'),
  fork('prof_shoot_hunter', 820, 380, 'Охотник', 'ts_shoot_aim', 'Углубление: выслеживание, ловушки, природа, дальний бой.'),
  fork('prof_shoot_vanguard', 820, 500, 'Авангард', 'ts_shoot_kit', 'Углубление: стрелок ближнего боя — больше атак, меньше урон, чуть лучше защита.'),
  deep('feat_shoot_sniper', 960, 440, 'Снайперский выстрел', 'prof_shoot_continue', 'Раз за ход: игнор укрытия, +1 кость урона.', 4, or1, 'feat'),
  deep('feat_shoot_track', 960, 360, 'Выслеживание', 'prof_shoot_hunter', 'Следы видны 48 ч.', 4, or1, 'feat', { Следопытство: 1 }),
  deep('feat_shoot_trap', 960, 400, 'Ловушки', 'prof_shoot_hunter', 'Устанавливай ловушки; первая атака из засады = крит.', 4, or1, 'feat'),
  deep('feat_shoot_point_blank', 960, 480, 'В упор', 'prof_shoot_vanguard', 'Вблизи: +1 атака, −1 кость урона на дистанции.', 4, or1, 'feat'),
  deep('feat_shoot_buckler', 960, 520, 'Каплевидный щит', 'prof_shoot_vanguard', '+1 КБ при дальнем оружии в руках.', 4, or1, 'feat', { Уклонение: 1 }),

  // ── Тень (Скрытность) ────────────────────────────────────────
  school('sch_stealth', 420, 540, 'Тень', 'Взлом, скрытность, яды, первый удар.'),
  base('ts_shadow_hide', 540, 520, 'Мгновение тени', 'sch_stealth', '+1 Скрытность; урон из невидимости с преимуществом.', { Скрытность: 1 }),
  base('ts_shadow_tools', 540, 580, 'Яды и замки', 'sch_stealth', 'Воровские инструменты; базовые яды и взлом.'),
  fork('prof_shadow_continue', 680, 540, 'Классическая тень', 'ts_shadow_tools', 'Продолжение: разведчик/вор.'),
  fork('prof_shadow_affair', 680, 480, 'Афферист', 'ts_shadow_hide', 'Углубление: обман, очарование, шпион. Требует 2 ур. Дара Голубя (Стержень).', 3, { requiredSpecialization: { zone: 'wisdom', level: 2 } }),
  fork('prof_shadow_maniac', 680, 600, 'Маньяк', 'ts_shadow_tools', 'Углубление: ножи, метательное, боевые навыки + скрытность.'),
  deep('feat_shadow_strike', 820, 540, 'Удар из тени', 'prof_shadow_continue', 'Первый удар из скрытности: +1 рана.', 4, or1, 'feat'),
  deep('feat_affair_charm', 820, 460, 'Очарование ради выгоды', 'prof_shadow_affair', '+1 Обман и Убеждение; идеальный шпион.', 4, or1, 'feat', { Обман: 1, Убеждение: 1 }),
  deep('feat_affair_disguise', 820, 500, 'Притворство', 'prof_shadow_affair', 'Смена личины; социальная инfiltration без боя.', 4, or1, 'feat'),
  deep('feat_maniac_blades', 820, 580, 'Мастер клинка', 'prof_shadow_maniac', '+1 к попаданию кинжалами и метательным.', 4, or1, 'feat'),
  deep('feat_maniac_frenzy', 820, 620, 'Кровавая тишина', 'prof_shadow_maniac', 'Из скрытности: серия ударов, затем снова в тень.', 4, or1, 'feat'),

  // ── Цигун (Акробатика) — не пересекается с Изумрудной стопой ─
  school('sch_acrobatics', 300, 560, 'Цигун', 'Квель ци: с ростом ранга больше ударов за одно действие. Внутренняя энергия.'),
  base('ts_qigong_breath', 420, 540, 'Дыхание ци', 'sch_acrobatics', 'Концентрация ци; +1 Уклонение.', { Уклонение: 1 }),
  base('ts_qigong_strike', 420, 600, 'Удар ци', 'sch_acrobatics', 'Квель: серия безоружных ударов за действие (растёт с рангом).'),
  fork('prof_qigong_continue', 560, 560, 'Мастер ци', 'ts_qigong_breath', 'Продолжение: универсальный монах.'),
  fork('prof_qigong_defense', 560, 500, 'Защита', 'ts_qigong_breath', 'Углубление ци: оборона, реакции, защита союзников.'),
  fork('prof_qigong_offense', 560, 620, 'Урон', 'ts_qigong_strike', 'Углубление ци: серии ударов, меньше защиты.'),
  deep('feat_qigong_flow', 700, 560, 'Поток ци', 'prof_qigong_continue', 'Баланс путей: +1 удар ци за ранг без штрафа КБ.', 4, or1, 'feat'),
  deep('feat_qigong_ward', 700, 480, 'Щит ци', 'prof_qigong_defense', 'Реакция: +КБ себе или союзнику в 5 футах.', 4, or1, 'feat'),
  deep('feat_qigong_body', 700, 520, 'Железное тело', 'prof_qigong_defense', 'Парирование безоружным; защита союзников реакцией.', 4, or1, 'feat'),
  deep('feat_qigong_combo', 700, 600, 'Комбо ци', 'prof_qigong_offense', '+1 удар в серии за ранг Квеля.', 4, or1, 'feat'),
  deep('feat_qigong_burst', 700, 640, 'Всплеск', 'prof_qigong_offense', 'Раз за бой: удвой удары серии, −1 КБ до конца боя.', 4, or1, 'feat'),

  // ── Наемник Туо (Перо) — сразу 5 кланов ─────────────────────
  school('sch_pero', 540, 600, 'Наемник Туо', 'Пустыня Туо: печати Охт/Уур. Выбор клана вместо развилки.'),
  base('ts_tuo_seals', 660, 580, 'Новичок печатей', 'sch_pero', '4 печати на старте; начертание Охт/Уур по правилам наёмника.'),
  base('ts_tuo_base2', 660, 640, 'Полиглот', 'sch_pero', 'Понимание чужих языков и письмен (суть, не слова).'),
  tuoClan('st_tuo_azure', 800, 560, 'Лазурная ладонь', 'Печати на теле, заговоры, геометрия лба, кристалл.'),
  tuoClan('st_tuo_sun', 800, 600, 'Солнечный глаз', 'Разведка, выслеживание, чтение по губам, рентген-взгляд.'),
  tuoClan('st_tuo_purple', 800, 640, 'Пурпурное сердце', 'Яды, кровавые сгустки, скрытые убийства.'),
  tuoClan('st_tuo_emerald', 800, 680, 'Изумрудная стопа', 'Печати на конечности, скорость, импульсы боевых приёмов (не ци!).'),
  tuoClan('st_tuo_sandy', 840, 720, 'Песчаное тело', 'Песок вместо чернил, оружие из песка, метки, форма песка.'),
  deep('feat_tuo_clan_seal', 960, 640, 'Печать клана', 'st_tuo_azure', 'Умение клана 5 ур.: усиленная печать (см. PDF клана).', 5, or2, 'feat'),
  deep('feat_tuo_battle_style', 960, 680, 'Боевой стиль клана', 'st_tuo_emerald', '6 ур.: стиль сражения клана.', 6, or1, 'feat'),

  // ── Кибернетика — импланты = сигилы, квель = углубление ───────
  school('sch_cybernetics', 180, 420, 'Кибернетика', 'Джухдес: все способности — импланты. Качается навык Имплантирование.'),
  base('ts_cyb_implantation', 60, 400, 'Имплантирование', 'sch_cybernetics', '+1 к навыку Имплантирование; база для веток имплантов.', { Имплантирование: 1 }),
  base('ts_cyb_surgery', 60, 460, 'Хирургия аугментации', 'sch_cybernetics', '+1 Имплантирование; установка/замена импланта за отдых.', { Имплантирование: 1 }),
  deep('ts_cyb_calibration', 60, 520, 'Калибровка', 'ts_cyb_surgery', '+1 Имплантирование; снижает сбои протокола.', 3, or1, 'transit_specialized', { Имплантирование: 1 }),

  fork('cyb_queima', 200, 360, 'Queima do ser', 'ts_cyb_implantation', 'Квель разрушения: атакующие и разрушительные импланты.'),
  fork('cyb_mente', 200, 420, 'O triunfo da mente', 'ts_cyb_implantation', 'Квель разума: взлом, просчёт, интеллектуальные импланты.'),
  fork('cyb_relampago', 200, 480, 'Relâmpago do céu', 'ts_cyb_implantation', 'Квель молнии: скорость и ловкость.'),

  implant('imp_tremor', 340, 320, 'Tremor', 'cyb_queima', 'Сильные вибрации: ломает кости и стены (урон + разрушение укрытий).'),
  implant('imp_lingua_fogo', 340, 360, 'Língua de fogo', 'cyb_queima', 'Встроенный огнемёт; урон огнём в конусе.'),
  implant('imp_frio_fresco', 340, 400, 'Frio fresco', 'cyb_queima', 'Замораживающий имплант; урон холодом и замедление.'),
  implant('imp_demolish', 480, 340, 'Demolição', 'imp_tremor', 'Усиленный Tremor: пробивает броню и укрепления.', 5),

  implant('imp_neural_hack', 340, 420, 'Invasão neural', 'cyb_mente', 'Взлом систем и магических замков.', 4, { Анализ: 1 }),
  implant('imp_tact_net', 340, 460, 'Rede tática', 'cyb_mente', 'Просчёт боя: преимущество на инициативу союзникам в 30 футах.'),
  implant('imp_cortex', 340, 500, 'Córtex expandido', 'cyb_mente', 'Быстрый расчёт траекторий и слабых точек.', 4, { ЭлектроМех: 1 }),
  implant('imp_ghost_proto', 480, 440, 'Protocolo fantasma', 'imp_neural_hack', 'Невидимость для камер и детекторов 1 мин/отдых.', 5),

  implant('imp_overclock', 340, 480, 'Relâmpago', 'cyb_relampago', '+1 Шаг; раз за бой удвоенное перемещение.', 4, { Шаг: 1 }),
  implant('imp_reflex', 340, 520, 'Reflexo elétrico', 'cyb_relampago', 'Реакция уклоняет одну атаку.', 4, { Уклонение: 1 }),
  implant('imp_blade_arm', 340, 560, 'Lâmina retrátil', 'cyb_relampago', 'Скрытое клинковое оружие; быстрая атака после рывка.'),
  implant('imp_storm_dash', 480, 500, 'Raio cortante', 'imp_overclock', 'Рывок через врага с уроном на пути; усталость 1.', 5),
];
