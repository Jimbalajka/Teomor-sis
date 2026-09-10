import {
  initialCards,
  loadCatalogFromStorage,
  mergeCatalog,
  saveCatalogToStorage,
} from './cardsData';
import type { ZoneType } from './types';

export interface PlaytestPreset {
  id: string;
  label: string;
  level: number;
  race: string | null;
  allocatedNodes: string[];
  specializationLevels: Partial<Record<ZoneType, number>>;
  orPoints: number;
  cardIds: string[];
}

export const PLAYTEST_PRESETS: PlaytestPreset[] = [
  {
    id: 'sorcerer15',
    label: 'Чародей 15 + иллюзии',
    level: 15,
    race: 'sades',
    allocatedNodes: [
      'center_start',
      'spec_wisdom',
      'sch_witchcraft',
      'st_sorcerer',
      'ts_sor_font',
      'feat_sor_metamagic',
      'ts_sor_draconic',
      'feat_divine_channel',
      'feat_fate_guard',
      'feat_sor_subtle',
      'spec_magic',
      'sch_wizardry',
      'st_illusionist',
    ],
    specializationLevels: {
      center: 0,
      wisdom: 9,
      magic: 3,
      strength: 0,
      dexterity: 0,
    },
    orPoints: 2,
    cardIds: [
      'kvel_potok',
      'asp_fire',
      'asp_lightning',
      'sig_fireball',
      'sig_lightning',
      'sig_counterspell',
      'sig_healing',
      'sig_wings',
    ],
  },
  {
    id: 'warlock_viet14',
    label: 'Колдун + Виэт 14',
    level: 14,
    race: 'sades',
    allocatedNodes: [
      'center_start',
      'spec_strength',
      'sch_viet',
      'ts_viet_stance_def',
      'ts_viet_stance_assault',
      'feat_viet_thunder',
      'feat_viet_charge',
      'ts_viet_wounding',
      'spec_wisdom',
      'sch_witchcraft',
      'st_warlock',
      'feat_wlk_patron_ray',
      'feat_wlk_devils_sight',
      'ts_wlk_occult',
      'ts_wlk_hex',
      'feat_wlk_tongues',
      'ts_pact',
    ],
    specializationLevels: {
      center: 0,
      strength: 5,
      wisdom: 4,
      magic: 0,
      dexterity: 0,
    },
    orPoints: 0,
    cardIds: [
      'sig_glossolalia',
      'sig_evil_eye',
      'sig_viet_charge',
      'sig_wlk_patron_ray',
      'sig_bolt',
    ],
  },
  {
    id: 'cyborg14',
    label: 'Киборг-джухдес 14',
    level: 14,
    race: 'juh_craftsman',
    allocatedNodes: [
      'center_start',
      'spec_dexterity',
      'sch_cybernetics',
      'feat_cyb_cold',
      'ts_cyb_analysis',
      'feat_cyb_glitch',
      'ts_cyb_overclock',
      'ts_cyb_ordnance',
      'ts_cyb_plating',
      'feat_cyb_nanites',
      'ts_cyb_ecm',
      'feat_cyb_optics',
      'spec_strength',
    ],
    specializationLevels: {
      center: 0,
      dexterity: 6,
      strength: 5,
      magic: 0,
      wisdom: 0,
    },
    orPoints: 0,
    cardIds: [
      'ins_scythe_pistol',
      'sig_cyb_bomb',
      'sig_cyb_overclock',
      'sig_cyb_barrage',
      'sig_cyb_destruction',
    ],
  },
];

export function presetById(id: string): PlaytestPreset | undefined {
  return PLAYTEST_PRESETS.find((p) => p.id === id);
}

export function applyPlaytestCatalog(cardIds: string[]): void {
  const current = loadCatalogFromStorage();
  const ensure = initialCards.filter((c) => cardIds.includes(c.id));
  saveCatalogToStorage(mergeCatalog([...current, ...ensure]));
  window.dispatchEvent(new Event('teomor-catalog-updated'));
}
