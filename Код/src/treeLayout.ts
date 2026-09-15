import type { SkillNode, ZoneType } from './types';

const DEG = Math.PI / 180;

/** Оси четырёх Даров — квадранты, как на эталоне путей. */
const ZONE_ANGLE: Record<Exclude<ZoneType, 'center'>, number> = {
  magic: -135 * DEG,
  strength: -45 * DEG,
  dexterity: 45 * DEG,
  wisdom: 135 * DEG,
};

/** Радиусы: центр редко, шоссе далеко — без каши у истока. */
const R_RING = 360; // Воля / Закалка / Проворство / Эрудиция
const R_HUB = 240; // Фундамент
const R_FORK = 220; // шаг развилки от родителя вдоль шоссе
const R_SPEC = 820;
const R_SCHOOL = 1400;
const HIGHWAY_STEP = 320;
const PROF_ALONG = 180;
/** Боковой разнос вариантов развилки — как на рисунке «один ствол → 2–3 ветки». */
const FORK_PERP = 190;
/** Узкий разнос на самом шоссе (не развилка). */
const PERP_TIGHT = 55;

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

function relaxLayout(source: SkillNode[], minDist = 190, iterations = 18): SkillNode[] {
  const out = source.map((n) => ({ ...n }));
  const locked = new Set<SkillNode['category']>([
    'root',
    'specialization',
    'subcategory',
    'feat_slot',
    'craft_slot',
  ]);
  // exclusiveGroup НЕ лочим — иначе соседние школы оставляют развилки внахлёст
  const lockedIds = new Set<string>([
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
        const lockI = locked.has(out[i].category) || lockedIds.has(out[i].id);
        const lockJ = locked.has(out[j].category) || lockedIds.has(out[j].id);
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

/**
 * Разместить варианты exclusiveGroup как на эталоне:
 *   школа/родитель ──► шаг вдоль шоссе ──► варианты в ряд поперёк
 */
function placeExclusiveFork(
  members: SkillNode[],
  pos: Map<string, { x: number; y: number }>,
  angleOf: Map<string, number>,
  byId: Map<string, SkillNode>,
  schoolCache: Map<string, string | null>,
  groupSalt = 0,
) {
  members.sort((a, b) => a.id.localeCompare(b.id));

  // 1) школа ветки (граф требований) — главный якорь, даже если parent ещё не стоит
  let schoolId =
    resolveSchoolId(members[0], byId, schoolCache) ??
    (members[0].exclusiveGroup?.startsWith('prof_')
      ? members[0].exclusiveGroup.replace(/^prof_/, '')
      : null);

  // 2) иначе общий parent, если уже размещён
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
  const fork = polar(pr + R_FORK + groupSalt * 200, anchorAngle);
  const perpA = anchorAngle + Math.PI / 2;
  members.forEach((p, i) => {
    const off = (i - (members.length - 1) / 2) * FORK_PERP;
    const x = fork.x + Math.round(Math.cos(perpA) * off);
    const y = fork.y + Math.round(Math.sin(perpA) * off);
    pos.set(p.id, { x, y });
    angleOf.set(p.id, Math.atan2(y, x));
  });
}

/**
 * Эталон путей (скрин пользователя):
 * - чистый центр (4 стороны + хаб с Y-развилкой путей)
 * - 4 дара по диагоналям
 * - школа → шоссе наружу
 * - ⚔ exclusiveGroup = аккуратная поперечная развилка, не каша
 */
export function applyHighwayLayout(source: SkillNode[]): SkillNode[] {
  const nodes = source.map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pos = new Map<string, { x: number; y: number }>();
  const angleOf = new Map<string, number>();
  const schoolCache = new Map<string, string | null>();

  pos.set('center_start', { x: 0, y: 0 });
  angleOf.set('center_start', -90 * DEG);

  // ── Центр: компас, без наложений углов ─────────────────────
  const ring: Array<[string, number]> = [
    ['g_will', -55 * DEG], // NNW — не на одном луче с хабом
    ['g_grit', 25 * DEG], // ENE
    ['g_swift', 115 * DEG], // SSE
    ['g_lore', -155 * DEG], // WSW
    ['g_resolve', 55 * DEG],
    ['g_alert', 155 * DEG],
  ];
  for (const [id, a] of ring) {
    if (!byId.has(id)) continue;
    pos.set(id, polar(R_RING, a));
    angleOf.set(id, a);
  }

  // Фундамент + Y-развилка путей (как на рисунке)
  if (byId.has('g_hub')) {
    const hubA = -90 * DEG;
    pos.set('g_hub', polar(R_HUB, hubA));
    angleOf.set('g_hub', hubA);
    const pathIds = ['g_path_mind', 'g_path_master', 'g_path_body'].filter((id) =>
      byId.has(id),
    );
    if (pathIds.length) {
      const members = pathIds.map((id) => byId.get(id)!);
      placeExclusiveFork(members, pos, angleOf, byId, schoolCache);
    }
  }

  if (byId.has('g_second_wind')) {
    // синтез между resolve/alert
    const a = 90 * DEG;
    pos.set('g_second_wind', polar(R_RING + 200, a));
    angleOf.set('g_second_wind', a);
  }

  // Прочие center-узлы (дороги general и т.п.) — по свободному азимуту позже в topo

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
    // широкий веер + разный радиус, чтобы развилки соседних школ не пересекались
    const spread = Math.min(26 * DEG, (88 * DEG) / Math.max(schools.length, 1));
    schools.forEach((s, i) => {
      const a = base + (i - (schools.length - 1) / 2) * spread;
      const r = R_SCHOOL + (i % 2) * 160 + Math.floor(i / 2) * 40;
      pos.set(s.id, polar(r, a));
      angleOf.set(s.id, a);
    });
  }

  // ── ВСЕ exclusiveGroup = поперечные развилки (не только prof_*) ──
  const byEx = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    if (!n.exclusiveGroup) continue;
    if (!byEx.has(n.exclusiveGroup)) byEx.set(n.exclusiveGroup, []);
    byEx.get(n.exclusiveGroup)!.push(n);
  }
  const saltBySchool = new Map<string, number>();
  for (const [gName, members] of byEx) {
    if (gName === 'general_path') continue;
    const sid =
      resolveSchoolId(members[0], byId, schoolCache) ??
      (gName.startsWith('prof_') ? gName.replace(/^prof_/, '') : gName);
    const salt = saltBySchool.get(sid) ?? 0;
    saltBySchool.set(sid, salt + 1);
    placeExclusiveFork(members, pos, angleOf, byId, schoolCache, salt);
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

  // Шоссе от школ: только узлы БЕЗ exclusiveGroup (развилки уже стоят)
  const highwayBuckets = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    if (pos.has(n.id)) continue;
    if (n.exclusiveGroup) continue;
    const parentId0 = n.requirements?.parentIds?.[0];
    const parent0 = parentId0 ? byId.get(parentId0) : undefined;
    // детей развилки ведём вдоль выбранной ветки в topo, не на шоссе школы
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

  // Остаток — вдоль родителя, дети exclusiveGroup уже стоят
  for (const n of topoOrder(nodes)) {
    if (pos.has(n.id)) continue;
    const parentId = n.requirements?.parentIds?.[0];
    if (!parentId || !pos.has(parentId)) continue;
    const parent = byId.get(parentId);
    const parentAngle =
      angleOf.get(parentId) ?? Math.atan2(pos.get(parentId)!.y, pos.get(parentId)!.x);
    const pr = Math.hypot(pos.get(parentId)!.x, pos.get(parentId)!.y) || 1;
    const siblings = (childrenOf.get(parentId) ?? [n]).filter((s) => !pos.has(s.id) || s.id === n.id);
    const idx = Math.max(0, siblings.findIndex((s) => s.id === n.id));
    const count = Math.max(siblings.length, 1);

    if (parent?.exclusiveGroup) {
      // продолжение после выбранной ветки развилки — строго вдоль её луча
      const step = n.category === 'feat' ? HIGHWAY_STEP * 0.85 : HIGHWAY_STEP * 0.75;
      const nr = pr + step + Math.floor(idx / 3) * 30;
      pos.set(n.id, polar(nr, parentAngle));
      angleOf.set(n.id, parentAngle);
      continue;
    }

    const arcSpan = Math.min(12 * DEG, Math.max(4 * DEG, count * 2.5 * DEG));
    const aOff = count <= 1 ? 0 : (idx - (count - 1) / 2) * (arcSpan / (count - 1));
    const childAngle = parentAngle + aOff;
    const step = n.category === 'feat' ? HIGHWAY_STEP * 0.8 : HIGHWAY_STEP * 0.7;
    pos.set(n.id, polar(pr + step, childAngle));
    angleOf.set(n.id, childAngle);
  }

  // Слоты Черт/Ремёсел — за краем дерева
  let maxAbsX = 0;
  for (const p of pos.values()) maxAbsX = Math.max(maxAbsX, Math.abs(p.x));
  const slotX = Math.max(2600, maxAbsX + 480);
  const featSlots = nodes
    .filter((n) => n.category === 'feat_slot')
    .sort((a, b) => a.id.localeCompare(b.id));
  featSlots.forEach((n, i) => {
    pos.set(n.id, { x: -slotX, y: -320 + i * 320 });
    angleOf.set(n.id, 180 * DEG);
  });
  const craftSlots = nodes
    .filter((n) => n.category === 'craft_slot')
    .sort((a, b) => a.id.localeCompare(b.id));
  craftSlots.forEach((n, i) => {
    pos.set(n.id, { x: slotX, y: -320 + i * 320 });
    angleOf.set(n.id, 0);
  });

  const placed = nodes.map((n) => {
    const p = pos.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });
  const relaxed = relaxLayout(placed);
  const snapped = relaxed.map((n) => ({
    ...n,
    x: Math.round(n.x / 20) * 20,
    y: Math.round(n.y / 20) * 20,
  }));
  // Финальный развод: сначала точные клетки, потом всё < 140
  const pushApart = (arr: SkillNode[], minD: number, rounds: number) => {
    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const dx = arr[j].x - arr[i].x;
          const dy = arr[j].y - arr[i].y;
          const d = Math.hypot(dx, dy) || 1;
          if (d >= minD) continue;
          const push = (minD - d) / 2 + 2;
          const ux = dx / d;
          const uy = dy / d;
          const catI = arr[i].category;
          const catJ = arr[j].category;
          const lockI = catI === 'root' || catI === 'feat_slot' || catI === 'craft_slot' || catI === 'specialization' || catI === 'subcategory';
          const lockJ = catJ === 'root' || catJ === 'feat_slot' || catJ === 'craft_slot' || catJ === 'specialization' || catJ === 'subcategory';
          if (!lockI) {
            arr[i].x -= Math.round(ux * push);
            arr[i].y -= Math.round(uy * push);
          }
          if (!lockJ) {
            arr[j].x += Math.round(ux * push);
            arr[j].y += Math.round(uy * push);
          }
          if (lockI && lockJ) {
            // школы/спеки тоже слегка разводим поперёк, иначе каша зон
            arr[j].x += Math.round(Math.cos(Math.atan2(arr[j].y, arr[j].x) + Math.PI / 2) * push);
            arr[j].y += Math.round(Math.sin(Math.atan2(arr[j].y, arr[j].x) + Math.PI / 2) * push);
          }
        }
      }
    }
    for (const n of arr) {
      n.x = Math.round(n.x / 20) * 20;
      n.y = Math.round(n.y / 20) * 20;
    }
  };
  pushApart(snapped, 140, 18);
  // Жёсткий развод точных совпадений после снапа (пока есть дубликаты клеток)
  for (let guard = 0; guard < 40; guard++) {
    const cell = new Map<string, number>();
    let moved = false;
    for (let i = 0; i < snapped.length; i++) {
      const k = `${snapped[i].x},${snapped[i].y}`;
      if (!cell.has(k)) {
        cell.set(k, i);
        continue;
      }
      const a = Math.atan2(snapped[i].y || 1, snapped[i].x || 1) + (guard % 4) * (Math.PI / 2);
      snapped[i].x += Math.round(Math.cos(a + Math.PI / 2) * (160 + guard * 20));
      snapped[i].y += Math.round(Math.sin(a + Math.PI / 2) * (160 + guard * 20));
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
