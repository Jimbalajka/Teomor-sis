import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { SkillTreeProvider } from './SkillTreeContext';
import { SkillTree } from './SkillTree';
import { Sidebar } from './Sidebar';
import { CharacterSheet } from './CharacterSheet';
import { CardsView } from './CardsView';
import { ConstructorView } from './ConstructorView';
import { RulesView } from './RulesView';
import { GMView } from './GMView';
import type { View } from './views';

export type { View } from './views';

export default function App() {
  const [editMode, setEditMode] = useState(false);
  const [view, setView] = useState<View>('tree');

  return (
    <SkillTreeProvider>
      <div className="app">
        <Sidebar
          editMode={editMode}
          onToggleEdit={() => setEditMode((v) => !v)}
          view={view}
          onView={setView}
        />
        <main className={`canvas${view === 'tree' ? ' canvas-tree' : ''}`}>
          {view === 'tree' && (
            <ReactFlowProvider>
              <SkillTree editMode={editMode} />
            </ReactFlowProvider>
          )}
          {view === 'sheet' && <CharacterSheet />}
          {view === 'cards' && <CardsView />}
          {view === 'constructor' && <ConstructorView />}
          {view === 'rules' && <RulesView />}
          {view === 'gm' && <GMView />}
        </main>
      </div>
    </SkillTreeProvider>
  );
}
