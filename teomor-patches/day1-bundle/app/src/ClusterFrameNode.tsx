import type { NodeProps } from '@xyflow/react';
import type { ZoneType } from './types';

export type ClusterFrameData = {
  kind: 'hex' | 'diamond';
  r: number;
  zone: ZoneType;
  label?: string;
};

const ZONE_STROKE: Record<ZoneType, string> = {
  center: '#94a3b8',
  magic: '#3b82f6',
  strength: '#ef4444',
  dexterity: '#22c55e',
  wisdom: '#f59e0b',
};

/** Вершины pointy-top гекса (как hexOffset: старт сверху). */
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
 * Декоративная рамка кластера (гекс профессии / ромб углубления).
 * Не кликабельна — только визуал как на эталоне PoE.
 */
export function ClusterFrameNode({ data }: NodeProps) {
  const { kind, r, zone, label } = data as unknown as ClusterFrameData;
  const size = r * 2;
  const cx = r;
  const cy = r;
  const stroke = ZONE_STROKE[zone] ?? '#94a3b8';
  const points =
    kind === 'hex' ? hexPoints(cx, cy, r - 4) : diamondPoints(cx, cy, r - 4);

  return (
    <div
      className={`cluster-frame cluster-frame-${kind} zone-${zone}`}
      style={{ width: size, height: size, pointerEvents: 'none' }}
    >
      <svg width={size} height={size} className="cluster-frame-svg">
        <polygon
          points={points}
          fill={`${stroke}14`}
          stroke={stroke}
          strokeWidth={kind === 'hex' ? 2.5 : 2}
          strokeDasharray={kind === 'diamond' ? '6 4' : undefined}
          strokeLinejoin="round"
        />
        {kind === 'hex' && (
          <polygon
            points={hexPoints(cx, cy, r * 0.38)}
            fill="none"
            stroke={stroke}
            strokeWidth={1}
            opacity={0.35}
          />
        )}
      </svg>
      {label && <span className="cluster-frame-label">{label}</span>}
    </div>
  );
}
