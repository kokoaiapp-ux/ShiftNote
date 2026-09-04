"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Apple, Globe2, Sparkles } from "lucide-react";
import { useAuth, friendlyAuthError } from "./AuthProvider";
import { StatusMessage } from "@/components/ui/status-message";
import { setPendingAuthEvent, trackEvent, trackOnce } from "@/lib/analytics";

const field = "mt-1.5 h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const auth = useAuth(); const router = useRouter(); const params = useSearchParams();
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [busy,setBusy]=useState(false); const [showApple,setShowApple]=useState(false);
  const [message,setMessage]=useState<{type:"error"|"success";text:string}|null>(() => params.get("error") ? { type:"error", text:params.get("error")! } : null);
  const target = mode === "signup" ? (params.get("returnTo") || "/onboarding") : (params.get("returnTo") || "/dashboard");
  useEffect(()=>{const platform=(navigator as Navigator & {userAgentData?:{platform?:string}}).userAgentData?.platform||navigator.platform||navigator.userAgent;queueMicrotask(()=>setShowApple(/Mac/i.test(platform)&&navigator.maxTouchPoints<2));},[]);
  useEffect(()=>{if(mode==="signup"&&auth.user)router.replace(target);},[auth.user,mode,router,target]);

  async function submit(event:FormEvent){event.preventDefault();if(auth.configured&&mode==="signup"&&password.length<8){setMessage({type:"error",text:"Use a password with at least 8 characters."});return;}setBusy(true);setMessage(null);try{if(!auth.configured){router.push(target);return;}if(mode==="signup"){await auth.signUpEmail(name.trim(),email.trim(),password);trackOnce(`sign-up:${email.trim().toLowerCase()}`,"sign_up",{method:"email",user_role:"user"});router.push(target);}else{await auth.signInEmail(email.trim(),password);trackEvent("login",{method:"email"});router.push(target);}}catch(error){setMessage({type:"error",text:friendlyAuthError(error)});}finally{setBusy(false)}}
  async function oauth(provider:"google"|"apple"){setBusy(true);setMessage(null);try{setPendingAuthEvent(mode==="signup"?"sign_up":"login",provider);await(provider==="google"?auth.signInGoogle(target):auth.signInApple(target));}catch(error){setMessage({type:"error",text:friendlyAuthError(error)});setBusy(false)}}
  async function reset(){if(!auth.configured)return;if(!email.trim()){setMessage({type:"error",text:"Enter your email address first."});return;}setBusy(true);try{await auth.resetPassword(email.trim());setMessage({type:"success",text:"Password reset instructions were sent if an account exists for that email."});}catch(error){setMessage({type:"error",text:friendlyAuthError(error)});}finally{setBusy(false)}}

  return <div className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl sm:p-8">
    <div className="mb-7"><span className="grid size-11 place-items-center rounded-xl bg-[var(--primary)] text-white"><Sparkles className="size-5"/></span><h1 className="mt-5 text-2xl font-semibold">{mode==="login"?"Welcome back":"Create your account"}</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">{mode==="login"?"Sign in to continue to your clinical copilot.":"Start simplifying your clinical documentation."}</p></div>
    {message&&<StatusMessage className="mb-5" variant={message.type}>{message.text}</StatusMessage>}
    <form className="space-y-4" noValidate={!auth.configured} onSubmit={submit}>
      {mode==="signup"&&<label className="block text-sm font-medium">Full name<input autoComplete="name" className={field} onChange={e=>setName(e.target.value)} required={auth.configured} value={name}/></label>}
      <label className="block text-sm font-medium">Email<input autoComplete="email" className={field} onChange={e=>setEmail(e.target.value)} required={auth.configured} type="email" value={email}/></label>
      <label className="block text-sm font-medium">Password<input autoComplete={mode==="login"?"current-password":"new-password"} className={field} minLength={auth.configured&&mode==="signup"?8:undefined} onChange={e=>setPassword(e.target.value)} required={auth.configured} type="password" value={password}/></label>
      {mode==="login"&&<button className="text-sm font-medium text-[var(--primary)]" onClick={()=>void reset()} type="button">Forgot password?</button>}
      <button className="h-12 w-full rounded-xl bg-[var(--primary)] font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">{busy?"Please wait…":mode==="login"?"Log in":"Create account"}</button>
    </form>
    <div className="my-5 flex items-center gap-3 text-xs text-[var(--muted-foreground)]"><span className="h-px flex-1 bg-[var(--border)]"/>or continue with<span className="h-px flex-1 bg-[var(--border)]"/></div>
    <div className={`grid gap-3 ${showApple?"sm:grid-cols-2":""}`}><button className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)]" disabled={busy} onClick={()=>void oauth("google")} type="button"><Globe2 className="size-4"/>Google</button>{showApple&&<button className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)]" disabled={busy} onClick={()=>void oauth("apple")} type="button"><Apple className="size-4"/>Apple</button>}</div>
    <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">{mode==="login"?"New to ShiftNote? ":"Already have an account? "}<Link className="font-semibold text-[var(--primary)]" href={mode==="login"?"/signup":"/login"}>{mode==="login"?"Sign up":"Log in"}</Link></p>
    <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">By continuing, you agree to our <Link className="underline" href="/terms">Terms</Link> and <Link className="underline" href="/privacy">Privacy Policy</Link>.</p>
  </div>;
}
