import type { SkillNode, ZoneType } from './types';

/**
 * Эталон раскладки (PoE-сегменты, не столбцы):
 * - от Дара веер лучей к секторам
 * - профессия = ЦЕНТР гекса, навыки на 6 вершинах (крупные)
 * - от гекса вбок — ромб: центр = углубление, скиллы на вершинах
 * - единый CELL / фиксированный r рамок (не bbox)
 * - relax не трогает залоченные хабы
 */
const CELL = 160;
const SNAP = 20;

/** Базовый вынос Дара от центра компаса. */
const DAR_OUT = CELL * 1.1;
/** Вынос первой школы/сектора по лучу. */
const SECTOR_OUT = CELL * 3.4;
/** Шаг между секторами (школами) вдоль веера. */
const SECTOR_ALONG = CELL * 5.2;
/** От школы до гекса профессии по тому же лучу. */
const SCHOOL_TO_HEX = CELL * 3.6;
/** Шаг между несколькими профессиями одной школы. */
const HEX_STEP = CELL * 5.0;
/** Радиус кольца навыков гекса (единый). */
const HEX_R = CELL * 1.45;
/** Вынос центра ромба от гекса (вбок от луча). */
const DEEP_OUT = CELL * 3.3;
/** Радиус скиллов на ромбе (чуть плотнее). */
const DIA_R = CELL * 1.15;
/** Добавка к r рамки вокруг кольца (фиксированная, не от bbox). */
const HEX_FRAME_PAD = 56;
const DIA_FRAME_PAD = 48;

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
  // Компас: Медведь/magic TL · Зюбания/strength TR · Змей/dex BR · Голубь/wisdom BL
  // (как в текущих подписях легенды приложения)
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

/** out — от центра наружу; along — поперёк луча зоны (веер). */
function zonePoint(zone: BoardZone, out: number, along: number): { x: number; y: number } {
  const o = zoneOrigin(zone);
  // базис: наружу = (o.x, o.y) нормализованный квадрант; поперёк = (-o.y, o.x) approx
  const outX = o.x * out;
  const outY = o.y * out;
  const alongX = -o.y * along;
  const alongY = o.x * along;
  return {
    x: Math.round(outX + alongX),
    y: Math.round(outY + alongY),
  };
}

/** Единый pointy-top гекс: слот 0 сверху. */
function hexOffset(i: number, r: number): { x: number; y: number } {
  const slot = ((i % 6) + 6) % 6;
  const a = -Math.PI / 2 + slot * (Math.PI / 3);
  return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) };
}

function hexAngle(i: number): number {
  const slot = ((i % 6) + 6) % 6;
  return -Math.PI / 2 + slot * (Math.PI / 3);
}

/** Ромб: 4 вершины. */
function diamondOffset(i: number, r: number): { x: number; y: number } {
  const corners = [
    { x: 0, y: -r },
    { x: r, y: 0 },
    { x: 0, y: r },
    { x: -r, y: 0 },
  ];
  return corners[((i % 4) + 4) % 4];
}

function snap(v: number): number {
  return Math.round(v / SNAP) * SNAP;
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

  const put = (id: string, x: number, y: number, lock = false) => {
    pos.set(id, { x: snap(x), y: snap(y) });
    if (lock) locked.add(id);
  };

  // ── Центр-компас ─────────────────────────────────────────
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

  // ── Центр: три пути = мини-гексы, не вертикальные столбики road_* ──
  const centerPaths = [
    { id: 'g_path_mind', along: -1 },
    { id: 'g_path_master', along: 0 },
    { id: 'g_path_body', along: 1 },
  ] as const;
  const PATH_OUT = CELL * 2.4;
  const PATH_ALONG = CELL * 2.8;
  for (const { id, along } of centerPaths) {
    if (!byId.has(id)) continue;
    const hx = along * PATH_ALONG;
    const hy = -PATH_OUT;
    put(id, hx, hy, true);
    const roads = (childrenOf.get(id) ?? [])
      .filter((c) => c.id.startsWith('road_'))
      .sort((a, b) => a.id.localeCompare(b.id));
    // Соберём цепочку road_* в плоский список порядка
    const chain: SkillNode[] = [];
    const seen = new Set<string>();
    let frontier = roads.filter((r) => (r.requirements?.parentIds ?? []).includes(id));
    while (frontier.length) {
      const n = frontier.shift()!;
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      chain.push(n);
      for (const c of childrenOf.get(n.id) ?? []) {
        if (c.id.startsWith('road_') && !seen.has(c.id)) frontier.push(c);
      }
    }
    // На гекс — до 6 узлов пути
    const onHex = chain.slice(0, 6);
    onHex.forEach((n, i) => {
      const off = hexOffset(i, HEX_R * 0.85);
      put(n.id, hx + off.x, hy + off.y, true);
    });
    draftFrames.push({
      id: `hex_center_${id}`,
      kind: 'hex',
      cx: hx,
      cy: hy,
      r: Math.round(HEX_R * 0.85 + HEX_FRAME_PAD),
      zone: 'center',
      label: byId.get(id)?.label,
      anchorIds: [id, ...onHex.map((n) => n.id)],
    });
    // хвост пути — маленький ромб сбоку
    const rest = chain.slice(6);
    if (rest.length) {
      const a = along >= 0 ? 0.4 : Math.PI - 0.4;
      const cx = hx + Math.round(Math.cos(a) * DEEP_OUT * 0.85);
      const cy = hy + Math.round(Math.sin(a) * DEEP_OUT * 0.85);
      put(rest[0].id, cx, cy, true);
      rest.slice(1, 5).forEach((n, i) => {
        const off = diamondOffset(i, DIA_R * 0.9);
        put(n.id, cx + off.x, cy + off.y, true);
      });
      draftFrames.push({
        id: `dia_center_${id}`,
        kind: 'diamond',
        cx,
        cy,
        r: Math.round(DIA_R * 0.9 + DIA_FRAME_PAD),
        zone: 'center',
        anchorIds: rest.slice(0, 5).map((n) => n.id),
      });
    }
  }

  const schoolCache = new Map<string, string | null>();

  const placeHexCluster = (
    hub: SkillNode,
    hx: number,
    hy: number,
    zone: BoardZone,
    rayAlongSign: number,
  ) => {
    put(hub.id, hx, hy, true);

    const direct = (childrenOf.get(hub.id) ?? []).filter((c) => !pos.has(c.id));
    // На гекс — до 6 прямых детей без собственного «хвоста»; хвостатые → ромбы
    const deepRoots = direct.filter((d) => (childrenOf.get(d.id) ?? []).length > 0);
    let hexSkills = direct.filter((d) => (childrenOf.get(d.id) ?? []).length === 0);

    // если листьев мало — дополняем прямыми, но тогда их дети уйдут в ромб от вершины
    if (hexSkills.length < 3) {
      hexSkills = direct.slice(0, 6);
    } else {
      hexSkills = hexSkills.slice(0, 6);
    }

    const onHexIds = new Set(hexSkills.map((s) => s.id));
    hexSkills.forEach((s, i) => {
      const off = hexOffset(i, HEX_R);
      put(s.id, hx + off.x, hy + off.y, true);
    });

    draftFrames.push({
      id: `hex_${hub.id}`,
      kind: 'hex',
      cx: hx,
      cy: hy,
      r: Math.round(HEX_R + HEX_FRAME_PAD),
      zone,
      label: hub.label,
      anchorIds: [hub.id, ...hexSkills.map((s) => s.id)],
    });

    // Ромбы: (1) deepRoots не попавшие на гекс как «центр ветки»
    // (2) дети узлов на гексе
    type DiaJob = { center: SkillNode; skills: SkillNode[]; angle: number };
    const jobs: DiaJob[] = [];

    deepRoots.forEach((root, ri) => {
      if (onHexIds.has(root.id) && (childrenOf.get(root.id) ?? []).length === 0) return;
      const skills = (childrenOf.get(root.id) ?? []).filter((c) => !pos.has(c.id));
      // если root ещё не на гексе — он центр ромба; иначе центр = первый skill, rest around
      const angle =
        hexAngle(ri) + (rayAlongSign >= 0 ? 0.35 : -0.35);
      if (!onHexIds.has(root.id) && !pos.has(root.id)) {
        jobs.push({ center: root, skills: skills.slice(0, 4), angle });
      } else if (skills.length) {
        jobs.push({
          center: skills[0],
          skills: skills.slice(1, 5),
          angle: hexAngle(Math.max(0, hexSkills.findIndex((s) => s.id === root.id))) || angle,
        });
      }
    });

    // дети навыков на гексе
    hexSkills.forEach((s, i) => {
      const kids = (childrenOf.get(s.id) ?? []).filter((c) => !pos.has(c.id));
      if (!kids.length) return;
      // не дублировать если уже учли через deepRoots
      if (jobs.some((j) => j.center.id === kids[0].id || j.skills.some((k) => k.id === kids[0].id))) {
        return;
      }
      jobs.push({
        center: kids[0],
        skills: kids.slice(1, 5),
        angle: hexAngle(i) + (rayAlongSign >= 0 ? 0.2 : -0.2),
      });
    });

    jobs.forEach((job, di) => {
      const a = job.angle + di * 0.15;
      const cx = hx + Math.round(Math.cos(a) * DEEP_OUT);
      const cy = hy + Math.round(Math.sin(a) * DEEP_OUT);
      put(job.center.id, cx, cy, true);
      job.skills.forEach((sk, i) => {
        const off = diamondOffset(i, DIA_R);
        put(sk.id, cx + off.x, cy + off.y, true);
      });
      draftFrames.push({
        id: `dia_${hub.id}_${job.center.id}`,
        kind: 'diamond',
        cx,
        cy,
        r: Math.round(DIA_R + DIA_FRAME_PAD),
        zone,
        label: job.center.label,
        anchorIds: [job.center.id, ...job.skills.map((s) => s.id)],
      });
    });
  };

  for (const zone of ['magic', 'strength', 'dexterity', 'wisdom'] as const) {
    const schools = nodes
      .filter((n) => n.zone === zone && n.category === 'subcategory')
      .sort((a, b) => a.id.localeCompare(b.id));

    const spec = nodes.find((n) => n.zone === zone && n.category === 'specialization');
    if (spec) {
      const p = zonePoint(zone, DAR_OUT, 0);
      put(spec.id, p.x, p.y, true);
    }

    // Веер секторов от дара — НЕ сетка-колонки
    const nSec = Math.max(schools.length, 1);
    schools.forEach((school, si) => {
      const along = (si - (nSec - 1) / 2) * SECTOR_ALONG;
      const sp = zonePoint(zone, SECTOR_OUT, along);
      put(school.id, sp.x, sp.y, true);

      const allProfs = nodes
        .filter(
          (n) =>
            n.zone === zone &&
            isProfessionHub(n) &&
            resolveSchoolId(n, byId, schoolCache) === school.id,
        )
        .sort((a, b) => a.id.localeCompare(b.id));

      // Если явных профессий нет — школа сама хаб гекса
      const hubs = allProfs.length ? allProfs : [school];
      const side = along === 0 ? 1 : Math.sign(along) || 1;

      hubs.forEach((hub, hi) => {
        const out = SECTOR_OUT + SCHOOL_TO_HEX + hi * HEX_STEP;
        // лёгкий разнос поперёк, чтобы гексы не нанизывались в столб
        const alongHub = along + (hubs.length > 1 ? (hi - (hubs.length - 1) / 2) * (CELL * 1.2) : 0);
        const hp = zonePoint(zone, out, alongHub);
        if (hub.id === school.id) {
          // школа уже стоит — двигаем её в центр гекса дальше по лучу
          put(school.id, hp.x, hp.y, true);
          placeHexCluster(school, hp.x, hp.y, zone, side);
        } else {
          placeHexCluster(hub, hp.x, hp.y, zone, side);
        }
      });

      // Прямые дети школы, не попавшие в хабы — маленькое кольцо у школы, если школа не стала хабом
      if (allProfs.length) {
        const leftover = (childrenOf.get(school.id) ?? []).filter(
          (c) => !pos.has(c.id) && !isProfessionHub(c),
        );
        leftover.slice(0, 6).forEach((c, i) => {
          const off = hexOffset(i, CELL * 0.95);
          put(c.id, sp.x + off.x, sp.y + off.y, true);
        });
      }
    });
  }

  // Хвосты — рядом с родителем, единый шаг
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
      const off = hexOffset(idx, CELL);
      put(n.id, pp.x + off.x, pp.y + off.y, false);
      continue;
    }
    if (n.zone !== 'center') {
      const p = zonePoint(n.zone, CELL * 4, 0);
      put(n.id, p.x, p.y, false);
    }
  }

  // Слоты за краем
  let maxAbsX = 0;
  for (const p of pos.values()) maxAbsX = Math.max(maxAbsX, Math.abs(p.x));
  const slotX = Math.max(CELL * 18, maxAbsX + CELL * 4);
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

  // Мягкий развод только незалоченных хвостов
  const out = placed.map((n) => ({ ...n }));
  const minD = CELL * 0.9;
  for (let iter = 0; iter < 12; iter++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        if (out[i].zone !== out[j].zone && out[i].zone !== 'center' && out[j].zone !== 'center') {
          // разные зоны тоже чуть разводим если слишком близко у границ
        }
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
    n.x = snap(n.x);
    n.y = snap(n.y);
  }

  // точные совпадения
  for (let guard = 0; guard < 50; guard++) {
    const seen = new Map<string, number>();
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      const k = `${out[i].x},${out[i].y}`;
      if (!seen.has(k)) {
        seen.set(k, i);
        continue;
      }
      const a = (guard % 6) * (Math.PI / 3);
      out[i].x = snap(out[i].x + Math.cos(a) * CELL);
      out[i].y = snap(out[i].y + Math.sin(a) * CELL);
      moved = true;
    }
    if (!moved) break;
  }

  // Рамки: центр = якорь-хаб; r фиксированный (уже в draft)
  const byFinal = new Map(out.map((n) => [n.id, n]));
  lastClusterFrames = draftFrames.map((f) => {
    const hub = byFinal.get(f.anchorIds[0]);
    if (hub) return { ...f, cx: hub.x, cy: hub.y };
    const anchors = f.anchorIds.map((id) => byFinal.get(id)).filter(Boolean) as SkillNode[];
    if (!anchors.length) return f;
    return {
      ...f,
      cx: snap(anchors.reduce((s, n) => s + n.x, 0) / anchors.length),
      cy: snap(anchors.reduce((s, n) => s + n.y, 0) / anchors.length),
    };
  });

  return out;
}

/** @deprecated alias */
export const applyPoeLayout = applyHighwayLayout;
