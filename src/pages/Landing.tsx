import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { languages, type LanguageCode } from '../i18n';

export default function Landing() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  // 监听滚动
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 点击外部关闭语言菜单
  useEffect(() => {
    if (showLangMenu) {
      const handleClickOutside = () => setShowLangMenu(false);
      setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showLangMenu]);

  const handleGetStarted = () => {
    navigate('/auth?from=landing');
  };

  const handleLanguageChange = (langCode: LanguageCode) => {
    i18n.changeLanguage(langCode);
    setShowLangMenu(false);
  };

  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* 导航栏 */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-sm border-b border-gray-200/50 dark:border-gray-800/50' : 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                <Icon icon="mdi:chart-timeline-variant" width={20} className="text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {import.meta.env.DEV ? 'IM30 AI 用量管理' : t('common.productName')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#features" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                {t('landing.features')}
              </a>
              <a href="#pricing" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                {t('landing.pricing')}
              </a>
              
              {/* 语言选择器 */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLangMenu(!showLangMenu);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-base">{currentLang.flag}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{currentLang.name}</span>
                  <Icon icon="mdi:chevron-down" width={16} className="text-gray-500" />
                </button>
                
                {showLangMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                          i18n.language === lang.code
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="text-base">{lang.flag}</span>
                        <span className="flex-1 text-left">{lang.name}</span>
                        {i18n.language === lang.code && (
                          <Icon icon="mdi:check" width={16} className="text-blue-600 dark:text-blue-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleGetStarted}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                {t('landing.getStarted')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero 区域 */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              {t('landing.heroTitle')}
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
              {t('landing.heroSubtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                className="px-8 py-3.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-base font-semibold shadow-lg hover:shadow-xl"
              >
                {t('landing.startFree')}
              </button>
              <button
                onClick={() => navigate('/auth?mode=signin')}
                className="px-8 py-3.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-700 text-base font-semibold"
              >
                {t('landing.signIn')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 功能特性 */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.featuresTitle')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t('landing.heroSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: 'mdi:key-variant',
                title: t('landing.feature1Title'),
                description: t('landing.feature1Desc'),
                color: 'blue'
              },
              {
                icon: 'mdi:chart-line',
                title: t('landing.feature2Title'),
                description: t('landing.feature2Desc'),
                color: 'green'
              },
              {
                icon: 'mdi:account-group',
                title: t('landing.feature3Title'),
                description: t('landing.feature3Desc'),
                color: 'purple'
              },
              {
                icon: 'mdi:bell-alert',
                title: t('landing.feature4Title'),
                description: t('landing.feature4Desc'),
                color: 'orange'
              },
              {
                icon: 'mdi:shield-check',
                title: t('landing.feature5Title'),
                description: t('landing.feature5Desc'),
                color: 'indigo'
              },
              {
                icon: 'mdi:cloud-sync',
                title: t('landing.feature6Title'),
                description: t('landing.feature6Desc'),
                color: 'teal'
              }
            ].map((feature, index) => {
              const colorClasses = {
                blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
                indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
                teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
              };
              return (
                <div
                  key={index}
                  className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all"
                >
                  <div className={`w-12 h-12 rounded-lg ${colorClasses[feature.color as keyof typeof colorClasses]} flex items-center justify-center mb-4`}>
                    <Icon icon={feature.icon} width={24} />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 价格部分 */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.pricingTitle')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t('landing.pricingSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* 免费套餐 */}
            <div className="flex flex-col p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
              <div className="text-center mb-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {t('landing.planStarter')}
                </h3>
                <div className="mb-3">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">Free</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 min-h-[2.5rem] flex items-center justify-center">
                  {t('landing.planStarterDesc')}
                </p>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planStarterFeature1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planStarterFeature2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planStarterFeature3')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planStarterFeature4')}</span>
                </li>
              </ul>
              <button
                onClick={handleGetStarted}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
              >
                {t('landing.getStarted')}
              </button>
            </div>

            {/* 专业套餐 - 推荐 */}
            <div className="flex flex-col p-6 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 dark:from-orange-900/20 dark:via-pink-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-orange-400 dark:border-orange-500 hover:border-orange-500 dark:hover:border-orange-400 transition-all relative shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                ⭐ {t('landing.recommended')}
              </div>
              <div className="text-center mb-5 mt-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {t('landing.planProfessional')}
                </h3>
                <div className="mb-3">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">$9</span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">/{t('landing.perMonth')}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('landing.planProfessionalDesc')}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  {t('landing.yearSave')}
                </p>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planProfessionalFeature1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planProfessionalFeature2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planProfessionalFeature3')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planProfessionalFeature4')}</span>
                </li>
              </ul>
              <button
                onClick={handleGetStarted}
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 transition-all font-semibold shadow-md text-sm"
              >
                {t('landing.startFree')}
              </button>
            </div>

            {/* Team 套餐 */}
            <div className="flex flex-col p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-indigo-300 dark:border-indigo-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all">
              <div className="text-center mb-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {t('landing.planTeam')}
                </h3>
                <div className="mb-3">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">$49</span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">/{t('landing.perMonth')}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 min-h-[2.5rem] flex items-center justify-center">
                  {t('landing.planTeamDesc')}
                </p>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planTeamFeature1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planTeamFeature2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planTeamFeature3')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planTeamFeature4')}</span>
                </li>
              </ul>
              <button
                onClick={handleGetStarted}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all font-medium text-sm"
              >
                {t('landing.startFree')}
              </button>
            </div>

            {/* 企业套餐 */}
            <div className="flex flex-col p-6 bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-800 rounded-2xl border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all">
              <div className="text-center mb-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {t('landing.planEnterprise')}
                </h3>
                <div className="mb-3">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{t('landing.customPrice')}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 min-h-[2.5rem] flex items-center justify-center">
                  {t('landing.planEnterpriseDesc')}
                </p>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planEnterpriseFeature1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planEnterpriseFeature2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planEnterpriseFeature3')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon icon="mdi:check-circle" width={18} className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('landing.planEnterpriseFeature4')}</span>
                </li>
              </ul>
              <a
                href="mailto:sales@costix.net?subject=Costix Enterprise Inquiry"
                className="block w-full px-4 py-3 bg-gray-800 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors font-medium text-center text-sm"
              >
                {t('landing.contactSales')}
              </a>
            </div>
          </div>

          {/* 常见问题链接 */}
          <div className="text-center mt-12">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('landing.pricingFAQ')}
              <a href="#faq" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">
                {t('landing.learnMore')}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600 dark:bg-blue-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('landing.ctaTitle')}
          </h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            {t('landing.ctaSubtitle')}
          </p>
          <button
            onClick={handleGetStarted}
            className="px-8 py-3.5 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl text-base font-semibold"
          >
            {t('landing.startNow')}
          </button>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
                <Icon icon="mdi:chart-timeline-variant" width={16} className="text-white" />
              </div>
              <span className="text-gray-300 text-sm font-medium">
                {t('common.productName')}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a 
                href="/legal/privacy" 
                className="hover:text-white transition-colors"
              >
                {t('auth.privacyPolicy')}
              </a>
              <a 
                href="/legal/terms" 
                className="hover:text-white transition-colors"
              >
                {t('auth.termsOfService')}
              </a>
              <a 
                href="/pricing" 
                className="hover:text-white transition-colors"
              >
                {t('landing.pricing')}
              </a>
            </div>
            <p className="text-sm">
              &copy; 2026 {t('common.productName')}. {t('landing.allRightsReserved')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
