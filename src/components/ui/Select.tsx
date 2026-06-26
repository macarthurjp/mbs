import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
}

export function Select({
  label,
  error,
  options,
  className = '',
  children,
  disabled,
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-2.5 block text-[11px] font-black uppercase tracking-[0.24em] text-[#8a6a16]">
          {label}
        </label>
      )}

      <div className="group relative">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.08),transparent_45%)] opacity-0 transition-opacity duration-300 group-focus-within:opacity-100" />

        <select
          className={`relative w-full appearance-none rounded-2xl border border-[#e9e2d3] bg-white/95 px-4 py-3.5 pr-12 text-[15px] font-semibold text-[#050505] shadow-[0_10px_30px_rgba(15,15,15,0.05)] backdrop-blur-sm transition-all duration-300 focus:border-[#f4c542] focus:outline-none focus:ring-4 focus:ring-[#f4c542]/20 focus:shadow-[0_18px_45px_rgba(244,197,66,0.12)] ${
            error
              ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
              : 'hover:border-[#d9ceb8]'
          } ${
            disabled
              ? 'cursor-not-allowed bg-[#f6f4ee] text-[#71717a] opacity-70'
              : 'hover:-translate-y-[1px]'
          } ${className}`}
          disabled={disabled}
          {...props}
        >
          {options ? (
            options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          ) : (
            children
          )}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#8a6a16] transition-transform duration-300 group-focus-within:translate-y-[1px]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5 drop-shadow-sm"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {error && (
        <p className="mt-2.5 text-sm font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default Select;
