import type { SkillNode, ZoneType } from './types';
import type { SkillTreeState } from './types';

export const DAR_STAT: Record<Exclude<ZoneType, 'center'>, string> = {
  magic: 'Разум',
  strength: 'Мощь',
  dexterity: 'Моторика',
  wisdom: 'Стержень',
};

export type NodeTier = 'small' | 'medium' | 'large';

export function nodeVisualTier(node: SkillNode): NodeTier {
  if (node.category === 'root' || node.category === 'specialization') return 'large';
  if (node.exclusiveGroup?.startsWith('prof_')) return 'large';
  if (node.category === 'subcategory') return 'medium';
  if (node.category === 'feat_slot' || node.category === 'craft_slot') return 'medium';
  if (node.category === 'feat' && node.exclusiveGroup) return 'large';
  if (node.description?.includes('Оплот')) return 'large';
  if (node.description?.includes('Веха')) return 'medium';
  if (node.category === 'feat') return 'medium';
  if (node.category === 'transit_general' || node.category === 'transit_specialized') {
    if (node.statModifiers && Object.keys(node.statModifiers).length > 0) return 'small';
    return 'medium';
  }
  return 'small';
}

function coldHint(desc: string | undefined): string | null {
  if (!desc) return null;
  const m = desc.match(/Холодные:\s*([^.\n]+)/i);
  return m ? m[1].trim() : null;
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

  if (node.category === 'subcategory') {
    const c = coldHint(node.description);
    return c ? `Школа · хол. ${c}` : `${node.label} · школа`;
  }

  if (node.exclusiveGroup?.startsWith('prof_')) {
    const c = coldHint(node.description);
    if (c) return `Квель · хол. ${c}`;
    if (/живой/i.test(node.description ?? '')) return 'Живой каст · 0–1';
    if (/стойк|●|Виэт/i.test(node.description ?? '')) return 'Квель · ● стойки';
    return `${node.label} · квель`;
  }

  if (node.category === 'feat_slot') return 'Черта · раз в 4 ур.';
  if (node.category === 'craft_slot') return 'Ремесло · раз в 4 ур.';

  if (node.statModifiers && Object.keys(node.statModifiers).length > 0) {
    const [k, v] = Object.entries(node.statModifiers)[0];
    return `${k} ${v > 0 ? `+${v}` : v}`;
  }

  if (node.category === 'feat') {
    if (node.description && node.description.length > 4) {
      return node.description.length > 42
        ? node.description.slice(0, 40) + '…'
        : node.description;
    }
    return 'Черта';
  }

  if (node.id.startsWith('bridge_')) return 'Мост · школа';
  if (node.id.startsWith('ts_viet_stance')) return 'Стойка · ●';

  return null;
}
