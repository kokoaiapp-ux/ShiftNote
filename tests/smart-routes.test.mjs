import assert from 'node:assert/strict';
import test from 'node:test';
const { default: worker } = await import('../dist/server/index.js');
async function request(path) {
  return worker.fetch(new Request('https://www.shiftnote.care'+path),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
}
test('SMART technical routes fail safely when unconfigured and do not render analytics or application providers',async()=>{
  for(const path of ['/fhir/callback','/fhir/callback?code=test-code-not-to-render&state=invalid','/fhir/launch?iss=https://untrusted.example.com&launch=test','/enterprise/clinician']){
    const response=await request(path);assert.equal(response.status,303);assert.equal(response.headers.get('location'),'https://www.shiftnote.care/fhir/error');
    assert.equal(await response.text(),'');assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('referrer-policy'),'no-referrer');
  }
  const error=await request('/fhir/error');assert.equal(error.status,400);
  const html=await error.text();assert.match(html,/Unable to connect to your EHR/);assert.doesNotMatch(html,/<script|gtag|fbq|ttq|test-code|access_token/i);
});
