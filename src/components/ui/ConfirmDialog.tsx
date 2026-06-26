import { ReactNode } from 'react';
import { AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
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
  onClose,
  variant = 'warning',
  type
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const effectiveVariant = type || variant;

  const variantConfig = {
    danger: {
      overlay: 'bg-black/65',
      card: 'border-red-200 bg-white',
      iconBg: 'bg-red-50 border border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-[#050505]',
      subtitleColor: 'text-[#3f3f46]',
      button: 'border border-red-500 bg-red-500 text-white hover:bg-red-600',
      Icon: ShieldAlert
    },
    warning: {
      overlay: 'bg-black/60',
      card: 'border-[#e9e2d3] bg-white',
      iconBg: 'bg-[#fff4c7] border border-[#f4c542]/40',
      iconColor: 'text-[#8a6a16]',
      titleColor: 'text-[#050505]',
      subtitleColor: 'text-[#3f3f46]',
      button: 'border border-[#050505] bg-[#050505] text-[#f4c542] hover:bg-[#111111]',
      Icon: AlertTriangle
    },
    info: {
      overlay: 'bg-black/60',
      card: 'border-blue-200 bg-white',
      iconBg: 'bg-blue-50 border border-blue-200',
      iconColor: 'text-blue-600',
      titleColor: 'text-[#050505]',
      subtitleColor: 'text-[#3f3f46]',
      button: 'border border-[#050505] bg-[#050505] text-[#f4c542] hover:bg-[#111111]',
      Icon: Info
    }
  };

  const config = variantConfig[effectiveVariant];
  const VariantIcon = config.Icon;

  return (
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in ${config.overlay}`}
    >
      <div
        className={`w-full max-w-md overflow-hidden rounded-[2rem] border shadow-[0_28px_90px_rgba(0,0,0,0.24)] transition-all animate-scale-in ${config.card}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-7">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(244,197,66,0.10),transparent_68%)] blur-2xl" />

          <div className="relative flex items-start gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${config.iconBg}`}>
              <VariantIcon className={config.iconColor} size={26} />
            </div>

            <div className="flex-1">
              <h3 className={`mb-3 text-2xl font-serif font-bold leading-tight ${config.titleColor}`}>
                {title}
              </h3>

              <div className={`text-base font-semibold leading-relaxed ${config.subtitleColor}`}>
                {message}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#ece7dc] bg-[#fbfaf7] px-7 py-5">
          <Button
            onClick={onClose || onCancel || (() => undefined)}
            variant="secondary"
            className="px-6"
          >
            {cancelText}
          </Button>

          <button
            onClick={onConfirm}
            className={`inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-black shadow-[0_18px_40px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 ${config.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
