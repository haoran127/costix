import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MindUserInfo,
  isMindAuthenticated,
  getMindCurrentUser,
  handleMindCallback,
  redirectToMindLogin,
  switchAccount,
  clearMindAuthInfo,
} from '@/lib/mind-auth';

interface UseAuthReturn {
  user: MindUserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  switchUser: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<MindUserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // 检查认证状态
  const checkAuth = useCallback(async () => {
    setIsLoading(true);

    // 检查是否有回调参数（从 Mind 登录返回）
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state && location.pathname === '/login') {
      try {
        const userInfo = await handleMindCallback();
        if (userInfo) {
          setUser(userInfo);
          setIsAuthenticated(true);
          // 清除 URL 参数并跳转到首页
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('登录回调处理失败:', error);
        clearMindAuthInfo();
      }
    } else {
      // 检查本地存储的认证状态
      if (isMindAuthenticated()) {
        const currentUser = getMindCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    }

    setIsLoading(false);
  }, [location.search, location.pathname, navigate]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(() => {
    redirectToMindLogin();
  }, []);

  const logout = useCallback(() => {
    clearMindAuthInfo();
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login', { replace: true });
  }, [navigate]);

  const switchUser = useCallback(() => {
    switchAccount();
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    switchUser,
  };
}

