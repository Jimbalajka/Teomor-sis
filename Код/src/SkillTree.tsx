import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSkillTree } from './SkillTreeContext';
import { CustomSkillNode } from './CustomSkillNode';
import { ClusterFramesLayer } from './ClusterFrameNode';
import { TreeFloatingEdge } from './TreeEdge';
import { EditorPanel } from './EditorPanel';
import { RaceModal } from './RaceModal';
import { ChoiceModal } from './ChoiceModal';
import { getNodeStatus } from './nodeStatus';
import { SkillTreeToolbar } from './SkillTreeToolbar';
import { isEdgeOnRoute } from './treeView';
import type { SkillNode, SkillTreeData, ZoneType } from './types';

const nodeTypes = {
  skill: CustomSkillNode,
};
const edgeTypes = { floating: TreeFloatingEdge };

/** Шоссе: центр→дар→хаб + короткие спицы. Длинная паутина parentIds — скрыта. */
const MAX_EDGE_LEN = 1300;
/** Дар → гекс/ромб-хаб дальше обычного MAX (stub v3C). */
const MAX_GIFT_HUB_LEN = 2800;
const HIGHWAY_CATS = new Set([
  'root',
  'specialization',
  'subcategory',
  'transit_specialized',
]);

function isGiftHubSpine(a: SkillNode, b: SkillNode): boolean {
  const giftHub = (g: SkillNode, h: SkillNode) =>
    g.category === 'specialization' &&
    (h.hub === 'hex' || h.hub === 'diamond' || h.hub === 'circle' || h.category === 'subcategory');
  return giftHub(a, b) || giftHub(b, a);
}

function isCenterGiftSpine(a: SkillNode, b: SkillNode): boolean {
  return (
    (a.category === 'root' && b.category === 'specialization') ||
    (b.category === 'root' && a.category === 'specialization')
  );
}

function isSheetSkillNode(n: SkillNode): boolean {
  // Навыки листа: круги внутри гекса (sk_<zone>_combat|social_…)
  return n.id.startsWith('sk_') && !n.id.includes('_dice_');
}

function isHighwayEdge(a?: SkillNode, b?: SkillNode): boolean {
  if (!a || !b) return false;
  const dist = Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
  // Магистраль дар→хаб (иначе дары «висят в воздухе»)
  if (isGiftHubSpine(a, b) && dist <= MAX_GIFT_HUB_LEN) return true;
  if (isCenterGiftSpine(a, b) && dist <= MAX_GIFT_HUB_LEN) return true;
  // Дар ↛ прямые рёбра к кругам навыков (они внутри гекса).
  if (
    (a.category === 'specialization' && isSheetSkillNode(b)) ||
    (b.category === 'specialization' && isSheetSkillNode(a))
  ) {
    return false;
  }
  if (dist > MAX_EDGE_LEN) return false;
  // Спицы внутри локальной доски (короткие)
  if (dist <= 520) return true;
  // Магистраль по категориям
  const spine =
    HIGHWAY_CATS.has(a.category) ||
    HIGHWAY_CATS.has(b.category) ||
    a.hub === 'hex' ||
    a.hub === 'diamond' ||
    a.hub === 'circle' ||
    b.hub === 'hex' ||
    b.hub === 'diamond' ||
    b.hub === 'circle';
  return spine;
}

const zoneEdgeColor: Record<ZoneType, string> = {
  center: '#9ca3af',
  magic: '#3b82f6',
  strength: '#ef4444',
  dexterity: '#22c55e',
  wisdom: '#f59e0b',
};

function buildNodes(treeData: SkillTreeData): Node[] {
  return treeData.nodes.map((n) => ({
    id: n.id,
    type: 'skill' as const,
    position: { x: n.x, y: n.y },
    data: { node: n },
    zIndex: 3,
  }));
}

export function SkillTree({ editMode }: { editMode: boolean }) {
  const {
    treeData,
    setTreeData,
    state,
    dispatch,
    showRouteHighlight,
    routeHighlight,
  } = useSkillTree();
  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes(treeData));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRaceModal, setShowRaceModal] = useState(false);
  const [choiceNode, setChoiceNode] = useState<SkillNode | null>(null);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  // Пересеять узлы, когда меняется структура древа (правка/импорт/сброс).
  useEffect(() => {
    setNodes(buildNodes(treeData));
  }, [treeData, setNodes]);

  const edges: Edge[] = useMemo(
    () =>
      treeData.edges.map((e) => {
        const source = treeData.nodes.find((n) => n.id === e.from);
        const target = treeData.nodes.find((n) => n.id === e.to);
        const targetStatus = target ? getNodeStatus(target, state, treeData) : 'locked';
        const targetUnlocked = state.allocatedNodes.includes(e.to);
        const color = target ? zoneEdgeColor[target.zone] : '#9ca3af';
        const onRoute =
          showRouteHighlight && isEdgeOnRoute(e.from, e.to, routeHighlight);
        const dimRoute = showRouteHighlight && routeHighlight.size > 0 && !onRoute;
        const linked =
          !!hoverNodeId && (e.from === hoverNodeId || e.to === hoverNodeId);
        // Hover/маршрут показывают даже скрытые; иначе только шоссе.
        const highway = isHighwayEdge(source, target);
        const hidden = !highway && !linked && !onRoute;
        const spine =
          !!source &&
          !!target &&
          (isGiftHubSpine(source, target) || isCenterGiftSpine(source, target));
        return {
          id: `${e.from}-${e.to}`,
          source: e.from,
          target: e.to,
          type: 'floating',
          animated: false,
          hidden,
          className: onRoute
            ? 'edge-route'
            : linked
              ? 'edge-linked'
              : dimRoute
                ? 'edge-dimmed'
                : spine
                  ? 'edge-spine'
                  : 'edge-idle',
          style: {
            stroke: onRoute
              ? '#facc15'
              : linked || spine
                ? color
                : targetUnlocked
                  ? color
                  : targetStatus === 'available'
                    ? color
                    : '#64748b',
            strokeWidth: onRoute ? 3.5 : linked ? 3 : spine ? 2.75 : targetUnlocked ? 2 : 1.25,
            opacity: dimRoute
              ? 0.08
              : linked || onRoute
                ? 1
                : spine
                  ? 0.72
                  : targetUnlocked
                    ? 0.55
                    : 0.22,
          },
        };
      }),
    [treeData, state, showRouteHighlight, routeHighlight, hoverNodeId],
  );

  const onNodeMouseEnter = useCallback((_: unknown, rfNode: Node) => {
    setHoverNodeId(rfNode.id);
  }, []);
  const onNodeMouseLeave = useCallback(() => {
    setHoverNodeId(null);
  }, []);

  const onNodeClick = useCallback(
    (_: unknown, rfNode: Node) => {
      if (rfNode.id === '__cluster_overlay__' || rfNode.type === 'clusterFrame') return;
      const node = (rfNode.data as { node?: SkillNode }).node;
      if (!node) return;
      if (editMode) {
        setSelectedId(node.id);
        return;
      }
      if (node.category === 'root') {
        // Центр: активация персонажа (раса -> предыстория).
        if (state.level < 1 || !state.background) setShowRaceModal(true);
        return;
      }
      // Клик по уже открытой специализации — повысить её уровень (за ОР).
      if (
        node.category === 'specialization' &&
        state.allocatedNodes.includes(node.id)
      ) {
        dispatch({ type: 'UPGRADE_SPECIALIZATION', zone: node.zone });
        return;
      }
      if (getNodeStatus(node, state, treeData) === 'available') {
        if (node.choices && node.choices.length > 0) {
          setChoiceNode(node); // открыть всплывающее окно выбора
        } else {
          dispatch({ type: 'ALLOCATE_NODE', node, treeData });
        }
      }
    },
    [editMode, state, treeData, dispatch],
  );

  // Сохранить новую позицию после перетаскивания.
  const onNodeDragStop = useCallback(
    (_: unknown, rfNode: Node) => {
      setTreeData((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === rfNode.id
            ? { ...n, x: Math.round(rfNode.position.x), y: Math.round(rfNode.position.y) }
            : n,
        ),
      }));
    },
    [setTreeData],
  );

  // Создать связь (родитель -> потомок).
  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      setTreeData((prev) => {
        const exists = prev.edges.some(
          (e) => e.from === c.source && e.to === c.target,
        );
        if (exists) return prev;
        // Добавляем связь и родителя в требования потомка.
        return {
          ...prev,
          edges: [...prev.edges, { from: c.source!, to: c.target! }],
          nodes: prev.nodes.map((n) => {
            if (n.id !== c.target) return n;
            const parents = new Set(n.requirements?.parentIds ?? []);
            parents.add(c.source!);
            return {
              ...n,
              requirements: {
                ...n.requirements,
                parentIds: [...parents],
              },
            };
          }),
        };
      });
    },
    [setTreeData],
  );

  return (
    <div className="tree-canvas-wrap">
      <SkillTreeToolbar />
      <div className="tree-zone-legend">
        <span className="legend-magic">◆ Медведь · Разум</span>
        <span className="legend-strength">◆ Зюбания · Сила</span>
        <span className="legend-dexterity">◆ Змей · Ловкость</span>
        <span className="legend-wisdom">◆ Голубь · Мудрость</span>
      </div>
    <div className={editMode ? 'rf-wrap rf-edit' : 'rf-wrap'}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        nodesDraggable={editMode}
        nodesConnectable={editMode}
        elementsSelectable={editMode}
        nodeOrigin={[0.5, 0.5]}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <ClusterFramesLayer />
        <Background color="#1f2937" gap={28} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const node = treeData.nodes.find((tn) => tn.id === n.id);
            return node ? zoneEdgeColor[node.zone] : '#9ca3af';
          }}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>
      {editMode && (
        <EditorPanel selectedId={selectedId} setSelectedId={setSelectedId} />
      )}
      {showRaceModal && <RaceModal onClose={() => setShowRaceModal(false)} />}
      {choiceNode && (
        <ChoiceModal node={choiceNode} onClose={() => setChoiceNode(null)} />
      )}
    </div>
    </div>
  );
}
