import { RulesPanel } from './RulesPanel';

export function RulesView() {
  return (
    <div className="rules-view">
      <header className="rules-view-head">
        <h2>Памятка за стол</h2>
        <p className="muted">Распечатай или держи открытой на втором экране</p>
      </header>
      <RulesPanel expanded />
    </div>
  );
}
