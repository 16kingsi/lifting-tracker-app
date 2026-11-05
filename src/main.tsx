import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fonts are bundled with the app (not loaded from Google) so it works offline.
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';

import './styles/tokens.css';
import './styles/app.css';
import { App } from './App';
import { requestPersistentStorage } from './db/persist';

requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
