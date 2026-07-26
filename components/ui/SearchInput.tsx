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
  placeholder = 'SEARCH TEAMS, COMPETITIONS, OR MATCHES...',
  className = '',
}: SearchInputProps) {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="w-4 h-4 text-text-muted absolute left-3 pointer-events-none" />
      <input
        type="search"
        role="searchbox"
        aria-label="Search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg-void border border-border-line rounded pl-9 pr-8 py-2 text-xs font-data text-text-primary placeholder:text-text-muted/60 focus:border-accent-readout focus:outline-none transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 p-0.5 text-text-muted hover:text-text-primary rounded hover:bg-bg-surface transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
