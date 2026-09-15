import type { SkillNode, ZoneType } from './types';

/**
 * Компактные хабы (эталон пользователя):
 * - квадранты зон, без километровых шоссе
 * - профессия в центре гекса, навыки строго на 6 вершинах
 * - углубления = маленький ромб рядом
 * - relax НЕ ломает геометрию хабов
 * - видимые рамки = фиксированный r вокруг хаба
 */
const CELL = 140;
const GAP = CELL * 2.8;
const SCHOOL_GAP = CELL * 6.2;
const SCHOOL_ROW = CELL * 6.8;
const HEX_R = CELL * 1.55; // кольцо навыков
const HUB_GAP = CELL * 4.6;
const DEEP_R = CELL * 1.15;
const DEEP_OUT = HEX_R * 2.55;

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
      return { x: -GAP, y: -GAP };
    case 'strength':
      return { x: GAP, y: -GAP };
    case 'dexterity':
      return { x: GAP, y: GAP };
    case 'wisdom':
      return { x: -GAP, y: GAP };
  }
}

function zonePoint(zone: BoardZone, out: number, along: number): { x: number; y: number } {
  const o = zoneOrigin(zone);
  switch (zone) {
    case 'magic':
      return { x: Math.round(o.x - out), y: Math.round(o.y - along) };
    case 'strength':
      return { x: Math.round(o.x + out), y: Math.round(o.y - along) };
    case 'dexterity':
      return { x: Math.round(o.x + out), y: Math.round(o.y + along) };
    case 'wisdom':
      return { x: Math.round(o.x - out), y: Math.round(o.y + along) };
  }
}

/** Pointy-top: ровно 6 вершин; >6 → второе кольцо. */
function hexOffset(i: number, r: number): { x: number; y: number } {
  const ring = Math.floor(i / 6);
  const slot = i % 6;
  const rr = r * (1 + ring * 0.95);
  const a = -Math.PI / 2 + slot * (Math.PI / 3);
  return { x: Math.round(Math.cos(a) * rr), y: Math.round(Math.sin(a) * rr) };
}

function diamondOffset(i: number, n: number, r: number): { x: number; y: number } {
  if (n <= 4) {
    const corners = [
      { x: 0, y: -r },
      { x: r, y: 0 },
      { x: 0, y: r },
      { x: -r, y: 0 },
    ];
    return corners[i] ?? hexOffset(i, r);
  }
  return hexOffset(i, r);
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
  if (n.exclusiveGroup?.startsWith('prof_')) return true;
  if (
    n.exclusiveGroup?.startsWith('fork_') &&
    n.category === 'transit_specialized' &&
    (n.id.startsWith('prof_') || n.id.startsWith('st_'))
  ) {
    return true;
  }
  return false;
}

function collectDescendants(
  rootId: string,
  _byId: Map<string, SkillNode>,
  childrenOf: Map<string, SkillNode[]>,
): SkillNode[] {
  const out: SkillNode[] = [];
  const stack = [rootId];
  const seen = new Set<string>([rootId]);
  while (stack.length) {
    const id = stack.pop()!;
    for (const c of childrenOf.get(id) ?? []) {
      if (seen.has(c.id)) continue;
      if (isProfessionHub(c) && c.id !== rootId) continue;
      seen.add(c.id);
      out.push(c);
      stack.push(c.id);
    }
  }
  return out;
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
  const locked = new Set<string>(); // не двигаем relax'ом
  const draftFrames: ClusterFrameSpec[] = [];

  const put = (id: string, x: number, y: number, lock = false) => {
    pos.set(id, { x: Math.round(x / 20) * 20, y: Math.round(y / 20) * 20 });
    if (lock) locked.add(id);
  };

  // ── Центр ──────────────────────────────────────────────
  put('center_start', 0, 0, true);
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
    if (byId.has(id)) put(id, cx * CELL, cy * CELL, true);
  }

  const childrenOf = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    for (const pid of n.requirements?.parentIds ?? []) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(n);
    }
  }
  for (const kids of childrenOf.values()) kids.sort((a, b) => a.id.localeCompare(b.id));

  const schoolCache = new Map<string, string | null>();

  for (const zone of ['magic', 'strength', 'dexterity', 'wisdom'] as const) {
    const schools = nodes
      .filter((n) => n.zone === zone && n.category === 'subcategory')
      .sort((a, b) => a.id.localeCompare(b.id));

    const spec = nodes.find((n) => n.zone === zone && n.category === 'specialization');
    if (spec) {
      const mid = ((schools.length - 1) * SCHOOL_GAP) / 2;
      const p = zonePoint(zone, CELL * 0.8, mid);
      put(spec.id, p.x, p.y, true);
    }

    // Школы сеткой 2 колонки — без километровой ленты
    const schoolCols = schools.length <= 3 ? 1 : 2;
    schools.forEach((school, si) => {
      const col = si % schoolCols;
      const row = Math.floor(si / schoolCols);
      const along0 = (col - (schoolCols - 1) / 2) * SCHOOL_GAP;
      const out0 = CELL * 1.6 + row * SCHOOL_ROW;
      const sp = zonePoint(zone, out0, along0);
      put(school.id, sp.x, sp.y, true);

      const schoolDirect = (childrenOf.get(school.id) ?? []).filter((c) => !isProfessionHub(c));

      const allProfs = nodes
        .filter(
          (n) =>
            n.zone === zone &&
            isProfessionHub(n) &&
            resolveSchoolId(n, byId, schoolCache) === school.id,
        )
        .sort((a, b) => a.id.localeCompare(b.id));

      // Кольцо у школы — только прямые не-проф дети (макс 6 на гексе)
      const schoolRing = schoolDirect.filter((c) => !pos.has(c.id)).slice(0, 12);
      schoolRing.forEach((c, i) => {
        const off = hexOffset(i, HEX_R * 0.9);
        put(c.id, sp.x + off.x, sp.y + off.y, true);
      });
      // рамка школы — только если есть кольцо
      if (schoolRing.length > 0) {
        const rings = Math.ceil(schoolRing.length / 6);
        draftFrames.push({
          id: `hex_school_${school.id}`,
          kind: 'hex',
          cx: sp.x,
          cy: sp.y,
          r: Math.round(HEX_R * 0.9 * (1 + (rings - 1) * 0.95) + 48),
          zone,
          label: school.label,
          anchorIds: [school.id, ...schoolRing.map((c) => c.id)],
        });
      }

      allProfs.forEach((hub, hi) => {
        const cols = Math.min(2, Math.max(allProfs.length, 1));
        const row = Math.floor(hi / cols);
        const col = hi % cols;
        const hubAlong = along0 + (col - (cols - 1) / 2) * HUB_GAP;
        const hubOut = out0 + HEX_R * 2.5 + row * (HEX_R * 2.9);
        const hp = zonePoint(zone, hubOut, hubAlong);
        put(hub.id, hp.x, hp.y, true);

        const desc = collectDescendants(hub.id, byId, childrenOf).filter((d) => !pos.has(d.id));

        const deepGroups = new Map<string, SkillNode[]>();
        const ringNodes: SkillNode[] = [];
        for (const d of desc) {
          // углубление = отдельная exclusiveGroup (fork_*), не сам хаб
          if (
            d.exclusiveGroup &&
            d.exclusiveGroup !== hub.exclusiveGroup &&
            (d.exclusiveGroup.startsWith('fork_') || d.category === 'feat')
          ) {
            if (!deepGroups.has(d.exclusiveGroup)) deepGroups.set(d.exclusiveGroup, []);
            deepGroups.get(d.exclusiveGroup)!.push(d);
          } else {
            ringNodes.push(d);
          }
        }

        // гекс: максимум 12 (2 кольца), остальное — во второе кольцо / отбрасываем в deep
        ringNodes.sort((a, b) => a.id.localeCompare(b.id));
        const onHex = ringNodes.slice(0, 12);
        const overflow = ringNodes.slice(12);
        onHex.forEach((d, i) => {
          const off = hexOffset(i, HEX_R);
          put(d.id, hp.x + off.x, hp.y + off.y, true);
        });
        // overflow пристраиваем как мини-ромб «хвост»
        if (overflow.length) {
          deepGroups.set(`__tail_${hub.id}`, overflow);
        }

        const rings = Math.max(1, Math.ceil(onHex.length / 6));
        draftFrames.push({
          id: `hex_${hub.id}`,
          kind: 'hex',
          cx: hp.x,
          cy: hp.y,
          r: Math.round(HEX_R * (1 + (rings - 1) * 0.95) + 52),
          zone,
          label: hub.label,
          anchorIds: [hub.id, ...onHex.map((d) => d.id)],
        });

        let di = 0;
        const deepEntries = [...deepGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        for (const [, members] of deepEntries) {
          members.sort((a, b) => a.id.localeCompare(b.id));
          const a =
            -Math.PI / 2 + di * ((2 * Math.PI) / Math.max(deepEntries.length, 1));
          const cx = hp.x + Math.round(Math.cos(a) * DEEP_OUT);
          const cy = hp.y + Math.round(Math.sin(a) * DEEP_OUT);
          if (members.length === 1) {
            put(members[0].id, cx, cy, true);
          } else {
            members.slice(0, 4).forEach((m, i) => {
              const off = diamondOffset(i, Math.min(members.length, 4), DEEP_R);
              put(m.id, cx + off.x, cy + off.y, true);
            });
            // лишнее — дальше по тому же лучу
            members.slice(4).forEach((m, i) => {
              put(
                m.id,
                cx + Math.round(Math.cos(a) * (DEEP_R * (1.6 + i * 0.7))),
                cy + Math.round(Math.sin(a) * (DEEP_R * (1.6 + i * 0.7))),
                true,
              );
            });
          }
          draftFrames.push({
            id: `dia_${hub.id}_${di}`,
            kind: 'diamond',
            cx,
            cy,
            r: Math.round(DEEP_R + 44),
            zone,
            anchorIds: members.slice(0, 4).map((m) => m.id),
          });
          di++;
        }
      });
    });
  }

  // Остаток — рядом с родителем
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
      const off = hexOffset(idx, CELL * 0.95);
      put(n.id, pp.x + off.x, pp.y + off.y, false);
      continue;
    }
    if (n.zone !== 'center') {
      const p = zonePoint(n.zone, CELL * 3, 0);
      put(n.id, p.x, p.y, false);
    }
  }

  // Слоты
  let maxAbsX = 0;
  for (const p of pos.values()) maxAbsX = Math.max(maxAbsX, Math.abs(p.x));
  const slotX = Math.max(CELL * 16, maxAbsX + CELL * 3);
  nodes
    .filter((n) => n.category === 'feat_slot')
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((n, i) => put(n.id, -slotX, -CELL * 2 + i * CELL * 2, true));
  nodes
    .filter((n) => n.category === 'craft_slot')
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((n, i) => put(n.id, slotX, -CELL * 2 + i * CELL * 2, true));

  const placed = nodes.map((n) => {
    const p = pos.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });

  // Мягкий развод ТОЛЬКО незалоченных (хвосты)
  const out = placed.map((n) => ({ ...n }));
  const minD = CELL * 0.85;
  for (let iter = 0; iter < 10; iter++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        if (out[i].zone !== out[j].zone) continue;
        const dx = out[j].x - out[i].x;
        const dy = out[j].y - out[i].y;
        const d = Math.hypot(dx, dy) || 1;
        if (d >= minD) continue;
        const push = (minD - d) / 2 + 2;
        const ux = dx / d;
        const uy = dy / d;
        if (!locked.has(out[i].id)) {
          out[i].x -= Math.round(ux * push);
          out[i].y -= Math.round(uy * push);
        }
        if (!locked.has(out[j].id)) {
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

  // точные совпадения (даже locked — иначе рамка врёт)
  for (let guard = 0; guard < 40; guard++) {
    const seen = new Map<string, number>();
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      const k = `${out[i].x},${out[i].y}`;
      if (!seen.has(k)) {
        seen.set(k, i);
        continue;
      }
      const a = (guard % 6) * (Math.PI / 3);
      out[i].x += Math.round(Math.cos(a) * CELL);
      out[i].y += Math.round(Math.sin(a) * CELL);
      out[i].x = Math.round(out[i].x / 20) * 20;
      out[i].y = Math.round(out[i].y / 20) * 20;
      moved = true;
    }
    if (!moved) break;
  }

  // Рамки: центр = хаб (первый якорь) после финальных координат; r НЕ раздуваем
  const byFinal = new Map(out.map((n) => [n.id, n]));
  lastClusterFrames = draftFrames.map((f) => {
    const hub = byFinal.get(f.anchorIds[0]);
    if (f.kind === 'hex' && hub) {
      return { ...f, cx: hub.x, cy: hub.y };
    }
    const anchors = f.anchorIds.map((id) => byFinal.get(id)).filter(Boolean) as SkillNode[];
    if (!anchors.length) return f;
    const cx = Math.round(anchors.reduce((s, n) => s + n.x, 0) / anchors.length);
    const cy = Math.round(anchors.reduce((s, n) => s + n.y, 0) / anchors.length);
    return { ...f, cx, cy };
  });

  return out;
}

/** @deprecated alias */
export const applyPoeLayout = applyHighwayLayout;
