"use client";

import { SessionProvider } from "next-auth/react";
import { SidebarProvider } from "./sidebar-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <SidebarProvider>{children}</SidebarProvider>
    </SessionProvider>
  );
}

