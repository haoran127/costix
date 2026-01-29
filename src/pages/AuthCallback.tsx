import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * 邮箱验证回调页面
 * 处理 Supabase Auth 的邮箱验证回调
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      if (!supabase) {
        setStatus('error');
        setMessage('系统配置错误');
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      // Supabase Auth 会自动处理 URL hash 中的 token
      // 我们只需要获取 session 即可
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('获取 session 失败:', sessionError);
        setStatus('error');
        setMessage('验证失败：' + sessionError.message);
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      if (!session) {
        // 检查 URL 中是否有错误
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = hashParams.get('error') || searchParams.get('error');
        const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
        
        if (error) {
          setStatus('error');
          setMessage(errorDescription || '验证失败，请重试');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        // 如果没有 session 也没有错误，可能是直接访问了这个页面
        setStatus('error');
        setMessage('无效的验证链接，请重新注册或登录');
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      // 验证成功，检查用户邮箱是否已验证
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && user.email_confirmed_at) {
        setStatus('success');
        setMessage('邮箱验证成功！正在跳转...');

        // 清除 URL 中的 hash 和查询参数
        window.history.replaceState({}, document.title, '/auth/callback');

        // 延迟跳转，让用户看到成功消息
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setStatus('error');
        setMessage('邮箱验证失败，请重试');
        setTimeout(() => navigate('/auth'), 3000);
      }
    } catch (error) {
      console.error('处理验证回调失败:', error);
      setStatus('error');
      setMessage('验证失败，请重试');
      setTimeout(() => navigate('/auth'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">验证中...</h2>
            <p className="text-gray-600">正在验证您的邮箱，请稍候</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">验证成功！</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">验证失败</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/auth')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              返回登录
            </button>
          </>
        )}
      </div>
    </div>
  );
}

