"use client";
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { portalRequest } from './PortalAuth';
import type { Workspace } from '@/types/enterprise';
const Context=createContext<{data:Workspace|null;error:string;refresh:()=>Promise<void>;mutate:(action:string,data:unknown)=>Promise<void>}|null>(null);
export function WorkspaceProvider({children}:{children:React.ReactNode}) {
  const [data,setData]=useState<Workspace|null>(null),[error,setError]=useState('');
  const refresh=useCallback(async()=>{try{setData(await portalRequest<Workspace>('enterprise','workspace'));setError('');}catch(e){setError(e instanceof Error?e.message:'Unable to load workspace.');}},[]);
  useEffect(()=>{queueMicrotask(()=>void refresh());const onFocus=()=>void refresh();window.addEventListener('focus',onFocus);return()=>window.removeEventListener('focus',onFocus);},[refresh]);
  async function mutate(action:string,data:unknown){await portalRequest('enterprise',action,data);await refresh();}
  return <Context.Provider value={{data,error,refresh,mutate}}>{children}</Context.Provider>;
}
export function useEnterprise(){const context=useContext(Context);if(!context)throw new Error('Enterprise provider required');return context;}
