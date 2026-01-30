import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from '../../pages/Dashboard';
import ApiKeys from '../../pages/ApiKeys';
import TeamMembers from '../../pages/TeamMembers';
import PlatformAccounts from '../../pages/PlatformAccounts';
import ActivityLog from '../../pages/ActivityLog';
import ProfileDrawer from '../ProfileDrawer';
import SettingsDrawer from '../SettingsDrawer';
import { getCurrentUser, onAuthStateChange, type AuthUser } from '../../lib/auth';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState('apikeys');
  const [currentPlatform, setCurrentPlatform] = useState('all');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  // 根据路由更新当前 section
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) {
      setCurrentSection('dashboard');
    } else if (path.startsWith('/apikeys')) {
      setCurrentSection('apikeys');
    } else if (path.startsWith('/members') || path.startsWith('/team')) {
      setCurrentSection('members');
    } else if (path.startsWith('/platform-accounts') || path.startsWith('/settings/platform')) {
      setCurrentSection('platform-accounts');
    } else if (path.startsWith('/activity-log') || path.startsWith('/settings/activity')) {
      setCurrentSection('activity-log');
    }
  }, [location]);

  // 获取用户信息
  useEffect(() => {
    const loadUser = async () => {
      // 开发模式：检查模拟用户
      if (import.meta.env.DEV) {
        const devUserStr = localStorage.getItem('costix_dev_user');
        if (devUserStr) {
          try {
            setUser(JSON.parse(devUserStr));
            return;
          } catch (e) {
            // ignore
          }
        }
      }

      // Supabase Auth
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    };

    loadUser();

    // 监听认证状态变化
    const { unsubscribe } = onAuthStateChange((newUser) => {
      setUser(newUser);
    });

    return () => unsubscribe();
  }, []);

  const handleSync = () => {
    // 移除右上角的同步按钮，因为统计卡片上已经有同步功能了
    // 如果需要全局同步，可以在这里实现
  };

  const handleSectionChange = (section: string) => {
    setCurrentSection(section);
    // 更新路由
    if (section === 'dashboard') {
      navigate('/dashboard');
    } else if (section === 'apikeys') {
      navigate('/apikeys');
    } else if (section === 'members') {
      navigate('/members');
    } else if (section === 'platform-accounts') {
      navigate('/platform-accounts');
    } else if (section === 'activity-log') {
      navigate('/activity-log');
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar 
        currentSection={currentSection} 
        onSectionChange={handleSectionChange}
        user={user}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-[var(--bg-primary)]">
        <Header 
          currentSection={currentSection}
          currentPlatform={currentPlatform}
          onPlatformChange={setCurrentPlatform}
          onSync={handleSync}
        />
        <div className="flex-1 overflow-auto p-5 dark:bg-[var(--bg-primary)]">
          <Routes>
            <Route path="/dashboard" element={<Dashboard platform={currentPlatform} />} />
            <Route path="/apikeys" element={<ApiKeys platform={currentPlatform} />} />
            <Route path="/members" element={<TeamMembers />} />
            <Route path="/team" element={<TeamMembers />} />
            <Route path="/platform-accounts" element={<PlatformAccounts />} />
            <Route path="/settings/platform" element={<PlatformAccounts />} />
            <Route path="/activity-log" element={<ActivityLog />} />
            <Route path="/settings/activity" element={<ActivityLog />} />
            <Route path="/" element={<Dashboard platform={currentPlatform} />} />
            <Route path="*" element={<Dashboard platform={currentPlatform} />} />
          </Routes>
        </div>
      </main>

      {/* 个人信息抽屉 */}
      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
      />

      {/* 设置抽屉 */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
