import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { APP_VERSION } from './buildInfo';
import { applyResetQueryParam } from './teomorCache';

if (!applyResetQueryParam()) {
  console.info(`[Теомор] localhost build v${APP_VERSION} — в шапке должно быть «v${APP_VERSION}»`);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
