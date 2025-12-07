"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, User, LayoutDashboard, Wallet, Receipt, FileText, Settings, IndianRupee, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { getHouseholdName } from "@/src/lib/actions/auth";
import { useSidebar } from "./sidebar-context";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [householdName, setHouseholdName] = useState<string | null>(null);

  // Close menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Fetch household name
  useEffect(() => {
    if (session?.user?.householdId) {
      getHouseholdName()
        .then((name) => setHouseholdName(name))
        .catch((err) => console.error("Failed to fetch household name:", err));
    }
  }, [session]);

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
    { href: "/reminders", label: "Reminders", icon: Bell, adminOnly: false },
    { href: "/templates", label: "Recurring Items", icon: FileText, adminOnly: true },
    { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
  ].filter((item) => !item.adminOnly || isAdmin);

  // Get current month for income link
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const incomeNavItem = isAdmin ? { href: `/setup/${currentMonth}`, label: "Income", icon: IndianRupee, adminOnly: true } : null;

  return (
    <>
      {/* Top Navbar - Always visible */}
      <nav className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-50">
        <div className={`flex h-16 items-center justify-between px-4 md:px-6 transition-all duration-300 ${
          sidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}>
          <div className="flex items-center gap-4">
            {/* Menu Button - visible on mobile, hidden on desktop when sidebar is persistent */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Branding - Left aligned on desktop */}
            <Link 
              href="/" 
              className="flex items-center gap-3 group"
            >
              <div className="flex flex-col">
                <span className="text-lg md:text-xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                  OpenLedger
                </span>
                {householdName && (
                  <span className="text-xs font-medium text-gray-500 truncate max-w-[200px] md:max-w-none">
                    {householdName}
                  </span>
                )}
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
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

      {/* Persistent Sidebar - Desktop */}
      <aside
        className={`hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 shadow-lg z-40 flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center justify-between border-b border-gray-200 bg-gray-50/50 ${
          sidebarCollapsed ? "flex-col gap-2 p-3" : "p-4"
        }`}>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-gray-900">Menu</h2>
              {householdName && (
                <span className="text-xs text-gray-500 truncate mt-0.5">
                  {householdName}
                </span>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
            className={`h-8 w-8 hover:bg-gray-200 ${sidebarCollapsed ? "mx-auto" : ""}`}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            )}
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex rounded-md text-sm font-medium transition-all duration-200 ${
                  sidebarCollapsed 
                    ? "flex-col items-center justify-center gap-1.5 py-3 px-2 min-h-[64px]" 
                    : "flex-row items-center gap-3 py-2.5 px-3 min-h-[40px]"
                } ${
                  isActive
                    ? "text-blue-600 bg-blue-50 border border-blue-100"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`flex-shrink-0 ${sidebarCollapsed ? "h-5 w-5" : "h-5 w-5"}`} />
                {!sidebarCollapsed ? (
                  <span className="truncate text-sm font-medium">{item.label}</span>
                ) : (
                  <span className="text-[10px] text-center leading-tight font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
          {incomeNavItem && (
            <Link
              href={incomeNavItem.href}
              className={`flex rounded-md text-sm font-medium transition-all duration-200 ${
                sidebarCollapsed 
                  ? "flex-col items-center justify-center gap-1.5 py-3 px-2 min-h-[64px]" 
                  : "flex-row items-center gap-3 py-2.5 px-3 min-h-[40px]"
              } ${
                pathname?.startsWith("/setup")
                  ? "text-blue-600 bg-blue-50 border border-blue-100"
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              }`}
              title={sidebarCollapsed ? incomeNavItem.label : undefined}
            >
              <IndianRupee className={`flex-shrink-0 ${sidebarCollapsed ? "h-5 w-5" : "h-5 w-5"}`} />
              {!sidebarCollapsed ? (
                <span className="truncate text-sm font-medium">{incomeNavItem.label}</span>
              ) : (
                <span className="text-[10px] text-center leading-tight font-medium">{incomeNavItem.label}</span>
              )}
            </Link>
          )}
        </nav>

        {/* User Info & Sign Out */}
        <div className="border-t border-gray-200 bg-gray-50/50 p-3 space-y-2">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-white/60">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">
                  {session.user.email}
                </p>
                <p className="text-xs text-gray-500">
                  {isAdmin ? "Admin" : "Member"}
                </p>
              </div>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className={`w-full gap-2 text-sm border-gray-300 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors ${
              sidebarCollapsed ? "justify-center px-2" : "justify-start"
            }`}
            onClick={() => signOut()}
            title={sidebarCollapsed ? "Sign Out" : undefined}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Side Drawer */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[60] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Side Drawer */}
          <div
            className={`fixed left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl z-[70] md:hidden transform transition-transform duration-300 ease-in-out ${
              mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex flex-col">
                <h2 className="text-base font-bold text-blue-600">Menu</h2>
                {householdName && (
                  <span className="text-xs text-gray-600 truncate max-w-[200px]">
                    {householdName}
                  </span>
                )}
              </div>
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
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm">{item.label}</span>
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
                  >
                    <IndianRupee className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">{incomeNavItem.label}</span>
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
