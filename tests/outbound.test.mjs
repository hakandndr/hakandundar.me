import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOutbound} from '../outbound/outbound-source.js';
const aliases = ['source.example', 'www.source.example'];
const id = '11111111-2222-4333-8444-555555555555';
function request(extra = {}) {return new Request('https://source.example/__analytics/outbound', {method: 'POST',headers:{origin:'https://source.example',referer:'https://source.example/','cf-connecting-ip':'203.0.113.42'},body:JSON.stringify({eventId:id,path:'/',destination:'https://external.example/docs?token=secret#secret',...extra})});}
test('local authority precedes idempotent forwarding; outbound never calls PAGE', async () => {
 const rows = new Map(), order = [], pending = [], sent=[];
 const db={prepare(sql) {return {bind(...args) {return {async run() {order.push('local');if(!rows.has(args[0]))rows.set(args[0],{event_json:args[5]});return {success:true};},async first(){return rows.get(args[0]);}};}};}};
 const env={DNDR_COLLECTOR:{recordPage(){assert.fail('outbound cannot write PAGE');},async recordActivity(e){assert.equal(order.at(-1),'local');sent.push(e);return {status:'accepted'};}}};
 for(const extra of [{},{destination:'https://changed.example/'}]) {assert.equal((await handleOutbound(request(extra),env,{waitUntil:p=>pending.push(p)},{aliases,db,local:true})).status,204);await pending.at(-1);}
 assert.equal(rows.size,1);assert.deepEqual(sent[0],sent[1]);assert.equal(sent[0].outboundUrl,'https://external.example/docs');
});
test('missing/failed source and collector failures never obstruct navigation', async () => {
 let calls=0; const pending=[];const env={DNDR_COLLECTOR:{async recordActivity(){calls++;throw Error('unavailable');}}};
 assert.equal((await handleOutbound(request(),env,{waitUntil:p=>pending.push(p)},{aliases,local:true})).status,503);
 assert.equal((await handleOutbound(request(),env,{waitUntil:p=>pending.push(p)},{aliases,local:true,db:{prepare(){throw Error('local unavailable');}}})).status,204);
 await Promise.all(pending);assert.equal(calls,0);
 assert.equal((await handleOutbound(request(),env,{waitUntil:p=>pending.push(p)},{aliases})).status,204);await Promise.all(pending);assert.equal(calls,2);
});
test('browser identity claims, internal aliases and wrong source attribution are refused', async () => {
 for(const extra of [{site_id:'spoof'},{producer_id:'spoof'},{path:'/wrong'},{destination:'https://www.source.example/'},{destination:'https://external.example/session/secret'}]) assert.equal((await handleOutbound(request(extra),{}, {waitUntil(){assert.fail('invalid event');}},{aliases})).status,400);
});
