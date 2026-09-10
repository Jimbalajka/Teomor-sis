import type { SkillNode, ZoneType } from './types';
import type { SkillTreeState } from './types';

export const DAR_STAT: Record<Exclude<ZoneType, 'center'>, string> = {
  magic: 'Разум',
  strength: 'Мощь',
  dexterity: 'Моторика',
  wisdom: 'Стержень',
};

export type NodeTier = 'small' | 'medium' | 'large';

/** Три размера как в PoE: маленький / веха / оплот. */
export function nodeVisualTier(node: SkillNode): NodeTier {
  if (node.category === 'root' || node.category === 'specialization') return 'large';
  if (node.exclusiveGroup?.startsWith('prof_')) return 'large';
  if (node.category === 'subcategory') return 'medium';
  if (node.category === 'feat_slot' || node.category === 'craft_slot') return 'medium';
  if (node.category === 'feat' && node.exclusiveGroup) return 'large';
  if (node.description?.startsWith('Оплот.') || node.description?.includes('${CHOICE}Оплот')) return 'large';
  if (node.description?.startsWith('Веха.') || node.description?.startsWith('Ноутейбл.')) return 'medium';
  if (node.id.startsWith('road_') && node.cost.amount >= 2) return 'large';
  if (node.category === 'feat') return 'medium';
  if (node.category === 'transit_general' || node.category === 'transit_specialized') {
    if (node.statModifiers && Object.keys(node.statModifiers).length > 0) return 'small';
    return 'medium';
  }
  return 'small';
}

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

  if (node.category === 'subcategory') return 'Школа · Квель';
  if (node.exclusiveGroup?.startsWith('prof_')) return 'Суб-класс · аспект';
  if (node.category === 'feat_slot') return 'Черта · раз в 4 ур.';
  if (node.category === 'craft_slot') return 'Ремесло · раз в 4 ур.';

  if (node.statModifiers && Object.keys(node.statModifiers).length > 0) {
    const [k, v] = Object.entries(node.statModifiers)[0];
    return `${k} ${v > 0 ? `+${v}` : v}`;
  }

  if (node.category === 'feat') return 'Черта';
  if (node.id.startsWith('bridge_')) return 'Школа · общий';
  if (node.id.startsWith('road_')) {
    if (node.description?.includes('Оплот')) return 'Оплот';
    if (node.description?.includes('Веха')) return 'Веха';
    return '+стат';
  }

  return null;
}
