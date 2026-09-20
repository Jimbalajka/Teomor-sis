import type { SkillNode, ZoneType } from './types';

/**
 * PoE-модель: якорь кластера + слоты орбиты.
 * hex  = профессия (центр + до 6 навыков)
 * diamond = углубление (центр + до 4 навыков)
 */
const CELL = 180;
const SNAP = 20;

const DAR_OUT = CELL * 1.2;
const SECTOR_OUT = CELL * 4.0;
const SECTOR_GAP = CELL * 6.5;
const HEX_OUT = CELL * 4.2;
const HEX_GAP = CELL * 6.0;
const HEX_R = CELL * 1.5;
const DEEP_OUT = CELL * 3.6;
const DIA_R = CELL * 1.2;
const HEX_PAD = 58;
const DIA_PAD = 50;

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

let lastClusterFrames: ClusterFrameSpec[] = [];
export function getClusterFrames(): ClusterFrameSpec[] {
  return lastClusterFrames;
}

type BoardZone = Exclude<ZoneType, 'center'>;

function zoneOrigin(zone: BoardZone): { x: number; y: number } {
  switch (zone) {
    case 'magic':
      return { x: -1, y: -1 };
    case 'strength':
      return { x: 1, y: -1 };
    case 'dexterity':
      return { x: 1, y: 1 };
    case 'wisdom':
      return { x: -1, y: 1 };
  }
}

function zonePoint(zone: BoardZone, out: number, along: number): { x: number; y: number } {
  const o = zoneOrigin(zone);
  return {
    x: Math.round(o.x * out + -o.y * along),
    y: Math.round(o.y * out + o.x * along),
  };
}

function snap(v: number): number {
  return Math.round(v / SNAP) * SNAP;
}

function orbitPos(kind: 'hex' | 'diamond', slot: number, r: number): { x: number; y: number } {
  if (kind === 'hex') {
    const i = ((slot % 6) + 6) % 6;
    const a = -Math.PI / 2 + i * (Math.PI / 3);
    return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) };
  }
  const corners = [
    { x: 0, y: -r },
    { x: r, y: 0 },
    { x: 0, y: r },
    { x: -r, y: 0 },
  ];
  return corners[((slot % 4) + 4) % 4];
}

function orbitAngle(kind: 'hex' | 'diamond', slot: number): number {
  if (kind === 'hex') {
    const i = ((slot % 6) + 6) % 6;
    return -Math.PI / 2 + i * (Math.PI / 3);
  }
  return -Math.PI / 2 + (((slot % 4) + 4) % 4) * (Math.PI / 2);
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

function isProfessionHub(n: SkillNode): boolean {
  if (n.hub === 'hex') return true;
  if (n.id.startsWith('st_') || n.id.startsWith('prof_')) return true;
  if (n.exclusiveGroup?.startsWith('prof_')) return true;
  return false;
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

export function applyHighwayLayout(source: SkillNode[]): SkillNode[] {
  const nodes = source.map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pos = new Map<string, { x: number; y: number }>();
  const locked = new Set<string>();
  const draftFrames: ClusterFrameSpec[] = [];

  const put = (id: string, x: number, y: number, lock = true) => {
    pos.set(id, { x: snap(x), y: snap(y) });
    if (lock) locked.add(id);
  };

  put('center_start', 0, 0);
  const centerGrid: Array<[string, number, number]> = [
    ['g_hub', 0, -1],
    ['g_will', -1, -1],
    ['g_grit', 1, -1],
    ['g_lore', -1, 1],
    ['g_swift', 1, 1],
    ['g_resolve', 1, 0],
    ['g_alert', -1, 0],
    ['g_second_wind', 0, 2],
  ];
  for (const [id, cx, cy] of centerGrid) {
    if (byId.has(id)) put(id, cx * CELL, cy * CELL);
  }

  const childrenOf = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    for (const pid of n.requirements?.parentIds ?? []) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(n);
    }
  }
  for (const kids of childrenOf.values()) kids.sort((a, b) => a.id.localeCompare(b.id));

  const stampCluster = (opts: {
    hub: SkillNode;
    cx: number;
    cy: number;
    zone: ZoneType;
    kind: 'hex' | 'diamond';
    ring: SkillNode[];
    sideSign?: number;
  }) => {
    const { hub, cx, cy, zone, kind, ring } = opts;
    const sideSign = opts.sideSign ?? 1;
    const r = kind === 'hex' ? HEX_R : DIA_R;
    const pad = kind === 'hex' ? HEX_PAD : DIA_PAD;
    const maxSlots = kind === 'hex' ? 6 : 4;

    put(hub.id, cx, cy);
    const onRing = ring.slice(0, maxSlots);
    onRing.forEach((n, i) => {
      const off = orbitPos(kind, i, r);
      put(n.id, cx + off.x, cy + off.y);
    });
    draftFrames.push({
      id: `${kind}_${hub.id}`,
      kind,
      cx,
      cy,
      r: Math.round(r + pad),
      zone,
      label: hub.label,
      anchorIds: [hub.id, ...onRing.map((n) => n.id)],
    });

    if (kind === 'hex') {
      onRing.forEach((ringNode, i) => {
        const kids = (childrenOf.get(ringNode.id) ?? []).filter((c) => !pos.has(c.id));
        if (!kids.length) return;
        const a = orbitAngle('hex', i) + sideSign * 0.15;
        const dx = cx + Math.round(Math.cos(a) * DEEP_OUT);
        const dy = cy + Math.round(Math.sin(a) * DEEP_OUT);
        const deepHub = kids[0];
        const deepRing = kids.slice(1, 5);
        put(deepHub.id, dx, dy);
        deepRing.forEach((n, j) => {
          const off = orbitPos('diamond', j, DIA_R);
          put(n.id, dx + off.x, dy + off.y);
        });
        draftFrames.push({
          id: `dia_${hub.id}_${ringNode.id}`,
          kind: 'diamond',
          cx: dx,
          cy: dy,
          r: Math.round(DIA_R + DIA_PAD),
          zone,
          label: deepHub.label,
          anchorIds: [deepHub.id, ...deepRing.map((n) => n.id)],
        });
      });
    }
  };

  const centerPaths = [
    { id: 'g_path_mind', along: -1 },
    { id: 'g_path_master', along: 0 },
    { id: 'g_path_body', along: 1 },
  ] as const;
  for (const { id, along } of centerPaths) {
    const hub = byId.get(id);
    if (!hub) continue;
    const hx = along * CELL * 2.8;
    const hy = -CELL * 2.6;
    const chain: SkillNode[] = [];
    const seen = new Set<string>();
    let frontier = (childrenOf.get(id) ?? []).filter((c) => c.id.startsWith('road_'));
    while (frontier.length) {
      const n = frontier.shift()!;
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      chain.push(n);
      for (const c of childrenOf.get(n.id) ?? []) {
        if (c.id.startsWith('road_') && !seen.has(c.id)) frontier.push(c);
      }
    }
    stampCluster({
      hub,
      cx: hx,
      cy: hy,
      zone: 'center',
      kind: 'hex',
      ring: chain,
      sideSign: along === 0 ? 1 : Math.sign(along),
    });
  }

  const schoolCache = new Map<string, string | null>();

  for (const zone of ['magic', 'strength', 'dexterity', 'wisdom'] as const) {
    const schools = nodes
      .filter((n) => n.zone === zone && n.category === 'subcategory')
      .sort((a, b) => a.id.localeCompare(b.id));

    const spec = nodes.find((n) => n.zone === zone && n.category === 'specialization');
    if (spec) {
      const p = zonePoint(zone, DAR_OUT, 0);
      put(spec.id, p.x, p.y);
    }

    const nSec = Math.max(schools.length, 1);
    schools.forEach((school, si) => {
      const along = (si - (nSec - 1) / 2) * SECTOR_GAP;
      const schoolPos = zonePoint(zone, SECTOR_OUT, along);
      put(school.id, schoolPos.x, schoolPos.y);

      const profs = nodes
        .filter(
          (n) =>
            n.zone === zone &&
            isProfessionHub(n) &&
            resolveSchoolId(n, byId, schoolCache) === school.id,
        )
        .sort((a, b) => a.id.localeCompare(b.id));

      const hubs = profs.length ? profs : [school];
      const side = along === 0 ? 1 : Math.sign(along) || 1;

      hubs.forEach((hub, hi) => {
        // Локальная сетка гексов у школы (не километровая очередь наружу)
        const cols = hubs.length <= 2 ? hubs.length : 2;
        const col = hi % cols;
        const row = Math.floor(hi / cols);
        const localOut = HEX_OUT + row * HEX_GAP;
        const localAlong =
          along + (cols === 1 ? 0 : (col - (cols - 1) / 2) * (HEX_R * 2 + CELL * 2.2));
        const hp = zonePoint(zone, SECTOR_OUT + localOut, localAlong);

        let direct = (childrenOf.get(hub.id) ?? []).filter(
          (c) => !isProfessionHub(c) && c.category !== 'subcategory',
        );
        if (hub.id === school.id && profs.length === 0) {
          direct = (childrenOf.get(school.id) ?? []).filter((c) => !isProfessionHub(c));
        }
        const ring = direct.slice(0, 6);

        stampCluster({
          hub: hub.id === school.id ? school : hub,
          cx: hp.x,
          cy: hp.y,
          zone,
          kind: 'hex',
          ring,
          sideSign: side,
        });
      });

      if (profs.length) {
        const leftover = (childrenOf.get(school.id) ?? []).filter(
          (c) => !pos.has(c.id) && !isProfessionHub(c),
        );
        leftover.slice(0, 6).forEach((c, i) => {
          const off = orbitPos('hex', i, CELL);
          put(c.id, schoolPos.x + off.x, schoolPos.y + off.y);
        });
      }
    });
  }

  for (const n of topoOrder(nodes)) {
    if (pos.has(n.id)) continue;
    if (n.category === 'feat_slot' || n.category === 'craft_slot') continue;
    const parentId = n.requirements?.parentIds?.[0];
    const pp = parentId ? pos.get(parentId) : undefined;
    if (pp) {
      const sibs = (childrenOf.get(parentId!) ?? []).filter(
        (s) => !pos.has(s.id) || s.id === n.id,
      );
      const idx = Math.max(0, sibs.findIndex((s) => s.id === n.id));
      const off = orbitPos('hex', idx, CELL * 1.05);
      put(n.id, pp.x + off.x, pp.y + off.y, false);
      continue;
    }
    if (n.zone !== 'center') {
      const p = zonePoint(n.zone, CELL * 5, 0);
      put(n.id, p.x, p.y, false);
    }
  }

  let maxAbsX = 0;
  for (const p of pos.values()) maxAbsX = Math.max(maxAbsX, Math.abs(p.x));
  const slotX = Math.max(CELL * 20, maxAbsX + CELL * 4);
  nodes
    .filter((n) => n.category === 'feat_slot')
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((n, i) => put(n.id, -slotX, -CELL * 2 + i * CELL * 2));
  nodes
    .filter((n) => n.category === 'craft_slot')
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((n, i) => put(n.id, slotX, -CELL * 2 + i * CELL * 2));

  const outNodes = nodes.map((n) => {
    const p = pos.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });

  for (let guard = 0; guard < 60; guard++) {
    const seen = new Map<string, number>();
    let moved = false;
    for (let i = 0; i < outNodes.length; i++) {
      const k = `${outNodes[i].x},${outNodes[i].y}`;
      if (!seen.has(k)) {
        seen.set(k, i);
        continue;
      }
      if (locked.has(outNodes[i].id)) continue;
      const a = (guard % 6) * (Math.PI / 3);
      outNodes[i].x = snap(outNodes[i].x + Math.cos(a) * CELL);
      outNodes[i].y = snap(outNodes[i].y + Math.sin(a) * CELL);
      moved = true;
    }
    if (!moved) break;
  }

  const byFinal = new Map(outNodes.map((n) => [n.id, n]));
  lastClusterFrames = draftFrames.map((f) => {
    const hub = byFinal.get(f.anchorIds[0]);
    if (hub) return { ...f, cx: hub.x, cy: hub.y };
    return f;
  });

  return outNodes;
}

export const applyPoeLayout = applyHighwayLayout;
