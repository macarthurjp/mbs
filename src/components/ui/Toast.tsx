import { useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  type,
  onClose,
  duration = 3000
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-gradient-to-br from-[#ecfdf3] to-[#f6fff9]',
      border: 'border-[#b7ebc9]',
      text: 'text-[#166534]',
      iconWrap: 'bg-[#16a34a] text-white',
      glow: 'shadow-[0_18px_50px_rgba(22,163,74,0.12)]'
    },
    error: {
      icon: XCircle,
      bg: 'bg-gradient-to-br from-[#fff1f2] to-[#fff7f7]',
      border: 'border-[#fecdd3]',
      text: 'text-[#be123c]',
      iconWrap: 'bg-[#e11d48] text-white',
      glow: 'shadow-[0_18px_50px_rgba(225,29,72,0.12)]'
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-gradient-to-br from-[#fff8e6] to-[#fffdf5]',
      border: 'border-[#f4c542]/40',
      text: 'text-[#8a6a16]',
      iconWrap: 'bg-[#f4c542] text-[#050505]',
      glow: 'shadow-[0_18px_50px_rgba(244,197,66,0.18)]'
    },
    info: {
      icon: Info,
      bg: 'bg-gradient-to-br from-[#eef4ff] to-[#f7faff]',
      border: 'border-[#bfdbfe]',
      text: 'text-[#1d4ed8]',
      iconWrap: 'bg-[#2563eb] text-white',
      glow: 'shadow-[0_18px_50px_rgba(37,99,235,0.14)]'
    }
  };

  const {
    icon: Icon,
    bg,
    border,
    text,
    iconWrap,
    glow
  } = config[type];

  return (
    <div
      role="alert"
      className={`group relative overflow-hidden rounded-[1.6rem] border ${border} ${bg} ${glow} min-w-[320px] max-w-md backdrop-blur-xl animate-slide-in-right`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_40%)] opacity-70" />

      <div className="relative flex items-start gap-4 p-5">
        <div
          className={`${iconWrap} flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl shadow-[0_12px_30px_rgba(15,15,15,0.12)]`}
        >
          <Icon size={21} className="drop-shadow-sm" />
        </div>

        <div className="flex-1 pr-2">
          <p className={`${text} text-sm font-bold leading-relaxed`}>
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`${text} flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200 hover:bg-black/5 hover:scale-105 active:scale-95`}
        >
          <X size={17} />
        </button>
      </div>

      {duration > 0 && (
        <div className="absolute bottom-0 left-0 h-[3px] w-full overflow-hidden bg-black/5">
          <div
            className="h-full bg-[#050505]/15 animate-[toast-progress_linear_forwards]"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      )}
    </div>
  );
}
