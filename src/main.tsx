import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { installAntiInspectShield } from './utils/securityShield';

installAntiInspectShield();
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
