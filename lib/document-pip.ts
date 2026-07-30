const COPY_MARKER = "data-shiftnote-pip-style";

export function copyStylesToPipWindow(source: Document, target: Document) {
  target.head.querySelectorAll(`[${COPY_MARKER}]`).forEach((node) => node.remove());

  source.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel="stylesheet"]').forEach((node) => {
    const clone = node.cloneNode(true) as HTMLStyleElement | HTMLLinkElement;
    clone.setAttribute(COPY_MARKER, "true");
    if (clone instanceof HTMLLinkElement && node instanceof HTMLLinkElement) {
      clone.href = node.href;
    }
    target.head.appendChild(clone);
  });

  for (const sheet of source.adoptedStyleSheets ?? []) {
    try {
      const style = target.createElement("style");
      style.setAttribute(COPY_MARKER, "true");
      style.textContent = Array.from(sheet.cssRules, (rule) => rule.cssText).join("\n");
      target.head.appendChild(style);
    } catch {
      // Cross-origin stylesheets cannot expose cssRules; their cloned <link> still loads.
    }
  }
}
