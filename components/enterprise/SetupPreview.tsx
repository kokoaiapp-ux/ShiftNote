"use client";
import { useSyncExternalStore } from 'react';
import { SetupWizard } from './SetupWizard';

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}
const readToken = () => window.location.hash.slice(1);
const serverToken = () => null;
export function SetupPreview() {
  const token = useSyncExternalStore<string | null>(subscribe, readToken, serverToken);
  // A fragment keeps the capability out of URL paths, access logs, and Referer headers.
  if (token === null) return <p className="p-5 text-sm">Checking your preview link…</p>;
  return <SetupWizard key={token} token={token} previewOnly />;
}
