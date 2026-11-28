'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({
  id,
  name,
  placeholder,
  autoComplete,
  minLength,
  className,
  value,
  onChange,
  style,
}: {
  id: string;
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`${className ?? ''} pr-11`}
        style={{ ...style, paddingRight: 44 }}
        {...(onChange ? { value: value ?? '', onChange: (e) => onChange(e.target.value) } : {})}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
        style={style ? { color: '#888' } : undefined}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
