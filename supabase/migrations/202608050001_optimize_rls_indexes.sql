-- Optimize RLS evaluation and composite foreign-key lookups based on Supabase database advisors.

create index messages_conversation_user_idx on public.messages (conversation_id, user_id);
create index favorites_message_user_idx on public.favorites (message_id, user_id);

alter policy profiles_select_own on public.profiles using ((select auth.uid()) = auth_user_id);
alter policy profiles_update_own on public.profiles using ((select auth.uid()) = auth_user_id) with check ((select auth.uid()) = auth_user_id);
alter policy onboarding_select_own on public.onboarding_answers using ((select auth.uid()) = user_id);
alter policy onboarding_insert_own on public.onboarding_answers with check ((select auth.uid()) = user_id);
alter policy onboarding_update_own on public.onboarding_answers using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy conversations_select_own on public.conversations using ((select auth.uid()) = user_id);
alter policy conversations_insert_own on public.conversations with check ((select auth.uid()) = user_id);
alter policy conversations_update_own on public.conversations using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy conversations_delete_own on public.conversations using ((select auth.uid()) = user_id);
alter policy messages_select_own on public.messages using ((select auth.uid()) = user_id);
alter policy messages_insert_own on public.messages with check ((select auth.uid()) = user_id and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));
alter policy messages_update_own on public.messages using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy messages_delete_own on public.messages using ((select auth.uid()) = user_id);
alter policy favorites_select_own on public.favorites using ((select auth.uid()) = user_id);
alter policy favorites_insert_own on public.favorites with check ((select auth.uid()) = user_id and exists (select 1 from public.messages m where m.id = message_id and m.user_id = (select auth.uid())));
alter policy favorites_delete_own on public.favorites using ((select auth.uid()) = user_id);
alter policy custom_templates_select_own on public.custom_templates using ((select auth.uid()) = user_id);
alter policy custom_templates_insert_own on public.custom_templates with check ((select auth.uid()) = user_id);
alter policy custom_templates_update_own on public.custom_templates using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy custom_templates_delete_own on public.custom_templates using ((select auth.uid()) = user_id);
alter policy preferences_select_own on public.user_preferences using ((select auth.uid()) = user_id);
alter policy preferences_insert_own on public.user_preferences with check ((select auth.uid()) = user_id);
alter policy preferences_update_own on public.user_preferences using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy subscription_cache_select_own on public.subscription_cache using ((select auth.uid()) = user_id);