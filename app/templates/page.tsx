"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/product/PageHeader";
import { ProductIcon } from "@/components/product/Icon";
import { useProduct } from "@/components/product/ProductProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTemplatesForMode } from "@/lib/product-data";

export default function TemplatesPage() {
  const router = useRouter();
  const product = useProduct();
  const available = getTemplatesForMode(product.mode.id);

  function choose(id: string, starter?: string) {
    product.clearChat();
    product.setTemplate(id, starter);
    router.push("/copilot");
  }

  return (
    <>
      <PageHeader eyebrow={`${product.mode.name} mode`} title="Documentation templates" description="Each template includes five professional starting scenarios. Choose one and the copilot will ask only for the clinical facts needed to customize it." />
      <div className="mb-4 rounded-2xl border border-dashed border-[var(--primary)]/40 bg-[var(--primary-soft)] p-5">
        <h2 className="font-semibold">Custom Template</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Can&apos;t find the template you need? Describe your needs naturally and let ShiftNote generate professional clinical documentation.</p>
        <Button className="mt-4" onClick={() => { product.clearChat(); router.push("/copilot"); }}>Use Custom Template</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {available.map((template) => (
          <Card key={template.id}><CardContent>
            <span className="grid size-11 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]"><ProductIcon className="size-5" name={template.icon} /></span>
            <h2 className="mt-4 font-semibold">{template.name}</h2>
            <p className="mt-1.5 min-h-10 text-xs leading-5 text-[var(--muted-foreground)]">{template.description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {template.examples.map((example) => <button className="rounded-lg bg-[var(--muted)] px-2.5 py-1.5 text-[11px] transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]" key={example.id} onClick={() => choose(template.id, example.starter)}>{example.title}</button>)}
            </div>
            <Button className="mt-5 w-full" onClick={() => choose(template.id)}>Use template</Button>
          </CardContent></Card>
        ))}
      </div>
      {product.customTemplates.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">My Templates</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {product.customTemplates.filter((item) => item.modeId === product.mode.id).map((item) => <Card key={item.id}><CardContent><h3 className="font-semibold">{item.name}</h3><p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--muted-foreground)]">{item.description}</p><Button className="mt-4" onClick={() => { product.clearChat(); router.push("/copilot"); }} size="sm">Use custom template</Button></CardContent></Card>)}
          </div>
        </section>
      )}
    </>
  );
}
