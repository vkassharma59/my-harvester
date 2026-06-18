import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from './ui';

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  /** Shown inside the dropdown when nothing matches the query. */
  emptyText?: string;
  id?: string;
}

/**
 * A searchable single-select dropdown. Closed, the input shows the selected
 * value; focused, it clears so you can type to filter. Picking an option (or
 * clicking away) closes the list.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  emptyText = 'No matches',
  id,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the list when the user clicks anywhere outside it.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const select = (opt: string) => {
    onChange(opt);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        disabled={disabled}
        className={cn(
          'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm outline-none',
          'placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
        )}
        placeholder={placeholder}
        value={open ? query : value}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
        ▾
      </span>

      {open && !disabled && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">{emptyText}</li>
          ) : (
            filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  // mousedown (not click) so the input doesn't blur and swallow the pick first
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(opt);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50',
                    opt === value ? 'font-medium text-brand-700' : 'text-slate-700',
                  )}
                >
                  {opt}
                  {opt === value && <span className="text-brand-600">✓</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
