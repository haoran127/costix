/**
 * Tawk.to 客服控制工具
 */

declare global {
  interface Window {
    Tawk_API?: {
      hideWidget?: () => void;
      showWidget?: () => void;
      maximize?: () => void;
      minimize?: () => void;
      toggle?: () => void;
      isChatMaximized?: () => boolean;
      onLoad?: () => void;
    };
  }
}

// 隐藏浮动按钮
export function hideTawkWidget() {
  if (window.Tawk_API?.hideWidget) {
    window.Tawk_API.hideWidget();
  }
}

// 显示浮动按钮
export function showTawkWidget() {
  if (window.Tawk_API?.showWidget) {
    window.Tawk_API.showWidget();
  }
}

// 打开聊天窗口
export function openTawkChat() {
  if (window.Tawk_API?.maximize) {
    window.Tawk_API.maximize();
  }
}

// 关闭聊天窗口
export function closeTawkChat() {
  if (window.Tawk_API?.minimize) {
    window.Tawk_API.minimize();
  }
}

// 切换聊天窗口
export function toggleTawkChat() {
  if (window.Tawk_API?.toggle) {
    window.Tawk_API.toggle();
  }
}

// 等待 Tawk.to 加载完成后执行
export function onTawkLoad(callback: () => void) {
  if (window.Tawk_API) {
    // 如果 API 已存在，检查是否已加载
    const checkInterval = setInterval(() => {
      if (window.Tawk_API?.hideWidget) {
        clearInterval(checkInterval);
        callback();
      }
    }, 100);
    
    // 5秒超时
    setTimeout(() => clearInterval(checkInterval), 5000);
  }
}

