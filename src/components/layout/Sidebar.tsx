"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  ScanLine,
  Wallet,
  Receipt,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match exactly (for index routes) instead of by prefix. */
  exact?: boolean;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Invoices",
    items: [
      { href: "/", label: "Approval queue", icon: FileText, exact: true },
      { href: "/invoices/scan", label: "Scan invoice", icon: ScanLine },
    ],
  },
  {
    section: "Revenue",
    items: [
      { href: "/revenues", label: "Reports", icon: Wallet, exact: true },
      { href: "/revenues/scan", label: "Scan report", icon: ScanLine },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
      <div className="flex items-center gap-2 border-b px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Receipt className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">VietFinance</p>
          <p className="text-xs text-muted-foreground">Approval Station</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 px-3 py-5">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.section}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t px-5 py-3 text-xs text-muted-foreground">
        German accounting &middot; OCR + GPT-4o
      </div>
    </aside>
  );
}
