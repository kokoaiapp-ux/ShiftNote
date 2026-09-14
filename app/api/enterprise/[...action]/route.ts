import { portalGet, portalPost } from '@/lib/server/enterprise-api';
export const dynamic='force-dynamic';
type Context={params:Promise<{action:string[]}>};
export async function GET(request:Request,context:Context){return portalGet(request,'enterprise',(await context.params).action.join('/'));}
export async function POST(request:Request,context:Context){return portalPost(request,'enterprise',(await context.params).action.join('/'));}
