import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingChrome } from "@/components/enterprise/MarketingChrome";
import { Badge, buttonClass, Panel } from "@/components/enterprise/ui";
export default function EnterpriseDemoPage() {
  return <MarketingChrome><div className="mx-auto max-w-3xl px-5 py-20"><Badge>Interactive preview</Badge><h1 className="mt-5 text-4xl font-semibold tracking-tight">Step inside your Enterprise workspace.</h1><p className="mt-5 text-lg leading-8 text-[var(--muted-foreground)]">Explore Evergreen Care Group, a fictional healthcare organization, across its facilities, teams, and analytics.</p><Panel className="my-8"><h2 className="font-semibold">A safe place to explore</h2><p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">No login is required. All metrics and people are sample data. Settings changes last only while this page is open. EHRs, subscriptions, and user provisioning are not connected.</p><p className="mt-3 text-sm font-medium">Please do not enter real patient or clinical information.</p></Panel><Link className={buttonClass} href="/enterprise/dashboard">Open Enterprise Dashboard <ArrowRight className="size-4" /></Link></div></MarketingChrome>;
}
