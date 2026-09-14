import assert from 'node:assert/strict';
import test from 'node:test';
const {default:worker}=await import('../dist/server/index.js');
async function render(path,init={}){return worker.fetch(new Request(`http://localhost${path}`,{headers:{accept:'text/html',...init.headers},...init}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});}
test('Enterprise marketing and login pages remain public',async()=>{
 for(const path of ['/enterprise','/enterprise/subscription','/enterprise/request-demo','/enterprise/request-demo/success','/enterprise/login','/enterprise/forgot-password','/admin/login']){
   const response=await render(path);assert.equal(response.status,200,path);const html=await response.text();assert.ok(!html.includes('Evergreen Care Group'));assert.ok(!html.includes('aria-label="Open ShiftNote assistant"'));
 }
});
test('Enterprise workspaces require administrator authentication',async()=>{
 for(const page of ['dashboard','organizations','facilities','departments','users','analytics','integrations','billing','settings','support']){
  const response=await render(`/enterprise/${page}`);assert.equal(response.status,307,page);assert.match(response.headers.get('location')||'',/\/enterprise\/login/);
 }
});
test('KOKO LABS portal is inaccessible without a staff session',async()=>{
 for(const page of ['','/leads','/organizations','/contracts','/payments','/integrations','/support','/audit-logs','/settings']){
  const response=await render(`/admin${page}`);assert.equal(response.status,307,page);assert.match(response.headers.get('location')||'',/\/admin\/login/);
 }
});
test('Portal APIs reject unauthenticated reads and cross-origin writes',async()=>{
 for(const portal of ['enterprise','admin']){
  const read=await render(`/api/${portal}/workspace`);assert.equal(read.status,401);
  const write=await render(`/api/${portal}/logout`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:'{}'});assert.equal(write.status,403);
  const malformed=await render(`/api/${portal}/logout`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost'},body:'{broken'});assert.equal(malformed.status,400);
 }
});
