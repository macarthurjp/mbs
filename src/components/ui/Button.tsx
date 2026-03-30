import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
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
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white hover:scale-105',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 shadow-md hover:shadow-lg',
    danger: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white hover:scale-105'
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
}

export default Button;
