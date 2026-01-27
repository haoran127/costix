import { Icon } from '@iconify/react';
import { useToast } from '@/hooks/useStore';

const iconMap = {
  success: 'mdi:check-circle',
  error: 'mdi:close-circle',
  info: 'mdi:information',
  warning: 'mdi:alert',
};

export default function Toast() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.type}`}
          onClick={() => removeToast(toast.id)}
        >
          <Icon icon={iconMap[toast.type]} width={18} />
          {toast.message}
        </div>
      ))}
    </div>
  );
}

