import { Handle, Position, type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { SkillNode } from './types';
import { useSkillTree } from './SkillTreeContext';
import { blockReason, getNodeStatus, isHiddenSecret } from './nodeStatus';

// Данные, которые мы кладём в каждый узел React Flow.
export type SkillNodeData = { node: SkillNode };

export function CustomSkillNode({ data }: NodeProps) {
  const { node } = data as unknown as SkillNodeData;
  const { state, treeData } = useSkillTree();

  const status = getNodeStatus(node, state, treeData);
  const hidden = isHiddenSecret(node, state);
  const reason = blockReason(node, state, treeData);
  const specLevel =
    node.category === 'specialization'
      ? state.specializationLevels[node.zone] ?? 0
      : undefined;

  return (
    <div
      className={clsx(
        'node',
        `zone-${node.zone}`,
        `status-${status}`,
        node.category === 'root' && 'node-root',
        node.category === 'specialization' && 'node-spec',
        node.category === 'feat' && 'node-feat',
        node.category === 'feat_slot' && 'node-featslot',
        node.category === 'craft_slot' && 'node-craftslot',
        (node.category === 'transit_general' ||
          node.category === 'transit_specialized') &&
          'node-transit',
        hidden && 'node-secret',
      )}
    >
      <Handle type="target" position={Position.Top} className="handle" />
      <Handle type="source" position={Position.Bottom} className="handle" />

      <span className="node-label">
        {hidden ? '?' : node.label}
        {specLevel !== undefined && !hidden && (
          <span className="node-level">{specLevel}/10</span>
        )}
      </span>

      {/* Тултип */}
      <div className="tooltip">
        {hidden ? (
          <p className="tooltip-secret">🔒 {node.secretHint}</p>
        ) : (
          <>
            <strong className="tooltip-title">{node.label}</strong>
            {node.exclusiveGroup && (
              <p className="tooltip-choice">⚔ Развилка — только один вариант из группы</p>
            )}
            {node.description && <p className="tooltip-desc">{node.description}</p>}
            {node.statModifiers && (
              <ul className="tooltip-stats">
                {Object.entries(node.statModifiers).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v > 0 ? `+${v}` : v}
                  </li>
                ))}
              </ul>
            )}
            {node.category !== 'root' && (
              <div className="tooltip-cost">
                Стоимость: {node.cost.amount} ОР
              </div>
            )}
            {status === 'locked' && reason && (
              <div className="tooltip-reason">{reason}</div>
            )}
            {status === 'available' && (
              <div className="tooltip-action">Нажми, чтобы изучить</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
