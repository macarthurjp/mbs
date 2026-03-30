import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center lg:items-center items-end lg:items-center animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={modalContentRef}
        className="relative bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl max-w-7xl w-full mx-0 lg:mx-4 max-h-[95vh] lg:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom lg:zoom-in-95 duration-300"
      >
        <div className="sticky top-0 bg-gradient-to-r from-pink-50 to-white border-b border-gray-100 px-4 lg:px-6 py-4 lg:py-5 flex items-center justify-between backdrop-blur-sm z-10">
          <h2 className="text-xl lg:text-2xl font-serif font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-all duration-200"
          >
            <X size={20} className="lg:w-6 lg:h-6" />
          </button>
        </div>
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
