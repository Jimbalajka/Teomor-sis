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
    id: 'arthur15',
    label: 'Артур — чародей/волшебник 15',
    level: 15,
    race: 'sades',
    allocatedNodes: [
      'center_start', 'g_will', 'g_swift', 'g_path_mind',
      'spec_wisdom', 'sch_witchcraft', 'st_sorcerer',
      'ts_sor_font', 'feat_sor_metamagic',
      'feat_meta_careful', 'feat_meta_subtle', 'feat_meta_distant',
      'feat_sor_twinned', 'feat_sor_quickened',
      'ts_sor_spark', 'feat_divine_channel', 'feat_sor_element',
      'spec_magic', 'sch_wizardry', 'st_illusionist', 'ts_concentration',
      'feat_phantasm', 'feat_invis_weave',
    ],
    specializationLevels: { center: 0, wisdom: 9, magic: 4, strength: 0, dexterity: 0 },
    orPoints: 0,
    manualModifiers: {
      Мощь: 0,
      Моторика: 4,
      Разум: 6,
      Стержень: 3,
      Колдовство: 11,
      Волшебство: 7,
      Убеждение: 10,
      Выступление: 10,
      Акробатика: 7,
      'Гуманитарная наука': 6,
      Мистика: 5,
      'Поиск Информации': 5,
      Медицина: 4,
      Внимание: 4,
      Обман: 5,
      Природа: 5,
      Проницательность: 3,
      Выживание: 3,
      Дрессировка: 3,
      Запугивание: 5,
    },
    proficiencies: [
      'Квель Потока · Квель Порталов',
      'Искра Сути · Крылья · Канал искры',
      'Метамагия: все опции (+1 уст. за опцию на каст)',
      'Аспекты: огонь, молния, вода, иллюзия',
      'Посох бесконечной манны: приёмы cost 1–2 без усталости, 1/раунд',
    ],
    nodeChoices: {
      st_illusionist: ['Иллюзия'],
      st_sorcerer: ['Огонь'],
    },
    armorBonus: 0,
    sheetFields: {
      name: 'Артур',
      notes: 'Искра Сути. Раны макс 4–6. Метамагия +1 уст/опция.',
    },
    cardIds: [
      'kvel_potok', 'kvel_portal',
      'asp_fire', 'asp_lightning', 'asp_water', 'asp_illusion',
      'sig_fireball', 'sig_lightning', 'sig_counterspell', 'sig_healing', 'sig_wings',
      'sig_portal_step', 'sig_minor_illusion',
    ],
  },
  {
    id: 'gevorg14',
    label: 'Геворг — пират Виэт 14',
    level: 14,
    race: 'sades',
    allocatedNodes: [
      'center_start', 'g_swift', 'g_lore', 'g_alert',
      'spec_strength', 'sch_viet',
      'ts_viet_stance_assault', 'ts_viet_stance_def', 'ts_viet_stance_trick',
      'feat_viet_thunder', 'feat_viet_charge', 'feat_viet_disarm',
      'feat_viet_rook', 'feat_viet_hare', 'ts_viet_wounding',
    ],
    specializationLevels: { center: 0, strength: 7, wisdom: 0, magic: 1, dexterity: 0 },
    orPoints: 0,
    manualModifiers: {
      Мощь: -1,
      Моторика: 5,
      Разум: -1,
      Стержень: -1,
      Атлетика: -1,
      Акробатика: 10,
      'Ловкость рук': 10,
      Скрытность: 5,
      'Гуманитарная наука': 13,
      'Поиск Информации': 13,
      Волшебство: 3,
      Природа: 3,
      Мистика: 3,
      Внимание: -1,
      Выживание: -1,
      Медицина: -1,
      Дрессировка: -1,
      Проницательность: 4,
      Выступление: 4,
      Запугивание: 9,
      Обман: 9,
      Убеждение: 9,
    },
    proficiencies: [
      'Квель Виэта · ●●● приёмы стойки / отдых',
      'Стойки: Натиска · Змея · Обманная (смена в начале хода)',
      'Дуэльный меч + сабля · Громовой клинок',
      'Сигилы: Натиск ● · Обезоруживание ● · Рокировка ● · Зайчик ●',
      'Ускорение — сигил квеля (усталость 3, не ●)',
    ],
    armorBonus: 1,
    sheetFields: {
      name: 'Геворг',
      notes: 'Виэт 14. ● = 3/отдых. Ускорение — заклинание-сигил.',
    },
    cardIds: [
      'kvel_viet', 'ins_duel_sword', 'ins_saber',
      'sig_viet_charge', 'sig_haste',
    ],
  },
  {
    id: 'rino11',
    label: 'Рино — киборг 11',
    level: 11,
    race: 'juh_craftsman',
    allocatedNodes: [
      'center_start', 'g_lore', 'g_alert',
      'spec_dexterity', 'sch_cybernetics',
      'feat_cyb_glitch', 'ts_cyb_analysis', 'feat_cyb_optics',
      'ts_cyb_plating', 'ts_cyb_ordnance', 'ts_mark_target',
    ],
    specializationLevels: { center: 0, dexterity: 6, strength: 0, magic: 0, wisdom: 0 },
    orPoints: 0,
    manualModifiers: {
      Мощь: 1,
      Моторика: 3,
      Разум: 4,
      Стержень: 3,
      Акробатика: 3,
      Атлетика: 4,
      Скрытность: 7,
      'Ловкость рук': 4,
      Анализ: 4,
      'Дальний бой': 3,
      Импланты: 4,
      'Поиск Информации': 4,
      'Гуманитарная наука': 4,
      Обман: 4,
      Природа: 3,
      Внимание: 3,
      Проницательность: 3,
      Выживание: 5,
      Запугивание: 3,
      Выступление: 3,
      Медицина: 1,
    },
    proficiencies: [
      'Квель Кибер-сети · Щиты 17 (вторая кожа)',
      'Серпы-пистолеты · Скрытый клинок',
      'Оптика: преимущество Внимание и Расследование',
      'Сигилы: сдерживание · ремонт дрона · обстрел',
    ],
    armorBonus: 3,
    sheetFields: {
      name: 'Рино',
      notes: 'Охотник за головами, джухдес. Раны макс ~4. Щиты 17 отдельно.',
    },
    cardIds: [
      'kvel_cyborg', 'ins_scythe_pistol',
      'sig_cyb_restrain', 'sig_cyb_repair', 'sig_cyb_barrage',
    ],
  },
];

export function presetById(id: string): PlaytestPreset | undefined {
  return PLAYTEST_PRESETS.find((p) => p.id === id);
}
