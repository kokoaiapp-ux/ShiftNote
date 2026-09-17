import assert from 'node:assert/strict';
import test from 'node:test';
const { default: worker } = await import('../dist/server/index.js');
async function request(path,headers) {
  return worker.fetch(new Request('https://www.shiftnote.care'+path,{headers}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
}
test('SMART technical routes fail safely when unconfigured and do not render analytics or application providers',async()=>{
  for(const path of ['/fhir/callback','/fhir/callback?code=test-code-not-to-render&state=invalid','/fhir/launch?iss=https://untrusted.example.com&launch=test','/enterprise/clinician']){
    const response=await request(path);assert.equal(response.status,303);assert.equal(response.headers.get('location'),'https://www.shiftnote.care/fhir/error');
    assert.equal(await response.text(),'');assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('referrer-policy'),'no-referrer');
  }
  const error=await request('/fhir/error');assert.equal(error.status,400);
  const html=await error.text();assert.match(html,/Unable to connect to your EHR/);assert.doesNotMatch(html,/<script|gtag|fbq|ttq|test-code|access_token/i);
});
test('built callback and middleware suppress query values and Basic/Bearer headers without rendering an intermediate page',async(t)=>{
  const logs=[];
  for(const method of ['log','info','warn','error','debug','trace','dir','table'])t.mock.method(console,method,(...args)=>logs.push(args));
  const marker='synthetic-smart-privacy-marker';
  const query=new URLSearchParams({code:marker+'-code',state:marker+'-state',launch:marker+'-launch',error_description:marker+'-provider-error'});
  for(const authorization of ['Basic '+Buffer.from('synthetic-client:'+marker+'-secret').toString('base64'),'Bearer '+marker+'-token']) {
    const response=await request('/fhir/callback?'+query,{authorization});
    assert.equal(response.status,303);
    assert.equal(response.headers.get('location'),'https://www.shiftnote.care/fhir/error');
    assert.equal(response.headers.get('referrer-policy'),'no-referrer');
    assert.match(response.headers.get('cache-control'),/no-store/);
    assert.equal(await response.text(),'');
    assert.ok(!JSON.stringify([...response.headers]).includes(marker));
  }
  assert.deepEqual(logs,[]);
});
