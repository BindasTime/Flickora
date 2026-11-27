import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { syncNativeSafeInsets } from './lib/bridge';
import './styles/global.css';
import './styles/mobile.css';
import './styles/polish.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element is missing');

void syncNativeSafeInsets();
window.addEventListener('resize', () => void syncNativeSafeInsets());
window.addEventListener('orientationchange', () => void syncNativeSafeInsets());

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
