import type { SkillNode, ZoneType } from './types';

const DEG = Math.PI / 180;

const ZONE_ANGLE: Record<Exclude<ZoneType, 'center'>, number> = {
  magic: -135 * DEG,
  strength: -45 * DEG,
  dexterity: 45 * DEG,
  wisdom: 135 * DEG,
};

const R_SPEC = 380;
const R_SCHOOL = 620;
const R_CENTER = 160;
const RING_STEP = 155;

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

function findAnchor(node: SkillNode, byId: Map<string, SkillNode>): { anchorId: string; depth: number; zone: ZoneType } {
  let cur: SkillNode | undefined = node;
  let depth = 0;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    if (cur.category === 'subcategory') return { anchorId: cur.id, depth, zone: cur.zone };
    if (cur.category === 'specialization') return { anchorId: cur.id, depth, zone: cur.zone };
    if (cur.category === 'root') return { anchorId: cur.id, depth, zone: cur.zone };
    const pid = cur.requirements?.parentIds?.[0];
    if (!pid) break;
    depth++;
    cur = byId.get(pid);
  }
  return { anchorId: 'center_start', depth: depth + 1, zone: node.zone };
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


function relaxLayout(source: SkillNode[], minDist = 94, iterations = 10): SkillNode[] {
  const out = source.map((n) => ({ ...n }));
  const locked = new Set<SkillNode['category']>(['root', 'specialization', 'subcategory']);
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const dx = out[j].x - out[i].x;
        const dy = out[j].y - out[i].y;
        const d = Math.hypot(dx, dy) || 1;
        if (d >= minDist) continue;
        const push = (minDist - d) / 2 + 2;
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

export function applyPoeLayout(source: SkillNode[]): SkillNode[] {
  const nodes = source.map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pos = new Map<string, { x: number; y: number }>();
  const anchorAngle = new Map<string, number>();
  pos.set('center_start', { x: 0, y: 0 });
  anchorAngle.set('center_start', -90 * DEG);

  const centerOthers = nodes.filter((n) => n.zone === 'center' && n.category !== 'root');
  centerOthers.forEach((n, i) => {
    const a = centerAngleFor(n, i, centerOthers.length);
    const r = n.id.startsWith('g_path') ? R_CENTER + 70 : R_CENTER;
    pos.set(n.id, polar(r, a));
    anchorAngle.set(n.id, a);
  });

  for (const n of nodes.filter((n) => n.category === 'specialization')) {
    const zone = n.zone as Exclude<ZoneType, 'center'>;
    const a = ZONE_ANGLE[zone];
    pos.set(n.id, polar(R_SPEC, a));
    anchorAngle.set(n.id, a);
  }

  for (const zone of ['magic', 'strength', 'dexterity', 'wisdom'] as const) {
    const schools = nodes
      .filter((n) => n.zone === zone && n.category === 'subcategory')
      .sort((a, b) => a.id.localeCompare(b.id));
    const base = ZONE_ANGLE[zone];
    const spread = Math.min(34 * DEG, (76 * DEG) / Math.max(schools.length, 1));
    schools.forEach((s, i) => {
      const a = base + (i - (schools.length - 1) / 2) * spread;
      pos.set(s.id, polar(R_SCHOOL, a));
      anchorAngle.set(s.id, a);
    });
  }

  const childrenOf = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    for (const pid of n.requirements?.parentIds ?? []) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(n);
    }
  }
  for (const kids of childrenOf.values()) kids.sort((a, b) => a.id.localeCompare(b.id));

  const depthBucket = new Map<string, Map<number, SkillNode[]>>();
  for (const n of nodes) {
    if (pos.has(n.id)) continue;
    const { anchorId, depth } = findAnchor(n, byId);
    if (!depthBucket.has(anchorId)) depthBucket.set(anchorId, new Map());
    const dm = depthBucket.get(anchorId)!;
    if (!dm.has(depth)) dm.set(depth, []);
    dm.get(depth)!.push(n);
  }

  for (const n of topoOrder(nodes)) {
    if (pos.has(n.id)) continue;
    const parentId = n.requirements?.parentIds?.[0];
    if (!parentId) continue;

    const { anchorId, depth } = findAnchor(n, byId);
    const baseA = anchorAngle.get(anchorId) ?? Math.atan2(pos.get(anchorId)?.y ?? 0, pos.get(anchorId)?.x ?? 1);
    const bucket = depthBucket.get(anchorId)?.get(depth) ?? [n];
    const idx = bucket.findIndex((b) => b.id === n.id);
    const count = bucket.length;
    const arcSpan = Math.min(150 * DEG, Math.max(22 * DEG, count * 7.5 * DEG));
    const aOff = count <= 1 ? 0 : (idx - (count - 1) / 2) * (arcSpan / (count - 1));

    let r = R_CENTER;
    const anchorNode = byId.get(anchorId);
    if (anchorNode?.category === 'specialization') r = R_SPEC + depth * RING_STEP;
    else if (anchorNode?.category === 'subcategory') r = R_SCHOOL + depth * RING_STEP;
    else if (anchorNode?.category === 'root') r = R_CENTER + depth * RING_STEP;
    else r = (Math.hypot(pos.get(anchorId)?.x ?? 0, pos.get(anchorId)?.y ?? 0) || R_CENTER) + depth * RING_STEP;

    pos.set(n.id, polar(r, baseA + aOff));
  }

  const placed = nodes.map((n) => {
    const p = pos.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });
  return relaxLayout(placed);
}
