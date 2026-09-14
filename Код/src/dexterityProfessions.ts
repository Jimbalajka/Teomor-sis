import type { SkillNode } from './types';

/** Дар Змея — профессии, развилки и импланты (ядро v2). */

const Z = 'dexterity' as const;
const or1 = { type: 'OR' as const, amount: 1 };
const or2 = { type: 'OR' as const, amount: 2 };
const CHOICE = '⚔ Выбор: нельзя взять другой вариант этой развилки. ';

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

const forkProf = (
  id: string, x: number, y: number, label: string, parent: string, group: string,
  desc: string, specLevel = 3,
  extraReq?: SkillNode['requirements'],
): SkillNode => ({
  id, x, y, label, zone: Z, category: 'transit_specialized', cost: or1,
  exclusiveGroup: group,
  requirements: { parentIds: [parent], ...dex(specLevel), ...extraReq },
  description: `${CHOICE}${desc}`,
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

const implant = (
  id: string, x: number, y: number, label: string, parent: string, desc: string, level = 4,
  mods?: Record<string, number>,
): SkillNode => deep(id, x, y, label, parent, `Имплант (Сигил). ${desc}`, level, or1, 'feat', mods);

const tuoClan = (
  id: string, x: number, y: number, label: string, desc: string,
): SkillNode => ({
  id, x, y, label, zone: Z, category: 'transit_specialized', cost: or1,
  exclusiveGroup: 'fork_tuo_clan',
  requirements: { parentIds: ['ts_tuo_base2'], ...dex(3) },
  description: `${CHOICE}Клан Туо. ${desc}`,
});

export const dexterityProfessionNodes: SkillNode[] = [
  // ── Аристократ ──
  school('sch_duel', 520, 300, 'Аристократ', 'Дуэльщик: авторитет, точность, мало действий.'),
  base('ts_arist_precision', 640, 280, 'Точный укол', 'sch_duel', '+1 к попаданию фехтовальным; −1 действие в раунде.', { 'Ближний бой (Точность)': 1 }),
  base('ts_arist_authority', 640, 340, 'Сила авторитета', 'sch_duel', 'Запугивание/Убеждение в бою; вызов на дуэль.', { Запугивание: 1 }),
  forkProf('prof_arist_continue', 780, 300, 'Придворный фехтовальщик', 'ts_arist_authority', 'fork_arist', 'Продолжение основы.'),
  forkProf('prof_arist_duelist', 780, 240, 'Дуэлист', 'ts_arist_precision', 'fork_arist', 'Одна цель, одна рука, бонусы в дуэли.'),
  forkProf('prof_arist_virtuoso', 780, 360, 'Виртуоз', 'ts_arist_precision', 'fork_arist', 'Две руки; одна атака на цель за ход.'),
  deep('feat_arist_riposte', 920, 300, 'Riposte de cour', 'prof_arist_continue', 'Реакция: ответ на промах (+1 рана).', 4, or1, 'feat'),
  deep('feat_arist_duel_focus', 920, 220, 'Фокус дуэли', 'prof_arist_duelist', '+2 к попаданию по одной цели.', 4, or1, 'feat'),
  deep('feat_arist_challenge', 920, 260, 'Вызов', 'prof_arist_duelist', 'Сильнейший атакует только тебя 1 раунд.', 4, or1, 'feat'),
  deep('feat_arist_virt_sequence', 920, 340, 'Каскад ударов', 'prof_arist_virtuoso', 'После атак по всем — бесплатная по выбранной.', 4, or1, 'feat'),
  deep('feat_arist_virt_flurry', 920, 380, 'Буря клинков', 'prof_arist_virtuoso', '+1 кость урона; одна цель за ход.', 4, or1, 'feat'),

  // ── Стрелок ──
  school('sch_ranged', 560, 440, 'Стрелок', 'Универсальный дальний бой: лук, арбалет, огнестрел.'),
  base('ts_shoot_aim', 680, 420, 'Прицел', 'sch_ranged', '+1 Дальний бой; игнор половины укрытия.', { 'Дальний бой': 1 }),
  base('ts_shoot_kit', 680, 480, 'Универсальное оружие', 'sch_ranged', 'Лук, арбалет и огнестрел под одним Квелем.'),
  forkProf('prof_shoot_continue', 820, 440, 'Меткий стрелок', 'ts_shoot_kit', 'fork_shoot', 'Чистый снайпер/лучник.'),
  forkProf('prof_shoot_hunter', 820, 380, 'Охотник', 'ts_shoot_aim', 'fork_shoot', 'Выслеживание, ловушки, природа.'),
  forkProf('prof_shoot_vanguard', 820, 500, 'Авангард', 'ts_shoot_kit', 'fork_shoot', 'Ближний бой: больше атак, меньше урон.'),
  deep('feat_shoot_sniper', 960, 440, 'Снайперский выстрел', 'prof_shoot_continue', 'Раз за ход: игнор укрытия, +1 кость.', 4, or1, 'feat'),
  deep('feat_shoot_track', 960, 360, 'Выслеживание', 'prof_shoot_hunter', 'Следы 48 ч.', 4, or1, 'feat', { Следопытство: 1 }),
  deep('feat_shoot_trap', 960, 400, 'Ловушки', 'prof_shoot_hunter', 'Засада: первая атака = крит.', 4, or1, 'feat'),
  deep('feat_shoot_point_blank', 960, 480, 'В упор', 'prof_shoot_vanguard', 'Вблизи +1 атака.', 4, or1, 'feat'),
  deep('feat_shoot_buckler', 960, 520, 'Каплевидный щит', 'prof_shoot_vanguard', '+1 КБ с дальним оружием.', 4, or1, 'feat', { Уклонение: 1 }),

  // ── Тень ──
  school('sch_stealth', 420, 540, 'Тень', 'Взлом, скрытность, яды, первый удар.'),
  base('ts_shadow_hide', 540, 520, 'Мгновение тени', 'sch_stealth', '+1 Скрытность; урон из невидимости с преимуществом.', { Скрытность: 1 }),
  base('ts_shadow_tools', 540, 580, 'Яды и замки', 'sch_stealth', 'Воровские инструменты; базовые яды.'),
  forkProf('prof_shadow_continue', 680, 540, 'Классическая тень', 'ts_shadow_tools', 'fork_shadow', 'Разведчик/вор.'),
  forkProf('prof_shadow_affair', 680, 480, 'Афферист', 'ts_shadow_hide', 'fork_shadow', 'Обман, шпион. Требует 2 ур. Дара Голубя.', 3, { requiredSpecialization: { zone: 'wisdom', level: 2 } }),
  forkProf('prof_shadow_maniac', 680, 600, 'Маньяк', 'ts_shadow_tools', 'fork_shadow', 'Ножи, метательное, бой + скрытность.'),
  deep('feat_shadow_strike', 820, 540, 'Удар из тени', 'prof_shadow_continue', 'Первый удар из скрытности: +1 рана.', 4, or1, 'feat'),
  deep('feat_affair_charm', 820, 460, 'Очарование ради выгоды', 'prof_shadow_affair', '+1 Обман и Убеждение.', 4, or1, 'feat', { Обман: 1, Убеждение: 1 }),
  deep('feat_affair_disguise', 820, 500, 'Притворство', 'prof_shadow_affair', 'Смена личины; социальная infiltration.', 4, or1, 'feat'),
  deep('feat_maniac_blades', 820, 580, 'Мастер клинка', 'prof_shadow_maniac', '+1 кинжалы и метательное.', 4, or1, 'feat'),
  deep('feat_maniac_frenzy', 820, 620, 'Кровавая тишина', 'prof_shadow_maniac', 'Серия из скрытности, затем снова в тень.', 4, or1, 'feat'),

  // ── Цигун (≠ Изумрудная стопа) ──
  school('sch_acrobatics', 300, 560, 'Цигун', 'Квель ци: больше ударов за действие с ростом ранга.'),
  base('ts_qigong_breath', 420, 540, 'Дыхание ци', 'sch_acrobatics', '+1 Уклонение.', { Уклонение: 1 }),
  base('ts_qigong_strike', 420, 600, 'Удар ци', 'sch_acrobatics', 'Серия безоружных ударов за действие.'),
  forkProf('prof_qigong_continue', 560, 560, 'Мастер ци', 'ts_qigong_breath', 'fork_qigong', 'Универсальный монах.'),
  forkProf('prof_qigong_defense', 560, 500, 'Защита', 'ts_qigong_breath', 'fork_qigong', 'Оборона, реакции, защита союзников.'),
  forkProf('prof_qigong_offense', 560, 620, 'Урон', 'ts_qigong_strike', 'fork_qigong', 'Серии ударов, меньше защиты.'),
  deep('feat_qigong_flow', 700, 560, 'Поток ци', 'prof_qigong_continue', '+1 удар ци за ранг.', 4, or1, 'feat'),
  deep('feat_qigong_ward', 700, 480, 'Щит ци', 'prof_qigong_defense', 'Реакция: +КБ себе/союзнику.', 4, or1, 'feat'),
  deep('feat_qigong_body', 700, 520, 'Железное тело', 'prof_qigong_defense', 'Парирование; защита союзников.', 4, or1, 'feat'),
  deep('feat_qigong_combo', 700, 600, 'Комбо ци', 'prof_qigong_offense', '+1 удар в серии за ранг.', 4, or1, 'feat'),
  deep('feat_qigong_burst', 700, 640, 'Всплеск', 'prof_qigong_offense', 'Раз за бой: удвоить серию, −1 КБ.', 4, or1, 'feat'),

  // ── Наемник Туо — 5 кланов ──
  school('sch_pero', 540, 600, 'Наемник Туо', 'Пустыня Туо: печати Охт/Уур. Выбор клана.'),
  base('ts_tuo_seals', 660, 580, 'Новичок печатей', 'sch_pero', '4 печати на старте; Охт/Уур.'),
  base('ts_tuo_base2', 660, 640, 'Полиглот', 'sch_pero', 'Понимание чужих языков (суть).'),
  tuoClan('st_tuo_azure', 800, 560, 'Лазурная ладонь', 'Печати на теле, заговоры, кристалл.'),
  tuoClan('st_tuo_sun', 800, 600, 'Солнечный глаз', 'Разведка, выслеживание, рентген-взгляд.'),
  tuoClan('st_tuo_purple', 800, 640, 'Пурпурное сердце', 'Яды, кровавые сгустки.'),
  tuoClan('st_tuo_emerald', 800, 680, 'Изумрудная стопа', 'Печати на конечности, импульсы (не ци!).'),
  tuoClan('st_tuo_sandy', 840, 720, 'Песчаное тело', 'Песок, оружие из песка, метки.'),
  deep('feat_tuo_clan_seal', 960, 640, 'Печать клана', 'st_tuo_azure', 'Усиленная печать клана (5 ур.).', 5, or2, 'feat'),
  deep('feat_tuo_battle_style', 960, 680, 'Боевой стиль клана', 'st_tuo_emerald', 'Стиль сражения клана (6 ур.).', 6, or1, 'feat'),

  // ── Кибернетика ──
  school('sch_cybernetics', 180, 420, 'Кибернетика', 'Джухдес: способности = импланты-сигилы.'),
  base('ts_cyb_implantation', 60, 400, 'Имплантирование', 'sch_cybernetics', '+1 Имплантирование.', { Имплантирование: 1 }),
  base('ts_cyb_surgery', 60, 460, 'Хирургия аугментации', 'sch_cybernetics', '+1 Имплантирование; установка за отдых.', { Имплантирование: 1 }),
  deep('ts_cyb_calibration', 60, 520, 'Калибровка', 'ts_cyb_surgery', '+1 Имплантирование; меньше сбоев.', 3, or1, 'transit_specialized', { Имплантирование: 1 }),
  forkProf('cyb_queima', 200, 360, 'Queima do ser', 'ts_cyb_implantation', 'fork_cyber_quell', 'Разрушение: атакующие импланты.'),
  forkProf('cyb_mente', 200, 420, 'O triunfo da mente', 'ts_cyb_implantation', 'fork_cyber_quell', 'Взлом, просчёт, интеллект.'),
  forkProf('cyb_relampago', 200, 480, 'Relâmpago do céu', 'ts_cyb_implantation', 'fork_cyber_quell', 'Скорость и ловкость.'),
  implant('imp_tremor', 340, 320, 'Tremor', 'cyb_queima', 'Вибрации: кости, стены, укрытия.'),
  implant('imp_lingua_fogo', 340, 360, 'Língua de fogo', 'cyb_queima', 'Встроенный огнемёт.'),
  implant('imp_frio_fresco', 340, 400, 'Frio fresco', 'cyb_queima', 'Замораживающий имплант.'),
  implant('imp_demolish', 480, 340, 'Demolição', 'imp_tremor', 'Усиленный Tremor: броня и укрепления.', 5),
  implant('imp_neural_hack', 340, 420, 'Invasão neural', 'cyb_mente', 'Взлом систем и замков.', 4, { Анализ: 1 }),
  implant('imp_tact_net', 340, 460, 'Rede tática', 'cyb_mente', 'Преимущество союзникам на инициативу.'),
  implant('imp_cortex', 340, 500, 'Córtex expandido', 'cyb_mente', 'Расчёт траекторий.', 4, { ЭлектроМех: 1 }),
  implant('imp_ghost_proto', 480, 440, 'Protocolo fantasma', 'imp_neural_hack', 'Невидимость для детекторов 1 мин/отдых.', 5),
  implant('imp_overclock', 340, 480, 'Relâmpago', 'cyb_relampago', '+1 Шаг; удвоенное перемещение 1/бой.', 4, { Шаг: 1 }),
  implant('imp_reflex', 340, 520, 'Reflexo elétrico', 'cyb_relampago', 'Реакция: уклон от одной атаки.', 4, { Уклонение: 1 }),
  implant('imp_blade_arm', 340, 560, 'Lâmina retrátil', 'cyb_relampago', 'Скрытый клинок; атака после рывка.'),
  implant('imp_storm_dash', 480, 500, 'Raio cortante', 'imp_overclock', 'Рывок через врага с уроном.', 5),
];
