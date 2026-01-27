/**
 * Costix SaaS 认证页面
 * 支持：邮箱密码、魔法链接、Google、GitHub
 */

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 表单数据
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 处理邮箱密码登录
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await signInWithEmail({ email, password });
    
    if (result.success) {
      onSuccess?.();
    } else {
      setMessage({ type: 'error', text: result.error || '登录失败' });
    }
    
    setLoading(false);
  };

  // 处理邮箱密码注册
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (password.length < 6) {
      setMessage({ type: 'error', text: '密码至少需要6个字符' });
      setLoading(false);
      return;
    }

    const result = await signUpWithEmail({ email, password, name });
    
    if (result.success) {
      if (result.session) {
        onSuccess?.();
      } else {
        setMessage({ type: 'success', text: result.error || '注册成功！请查收验证邮件。' });
      }
    } else {
      setMessage({ type: 'error', text: result.error || '注册失败' });
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
      setMessage({ type: 'success', text: result.error || '登录链接已发送！' });
    } else {
      setMessage({ type: 'error', text: result.error || '发送失败' });
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
      setMessage({ type: 'success', text: result.error || '重置邮件已发送！' });
    } else {
      setMessage({ type: 'error', text: result.error || '发送失败' });
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
    // 在 localStorage 中存储模拟用户信息
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-purple-500/30">
            <Icon icon="mdi:key-chain" width={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">{t('common.productName')}</h1>
          <p className="text-gray-400 mt-2">{t('common.productSlogan')}</p>
        </div>

        {/* 认证卡片 */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* 标签切换 */}
          {(mode === 'signin' || mode === 'signup') && (
            <div className="flex rounded-xl bg-black/20 p-1 mb-6">
              <button
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  mode === 'signin'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => { setMode('signin'); setMessage(null); }}
              >
                登录
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => { setMode('signup'); setMessage(null); }}
              >
                注册
              </button>
            </div>
          )}

          {/* 消息提示 */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              message.type === 'success' 
                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              <Icon icon={message.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'} width={18} />
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          {/* 登录表单 */}
          {mode === 'signin' && (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">邮箱</label>
                <div className="relative">
                  <Icon icon="mdi:email-outline" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">密码</label>
                <div className="relative">
                  <Icon icon="mdi:lock-outline" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    <Icon icon={showPassword ? 'mdi:eye-off' : 'mdi:eye'} width={18} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setMode('magic'); setMessage(null); }}
                  className="text-purple-400 hover:text-purple-300"
                >
                  无密码登录
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setMessage(null); }}
                  className="text-gray-400 hover:text-white"
                >
                  忘记密码？
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Icon icon="mdi:loading" width={20} className="animate-spin" />
                ) : (
                  <>
                    <Icon icon="mdi:login" width={20} />
                    登录
                  </>
                )}
              </button>
            </form>
          )}

          {/* 注册表单 */}
          {mode === 'signup' && (
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">姓名</label>
                <div className="relative">
                  <Icon icon="mdi:account-outline" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="您的姓名"
                    className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">邮箱</label>
                <div className="relative">
                  <Icon icon="mdi:email-outline" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">密码</label>
                <div className="relative">
                  <Icon icon="mdi:lock-outline" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少6个字符"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-10 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    <Icon icon={showPassword ? 'mdi:eye-off' : 'mdi:eye'} width={18} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Icon icon="mdi:loading" width={20} className="animate-spin" />
                ) : (
                  <>
                    <Icon icon="mdi:account-plus" width={20} />
                    创建账号
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                注册即表示您同意我们的 
                <a href="#" className="text-purple-400 hover:underline">服务条款</a> 和 
                <a href="#" className="text-purple-400 hover:underline">隐私政策</a>
              </p>
            </form>
          )}

          {/* 魔法链接登录 */}
          {mode === 'magic' && (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="text-center mb-4">
                <Icon icon="mdi:email-fast" width={48} className="text-purple-400 mx-auto mb-2" />
                <h3 className="text-white font-medium">无密码登录</h3>
                <p className="text-sm text-gray-400">我们将发送一个登录链接到您的邮箱</p>
              </div>

              <div>
                <div className="relative">
                  <Icon icon="mdi:email-outline" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Icon icon="mdi:loading" width={20} className="animate-spin" />
                ) : (
                  <>
                    <Icon icon="mdi:send" width={20} />
                    发送登录链接
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMode('signin'); setMessage(null); }}
                className="w-full py-2 text-gray-400 hover:text-white text-sm"
              >
                ← 返回密码登录
              </button>
            </form>
          )}

          {/* 忘记密码 */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-center mb-4">
                <Icon icon="mdi:lock-reset" width={48} className="text-purple-400 mx-auto mb-2" />
                <h3 className="text-white font-medium">重置密码</h3>
                <p className="text-sm text-gray-400">我们将发送重置密码邮件</p>
              </div>

              <div>
                <div className="relative">
                  <Icon icon="mdi:email-outline" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Icon icon="mdi:loading" width={20} className="animate-spin" />
                ) : (
                  <>
                    <Icon icon="mdi:email-send" width={20} />
                    发送重置邮件
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMode('signin'); setMessage(null); }}
                className="w-full py-2 text-gray-400 hover:text-white text-sm"
              >
                ← 返回登录
              </button>
            </form>
          )}

          {/* 分隔线 */}
          {(mode === 'signin' || mode === 'signup') && (
            <>
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-white/10"></div>
                <span className="px-4 text-sm text-gray-500">或使用</span>
                <div className="flex-1 border-t border-white/10"></div>
              </div>

              {/* 社交登录 */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all"
                >
                  <Icon icon="logos:google-icon" width={18} />
                  <span className="text-sm">Google</span>
                </button>
                <button
                  type="button"
                  onClick={handleGitHubSignIn}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all"
                >
                  <Icon icon="mdi:github" width={20} />
                  <span className="text-sm">GitHub</span>
                </button>
              </div>

              {/* 开发环境：模拟登录 */}
              {isDev && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleDevLogin}
                    className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-amber-400 text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <Icon icon="mdi:bug" width={18} />
                    开发模式：模拟登录
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    ⚠️ 仅开发环境可见
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部 */}
        <div className="text-center mt-6 text-sm text-gray-500">
          © 2026 Costix. All rights reserved.
        </div>
      </div>
    </div>
  );
}

