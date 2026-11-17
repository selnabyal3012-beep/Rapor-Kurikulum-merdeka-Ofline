import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && window.location.protocol !== 'file:' && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('rapor-pwa-offline-ready'));
    },
    onRegisteredSW() {
      window.dispatchEvent(new CustomEvent('rapor-pwa-sw-registered'));
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
