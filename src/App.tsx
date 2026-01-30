import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import { getCurrentUser, onAuthStateChange, type AuthUser } from './lib/auth';

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  // 开发模式下更新网页标题
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    if (isDev) {
      document.title = 'IM30 AI 用量管理';
    }
  }, []);

  useEffect(() => {
    // Supabase Auth 认证流程
    handleSupabaseAuth();
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
  const isAuthenticated = !!user || skipAuth;

  return (
    <Routes>
      {/* 首页 */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />} />
      
      {/* 认证页面 */}
      <Route 
        path="/auth" 
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Auth onSuccess={handleAuthSuccess} />
          )
        } 
      />
      
      {/* 邮箱验证回调页面 */}
      <Route 
        path="/auth/callback" 
        element={<AuthCallback />} 
      />
      
      {/* 已登录用户访问首页，重定向到仪表盘 */}
      <Route 
        path="/landing" 
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Landing />
          )
        } 
      />
      
      {/* 定价页面（无需登录也可访问） */}
      <Route path="/pricing" element={<Pricing />} />
      
      {/* 需要认证的路由 */}
      <Route 
        path="/*" 
        element={
          isAuthenticated ? (
            <Layout />
          ) : (
            <Navigate to="/auth" replace state={{ from: location.pathname }} />
          )
        } 
      />
    </Routes>
  );
}

export default App;
