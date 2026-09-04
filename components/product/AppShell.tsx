"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Clock3, FileStack, Heart, LayoutDashboard, Menu, MessageSquareText, Settings, Sparkles, Stethoscope, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useProduct } from "./ProductProvider";
import { FloatingAssistant } from "@/components/floating-assistant/FloatingAssistant";
import { useAuth } from "@/components/auth/AuthProvider";
import { proPaywallHref } from "@/lib/subscription-access-client";
import { useSubscriptionAccess } from "@/components/subscription/SubscriptionAccessProvider";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/copilot", label: "AI Copilot", icon: MessageSquareText },
  { href: "/modes", label: "Modes", icon: Stethoscope },
  { href: "/templates", label: "Templates", icon: FileStack },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/history", label: "History", icon: Clock3 },
  { href: "/settings", label: "Settings", icon: Settings },
];
const proRoutes = ["/copilot", "/modes", "/templates", "/favorites"];
function isProRoute(pathname: string) { return proRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`)); }

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { mode, template } = useProduct();
  const [mobileOpen, setMobileOpen] = useState(false);
  const subscription = useSubscriptionAccess();
  const publicRoutes = ["/", "/login", "/signup", "/onboarding", "/subscription", "/discount", "/privacy", "/terms", "/update-password"];
  const isPublic = publicRoutes.includes(pathname);
  useEffect(() => { if (!isPublic && auth.configured && !auth.loading && !auth.user) router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`); }, [auth.configured, auth.loading, auth.user, isPublic, pathname, router]);
  useEffect(() => {
    if (!isProRoute(pathname) || !auth.configured || auth.loading || !auth.user || subscription.loading || !subscription.access) return;
    if (subscription.access.state !== "activeSubscription") router.replace(proPaywallHref());
  }, [auth.configured, auth.loading, auth.user, pathname, router, subscription.access, subscription.loading]);
  if (isPublic) return <>{children}</>;
  if (auth.configured && (auth.loading || !auth.user)) return <div className="min-h-screen bg-[var(--background)]" />;
  if (auth.configured && auth.user && isProRoute(pathname) && subscription.loading && !subscription.access) return <div className="min-h-screen bg-[var(--background)]" />;
  if (auth.configured && auth.user && isProRoute(pathname) && subscription.access?.state !== "activeSubscription") return <div className="min-h-screen bg-[var(--background)]" />;

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] px-4 py-5">
      <div className="flex items-center justify-between px-2">
        <Link className="flex items-center gap-3" href="/dashboard">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--primary)] text-white shadow-lg"><Sparkles className="size-5" /></span>
          <span><span className="block font-semibold tracking-[-0.02em]">ShiftNote</span><span className="text-[11px] text-[var(--muted-foreground)]">Clinical Copilot</span></span>
        </Link>
        <button className="lg:hidden" onClick={() => setMobileOpen(false)}><X className="size-5" /></button>
      </div>
      <nav className="mt-9 space-y-1">
        {navigation.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]", active && "bg-[var(--primary-soft)] text-[var(--primary)]")}
              href={item.href}
              key={item.href}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon className="size-[18px]" /> {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Active workspace</p>
        <p className="mt-2 truncate text-sm font-semibold">{mode.name}</p>
        <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{template.name}</p>
      </div>
    </aside>
  );

  return (
    <div className={cn("bg-[var(--background)] text-[var(--foreground)]", pathname === "/copilot" ? "h-screen overflow-hidden" : "min-h-screen")}>
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar}</div>
      {mobileOpen && <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm lg:hidden"><div className="h-full w-64">{sidebar}</div></div>}
      <div className="lg:pl-64">
        <header className={cn("sticky top-0 z-30 h-16 items-center justify-between border-b border-[var(--border)] bg-[color:var(--background)]/85 px-5 backdrop-blur-xl md:px-8", pathname === "/copilot" ? "hidden" : "flex")}>
          <div className="flex items-center gap-3">
            <button className="grid size-9 place-items-center rounded-lg hover:bg-[var(--muted)] lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="size-5" /></button>
            <div className="hidden sm:block">
              <p className="text-xs text-[var(--muted-foreground)]">Current mode</p>
              <p className="text-sm font-semibold">{mode.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-right md:block">
              <p className="text-[10px] text-[var(--muted-foreground)]">Current template</p>
              <p className="max-w-48 truncate text-xs font-medium">{template.name}</p>
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-[#d6c0a5] text-xs font-semibold text-[#4b3827]">{(auth.user?.displayName || auth.user?.email || "SN").split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}</div>
          </div>
        </header>
        <main className={cn("mx-auto max-w-[1440px]", pathname === "/copilot" ? "h-[100dvh] overflow-hidden p-3 md:p-5" : "p-5 md:p-8")}>{children}</main>
      </div>
      <FloatingAssistant />
    </div>
  );
}
