import { useSkillTree } from './SkillTreeContext';
import { RulesPanel } from './RulesPanel';

export function RulesView() {
  const { state } = useSkillTree();
  const level = state.level > 0 ? state.level : 1;
  return (
    <div className="rules-view">
      <header className="rules-view-head">
        <h2>Памятка за стол</h2>
        <p className="muted">Эталон: docs/core/CORE.md — ядро v2</p>
      </header>
      <RulesPanel expanded level={level} />
    </div>
  );
}
