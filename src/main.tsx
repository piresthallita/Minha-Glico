import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker immediately for installability & offline caching
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] Nova versão disponível');
  },
  onOfflineReady() {
    console.log('[PWA] Pronto para uso offline');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
