import type { SkillNode, ZoneType } from './types';

/**
 * Квадранты + cartesian GRID (как договаривались):
 * - 4 прямоугольных поля, не полярный пирог
 * - внутри только целые клетки (u=глубина, v=полоса)
 * - одинаковый CELL → ровные расстояния как у PoE-сетки
 * - зоны физически не пересекаются (щель GAP вокруг центра)
 */
const CELL = 160;
const GAP = CELL * 4; // отступ квадранта от центра
const STRIDE = 5; // клеток на школу (место под боковой кластер)
const DEG = Math.PI / 180;

type BoardZone = Exclude<ZoneType, 'center'>;

/** u наружу от центра, v поперёк полос школ. */
function zoneToWorld(zone: BoardZone, u: number, v: number): { x: number; y: number } {
  const U = GAP + u * CELL;
  const V = GAP + v * CELL;
  switch (zone) {
    case 'magic':
      return { x: -U, y: -V }; // СЗ
    case 'strength':
      return { x: U, y: -V }; // СВ
    case 'dexterity':
      return { x: U, y: V }; // ЮВ — Змей
    case 'wisdom':
      return { x: -U, y: V }; // ЮЗ — Голубь
  }
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

type Cell = { zone: BoardZone; u: number; v: number };

export function applyHighwayLayout(source: SkillNode[]): SkillNode[] {
  const nodes = source.map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pos = new Map<string, { x: number; y: number }>();
  const cellOf = new Map<string, Cell>();
  const schoolCache = new Map<string, string | null>();
  const schoolV = new Map<string, number>(); // schoolId → базовая полоса v

  const putZone = (id: string, zone: BoardZone, u: number, v: number) => {
    const p = zoneToWorld(zone, u, v);
    pos.set(id, p);
    cellOf.set(id, { zone, u, v });
  };

  // ── Центр: маленькая сетка вокруг (0,0) ────────────────
  pos.set('center_start', { x: 0, y: 0 });

  const centerGrid: Array<[string, number, number]> = [
    ['g_hub', 0, -1],
    ['g_will', -1, -1],
    ['g_grit', 1, -1],
    ['g_lore', -1, 1],
    ['g_swift', 1, 1],
    ['g_resolve', 1, 0],
    ['g_alert', -1, 0],
    ['g_second_wind', 0, 2],
    ['g_path_mind', -1, -2],
    ['g_path_master', 0, -2],
    ['g_path_body', 1, -2],
  ];
  for (const [id, cx, cy] of centerGrid) {
    if (!byId.has(id)) continue;
    pos.set(id, { x: cx * CELL, y: cy * CELL });
  }

  // дороги general path — дальше по сетке центра
  for (const n of nodes) {
    if (n.zone !== 'center' || pos.has(n.id)) continue;
    if (n.category === 'feat_slot' || n.category === 'craft_slot') continue;
    const parentId = n.requirements?.parentIds?.[0];
    const parent = parentId ? pos.get(parentId) : undefined;
    if (!parent) continue;
    // шаг от родителя вверх/наружу по Y− (пути уже на y=-2CELL)
    const siblings = nodes.filter(
      (s) =>
        s.zone === 'center' &&
        !pos.has(s.id) &&
        (s.requirements?.parentIds?.[0] === parentId || s.id === n.id),
    );
    // handled in topo below for remaining center
  }

  // ── Дары — вход в квадрант (u=-1, середина полос) ─────
  for (const zone of ['magic', 'strength', 'dexterity', 'wisdom'] as const) {
    const schools = nodes
      .filter((n) => n.zone === zone && n.category === 'subcategory')
      .sort((a, b) => a.id.localeCompare(b.id));
    schools.forEach((s, i) => {
      const v = i * STRIDE;
      schoolV.set(s.id, v);
      putZone(s.id, zone, 0, v);
    });
    const spec = nodes.find((n) => n.zone === zone && n.category === 'specialization');
    if (spec) {
      const mid = ((schools.length - 1) * STRIDE) / 2;
      putZone(spec.id, zone, -1, mid);
    }
  }

  // ── exclusiveGroup = боковые клетки той же полосы ──────
  const byEx = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    if (!n.exclusiveGroup || n.exclusiveGroup === 'general_path') continue;
    if (!byEx.has(n.exclusiveGroup)) byEx.set(n.exclusiveGroup, []);
    byEx.get(n.exclusiveGroup)!.push(n);
  }
  const saltBySchool = new Map<string, number>();
  for (const [, members] of [...byEx.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    members.sort((a, b) => a.id.localeCompare(b.id));
    const sid =
      resolveSchoolId(members[0], byId, schoolCache) ??
      (members[0].exclusiveGroup?.startsWith('prof_')
        ? members[0].exclusiveGroup!.replace(/^prof_/, '')
        : null);
    const zone = members[0].zone;
    if (zone === 'center') continue;
    const baseV = (sid && schoolV.get(sid)) ?? 0;
    const salt = saltBySchool.get(sid ?? members[0].id) ?? 0;
    saltBySchool.set(sid ?? members[0].id, salt + 1);
    const u = 1 + salt * 2; // кластеры ступеньками наружу
    members.forEach((m, i) => {
      // ствол на v=baseV; кластер на baseV+1, +2, … (бок полосы)
      const v = baseV + 1 + i;
      putZone(m.id, zone, u, v);
    });
  }

  // bridges
  for (const n of nodes.filter((n) => n.id.startsWith('bridge_'))) {
    if (n.zone === 'center') continue;
    const schoolId = n.requirements?.requiredSchool ?? n.requirements?.parentIds?.[0];
    const v = (schoolId && schoolV.get(schoolId)) ?? 0;
    putZone(n.id, n.zone, 1, v);
  }

  const childrenOf = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    for (const pid of n.requirements?.parentIds ?? []) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(n);
    }
  }

  // ── Ствол пути: u = depth, v = schoolV ──────────────────
  for (const n of nodes) {
    if (pos.has(n.id)) continue;
    if (n.zone === 'center') continue;
    if (n.exclusiveGroup) continue;
    const parentId0 = n.requirements?.parentIds?.[0];
    const parent0 = parentId0 ? byId.get(parentId0) : undefined;
    if (parent0?.exclusiveGroup) continue;
    const sid = resolveSchoolId(n, byId, schoolCache);
    if (!sid || !schoolV.has(sid)) continue;
    const depth = depthFromSchool(n.id, sid, byId);
    if (depth >= 999) continue;
    putZone(n.id, n.zone as BoardZone, depth, schoolV.get(sid)!);
  }

  // ── Дети кластера / остаток: соседняя клетка от родителя ─
  for (const n of topoOrder(nodes)) {
    if (pos.has(n.id)) continue;
    const parentId = n.requirements?.parentIds?.[0];
    if (!parentId) continue;

    if (n.zone === 'center') {
      const pp = pos.get(parentId);
      if (!pp) continue;
      const sibs = (childrenOf.get(parentId) ?? []).filter((s) => s.zone === 'center');
      const idx = Math.max(
        0,
        sibs.findIndex((s) => s.id === n.id),
      );
      pos.set(n.id, {
        x: pp.x + (idx - (sibs.length - 1) / 2) * CELL,
        y: pp.y - CELL,
      });
      continue;
    }

    const pc = cellOf.get(parentId);
    if (!pc) continue;
    const parent = byId.get(parentId);
    if (parent?.exclusiveGroup) {
      // углубление — на клетку дальше по u, тот же v
      putZone(n.id, pc.zone, pc.u + 1, pc.v);
    } else {
      putZone(n.id, pc.zone, pc.u + 1, pc.v);
    }
  }

  // слоты
  const featSlots = nodes
    .filter((n) => n.category === 'feat_slot')
    .sort((a, b) => a.id.localeCompare(b.id));
  featSlots.forEach((n, i) => pos.set(n.id, { x: -(GAP + CELL * 14), y: (i - 1) * CELL * 2 }));
  const craftSlots = nodes
    .filter((n) => n.category === 'craft_slot')
    .sort((a, b) => a.id.localeCompare(b.id));
  craftSlots.forEach((n, i) => pos.set(n.id, { x: GAP + CELL * 14, y: (i - 1) * CELL * 2 }));

  // развод точных совпадений — сдвиг по u внутри зоны
  const out = nodes.map((n) => {
    const p = pos.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });

  for (let guard = 0; guard < 60; guard++) {
    const seen = new Map<string, number>();
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      const k = `${out[i].x},${out[i].y}`;
      if (!seen.has(k)) {
        seen.set(k, i);
        continue;
      }
      const c = cellOf.get(out[i].id);
      if (c) {
        const nu = c.u + 1;
        cellOf.set(out[i].id, { ...c, u: nu });
        const p = zoneToWorld(c.zone, nu, c.v);
        out[i].x = p.x;
        out[i].y = p.y;
      } else {
        out[i].x += CELL;
      }
      moved = true;
    }
    if (!moved) break;
  }

  // жёстко держим узел в своём квадранте (без вылета в чужое поле)
  for (const n of out) {
    if (n.zone === 'center' || n.category === 'feat_slot' || n.category === 'craft_slot') continue;
    const z = n.zone as BoardZone;
    let { x, y } = n;
    if (z === 'magic') {
      x = Math.min(x, -GAP);
      y = Math.min(y, -GAP);
    } else if (z === 'strength') {
      x = Math.max(x, GAP);
      y = Math.min(y, -GAP);
    } else if (z === 'dexterity') {
      x = Math.max(x, GAP);
      y = Math.max(y, GAP);
    } else if (z === 'wisdom') {
      x = Math.min(x, -GAP);
      y = Math.max(y, GAP);
    }
    n.x = Math.round(x / CELL) * CELL;
    n.y = Math.round(y / CELL) * CELL;
  }

  // финальный snap на CELL
  for (const n of out) {
    n.x = Math.round(n.x / CELL) * CELL;
    n.y = Math.round(n.y / CELL) * CELL;
  }

  // развод дубликатов клеток внутри квадранта (наружу по оси u)
  for (let guard = 0; guard < 80; guard++) {
    const seen = new Map<string, number>();
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      const k = `${out[i].x},${out[i].y}`;
      if (!seen.has(k)) {
        seen.set(k, i);
        continue;
      }
      const z = out[i].zone;
      if (z === 'magic') {
        out[i].x -= CELL;
        out[i].y -= CELL;
      } else if (z === 'strength') {
        out[i].x += CELL;
        out[i].y -= CELL;
      } else if (z === 'dexterity') {
        out[i].x += CELL;
        out[i].y += CELL;
      } else if (z === 'wisdom') {
        out[i].x -= CELL;
        out[i].y += CELL;
      } else {
        out[i].y -= CELL;
      }
      out[i].x = Math.round(out[i].x / CELL) * CELL;
      out[i].y = Math.round(out[i].y / CELL) * CELL;
      moved = true;
    }
    if (!moved) break;
  }

  return out;
}

/** @deprecated alias */
export const applyPoeLayout = applyHighwayLayout;
