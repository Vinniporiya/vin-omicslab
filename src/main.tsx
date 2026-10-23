import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/features.css';
import { App } from './app/App';
import { initTheme } from './app/theme';

initTheme();
createRoot(document.getElementById('root')!).render(<App />);
