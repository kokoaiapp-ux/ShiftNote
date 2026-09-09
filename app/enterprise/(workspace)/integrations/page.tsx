import { Plug } from "lucide-react";
import { ehrPlatforms } from "@/lib/enterprise/demo-data";
import { Badge, PageIntro, Panel } from "@/components/enterprise/ui";
export default function IntegrationsPage() { return <><PageIntro title="EHR Integrations" description="Future versions will support secure EHR integration through industry-standard technologies. All integrations below are planned; no EHR is connected." /><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{ehrPlatforms.map(ehr => <Panel key={ehr}><Plug className="size-6 text-[var(--primary)]" /><h2 className="mt-5 text-lg font-semibold">{ehr}</h2><div className="mt-5 flex items-center justify-between gap-3"><span className="text-xs text-[var(--muted-foreground)]">Status</span><Badge /></div></Panel>)}</div></>; }
