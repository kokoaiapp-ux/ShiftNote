// Local-only production-artifact browser harness. No request URLs or bodies
// are logged, because setup/recovery URLs contain single-use credentials.
import { loadEnvFile } from 'node:process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';
loadEnvFile('.env.local');
process.env.NODE_ENV='production';
const {default:worker}=await import('../dist/server/index.js');
const root=resolve('dist/client');
const mime={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.json':'application/json'};
async function asset(request) {
 const path=resolve(root,'.'+decodeURIComponent(new URL(request.url).pathname));
 const rel=relative(root,path);
 if(rel.startsWith('..')||isAbsolute(rel))return new Response('Forbidden',{status:403});
 try{return new Response(await readFile(path),{headers:{'Content-Type':mime[extname(path)]||'application/octet-stream'}});}
 catch{return new Response('Not found',{status:404});}
}
createServer(async(req,res)=>{
 try{
   const url='http://localhost:3112'+req.url;
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>64000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
   const request=new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
   const response=new URL(url).pathname.startsWith('/assets/')?await asset(request):await worker.fetch(request,{ASSETS:{fetch:asset}},{waitUntil(p){p.catch(()=>{});},passThroughOnException(){}});
   response.headers.forEach((value,name)=>{if(name!=='set-cookie')res.setHeader(name,value);});
   const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies);
   res.writeHead(response.status);res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Verification server error');}
}).listen(3112,'localhost',()=>console.log('Enterprise verification server: http://localhost:3112'));
