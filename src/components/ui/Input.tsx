import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
}

export function Input({
  label,
  error,
  icon: Icon,
  className = '',
  disabled,
  ...props
}: InputProps) {
  const autofillStyles =
    '[&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.96)] [&:-webkit-autofill]:[-webkit-text-fill-color:#050505]';

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2.5 block text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">
          {label}
        </label>
      )}

      <div className="relative">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.10),transparent_46%)] opacity-90" />

        {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[#a1a1aa]" />}
        <input
          className={`relative w-full rounded-2xl border-2 border-[#e9e2d3] bg-white/96 px-4 py-3.5 text-[15px] font-semibold text-[#050505] shadow-[0_10px_30px_rgba(15,15,15,0.05)] backdrop-blur-md transition-all duration-200 ease-out placeholder:text-[#a1a1aa] placeholder:font-medium focus:border-[#f4c542] focus:outline-none focus:ring-4 focus:ring-[#f4c542]/25 focus:shadow-[0_18px_48px_rgba(244,197,66,0.18)] ${
            error
              ? 'border-red-400 focus:border-red-400 focus:ring-red-200 focus:shadow-[0_18px_48px_rgba(220,38,38,0.16)]'
              : 'hover:border-[#d9ceb8] hover:shadow-[0_14px_34px_rgba(15,15,15,0.07)]'
          } ${
            disabled
              ? 'cursor-not-allowed border-[#ece7dc] bg-[#f6f4ee] text-[#71717a] opacity-75 shadow-none'
              : ''
          } ${Icon ? 'pl-12' : ''} ${autofillStyles} ${className}`}
          disabled={disabled}
          {...props}
        />
      </div>

      {error && (
        <p className="mt-2.5 text-sm font-black tracking-[0.01em] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default Input;
