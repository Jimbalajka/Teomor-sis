import type { SkillNode, ZoneType } from './types';

/**
 * Хабы-гексы (эталон пользователя после квадрантов):
 * - зона = компактное поле, не «километровая линейка»
 * - профессия = центр гексагона, вокруг общие навыки ветки
 * - углубление = ромб/малый кластер рядом с гексом
 * - длинные цепочки (колдовство и т.п.) сворачиваются в хабы
 */
const CELL = 150;
const GAP = CELL * 3;
const SCHOOL_GAP = CELL * 9; // между школами в квадранте — место под гексы
const HEX_R = CELL * 1.35; // радиус кольца вокруг профессии
const HUB_GAP = CELL * 4.2; // между профессиями-хабами одной школы
const DEEP_R = CELL * 1.2; // ромб углубления

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

/** Наружу от центра + «вдоль» полос школ внутри квадранта. */
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

function hexOffset(i: number, n: number, r: number): { x: number; y: number } {
  // равномерно по кругу (гекс = 6; если больше — плотное кольцо)
  const slots = Math.max(n, 6);
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / slots;
  return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) };
}

function diamondOffset(i: number, n: number, r: number): { x: number; y: number } {
  // ромб: 4 угла; если больше — кольцо поменьше
  if (n <= 4) {
    const corners = [
      { x: 0, y: -r },
      { x: r, y: 0 },
      { x: 0, y: r },
      { x: -r, y: 0 },
    ];
    return corners[i] ?? hexOffset(i, n, r);
  }
  return hexOffset(i, n, r);
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

function collectDescendants(
  rootId: string,
  byId: Map<string, SkillNode>,
  childrenOf: Map<string, SkillNode[]>,
): SkillNode[] {
  const out: SkillNode[] = [];
  const stack = [rootId];
  const seen = new Set<string>([rootId]);
  while (stack.length) {
    const id = stack.pop()!;
    for (const c of childrenOf.get(id) ?? []) {
      if (seen.has(c.id)) continue;
      // не заходим в чужой profession-hub того же уровня
      if (
        c.exclusiveGroup?.startsWith('prof_') &&
        c.id !== rootId &&
        byId.get(rootId)?.exclusiveGroup?.startsWith('prof_')
      ) {
        continue;
      }
      seen.add(c.id);
      out.push(c);
      stack.push(c.id);
    }
  }
  return out;
}

export function applyHighwayLayout(source: SkillNode[]): SkillNode[] {
  const nodes = source.map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pos = new Map<string, { x: number; y: number }>();

  const put = (id: string, x: number, y: number) => {
    pos.set(id, { x: Math.round(x / 20) * 20, y: Math.round(y / 20) * 20 });
  };

  // ── Центр ──────────────────────────────────────────────
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
    ['g_path_mind', -1, -2],
    ['g_path_master', 0, -2],
    ['g_path_body', 1, -2],
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

  const schoolCache = new Map<string, string | null>();

  // ── По зонам: школа → хабы профессий (гекс) → ромбы углублений ──
  for (const zone of ['magic', 'strength', 'dexterity', 'wisdom'] as const) {
    const schools = nodes
      .filter((n) => n.zone === zone && n.category === 'subcategory')
      .sort((a, b) => a.id.localeCompare(b.id));

    const spec = nodes.find((n) => n.zone === zone && n.category === 'specialization');
    if (spec) {
      const mid = ((schools.length - 1) * SCHOOL_GAP) / 2;
      const p = zonePoint(zone, CELL, mid);
      put(spec.id, p.x, p.y);
    }

    schools.forEach((school, si) => {
      const along0 = si * SCHOOL_GAP;
      const sp = zonePoint(zone, CELL * 2, along0);
      put(school.id, sp.x, sp.y);

      // навыки школы до выбора профессии (не exclusive prof_)
      const schoolDirect = (childrenOf.get(school.id) ?? []).filter(
        (c) => !c.exclusiveGroup?.startsWith('prof_'),
      );
      // профессии этой школы
      const profs = (childrenOf.get(school.id) ?? []).filter((c) =>
        c.exclusiveGroup?.startsWith('prof_'),
      );
      // также prof_ через промежуточный transit (аристократ: ts → prof)
      const nestedProfs: SkillNode[] = [];
      for (const mid of schoolDirect) {
        for (const c of childrenOf.get(mid.id) ?? []) {
          if (c.exclusiveGroup?.startsWith('prof_') || c.exclusiveGroup?.startsWith('fork_')) {
            // fork_arist сидит на mid; сами prof_* — хабы
            if (c.exclusiveGroup.startsWith('prof_') || c.id.startsWith('prof_') || c.id.startsWith('st_')) {
              if (c.exclusiveGroup?.startsWith('prof_') || c.exclusiveGroup?.startsWith('fork_')) {
                nestedProfs.push(c);
              }
            }
          }
        }
      }
      // точнее: все потомки с exclusiveGroup prof_* или (fork_* и category transit)
      const allProfs = nodes.filter((n) => {
        if (n.zone !== zone) return false;
        if (resolveSchoolId(n, byId, schoolCache) !== school.id) return false;
        if (n.exclusiveGroup?.startsWith('prof_')) return true;
        // развилка профессий без pref prof_ (fork_arist и т.п.) — тоже хабы, если это «выбор класса»
        if (
          n.exclusiveGroup?.startsWith('fork_') &&
          n.category === 'transit_specialized' &&
          (n.id.startsWith('prof_') || n.id.startsWith('st_'))
        ) {
          return true;
        }
        return false;
      });

      // кольцо навыков прямо у школы (общие до/вне профы)
      const schoolRing = schoolDirect.filter(
        (c) => !allProfs.some((p) => p.id === c.id) && !pos.has(c.id),
      );
      schoolRing.forEach((c, i) => {
        const off = hexOffset(i, Math.max(schoolRing.length, 3), HEX_R * 0.85);
        put(c.id, sp.x + off.x, sp.y + off.y);
      });

      // хабы профессий — компактный ряд/дуга рядом со школой
      const hubs = allProfs.sort((a, b) => a.id.localeCompare(b.id));
      hubs.forEach((hub, hi) => {
        const cols = Math.min(3, hubs.length);
        const row = Math.floor(hi / cols);
        const col = hi % cols;
        const hubAlong = along0 + (col - (cols - 1) / 2) * HUB_GAP;
        const hubOut = CELL * 2 + HEX_R * 2.2 + row * (HEX_R * 2.6);
        const hp = zonePoint(zone, hubOut, hubAlong);
        put(hub.id, hp.x, hp.y);

        const desc = collectDescendants(hub.id, byId, childrenOf).filter((d) => !pos.has(d.id));

        // углубления = exclusiveGroup feat-форки и группы
        const deepGroups = new Map<string, SkillNode[]>();
        const ringNodes: SkillNode[] = [];
        for (const d of desc) {
          if (d.exclusiveGroup && d.exclusiveGroup !== hub.exclusiveGroup) {
            if (!deepGroups.has(d.exclusiveGroup)) deepGroups.set(d.exclusiveGroup, []);
            deepGroups.get(d.exclusiveGroup)!.push(d);
          } else {
            ringNodes.push(d);
          }
        }

        // гекс вокруг профессии
        ringNodes.sort((a, b) => a.id.localeCompare(b.id));
        ringNodes.forEach((d, i) => {
          const off = hexOffset(i, Math.max(ringNodes.length, 6), HEX_R);
          put(d.id, hp.x + off.x, hp.y + off.y);
        });

        // ромбы углублений — снаружи гекса
        let di = 0;
        for (const [, members] of [...deepGroups.entries()].sort((a, b) =>
          a[0].localeCompare(b[0]),
        )) {
          members.sort((a, b) => a.id.localeCompare(b.id));
          const a = -Math.PI / 2 + di * ((2 * Math.PI) / Math.max(deepGroups.size, 1));
          const cx = hp.x + Math.round(Math.cos(a) * (HEX_R * 3.0));
          const cy = hp.y + Math.round(Math.sin(a) * (HEX_R * 3.0));
          // центр ромба можно оставить пустым — члены на углах;
          // если один член — он в центре ромба
          if (members.length === 1) {
            put(members[0].id, cx, cy);
          } else {
            members.forEach((m, i) => {
              const off = diamondOffset(i, members.length, DEEP_R);
              put(m.id, cx + off.x, cy + off.y);
            });
          }
          di++;
        }
      });
    });
  }

  // ── Остаток (не размещён) — рядом с родителем / школой ──
  for (const n of topoOrder(nodes)) {
    if (pos.has(n.id)) continue;
    if (n.category === 'feat_slot' || n.category === 'craft_slot') continue;
    const parentId = n.requirements?.parentIds?.[0];
    const pp = parentId ? pos.get(parentId) : undefined;
    if (pp) {
      const sibs = (childrenOf.get(parentId!) ?? []).filter((s) => !pos.has(s.id) || s.id === n.id);
      const idx = Math.max(0, sibs.findIndex((s) => s.id === n.id));
      const off = hexOffset(idx, Math.max(sibs.length, 4), CELL);
      put(n.id, pp.x + off.x, pp.y + off.y);
      continue;
    }
    if (n.zone !== 'center') {
      const p = zonePoint(n.zone, CELL * 4, 0);
      put(n.id, p.x, p.y);
    }
  }

  // center leftovers
  for (const n of topoOrder(nodes)) {
    if (pos.has(n.id) || n.zone !== 'center') continue;
    if (n.category === 'feat_slot' || n.category === 'craft_slot') continue;
    const parentId = n.requirements?.parentIds?.[0];
    const pp = parentId ? pos.get(parentId) : { x: 0, y: 0 };
    if (!pp) continue;
    put(n.id, pp.x, pp.y - CELL);
  }

  // слоты
  nodes
    .filter((n) => n.category === 'feat_slot')
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((n, i) => put(n.id, -(GAP + CELL * 12), (i - 1) * CELL * 2));
  nodes
    .filter((n) => n.category === 'craft_slot')
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((n, i) => put(n.id, GAP + CELL * 12, (i - 1) * CELL * 2));

  const out = nodes.map((n) => {
    const p = pos.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });

  // развод: сначала точные клетки, потом всё < CELL*0.9 внутри одной зоны
  const minD = CELL;
  for (let iter = 0; iter < 24; iter++) {
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
        const lock = (c: string) =>
          c === 'root' || c === 'specialization' || c === 'subcategory' || c === 'feat_slot' || c === 'craft_slot';
        if (!lock(out[i].category)) {
          out[i].x -= Math.round(ux * push);
          out[i].y -= Math.round(uy * push);
        }
        if (!lock(out[j].category)) {
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

  // добивка пар < 120
  for (let iter = 0; iter < 10; iter++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const dx = out[j].x - out[i].x;
        const dy = out[j].y - out[i].y;
        const d = Math.hypot(dx, dy) || 1;
        if (d >= 120) continue;
        const push = (120 - d) / 2 + 4;
        const ux = dx / d;
        const uy = dy / d;
        out[j].x += Math.round(ux * push);
        out[j].y += Math.round(uy * push);
        out[j].x = Math.round(out[j].x / 20) * 20;
        out[j].y = Math.round(out[j].y / 20) * 20;
      }
    }
  }

  return out;
}

/** @deprecated alias */
export const applyPoeLayout = applyHighwayLayout;
