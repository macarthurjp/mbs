import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor
}: StatCardProps) {
  return (
    <div className="group relative min-w-0 overflow-hidden rounded-[1.6rem] border border-[#e9e2d3] bg-white/95 p-4 shadow-[0_12px_40px_rgba(15,15,15,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#f4c542]/30 hover:shadow-[0_24px_60px_rgba(15,15,15,0.1)] sm:rounded-[2rem] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.08),transparent_38%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative z-10 flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="mb-2 truncate text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16] sm:mb-3 sm:text-[11px] sm:tracking-[0.24em]">
            {title}
          </p>

          <p className="mb-2 overflow-hidden text-2xl font-black tracking-tight text-[#050505] sm:text-3xl md:text-4xl xl:text-5xl">
            {value}
          </p>

          <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-[#71717a] sm:text-sm">
            {subtitle}
          </p>
        </div>

        <div
          className={`${iconColor} flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border border-white/10 shadow-[0_18px_40px_rgba(15,15,15,0.14)] transition-all duration-300 group-hover:scale-105 group-hover:rotate-3 sm:h-14 sm:w-14 md:h-16 md:w-16 md:rounded-[1.4rem]`}
        >
          <Icon size={22} className="shrink-0 drop-shadow-sm sm:size-[24px] md:size-[28px]" />
        </div>
      </div>
    </div>
  );
}
