import { privacyHeaders } from '@/lib/server/smart/core';
export function GET() {
  return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ShiftNote integration</title></head><body><main><h1>Unable to connect to your EHR</h1><p>Return to your EHR and launch ShiftNote again. If this continues, contact your organization’s administrator.</p></main></body></html>',{status:400,headers:{...privacyHeaders,'Content-Type':'text/html; charset=utf-8'}});
}
