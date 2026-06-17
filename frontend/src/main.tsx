import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './i18n';           // ← 初始化 i18n（必须在 App 之前）
import App from './App.tsx';
import './index.css';

// 确保微信 web-view 顶部标题显示「老舅厨房」（web-view 读取 document.title）
document.title = '老舅厨房';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
