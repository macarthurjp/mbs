type AdaptiveValueProps = {
  value: string | number;
  className?: string;
};

function getLengthClass(value: string) {
  const length = Array.from(value.trim()).length;

  if (length <= 12) return '';
  if (length <= 16) return '!text-[clamp(1.15rem,2.6vw,2rem)]';
  if (length <= 20) return '!text-[clamp(0.95rem,2.1vw,1.55rem)]';
  if (length <= 24) return '!text-[clamp(0.78rem,1.7vw,1.2rem)]';
  return '!text-[clamp(0.68rem,1.35vw,0.95rem)]';
}

export function AdaptiveValue({ value, className = '' }: AdaptiveValueProps) {
  const displayValue = String(value);

  return (
    <p
      className={`max-w-full whitespace-nowrap tabular-nums ${getLengthClass(displayValue)} ${className}`}
      title={displayValue}
    >
      {displayValue}
    </p>
  );
}
