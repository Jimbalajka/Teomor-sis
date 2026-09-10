import type { SkillNode, ZoneType } from './types';

const DEG = Math.PI / 180;

const ZONE_ANGLE: Record<Exclude<ZoneType, 'center'>, number> = {
  magic: -135 * DEG,
  strength: -45 * DEG,
  dexterity: 45 * DEG,
  wisdom: 135 * DEG,
};

const R_SPEC = 460;
const R_SCHOOL = 820;
const R_CENTER = 175;
const HIGHWAY_STEP = 168;
const PROF_ALONG = 118;
const PROF_PERP = 112;
const PERP_TIGHT = 46;

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

function centerAngleFor(node: SkillNode, index: number, total: number): number {
  const fixed: Record<string, number> = {
    g_will: -158 * DEG,
    g_grit: 12 * DEG,
    g_swift: 158 * DEG,
    g_lore: -168 * DEG,
    g_hub: -98 * DEG,
    g_path_body: -62 * DEG,
    g_path_mind: -128 * DEG,
    g_path_master: -82 * DEG,
    g_resolve: 38 * DEG,
    g_alert: -32 * DEG,
    g_second_wind: 92 * DEG,
  };
  if (fixed[node.id] !== undefined) return fixed[node.id];
  return -180 * DEG + (index / Math.max(total, 1)) * 360 * DEG;
}

function relaxLayout(source: SkillNode[], minDist = 84, iterations = 3): SkillNode[] {
  const out = source.map((n) => ({ ...n }));
  const locked = new Set<SkillNode['category']>([
    'root',
    'specialization',
    'subcategory',
    'feat_slot',
    'craft_slot',
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
        if (!locked.has(out[i].category)) {
          out[i].x -= Math.round(ux * push);
          out[i].y -= Math.round(uy * push);
        }
        if (!locked.has(out[j].category)) {
          out[j].x += Math.round(ux * push);
          out[j].y += Math.round(uy * push);
        }
      }
    }
  }
  return out;
}

function resolveSchoolId(node: SkillNode, byId: Map<string, SkillNode>, cache: Map<string, string | null>): string | null {
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

/** PoE-шоссе: одна линия на школу, суб-классы — короткие ответвления. */
export function applyHighwayLayout(source: SkillNode[]): SkillNode[] {
  const nodes = source.map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pos = new Map<string, { x: number; y: number }>();
  const angleOf = new Map<string, number>();
  const schoolCache = new Map<string, string | null>();

  pos.set('center_start', { x: 0, y: 0 });
  angleOf.set('center_start', -90 * DEG);

  const centerOthers = nodes.filter(
    (n) =>
      n.zone === 'center' &&
      n.category !== 'root' &&
      n.category !== 'feat_slot' &&
      n.category !== 'craft_slot',
  );
  centerOthers.forEach((n, i) => {
    const a = centerAngleFor(n, i, centerOthers.length);
    const r = n.id.startsWith('g_path') ? R_CENTER + 90 : R_CENTER;
    pos.set(n.id, polar(r, a));
    angleOf.set(n.id, a);
  });

  const featSlots = nodes.filter((n) => n.category === 'feat_slot').sort((a, b) => a.id.localeCompare(b.id));
  featSlots.forEach((n, i) => {
    pos.set(n.id, { x: -980, y: -260 + i * 260 });
    angleOf.set(n.id, 180 * DEG);
  });

  const craftSlots = nodes.filter((n) => n.category === 'craft_slot').sort((a, b) => a.id.localeCompare(b.id));
  craftSlots.forEach((n, i) => {
    pos.set(n.id, { x: 980, y: -260 + i * 260 });
    angleOf.set(n.id, 0);
  });

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
    const spread = Math.min(32 * DEG, (68 * DEG) / Math.max(schools.length, 1));
    schools.forEach((s, i) => {
      const a = base + (i - (schools.length - 1) / 2) * spread;
      pos.set(s.id, polar(R_SCHOOL, a));
      angleOf.set(s.id, a);
    });
  }

  const profByGroup = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    if (n.exclusiveGroup?.startsWith('prof_')) {
      const g = n.exclusiveGroup;
      if (!profByGroup.has(g)) profByGroup.set(g, []);
      profByGroup.get(g)!.push(n);
    }
  }
  for (const list of profByGroup.values()) list.sort((a, b) => a.id.localeCompare(b.id));

  for (const [group, profs] of profByGroup) {
    const schoolId = group.replace('prof_', '');
    const schoolAngle = angleOf.get(schoolId) ?? ZONE_ANGLE[profs[0].zone as Exclude<ZoneType, 'center'>];
    const fork = polar(R_SCHOOL + PROF_ALONG, schoolAngle);
    const perpA = schoolAngle + Math.PI / 2;
    profs.forEach((p, i) => {
      const off = (i - (profs.length - 1) / 2) * PROF_PERP;
      const px = fork.x + Math.round(Math.cos(perpA) * off);
      const py = fork.y + Math.round(Math.sin(perpA) * off);
      pos.set(p.id, { x: px, y: py });
      angleOf.set(p.id, Math.atan2(py, px));
    });
  }

  for (const n of nodes.filter((n) => n.id.startsWith('bridge_'))) {
    const schoolId = n.requirements?.requiredSchool ?? n.requirements?.parentIds?.[0];
    const a = angleOf.get(schoolId ?? '') ?? ZONE_ANGLE[n.zone as Exclude<ZoneType, 'center'>];
    pos.set(n.id, polar(R_SCHOOL + HIGHWAY_STEP * 0.55, a));
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
    const sid = resolveSchoolId(n, byId, schoolCache);
    if (!sid) continue;
    const parentId = n.requirements?.parentIds?.[0];
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent?.exclusiveGroup?.startsWith('prof_')) continue;
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

  for (const n of topoOrder(nodes)) {
    if (pos.has(n.id)) continue;
    const parentId = n.requirements?.parentIds?.[0];
    if (!parentId || !pos.has(parentId)) continue;
    const parent = byId.get(parentId);
    const parentAngle = angleOf.get(parentId) ?? Math.atan2(pos.get(parentId)!.y, pos.get(parentId)!.x);
    const pr = Math.hypot(pos.get(parentId)!.x, pos.get(parentId)!.y) || 1;
    const siblings = childrenOf.get(parentId) ?? [n];
    const idx = siblings.findIndex((s) => s.id === n.id);
    const count = siblings.length;

    if (parent?.exclusiveGroup?.startsWith('prof_')) {
      const arcSpan = Math.min(28 * DEG, Math.max(10 * DEG, count * 5 * DEG));
      const aOff = count <= 1 ? 0 : (idx - (count - 1) / 2) * (arcSpan / (count - 1));
      const childAngle = parentAngle + aOff;
      const step = n.category === 'feat' ? HIGHWAY_STEP * 0.82 : HIGHWAY_STEP * 0.72;
      const nr = pr + step + Math.floor(idx / 4) * 24;
      pos.set(n.id, polar(nr, childAngle));
      angleOf.set(n.id, childAngle);
      continue;
    }

    const arcSpan = Math.min(36 * DEG, Math.max(12 * DEG, count * 5 * DEG));
    const aOff = count <= 1 ? 0 : (idx - (count - 1) / 2) * (arcSpan / (count - 1));
    const childAngle = parentAngle + aOff;
    const step = n.category === 'feat' ? HIGHWAY_STEP * 0.75 : HIGHWAY_STEP * 0.65;
    const nr = pr + step;
    pos.set(n.id, polar(nr, childAngle));
    angleOf.set(n.id, childAngle);
  }

  const placed = nodes.map((n) => {
    const p = pos.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });
  return relaxLayout(placed);
}

/** @deprecated alias */
export const applyPoeLayout = applyHighwayLayout;
