"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) return null;

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/budget", label: "Budget" },
    { href: "/transaction-log", label: "Transactions" },
    { href: "/templates", label: "Templates" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
            OpenLedger
          </Link>
          <div className="hidden md:flex gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "text-blue-600 border-b-2 border-blue-600 pb-1"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-sm text-gray-600">{session.user.email}</span>
          <Button variant="outline" size="sm" onClick={() => signOut()} className="hover:bg-gray-50">
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  );
}
