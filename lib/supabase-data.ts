import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomTemplate } from "@/lib/product-data";
import type { Database, Tables } from "@/types/database";
import type { SavedNote } from "@/components/product/ProductProvider";

type Client = SupabaseClient<Database>;
export type WorkspaceSnapshot = {
  preferences: Tables<"user_preferences"> | null;
  history: SavedNote[];
  favorites: SavedNote[];
  customTemplates: CustomTemplate[];
  historyReadOnly: boolean;
};

function content(message: Tables<"messages">) { return message.edited_message || message.message; }
function noteFrom(conversation: Tables<"conversations">, message: Tables<"messages">, id = conversation.id): SavedNote {
  return { id, conversationId: conversation.id, messageId: message.id, title: conversation.title, favoriteName: conversation.title, preview: content(message), modeId: conversation.selected_mode, templateId: conversation.selected_template, createdAt: conversation.created_at, lastUpdated: message.updated_at };
}
function assertNoError(error: { message: string } | null) { if (error) throw new Error(error.message); }

export async function loadWorkspace(client: Client, userId: string): Promise<WorkspaceSnapshot> {
  const [preferencesResult, conversationsResult, messagesResult, favoritesResult, templatesResult, cacheResult] = await Promise.all([
    client.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
    client.from("conversations").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    client.from("messages").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    client.from("favorites").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("custom_templates").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    client.from("stripe_subscriptions").select("status,current_period_end,cancel_at_period_end").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const result of [preferencesResult, conversationsResult, messagesResult, favoritesResult, templatesResult, cacheResult]) assertNoError(result.error);
  const conversations = conversationsResult.data || [];
  const messages = messagesResult.data || [];
  const byConversation = new Map<string, Tables<"messages">[]>();
  messages.forEach((message) => byConversation.set(message.conversation_id, [...(byConversation.get(message.conversation_id) || []), message]));
  const history = conversations.flatMap((conversation) => {
    const assistant = [...(byConversation.get(conversation.id) || [])].reverse().find((message) => message.role === "assistant");
    return assistant ? [noteFrom(conversation, assistant)] : [];
  });
  const conversationById = new Map(conversations.map((conversation) => [conversation.id, conversation]));
  const messageById = new Map(messages.map((message) => [message.id, message]));
  const favorites = (favoritesResult.data || []).flatMap((favorite) => {
    const message = messageById.get(favorite.message_id);
    const conversation = message ? conversationById.get(message.conversation_id) : undefined;
    return message && conversation ? [noteFrom(conversation, message, favorite.id)] : [];
  });
  const customTemplates = (templatesResult.data || []).map((template) => ({ id: template.id, modeId: template.mode, name: template.template_name, description: template.description || "Custom documentation template", content: template.template_content, createdAt: template.created_at }));
  const status = cacheResult.data?.status;
  const expiredByDate = cacheResult.data?.current_period_end ? new Date(cacheResult.data.current_period_end).getTime() < Date.now() : false;
  return { preferences: preferencesResult.data, history, favorites, customTemplates, historyReadOnly: status === "expired" || status === "canceled" || expiredByDate };
}

export async function savePreferences(client: Client, userId: string, values: Database["public"]["Tables"]["user_preferences"]["Update"]) {
  const { error } = await client.from("user_preferences").upsert({ user_id: userId, ...values }); assertNoError(error);
}

export async function persistNote(client: Client, userId: string, note: SavedNote) {
  const conversationId = note.conversationId || note.id;
  const messageId = note.messageId || crypto.randomUUID();
  const { error: conversationError } = await client.from("conversations").upsert({ id: conversationId, user_id: userId, title: note.title, selected_mode: note.modeId, selected_template: note.templateId });
  assertNoError(conversationError);
  const { error: messageError } = await client.from("messages").upsert({ id: messageId, conversation_id: conversationId, user_id: userId, role: "assistant", message: note.preview, edited_message: null });
  assertNoError(messageError);
  return { conversationId, messageId };
}

export async function updateStoredNote(client: Client, userId: string, note: SavedNote) {
  if (!note.messageId) return persistNote(client, userId, note);
  const [{ error: messageError }, { error: conversationError }] = await Promise.all([
    client.from("messages").update({ edited_message: note.preview }).eq("id", note.messageId).eq("user_id", userId),
    client.from("conversations").update({ title: note.title }).eq("id", note.conversationId || note.id).eq("user_id", userId),
  ]);
  assertNoError(messageError); assertNoError(conversationError);
  return { conversationId: note.conversationId || note.id, messageId: note.messageId };
}

export async function deleteConversation(client: Client, userId: string, conversationId: string) { const { error } = await client.from("conversations").delete().eq("id", conversationId).eq("user_id", userId); assertNoError(error); }
export async function addFavoriteRecord(client: Client, userId: string, messageId: string, id?: string) { const { data, error } = await client.from("favorites").upsert({ id, user_id: userId, message_id: messageId }, { onConflict: "user_id,message_id" }).select("id").single(); assertNoError(error); return data!.id; }
export async function deleteFavoriteRecord(client: Client, userId: string, id: string) { const { error } = await client.from("favorites").delete().eq("id", id).eq("user_id", userId); assertNoError(error); }
export async function saveTemplateRecord(client: Client, userId: string, template: CustomTemplate) { const { error } = await client.from("custom_templates").upsert({ id: template.id, user_id: userId, mode: template.modeId, template_name: template.name, template_content: template.content, description: template.description }); assertNoError(error); }
export async function createConversation(client: Client, userId: string, id: string, title: string, mode: string, template: string) { const { error } = await client.from("conversations").insert({ id, user_id: userId, title: title.slice(0, 240) || "Clinical documentation", selected_mode: mode, selected_template: template }); assertNoError(error); }
export async function createMessage(client: Client, userId: string, conversationId: string, role: "user" | "assistant", message: string) { const { data, error } = await client.from("messages").insert({ conversation_id: conversationId, user_id: userId, role, message }).select("id").single(); assertNoError(error); return data!.id; }