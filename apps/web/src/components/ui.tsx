import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';

export const cn = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/50',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)} {...props} />;
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const BADGE_TONES = {
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-100 text-slate-600',
} as const;

export function Badge({ tone = 'slate', children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', BADGE_TONES[tone])}>
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label ?? 'Loading…'}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}
