import React from 'react';

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(' ');
}

// Card component
export function Card(props: { children: React.ReactNode; className?: string }) {
  return <div className={cx('rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-200', props.className)}>{props.children}</div>;
}

// Badge component
export function Badge(props: { children: React.ReactNode; tone?: 'indigo' | 'slate' | 'rose' | 'emerald' | 'amber' | 'green'; className?: string }) {
  const tone = props.tone ?? 'slate';
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-green-50 text-green-700 border-green-200',
  };
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border', tones[tone], props.className)}>{props.children}</span>;
}

// Button component
export function Button(props: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}) {
  const v = props.variant ?? 'secondary';
  const size = props.size ?? 'md';
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  const styles =
    v === 'primary'
      ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600'
      : v === 'danger'
        ? 'bg-rose-600 text-white hover:bg-rose-700 border-rose-600'
      : v === 'success'
        ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600'
      : v === 'ghost'
        ? 'bg-transparent hover:bg-slate-50 border-transparent'
        : 'bg-white hover:bg-slate-50 border-slate-200';

  return (
    <button
      type={props.type ?? 'button'}
      disabled={props.disabled || props.loading}
      onClick={props.onClick}
      className={cx(
        'inline-flex items-center justify-center rounded-lg border font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        styles,
        sizes[size],
        props.className
      )}
    >
      {props.loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {props.children}
    </button>
  );
}

// Input component
export function Input(props: {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number';
  error?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cx('space-y-2', props.className)}>
      {props.label && (
        <label className="block text-sm font-medium text-slate-700">
          {props.label}
          {props.required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(e) => props.onChange?.(e.target.value)}
        placeholder={props.placeholder}
        disabled={props.disabled}
        className={cx(
          'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200',
          props.error ? 'border-rose-300 focus:ring-rose-500' : '',
          props.disabled ? 'bg-slate-50 cursor-not-allowed' : ''
        )}
      />
      {props.error && (
        <p className="text-sm text-rose-600">{props.error}</p>
      )}
    </div>
  );
}

// Alert component
export function Alert(props: { children: React.ReactNode; tone?: 'info' | 'success' | 'warning' | 'error'; className?: string }) {
  const tone = props.tone ?? 'info';
  const tones: Record<string, string> = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
  };
  
  const icons: Record<string, string> = {
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  };

  return (
    <div className={cx('rounded-lg border p-4 flex items-start gap-3', tones[tone], props.className)}>
      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[tone]} />
      </svg>
      <div className="text-sm">{props.children}</div>
    </div>
  );
}

// Loading Spinner component
export function Spinner(props: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const size = props.size ?? 'md';
  const sizes: Record<string, string> = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };
  
  return (
    <svg className={cx('animate-spin text-indigo-600', sizes[size], props.className)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

// Progress Bar component
export function ProgressBar(props: { value: number; max?: number; className?: string; showLabel?: boolean }) {
  const max = props.max ?? 100;
  const percentage = Math.min(Math.max((props.value / max) * 100, 0), 100);
  
  return (
    <div className={cx('space-y-2', props.className)}>
      {props.showLabel && (
        <div className="flex justify-between text-sm text-slate-600">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div 
          className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

