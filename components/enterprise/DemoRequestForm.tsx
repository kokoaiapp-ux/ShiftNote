"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { portalRequest } from "./PortalAuth";
import { ehrPlatforms, professions } from "@/lib/enterprise/catalog";
import { buttonClass, fieldClass, Panel } from "./ui";

function Input({ label, name, type = "text", required = true }: { label: string; name: string; type?: string; required?: boolean }) {
  return <label className="block text-sm font-medium">{label}{!required && <span className="font-normal text-[var(--muted-foreground)]"> (optional)</span>}<input className={fieldClass} name={name} type={type} required={required} min={type === "number" ? 1 : undefined} step={type === "number" ? 1 : undefined} maxLength={type === "number" ? undefined : 200} /></label>;
}
function Select({ label, name, options }: { label: string; name: string; options: readonly string[] }) {
  return <label className="block text-sm font-medium">{label}<select className={fieldClass} defaultValue="" name={name} required><option value="" disabled>Select an option</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>;
}
export function DemoRequestForm() {
  const router = useRouter();
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  return <form onSubmit={async event => { event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setError("");try{await portalRequest("enterprise","leads",{...Object.fromEntries(form),professions:form.getAll("professions")});router.push("/enterprise/request-demo/success");}catch(e){setError(e instanceof Error?e.message:"Unable to submit.");}finally{setBusy(false);}}}>
    <Panel><h2 className="text-lg font-semibold">Your organization</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><Input label="Organization Name" name="organization" /><Input label="Contact Name" name="contact" /><Input label="Job Title" name="jobTitle" /><Input label="Work Email" name="email" type="email" /><Input label="Phone Number" name="phone" type="tel" required={false} /><Input label="Country" name="country" /><Input label="State" name="state" required={false} /><Input label="Number of Clinicians" name="clinicians" type="number" /><Input label="Number of Facilities" name="facilities" type="number" /></div></Panel>
    <Panel className="mt-5"><h2 className="text-lg font-semibold">Your workflows</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><Select label="Current EHR" name="ehr" options={[...ehrPlatforms, "Other"]} /><Select label="Interested in EHR Integration?" name="integration" options={["Yes", "No", "Not Sure"]} /></div><fieldset className="mt-6"><legend className="text-sm font-medium">Healthcare Professionals</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{professions.map(profession => <label className="flex items-center gap-3 text-sm" key={profession}><input className="size-4 accent-[var(--primary)]" type="checkbox" name="professions" value={profession} />{profession}</label>)}</div></fieldset><div className="mt-6"><Select label="Implementation Timeline" name="timeline" options={["Immediately", "Within 3 Months", "Within 6 Months", "Just Exploring"]} /></div><label className="mt-6 block text-sm font-medium">Additional Notes <span className="font-normal text-[var(--muted-foreground)]">(optional)</span><textarea className={fieldClass} name="notes" rows={4} maxLength={2000} placeholder="Tell us about your organization’s goals. Do not include patient information." /></label></Panel>
    <p className="my-5 text-xs leading-6 text-[var(--muted-foreground)]">Your request is securely sent to KOKO LABS. Please do not include patient information.</p>{error&&<p role="alert" className="mb-4 text-sm">{error}</p>}<button className={buttonClass} type="submit" disabled={busy}>{busy?"Submitting…":"Request Enterprise Demo"}</button>
  </form>;
}
