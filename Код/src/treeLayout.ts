import type { SkillNode, ZoneType } from './types';

/**
 * Гибрид (school-pack / LS v39):
 *   один холст — быстрый обзор всего древа
 *   школа      → локальная доска: гекс + ромбы наружу
 *   суб-проф.  → центр своего РОМБА (не слот на гексе школы)
 *   рёбра      → шоссе в SkillTree; длинная паутина parentIds скрыта
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
  kind: 'hex' | 'diamond' | 'circle';
  cx: number;
  cy: number;
  r: number;
  zone: ZoneType;
  label?: string;
  anchorIds: string[];
};

let lastClusterFrames: ClusterFrameSpec[] = [];
/** Рамки из последнего applyPoeLayout (ViewportPortal читает их). */
export function getClusterFrames(_nodes?: SkillNode[]): ClusterFrameSpec[] {
  return lastClusterFrames;
}

/** Рамки по текущим координатам hub-узлов — без сдвига позиций (для LS без relayout). */
export function syncClusterFramesFromNodes(nodes: SkillNode[]): ClusterFrameSpec[] {
  const frames: ClusterFrameSpec[] = [];
  for (const n of nodes) {
    if (n.hub !== 'hex' && n.hub !== 'diamond' && n.hub !== 'circle') continue;
    const r =
      n.hub === 'hex'
        ? Math.round(HEX_R + HEX_PAD)
        : n.hub === 'circle'
          ? Math.round(HEX_R + HEX_PAD)
          : Math.round(DIA_R + DIA_PAD);
    frames.push({
      id: `${n.hub}_${n.id}`,
      kind: n.hub,
      cx: n.x,
      cy: n.y,
      r,
      zone: n.zone,
      label: n.label,
      anchorIds: [n.id],
    });
  }
  // Не затирать рамки из applyPoeLayout пустым sync (старые LS без hub-тегов).
  if (frames.length === 0 && lastClusterFrames.length > 0) return lastClusterFrames;
  lastClusterFrames = frames;
  return frames;
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

/** Ромб-хаб (квель/сигил/аспект-пакет). Имя legacy — packSchool. */
function isProfessionHub(n: SkillNode): boolean {
  if (n.hub === 'diamond') return true;
  if (n.id.startsWith('dia_') || n.id.startsWith('romb_')) return true;
  // legacy
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
  const hubKinds = new Map<string, 'hex' | 'diamond' | 'circle'>();

  const put = (id: string, x: number, y: number, lock = true) => {
    pos.set(id, { x: snap(x), y: snap(y) });
    if (lock) locked.add(id);
  };

  put('center_start', 0, 0);
  const centerGrid: Array<[string, number, number]> = [
    // stub v3 характеристики (мастерство в одном круге)
    ['char_might', 0, -1],
    ['char_mind', -1, 0],
    ['char_motor', 1, 0],
    ['char_core', 0, 1],
    // legacy center (если вдруг вернём старые узлы)
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
    hubKinds.set(hub.id, 'hex');
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
    hubKinds.set(hub.id, 'diamond');
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
    const hub = hubKinds.get(n.id);
    const base = p ? { ...n, x: p.x, y: p.y } : { ...n };
    return hub ? { ...base, hub } : base;
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

/**
 * Stub v3C — плотный кластер на дар (не размазанная дуга на полкарты).
 *
 *   [ромб боевых квелей]  [ромб соц. квелей]
 *   [гекс боевой]         [гекс социальный]
 *                 [ДАР]
 *            ← к центру карты
 */
const STUB_HEX_R = CELL * 2.6;
const STUB_DIA_R = CELL * 2.0;
const STUB_GIFT = CELL * 5.6;
const STUB_HEX_FWD = CELL * 4.4;
const STUB_DIA_FWD = CELL * 10.4; // hexR+diaR+pad ≈ 5.9 CELL → зазор без клипа рамок
const STUB_SIDE = CELL * 5.2; // combat↔social + соседние зоны не цепляются
/** Круг навыков: на луче зоны, между двумя ромбами или чуть дальше. */
const STUB_SKILLS_FWD = STUB_GIFT + STUB_DIA_FWD + CELL * 1.2;
/** Одна орбита, компактно — не две кольца. */
const STUB_SKILLS_R = CELL * 1.85;

export function applyStubV3Layout(source: SkillNode[]): SkillNode[] {
  const nodes = source.map((n) => ({ ...n }));
  const pos = new Map<string, { x: number; y: number }>();
  const frames: ClusterFrameSpec[] = [];
  const hubKinds = new Map<string, 'hex' | 'diamond' | 'circle'>();

  const put = (id: string, x: number, y: number) => {
    pos.set(id, { x: snap(x), y: snap(y) });
  };

  put('center_start', 0, 0);
  // Характеристики больше не в центре — у своего дара (см. placeGiftExtras).

  const childrenOf = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    for (const pid of n.requirements?.parentIds ?? []) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(n);
    }
  }

  const zones: BoardZone[] = ['magic', 'strength', 'dexterity', 'wisdom'];
  const giftAngles: Record<BoardZone, number> = {
    magic: (-135 * Math.PI) / 180,
    strength: (-45 * Math.PI) / 180,
    dexterity: (45 * Math.PI) / 180,
    wisdom: (135 * Math.PI) / 180,
  };

  for (const zone of zones) {
    const gift = nodes.find((n) => n.zone === zone && n.category === 'specialization');
    if (!gift) continue;
    const ga = giftAngles[zone];
    const fx = Math.cos(ga);
    const fy = Math.sin(ga);
    const sx = Math.cos(ga + Math.PI / 2);
    const sy = Math.sin(ga + Math.PI / 2);

    const gx = fx * STUB_GIFT;
    const gy = fy * STUB_GIFT;
    put(gift.id, gx, gy);

    // combat = -side, social = +side (стабильный порядок по key в id)
    const hexCombat = nodes.find((n) => n.id === `hex_${zone}_combat`);
    const hexSocial = nodes.find((n) => n.id === `hex_${zone}_social`);
    const diaCombat = nodes.find((n) => n.id === `dia_${zone}_combat_kvel`);
    const diaSocial = nodes.find((n) => n.id === `dia_${zone}_social_kvel`);

    const placeHex = (hex: SkillNode | undefined, side: number) => {
      if (!hex) return;
      const hx = fx * (STUB_GIFT + STUB_HEX_FWD) + sx * side * STUB_SIDE;
      const hy = fy * (STUB_GIFT + STUB_HEX_FWD) + sy * side * STUB_SIDE;
      put(hex.id, hx, hy);
      hubKinds.set(hex.id, 'hex');
      const skills = (childrenOf.get(hex.id) ?? [])
        .filter((c) => c.hub !== 'diamond')
        .sort((a, b) => {
          const ringOrder = (n: SkillNode) =>
            n.id.startsWith('sk_') ? 0 : n.category === 'feat' ? 2 : 1;
          const d = ringOrder(a) - ringOrder(b);
          return d !== 0 ? d : a.id.localeCompare(b.id);
        })
        .slice(0, 6); // гекс = до 6 кругов на орбите
      const hexR = skills.length > 4 ? STUB_HEX_R * 1.12 : STUB_HEX_R;
      skills.forEach((sk, si) => {
        const off = orbitPos('hex', si, hexR);
        put(sk.id, hx + off.x, hy + off.y);
      });
      frames.push({
        id: `hex_${hex.id}`,
        kind: 'hex',
        cx: hx,
        cy: hy,
        r: Math.round(hexR + HEX_PAD + 8),
        zone,
        label: hex.label,
        anchorIds: [hex.id, ...skills.map((s) => s.id)],
      });
    };

    const placeDia = (dia: SkillNode | undefined, side: number) => {
      if (!dia) return;
      const dx = fx * (STUB_GIFT + STUB_DIA_FWD) + sx * side * STUB_SIDE;
      const dy = fy * (STUB_GIFT + STUB_DIA_FWD) + sy * side * STUB_SIDE;
      put(dia.id, dx, dy);
      hubKinds.set(dia.id, 'diamond');
      const kvels = (childrenOf.get(dia.id) ?? [])
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, 4);
      kvels.forEach((kv, ki) => {
        const off = orbitPos('diamond', ki, STUB_DIA_R);
        put(kv.id, dx + off.x, dy + off.y);
      });
      frames.push({
        id: `dia_${dia.id}`,
        kind: 'diamond',
        cx: dx,
        cy: dy,
        r: Math.round(STUB_DIA_R + DIA_PAD + 8),
        zone,
        label: dia.label,
        anchorIds: [dia.id, ...kvels.map((k) => k.id)],
      });
    };

    placeHex(hexCombat, -1);
    placeHex(hexSocial, 1);
    placeDia(diaCombat, -1);
    placeDia(diaSocial, 1);

    // Характеристик/костей у дара больше нет — кости в круге навыков.

    // Круг навыков: между ромбами / чуть дальше. Одна орбита, равномерно.
    const sheetCircle = nodes.find((n) => n.id === `hex_${zone}_skills`);
    if (sheetCircle) {
      const hx = fx * STUB_SKILLS_FWD;
      const hy = fy * STUB_SKILLS_FWD;
      put(sheetCircle.id, hx, hy);
      hubKinds.set(sheetCircle.id, 'circle');
      const skills = (childrenOf.get(sheetCircle.id) ?? [])
        .filter((c) => c.hub !== 'diamond' && c.hub !== 'hex')
        .sort((a, b) => a.id.localeCompare(b.id));
      const n = Math.max(1, skills.length);
      const rOrbit = STUB_SKILLS_R * (n <= 6 ? 1 : n <= 8 ? 1.08 : n <= 10 ? 1.18 : 1.28);
      skills.forEach((sk, si) => {
        const a = -Math.PI / 2 + (si / n) * Math.PI * 2;
        put(
          sk.id,
          hx + Math.round(Math.cos(a) * rOrbit),
          hy + Math.round(Math.sin(a) * rOrbit),
        );
      });
      frames.push({
        id: `circle_${sheetCircle.id}`,
        kind: 'circle',
        cx: hx,
        cy: hy,
        r: Math.round(rOrbit + HEX_PAD * 0.7),
        zone,
        label: sheetCircle.label,
        anchorIds: [sheetCircle.id, ...skills.map((s) => s.id)],
      });
    }
  }

  for (const n of nodes) {
    if (pos.has(n.id)) continue;
    // Не кидать «хвосты» рандомом — парковать у своего дара
    if (n.zone === 'center') {
      put(n.id, 0, CELL * 2.5);
      continue;
    }
    const a = giftAngles[n.zone as BoardZone] ?? 0;
    put(n.id, Math.cos(a) * (STUB_GIFT + STUB_DIA_FWD + CELL * 3), Math.sin(a) * (STUB_GIFT + STUB_DIA_FWD + CELL * 3));
  }

  const outNodes = nodes.map((n) => {
    const p = pos.get(n.id)!;
    const hub = hubKinds.get(n.id);
    const base = { ...n, x: p.x, y: p.y };
    return hub ? { ...base, hub } : base;
  });

  lastClusterFrames = frames.map((f) => {
    const hub = outNodes.find((n) => n.id === f.anchorIds[0]);
    return hub ? { ...f, cx: hub.x, cy: hub.y } : f;
  });

  return outNodes;
}

export function applyPoeLayout(source: SkillNode[]): SkillNode[] {
  if (source.some((n) => n.id.startsWith('gift_') || n.id.startsWith('hex_'))) {
    return applyStubV3Layout(source);
  }
  return applyHighwayLayout(source);
}
