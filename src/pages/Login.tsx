import { Icon } from '@iconify/react';
import { redirectToMindLogin } from '../lib/mind-auth';

export default function Login() {
  const handleLogin = () => {
    redirectToMindLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Icon icon="mdi:store-cog" width={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">商店管理中心</h1>
          <p className="text-gray-500 mt-2">多平台应用商店统一管理系统</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">欢迎回来</h2>
            <p className="text-sm text-gray-500">使用 Mind 账号登录继续</p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Icon icon="logos:google-play-icon" width={18} />
              </div>
              <span className="text-sm text-gray-600">Google Play Console</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Icon icon="logos:apple-app-store" width={18} />
              </div>
              <span className="text-sm text-gray-600">App Store Connect</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <Icon icon="mdi:store" width={18} className="text-orange-500" />
              </div>
              <span className="text-sm text-gray-600">ONE Store</span>
            </div>
          </div>

          {/* Login Button */}
          <button 
            onClick={handleLogin}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <Icon icon="mdi:login" width={20} />
            使用 Mind 登录
          </button>

          {/* Tips */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start gap-2">
              <Icon icon="mdi:information" width={18} className="text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">统一管理您的应用商店</p>
                <ul className="mt-1 text-blue-600 text-xs space-y-0.5">
                  <li>• 同步所有账号和应用信息</li>
                  <li>• 管理成员权限</li>
                  <li>• 查看评论和数据分析</li>
                  <li>• 接收重要通知</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-400">
          © 2025 商店管理中心. All rights reserved.
        </div>
      </div>
    </div>
  );
}

