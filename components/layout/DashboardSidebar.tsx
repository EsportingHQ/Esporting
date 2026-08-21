"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Activity,
  Layout,
  UserPlus,
  Users,
  Newspaper,
  Plus,
  Settings,
  Shield,
} from "lucide-react";

const icons = {
  Layout,
  Newspaper,
  Users,
  UserPlus,
  Activity,
  Settings,
  Shield,
  Plus,
} as const;

export type NavIcon = keyof typeof icons;

export type NavItem = {
  label: string;
  href: string;
  icon: NavIcon;
};

export type NavSection = {
  role: string;
  title: string;
  items: NavItem[];
};

export function DashboardSidebar({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-60"
      } bg-bg-surface border-r border-border-line shrink-0 transition-all duration-200 flex flex-col`}
    >
      <nav className="px-3 py-4 space-y-6 overflow-y-auto">
        {sections.map((section, index) => (
          <div key={section.role} className="space-y-1">
            <div className="flex items-center justify-between px-3 mb-1">
              {!collapsed && (
                <p className="text-[9px] font-display font-bold text-text-muted uppercase tracking-widest">
                  {section.title}
                </p>
              )}

              {index === 0 && (
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => !c)}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className="ml-auto flex items-center justify-center p-1 text-text-muted hover:text-text-primary transition-colors"
                >
                  <Menu className="w-4 h-4" />
                </button>
              )}
            </div>

            {section.items.map((item) => {
              const Icon = icons[item.icon];
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded text-xs font-display font-bold uppercase tracking-wider border border-transparent transition-all ${
                    active
                      ? "text-accent-readout bg-bg-void border-border-line"
                      : "text-text-muted hover:text-text-primary hover:bg-bg-void"
                  }`}
                >
                  <Icon className="w-4 h-4 text-accent-readout shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
