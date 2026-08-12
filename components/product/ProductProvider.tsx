"use client";

import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CUSTOM_TEMPLATE_ID, getMode, getTemplate, type ClinicalTemplate, type CustomTemplate, type Mode } from "@/lib/product-data";
import { useAuth } from "@/components/auth/AuthProvider";
import { requireSupabase } from "@/lib/supabase";
import { addFavoriteRecord, createConversation, createMessage, deleteConversation, deleteFavoriteRecord, loadWorkspace, persistNote, savePreferences, saveTemplateRecord, updateStoredNote } from "@/lib/supabase-data";
import { notifyDashboardMetricsChanged } from "@/lib/dashboard-metrics";
import { trackEvent } from "@/lib/analytics";
import { useSubscriptionAccess } from "@/components/subscription/SubscriptionAccessProvider";

export type SavedNote = { id: string; conversationId?: string; messageId?: string; title: string; favoriteName: string; preview: string; modeId: string; templateId: string; createdAt: string; lastUpdated: string; attachments?: StoredAttachment[]; versions?: NoteVersion[]; pendingInformation?: string };
export type StoredAttachment = { id: string; name: string; type: string; size: number; dataUrl: string };
export type NoteVersion = { id: string; preview: string; savedAt: string; source: "auto-save" | "manual" | "ai" | "restore" };
type Theme = "light" | "dark" | "system";
type ProductContextValue = { mode: Mode; template: ClinicalTemplate; setMode: (id: string) => void; setTemplate: (id: string, starter?: string) => void; theme: Theme; setTheme: (theme: Theme) => void; compact: boolean; setCompact: (compact: boolean) => void; primaryColor: string; setPrimaryColor: (color: string) => void; recentTemplates: ClinicalTemplate[]; favorites: SavedNote[]; history: SavedNote[]; historyReadOnly: boolean; customTemplates: CustomTemplate[]; addFavorite: (note: SavedNote) => void; deleteFavorite: (id: string) => void; duplicateFavorite: (id: string) => void; updateFavorite: (id: string, changes: Partial<Pick<SavedNote, "favoriteName" | "preview">>) => void; updateFavoriteWithAI: (id: string, newInformation: string) => Promise<string>; saveToHistory: (note: SavedNote) => void; updateHistoryNote: (id: string, changes: Partial<Pick<SavedNote, "title" | "preview" | "attachments" | "pendingInformation">>, source?: NoteVersion["source"]) => void; updateHistoryWithAI: (id: string, newInformation: string, existingNote?: string) => Promise<string>; saveCustomTemplate: (template: Omit<CustomTemplate, "id" | "createdAt">) => void; deleteHistory: (id: string) => void; messages: UIMessage[]; status: "submitted" | "streaming" | "ready" | "error"; error?: Error; sendMessage: (text: string, files?: FileList) => void; regenerate: () => void; clearChat: (resetTemplate?: boolean) => void };
const ProductContext = createContext<ProductContextValue | null>(null);

function uiMessageText(message?: UIMessage) { return message?.parts.filter((part): part is Extract<(typeof message.parts)[number], { type: "text" }> => part.type === "text").map((part) => part.text).join("") || ""; }
function reportPersistenceError() { console.error("Supabase persistence failed."); }

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const subscription = useSubscriptionAccess();
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [historyReadOnly, setHistoryReadOnly] = useState(false);
  const [modeId, setModeId] = useState("nurse");
  const [templateId, setTemplateId] = useState(CUSTOM_TEMPLATE_ID);
  const [theme, setThemeState] = useState<Theme>("system");
  const [compact, setCompactState] = useState(false);
  const [primaryColor, setPrimaryColorState] = useState("#176b4c");
  const [favorites, setFavorites] = useState<SavedNote[]>([]);
  const [history, setHistory] = useState<SavedNote[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [recentTemplateIds, setRecentTemplateIds] = useState<Record<string, string[]>>({});
  const activeConversation = useRef<string | null>(null);
  const storedAssistantIds = useRef(new Set<string>());
  const chatTransport = useMemo(() => new DefaultChatTransport({ api: "/api/chat", headers: async (): Promise<Record<string, string>> => { const token = await auth.accessToken(); return token ? { Authorization: `Bearer ${token}` } : {}; } }), [auth]);
  const chat = useChat({ transport: chatTransport });

  useEffect(() => {
    if (auth.loading) return;
    let active = true;
    if (!auth.configured || !auth.user) {
      queueMicrotask(() => {
        setModeId(localStorage.getItem("shiftnote-mode") || "nurse"); setTemplateId(localStorage.getItem("shiftnote-template") || CUSTOM_TEMPLATE_ID); setThemeState((localStorage.getItem("shiftnote-theme") as Theme) || "system"); setCompactState(localStorage.getItem("shiftnote-compact") === "true"); setPrimaryColorState(localStorage.getItem("shiftnote-primary-color") || "#176b4c");
        try { setFavorites(JSON.parse(localStorage.getItem("shiftnote-favorites") || "[]")); setHistory(JSON.parse(localStorage.getItem("shiftnote-history") || "[]")); setCustomTemplates(JSON.parse(localStorage.getItem("shiftnote-custom-templates") || "[]")); setRecentTemplateIds(JSON.parse(localStorage.getItem("shiftnote-recent-templates") || "{}")); } catch {}
        setWorkspaceLoaded(true);
      });
      return;
    }
    queueMicrotask(() => setWorkspaceLoaded(false));
    void loadWorkspace(requireSupabase(), auth.user.id).then((snapshot) => {
      if (!active) return;
      const preferences = snapshot.preferences;
      setModeId(preferences?.last_selected_mode || auth.profile?.default_mode || "nurse"); setTemplateId(preferences?.last_selected_template || CUSTOM_TEMPLATE_ID); setThemeState(preferences?.theme || "system"); setCompactState(preferences?.compact_mode || false); setPrimaryColorState(preferences?.primary_color || "#176b4c"); setFavorites(snapshot.favorites); setHistory(snapshot.history); setCustomTemplates(snapshot.customTemplates); setHistoryReadOnly(snapshot.historyReadOnly); setWorkspaceLoaded(true);
    }).catch(() => { reportPersistenceError(); if (active) setWorkspaceLoaded(true); });
    return () => { active = false; };
  }, [auth.configured, auth.loading, auth.profile?.default_mode, auth.user]);

  useEffect(() => {
    if (!subscription.access) return;
    queueMicrotask(() => setHistoryReadOnly(subscription.access?.state !== "activeSubscription"));
  }, [subscription.access]);
  useEffect(() => {
    localStorage.setItem("shiftnote-mode", modeId); localStorage.setItem("shiftnote-template", templateId); localStorage.setItem("shiftnote-theme", theme); localStorage.setItem("shiftnote-compact", String(compact)); localStorage.setItem("shiftnote-primary-color", primaryColor);
    const root = document.documentElement; const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches); root.classList.toggle("dark", isDark); root.dataset.compact = String(compact); root.style.setProperty("--primary", primaryColor);
    if (!workspaceLoaded || !auth.configured || !auth.user) return;
    const timeout = window.setTimeout(() => { void savePreferences(requireSupabase(), auth.user!.id, { last_selected_mode: modeId, last_selected_template: templateId, theme, compact_mode: compact, primary_color: primaryColor }).catch(reportPersistenceError); }, 350);
    return () => window.clearTimeout(timeout);
  }, [auth.configured, auth.user, compact, modeId, primaryColor, templateId, theme, workspaceLoaded]);

  useEffect(() => {
    if (chat.status !== "ready" || !auth.user || !activeConversation.current) return;
    const assistant = [...chat.messages].reverse().find((message) => message.role === "assistant"); const text = uiMessageText(assistant);
    if (!assistant || !text || storedAssistantIds.current.has(assistant.id)) return;
    storedAssistantIds.current.add(assistant.id);
    const conversationId = activeConversation.current;
    void createMessage(requireSupabase(), auth.user.id, conversationId, "assistant", text).then((messageId) => {
      const now = new Date().toISOString(); const note: SavedNote = { id: conversationId, conversationId, messageId, title: getTemplate(templateId).name, favoriteName: getTemplate(templateId).name, preview: text, modeId, templateId, createdAt: now, lastUpdated: now };
      setHistory((items) => [note, ...items.filter((item) => item.id !== conversationId)]);
      notifyDashboardMetricsChanged();
      trackEvent("ai_documentation_generated", { mode: modeId, template: templateId });
    }).catch(reportPersistenceError);
  }, [auth.user, chat.messages, chat.status, modeId, templateId]);

  const mode = getMode(modeId); const template = getTemplate(templateId);
  const setMode = useCallback((id: string) => { setModeId(id); if (!getTemplate(templateId).modeIds.includes(id)) setTemplateId(CUSTOM_TEMPLATE_ID); }, [templateId]);
  const setTemplate = useCallback((id: string) => { setTemplateId(id); const selectedModeId = getTemplate(id).modeIds[0]; setRecentTemplateIds((current) => ({ ...current, [selectedModeId]: [id, ...(current[selectedModeId] || []).filter((item) => item !== id)].slice(0, 5) })); }, []);
  const sendMessage = useCallback((text: string, files?: FileList) => {
    const selected = getTemplate(templateId); const selectedModeId = selected.modeIds[0]; setRecentTemplateIds((current) => ({ ...current, [selectedModeId]: [templateId, ...(current[selectedModeId] || []).filter((item) => item !== templateId)].slice(0, 5) }));
    if (auth.user) { const conversationId = activeConversation.current || crypto.randomUUID(); activeConversation.current = conversationId; void (async () => { if (!chat.messages.length) await createConversation(requireSupabase(), auth.user!.id, conversationId, selected.name, modeId, templateId); await createMessage(requireSupabase(), auth.user!.id, conversationId, "user", text || "Attachment submitted"); })().catch(reportPersistenceError); }
    void chat.sendMessage({ text, files }, { body: { modeId, templateId } });
  }, [auth.user, chat, modeId, templateId]);
  const setTheme = useCallback((value: Theme) => setThemeState(value), []); const setCompact = useCallback((value: boolean) => setCompactState(value), []); const setPrimaryColor = useCallback((value: string) => setPrimaryColorState(value), []);

  const saveToHistory = useCallback((note: SavedNote) => { if (historyReadOnly) return; setHistory((items) => [note, ...items.filter((item) => item.id !== note.id)]); if (auth.user) void persistNote(requireSupabase(), auth.user.id, note).then((ids) => { setHistory((items) => items.map((item) => item.id === note.id ? { ...item, ...ids } : item)); trackEvent("documentation_saved", { mode: note.modeId, template: note.templateId }); }).catch(reportPersistenceError); }, [auth.user, historyReadOnly]);
  const addFavorite = useCallback((note: SavedNote) => { if (favorites.some((item) => item.preview === note.preview && item.modeId === note.modeId && item.templateId === note.templateId)) return; setFavorites((items) => [note, ...items]); if (auth.user) void persistNote(requireSupabase(), auth.user.id, note).then(async (ids) => { const favoriteId = await addFavoriteRecord(requireSupabase(), auth.user!.id, ids.messageId, note.id); setFavorites((items) => items.map((item) => item.id === note.id ? { ...item, id: favoriteId, ...ids } : item)); notifyDashboardMetricsChanged(); trackEvent("favorite_added", { mode: note.modeId, template: note.templateId }); }).catch(reportPersistenceError); }, [auth.user, favorites]);
  const deleteFavorite = useCallback((id: string) => { setFavorites((items) => items.filter((item) => item.id !== id)); if (auth.user) void deleteFavoriteRecord(requireSupabase(), auth.user.id, id).then(() => { notifyDashboardMetricsChanged(); trackEvent("favorite_removed"); }).catch(reportPersistenceError); }, [auth.user]);
  const duplicateFavorite = useCallback((id: string) => { const source = favorites.find((item) => item.id === id); if (!source) return; const now = new Date().toISOString(); addFavorite({ ...source, id: crypto.randomUUID(), conversationId: undefined, messageId: undefined, favoriteName: `${source.favoriteName || source.title} copy`, title: `${source.title} copy`, createdAt: now, lastUpdated: now }); }, [addFavorite, favorites]);
  const updateFavorite = useCallback((id: string, changes: Partial<Pick<SavedNote, "favoriteName" | "preview">>) => { setFavorites((items) => items.map((item) => { if (item.id !== id) return item; const updated = { ...item, ...changes, title: changes.favoriteName || item.title, lastUpdated: new Date().toISOString() }; if (auth.user) void updateStoredNote(requireSupabase(), auth.user.id, updated).catch(reportPersistenceError); return updated; })); }, [auth.user]);
  const updateHistoryNote = useCallback((id: string, changes: Partial<Pick<SavedNote, "title" | "preview" | "attachments" | "pendingInformation">>, source: NoteVersion["source"] = "auto-save") => { if (historyReadOnly) return; setHistory((items) => items.map((item) => { if (item.id !== id) return item; const previewChanged = changes.preview !== undefined && changes.preview !== item.preview; const updated = { ...item, ...changes, versions: previewChanged ? [{ id: crypto.randomUUID(), preview: item.preview, savedAt: new Date().toISOString(), source }, ...(item.versions || [])].slice(0, 30) : item.versions, lastUpdated: new Date().toISOString() }; if (auth.user) void updateStoredNote(requireSupabase(), auth.user.id, updated).catch(reportPersistenceError); return updated; })); }, [auth.user, historyReadOnly]);
  const updateWithAI = useCallback(async (note: SavedNote, newInformation: string) => { const response = await fetch("/api/chat/update", { method: "POST", headers: { "Content-Type": "application/json", ...(await auth.accessToken() ? { Authorization: `Bearer ${await auth.accessToken()}` } : {}) }, body: JSON.stringify({ existingNote: note.preview, newInformation, modeId: note.modeId, templateId: note.templateId }) }); if (!response.ok) { const payload = await response.json().catch(() => null) as { error?: string } | null; throw new Error(payload?.error || "Unable to update the documentation."); } return response.text(); }, [auth]);
  const updateFavoriteWithAI = useCallback(async (id: string, newInformation: string) => { const note = favorites.find((item) => item.id === id); if (!note) throw new Error("Favorite not found."); const updated = await updateWithAI(note, newInformation); updateFavorite(id, { preview: updated }); return updated; }, [favorites, updateFavorite, updateWithAI]);
  const updateHistoryWithAI = useCallback(async (id: string, newInformation: string, existingNote?: string) => { if (historyReadOnly) throw new Error("History is read-only because ShiftNote Pro access has expired."); const note = history.find((item) => item.id === id); if (!note) throw new Error("Saved documentation was not found."); const updated = await updateWithAI({ ...note, preview: existingNote || note.preview }, newInformation); updateHistoryNote(id, { preview: updated, pendingInformation: "" }, "ai"); return updated; }, [history, historyReadOnly, updateHistoryNote, updateWithAI]);
  const saveCustomTemplate = useCallback((input: Omit<CustomTemplate, "id" | "createdAt">) => { const item = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }; setCustomTemplates((items) => [item, ...items]); if (auth.user) void saveTemplateRecord(requireSupabase(), auth.user.id, item).catch(reportPersistenceError); }, [auth.user]);
  const deleteHistory = useCallback((id: string) => { if (historyReadOnly) return; const note = history.find((item) => item.id === id); setHistory((items) => items.filter((item) => item.id !== id)); if (auth.user) void deleteConversation(requireSupabase(), auth.user.id, note?.conversationId || id).then(notifyDashboardMetricsChanged).catch(reportPersistenceError); }, [auth.user, history, historyReadOnly]);

  const value = useMemo<ProductContextValue>(() => ({ mode, template, setMode, setTemplate, theme, setTheme, compact, setCompact, primaryColor, setPrimaryColor, recentTemplates: (recentTemplateIds[modeId] || []).map(getTemplate), favorites, history, historyReadOnly, customTemplates, addFavorite, deleteFavorite, duplicateFavorite, updateFavorite, updateFavoriteWithAI, saveToHistory, updateHistoryNote, updateHistoryWithAI, saveCustomTemplate, deleteHistory, messages: chat.messages, status: chat.status, error: chat.error, sendMessage, regenerate: () => void chat.regenerate({ body: { modeId, templateId } }), clearChat: (resetTemplate = true) => { chat.setMessages([]); activeConversation.current = null; storedAssistantIds.current.clear(); if (resetTemplate) setTemplateId(CUSTOM_TEMPLATE_ID); } }), [addFavorite, chat, compact, customTemplates, deleteFavorite, deleteHistory, duplicateFavorite, favorites, history, historyReadOnly, mode, modeId, primaryColor, recentTemplateIds, saveCustomTemplate, saveToHistory, sendMessage, setCompact, setMode, setPrimaryColor, setTemplate, setTheme, template, templateId, theme, updateFavorite, updateFavoriteWithAI, updateHistoryNote, updateHistoryWithAI]);
  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}
export function useProduct() { const context = useContext(ProductContext); if (!context) throw new Error("useProduct must be used within ProductProvider"); return context; }
