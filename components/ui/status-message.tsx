import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusMessage({ variant: suppliedVariant, type, title, children, className }: { variant?: "error" | "warning" | "success" | "info" | "neutral"; type?: "error" | "warning" | "success" | "info" | "neutral"; title?: string; children: React.ReactNode; className?: string }) {
  const variant = suppliedVariant ?? type ?? "info";
  const Icon = variant === "error" ? CircleAlert : variant === "warning" ? TriangleAlert : variant === "success" ? CircleCheck : Info;
  return <div className={cn("status-message", `status-message--${variant}`, className)} role={variant === "error" ? "alert" : "status"} aria-live={variant === "error" ? "assertive" : "polite"}><Icon className="status-message__icon" aria-hidden /><div>{title && <p className="status-message__title">{title}</p>}<div className="status-message__body">{children}</div></div></div>;
}
