import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalContentRef.current) {
      modalContentRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-[100] flex items-end justify-center duration-300 lg:items-center">
      <div
        className="fixed inset-0 bg-black/72 backdrop-blur-xl"
        onClick={onClose}
      />

      <div
        ref={modalContentRef}
        className="animate-in slide-in-from-bottom relative mx-0 flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[2rem] border border-[#e9e2d3] bg-white/92 shadow-[0_45px_140px_rgba(0,0,0,0.34)] backdrop-blur-2xl duration-300 lg:mx-6 lg:max-h-[90vh] lg:rounded-[2rem]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.16),transparent_36%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f4c542]/45 to-transparent opacity-80" />

        <div className="relative z-10 flex items-center justify-between border-b border-[#f1ebdf] bg-white/78 px-5 py-5 backdrop-blur-2xl lg:px-8 lg:py-6">
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-[#8a6a16]">
              MatMax Business Suite
            </p>

            <h2 className="matmax-heading-gradient text-2xl font-serif font-bold lg:text-3xl">
              {title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e9e2d3] bg-white/92 text-[#71717a] shadow-[0_10px_24px_rgba(15,15,15,0.06)] backdrop-blur-xl transition-all duration-200 hover:scale-105 hover:border-[#f4c542] hover:bg-[#fff9e8] hover:text-[#050505] hover:shadow-[0_16px_40px_rgba(15,15,15,0.1)]"
            type="button"
          >
            <X size={22} />
          </button>
        </div>

        <div className="relative z-10 overflow-y-auto px-5 py-5 lg:px-8 lg:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
