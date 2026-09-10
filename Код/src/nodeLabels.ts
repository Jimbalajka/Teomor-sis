import type { SkillNode, ZoneType } from './types';
import type { SkillTreeState } from './types';

/** Ключевая характеристика Дара за каждый уровень специализации. */
export const DAR_STAT: Record<Exclude<ZoneType, 'center'>, string> = {
  magic: 'Разум',
  strength: 'Мощь',
  dexterity: 'Моторика',
  wisdom: 'Стержень',
};

export function nodeBonusLine(node: SkillNode, state: SkillTreeState): string | null {
  if (node.category === 'root') return 'Старт · раса';

  if (node.category === 'specialization') {
    const zone = node.zone as Exclude<ZoneType, 'center'>;
    const stat = DAR_STAT[zone];
    const lvl = state.specializationLevels[zone] ?? 0;
    if (lvl === 0) return `+1 ${stat}/ур · до 10`;
    const extra = lvl >= 3 ? ` · +${Math.floor(lvl / 3)} уст.` : '';
    return `+${lvl} ${stat}${extra}`;
  }

  if (node.category === 'subcategory') {
    return 'Школа · Квель';
  }

  if (node.exclusiveGroup?.startsWith('prof_')) {
    return 'Суб-класс · аспект';
  }

  if (node.category === 'feat_slot') {
    return 'Черта · раз в 4 ур.';
  }

  if (node.category === 'craft_slot') {
    return 'Ремесло · раз в 4 ур.';
  }

  if (node.statModifiers && Object.keys(node.statModifiers).length > 0) {
    const [k, v] = Object.entries(node.statModifiers)[0];
    return `${k} ${v > 0 ? `+${v}` : v}`;
  }

  if (node.category === 'feat') return 'Черта';
  if (node.id.startsWith('bridge_')) return 'Школа · общий';

  return null;
}
