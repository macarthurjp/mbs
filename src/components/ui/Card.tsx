import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-[2rem] border border-[#e9e2d3] bg-white/92 shadow-[0_18px_50px_rgba(15,15,15,0.06)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#ddd3be] hover:shadow-[0_30px_90px_rgba(15,15,15,0.12)] ${className}`}
      onClick={onClick}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.10),transparent_36%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f4c542]/40 to-transparent opacity-70" />

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div
      className={`relative overflow-hidden border-b border-[#f1ebdf] bg-gradient-to-r from-[#fffdf8] via-[#fdfbf7] to-white px-6 py-5 backdrop-blur-xl ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.10),transparent_42%)]" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#f4c542]/20 to-transparent" />

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`relative z-10 p-6 lg:p-7 xl:p-8 ${className}`}>
      {children}
    </div>
  );
}

export default Card;
