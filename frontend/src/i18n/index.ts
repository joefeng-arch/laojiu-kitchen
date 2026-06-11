/**
 * i18n 配置 — react-i18next
 *
 * 现阶段只配置 zh-CN；后续添加 en-US 只需：
 * 1. 新建 locales/en-US.ts
 * 2. 在 resources 中追加 en: { translation: enUS }
 * 3. 用户切换语言时调 i18n.changeLanguage('en')
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN';

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zhCN },
    // en: { translation: enUS },   // ← 未来在此追加
  },
  lng: 'zh',            // 默认语言
  fallbackLng: 'zh',    // 缺失 key 时回退
  interpolation: {
    escapeValue: false,  // React 已自动转义 XSS
  },
});

export default i18n;
