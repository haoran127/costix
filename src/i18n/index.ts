/**
 * i18n 多语言配置
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import enUS from './locales/en-US.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import es from './locales/es.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import id from './locales/id.json';

const resources = {
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
  'en-US': { translation: enUS },
  'ja': { translation: ja },
  'ko': { translation: ko },
  'es': { translation: es },
  'de': { translation: de },
  'fr': { translation: fr },
  'pt': { translation: pt },
  'ru': { translation: ru },
  'id': { translation: id },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en-US',
    defaultNS: 'translation',
    
    detection: {
      // 优先使用 localStorage 中保存的语言（用户手动选择的），如果没有则使用浏览器语言
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'costix-language',
      caches: ['localStorage'],
      // 检测浏览器语言并映射到支持的语言代码
      convertDetectedLanguage: (lng: string) => {
        // 映射浏览器语言到支持的语言代码
        const languageMap: Record<string, string> = {
          'zh': 'zh-CN',
          'zh-CN': 'zh-CN',
          'zh-TW': 'zh-TW',
          'zh-HK': 'zh-TW',
          'en': 'en-US',
          'en-US': 'en-US',
          'en-GB': 'en-US',
          'ja': 'ja',
          'ko': 'ko',
          'es': 'es',
          'de': 'de',
          'fr': 'fr',
          'pt': 'pt',
          'ru': 'ru',
          'id': 'id',
        };
        
        // 提取语言代码（例如 'zh-CN' -> 'zh-CN', 'zh' -> 'zh'）
        const baseLang = lng.split('-')[0].toLowerCase();
        const fullLang = lng.split('-').slice(0, 2).join('-');
        
        // 优先匹配完整语言代码，然后匹配基础语言代码
        return languageMap[fullLang] || languageMap[baseLang] || 'en-US';
      },
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

// 支持的语言列表（按使用频率排序）
export const languages = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

