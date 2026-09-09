"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SubscriptionAccessProvider } from "@/components/subscription/SubscriptionAccessProvider";
import { ProductProvider } from "@/components/product/ProductProvider";
import { AppShell } from "@/components/product/AppShell";
import { isEnterprisePath } from "@/lib/enterprise/routes";

export function ApplicationProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Enterprise review never initializes Professional sessions, billing, or note sync.
  if (isEnterprisePath(pathname)) return <>{children}</>;
  return <AuthProvider><SubscriptionAccessProvider><ProductProvider><AppShell>{children}</AppShell></ProductProvider></SubscriptionAccessProvider></AuthProvider>;
}
