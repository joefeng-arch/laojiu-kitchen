import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './i18n';           // ← 初始化 i18n（必须在 App 之前）
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
