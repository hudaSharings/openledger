"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, User, LayoutDashboard, Wallet, Receipt, FileText, Settings, DollarSign } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  if (!session) return null;

  const isAdmin = session.user.role === "admin";

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
    { href: "/budget", label: "Budget", icon: Wallet, adminOnly: false },
    { href: "/transaction-log", label: "Transactions", icon: Receipt, adminOnly: false },
    { href: "/templates", label: "Templates", icon: FileText, adminOnly: true },
    { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
  ].filter((item) => !item.adminOnly || isAdmin);

  // Get current month for income link
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const incomeNavItem = isAdmin ? { href: `/setup/${currentMonth}`, label: "Income", icon: DollarSign, adminOnly: true } : null;

  return (
    <>
      <nav className="border-b bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3 md:gap-8">
            {/* Mobile Menu Button - on left */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <Link 
              href="/" 
              className="text-lg md:text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              OpenLedger
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-6">
              {navItems.map((item) => {
                // Check if current path matches or starts with the href (for nested routes)
                const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium transition-colors ${
                      isActive
                        ? "text-blue-600 border-b-2 border-blue-600 pb-1"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              {incomeNavItem && (
                <Link
                  href={incomeNavItem.href}
                  className={`text-sm font-medium transition-colors ${
                    pathname?.startsWith("/setup")
                      ? "text-blue-600 border-b-2 border-blue-600 pb-1"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {incomeNavItem.label}
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* User email - hidden on mobile */}
            <span className="hidden md:inline text-sm text-gray-600">
              {session.user.email}
            </span>
            
            {/* Sign Out Button - hidden on mobile */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => signOut()} 
              className="hidden md:flex hover:bg-gray-50"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Side Drawer Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[60] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Side Drawer */}
          <div
            className={`fixed left-0 top-0 h-full w-72 max-w-[80vw] bg-white shadow-xl z-[70] md:hidden transform transition-transform duration-300 ease-in-out ${
              mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-base font-bold text-blue-600">Menu</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Drawer Content */}
            <div className="flex flex-col h-[calc(100%-73px)]">
              {/* Navigation Items */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  // Check if current path matches or starts with the href (for nested routes)
                  const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "text-blue-600 bg-blue-50"
                          : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                      title={item.label}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="truncate text-sm">{item.label}</span>
                    </Link>
                  );
                })}
                {incomeNavItem && (
                  <Link
                    href={incomeNavItem.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                      pathname?.startsWith("/setup")
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                    title={incomeNavItem.label}
                  >
                    <DollarSign className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate text-sm">{incomeNavItem.label}</span>
                  </Link>
                )}
              </nav>

              {/* User Info & Sign Out */}
              <div className="border-t p-3 space-y-2">
                <div className="flex items-center gap-2 px-2 py-2">
                  <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {session.user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isAdmin ? "Admin" : "Member"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 text-sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
