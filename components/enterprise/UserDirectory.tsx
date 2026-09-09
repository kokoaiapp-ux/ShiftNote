"use client";
import { useState } from "react";
import { users } from "@/lib/enterprise/demo-data";
import { Badge, fieldClass, Panel } from "./ui";
export function UserDirectory() {
  const [query, setQuery] = useState("");
  const results = users.filter(user => Object.values(user).join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return <Panel><label className="block max-w-md text-sm font-medium">Search sample users<input type="search" value={query} onChange={event => setQuery(event.target.value)} className={fieldClass} placeholder="Search by name, role, or facility" /></label><p aria-live="polite" className="my-4 text-xs text-[var(--muted-foreground)]">{results.length} sample users shown</p><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><caption className="sr-only">Sample Enterprise users. Roles are illustrative, not enforced.</caption><thead className="border-b border-[var(--border)] text-xs text-[var(--muted-foreground)]"><tr>{["Name","Profession","Facility","Sample role"].map(label => <th key={label} className="pb-3 pr-4">{label}</th>)}</tr></thead><tbody>{results.map(user => <tr key={user.name} className="border-b border-[var(--border)] last:border-0"><th scope="row" className="py-4 pr-4 font-medium">{user.name}</th><td className="py-4 pr-4">{user.profession}</td><td className="py-4 pr-4 text-[var(--muted-foreground)]">{user.facility}</td><td className="py-4"><Badge>{user.role}</Badge></td></tr>)}</tbody></table></div>{results.length === 0 && <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">No sample users match your search.</p>}</Panel>;
}
