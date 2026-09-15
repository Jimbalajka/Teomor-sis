import {
  BaseEdge,
  getStraightPath,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
  type Node,
} from '@xyflow/react';

function nodeCenter(n: InternalNode<Node>) {
  return {
    x: n.internals.positionAbsolute.x + (n.measured.width ?? 0) / 2,
    y: n.internals.positionAbsolute.y + (n.measured.height ?? 0) / 2,
  };
}

/** Прямые шоссе по путям — как на эталонном фото, без ломаных smoothstep. */
export function TreeFloatingEdge({ id, source, target, style, markerEnd }: EdgeProps) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t) return null;

  const sp = nodeCenter(s);
  const tp = nodeCenter(t);
  const [path] = getStraightPath({
    sourceX: sp.x,
    sourceY: sp.y,
    targetX: tp.x,
    targetY: tp.y,
  });

  return <BaseEdge id={id} path={path} style={{ ...style, strokeLinecap: 'round' }} markerEnd={markerEnd} />;
}
