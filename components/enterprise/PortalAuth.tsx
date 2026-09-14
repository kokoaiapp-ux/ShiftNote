"use client";
import Link from 'next/link';
import { useState } from 'react';
import { buttonClass, fieldClass, Panel } from './ui';

export async function portalRequest<T={ok?:boolean;message?:string;setupUrl?:string;emailSent?:boolean}>(portal:'enterprise'|'admin',action:string,data?:unknown):Promise<T> {
  const response=await fetch(`/api/${portal}/${action}`,{method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:data===undefined?undefined:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  const result=await response.json();if(!response.ok)throw new Error(result&&typeof result==='object'&&'error' in result?String(result.error):'Request failed.');return result as T;
}
export function PortalAuth({portal,mode='login'}:{portal:'enterprise'|'admin';mode?:'login'|'forgot'|'reset'}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const title=mode==='login'?(portal==='admin'?'KOKO LABS Admin Login':'Enterprise Admin Login'):mode==='forgot'?'Forgot Password':'Set New Password';
  return <div className="mx-auto max-w-md px-5 py-16"><Panel><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{portal==='admin'?'Restricted to authorized KOKO LABS staff.':'Enterprise administrators only. Accounts are provisioned through an approved setup link.'}</p><form className="mt-6 space-y-5" onSubmit={async event=>{event.preventDefault();setBusy(true);setMessage('');const f=new FormData(event.currentTarget);try{const result=await portalRequest(portal,mode,{email:f.get('email'),password:f.get('password')});if(mode==='forgot')setMessage(result.message||"Check your email.");else window.location.assign(portal==='admin'?'/admin':'/enterprise/dashboard');}catch(e){setMessage(e instanceof Error?e.message:'Unable to continue.');}finally{setBusy(false);}}}>
    {mode!=='reset'&&<label className="block text-sm">Email<input name="email" className={fieldClass} type="email" required autoComplete="email" /></label>}
    {mode!=='forgot'&&<label className="block text-sm">Password<input name="password" className={fieldClass} type="password" required minLength={mode==='reset'?12:undefined} autoComplete={mode==='reset'?'new-password':'current-password'} /></label>}
    <button className={buttonClass} disabled={busy}>{busy?'Please wait…':mode==='login'?'Log in':mode==='forgot'?'Send Reset Email':'Save Password'}</button>
    {message&&<p role="status" className="text-sm">{message}</p>}
  </form><div className="mt-5 flex flex-wrap gap-4 text-xs text-[var(--primary)]"><Link href={`/${portal}/forgot-password`}>Forgot password?</Link><Link href={`/${portal}/login`}>Back to login</Link>{portal==='enterprise'&&<Link href="/enterprise">Enterprise home</Link>}</div></Panel></div>;
}
