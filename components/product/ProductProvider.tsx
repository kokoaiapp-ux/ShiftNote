"use client";

import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CUSTOM_TEMPLATE_ID, getMode, getTemplate, type ClinicalTemplate, type CustomTemplate, type Mode } from "@/lib/product-data";

export type SavedNote = {
  id: string;
  title: string;
  favoriteName: string;
  preview: string;
  modeId: string;
  templateId: string;
  createdAt: string;
  lastUpdated: string;
  attachments?: StoredAttachment[];
  versions?: NoteVersion[];
  pendingInformation?: string;
};

export type StoredAttachment = { id: string; name: string; type: string; size: number; dataUrl: string };
export type NoteVersion = { id: string; preview: string; savedAt: string; source: "auto-save" | "manual" | "ai" | "restore" };

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
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  recentTemplates: ClinicalTemplate[];
  favorites: SavedNote[];
  history: SavedNote[];
  customTemplates: CustomTemplate[];
  addFavorite: (note: SavedNote) => void;
  deleteFavorite: (id: string) => void;
  duplicateFavorite: (id: string) => void;
  updateFavorite: (id: string, changes: Partial<Pick<SavedNote, "favoriteName" | "preview">>) => void;
  updateFavoriteWithAI: (id: string, newInformation: string) => Promise<string>;
  saveToHistory: (note: SavedNote) => void;
  updateHistoryNote: (id: string, changes: Partial<Pick<SavedNote, "title" | "preview" | "attachments" | "pendingInformation">>, source?: NoteVersion["source"]) => void;
  updateHistoryWithAI: (id: string, newInformation: string, existingNote?: string) => Promise<string>;
  saveCustomTemplate: (template: Omit<CustomTemplate, "id" | "createdAt">) => void;
  deleteHistory: (id: string) => void;
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  error?: Error;
  sendMessage: (text: string, files?: FileList) => void;
  regenerate: () => void;
  clearChat: (resetTemplate?: boolean) => void;
};

const ProductContext = createContext<ProductContextValue | null>(null);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [modeId, setModeId] = useState("nurse");
  const [templateId, setTemplateId] = useState(CUSTOM_TEMPLATE_ID);
  const [theme, setThemeState] = useState<Theme>("system");
  const [compact, setCompactState] = useState(false);
  const [primaryColor, setPrimaryColorState] = useState("#176b4c");
  const [favorites, setFavorites] = useState<SavedNote[]>([]);
  const [history, setHistory] = useState<SavedNote[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [recentTemplateIds, setRecentTemplateIds] = useState<Record<string, string[]>>({});
  const chat = useChat({ transport: new DefaultChatTransport({ api: "/api/chat" }) });

  useEffect(() => {
    queueMicrotask(() => {
      setModeId(localStorage.getItem("shiftnote-mode") ?? "nurse");
      setTemplateId(CUSTOM_TEMPLATE_ID);
      setThemeState((localStorage.getItem("shiftnote-theme") as Theme) ?? "system");
      setCompactState(localStorage.getItem("shiftnote-compact") === "true");
      const storedPrimary = localStorage.getItem("shiftnote-primary-color") ?? "#176b4c";
      setPrimaryColorState(storedPrimary === "#c55a2d" ? "#a94720" : storedPrimary);
      try {
        setFavorites(JSON.parse(localStorage.getItem("shiftnote-favorites") ?? "[]"));
        setHistory(JSON.parse(localStorage.getItem("shiftnote-history") ?? "[]"));
        setCustomTemplates(JSON.parse(localStorage.getItem("shiftnote-custom-templates") ?? "[]"));
        setRecentTemplateIds(JSON.parse(localStorage.getItem("shiftnote-recent-templates") ?? "{}"));
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
    localStorage.setItem("shiftnote-primary-color", primaryColor);
    localStorage.setItem("shiftnote-favorites", JSON.stringify(favorites));
    localStorage.setItem("shiftnote-history", JSON.stringify(history));
    localStorage.setItem("shiftnote-custom-templates", JSON.stringify(customTemplates));
    localStorage.setItem("shiftnote-recent-templates", JSON.stringify(recentTemplateIds));

    const root = document.documentElement;
    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", isDark);
    root.dataset.compact = String(compact);
    root.style.setProperty("--primary", primaryColor);
  }, [compact, customTemplates, favorites, history, modeId, primaryColor, recentTemplateIds, templateId, theme]);

  const setMode = useCallback((id: string) => {
    setModeId(id);
    const nextModeTemplates = getTemplate(templateId).modeIds.includes(id);
    if (!nextModeTemplates) setTemplateId(CUSTOM_TEMPLATE_ID);
  }, [templateId]);

  const setTemplate = useCallback((id: string) => {
    setTemplateId(id);
    const selected = getTemplate(id);
    const selectedModeId = selected.modeIds[0];
    setRecentTemplateIds((current) => ({
      ...current,
      [selectedModeId]: [id, ...(current[selectedModeId] ?? []).filter((item) => item !== id)].slice(0, 5),
    }));
  }, []);

  const sendMessage = useCallback((text: string, files?: FileList) => {
    const selected = getTemplate(templateId);
    const selectedModeId = selected.modeIds[0];
    setRecentTemplateIds((current) => ({
      ...current,
      [selectedModeId]: [templateId, ...(current[selectedModeId] ?? []).filter((item) => item !== templateId)].slice(0, 5),
    }));
    void chat.sendMessage(
      { text, files },
      { body: { modeId, templateId } },
    );
  }, [chat, modeId, templateId]);

  const setTheme = useCallback((value: Theme) => setThemeState(value), []);
  const setCompact = useCallback((value: boolean) => setCompactState(value), []);
  const setPrimaryColor = useCallback((value: string) => setPrimaryColorState(value), []);
  const addFavorite = useCallback((note: SavedNote) => setFavorites((items) => {
    if (items.some((item) => item.preview === note.preview && item.modeId === note.modeId && item.templateId === note.templateId)) return items;
    return [note, ...items];
  }), []);
  const deleteFavorite = useCallback((id: string) => setFavorites((items) => items.filter((item) => item.id !== id)), []);
  const duplicateFavorite = useCallback((id: string) => {
    setFavorites((items) => {
      const source = items.find((item) => item.id === id);
      if (!source) return items;
      const now = new Date().toISOString();
      return [{ ...source, id: crypto.randomUUID(), favoriteName: `${source.favoriteName || source.title} copy`, createdAt: now, lastUpdated: now }, ...items];
    });
  }, []);
  const updateFavorite = useCallback((id: string, changes: Partial<Pick<SavedNote, "favoriteName" | "preview">>) => {
    setFavorites((items) => items.map((item) => item.id === id ? { ...item, ...changes, lastUpdated: new Date().toISOString() } : item));
  }, []);
  const updateFavoriteWithAI = useCallback(async (id: string, newInformation: string) => {
    const favorite = favorites.find((item) => item.id === id);
    if (!favorite) throw new Error("Favorite not found.");
    const response = await fetch("/api/chat/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        existingNote: favorite.preview,
        newInformation,
        modeId: favorite.modeId,
        templateId: favorite.templateId,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error ?? "Unable to update the favorite.");
    }
    const updatedNote = await response.text();
    setFavorites((items) => items.map((item) => item.id === id ? { ...item, preview: updatedNote, lastUpdated: new Date().toISOString() } : item));
    return updatedNote;
  }, [favorites]);
  const saveToHistory = useCallback((note: SavedNote) => setHistory((items) => [note, ...items]), []);
  const updateHistoryNote = useCallback((id: string, changes: Partial<Pick<SavedNote, "title" | "preview" | "attachments" | "pendingInformation">>, source: NoteVersion["source"] = "auto-save") => {
    setHistory((items) => {
      const next = items.map((item) => {
      if (item.id !== id) return item;
      const previewChanged = changes.preview !== undefined && changes.preview !== item.preview;
      const versions = previewChanged
        ? [{ id: crypto.randomUUID(), preview: item.preview, savedAt: new Date().toISOString(), source }, ...(item.versions ?? [])].slice(0, 30)
        : item.versions;
      return { ...item, ...changes, versions, lastUpdated: new Date().toISOString() };
      });
      localStorage.setItem("shiftnote-history", JSON.stringify(next));
      return next;
    });
  }, []);
  const updateHistoryWithAI = useCallback(async (id: string, newInformation: string, existingNote?: string) => {
    const note = history.find((item) => item.id === id);
    if (!note) throw new Error("History note not found.");
    const response = await fetch("/api/chat/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ existingNote: existingNote ?? note.preview, newInformation, modeId: note.modeId, templateId: note.templateId }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error ?? "Unable to update the note.");
    }
    const updated = await response.text();
    setHistory((items) => {
      const next = items.map((item) => item.id === id ? {
        ...item,
        preview: updated,
        pendingInformation: "",
        versions: [{ id: crypto.randomUUID(), preview: item.preview, savedAt: new Date().toISOString(), source: "ai" as const }, ...(item.versions ?? [])].slice(0, 30),
        lastUpdated: new Date().toISOString(),
      } : item);
      localStorage.setItem("shiftnote-history", JSON.stringify(next));
      return next;
    });
    return updated;
  }, [history]);
  const saveCustomTemplate = useCallback((template: Omit<CustomTemplate, "id" | "createdAt">) => {
    setCustomTemplates((items) => [{ ...template, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...items]);
  }, []);
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
    primaryColor,
    setPrimaryColor,
    recentTemplates: (recentTemplateIds[modeId] ?? []).map(getTemplate),
    favorites,
    history,
    customTemplates,
    addFavorite,
    deleteFavorite,
    duplicateFavorite,
    updateFavorite,
    updateFavoriteWithAI,
    saveToHistory,
    updateHistoryNote,
    updateHistoryWithAI,
    saveCustomTemplate,
    deleteHistory,
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    sendMessage,
    regenerate: () => void chat.regenerate({ body: { modeId, templateId } }),
    clearChat: (resetTemplate = true) => {
      chat.setMessages([]);
      if (resetTemplate) setTemplateId(CUSTOM_TEMPLATE_ID);
    },
  }), [addFavorite, chat, compact, customTemplates, deleteFavorite, deleteHistory, duplicateFavorite, favorites, history, mode, modeId, primaryColor, recentTemplateIds, saveCustomTemplate, saveToHistory, sendMessage, setCompact, setMode, setPrimaryColor, setTemplate, setTheme, template, templateId, theme, updateFavorite, updateFavoriteWithAI, updateHistoryNote, updateHistoryWithAI]);

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProduct() {
  const context = useContext(ProductContext);
  if (!context) throw new Error("useProduct must be used within ProductProvider");
  return context;
}
