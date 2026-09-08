import { useEffect, useRef, useState } from 'react';
import { useSkillTree } from './SkillTreeContext';
import type {
  NodeCategory,
  NodeChoice,
  SkillNode,
  SkillTreeData,
  ZoneType,
} from './types';

const ZONE_OPTS: ZoneType[] = [
  'center',
  'magic',
  'strength',
  'dexterity',
  'wisdom',
];
const CAT_OPTS: NodeCategory[] = [
  'root',
  'transit_general',
  'specialization',
  'subcategory',
  'transit_specialized',
  'feat',
  'feat_slot',
  'craft_slot',
];

// Опции окна выбора <-> текст (строка на опцию, формат «label | описание»).
function optionsToText(c: NodeChoice): string {
  return c.options.map((o) => (o.desc ? `${o.label} | ${o.desc}` : o.label)).join('\n');
}
function textToOptions(text: string): NodeChoice['options'] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label, desc] = l.split('|').map((s) => s.trim());
      return { id: label, label, desc: desc || undefined };
    });
}

function statsToText(m?: Record<string, number>): string {
  if (!m) return '';
  return Object.entries(m)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');
}

function textToStats(text: string): Record<string, number> | undefined {
  const out: Record<string, number> = {};
  for (const part of text.split(',')) {
    const [k, v] = part.split(':');
    if (!k?.trim()) continue;
    const num = Number(v);
    if (!Number.isNaN(num)) out[k.trim()] = num;
  }
  return Object.keys(out).length ? out : undefined;
}

interface Props {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

export function EditorPanel({ selectedId, setSelectedId }: Props) {
  const { treeData, setTreeData } = useSkillTree();
  const fileRef = useRef<HTMLInputElement>(null);

  const node = treeData.nodes.find((n) => n.id === selectedId) ?? null;

  // Сырой текст модификаторов держим локально, чтобы ввод не «схлопывался»
  // при промежуточном (ещё невалидном) значении.
  const [statsText, setStatsText] = useState('');
  // Ре-синк только при смене выбранного узла (не при каждом patch),
  // иначе промежуточный ввод «Разум:» затирался бы обратно.
  useEffect(() => {
    setStatsText(statsToText(node?.statModifiers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id]);

  const patch = (id: string, changes: Partial<SkillNode>) =>
    setTreeData((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...changes } : n)),
    }));

  const addNode = () => {
    const id = `node_${Date.now().toString(36)}`;
    const newNode: SkillNode = {
      id,
      x: 0,
      y: 0,
      label: 'Новый узел',
      zone: 'center',
      category: 'transit_general',
      cost: { type: 'OR', amount: 1 },
      description: '',
    };
    setTreeData((prev) => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    setSelectedId(id);
  };

  const deleteNode = (id: string) => {
    setTreeData((prev) => ({
      nodes: prev.nodes.filter((n) => n.id !== id),
      edges: prev.edges.filter((e) => e.from !== id && e.to !== id),
    }));
    setSelectedId(null);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(treeData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skillTreeData.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as SkillTreeData;
        if (parsed?.nodes && parsed?.edges) {
          setTreeData(parsed);
          setSelectedId(null);
        } else {
          alert('Не похоже на древо (нужны nodes и edges).');
        }
      } catch {
        alert('Некорректный JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="editor">
      <div className="editor-top">
        <button className="btn btn-primary" onClick={addNode}>
          + Узел
        </button>
        <button className="btn" onClick={exportJson}>
          Экспорт
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Импорт
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importJson(f);
            e.target.value = '';
          }}
        />
      </div>

      <p className="editor-hint">
        Тащи узлы мышью. Соединяй, перетягивая от кружка-хэндла к другому узлу.
        Клик по узлу — редактировать здесь.
      </p>

      {!node ? (
        <p className="muted">Выбери узел для редактирования.</p>
      ) : (
        <div className="editor-form">
          <label>
            Название
            <input
              value={node.label}
              onChange={(e) => patch(node.id, { label: e.target.value })}
            />
          </label>

          <div className="editor-row">
            <label>
              Ветка
              <select
                value={node.zone}
                onChange={(e) =>
                  patch(node.id, { zone: e.target.value as ZoneType })
                }
              >
                {ZONE_OPTS.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Тип
              <select
                value={node.category}
                onChange={(e) =>
                  patch(node.id, { category: e.target.value as NodeCategory })
                }
              >
                {CAT_OPTS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Цена (ОР)
            <input
              type="number"
              min={0}
              value={node.cost.amount}
              onChange={(e) =>
                patch(node.id, {
                  cost: { type: 'OR', amount: Number(e.target.value) },
                })
              }
            />
          </label>

          <label>
            Описание
            <textarea
              rows={2}
              value={node.description ?? ''}
              onChange={(e) => patch(node.id, { description: e.target.value })}
            />
          </label>

          <label>
            Модификаторы (ключ:значение, через запятую)
            <input
              value={statsText}
              placeholder="Разум:1, Лимит ОС:2"
              onChange={(e) => {
                setStatsText(e.target.value);
                patch(node.id, { statModifiers: textToStats(e.target.value) });
              }}
            />
          </label>

          <label className="editor-check">
            <input
              type="checkbox"
              checked={!!node.isSecret}
              onChange={(e) => patch(node.id, { isSecret: e.target.checked })}
            />
            Секретный узел
          </label>
          {node.isSecret && (
            <label>
              Подсказка секрета
              <input
                value={node.secretHint ?? ''}
                onChange={(e) => patch(node.id, { secretHint: e.target.value })}
              />
            </label>
          )}

          <div className="editor-row">
            <label>
              Требуемая ветка
              <select
                value={node.requirements?.requiredSpecialization?.zone ?? ''}
                onChange={(e) => {
                  const zone = e.target.value as ZoneType | '';
                  patch(node.id, {
                    requirements: {
                      ...node.requirements,
                      requiredSpecialization: zone
                        ? {
                            zone,
                            level:
                              node.requirements?.requiredSpecialization?.level ??
                              1,
                          }
                        : undefined,
                    },
                  });
                }}
              >
                <option value="">—</option>
                {ZONE_OPTS.filter((z) => z !== 'center').map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Уровень
              <input
                type="number"
                min={1}
                max={10}
                disabled={!node.requirements?.requiredSpecialization}
                value={node.requirements?.requiredSpecialization?.level ?? 1}
                onChange={(e) =>
                  patch(node.id, {
                    requirements: {
                      ...node.requirements,
                      requiredSpecialization: node.requirements
                        ?.requiredSpecialization
                        ? {
                            zone: node.requirements.requiredSpecialization.zone,
                            level: Number(e.target.value),
                          }
                        : undefined,
                    },
                  })
                }
              />
            </label>
          </div>

          {/* Конструктор всплывающих окон выбора (#6) */}
          <div className="choice-builder">
            <div className="cb-head">
              <span>Всплывающие окна</span>
              <button
                className="btn btn-mini2"
                onClick={() =>
                  patch(node.id, {
                    choices: [
                      ...(node.choices ?? []),
                      {
                        id: `c${(node.choices?.length ?? 0) + 1}`,
                        title: 'Выбор',
                        pick: 1,
                        options: [],
                      },
                    ],
                  })
                }
              >
                + окно
              </button>
            </div>
            {(node.choices ?? []).map((c, ci) => (
              <div key={c.id} className="cb-item">
                <div className="ed-row">
                  <label>
                    Заголовок
                    <input
                      value={c.title}
                      onChange={(e) => {
                        const next = [...(node.choices ?? [])];
                        next[ci] = { ...c, title: e.target.value };
                        patch(node.id, { choices: next });
                      }}
                    />
                  </label>
                  <label>
                    Выбрать
                    <input
                      type="number"
                      min={1}
                      value={c.pick}
                      onChange={(e) => {
                        const next = [...(node.choices ?? [])];
                        next[ci] = { ...c, pick: Number(e.target.value) };
                        patch(node.id, { choices: next });
                      }}
                    />
                  </label>
                </div>
                <label>
                  Опции (строка = «название | описание»)
                  <textarea
                    rows={3}
                    defaultValue={optionsToText(c)}
                    onBlur={(e) => {
                      const next = [...(node.choices ?? [])];
                      next[ci] = { ...c, options: textToOptions(e.target.value) };
                      patch(node.id, { choices: next });
                    }}
                  />
                </label>
                <button
                  className="btn btn-mini2 btn-danger"
                  onClick={() =>
                    patch(node.id, {
                      choices: (node.choices ?? []).filter((_, i) => i !== ci),
                    })
                  }
                >
                  удалить окно
                </button>
              </div>
            ))}
          </div>

          <div className="editor-id">id: {node.id}</div>
          <button className="btn btn-danger" onClick={() => deleteNode(node.id)}>
            Удалить узел
          </button>
        </div>
      )}
    </div>
  );
}
