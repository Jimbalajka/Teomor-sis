import type { AbilityRow } from './abilityRows';

export function AbilitiesTable({ rows }: { rows: AbilityRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="sheet-abilities panel">
      <h3 className="sheet-abilities-title">Способности и приёмы</h3>
      <div className="sheet-abilities-scroll">
        <table className="abilities-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Квель</th>
              <th>Действие</th>
              <th>Цена</th>
              <th>Эффект</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="ab-name">{r.name}</td>
                <td>{r.kvel}</td>
                <td>{r.action}</td>
                <td className="ab-cost">{r.cost}</td>
                <td className="ab-note">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
