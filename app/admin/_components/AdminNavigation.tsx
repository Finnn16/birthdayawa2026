"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  id: string;
  label: string;
  icon: string;
  href: string;
};

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "📊", href: "/admin/dashboard" },
  { id: "studio", label: "Content Studio", icon: "✏️", href: "/admin/studio" },
  { id: "analytics", label: "Analytics", icon: "📈", href: "/admin/analytics" },
  { id: "vault", label: "Memory Vault", icon: "💾", href: "/admin/vault" },
];

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => {
        const isActive = pathname.includes(item.id);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive
                ? "bg-purple-100 text-purple-900 font-semibold"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
