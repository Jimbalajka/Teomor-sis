import { useState } from 'react';
import type { SkillNode } from './types';
import { useSkillTree } from './SkillTreeContext';

// Универсальное всплывающее окно выбора при взятии узла.
// Движок для: профессии (аспект + 2 сигила), Черт, Ремёсел.
export function ChoiceModal({
  node,
  onClose,
}: {
  node: SkillNode;
  onClose: () => void;
}) {
  const { dispatch, treeData } = useSkillTree();
  const choices = node.choices ?? [];
  const [picked, setPicked] = useState<Record<string, string[]>>({});

  const toggle = (choiceId: string, optId: string, pick: number) => {
    setPicked((prev) => {
      const cur = prev[choiceId] ?? [];
      if (cur.includes(optId)) {
        return { ...prev, [choiceId]: cur.filter((x) => x !== optId) };
      }
      if (cur.length >= pick) {
        // заменяем самый старый выбор, если лимит достигнут (pick=1 -> смена)
        return { ...prev, [choiceId]: [...cur.slice(1), optId] };
      }
      return { ...prev, [choiceId]: [...cur, optId] };
    });
  };

  const complete = choices.every(
    (c) => (picked[c.id]?.length ?? 0) === c.pick,
  );

  const confirm = () => {
    const flat = Object.values(picked).flat();
    dispatch({ type: 'ALLOCATE_NODE', node, choices: { [node.id]: flat }, treeData });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{node.label}</h2>
        {node.description && <p className="modal-sub">{node.description}</p>}

        {choices.map((c) => {
          const cur = picked[c.id] ?? [];
          return (
            <section key={c.id} className="choice-block">
              <h3 className="choice-head">
                {c.title}{' '}
                <span className="choice-count">
                  ({cur.length}/{c.pick})
                </span>
              </h3>
              <div className="choice-options">
                {c.options.map((o) => (
                  <button
                    key={o.id}
                    className={`choice-opt${cur.includes(o.id) ? ' choice-opt-on' : ''}`}
                    onClick={() => toggle(c.id, o.id, c.pick)}
                  >
                    <span className="choice-opt-label">{o.label}</span>
                    {o.desc && <span className="choice-opt-desc">{o.desc}</span>}
                  </button>
                ))}
              </div>
            </section>
          );
        })}

        <div className="choice-actions">
          <button className="btn" onClick={onClose}>
            Отмена
          </button>
          <button
            className="btn btn-primary"
            disabled={!complete}
            onClick={confirm}
          >
            Взять
          </button>
        </div>
      </div>
    </div>
  );
}
