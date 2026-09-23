"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

export interface NavDropdownItem {
  label: string;
  href: string;
}

export interface NavDropdownCategory {
  title?: string;
  items: NavDropdownItem[];
}

interface NavDropdownProps {
  label: string;
  href?: string;
  columns: NavDropdownCategory[];
}

export function NavDropdown({ label, href, columns }: NavDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors outline-none"
        onClick={() => (href ? undefined : setOpen((v) => !v))}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {href ? (
          <Link href={href} className="hover:text-foreground transition-colors" onClick={() => setOpen(false)}>
            {label}
          </Link>
        ) : (
          label
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`absolute left-1/2 -translate-x-1/2 top-full pt-3 transition-all duration-150 ${
          open ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-1 invisible"
        }`}
      >
        <div
          className={`bg-background border border-border/60 rounded-xl shadow-xl p-4 min-w-[220px] ${
            columns.length > 1 ? "max-w-[640px]" : ""
          }`}
        >
          <div
            className={`grid gap-x-8 gap-y-1 ${
              columns.length > 2 ? "grid-cols-3" : columns.length > 1 ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {columns.map((col, ci) => (
              <div key={ci}>
                {col.title && (
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 pt-2 pb-1.5">
                    {col.title}
                  </p>
                )}
                {col.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors whitespace-nowrap"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
