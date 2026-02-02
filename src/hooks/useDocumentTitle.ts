import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 根据当前语言动态设置文档标题
 */
export function useDocumentTitle(titleKey?: string) {
  const { t, i18n } = useTranslation();
  
  useEffect(() => {
    const baseTitle = t('common.productName') || 'Costix';
    const slogan = t('common.productSlogan') || 'AI Resource Cost Management';
    
    if (titleKey) {
      document.title = `${t(titleKey)} - ${baseTitle}`;
    } else {
      document.title = `${baseTitle} - ${slogan}`;
    }
    
    // 更新 html lang 属性
    document.documentElement.lang = i18n.language.split('-')[0] || 'en';
  }, [t, i18n.language, titleKey]);
}

export default useDocumentTitle;

