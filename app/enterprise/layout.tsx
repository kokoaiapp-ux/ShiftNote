import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "ShiftNote Enterprise", template: "%s | ShiftNote Enterprise" }, description: "AI documentation built for healthcare organizations. Secure organization management and Enterprise documentation workflows." };

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">{children}</div>;
}
