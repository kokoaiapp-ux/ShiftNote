import * as React from "react";
import { CheckCircle2, CircleAlert, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusVariant = "error" | "warning" | "success" | "info" | "neutral";

const icons = {
  error: CircleAlert,
  warning: TriangleAlert,
  success: CheckCircle2,
  info: Info,
  neutral: LoaderCircle,
};

export function StatusMessage({
  children,
  className,
  title,
  variant = "info",
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  variant?: StatusVariant;
}) {
  const Icon = icons[variant];
  return (
    <div
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cn("status-message", `status-message--${variant}`, className)}
      role={variant === "error" ? "alert" : "status"}
    >
      <Icon aria-hidden="true" className={cn("status-message__icon", variant === "neutral" && "animate-spin")} />
      <div className="min-w-0">
        {title && <p className="status-message__title">{title}</p>}
        <div className="status-message__body">{children}</div>
      </div>
    </div>
  );
}
