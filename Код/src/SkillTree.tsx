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
import { TreeFloatingEdge } from './TreeEdge';
import { EditorPanel } from './EditorPanel';
import { RaceModal } from './RaceModal';
import { ChoiceModal } from './ChoiceModal';
import { getNodeStatus } from './nodeStatus';
import type { SkillNode, SkillTreeData, ZoneType } from './types';

const nodeTypes = { skill: CustomSkillNode };
const edgeTypes = { floating: TreeFloatingEdge };

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
    type: 'skill',
    position: { x: n.x, y: n.y },
    data: { node: n },
  }));
}

export function SkillTree({ editMode }: { editMode: boolean }) {
  const { treeData, setTreeData, state, dispatch } = useSkillTree();
  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes(treeData));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRaceModal, setShowRaceModal] = useState(false);
  const [choiceNode, setChoiceNode] = useState<SkillNode | null>(null);

  // Пересеять узлы, когда меняется структура древа (правка/импорт/сброс).
  useEffect(() => {
    setNodes(buildNodes(treeData));
  }, [treeData, setNodes]);

  const edges: Edge[] = useMemo(
    () =>
      treeData.edges.map((e) => {
        const target = treeData.nodes.find((n) => n.id === e.to);
        const targetStatus = target ? getNodeStatus(target, state, treeData) : 'locked';
        const targetUnlocked = state.allocatedNodes.includes(e.to);
        const color = target ? zoneEdgeColor[target.zone] : '#9ca3af';
        return {
          id: `${e.from}-${e.to}`,
          source: e.from,
          target: e.to,
          type: 'floating',
          animated: targetStatus === 'available',
          style: {
            stroke: targetUnlocked ? color : '#4b5563',
            strokeWidth: targetUnlocked ? 3 : 1.5,
            strokeDasharray: targetUnlocked ? undefined : '6 6',
            filter: targetUnlocked ? `drop-shadow(0 0 4px ${color})` : undefined,
          },
        };
      }),
    [treeData, state],
  );

  const onNodeClick = useCallback(
    (_: unknown, rfNode: Node) => {
      const node = (rfNode.data as { node: SkillNode }).node;
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
    <div className={editMode ? 'rf-wrap rf-edit' : 'rf-wrap'}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        nodesDraggable={editMode}
        nodesConnectable={editMode}
        elementsSelectable={editMode}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: false }}
      >
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
  );
}
