import type { NodeProps } from '@xyflow/react';
import type { ZoneType } from './types';
import type { ClusterFrameSpec } from './treeLayout';

export type ClusterOverlayData = {
  frames: ClusterFrameSpec[];
  minX: number;
  minY: number;
  width: number;
  height: number;
};

const ZONE_STROKE: Record<ZoneType, string> = {
  center: '#94a3b8',
  magic: '#3b82f6',
  strength: '#ef4444',
  dexterity: '#22c55e',
  wisdom: '#f59e0b',
};

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
  }
  return pts.join(' ');
}

function diamondPoints(cx: number, cy: number, r: number): string {
  return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
}

/**
 * Один SVG на всё дерево — рамки в координатах графа.
 * Так React Flow не раздувает отдельные node-рамки (гигантский гекс).
 */
export function ClusterOverlayNode({ data }: NodeProps) {
  const { frames, minX, minY, width, height } = data as unknown as ClusterOverlayData;
  return (
    <div
      className="cluster-overlay"
      style={{ width, height, pointerEvents: 'none', overflow: 'visible' }}
    >
      <svg
        width={width}
        height={height}
        className="cluster-overlay-svg"
        style={{ overflow: 'visible', display: 'block' }}
      >
        {frames.map((f) => {
          const stroke = ZONE_STROKE[f.zone] ?? '#94a3b8';
          const cx = f.cx - minX;
          const cy = f.cy - minY;
          // жёсткий потолок — защита от битых r
          const r = Math.min(f.r, 280);
          const points =
            f.kind === 'hex' ? hexPoints(cx, cy, r - 2) : diamondPoints(cx, cy, r - 2);
          const isSchool = f.id.startsWith('hex_school_');
          return (
            <g key={f.id} opacity={isSchool ? 0.35 : 0.9}>
              <polygon
                points={points}
                fill={`${stroke}${isSchool ? '08' : '12'}`}
                stroke={stroke}
                strokeWidth={f.kind === 'hex' ? (isSchool ? 1.5 : 2.25) : 1.75}
                strokeDasharray={f.kind === 'diamond' ? '5 4' : undefined}
                strokeLinejoin="round"
              />
              {f.kind === 'hex' && !isSchool && (
                <polygon
                  points={hexPoints(cx, cy, r * 0.36)}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={1}
                  opacity={0.3}
                />
              )}
              {f.label && !isSchool && (
                <text
                  x={cx}
                  y={cy - r + 14}
                  textAnchor="middle"
                  fill={stroke}
                  fontSize={10}
                  fontWeight={600}
                  opacity={0.75}
                  style={{ pointerEvents: 'none' }}
                >
                  {f.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** @deprecated alias — старое имя импорта */
export const ClusterFrameNode = ClusterOverlayNode;
