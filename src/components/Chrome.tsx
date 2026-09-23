"use client";

import {
  Layers,
  LayoutDashboard,
  ScanFace,
  Settings as SettingsIcon,
  Sparkles,
  SquarePen,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/evaluation/new", label: "New Evaluation", icon: SquarePen },
  { href: "/batch", label: "Batch", icon: Layers },
  { href: "/demo", label: "Demo", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ink)] text-[var(--paper)] transition-transform duration-300 group-hover:-rotate-6">
              <ScanFace className="h-5 w-5" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="font-display block text-[15px] font-semibold tracking-tight text-[var(--ink)]">
                Emoji Reverse Engineering
              </span>
              <span className="block text-[10px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                Evaluator · Computer Graphics
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "text-[var(--ink)]"
                      : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-[var(--accent)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/evaluation/new"
            className="hidden items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition hover:brightness-110 sm:flex"
          >
            <SquarePen className="h-4 w-4" aria-hidden />
            Analyze
          </Link>
        </div>

        {/* Mobile nav */}
        <nav
          className="flex items-center gap-1 overflow-x-auto border-t border-[var(--line)] px-3 py-2 md:hidden"
          aria-label="Primary mobile"
        >
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium whitespace-nowrap ${
                  active
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "text-[var(--ink-soft)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-[var(--line)] bg-[var(--paper-2)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-[var(--ink-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Automated visual similarity is an assessment aid — not proof of
            copying, not a measure of programming ability, not an automatic grade.
          </p>
          <p className="font-mono text-[11px]">
            Emoji RE Evaluator · v1.0
          </p>
        </div>
      </footer>
    </div>
  );
}
