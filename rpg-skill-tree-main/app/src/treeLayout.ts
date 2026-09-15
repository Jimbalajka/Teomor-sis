import type { SkillNode, ZoneType } from './types';

/**
 * Компактные PoE-шоссе (без декоративных гекс-рамок):
 * - 4 квадранта Даров
 * - одна линия (шоссе) от школы наружу
 * - exclusiveGroup = короткая поперечная развилка
 * - без авто-упаковки всех потомков в гекс (она и ломала картинку)
 */
const DEG = Math.PI / 180;

const ZONE_ANGLE: Record<Exclude<ZoneType, 'center'>, number> = {
  magic: -135 * DEG,
  strength: -45 * DEG,
  dexterity: 45 * DEG,
  wisdom: 135 * DEG,
};

const R_RING = 220;
const R_HUB = 150;
const R_SPEC = 380;
const R_SCHOOL = 620;
const HIGHWAY_STEP = 130;
const FORK_ALONG = 110;
const FORK_PERP = 95;
const PERP_TIGHT = 36;

export type ClusterFrameSpec = {
  id: string;
  kind: 'hex' | 'diamond';
  cx: number;
  cy: number;
  r: number;
  zone: ZoneType;
  label?: string;
  anchorIds: string[];
};

/** Рамки отключены — оставляем API, чтобы старые импорты не падали. */
export function getClusterFrames(): ClusterFrameSpec[] {
  return [];
}

function polar(r: number, angle: number) {
  return { x: Math.round(Math.cos(angle) * r), y: Math.round(Math.sin(angle) * r) };
}

function topoOrder(nodes: SkillNode[]): SkillNode[] {
  const pending = new Map(nodes.map((n) => [n.id, n]));
  pending.delete('center_start');
  const placed = new Set(['center_start']);
  const ordered: SkillNode[] = [];
  while (pending.size > 0) {
    let progress = false;
    for (const [id, node] of [...pending]) {
      const parents = node.requirements?.parentIds ?? [];
      if (parents.length === 0 || parents.every((p) => placed.has(p))) {
        ordered.push(node);
        placed.add(id);
        pending.delete(id);
        progress = true;
      }
    }
    if (!progress) {
      ordered.push(...pending.values());
      break;
    }
  }
  return ordered;
}

function resolveSchoolId(
  node: SkillNode,
  byId: Map<string, SkillNode>,
  cache: Map<string, string | null>,
): string | null {
  if (cache.has(node.id)) return cache.get(node.id)!;
  if (node.category === 'subcategory') {
    cache.set(node.id, node.id);
    return node.id;
  }
  for (const pid of node.requirements?.parentIds ?? []) {
    const parent = byId.get(pid);
    if (!parent) continue;
    const sid = resolveSchoolId(parent, byId, cache);
    if (sid) {
      cache.set(node.id, sid);
      return sid;
    }
  }
  cache.set(node.id, null);
  return null;
}

function depthFromSchool(nodeId: string, schoolId: string, byId: Map<string, SkillNode>): number {
  let d = 0;
  let cur = byId.get(nodeId);
  const seen = new Set<string>();
  while (cur && cur.id !== schoolId && !seen.has(cur.id)) {
    seen.add(cur.id);
    d++;
    const pid = cur.requirements?.parentIds?.[0];
    if (!pid) return 999;
    cur = byId.get(pid);
  }
  return cur?.id === schoolId ? d : 999;
}

function placeExclusiveFork(
  members: SkillNode[],
  pos: Map<string, { x: number; y: number }>,
  angleOf: Map<string, number>,
  byId: Map<string, SkillNode>,
  schoolCache: Map<string, string | null>,
  salt = 0,
) {
  members.sort((a, b) => a.id.localeCompare(b.id));
  let schoolId =
    resolveSchoolId(members[0], byId, schoolCache) ??
    (members[0].exclusiveGroup?.startsWith('prof_')
      ? members[0].exclusiveGroup.replace(/^prof_/, '')
      : null);

  const parentCounts = new Map<string, number>();
  for (const m of members) {
    for (const pid of m.requirements?.parentIds ?? []) {
      parentCounts.set(pid, (parentCounts.get(pid) ?? 0) + 1);
    }
  }
  const parentId = [...parentCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  let anchor = schoolId && pos.has(schoolId) ? pos.get(schoolId)! : undefined;
  let anchorAngle =
    (schoolId && angleOf.get(schoolId)) ||
    (anchor ? Math.atan2(anchor.y, anchor.x) : undefined);

  if ((!anchor || anchorAngle === undefined) && parentId && pos.has(parentId)) {
    anchor = pos.get(parentId)!;
    anchorAngle = angleOf.get(parentId) ?? Math.atan2(anchor.y, anchor.x);
  }

  if (!anchor || anchorAngle === undefined) {
    const zone = members[0].zone;
    if (zone === 'center') return;
    anchorAngle = ZONE_ANGLE[zone];
    anchor = polar(R_SCHOOL, anchorAngle);
  }

  const pr = Math.hypot(anchor.x, anchor.y) || R_SCHOOL;
  const fork = polar(pr + FORK_ALONG + salt * 70, anchorAngle);
  const perpA = anchorAngle + Math.PI / 2;
  members.forEach((p, i) => {
    const off = (i - (members.length - 1) / 2) * FORK_PERP;
    const x = fork.x + Math.round(Math.cos(perpA) * off);
    const y = fork.y + Math.round(Math.sin(perpA) * off);
    pos.set(p.id, { x, y });
    angleOf.set(p.id, Math.atan2(y, x));
  });
}

export function applyHighwayLayout(source: SkillNode[]): SkillNode[] {
  const nodes = source.map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pos = new Map<string, { x: number; y: number }>();
  const angleOf = new Map<string, number>();
  const schoolCache = new Map<string, string | null>();

  pos.set('center_start', { x: 0, y: 0 });
  angleOf.set('center_start', -90 * DEG);

  // Центр-компас
  const ring: Array<[string, number]> = [
    ['g_will', -50 * DEG],
    ['g_grit', 20 * DEG],
    ['g_swift', 120 * DEG],
    ['g_lore', -150 * DEG],
    ['g_resolve', 55 * DEG],
    ['g_alert', 155 * DEG],
  ];
  for (const [id, a] of ring) {
    if (!byId.has(id)) continue;
    pos.set(id, polar(R_RING, a));
    angleOf.set(id, a);
  }

  if (byId.has('g_hub')) {
    const hubA = -90 * DEG;
    pos.set('g_hub', polar(R_HUB, hubA));
    angleOf.set('g_hub', hubA);
    const pathIds = ['g_path_mind', 'g_path_master', 'g_path_body'].filter((id) => byId.has(id));
    if (pathIds.length) {
      placeExclusiveFork(
        pathIds.map((id) => byId.get(id)!),
        pos,
        angleOf,
        byId,
        schoolCache,
      );
    }
  }

  if (byId.has('g_second_wind')) {
    pos.set('g_second_wind', polar(R_RING + 120, 90 * DEG));
    angleOf.set('g_second_wind', 90 * DEG);
  }

  for (const n of nodes.filter((n) => n.category === 'specialization')) {
    const zone = n.zone as Exclude<ZoneType, 'center'>;
    const a = ZONE_ANGLE[zone];
    pos.set(n.id, polar(R_SPEC, a));
    angleOf.set(n.id, a);
  }

  for (const zone of ['magic', 'strength', 'dexterity', 'wisdom'] as const) {
    const schools = nodes
      .filter((n) => n.zone === zone && n.category === 'subcategory')
      .sort((a, b) => a.id.localeCompare(b.id));
    const base = ZONE_ANGLE[zone];
    const spread = Math.min(16 * DEG, (55 * DEG) / Math.max(schools.length, 1));
    schools.forEach((s, i) => {
      const a = base + (i - (schools.length - 1) / 2) * spread;
      pos.set(s.id, polar(R_SCHOOL, a));
      angleOf.set(s.id, a);
    });
  }

  // Все exclusiveGroup — поперечные развилки (кроме general_path уже стоят)
  const byEx = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    if (!n.exclusiveGroup) continue;
    if (!byEx.has(n.exclusiveGroup)) byEx.set(n.exclusiveGroup, []);
    byEx.get(n.exclusiveGroup)!.push(n);
  }
  const saltBySchool = new Map<string, number>();
  for (const [gName, members] of byEx) {
    if (gName === 'general_path') continue;
    const sid =
      resolveSchoolId(members[0], byId, schoolCache) ??
      (gName.startsWith('prof_') ? gName.replace(/^prof_/, '') : gName);
    const salt = saltBySchool.get(sid) ?? 0;
    saltBySchool.set(sid, salt + 1);
    placeExclusiveFork(members, pos, angleOf, byId, schoolCache, salt);
  }

  const childrenOf = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    for (const pid of n.requirements?.parentIds ?? []) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(n);
    }
  }
  for (const kids of childrenOf.values()) kids.sort((a, b) => a.id.localeCompare(b.id));

  // Шоссе: узлы без exclusiveGroup по глубине от школы
  const highwayBuckets = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    if (pos.has(n.id)) continue;
    if (n.exclusiveGroup) continue;
    const parentId0 = n.requirements?.parentIds?.[0];
    const parent0 = parentId0 ? byId.get(parentId0) : undefined;
    if (parent0?.exclusiveGroup) continue;
    const sid = resolveSchoolId(n, byId, schoolCache);
    if (!sid) continue;
    const depth = depthFromSchool(n.id, sid, byId);
    if (depth >= 999) continue;
    const key = `${sid}:${depth}`;
    if (!highwayBuckets.has(key)) highwayBuckets.set(key, []);
    highwayBuckets.get(key)!.push(n);
  }

  for (const [key, list] of highwayBuckets) {
    list.sort((a, b) => a.id.localeCompare(b.id));
    const [schoolId, depthStr] = key.split(':');
    const depth = Number(depthStr);
    const a = angleOf.get(schoolId)!;
    const perpA = a + Math.PI / 2;
    const baseR = R_SCHOOL + depth * HIGHWAY_STEP;
    list.forEach((n, i) => {
      const off = list.length <= 1 ? 0 : (i - (list.length - 1) / 2) * PERP_TIGHT;
      pos.set(n.id, {
        x: Math.round(Math.cos(a) * baseR + Math.cos(perpA) * off),
        y: Math.round(Math.sin(a) * baseR + Math.sin(perpA) * off),
      });
      angleOf.set(n.id, a);
    });
  }

  // Остаток вдоль родителя
  for (const n of topoOrder(nodes)) {
    if (pos.has(n.id)) continue;
    if (n.category === 'feat_slot' || n.category === 'craft_slot') continue;
    const parentId = n.requirements?.parentIds?.[0];
    if (!parentId || !pos.has(parentId)) continue;
    const parent = byId.get(parentId);
    const parentAngle =
      angleOf.get(parentId) ?? Math.atan2(pos.get(parentId)!.y, pos.get(parentId)!.x);
    const pr = Math.hypot(pos.get(parentId)!.x, pos.get(parentId)!.y) || 1;
    const siblings = (childrenOf.get(parentId) ?? [n]).filter((s) => !pos.has(s.id) || s.id === n.id);
    const idx = Math.max(0, siblings.findIndex((s) => s.id === n.id));
    const count = Math.max(siblings.length, 1);

    if (parent?.exclusiveGroup) {
      const step = HIGHWAY_STEP * (n.category === 'feat' ? 0.85 : 0.72);
      pos.set(n.id, polar(pr + step + Math.floor(idx / 3) * 24, parentAngle));
      angleOf.set(n.id, parentAngle);
      continue;
    }

    const arcSpan = Math.min(10 * DEG, Math.max(3 * DEG, count * 2 * DEG));
    const aOff = count <= 1 ? 0 : (idx - (count - 1) / 2) * (arcSpan / (count - 1));
    const childAngle = parentAngle + aOff;
    pos.set(n.id, polar(pr + HIGHWAY_STEP * 0.7, childAngle));
    angleOf.set(n.id, childAngle);
  }

  // Слоты за краем
  let maxAbsX = 0;
  for (const p of pos.values()) maxAbsX = Math.max(maxAbsX, Math.abs(p.x));
  const slotX = Math.max(1600, maxAbsX + 280);
  nodes
    .filter((n) => n.category === 'feat_slot')
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((n, i) => {
      pos.set(n.id, { x: -slotX, y: -200 + i * 200 });
    });
  nodes
    .filter((n) => n.category === 'craft_slot')
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((n, i) => {
      pos.set(n.id, { x: slotX, y: -200 + i * 200 });
    });

  const placed = nodes.map((n) => {
    const p = pos.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });

  // Лёгкий развод внутри зоны
  const out = placed.map((n) => ({ ...n }));
  const lockedCat = new Set(['root', 'specialization', 'subcategory', 'feat_slot', 'craft_slot']);
  const minD = 100;
  for (let iter = 0; iter < 8; iter++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        if (out[i].zone !== out[j].zone) continue;
        const dx = out[j].x - out[i].x;
        const dy = out[j].y - out[i].y;
        const d = Math.hypot(dx, dy) || 1;
        if (d >= minD) continue;
        const push = (minD - d) / 2 + 1;
        const ux = dx / d;
        const uy = dy / d;
        if (!lockedCat.has(out[i].category)) {
          out[i].x -= Math.round(ux * push);
          out[i].y -= Math.round(uy * push);
        }
        if (!lockedCat.has(out[j].category)) {
          out[j].x += Math.round(ux * push);
          out[j].y += Math.round(uy * push);
        }
      }
    }
  }

  for (const n of out) {
    n.x = Math.round(n.x / 20) * 20;
    n.y = Math.round(n.y / 20) * 20;
  }

  // точные совпадения
  for (let guard = 0; guard < 30; guard++) {
    const seen = new Map<string, number>();
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      const k = `${out[i].x},${out[i].y}`;
      if (!seen.has(k)) {
        seen.set(k, i);
        continue;
      }
      const a = (guard % 6) * (Math.PI / 3);
      out[i].x += Math.round(Math.cos(a) * 100);
      out[i].y += Math.round(Math.sin(a) * 100);
      out[i].x = Math.round(out[i].x / 20) * 20;
      out[i].y = Math.round(out[i].y / 20) * 20;
      moved = true;
    }
    if (!moved) break;
  }

  return out;
}

/** @deprecated alias */
export const applyPoeLayout = applyHighwayLayout;
