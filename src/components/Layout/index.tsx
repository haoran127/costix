import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from '../../pages/Dashboard';
import ApiKeys from '../../pages/ApiKeys';
import TeamMembers from '../../pages/TeamMembers';
import ProfileDrawer from '../ProfileDrawer';
import SettingsDrawer from '../SettingsDrawer';
import { getCurrentUser, onAuthStateChange, type AuthUser } from '../../lib/auth';

export default function Layout() {
  const [currentSection, setCurrentSection] = useState('apikeys');
  const [currentPlatform, setCurrentPlatform] = useState('all');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

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
    // TODO: 实现同步逻辑
    console.log('同步数据...');
  };

  const renderContent = () => {
    switch (currentSection) {
      case 'dashboard':
        return <Dashboard platform={currentPlatform} />;
      case 'apikeys':
        return <ApiKeys platform={currentPlatform} />;
      case 'members':
        return <TeamMembers />;
      default:
        return <ApiKeys platform={currentPlatform} />;
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar 
        currentSection={currentSection} 
        onSectionChange={setCurrentSection}
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
          {renderContent()}
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
