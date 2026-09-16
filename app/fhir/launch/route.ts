import { smartService } from '@/lib/server/smart/service';
import { redirect } from '@/lib/server/smart/core';
import { limit } from '@/lib/server/enterprise-auth';
export const runtime='nodejs';
export async function GET(request:Request) {
  try{await limit(request,'smart:launch',60);return await smartService().launch(request);}catch{return redirect('/fhir/error');}
}
