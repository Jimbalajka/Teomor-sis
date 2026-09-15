import { Handle, Position, type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { SkillNode } from './types';
import { useSkillTree } from './SkillTreeContext';
import { blockReason, getNodeStatus, isHiddenSecret } from './nodeStatus';
import { nodeBonusLine, nodeVisualTier } from './nodeLabels';
import { isNodeDimmed } from './treeView';

export type SkillNodeData = { node: SkillNode };

/** Легенда эталона путей: синий=путь, серый=общие, чёрный=профы/углубления. */
export function nodeLegendRole(node: SkillNode): 'path' | 'common' | 'prof' | 'other' {
  if (node.category === 'root' || node.category === 'specialization') return 'other';
  if (node.category === 'feat_slot' || node.category === 'craft_slot') return 'other';
  // серый центр — общие навыки
  if (
    node.zone === 'center' &&
    node.category === 'transit_general' &&
    !node.exclusiveGroup
  ) {
    return 'common';
  }
  // синий путь: школа, навыки ствола, дороги, выбранные пути (Тело/Разум/Мастер)
  if (node.category === 'subcategory') return 'path';
  if (node.id.startsWith('road_')) return 'path';
  if (node.exclusiveGroup === 'general_path') return 'path';
  if (node.category === 'transit_specialized' && !node.exclusiveGroup) return 'path';
  if (node.category === 'transit_general' && node.id.startsWith('g_path')) return 'path';
  if (node.id === 'g_hub') return 'path'; // фундамент → развилка путей
  // чёрные — профессии, стили, углубления
  if (node.exclusiveGroup || node.category === 'feat') return 'prof';
  return 'other';
}


export function CustomSkillNode({ data }: NodeProps) {
  const { node } = data as unknown as SkillNodeData;
  const {
    state,
    treeData,
    treeFocus,
    showRouteHighlight,
    routeHighlight,
  } = useSkillTree();

  const status = getNodeStatus(node, state, treeData);
  const hidden = isHiddenSecret(node, state);
  const reason = blockReason(node, state, treeData);
  const bonus = hidden ? null : nodeBonusLine(node, state);
  const tier = nodeVisualTier(node);
  const dimmed = isNodeDimmed(node, treeFocus, state, treeData);
  const onRoute = showRouteHighlight && routeHighlight.has(node.id);

  const specLevel =
    node.category === 'specialization'
      ? state.specializationLevels[node.zone] ?? 0
      : undefined;

  const legend = nodeLegendRole(node);

  const isKeystone =
    node.description?.includes('Оплот') ||
    (node.category === 'feat' && !!node.exclusiveGroup && tier === 'large');

  return (
    <div
      className={clsx(
        'node',
        `zone-${node.zone}`,
        `status-${status}`,
        `node-tier-${tier}`,
        node.category === 'root' && 'node-root',
        node.category === 'specialization' && 'node-spec node-diamond',
        node.category === 'feat' && 'node-feat',
        node.category === 'feat_slot' && 'node-featslot',
        node.category === 'craft_slot' && 'node-craftslot',
        (node.category === 'transit_general' ||
          node.category === 'transit_specialized') &&
          'node-transit',
        node.id.startsWith('bridge_') && 'node-bridge',
        isKeystone && 'node-keystone',
        legend === 'path' && 'node-path',
        legend === 'common' && 'node-common',
        legend === 'prof' && 'node-prof',
        hidden && 'node-secret',
        dimmed && 'node-dimmed',
        onRoute && 'node-route',
      )}
    >
      <Handle type="target" position={Position.Top} className="handle" />
      <Handle type="source" position={Position.Bottom} className="handle" />

      <span className="node-label">
        {hidden ? '?' : node.label}
        {bonus && !hidden && <span className="node-bonus">{bonus}</span>}
        {specLevel !== undefined && !hidden && (
          <span className="node-level">{specLevel}/10</span>
        )}
      </span>

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
