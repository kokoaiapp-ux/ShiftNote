"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { friendlyAuthError, useAuth } from "@/components/auth/AuthProvider";
import { StatusMessage } from "@/components/ui/status-message";

export default function UpdatePasswordPage() {
  const auth = useAuth(); const router = useRouter(); const [password,setPassword]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function submit(event:FormEvent){event.preventDefault();if(password.length<8){setError("Use a password with at least 8 characters.");return;}setBusy(true);setError("");try{await auth.updatePassword(password);router.replace("/dashboard");}catch(e){setError(friendlyAuthError(e));}finally{setBusy(false)}}
  return <main className="grid min-h-screen place-items-center bg-[var(--background)] p-5"><form className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl sm:p-8" onSubmit={submit}><h1 className="text-2xl font-semibold">Set a new password</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Enter a secure password for your ShiftNote account.</p>{error&&<StatusMessage className="mt-5" variant="error">{error}</StatusMessage>}<label className="mt-6 block text-sm font-medium">New password<input autoComplete="new-password" className="mt-1.5 h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 outline-none focus:border-[var(--primary)]" minLength={8} onChange={e=>setPassword(e.target.value)} required type="password" value={password}/></label><button className="mt-5 h-12 w-full rounded-xl bg-[var(--primary)] font-semibold text-white disabled:opacity-60" disabled={busy}>{busy?"Updating…":"Update password"}</button></form></main>;
}
