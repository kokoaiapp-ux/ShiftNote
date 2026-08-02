"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { copyStylesToPipWindow } from "@/lib/document-pip";

export function useDocumentPip() {
  const pipWindowRef = useRef<Window | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSupported] = useState(
    () => typeof window !== "undefined" && Boolean(window.documentPictureInPicture),
  );

  const close = useCallback(() => {
    const pipWindow = pipWindowRef.current;
    pipWindowRef.current = null;
    setPortalRoot(null);
    setIsOpen(false);
    if (pipWindow && !pipWindow.closed) pipWindow.close();
  }, []);

  const open = useCallback(async () => {
    const api = window.documentPictureInPicture;
    if (!api) {
      setIsOpen(true);
      return;
    }

    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.focus();
      return;
    }

    const pipWindow = await api.requestWindow({
      width: 680,
      height: 760,
      preferInitialWindowPlacement: true,
    });

    pipWindowRef.current = pipWindow;
    pipWindow.document.title = "ShiftNote Assistant";
    pipWindow.document.documentElement.lang = "en";
    pipWindow.document.documentElement.className = document.documentElement.className;
    pipWindow.document.documentElement.dataset.compact = document.documentElement.dataset.compact ?? "false";
    pipWindow.document.documentElement.style.cssText = document.documentElement.style.cssText;
    pipWindow.document.body.style.margin = "0";
    pipWindow.document.body.style.minHeight = "100vh";
    copyStylesToPipWindow(document, pipWindow.document);

    const root = pipWindow.document.createElement("div");
    root.id = "shiftnote-pip-root";
    root.style.height = "100vh";
    pipWindow.document.body.appendChild(root);

    const themeObserver = new MutationObserver(() => {
      pipWindow.document.documentElement.className = document.documentElement.className;
      pipWindow.document.documentElement.dataset.compact = document.documentElement.dataset.compact ?? "false";
      pipWindow.document.documentElement.style.cssText = document.documentElement.style.cssText;
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-compact", "style"] });

    const handlePageHide = () => {
      themeObserver.disconnect();
      pipWindowRef.current = null;
      setPortalRoot(null);
      setIsOpen(false);
    };
    pipWindow.addEventListener("pagehide", handlePageHide, { once: true });
    setPortalRoot(root);
    setIsOpen(true);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else void open();
  }, [close, isOpen, open]);

  useEffect(() => {
    return close;
  }, [close]);

  return { close, isOpen, isSupported, open, portalRoot, toggle };
}
