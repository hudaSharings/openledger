"use client";

import { useSidebar } from "./sidebar-context";

export function MainContentWrapper({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useSidebar();

  return (
    <main
      className={`min-h-[calc(100vh-4rem)] transition-all duration-300 ${
        sidebarCollapsed ? "md:ml-20" : "md:ml-64"
      }`}
    >
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {children}
      </div>
    </main>
  );
}

