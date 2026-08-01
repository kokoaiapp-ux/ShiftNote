"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/product/PageHeader";
import { HistoryWorkspace } from "@/components/product/HistoryWorkspace";
import { useProduct } from "@/components/product/ProductProvider";

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const product = useProduct();
  const note = product.history.find((item) => item.id === id);
  if (!note) return <div className="grid min-h-80 place-items-center"><Link className="text-sm text-[var(--primary)]" href="/history">Saved documentation was not found · Go back</Link></div>;
  return (
    <>
      <Link className="mb-5 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)]" href="/history"><ArrowLeft className="size-4" /> History</Link>
      <PageHeader eyebrow="Editable workspace" title={note.title} description="Changes auto-save locally. Update with AI only when you explicitly request it, and restore earlier content from Version History." />
      <HistoryWorkspace noteId={id} onDeleted={() => router.push("/history")} />
    </>
  );
}
