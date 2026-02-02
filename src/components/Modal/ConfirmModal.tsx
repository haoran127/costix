import { Icon } from '@iconify/react';
import { useEffect, useRef } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type?: 'info' | 'warning' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const typeConfig = {
  info: {
    icon: 'mdi:information-outline',
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    buttonColor: 'bg-blue-500 hover:bg-blue-600',
  },
  warning: {
    icon: 'mdi:alert-outline',
    iconColor: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    buttonColor: 'bg-yellow-500 hover:bg-yellow-600',
  },
  danger: {
    icon: 'mdi:alert-circle-outline',
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
    buttonColor: 'bg-red-500 hover:bg-red-600',
  },
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  type = 'info',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const config = typeConfig[type];

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onCancel]);

  // 点击背景关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header with Icon */}
        <div className={`${config.bgColor} px-6 py-5 flex items-center gap-4`}>
          <div className={`w-12 h-12 rounded-full bg-white/80 flex items-center justify-center`}>
            <Icon icon={config.icon} width={28} className={config.iconColor} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-600 mt-0.5">{message}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex justify-end gap-3 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${config.buttonColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

