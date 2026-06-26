import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl font-black tracking-[0.01em] transition-all duration-300 ease-out focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0';

  const variantStyles = {
    primary:
      'border border-[#050505] bg-[#050505] text-[#f4c542] shadow-[0_18px_40px_rgba(0,0,0,0.28)] hover:-translate-y-0.5 hover:bg-[#111111] hover:shadow-[0_28px_70px_rgba(0,0,0,0.34)] focus:ring-[#f4c542]/30',

    secondary:
      'border border-[#e9e2d3] bg-white/92 text-[#050505] shadow-[0_12px_34px_rgba(15,15,15,0.06)] hover:-translate-y-0.5 hover:border-[#d9ceb8] hover:bg-[#fbfaf7] hover:shadow-[0_20px_48px_rgba(15,15,15,0.08)] focus:ring-[#f4c542]/20',

    danger:
      'border border-red-500 bg-red-500 text-white shadow-[0_18px_40px_rgba(220,38,38,0.24)] hover:-translate-y-0.5 hover:bg-red-600 hover:shadow-[0_24px_60px_rgba(220,38,38,0.32)] focus:ring-red-300',

    ghost:
      'border border-transparent bg-transparent text-[#71717a] hover:bg-[#fbfaf7] hover:text-[#050505] focus:ring-[#f4c542]/20',

    outline:
      'border border-[#e9e2d3] bg-white/92 text-[#050505] shadow-[0_12px_34px_rgba(15,15,15,0.06)] hover:-translate-y-0.5 hover:border-[#d9ceb8] hover:bg-[#fbfaf7] hover:shadow-[0_20px_48px_rgba(15,15,15,0.08)] focus:ring-[#f4c542]/20'
  };

  const sizeStyles = {
    sm: 'px-4 py-2.5 text-sm',
    md: 'px-5 py-3 text-[15px]',
    lg: 'px-7 py-4 text-lg'
  };

  const disabledStyles = disabled
    ? 'opacity-55 saturate-75'
    : '';

  return (
    <button
      className={`group ${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${
        disabled ? 'pointer-events-none' : ''
      } ${className}`}
      disabled={disabled}
      {...props}
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.18),transparent_42%)] opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative z-10 flex items-center gap-2">
        {Icon && <Icon size={18} />}
        {children}
      </span>
    </button>
  );
}

export default Button;
