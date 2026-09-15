import type { SkillNode } from './types';

/** Шаг сетки древа (px). Узлы садятся в центры клеток — без наложений. */
export const TREE_CELL = 160;

/** Минимальная дистанция центров = 1 клетка сетки. */
export const TREE_MIN_DIST = TREE_CELL;

/** Слоты Черт / Ремёсел — отдельные колонны за пределами веток. */
export const SLOT_COL = {
  feat: -11 * TREE_CELL, // -1760
  craft: 11 * TREE_CELL, // +1760
} as const;

export const SLOT_ROW0 = -2 * TREE_CELL;
export const SLOT_ROW_STEP = 2 * TREE_CELL;

/** Дороги PoE: старт и шаг вдоль луча от школы. */
export const ROAD_START = 2 * TREE_CELL; // 320
export const ROAD_STEP = TREE_CELL; // 160

export function snapToGrid(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.round(x / TREE_CELL) * TREE_CELL,
    y: Math.round(y / TREE_CELL) * TREE_CELL,
  };
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Сажает все узлы на сетку и разводит совпадения.
 * Колонны feat/craft целиком зарезервированы — туда скиллы не садятся.
 */
export function packNodesToGrid(nodes: SkillNode[]): void {
  const reserved = new Set<string>();
  const reservedCols = new Set<number>([SLOT_COL.feat, SLOT_COL.craft]);

  for (const n of nodes) {
    if (n.category === 'feat_slot' || n.category === 'craft_slot') {
      const s = snapToGrid(n.x, n.y);
      n.x = s.x;
      n.y = s.y;
      reserved.add(cellKey(n.x, n.y));
    }
  }

  const isFree = (x: number, y: number) =>
    !reserved.has(cellKey(x, y)) && !reservedCols.has(x);

  const rest = nodes
    .filter((n) => n.category !== 'feat_slot' && n.category !== 'craft_slot')
    .sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));

  for (const n of rest) {
    let { x, y } = snapToGrid(n.x, n.y);
    if (reservedCols.has(x)) {
      x = x > 0 ? x - TREE_CELL : x + TREE_CELL;
    }
    if (isFree(x, y)) {
      n.x = x;
      n.y = y;
      reserved.add(cellKey(x, y));
      continue;
    }

    const len = Math.hypot(x, y) || 1;
    const ux = x / len;
    const uy = y / len;
    const px = -uy;
    const py = ux;
    let placed = false;
    for (let ring = 1; ring <= 12 && !placed; ring++) {
      const candidates: Array<[number, number]> = [
        [x + Math.round(ux * TREE_CELL * ring), y + Math.round(uy * TREE_CELL * ring)],
        [x + Math.round(px * TREE_CELL * ring), y + Math.round(py * TREE_CELL * ring)],
        [x - Math.round(px * TREE_CELL * ring), y - Math.round(py * TREE_CELL * ring)],
        [x - Math.round(ux * TREE_CELL * ring), y - Math.round(uy * TREE_CELL * ring)],
      ];
      for (const s of [-1, 1]) {
        candidates.push([
          x + Math.round((ux + s * px) * TREE_CELL * ring),
          y + Math.round((uy + s * py) * TREE_CELL * ring),
        ]);
      }
      for (const [cx, cy] of candidates) {
        const s = snapToGrid(cx, cy);
        if (isFree(s.x, s.y)) {
          n.x = s.x;
          n.y = s.y;
          reserved.add(cellKey(s.x, s.y));
          placed = true;
          break;
        }
      }
    }
    if (!placed) {
      for (let k = 1; k < 40; k++) {
        const s = snapToGrid(x + (x >= 0 ? -k : k) * TREE_CELL, y);
        if (isFree(s.x, s.y)) {
          n.x = s.x;
          n.y = s.y;
          reserved.add(cellKey(s.x, s.y));
          break;
        }
      }
    }
  }
}
