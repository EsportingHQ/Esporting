'use client';

import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search teams, competitions, or matches...',
  className = '',
}: SearchInputProps) {
  return (
    <div className={`relative flex items-center w-full glass rounded-xl border border-white/[0.1] focus-within:border-accent-primary/60 focus-within:shadow-[0_0_20px_rgba(217,70,239,0.2)] transition-all ${className}`}>
      <Search className="w-4 h-4 text-text-muted absolute left-3.5 pointer-events-none" />
      <input
        type="search"
        role="searchbox"
        aria-label="Search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-none pl-10 pr-9 py-2.5 text-xs font-body text-white placeholder:text-text-muted/60 focus:outline-none transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 p-1 text-text-muted hover:text-white rounded-lg hover:bg-white/[0.08] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
