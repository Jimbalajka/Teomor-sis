import type { SkillNode, ZoneType } from './types';

const DEG = Math.PI / 180;

/**
 * Сетка по зонам (эталон пользователя + PoE):
 * - у каждой зоны свой сектор, узлы НЕ пересекают чужую зону
 * - школы = параллельные «полосы» (lane) с одинаковым шагом
 * - ствол = ровные шаги вдоль полосы
 * - профы = маленький кластер сбоку ВНУТРИ полосы, не в соседнюю зону
 */
const ZONE_ANGLE: Record<Exclude<ZoneType, 'center'>, number> = {
  magic: -135 * DEG,
  strength: -45 * DEG,
  dexterity: 45 * DEG,
  wisdom: 135 * DEG,
};

/** Половина сектора зоны; запас до соседа (Змей↔Голубь = ±90° граница). */
const ZONE_HALF = 38 * DEG;
const GRID = 180; // единый шаг сетки — одинаковые расстояния
const R_RING = GRID * 2;
const R_HUB = GRID * 1.4;
const R_SPEC = GRID * 4;
const R_SCHOOL = GRID * 8;
const LANE = GRID * 2.2; // расстояние между школами (полосами)
const CLUSTER_ACROSS = GRID * 1.6; // увод кластера поперёк полосы
const CLUSTER_STEP = GRID; // шаг между членами кластера вдоль
const FORK_HUB = GRID;

function polar(r: number, angle: number) {
  return { x: Math.round(Math.cos(angle) * r), y: Math.round(Math.sin(angle) * r) };
}

/** Локальные (along, across) → мир в системе зоны/полосы. */
function fromLane(along: number, across: number, angle: number) {
  return {
    x: Math.round(Math.cos(angle) * along - Math.sin(angle) * across),
    y: Math.round(Math.sin(angle) * along + Math.cos(angle) * across),
  };
}

function clampAngleToZone(angle: number, zone: Exclude<ZoneType, 'center'>): number {
  const base = ZONE_ANGLE[zone];
  // кратчайшая разница
  let d = angle - base;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const clamped = Math.max(-ZONE_HALF, Math.min(ZONE_HALF, d));
  return base + clamped;
}

function snapToZone(x: number, y: number, zone: Exclude<ZoneType, 'center'>) {
  const r = Math.hypot(x, y) || 1;
  const a = clampAngleToZone(Math.atan2(y, x), zone);
  return polar(r, a);
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

type LaneInfo = { angle: number; across: number; along0: number; zone: Exclude<ZoneType, 'center'> };

/**
 * Кластер ВНУТРИ полосы школы: across уводится к центру полосы (не к чужой зоне).
 * sideSign: +1 = дальше от оси зоны наружу, -1 = к оси — берём знак от across школы.
 */
function placeGridCluster(
  members: SkillNode[],
  pos: Map<string, { x: number; y: number }>,
  angleOf: Map<string, number>,
  lanes: Map<string, LaneInfo>,
  byId: Map<string, SkillNode>,
  schoolCache: Map<string, string | null>,
  depthAlong: number,
) {
  members.sort((a, b) => a.id.localeCompare(b.id));
  const schoolId =
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

  let lane =
    (schoolId && lanes.get(schoolId)) ||
    (parentId && lanes.get(parentId)) ||
    undefined;

  // fallback: зона узла
  if (!lane) {
    const zone = members[0].zone;
    if (zone === 'center') return;
    lane = { angle: ZONE_ANGLE[zone], across: 0, along0: R_SCHOOL, zone };
  }

  // уводим кластер от оси зоны наружу по знаку across полосы (крайние школы — наружу)
  const outward = lane.across === 0 ? 1 : Math.sign(lane.across);
  const clusterAcross = lane.across + outward * CLUSTER_ACROSS;
  const baseAlong = lane.along0 + depthAlong;

  members.forEach((p, i) => {
    const t = i - (members.length - 1) / 2;
    const along = baseAlong + Math.abs(t) * (GRID * 0.15);
    const across = clusterAcross + t * CLUSTER_STEP;
    const pt = fromLane(along, across, lane!.angle);
    const clamped = snapToZone(pt.x, pt.y, lane!.zone);
    pos.set(p.id, clamped);
    angleOf.set(p.id, Math.atan2(clamped.y, clamped.x));
    // дети кластера наследуют lane с их across
    lanes.set(p.id, {
      angle: lane!.angle,
      across,
      along0: along,
      zone: lane!.zone,
    });
  });
}

export function applyHighwayLayout(source: SkillNode[]): SkillNode[] {
  const nodes = source.map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pos = new Map<string, { x: number; y: number }>();
  const angleOf = new Map<string, number>();
  const schoolCache = new Map<string, string | null>();
  const lanes = new Map<string, LaneInfo>();

  pos.set('center_start', { x: 0, y: 0 });
  angleOf.set('center_start', -90 * DEG);

  // ── Центр: ровное кольцо ───────────────────────────────
  const ring: Array<[string, number]> = [
    ['g_will', -45 * DEG],
    ['g_grit', 45 * DEG],
    ['g_swift', 135 * DEG],
    ['g_lore', -135 * DEG],
    ['g_resolve', 90 * DEG],
    ['g_alert', 180 * DEG],
  ];
  // g_resolve/alert чуть дальше по сетке
  for (const [id, a] of ring) {
    if (!byId.has(id)) continue;
    const r = id === 'g_resolve' || id === 'g_alert' ? R_RING + GRID : R_RING;
    pos.set(id, polar(r, a));
    angleOf.set(id, a);
  }

  if (byId.has('g_hub')) {
    const hubA = -90 * DEG;
    pos.set('g_hub', polar(R_HUB, hubA));
    angleOf.set('g_hub', hubA);
    const order = ['g_path_mind', 'g_path_master', 'g_path_body'];
    const paths = order.map((id) => byId.get(id)).filter(Boolean) as SkillNode[];
    const baseAlong = R_HUB + GRID * 1.2;
    paths.forEach((p, i) => {
      const across = (i - (paths.length - 1) / 2) * FORK_HUB;
      const pt = fromLane(baseAlong, across, hubA);
      pos.set(p.id, pt);
      angleOf.set(p.id, Math.atan2(pt.y, pt.x));
    });
  }

  if (byId.has('g_second_wind')) {
    pos.set('g_second_wind', polar(R_RING + GRID * 2, 90 * DEG));
    angleOf.set('g_second_wind', 90 * DEG);
  }

  // ── Дары на осях зон ───────────────────────────────────
  for (const n of nodes.filter((n) => n.category === 'specialization')) {
    const zone = n.zone as Exclude<ZoneType, 'center'>;
    const a = ZONE_ANGLE[zone];
    pos.set(n.id, polar(R_SPEC, a));
    angleOf.set(n.id, a);
  }

  // ── Школы: параллельные полосы с равным LANE ───────────
  for (const zone of ['magic', 'strength', 'dexterity', 'wisdom'] as const) {
    const schools = nodes
      .filter((n) => n.zone === zone && n.category === 'subcategory')
      .sort((a, b) => a.id.localeCompare(b.id));
    const base = ZONE_ANGLE[zone];
    schools.forEach((s, i) => {
      const across = (i - (schools.length - 1) / 2) * LANE;
      // along одинаковый — ровная «линейка» школ
      const along = R_SCHOOL;
      const pt = fromLane(along, across, base);
      const clamped = snapToZone(pt.x, pt.y, zone);
      pos.set(s.id, clamped);
      angleOf.set(s.id, base); // угол полосы = ось зоны (параллельные шоссе)
      lanes.set(s.id, { angle: base, across, along0: along, zone });
    });
  }

  // ── exclusiveGroup = кластеры на сетке внутри полосы ───
  const byEx = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    if (!n.exclusiveGroup) continue;
    if (!byEx.has(n.exclusiveGroup)) byEx.set(n.exclusiveGroup, []);
    byEx.get(n.exclusiveGroup)!.push(n);
  }
  const saltBySchool = new Map<string, number>();
  for (const [gName, members] of [...byEx.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (gName === 'general_path') continue;
    const sid =
      resolveSchoolId(members[0], byId, schoolCache) ??
      (gName.startsWith('prof_') ? gName.replace(/^prof_/, '') : gName);
    const salt = saltBySchool.get(sid) ?? 0;
    saltBySchool.set(sid, salt + 1);
    placeGridCluster(members, pos, angleOf, lanes, byId, schoolCache, GRID * (1.2 + salt * 1.5));
  }

  for (const n of nodes.filter((n) => n.id.startsWith('bridge_'))) {
    const schoolId = n.requirements?.requiredSchool ?? n.requirements?.parentIds?.[0];
    const lane = schoolId ? lanes.get(schoolId) : undefined;
    if (lane) {
      const pt = fromLane(lane.along0 + GRID * 0.6, lane.across, lane.angle);
      pos.set(n.id, snapToZone(pt.x, pt.y, lane.zone));
      angleOf.set(n.id, lane.angle);
      lanes.set(n.id, { ...lane, along0: lane.along0 + GRID * 0.6 });
    }
  }

  const childrenOf = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    for (const pid of n.requirements?.parentIds ?? []) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(n);
    }
  }
  for (const kids of childrenOf.values()) kids.sort((a, b) => a.id.localeCompare(b.id));

  // ── Ствол на сетке: along += GRID * depth, across = lane ─
  const highwayBuckets = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    if (pos.has(n.id)) continue;
    if (n.exclusiveGroup) continue;
    const parentId0 = n.requirements?.parentIds?.[0];
    const parent0 = parentId0 ? byId.get(parentId0) : undefined;
    if (parent0?.exclusiveGroup) continue;
    const sid = resolveSchoolId(n, byId, schoolCache);
    if (!sid || !lanes.has(sid)) continue;
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
    const lane = lanes.get(schoolId)!;
    list.forEach((n, i) => {
      const along = lane.along0 + depth * GRID + i * (GRID * 0.25);
      const pt = fromLane(along, lane.across, lane.angle);
      const clamped = snapToZone(pt.x, pt.y, lane.zone);
      pos.set(n.id, clamped);
      angleOf.set(n.id, lane.angle);
      lanes.set(n.id, { ...lane, along0: along });
    });
  }

  // ── Дети кластера: дальше по along той же across-полосы ─
  for (const n of topoOrder(nodes)) {
    if (pos.has(n.id)) continue;
    const parentId = n.requirements?.parentIds?.[0];
    if (!parentId || !pos.has(parentId)) continue;
    const parent = byId.get(parentId);
    const parentLane = lanes.get(parentId);
    const zone = n.zone === 'center' ? null : (n.zone as Exclude<ZoneType, 'center'>);

    if (parent?.exclusiveGroup && parentLane) {
      const siblings = (childrenOf.get(parentId) ?? [n]).filter(
        (s) => !pos.has(s.id) || s.id === n.id,
      );
      const idx = Math.max(0, siblings.findIndex((s) => s.id === n.id));
      const across = parentLane.across + (idx - (siblings.length - 1) / 2) * (GRID * 0.5);
      const along = parentLane.along0 + GRID;
      const pt = fromLane(along, across, parentLane.angle);
      const clamped = snapToZone(pt.x, pt.y, parentLane.zone);
      pos.set(n.id, clamped);
      angleOf.set(n.id, parentLane.angle);
      lanes.set(n.id, { ...parentLane, across, along0: along });
      continue;
    }

    // center roads / прочее
    if (n.zone === 'center') {
      const pp = pos.get(parentId)!;
      const a = angleOf.get(parentId) ?? Math.atan2(pp.y, pp.x);
      const pr = Math.hypot(pp.x, pp.y) + GRID;
      pos.set(n.id, polar(pr, a));
      angleOf.set(n.id, a);
      continue;
    }

    if (zone) {
      const a = angleOf.get(parentId) ?? ZONE_ANGLE[zone];
      const pp = pos.get(parentId)!;
      const pr = Math.hypot(pp.x, pp.y) + GRID;
      const clamped = snapToZone(Math.cos(a) * pr, Math.sin(a) * pr, zone);
      pos.set(n.id, clamped);
      angleOf.set(n.id, a);
    }
  }

  // Финальный clamp ВСЕХ зонных узлов — Змей не лезет в Голубя
  for (const n of nodes) {
    if (n.zone === 'center') continue;
    if (n.category === 'feat_slot' || n.category === 'craft_slot') continue;
    const p = pos.get(n.id);
    if (!p) continue;
    const c = snapToZone(p.x, p.y, n.zone);
    pos.set(n.id, c);
  }

  // слоты
  let maxAbsX = 0;
  for (const p of pos.values()) maxAbsX = Math.max(maxAbsX, Math.abs(p.x));
  const slotX = Math.max(GRID * 18, maxAbsX + GRID * 3);
  nodes
    .filter((n) => n.category === 'feat_slot')
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((n, i) => pos.set(n.id, { x: -slotX, y: -GRID * 2 + i * GRID * 2 }));
  nodes
    .filter((n) => n.category === 'craft_slot')
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((n, i) => pos.set(n.id, { x: slotX, y: -GRID * 2 + i * GRID * 2 }));

  // Лёгкий развод ТОЛЬКО внутри той же зоны (не толкаем через границу)
  const out = nodes.map((n) => {
    const p = pos.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });
  const lockedCat = new Set<SkillNode['category']>([
    'root',
    'specialization',
    'subcategory',
    'feat_slot',
    'craft_slot',
  ]);
  for (let iter = 0; iter < 8; iter++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        if (out[i].zone !== out[j].zone) continue; // разные зоны не толкают друг друга
        const dx = out[j].x - out[i].x;
        const dy = out[j].y - out[i].y;
        const d = Math.hypot(dx, dy) || 1;
        if (d >= GRID * 0.85) continue;
        const push = (GRID * 0.85 - d) / 2 + 1;
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

  // снова clamp после relax
  for (const n of out) {
    if (n.zone === 'center' || n.category === 'feat_slot' || n.category === 'craft_slot') continue;
    const c = snapToZone(n.x, n.y, n.zone);
    n.x = c.x;
    n.y = c.y;
  }

  // snap to grid
  for (const n of out) {
    n.x = Math.round(n.x / (GRID / 2)) * (GRID / 2);
    n.y = Math.round(n.y / (GRID / 2)) * (GRID / 2);
  }

  // точные дубликаты — сдвиг вдоль своей полосы
  for (let guard = 0; guard < 40; guard++) {
    const cell = new Map<string, number>();
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      const k = `${out[i].x},${out[i].y}`;
      if (!cell.has(k)) {
        cell.set(k, i);
        continue;
      }
      if (out[i].zone !== 'center' && out[i].zone !== 'feat_slot' as never) {
        const a = ZONE_ANGLE[out[i].zone as Exclude<ZoneType, 'center'>];
        out[i].x += Math.round(Math.cos(a) * GRID);
        out[i].y += Math.round(Math.sin(a) * GRID);
        const c = snapToZone(out[i].x, out[i].y, out[i].zone as Exclude<ZoneType, 'center'>);
        out[i].x = Math.round(c.x / (GRID / 2)) * (GRID / 2);
        out[i].y = Math.round(c.y / (GRID / 2)) * (GRID / 2);
      } else {
        out[i].x += GRID;
      }
      moved = true;
    }
    if (!moved) break;
  }

  return out;
}

/** @deprecated alias */
export const applyPoeLayout = applyHighwayLayout;
