import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
  type?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'warning',
  type
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const effectiveVariant = type || variant;

  const variantConfig = {
    danger: {
      bgGradient: 'from-red-50 to-rose-50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      titleColor: 'text-red-900'
    },
    warning: {
      bgGradient: 'from-yellow-50 to-orange-50',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-900'
    },
    info: {
      bgGradient: 'from-blue-50 to-indigo-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900'
    }
  };

  const config = variantConfig[effectiveVariant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`bg-gradient-to-br ${config.bgGradient} p-6 rounded-t-2xl`}>
          <div className="flex items-start gap-4">
            <div className={`${config.iconBg} p-3 rounded-xl`}>
              <AlertTriangle className={config.iconColor} size={24} />
            </div>
            <div className="flex-1">
              <h3 className={`text-xl font-serif font-bold ${config.titleColor} mb-2`}>
                {title}
              </h3>
              <div className="text-gray-700 text-sm leading-relaxed">{message}</div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-b-2xl">
          <div className="flex gap-3 justify-end">
            <Button
              onClick={onCancel}
              variant="secondary"
              className="px-6"
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              className="px-6 bg-pink-600 hover:bg-pink-700"
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
