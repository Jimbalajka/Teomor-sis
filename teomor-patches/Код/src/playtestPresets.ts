import type { ZoneType } from './types';

export interface PlaytestPreset {
  id: string;
  label: string;
  level: number;
  race: string | null;
  background?: string | null;
  raceChoices?: Record<string, string>;
  allocatedNodes: string[];
  specializationLevels: Partial<Record<ZoneType, number>>;
  orPoints: number;
  cardIds: string[];
  manualModifiers?: Record<string, number>;
  proficiencies?: string[];
  nodeChoices?: Record<string, string[]>;
  armorBonus?: number;
  sheetFields?: Record<string, string>;
}

/**
 * Плейтест-персонажи (ур. 14–15).
 * manualModifiers = бонусы сверх древа/дары/расы; целевые навыки ≈ 10–12 на ключевых.
 */
export const PLAYTEST_PRESETS: PlaytestPreset[] = [
  {
    id: 'sorcerer15',
    label: 'Чародей 15 + иллюзии',
    level: 15,
    race: 'sades',
    raceChoices: { sa_stat: 'Стержень' },
    allocatedNodes: [
      'center_start', 'g_will', 'g_swift', 'g_resolve',
      'spec_wisdom', 'sch_witchcraft', 'st_sorcerer',
      'ts_sor_font', 'feat_sor_metamagic', 'ts_sor_draconic', 'feat_divine_channel',
      'feat_sor_quickened',
      'road_sch_witchcraft_0', 'road_sch_witchcraft_1', 'road_sch_witchcraft_2',
      'road_sch_witchcraft_fork_patron',
      'spec_magic', 'sch_wizardry', 'st_illusionist', 'ts_concentration',
      'feat_invis_weave',
      'road_sch_wizardry_0', 'road_sch_wizardry_1', 'road_sch_wizardry_2',
      'road_sch_wizardry_fork_battery',
    ],
    specializationLevels: { center: 0, wisdom: 9, magic: 4, strength: 0, dexterity: 0 },
    orPoints: 2,
    manualModifiers: {
      Стержень: 2,
      Разум: 5,
      Моторика: 3,
      Мощь: 1,
      Колдовство: 7,
      Волшебство: 7,
      Мистика: 4,
      Убеждение: 6,
      Обман: 7,
      Проницательность: 5,
      Внимание: 4,
    },
    proficiencies: [
      'Живой каст (фокусы без усталости)',
      'Аспект огня / молнии / иллюзии',
      'Метамагия · Ускоренный каст · Божественный канал',
      'Плетение тени (невидимость до атаки)',
      'Карты: огненный шар, молния, контрмагия, исцеление, крылья',
    ],
    nodeChoices: {
      st_illusionist: ['Иллюзия', 'Урон', 'Дебафф'],
      st_sorcerer: ['Огонь', 'Урон', 'Дистанция'],
    },
    armorBonus: 0,
    sheetFields: {
      name: 'Чародей (плейтест)',
      notes: 'D&D: Вын+3 Инт+2 Муд+3 Хар+5 · ключ: Колдовство/Волшебство ~12',
    },
    cardIds: [
      'kvel_potok', 'asp_fire', 'asp_lightning', 'sig_fireball', 'sig_lightning',
      'sig_counterspell', 'sig_healing', 'sig_wings',
    ],
  },
  {
    id: 'warlock_viet14',
    label: 'Колдун + Виэт 14',
    level: 14,
    race: 'sades',
    raceChoices: { sa_stat: 'Моторика' },
    allocatedNodes: [
      'center_start', 'g_grit', 'g_alert',
      'spec_strength', 'sch_viet',
      'ts_viet_stance_def', 'ts_viet_stance_assault', 'ts_viet_stance_trick',
      'feat_viet_thunder', 'feat_viet_charge', 'ts_viet_wounding',
      'feat_viet_disarm', 'feat_viet_rook',
      'road_sch_viet_0', 'road_sch_viet_1', 'road_sch_viet_2', 'road_sch_viet_3',
      'spec_wisdom', 'sch_witchcraft', 'st_warlock',
      'feat_wlk_patron_ray', 'feat_wlk_devils_sight', 'ts_wlk_occult', 'ts_wlk_hex', 'feat_wlk_tongues',
      'ts_pact',
      'road_sch_witchcraft_0', 'road_sch_witchcraft_1',
    ],
    specializationLevels: { center: 0, strength: 6, wisdom: 5, magic: 0, dexterity: 0 },
    orPoints: 0,
    manualModifiers: {
      Моторика: 5,
      Мощь: 4,
      Стержень: 3,
      Уклонение: 5,
      'Ближний бой (Мощь)': 6,
      'Ближний бой': 4,
      Колдовство: 6,
      Акробатика: 5,
      Обман: 4,
      Внимание: 4,
    },
    proficiencies: [
      'Виэт: стойки Змея / Натиска / Обмана',
      'Смена стойки · Поток Виэт (парирование)',
      'Громовой клинок · Натиск · Обезоруживание · Рокировка',
      'Луч покровителя · Сглаз · Глоссолалия',
    ],
    nodeChoices: {
      st_warlock: ['Молния', 'Урон', 'Дебафф'],
    },
    armorBonus: 2,
    sheetFields: {
      name: 'Колдун-Виэт (плейтест)',
      notes: 'D&D: Лов+5 Вын+3 · ближний бой + колдовство',
    },
    cardIds: [
      'sig_glossolalia', 'sig_evil_eye', 'sig_viet_charge',
      'sig_wlk_patron_ray', 'sig_bolt',
    ],
  },
  {
    id: 'cyborg14',
    label: 'Киборг-джухдес 14',
    level: 14,
    race: 'juh_craftsman',
    allocatedNodes: [
      'center_start', 'g_lore', 'g_alert',
      'spec_dexterity', 'sch_cybernetics',
      'ts_cyb_implantation', 'ts_cyb_surgery', 'ts_cyb_calibration',
      'cyb_queima', 'imp_tremor', 'imp_lingua_fogo', 'imp_frio_fresco',
      'cyb_mente', 'imp_neural_hack', 'imp_cortex', 'imp_tact_net',
      'cyb_relampago', 'imp_overclock', 'imp_reflex', 'imp_blade_arm',
      'road_sch_cybernetics_0', 'road_sch_cybernetics_1', 'road_sch_cybernetics_2',
      'spec_strength', 'sch_toughness', 'ts_toughskin',
      'road_sch_toughness_0', 'road_sch_toughness_1',
    ],
    specializationLevels: { center: 0, dexterity: 7, strength: 4, magic: 0, wisdom: 0 },
    orPoints: 0,
    manualModifiers: {
      Моторика: 4,
      Разум: 5,
      Мощь: 2,
      Анализ: 8,
      'Дальний бой': 6,
      Импланты: 8,
      ЭлектроМех: 4,
      Уклонение: 4,
      Внимание: 5,
      Атлетика: 3,
    },
    proficiencies: [
      'Серпы-пистолеты (инструмент)',
      'Импланты: Tremor · Língua de fogo · Invasão neural · Relâmpago',
      'Хладнокровный · Сбой протокола',
      
      'Карты: бомба · ускорение · обстрел · деструкция',
    ],
    armorBonus: 3,
    sheetFields: {
      name: 'Киборг-джухдес (плейтест)',
      notes: 'SW: Ловk8 Разумk10 · снайпер-танк',
    },
    cardIds: [
      'ins_scythe_pistol', 'sig_cyb_bomb', 'sig_cyb_overclock',
      'sig_cyb_barrage', 'sig_cyb_destruction',
    ],
  },
];

export function presetById(id: string): PlaytestPreset | undefined {
  return PLAYTEST_PRESETS.find((p) => p.id === id);
}
