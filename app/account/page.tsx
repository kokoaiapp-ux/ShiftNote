"use client";
import { PageHeader } from "@/components/product/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
export default function AccountPage(){const auth=useAuth();return <><PageHeader eyebrow="Settings" title="Account" description="Review the account connected to ShiftNote."/><div className="max-w-3xl"><Card><CardContent><div className="grid gap-5 sm:grid-cols-2"><div><p className="text-xs text-[var(--muted-foreground)]">Name</p><p className="mt-1 font-semibold">{auth.user?.displayName||"Not provided"}</p></div><div><p className="text-xs text-[var(--muted-foreground)]">Email</p><p className="mt-1 font-semibold">{auth.user?.email||"Not signed in"}</p></div></div></CardContent></Card></div></>}