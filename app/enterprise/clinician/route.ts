import { getSmartSession } from '@/lib/server/smart/service';
import { privacyHeaders, redirect } from '@/lib/server/smart/core';
export const runtime='nodejs';
export async function GET(request:Request) {
  try {
    if(!await getSmartSession(request))return redirect('/fhir/error');
    // Technical, server-rendered clinician handoff. No patient information or credentials enter HTML/JS.
    return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ShiftNote Enterprise</title></head><body><main><h1>ShiftNote Enterprise</h1><h2>Your EHR connection is established</h2><p>Your secure clinician session is ready. Patient chart access and chart write-back are not enabled in this milestone.</p></main></body></html>',{headers:{...privacyHeaders,'Content-Type':'text/html; charset=utf-8'}});
  }catch{return redirect('/fhir/error');}
}
