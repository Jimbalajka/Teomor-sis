import type { ZoneType } from './types';
import type { AbilityRow } from './abilitiesTable';
import { abilitiesFromCardIds, mergeAbilityRows } from './abilitiesTable';

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
  abilities?: AbilityRow[];
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
      'ts_sor_spark', 'feat_sor_element',
      'spec_magic', 'sch_wizardry', 'st_illusionist', 'ts_concentration',
      'feat_phantasm', 'feat_invis_weave',
    ],
    specializationLevels: { center: 0, wisdom: 9, magic: 4, strength: 0, dexterity: 0 },
    orPoints: 0,
    manualModifiers: {
      Мощь: 0, Моторика: 4, Разум: 6, Стержень: 3,
      Колдовство: 11, Волшебство: 7, Убеждение: 10, Выступление: 10,
      Акробатика: 7, 'Гуманитарная наука': 6, Мистика: 5,
      'Поиск Информации': 5, Медицина: 4, Внимание: 4,
      Обман: 5, Природа: 5, Проницательность: 3,
      Выживание: 3, Дрессировка: 3, Запугивание: 5,
    },
    proficiencies: ['Акробатика', 'Выступление', 'Колдовство', 'Убеждение'],
    nodeChoices: { st_illusionist: ['Иллюзия'], st_sorcerer: ['Огонь'] },
    armorBonus: 0,
    sheetFields: { name: 'Артур', notes: 'Искра Сути. Посох: приёмы 1–2 уст. бесплатно 1/раунд.' },
    cardIds: [
      'kvel_potok', 'kvel_portal', 'kvel_istok',
      'asp_fire', 'asp_lightning', 'asp_water', 'asp_illusion',
      'sig_fireball', 'sig_lightning', 'sig_counterspell', 'sig_healing', 'sig_wings',
      'sig_portal_step', 'sig_minor_illusion', 'sig_misty_step', 'sig_polymorph',
      'sig_dispel', 'sig_shield', 'sig_magic_missile',
    ],
    abilities: [
      { name: 'Искра Сути', kvel: 'Поток', action: '—', cost: '—', note: '+1 макс. ран. Живой каст.' },
      { name: 'Метамагия', kvel: '—', action: 'на каст', cost: '+1 уст.', note: 'Одна опция: акуратная / незаметная / дальняя / двойная / ускоренная.' },
      { name: 'Посох бесконечной манны', kvel: '—', action: '—', cost: '—', note: 'Приёмы cost 1–2 без усталости, 1 раз за раунд.' },
    ],
  },
  {
    id: 'gevorg14',
    label: 'Геворг — колдун/Виэт 14',
    level: 14,
    race: 'sades',
    allocatedNodes: [
      'center_start', 'g_swift', 'g_lore', 'g_alert',
      'spec_strength', 'sch_viet',
      'ts_viet_stance_assault', 'ts_viet_stance_def', 'ts_viet_stance_trick',
      'ts_viet_wounding',
      'spec_wisdom', 'sch_witchcraft', 'st_warlock',
      'ts_pact', 'feat_wlk_devils_sight', 'ts_wlk_hex', 'ts_wlk_occult',
    ],
    specializationLevels: { center: 0, strength: 7, wisdom: 5, magic: 0, dexterity: 0 },
    orPoints: 0,
    manualModifiers: {
      Мощь: -1, Моторика: 5, Разум: -1, Стержень: -1,
      Атлетика: -1, Акробатика: 10, 'Ловкость рук': 10, Скрытность: 5,
      'Гуманитарная наука': 13, 'Поиск Информации': 13,
      Колдовство: 3, Природа: 3, Мистика: 3,
      Внимание: -1, Выживание: -1, Медицина: -1, Дрессировка: -1,
      Проницательность: 4, Выступление: 4,
      Запугивание: 9, Обман: 9, Убеждение: 9,
    },
    proficiencies: ['Акробатика', 'Ловкость рук', 'История', 'Колдовство'],
    armorBonus: 1,
    sheetFields: { name: 'Геворг', notes: 'Колдун + Виэт. ● = 3/отдых. Громовой клинок = аспект + сигил.' },
    cardIds: [
      'kvel_viet', 'kvel_pact', 'ins_duel_sword', 'ins_saber',
      'asp_lightning', 'sig_thunder_blade', 'sig_viet_assault', 'sig_viet_disarm',
      'sig_viet_rook', 'sig_viet_hare', 'sig_haste',
      'sig_wlk_patron_ray', 'sig_evil_eye', 'sig_glossolalia', 'sig_misty_step',
    ],
    abilities: [
      { name: 'Стойки Виэта', kvel: 'Виэт', action: 'начало хода', cost: '—', note: 'Нatiска / Змея / Обманная — одна активна.' },
      { name: '● приёмы стойки', kvel: 'Виэт', action: '●', cost: '3/отдых', note: 'Нatiск, обезоруживание, рокировка, зайчик — сигилы квеля.' },
    ],
  },
  {
    id: 'rino14',
    label: 'Рино — киборг 14',
    level: 14,
    race: 'juh_craftsman',
    allocatedNodes: [
      'center_start', 'g_lore', 'g_alert',
      'spec_dexterity', 'sch_cybernetics',
      'feat_cyb_glitch', 'ts_cyb_analysis', 'feat_cyb_optics',
      'ts_cyb_plating', 'ts_cyb_ordnance', 'ts_cyb_overclock', 'ts_mark_target',
    ],
    specializationLevels: { center: 0, dexterity: 7, strength: 0, magic: 0, wisdom: 0 },
    orPoints: 0,
    manualModifiers: {
      Мощь: 1, Моторика: 3, Разум: 4, Стержень: 3,
      Акробатика: 3, Атлетика: 4, Скрытность: 7, 'Ловкость рук': 4,
      Анализ: 4, 'Дальний бой': 3, Импланты: 4,
      'Поиск Информации': 4, 'Гуманитарная наука': 4,
      Обман: 4, Природа: 3, Внимание: 3, Проницательность: 3,
      Выживание: 5, Запугивание: 3, Выступление: 3, Медицина: 1,
    },
    proficiencies: ['Серпы-пистолеты', 'Скрытность', 'Анализ'],
    armorBonus: 3,
    sheetFields: { name: 'Rino', notes: 'Caçador de recompensas. Escudos 17 (Segunda Pele). Ranas máx ~4.' },
    cardIds: [
      'kvel_cyborg', 'ins_scythe_pistol', 'ins_hidden_blade',
      'sig_cyb_restrain', 'sig_cyb_repair', 'sig_cyb_barrage',
      'sig_cyb_absorb', 'sig_cyb_target_lock', 'sig_cyb_confusion', 'sig_cyb_second_skin',
    ],
    abilities: [
      { name: 'Armamento Integrado', kvel: 'Ciborgue', action: '—', cost: '—', note: 'Serpes-pistolas + lâmina oculta integrados.' },
      { name: 'Ópticas Aprimoradas', kvel: 'Ciborgue', action: '—', cost: '—', note: 'Vantagem em Percepção e Investigação.' },
      { name: 'Segunda Pele', kvel: 'Ciborgue', action: '—', cost: '—', note: '17 pontos de escudo; resistência física com escudos.' },
      { name: 'Protocolo Restritivo', kvel: 'Ciborgue', action: '2', cost: '2 уст.', note: 'Rede/energia 9 células. STER vs CD 13.' },
      { name: 'Confusão Coordenada', kvel: 'Ciborgue', action: '1', cost: '1 уст.', note: 'Feint para você e droide aliado.' },
      { name: 'Absorver Energia', kvel: 'Ciborgue', action: 'реакция', cost: '1 уст.', note: 'Absorve dano de efeito de área.' },
      { name: 'Reparar Droid', kvel: 'Ciborgue', action: '1', cost: '1 уст.', note: '1–2 ranas em constructo aliado.' },
      { name: 'Bloqueio de Alvo', kvel: 'Ciborgue', action: '1', cost: '1 уст.', note: 'Vantagem no próximo ataque à distância contra alvo.' },
    ],
  },
];

export function presetById(id: string): PlaytestPreset | undefined {
  return PLAYTEST_PRESETS.find((p) => p.id === id);
}

export function savePresetAbilities(preset: PlaytestPreset): void {
  const rows = mergeAbilityRows(abilitiesFromCardIds(preset.cardIds), preset.abilities ?? []);
  localStorage.setItem('teomor_abilities_v1', JSON.stringify(rows));
  window.dispatchEvent(new Event('teomor-abilities-updated'));
}
