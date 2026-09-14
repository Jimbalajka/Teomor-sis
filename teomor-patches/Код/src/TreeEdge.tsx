import {
  BaseEdge,
  getBezierPath,
  useInternalNode,
  Position,
  type EdgeProps,
  type InternalNode,
  type Node,
} from '@xyflow/react';

// Плавающее ребро древа: крепится к БЛИЖАЙШЕЙ грани узла (не только сверху/снизу).
// Всё в одном файле с уникальным именем — чтобы исключить коллизию регистра
// (FloatingEdge.tsx / floatingEdge.ts) на регистро-нечувствительных ФС.

function nodeIntersection(a: InternalNode<Node>, b: InternalNode<Node>) {
  const w = (a.measured.width ?? 0) / 2;
  const h = (a.measured.height ?? 0) / 2;
  const ap = a.internals.positionAbsolute;
  const bp = b.internals.positionAbsolute;

  const x2 = ap.x + w;
  const y2 = ap.y + h;
  const x1 = bp.x + (b.measured.width ?? 0) / 2;
  const y1 = bp.y + (b.measured.height ?? 0) / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a1 = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1);
  const xx3 = a1 * xx1;
  const yy3 = a1 * yy1;
  return { x: w * (xx3 + yy3) + x2, y: h * (-xx3 + yy3) + y2 };
}

function edgeSide(node: InternalNode<Node>, point: { x: number; y: number }) {
  const nx = Math.round(node.internals.positionAbsolute.x);
  const ny = Math.round(node.internals.positionAbsolute.y);
  const px = Math.round(point.x);
  const py = Math.round(point.y);
  const w = node.measured.width ?? 0;
  const h = node.measured.height ?? 0;
  if (px <= nx + 1) return Position.Left;
  if (px >= nx + w - 1) return Position.Right;
  if (py <= ny + 1) return Position.Top;
  if (py >= ny + h - 1) return Position.Bottom;
  return Position.Top;
}

export function TreeFloatingEdge({ id, source, target, style, markerEnd }: EdgeProps) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t) return null;

  const sp = nodeIntersection(s, t);
  const tp = nodeIntersection(t, s);
  const [path] = getBezierPath({
    sourceX: sp.x,
    sourceY: sp.y,
    targetX: tp.x,
    targetY: tp.y,
    sourcePosition: edgeSide(s, sp),
    targetPosition: edgeSide(t, tp),
  });

  return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />;
}
