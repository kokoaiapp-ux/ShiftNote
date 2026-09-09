import { Check } from "lucide-react";
import { MarketingChrome } from "@/components/enterprise/MarketingChrome";
import { Badge, DemoLink, Panel } from "@/components/enterprise/ui";
import { enterpriseFeatures } from "@/lib/enterprise/demo-data";
export default function EnterpriseSubscriptionPage() {
  return <MarketingChrome><div className="mx-auto max-w-4xl px-5 py-16"><Badge>For Healthcare Organizations</Badge><h1 className="mt-5 text-4xl font-semibold tracking-tight">ShiftNote Enterprise</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">A foundation for your people, facilities, and documentation workflows.</p><Panel className="mt-9"><h2 className="text-xl font-semibold">Enterprise Features</h2><ul className="mt-6 grid gap-5 sm:grid-cols-2">{enterpriseFeatures.map(feature => <li className="flex items-center gap-3 text-sm" key={feature}><Check className="size-4 shrink-0 text-[var(--primary)]" />{feature}</li>)}</ul><p className="mt-8 border-t border-[var(--border)] pt-5 text-sm leading-6 text-[var(--muted-foreground)]">This is a preview of planned Enterprise capabilities. There is no purchase or subscription activation in this prototype.</p><DemoLink className="mt-6" /></Panel></div></MarketingChrome>;
}
