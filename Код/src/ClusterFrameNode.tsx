import { ViewportPortal } from '@xyflow/react';
import type { ZoneType } from './types';
import type { ClusterFrameSpec } from './treeLayout';
import { getClusterFrames } from './treeLayout';
import { useSkillTree } from './SkillTreeContext';

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
 * Рамки школы/суб-проф (гекс/ромб) в ViewportPortal — не RF-ноды.
 * Layout: school-pack гибрид (локальные доски на одном холсте).
 */
export function ClusterFramesLayer() {
  const { treeData } = useSkillTree();
  // treeData в deps-рендере: после layout/load рамки перечитываем
  const frames = getClusterFrames(treeData.nodes);
  if (!frames.length) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const f of frames) {
    const r = f.r; // НЕ клипать: скилы на орбите STUB_* должны быть ВНУТРИ рамки
    minX = Math.min(minX, f.cx - r);
    minY = Math.min(minY, f.cy - r);
    maxX = Math.max(maxX, f.cx + r);
    maxY = Math.max(maxY, f.cy + r);
  }
  minX -= 24;
  minY -= 24;
  maxX += 24;
  maxY += 24;
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  return (
    <ViewportPortal>
      <svg
        className="cluster-frames-layer"
        width={width}
        height={height}
        style={{
          position: 'absolute',
          left: minX,
          top: minY,
          overflow: 'visible',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        {frames.map((f: ClusterFrameSpec) => {
          const stroke = ZONE_STROKE[f.zone] ?? '#94a3b8';
          const cx = f.cx - minX;
          const cy = f.cy - minY;
          const r = f.r;
          const glow = { filter: `drop-shadow(0 0 10px ${stroke}66)` } as const;
          return (
            <g key={f.id} opacity={1}>
              {f.kind === 'circle' ? (
                <>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r - 2}
                    fill={`${stroke}22`}
                    stroke={stroke}
                    strokeWidth={3.25}
                    style={glow}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 0.22}
                    fill={`${stroke}10`}
                    stroke={stroke}
                    strokeWidth={1.25}
                    opacity={0.55}
                  />
                </>
              ) : (
                <>
                  <polygon
                    points={
                      f.kind === 'hex'
                        ? hexPoints(cx, cy, r - 2)
                        : diamondPoints(cx, cy, r - 2)
                    }
                    fill={`${stroke}22`}
                    stroke={stroke}
                    strokeWidth={f.kind === 'hex' ? 3.25 : 2.75}
                    strokeDasharray={f.kind === 'diamond' ? '7 5' : undefined}
                    strokeLinejoin="round"
                    style={glow}
                  />
                  {f.kind === 'hex' && (
                    <polygon
                      points={hexPoints(cx, cy, r * 0.28)}
                      fill={`${stroke}10`}
                      stroke={stroke}
                      strokeWidth={1.25}
                      opacity={0.55}
                    />
                  )}
                </>
              )}
              {f.label && (
                <text
                  x={cx}
                  y={cy - r + 22}
                  textAnchor="middle"
                  fill={stroke}
                  fontSize={13}
                  fontWeight={800}
                  opacity={0.95}
                  style={{ letterSpacing: '0.04em' }}
                >
                  {f.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </ViewportPortal>
  );
}

export function ClusterOverlayNode() {
  return null;
}
export const ClusterFrameNode = ClusterOverlayNode;
