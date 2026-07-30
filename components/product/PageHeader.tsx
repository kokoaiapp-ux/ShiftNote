export function PageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description: string }) {
  return (
    <div className="mb-7">
      {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">{eyebrow}</p>}
      <h1 className="text-2xl font-semibold tracking-[-0.035em] md:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
    </div>
  );
}
