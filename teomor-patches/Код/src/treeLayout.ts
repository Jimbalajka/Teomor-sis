import type { SkillNode, ZoneType } from './types';

const DEG = Math.PI / 180;

/** Оси четырёх Даров — квадранты. */
const ZONE_ANGLE: Record<Exclude<ZoneType, 'center'>, number> = {
  magic: -135 * DEG,
  strength: -45 * DEG,
  dexterity: 45 * DEG,
  wisdom: 135 * DEG,
};

/**
 * PoE-логика (эталон пользователя):
 * - шоссе = линейный ствол пути
 * - развилка/профы = боковой КЛАСТЕР, не каша на стволе
 * - центр редкий (серые общие)
 */
const R_RING = 380;
const R_HUB = 260;
const R_SPEC = 780;
const R_SCHOOL = 1500;
const HIGHWAY_STEP = 280;
const CLUSTER_ALONG = 200;
const CLUSTER_SIDE = 320;
const CLUSTER_ARC = 150;
const FORK_PERP_CENTER = 170;

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
  if (node.id.startsWith('bridge_')) {
    const sid =
      node.requirements?.requiredSchool ?? node.requirements?.parentIds?.[0] ?? null;
    cache.set(node.id, sid);
    return sid;
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

/** Стык на шоссе + кластер сбоку (как ветка/колесо в PoE). */
function placeSideCluster(
  members: SkillNode[],
  pos: Map<string, { x: number; y: number }>,
  angleOf: Map<string, number>,
  byId: Map<string, SkillNode>,
  schoolCache: Map<string, string | null>,
  sideSign: number,
  alongExtra = 0,
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
  const junction = polar(pr + CLUSTER_ALONG + alongExtra, anchorAngle);
  const perpA = anchorAngle + (Math.PI / 2) * sideSign;
  const cx = junction.x + Math.round(Math.cos(perpA) * CLUSTER_SIDE);
  const cy = junction.y + Math.round(Math.sin(perpA) * CLUSTER_SIDE);

  const n = members.length;
  members.forEach((p, i) => {
    const t = n <= 1 ? 0 : (i - (n - 1) / 2) / Math.max(n - 1, 1);
    const alongFan = t * (CLUSTER_ARC * 1.4);
    const outward = CLUSTER_ARC * 0.35;
    const px = cx + Math.round(Math.cos(perpA) * outward + Math.cos(anchorAngle) * alongFan);
    const py = cy + Math.round(Math.sin(perpA) * outward + Math.sin(anchorAngle) * alongFan);
    pos.set(p.id, { x: px, y: py });
    angleOf.set(p.id, Math.atan2(py - junction.y, px - junction.x));
  });
}

function placeHubPathFork(
  members: SkillNode[],
  pos: Map<string, { x: number; y: number }>,
  angleOf: Map<string, number>,
  hubPos: { x: number; y: number },
) {
  const order = ['g_path_mind', 'g_path_master', 'g_path_body'];
  const sorted = [...members].sort(
    (a, b) => order.indexOf(a.id) - order.indexOf(b.id) || a.id.localeCompare(b.id),
  );
  const hubA = -90 * DEG;
  const base = polar(Math.hypot(hubPos.x, hubPos.y) + 200, hubA);
  sorted.forEach((p, i) => {
    const off = (i - (sorted.length - 1) / 2) * FORK_PERP_CENTER;
    const x = base.x + off;
    const y = base.y;
    pos.set(p.id, { x, y });
    angleOf.set(p.id, Math.atan2(y, x));
  });
}

function lightRelax(source: SkillNode[], minDist = 150, iterations = 10): SkillNode[] {
  const out = source.map((n) => ({ ...n }));
  const lockedCat = new Set<SkillNode['category']>([
    'root',
    'specialization',
    'subcategory',
    'feat_slot',
    'craft_slot',
  ]);
  const lockedIds = new Set([
    'g_will',
    'g_grit',
    'g_swift',
    'g_lore',
    'g_hub',
    'g_path_body',
    'g_path_mind',
    'g_path_master',
    'g_resolve',
    'g_alert',
    'g_second_wind',
  ]);
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const dx = out[j].x - out[i].x;
        const dy = out[j].y - out[i].y;
        const d = Math.hypot(dx, dy) || 1;
        if (d >= minDist) continue;
        const push = (minDist - d) / 2 + 1;
        const ux = dx / d;
        const uy = dy / d;
        const lockI = lockedCat.has(out[i].category) || lockedIds.has(out[i].id);
        const lockJ = lockedCat.has(out[j].category) || lockedIds.has(out[j].id);
        if (!lockI) {
          out[i].x -= Math.round(ux * push);
          out[i].y -= Math.round(uy * push);
        }
        if (!lockJ) {
          out[j].x += Math.round(ux * push);
          out[j].y += Math.round(uy * push);
        }
      }
    }
  }
  return out;
}

/** PoE: шоссе → боковой кластер → углубления. Центр редкий. */
export function applyHighwayLayout(source: SkillNode[]): SkillNode[] {
  const nodes = source.map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pos = new Map<string, { x: number; y: number }>();
  const angleOf = new Map<string, number>();
  const schoolCache = new Map<string, string | null>();

  pos.set('center_start', { x: 0, y: 0 });
  angleOf.set('center_start', -90 * DEG);

  const ring: Array<[string, number]> = [
    ['g_will', -50 * DEG],
    ['g_grit', 30 * DEG],
    ['g_swift', 120 * DEG],
    ['g_lore', -150 * DEG],
    ['g_resolve', 60 * DEG],
    ['g_alert', 160 * DEG],
  ];
  for (const [id, a] of ring) {
    if (!byId.has(id)) continue;
    pos.set(id, polar(R_RING, a));
    angleOf.set(id, a);
  }

  if (byId.has('g_hub')) {
    const hubA = -90 * DEG;
    const hubPos = polar(R_HUB, hubA);
    pos.set('g_hub', hubPos);
    angleOf.set('g_hub', hubA);
    const pathIds = ['g_path_mind', 'g_path_master', 'g_path_body']
      .filter((id) => byId.has(id))
      .map((id) => byId.get(id)!);
    if (pathIds.length) placeHubPathFork(pathIds, pos, angleOf, hubPos);
  }

  if (byId.has('g_second_wind')) {
    const a = 90 * DEG;
    pos.set('g_second_wind', polar(R_RING + 220, a));
    angleOf.set('g_second_wind', a);
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
    const spread = Math.min(28 * DEG, (96 * DEG) / Math.max(schools.length, 1));
    schools.forEach((s, i) => {
      const a = base + (i - (schools.length - 1) / 2) * spread;
      const r = R_SCHOOL + (i % 2) * 120;
      pos.set(s.id, polar(r, a));
      angleOf.set(s.id, a);
    });
  }

  const byEx = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    if (!n.exclusiveGroup) continue;
    if (!byEx.has(n.exclusiveGroup)) byEx.set(n.exclusiveGroup, []);
    byEx.get(n.exclusiveGroup)!.push(n);
  }

  const saltBySchool = new Map<string, number>();
  let sideFlip = 1;
  for (const [gName, members] of [...byEx.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (gName === 'general_path') continue;
    const sid =
      resolveSchoolId(members[0], byId, schoolCache) ??
      (gName.startsWith('prof_') ? gName.replace(/^prof_/, '') : gName);
    const salt = saltBySchool.get(sid) ?? 0;
    saltBySchool.set(sid, salt + 1);
    const sign = sideFlip;
    sideFlip *= -1;
    placeSideCluster(members, pos, angleOf, byId, schoolCache, sign, salt * 260);
  }

  for (const n of nodes.filter((n) => n.id.startsWith('bridge_'))) {
    const schoolId = n.requirements?.requiredSchool ?? n.requirements?.parentIds?.[0];
    const a = angleOf.get(schoolId ?? '') ?? ZONE_ANGLE[n.zone as Exclude<ZoneType, 'center'>];
    pos.set(n.id, polar(R_SCHOOL + HIGHWAY_STEP * 0.5, a));
    angleOf.set(n.id, a);
  }

  const childrenOf = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    for (const pid of n.requirements?.parentIds ?? []) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(n);
    }
  }
  for (const kids of childrenOf.values()) kids.sort((a, b) => a.id.localeCompare(b.id));

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
    const schoolR = Math.hypot(pos.get(schoolId)?.x ?? 0, pos.get(schoolId)?.y ?? 0) || R_SCHOOL;
    const baseR = schoolR + depth * HIGHWAY_STEP;
    list.forEach((n, i) => {
      const r = baseR + i * 40;
      pos.set(n.id, polar(r, a));
      angleOf.set(n.id, a);
    });
  }

  for (const n of topoOrder(nodes)) {
    if (pos.has(n.id)) continue;
    const parentId = n.requirements?.parentIds?.[0];
    if (!parentId || !pos.has(parentId)) continue;
    const parent = byId.get(parentId);
    const parentAngle =
      angleOf.get(parentId) ?? Math.atan2(pos.get(parentId)!.y, pos.get(parentId)!.x);
    const pr = Math.hypot(pos.get(parentId)!.x, pos.get(parentId)!.y) || 1;
    const siblings = (childrenOf.get(parentId) ?? [n]).filter(
      (s) => !pos.has(s.id) || s.id === n.id,
    );
    const idx = Math.max(0, siblings.findIndex((s) => s.id === n.id));
    const count = Math.max(siblings.length, 1);

    if (parent?.exclusiveGroup) {
      const step = n.category === 'feat' ? HIGHWAY_STEP * 0.75 : HIGHWAY_STEP * 0.65;
      const fan = count <= 1 ? 0 : (idx - (count - 1) / 2) * 18 * DEG;
      const a = parentAngle + fan;
      const pp = pos.get(parentId)!;
      pos.set(n.id, {
        x: pp.x + Math.round(Math.cos(a) * step),
        y: pp.y + Math.round(Math.sin(a) * step),
      });
      angleOf.set(n.id, a);
      continue;
    }

    const step = n.category === 'feat' ? HIGHWAY_STEP * 0.7 : HIGHWAY_STEP * 0.6;
    const fan = count <= 1 ? 0 : (idx - (count - 1) / 2) * 10 * DEG;
    const a = parentAngle + fan;
    pos.set(n.id, polar(pr + step, a));
    angleOf.set(n.id, a);
  }

  let maxAbsX = 0;
  for (const p of pos.values()) maxAbsX = Math.max(maxAbsX, Math.abs(p.x));
  const slotX = Math.max(2800, maxAbsX + 520);
  nodes
    .filter((n) => n.category === 'feat_slot')
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((n, i) => {
      pos.set(n.id, { x: -slotX, y: -320 + i * 320 });
      angleOf.set(n.id, 180 * DEG);
    });
  nodes
    .filter((n) => n.category === 'craft_slot')
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((n, i) => {
      pos.set(n.id, { x: slotX, y: -320 + i * 320 });
      angleOf.set(n.id, 0);
    });

  const placed = nodes.map((n) => {
    const p = pos.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });
  const relaxed = lightRelax(placed);
  const snapped = relaxed.map((n) => ({
    ...n,
    x: Math.round(n.x / 20) * 20,
    y: Math.round(n.y / 20) * 20,
  }));

  for (let guard = 0; guard < 50; guard++) {
    const cell = new Map<string, number>();
    let moved = false;
    for (let i = 0; i < snapped.length; i++) {
      const k = `${snapped[i].x},${snapped[i].y}`;
      if (!cell.has(k)) {
        cell.set(k, i);
        continue;
      }
      const a = Math.atan2(snapped[i].y || 1, snapped[i].x || 1) + (guard % 4) * (Math.PI / 2);
      snapped[i].x += Math.round(Math.cos(a + Math.PI / 2) * (180 + guard * 20));
      snapped[i].y += Math.round(Math.sin(a + Math.PI / 2) * (180 + guard * 20));
      snapped[i].x = Math.round(snapped[i].x / 20) * 20;
      snapped[i].y = Math.round(snapped[i].y / 20) * 20;
      moved = true;
    }
    if (!moved) break;
  }

  return snapped;
}

/** @deprecated alias */
export const applyPoeLayout = applyHighwayLayout;
