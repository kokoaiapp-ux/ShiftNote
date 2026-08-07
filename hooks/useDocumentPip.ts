"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { copyStylesToPipWindow } from "@/lib/document-pip";

const MOBILE_VIEWPORT = "(max-width: 767px)";
function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_VIEWPORT).matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function useDocumentPip() {
  const pipWindowRef = useRef<Window | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(isMobileDevice);
  const isSupported = !isMobile && typeof window !== "undefined" && Boolean(window.documentPictureInPicture);

  const close = useCallback(() => {
    const pipWindow = pipWindowRef.current;
    pipWindowRef.current = null;
    setPortalRoot(null);
    setIsOpen(false);
    if (pipWindow && !pipWindow.closed) pipWindow.close();
  }, []);

  const open = useCallback(async () => {
    if (isMobileDevice()) return;
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
    const colorSchemeMeta = pipWindow.document.createElement("meta");
    colorSchemeMeta.name = "color-scheme";
    pipWindow.document.head.appendChild(colorSchemeMeta);
    const themeColorMeta = pipWindow.document.createElement("meta");
    themeColorMeta.name = "theme-color";
    pipWindow.document.head.appendChild(themeColorMeta);

    const syncPipTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const background = isDark ? "#101513" : "#f6f8f7";
      pipWindow.document.documentElement.className = document.documentElement.className;
      pipWindow.document.documentElement.dataset.compact = document.documentElement.dataset.compact ?? "false";
      pipWindow.document.documentElement.style.cssText = document.documentElement.style.cssText;
      pipWindow.document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      pipWindow.document.body.style.colorScheme = isDark ? "dark" : "light";
      pipWindow.document.body.style.backgroundColor = background;
      colorSchemeMeta.content = isDark ? "dark" : "light";
      themeColorMeta.content = background;
    };

    pipWindow.document.body.style.margin = "0";
    pipWindow.document.body.style.minHeight = "100vh";
    copyStylesToPipWindow(document, pipWindow.document);
    syncPipTheme();

    const root = pipWindow.document.createElement("div");
    root.id = "shiftnote-pip-root";
    root.style.height = "100vh";
    pipWindow.document.body.appendChild(root);

    const themeObserver = new MutationObserver(syncPipTheme);
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

  useEffect(() => {
    const media = window.matchMedia(MOBILE_VIEWPORT);
    const update = () => {
      const mobile = isMobileDevice();
      setIsMobile(mobile);
      if (mobile) close();
    };
    media.addEventListener("change", update);
    update();
    return () => media.removeEventListener("change", update);
  }, [close]);

  const toggle = useCallback(() => {
    if (isMobileDevice()) return;
    if (isOpen) close();
    else void open();
  }, [close, isOpen, open]);

  useEffect(() => close, [close]);

  return { close, isMobile, isOpen, isSupported, open, portalRoot, toggle };
}