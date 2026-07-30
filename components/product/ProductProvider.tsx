"use client";

import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMode, getTemplate, type ClinicalTemplate, type Mode } from "@/lib/product-data";

export type SavedNote = {
  id: string;
  title: string;
  preview: string;
  modeId: string;
  templateId: string;
  createdAt: string;
};

type Theme = "light" | "dark" | "system";

type ProductContextValue = {
  mode: Mode;
  template: ClinicalTemplate;
  setMode: (id: string) => void;
  setTemplate: (id: string, starter?: string) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  compact: boolean;
  setCompact: (compact: boolean) => void;
  favorites: SavedNote[];
  history: SavedNote[];
  customTemplates: SavedNote[];
  addFavorite: (note: SavedNote) => void;
  saveToHistory: (note: SavedNote) => void;
  saveCustomTemplate: (note: SavedNote) => void;
  deleteHistory: (id: string) => void;
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  error?: Error;
  sendMessage: (text: string) => void;
  regenerate: () => void;
  clearChat: () => void;
};

const ProductContext = createContext<ProductContextValue | null>(null);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [modeId, setModeId] = useState("nurse");
  const [templateId, setTemplateId] = useState("general-progress-note");
  const [theme, setThemeState] = useState<Theme>("system");
  const [compact, setCompactState] = useState(false);
  const [favorites, setFavorites] = useState<SavedNote[]>([]);
  const [history, setHistory] = useState<SavedNote[]>([]);
  const [customTemplates, setCustomTemplates] = useState<SavedNote[]>([]);
  const chat = useChat({ transport: new DefaultChatTransport({ api: "/api/chat" }) });

  useEffect(() => {
    queueMicrotask(() => {
      setModeId(localStorage.getItem("shiftnote-mode") ?? "nurse");
      setTemplateId(localStorage.getItem("shiftnote-template") ?? "general-progress-note");
      setThemeState((localStorage.getItem("shiftnote-theme") as Theme) ?? "system");
      setCompactState(localStorage.getItem("shiftnote-compact") === "true");
      try {
        setFavorites(JSON.parse(localStorage.getItem("shiftnote-favorites") ?? "[]"));
        setHistory(JSON.parse(localStorage.getItem("shiftnote-history") ?? "[]"));
        setCustomTemplates(JSON.parse(localStorage.getItem("shiftnote-custom-templates") ?? "[]"));
      } catch {
        // Ignore malformed local preferences and retain safe defaults.
      }
    });
  }, []);

  const mode = getMode(modeId);
  const template = getTemplate(templateId);

  useEffect(() => {
    localStorage.setItem("shiftnote-mode", modeId);
    localStorage.setItem("shiftnote-template", templateId);
    localStorage.setItem("shiftnote-theme", theme);
    localStorage.setItem("shiftnote-compact", String(compact));
    localStorage.setItem("shiftnote-favorites", JSON.stringify(favorites));
    localStorage.setItem("shiftnote-history", JSON.stringify(history));
    localStorage.setItem("shiftnote-custom-templates", JSON.stringify(customTemplates));

    const root = document.documentElement;
    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", isDark);
    root.dataset.compact = String(compact);
  }, [compact, customTemplates, favorites, history, modeId, templateId, theme]);

  const setMode = useCallback((id: string) => {
    setModeId(id);
    const nextModeTemplates = getTemplate(templateId).modeIds.includes(id);
    if (!nextModeTemplates) setTemplateId("general-progress-note");
  }, [templateId]);

  const setTemplate = useCallback((id: string, starter?: string) => {
    setTemplateId(id);
    if (starter) {
      window.setTimeout(() => {
        void chat.sendMessage({ text: starter }, { body: { modeId, templateId: id } });
      }, 0);
    }
  }, [chat, modeId]);

  const sendMessage = useCallback((text: string) => {
    void chat.sendMessage(
      { text },
      { body: { modeId, templateId } },
    );
  }, [chat, modeId, templateId]);

  const setTheme = useCallback((value: Theme) => setThemeState(value), []);
  const setCompact = useCallback((value: boolean) => setCompactState(value), []);
  const addFavorite = useCallback((note: SavedNote) => setFavorites((items) => [note, ...items.filter((item) => item.id !== note.id)]), []);
  const saveToHistory = useCallback((note: SavedNote) => setHistory((items) => [note, ...items]), []);
  const saveCustomTemplate = useCallback((note: SavedNote) => setCustomTemplates((items) => [note, ...items]), []);
  const deleteHistory = useCallback((id: string) => setHistory((items) => items.filter((item) => item.id !== id)), []);

  const value = useMemo<ProductContextValue>(() => ({
    mode,
    template,
    setMode,
    setTemplate,
    theme,
    setTheme,
    compact,
    setCompact,
    favorites,
    history,
    customTemplates,
    addFavorite,
    saveToHistory,
    saveCustomTemplate,
    deleteHistory,
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    sendMessage,
    regenerate: () => void chat.regenerate({ body: { modeId, templateId } }),
    clearChat: () => chat.setMessages([]),
  }), [addFavorite, chat, compact, customTemplates, deleteHistory, favorites, history, mode, modeId, saveCustomTemplate, saveToHistory, sendMessage, setCompact, setMode, setTemplate, setTheme, template, templateId, theme]);

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProduct() {
  const context = useContext(ProductContext);
  if (!context) throw new Error("useProduct must be used within ProductProvider");
  return context;
}
