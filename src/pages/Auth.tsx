/**
 * Costix SaaS 认证页面
 * 支持：邮箱密码、魔法链接、Google、GitHub
 */

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { languages, type LanguageCode } from '../i18n';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithMagicLink,
  signInWithGoogle,
  signInWithGitHub,
  resetPassword,
} from '../lib/auth';

type AuthMode = 'signin' | 'signup' | 'magic' | 'forgot';

interface AuthProps {
  onSuccess?: () => void;
}

// 开发环境检测
const isDev = import.meta.env.DEV;

export default function Auth({ onSuccess }: AuthProps) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  // 表单数据
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 点击外部关闭语言菜单
  useEffect(() => {
    if (showLangMenu) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.language-selector')) {
          setShowLangMenu(false);
        }
      };
      setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showLangMenu]);

  const handleLanguageChange = (langCode: LanguageCode) => {
    i18n.changeLanguage(langCode);
    setShowLangMenu(false);
  };

  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0];

  // 处理邮箱密码登录
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await signInWithEmail({ email, password });
    
    if (result.success) {
      onSuccess?.();
    } else {
      setMessage({ type: 'error', text: result.error || t('auth.signInFailed') });
    }
    
    setLoading(false);
  };

  // 处理邮箱密码注册
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (password.length < 6) {
      setMessage({ type: 'error', text: t('auth.passwordTooShort') });
      setLoading(false);
      return;
    }

    const result = await signUpWithEmail({ email, password, name });
    
    if (result.success) {
      if (result.session) {
        onSuccess?.();
      } else {
        setMessage({ type: 'success', text: result.error || t('auth.signUpSuccess') });
      }
    } else {
      setMessage({ type: 'error', text: result.error || t('auth.signUpFailed') });
    }
    
    setLoading(false);
  };

  // 处理魔法链接登录
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await signInWithMagicLink(email);
    
    if (result.success) {
      setMessage({ type: 'success', text: result.error || t('auth.linkSent') });
    } else {
      setMessage({ type: 'error', text: result.error || t('auth.sendFailed') });
    }
    
    setLoading(false);
  };

  // 处理忘记密码
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await resetPassword(email);
    
    if (result.success) {
      setMessage({ type: 'success', text: result.error || t('auth.resetEmailSent') });
    } else {
      setMessage({ type: 'error', text: result.error || t('auth.sendFailed') });
    }
    
    setLoading(false);
  };

  // 处理 Google 登录
  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signInWithGoogle();
  };

  // 处理 GitHub 登录
  const handleGitHubSignIn = async () => {
    setLoading(true);
    await signInWithGitHub();
  };

  // 开发环境：模拟登录
  const handleDevLogin = () => {
    const mockUser = {
      id: 'dev-user-001',
      email: 'dev@costix.net',
      name: 'Dev User',
      role: 'admin',
    };
    localStorage.setItem('costix_dev_user', JSON.stringify(mockUser));
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* 语言选择器（右上角） */}
        <div className="flex justify-end mb-4">
          <div className="relative language-selector">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLangMenu(!showLangMenu);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
            >
              <span className="text-base">{currentLang.flag}</span>
              <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">{currentLang.name}</span>
              <Icon icon="mdi:chevron-down" width={16} className={`text-gray-500 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
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
        </div>

        {/* Logo 和标题 */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Icon icon="mdi:chart-timeline-variant" width={28} className="text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {isDev ? 'IM30 AI 用量管理' : t('common.productName')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {isDev ? '企业级 AI 资源成本管理平台' : t('common.productSlogan')}
          </p>
        </div>

        {/* 认证卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          {/* 标签切换 */}
          {(mode === 'signin' || mode === 'signup') && (
            <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1 mb-6">
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mode === 'signin'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                onClick={() => { setMode('signin'); setMessage(null); }}
              >
                {t('auth.signIn')}
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                onClick={() => { setMode('signup'); setMessage(null); }}
              >
                {t('auth.signUp')}
              </button>
            </div>
          )}

          {/* 消息提示 */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
              message.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}>
              <Icon 
                icon={message.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'} 
                width={18} 
                className="mt-0.5 flex-shrink-0" 
              />
              <span>{message.text}</span>
            </div>
          )}

          {/* 登录表单 */}
          {mode === 'signin' && (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Icon icon="mdi:email-outline" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Icon icon="mdi:lock-outline" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Icon icon={showPassword ? 'mdi:eye-off' : 'mdi:eye'} width={18} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => { setMode('magic'); setMessage(null); }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {t('auth.magicLink')}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setMessage(null); }}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <Icon icon="mdi:loading" width={20} className="animate-spin" />
                ) : (
                  <>
                    <Icon icon="mdi:login" width={18} />
                    {t('auth.signIn')}
                  </>
                )}
              </button>
            </form>
          )}

          {/* 注册表单 */}
          {mode === 'signup' && (
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('auth.name')}
                </label>
                <div className="relative">
                  <Icon icon="mdi:account-outline" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('auth.namePlaceholder')}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Icon icon="mdi:email-outline" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Icon icon="mdi:lock-outline" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordMinLength')}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Icon icon={showPassword ? 'mdi:eye-off' : 'mdi:eye'} width={18} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <Icon icon="mdi:loading" width={20} className="animate-spin" />
                ) : (
                  <>
                    <Icon icon="mdi:account-plus" width={18} />
                    {t('auth.createAccount')}
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {t('auth.termsAndPrivacy')}{' '}
                <a href="/legal/terms" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">{t('auth.termsOfService')}</a>
                {' '}{t('auth.and')}{' '}
                <a href="/legal/privacy" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">{t('auth.privacyPolicy')}</a>
              </p>
            </form>
          )}

          {/* 魔法链接登录 */}
          {mode === 'magic' && (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Icon icon="mdi:email-fast" width={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('auth.magicLinkTitle')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('auth.magicLinkDesc')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Icon icon="mdi:email-outline" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <Icon icon="mdi:loading" width={20} className="animate-spin" />
                ) : (
                  <>
                    <Icon icon="mdi:send" width={18} />
                    {t('auth.sendMagicLink')}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMode('signin'); setMessage(null); }}
                className="w-full py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-sm"
              >
                {t('auth.backToPasswordLogin')}
              </button>
            </form>
          )}

          {/* 忘记密码 */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Icon icon="mdi:lock-reset" width={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('auth.resetPasswordTitle')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('auth.resetPasswordDesc')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Icon icon="mdi:email-outline" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <Icon icon="mdi:loading" width={20} className="animate-spin" />
                ) : (
                  <>
                    <Icon icon="mdi:email-send" width={18} />
                    {t('auth.sendResetEmail')}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMode('signin'); setMessage(null); }}
                className="w-full py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-sm"
              >
                {t('auth.backToSignIn')}
              </button>
            </form>
          )}

          {/* 分隔线 */}
          {(mode === 'signin' || mode === 'signup') && (
            <>
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                <span className="px-4 text-sm text-gray-500 dark:text-gray-400">{t('auth.orUse')}</span>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
              </div>

              {/* 社交登录 */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition-colors shadow-sm"
                >
                  <Icon icon="logos:google-icon" width={18} />
                  <span className="text-sm font-medium">Google</span>
                </button>
                <button
                  type="button"
                  onClick={handleGitHubSignIn}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition-colors shadow-sm"
                >
                  <Icon icon="mdi:github" width={20} />
                  <span className="text-sm font-medium">GitHub</span>
                </button>
              </div>

              {/* 开发环境：模拟登录 */}
              {isDev && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={handleDevLogin}
                    className="w-full py-2.5 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon icon="mdi:bug" width={18} />
                    {t('auth.devModeLogin')}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                    {t('auth.devModeOnly')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部 */}
        <div className="text-center mt-6 space-y-2">
          <div className="flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <a href="/legal/terms" className="hover:text-gray-700 dark:hover:text-gray-300 hover:underline">
              {t('auth.termsOfService')}
            </a>
            <span>·</span>
            <a href="/legal/privacy" className="hover:text-gray-700 dark:hover:text-gray-300 hover:underline">
              {t('auth.privacyPolicy')}
            </a>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            © 2026 {isDev ? 'IM30' : t('common.productName')}. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
