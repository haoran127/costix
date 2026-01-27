import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import { getCurrentUser, onAuthStateChange, type AuthUser } from './lib/auth';

// 认证模式：'supabase' 使用新的 SaaS 认证，'mind' 使用旧的 Mind OIDC
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'supabase';

// Mind OIDC 相关（保留兼容）
import Login from './pages/Login';
import { isMindAuthenticated, handleMindCallback } from './lib/mind-auth';

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (AUTH_MODE === 'mind') {
      // Mind OIDC 认证流程
      handleMindAuth();
    } else {
      // Supabase Auth 认证流程
      handleSupabaseAuth();
    }
  }, []);

  // Supabase Auth 认证
  const handleSupabaseAuth = async () => {
    // 开发环境：检查模拟登录
    if (import.meta.env.DEV) {
      const devUserStr = localStorage.getItem('costix_dev_user');
      if (devUserStr) {
        try {
          const devUser = JSON.parse(devUserStr);
          setUser(devUser);
          setIsLoading(false);
          return;
        } catch (e) {
          localStorage.removeItem('costix_dev_user');
        }
      }
    }

    // 检查当前用户
    const currentUser = await getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setIsLoading(false);

    // 监听认证状态变化
    const { unsubscribe } = onAuthStateChange((newUser) => {
      setUser(newUser);
    });

    return () => unsubscribe();
  };

  // Mind OIDC 认证（保留兼容）
  const handleMindAuth = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      // 处理 Mind OIDC 回调
      try {
        await handleMindCallback();
        setUser({ id: 'mind', email: '' }); // 简化处理
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error('登录回调失败:', err);
      }
    } else {
      // 检查是否已登录
      if (isMindAuthenticated()) {
        setUser({ id: 'mind', email: '' });
      }
    }
    setIsLoading(false);
  };

  // 登录成功回调
  const handleAuthSuccess = () => {
    // Supabase Auth 会通过 onAuthStateChange 自动更新状态
  };

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  // 开发模式：可跳过登录验证
  const isDev = import.meta.env.DEV;
  const skipAuth = isDev && import.meta.env.VITE_SKIP_AUTH === 'true';

  // 未登录
  if (!user && !skipAuth) {
    if (AUTH_MODE === 'mind') {
      return <Login />;
    }
    return <Auth onSuccess={handleAuthSuccess} />;
  }

  // 已登录
  return <Layout />;
}

export default App;
