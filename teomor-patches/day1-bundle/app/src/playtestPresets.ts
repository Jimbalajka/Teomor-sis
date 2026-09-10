import type { ZoneType } from './types';

export interface PlaytestPreset {
  id: string;
  label: string;
  level: number;
  race: string | null;
  background?: string | null;
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

export const PLAYTEST_PRESETS: PlaytestPreset[] = [
  {
    id: 'sorcerer15',
    label: 'Чародей 15 + иллюзии',
    level: 15,
    race: 'sades',
    allocatedNodes: [
      'center_start', 'spec_wisdom', 'sch_witchcraft', 'st_sorcerer',
      'ts_sor_font', 'feat_sor_metamagic', 'ts_sor_draconic', 'feat_divine_channel',
      'feat_fate_guard', 'feat_sor_subtle', 'spec_magic', 'sch_wizardry', 'st_illusionist',
    ],
    specializationLevels: { center: 0, wisdom: 9, magic: 3, strength: 0, dexterity: 0 },
    orPoints: 2,
    manualModifiers: {
      Моторика: 0, Разум: 5, Стержень: 5, Мощь: 3,
      Колдовство: 8, Волшебство: 6, Убеждение: 5, Медицина: 3,
    },
    proficiencies: [
      'Живой каст (фокусы без усталости)', 'Аспект огня / молнии / иллюзии',
      'Божественный канал · Охрана судьбы', 'Метамагия · Крылья · Исцеление',
    ],
    nodeChoices: { st_illusionist: ['asp_illusion'] },
    armorBonus: 0,
    sheetFields: { name: 'Чародей (плейтест)', notes: 'D&D: Вын+3 Инт+2(+4) Муд+3 Хар+5' },
    cardIds: ['kvel_potok','asp_fire','asp_lightning','sig_fireball','sig_lightning','sig_counterspell','sig_healing','sig_wings'],
  },
  {
    id: 'warlock_viet14',
    label: 'Колдун + Виэт 14',
    level: 14,
    race: 'sades',
    allocatedNodes: [
      'center_start', 'spec_strength', 'sch_viet', 'ts_viet_stance_def', 'ts_viet_stance_assault',
      'ts_viet_stance_trick', 'feat_viet_thunder', 'feat_viet_charge', 'ts_viet_wounding',
      'road_sch_viet_2', 'road_sch_viet_3',
      'spec_wisdom', 'sch_witchcraft', 'st_warlock', 'feat_wlk_patron_ray', 'feat_wlk_devils_sight',
      'ts_wlk_occult', 'ts_wlk_hex', 'feat_wlk_tongues', 'ts_pact',
    ],
    specializationLevels: { center: 0, strength: 4, wisdom: 4, magic: 0, dexterity: 0 },
    orPoints: 0,
    manualModifiers: {
      Моторика: 5, Разум: 0, Стержень: 4, Мощь: 2,
      Уклонение: 5, 'Ближний бой': 6, Колдовство: 5, Запугивание: 4, История: 3,
    },
    proficiencies: [
      'Дуэльный меч (Виэт)', 'Стойки: Змея / Натиск / Обман',
      'Смена стойки · Поток Виэт (парирование)', 'Глоссолалия · Сглаз · Луч покровителя',
      'Громовой клинок (фокус)',
    ],
    armorBonus: 2,
    sheetFields: { name: 'Колдун-Виэт (плейтест)', notes: 'D&D: Сил−1 Лов+5 Вын+3 Инт−1 Муд−1 Хар+4' },
    cardIds: ['sig_glossolalia','sig_evil_eye','sig_viet_charge','sig_wlk_patron_ray','sig_bolt'],
  },
  {
    id: 'cyborg14',
    label: 'Киборг-джухдес 14',
    level: 14,
    race: 'juh_craftsman',
    allocatedNodes: [
      'center_start', 'spec_dexterity', 'sch_cybernetics', 'feat_cyb_cold', 'ts_cyb_analysis',
      'feat_cyb_glitch', 'ts_cyb_overclock', 'ts_cyb_ordnance', 'ts_cyb_plating',
      'feat_cyb_nanites', 'ts_cyb_ecm', 'feat_cyb_optics',
      'road_sch_cybernetics_2', 'road_sch_cybernetics_3',
      'spec_strength',
    ],
    specializationLevels: { center: 0, dexterity: 6, strength: 5, magic: 0, wisdom: 0 },
    orPoints: 0,
    manualModifiers: {
      Моторика: 5, Разум: 6, Стержень: 2, Мощь: 4,
      Анализ: 8, 'Дальний бой': 5, Импланты: 6, Уклонение: 2,
    },
    proficiencies: [
      'Серпы-пистолеты', 'Тепловизор · Тактический скан',
      'Хладнокровный · Сбой (к4)', 'Полный разгон (ульт, 1/бой)', 'Бомба · Ускорение · Обстрел · Деструкция',
    ],
    armorBonus: 3,
    sheetFields: { name: 'Киборг-джухдес (плейтест)', notes: 'SW: Ловk8 Разумk10 Харk4 Силk6 Телk8' },
    cardIds: ['ins_scythe_pistol','sig_cyb_bomb','sig_cyb_overclock','sig_cyb_barrage','sig_cyb_destruction'],
  },
];

export function presetById(id: string): PlaytestPreset | undefined {
  return PLAYTEST_PRESETS.find((p) => p.id === id);
}
