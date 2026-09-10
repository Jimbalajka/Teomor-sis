import type { SkillNode, SkillTreeData, SkillTreeState, ZoneType } from './types';

export type TreeFocus = 'all' | 'my_dar';

const DAR_ZONES: ZoneType[] = ['magic', 'strength', 'dexterity', 'wisdom'];

/** Зоны, где игрок уже инвестировал (дар открыт или есть узлы). */
export function activeDarZones(state: SkillTreeState, data: SkillTreeData): Set<ZoneType> {
  const zones = new Set<ZoneType>(['center']);
  for (const z of DAR_ZONES) {
    if ((state.specializationLevels[z] ?? 0) >= 1) zones.add(z);
  }
  for (const id of state.allocatedNodes) {
    const n = data.nodes.find((x) => x.id === id);
    if (n && n.zone !== 'center') zones.add(n.zone);
  }
  return zones;
}

export function isNodeDimmed(
  node: SkillNode,
  focus: TreeFocus,
  state: SkillTreeState,
  data: SkillTreeData,
): boolean {
  if (focus === 'all') return false;
  if (node.zone === 'center') return false;
  return !activeDarZones(state, data).has(node.zone);
}

export function buildRouteNodeSet(ids: string[], data: SkillTreeData): Set<string> {
  const set = new Set(ids);
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  for (const id of ids) {
    let cur = byId.get(id);
    const seen = new Set<string>();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      set.add(cur.id);
      const pid = cur.requirements?.parentIds?.[0];
      if (!pid) break;
      cur = byId.get(pid);
    }
  }
  set.add('center_start');
  return set;
}

export function isEdgeOnRoute(from: string, to: string, route: Set<string>): boolean {
  return route.has(from) && route.has(to);
}
