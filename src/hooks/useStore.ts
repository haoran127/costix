import { create } from 'zustand';

// 平台类型
export type Platform = 'all' | 'google' | 'apple' | 'onestore';

// 全局状态
interface AppState {
  // 当前选中的平台
  currentPlatform: Platform;
  setPlatform: (platform: Platform) => void;

  // 当前页面
  currentSection: string;
  setSection: (section: string) => void;

  // 侧边栏折叠
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // 全局搜索
  searchKeyword: string;
  setSearchKeyword: (keyword: string) => void;

  // 同步状态
  isSyncing: boolean;
  setSyncing: (syncing: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  currentPlatform: 'all',
  setPlatform: (platform) => set({ currentPlatform: platform }),

  currentSection: 'dashboard',
  setSection: (section) => set({ currentSection: section }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  searchKeyword: '',
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),

  isSyncing: false,
  setSyncing: (syncing) => set({ isSyncing: syncing }),
}));

// Toast 状态
interface ToastState {
  toasts: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  }>;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  removeToast: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  showToast: (type, message) => {
    const id = Date.now().toString();
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }));
    // 3秒后自动移除
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

