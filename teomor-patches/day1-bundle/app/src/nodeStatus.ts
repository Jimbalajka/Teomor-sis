import type { NodeStatus, SkillNode, SkillTreeState } from './types';

function parentsSatisfied(node: SkillNode, state: SkillTreeState): boolean {
  const parents = node.requirements?.parentIds;
  if (!parents || parents.length === 0) return true;
  return parents.some(
    (id) => id === 'center_start' || state.allocatedNodes.includes(id),
  );
}

function specializationSatisfied(node: SkillNode, state: SkillTreeState): boolean {
  const req = node.requirements?.requiredSpecialization;
  if (!req) return true;
  return (state.specializationLevels[req.zone] ?? 0) >= req.level;
}

function minLevelSatisfied(node: SkillNode, state: SkillTreeState): boolean {
  const min = node.requirements?.minLevel;
  return min == null || state.level >= min;
}

function countCategory(
  cat: SkillNode['category'],
  state: SkillTreeState,
  data: { nodes: SkillNode[] },
): number {
  return state.allocatedNodes.filter(
    (id) => data.nodes.find((n) => n.id === id)?.category === cat,
  ).length;
}

function canAfford(node: SkillNode, state: SkillTreeState): boolean {
  return state.orPoints >= node.cost.amount;
}

type TreeData = { nodes: SkillNode[] };

function slotBlock(
  node: SkillNode,
  state: SkillTreeState,
  data?: TreeData,
): string | null {
  if (node.category !== 'feat_slot' && node.category !== 'craft_slot') return null;
  if (!data) return null;
  const allowed = Math.floor(state.level / 4);
  const used = countCategory(node.category, state, data);
  if (used >= allowed) {
    return node.category === 'feat_slot'
      ? 'Черта доступна раз в 4 уровня'
      : 'Ремесло доступно раз в 4 уровня';
  }
  return null;
}

export function requirementsMet(
  node: SkillNode,
  state: SkillTreeState,
  data?: TreeData,
): boolean {
  return (
    parentsSatisfied(node, state) &&
    specializationSatisfied(node, state) &&
    minLevelSatisfied(node, state) &&
    slotBlock(node, state, data) === null
  );
}

export function getNodeStatus(
  node: SkillNode,
  state: SkillTreeState,
  data?: TreeData,
): NodeStatus {
  if (state.allocatedNodes.includes(node.id)) return 'unlocked';
  if (requirementsMet(node, state, data) && canAfford(node, state))
    return 'available';
  return 'locked';
}

export function blockReason(
  node: SkillNode,
  state: SkillTreeState,
  data?: TreeData,
): string | null {
  if (state.allocatedNodes.includes(node.id)) return 'Уже изучено';
  if (!parentsSatisfied(node, state)) return 'Родительский узел не изучен';
  if (!specializationSatisfied(node, state)) {
    const req = node.requirements!.requiredSpecialization!;
    return `Требуется ${req.level} уровень ветки`;
  }
  if (!minLevelSatisfied(node, state)) {
    return `Требуется ${node.requirements!.minLevel} уровень`;
  }
  const slot = slotBlock(node, state, data);
  if (slot) return slot;
  if (!canAfford(node, state)) return 'Недостаточно ОР';
  return null;
}

export function isHiddenSecret(
  node: SkillNode,
  state: SkillTreeState,
): boolean {
  if (!node.isSecret) return false;
  if (state.allocatedNodes.includes(node.id)) return false;
  if (state.discoveredSecrets.includes(node.id)) return false;
  return !requirementsMet(node, state);
}
