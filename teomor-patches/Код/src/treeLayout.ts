import type { SkillNode, ZoneType } from './types';

/**
 * PoE-модель:
 *   школа      → центр ГЕКСА, на кольце — навыки школы
 *   суб-проф.  → центр своего РОМБА (не слот на гексе школы)
 *   углубления → углы ромба / следующие ромбы по тому же лучу
 */
const CELL = 200;
const SNAP = 20;

const DAR_OUT = CELL * 1.5;
const SECTOR_OUT = CELL * 7.0;
const HEX_R = CELL * 2.15;
/** Орбита центров ромбов-профессий вокруг гекса школы. */
const PROF_OUT = CELL * 5.4;
const PROF_OUT2 = CELL * 9.2;
const DIA_R = CELL * 1.55;
const HEX_PAD = 62;
const DIA_PAD = 52;

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

function packPriority(n: SkillNode): number {
  if (n.category === 'transit_specialized' && !isProfessionHub(n)) return 1;
  if (n.id.startsWith('ts_')) return 2;
  if (n.id.startsWith('cyb_') || n.id.startsWith('imp_')) return 3;
  if (n.category === 'feat') return 4;
  if (n.isSecret) return 5;
  return 6;
}

function sortPack(a: SkillNode, b: SkillNode): number {
  const d = packPriority(a) - packPriority(b);
  if (d !== 0) return d;
  const ga = a.exclusiveGroup ?? '';
  const gb = b.exclusiveGroup ?? '';
  if (ga !== gb) return ga.localeCompare(gb);
  return a.id.localeCompare(b.id);
}

/** Ширина сектора школы с учётом ромбов профессий вокруг. */
function footprintAlong(memberCount: number, profCount: number): number {
  const byProfs = profCount <= 0 ? CELL * 7 : CELL * 7 + profCount * CELL * 3.2;
  const byMembers = CELL * 6 + memberCount * CELL * 0.45;
  return Math.max(byProfs, byMembers, CELL * 8);
}

function collectDescendants(
  rootId: string,
  childrenOf: Map<string, SkillNode[]>,
  allow: (n: SkillNode) => boolean,
): SkillNode[] {
  const out: SkillNode[] = [];
  const seen = new Set<string>([rootId]);
  const q = [...(childrenOf.get(rootId) ?? [])];
  while (q.length) {
    const n = q.shift()!;
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    if (!allow(n)) {
      q.push(...(childrenOf.get(n.id) ?? []));
      continue;
    }
    out.push(n);
    q.push(...(childrenOf.get(n.id) ?? []));
  }
  return out;
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

  const stampHex = (
    hub: SkillNode,
    cx: number,
    cy: number,
    zone: ZoneType,
    ring: SkillNode[],
  ) => {
    put(hub.id, cx, cy);
    const onRing = ring.slice(0, 6);
    onRing.forEach((n, i) => {
      const off = orbitPos('hex', i, HEX_R);
      put(n.id, cx + off.x, cy + off.y);
    });
    draftFrames.push({
      id: `hex_${hub.id}`,
      kind: 'hex',
      cx,
      cy,
      r: Math.round(HEX_R + HEX_PAD),
      zone,
      label: hub.label,
      anchorIds: [hub.id, ...onRing.map((n) => n.id)],
    });
    return onRing;
  };

  const stampDiamond = (
    hub: SkillNode,
    ring: SkillNode[],
    cx: number,
    cy: number,
    zone: ZoneType,
    frameId: string,
  ) => {
    put(hub.id, cx, cy);
    const onRing = ring.slice(0, 4);
    onRing.forEach((n, i) => {
      const off = orbitPos('diamond', i, DIA_R);
      put(n.id, cx + off.x, cy + off.y);
    });
    draftFrames.push({
      id: frameId,
      kind: 'diamond',
      cx,
      cy,
      r: Math.round(DIA_R + DIA_PAD),
      zone,
      label: hub.label,
      anchorIds: [hub.id, ...onRing.map((n) => n.id)],
    });
  };

  /** Остаток навыков школы — в ромбы по свободным углам (не профессии). */
  const packSkillDiamonds = (
    bagIn: SkillNode[],
    ox: number,
    oy: number,
    zone: ZoneType,
    idPrefix: string,
    preferSlots: number[],
  ) => {
    const bag = [...bagIn].filter((n) => !pos.has(n.id));
    if (!bag.length) return;

    let wave = 0;
    let di = 0;
    while (bag.length) {
      const slot = preferSlots.length ? preferSlots[di % preferSlots.length] : di % 6;
      if (preferSlots.length && di > 0 && di % preferSlots.length === 0) wave += 1;
      if (!preferSlots.length && di > 0 && di % 6 === 0) wave += 1;

      const a = orbitAngle('hex', slot) + (wave > 0 ? 0.2 * (di % 2 === 0 ? 1 : -1) : 0);
      const rNow = wave === 0 ? PROF_OUT : PROF_OUT2 + (wave - 1) * (DIA_R * 2 + CELL);
      const x = ox + Math.round(Math.cos(a) * rNow);
      const y = oy + Math.round(Math.sin(a) * rNow);

      if (bag.length === 1) {
        put(bag.shift()!.id, x, y);
        break;
      }
      if (bag.length === 2) {
        const aN = bag.shift()!;
        const bN = bag.shift()!;
        put(aN.id, x, y);
        const off = orbitPos('diamond', 0, DIA_R);
        put(bN.id, x + off.x, y + off.y);
        break;
      }

      const hub = bag.shift()!;
      let take = Math.min(4, bag.length);
      if (bag.length - take === 1) take = Math.min(3, bag.length);
      const ring = bag.splice(0, take);
      stampDiamond(hub, ring, x, y, zone, `dia_${idPrefix}_${di}`);
      di += 1;
    }
  };

  // ── Центр: пути = гексы с road_* на кольце ─────────────────
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
    stampHex(hub, hx, hy, 'center', chain);
  }

  const schoolCache = new Map<string, string | null>();

  const membersOfSchool = (schoolId: string): SkillNode[] =>
    nodes
      .filter((n) => {
        if (n.id === schoolId) return false;
        if (n.category === 'specialization') return false;
        if (n.zone === 'center') return false;
        if (n.category === 'feat_slot' || n.category === 'craft_slot') return false;
        return resolveSchoolId(n, byId, schoolCache) === schoolId;
      })
      .sort(sortPack);

  /**
   * Школа = гекс (на кольце только навыки школы).
   * Каждая суб-профессия = центр СВОЕГО ромба на орбите.
   */
  const packSchool = (
    school: SkillNode,
    members: SkillNode[],
    cx: number,
    cy: number,
    zone: BoardZone,
    sideSign: number,
  ) => {
    const profs = members.filter(isProfessionHub).sort((a, b) => a.id.localeCompare(b.id));
    const skills = members.filter((n) => !isProfessionHub(n)).sort(sortPack);

    const underProf = new Set<string>();
    const descByProf = new Map<string, SkillNode[]>();
    for (const p of profs) {
      const desc = collectDescendants(p.id, childrenOf, (n) => {
        if (isProfessionHub(n) || n.category === 'subcategory') return false;
        return resolveSchoolId(n, byId, schoolCache) === school.id;
      }).sort(sortPack);
      descByProf.set(p.id, desc);
      for (const d of desc) underProf.add(d.id);
    }

    const schoolSkills = skills.filter((s) => !underProf.has(s.id));
    const ring = schoolSkills.slice(0, 6);
    stampHex(school, cx, cy, zone, ring);
    const restSchool = schoolSkills.slice(6).filter((n) => !pos.has(n.id));

    // Суб-профессии — равномерно по кругу, каждая центр ромба
    const nProf = profs.length;
    const usedSlots = new Set<number>();
    profs.forEach((prof, i) => {
      const a =
        nProf <= 1
          ? -Math.PI / 2 + sideSign * 0.35
          : -Math.PI / 2 + (i / nProf) * Math.PI * 2 + sideSign * 0.08;
      const wave = 0;
      const r = PROF_OUT + wave * (PROF_OUT2 - PROF_OUT);
      const dx = cx + Math.round(Math.cos(a) * r);
      const dy = cy + Math.round(Math.sin(a) * r);

      const desc = (descByProf.get(prof.id) ?? []).filter((d) => !pos.has(d.id));
      const onRing = desc.slice(0, 4);
      stampDiamond(prof, onRing, dx, dy, zone, `dia_prof_${prof.id}`);

      // Переполнение ветки — дальше по тому же лучу
      let overflow = desc.slice(4);
      let w = 1;
      while (overflow.length) {
        if (overflow.length <= 2) {
          const ox = cx + Math.round(Math.cos(a) * (PROF_OUT2 + (w - 1) * (DIA_R * 2 + CELL)));
          const oy = cy + Math.round(Math.sin(a) * (PROF_OUT2 + (w - 1) * (DIA_R * 2 + CELL)));
          if (overflow.length === 1) {
            put(overflow.shift()!.id, ox, oy);
          } else {
            const aN = overflow.shift()!;
            const bN = overflow.shift()!;
            put(aN.id, ox, oy);
            const off = orbitPos('diamond', 0, DIA_R);
            put(bN.id, ox + off.x, oy + off.y);
          }
          break;
        }
        const hub = overflow.shift()!;
        let take = Math.min(4, overflow.length);
        if (overflow.length - take === 1) take = Math.min(3, overflow.length);
        const ring2 = overflow.splice(0, take);
        const ox = cx + Math.round(Math.cos(a) * (PROF_OUT2 + (w - 1) * (DIA_R * 2 + CELL)));
        const oy = cy + Math.round(Math.sin(a) * (PROF_OUT2 + (w - 1) * (DIA_R * 2 + CELL)));
        stampDiamond(hub, ring2, ox, oy, zone, `dia_prof_${prof.id}_w${w}`);
        w += 1;
      }

      // Занять ближайший hex-slot, чтобы school-skill ромбы не сели сверху
      const nearestSlot = ((Math.round(((a + Math.PI / 2) / (Math.PI / 3)) % 6) % 6) + 6) % 6;
      usedSlots.add(nearestSlot);
    });

    const freeSlots = [0, 1, 2, 3, 4, 5].filter((s) => !usedSlots.has(s));
    const prefer = (freeSlots.length ? freeSlots : [0, 1, 2, 3, 4, 5]).map(
      (s) => (s + (sideSign < 0 ? 3 : 0)) % 6,
    );
    packSkillDiamonds(restSchool, cx, cy, zone, school.id, prefer);
  };

  for (const zone of ['magic', 'strength', 'dexterity', 'wisdom'] as const) {
    const schools = nodes
      .filter((n) => n.zone === zone && n.category === 'subcategory')
      .sort((a, b) => a.id.localeCompare(b.id));

    const spec = nodes.find((n) => n.zone === zone && n.category === 'specialization');
    if (spec) {
      const p = zonePoint(zone, DAR_OUT, 0);
      put(spec.id, p.x, p.y);
    }

    const schoolMembers = schools.map((s) => {
      const members = membersOfSchool(s.id);
      return {
        school: s,
        members,
        profs: members.filter(isProfessionHub).length,
      };
    });
    const footprints = schoolMembers.map((s) => footprintAlong(s.members.length, s.profs));
    // Зазор между школами
    const GAP = CELL * 2.5;
    const total = footprints.reduce((a, b) => a + b, 0) + GAP * Math.max(0, schools.length - 1);
    let cursor = -total / 2;

    schoolMembers.forEach(({ school, members, profs }, si) => {
      const fp = footprints[si];
      const along = cursor + fp / 2;
      cursor += fp + GAP;
      const side = along === 0 ? 1 : Math.sign(along) || 1;
      const pushOut =
        members.length > 14 || profs >= 4 ? CELL * 3.2 : members.length > 8 || profs >= 2 ? CELL * 1.6 : 0;
      const hp = zonePoint(zone, SECTOR_OUT + pushOut, along);
      packSchool(school, members, hp.x, hp.y, zone, side);
    });

    const zoneOrphans = nodes.filter((n) => {
      if (n.zone !== zone) return false;
      if (pos.has(n.id)) return false;
      if (n.category === 'specialization' || n.category === 'subcategory') return false;
      if (n.category === 'feat_slot' || n.category === 'craft_slot') return false;
      return true;
    });
    if (zoneOrphans.length) {
      const outward = zonePoint(zone, DAR_OUT + CELL * 4.0, 0);
      packSkillDiamonds(zoneOrphans.sort(sortPack), outward.x, outward.y, zone, `orphan_${zone}`, [
        0, 1, 2, 3,
      ]);
    }
  }

  const still = nodes.filter(
    (n) => !pos.has(n.id) && n.category !== 'feat_slot' && n.category !== 'craft_slot',
  );
  if (still.length) {
    const byZone = new Map<ZoneType, SkillNode[]>();
    for (const n of still) {
      if (!byZone.has(n.zone)) byZone.set(n.zone, []);
      byZone.get(n.zone)!.push(n);
    }
    for (const [zone, bag] of byZone) {
      if (zone === 'center') {
        bag.forEach((n, i) => put(n.id, (i - bag.length / 2) * CELL, CELL * 3.5, false));
        continue;
      }
      const p = zonePoint(zone, SECTOR_OUT + CELL * 14, 0);
      packSkillDiamonds(bag.sort(sortPack), p.x, p.y, zone, `rescue_${zone}`, [0, 1, 2, 3, 4, 5]);
    }
  }

  let maxAbsX = 0;
  for (const p of pos.values()) maxAbsX = Math.max(maxAbsX, Math.abs(p.x));
  const slotX = Math.max(CELL * 26, maxAbsX + CELL * 5);
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

  for (let guard = 0; guard < 80; guard++) {
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

  // Рамки: центр = финальная позиция хаба
  const byFinal = new Map(outNodes.map((n) => [n.id, n]));
  lastClusterFrames = draftFrames.map((f) => {
    const hub = byFinal.get(f.anchorIds[0]);
    if (hub) return { ...f, cx: hub.x, cy: hub.y };
    return f;
  });

  return outNodes;
}

export const applyPoeLayout = applyHighwayLayout;
