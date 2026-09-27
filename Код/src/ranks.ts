import type { SkillNode, SkillTreeData, SkillTreeState, ZoneType } from './types';
import {
  MASTERY_MAX,
  MASTERY_TIERS_RU,
  SKILL_DICE_LADDER,
} from './skillTreeData';

const CHAR_ZONES: Record<string, ZoneType> = {
  Моторика: 'dexterity',
  Разум: 'magic',
  Стержень: 'wisdom',
  Мощь: 'strength',
};

export function isDiceSkillId(id: string): boolean {
  return id.includes('_dice_');
}

export function masteryLabel(rank: number): string {
  if (rank <= 0) return 'нет';
  return MASTERY_TIERS_RU[Math.min(rank, MASTERY_MAX) - 1] ?? `р${rank}`;
}

export function masteryNext(rank: number): string | null {
  if (rank < 0) return MASTERY_TIERS_RU[0];
  if (rank >= MASTERY_MAX) return null;
  if (rank === 0) return MASTERY_TIERS_RU[0];
  return MASTERY_TIERS_RU[rank] ?? null;
}

export function diceLabel(rank: number): string {
  if (rank <= 0) return 'нет';
  return SKILL_DICE_LADDER[Math.min(rank, SKILL_DICE_LADDER.length) - 1] ?? `р${rank}`;
}

export function diceNext(rank: number): string | null {
  if (rank <= 0) return SKILL_DICE_LADDER[0];
  if (rank >= SKILL_DICE_LADDER.length) return null;
  return SKILL_DICE_LADDER[rank] ?? null;
}

/** Текущий ранг → следующий (для карты и листа). */
export function rankArrow(
  rank: number,
  kind: 'mastery' | 'dice',
): { current: string; next: string | null; text: string } {
  const current = kind === 'dice' ? diceLabel(rank) : masteryLabel(rank);
  const next = kind === 'dice' ? diceNext(rank) : masteryNext(rank);
  return { current, next, text: next ? `${current} → ${next}` : current };
}

export function zoneForChar(char: string): ZoneType | undefined {
  return CHAR_ZONES[char];
}

export function findSkillNode(
  tree: SkillTreeData,
  name: string,
  zone?: ZoneType,
): SkillNode | undefined {
  const all = tree.nodes.filter(
    (n) => n.label === name && (n.id.startsWith('sk_') || n.id.includes('_dice_')),
  );
  if (zone) {
    const hit = all.find((n) => n.zone === zone);
    if (hit) return hit;
  }
  return all[0];
}

/** Ранг с карты (0 = не открыт). */
export function treeSkillRank(
  state: SkillTreeState,
  tree: SkillTreeData,
  name: string,
  zone?: ZoneType,
): { rank: number; node?: SkillNode; dice: boolean } {
  const node = findSkillNode(tree, name, zone);
  if (!node || !state.allocatedNodes.includes(node.id)) {
    return { rank: 0, node, dice: !!node && isDiceSkillId(node.id) };
  }
  return {
    rank: state.nodeLevels[node.id] ?? 1,
    node,
    dice: isDiceSkillId(node.id),
  };
}

export function giftRank(state: SkillTreeState, zone: ZoneType): number {
  return state.specializationLevels[zone] ?? 0;
}
