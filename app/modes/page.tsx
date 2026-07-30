"use client";

import { Check } from "lucide-react";
import { PageHeader } from "@/components/product/PageHeader";
import { ProductIcon } from "@/components/product/Icon";
import { useProduct } from "@/components/product/ProductProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { modes } from "@/lib/product-data";

export default function ModesPage() {
  const { mode: currentMode, setMode } = useProduct();
  return (
    <>
      <PageHeader eyebrow="Professional context" title="Choose your mode" description="Your mode controls clinical terminology, follow-up questions, system instructions, and available documentation templates." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modes.map((mode) => {
          const selected = mode.id === currentMode.id;
          return (
            <Card className={selected ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/10" : ""} key={mode.id}>
              <CardContent className="flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]"><ProductIcon className="size-6" name={mode.icon} /></span>
                  {selected && <span className="flex items-center gap-1 text-xs font-medium text-[var(--primary)]"><Check className="size-3.5" /> Current mode</span>}
                </div>
                <h2 className="mt-5 font-semibold">{mode.name}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-[var(--muted-foreground)]">{mode.description}</p>
                <Button className="mt-5 w-full" onClick={() => setMode(mode.id)} variant={selected ? "secondary" : "outline"}>{selected ? "Selected" : "Select mode"}</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
