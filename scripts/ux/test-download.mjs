import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import worker from '../../work/cyb-math-download/src/index.ts';

const release=JSON.parse(await fs.readFile(new URL('../../release/release.json',import.meta.url),'utf8'));
const env={BAIDU_SHARE_URL:release.baidu.url,BAIDU_EXTRACT_CODE:release.baidu.code};
const results=[];
async function check(name,action){try{await action();results.push({name,passed:true})}catch(error){results.push({name,passed:false,error:error.stack})}console.log(`${results.at(-1).passed?'PASS':'FAIL'} ${name}`)}
async function fetchLocal(route,headers={},method='HEAD'){return worker.fetch(new Request('http://localhost'+route,{method,headers}),env)}
for(const item of release.artifacts){
  const route='/files/'+item.fileName,etag=`"sha256-${item.sha256}"`;
  await check(item.id+': download, ranges, cache and resume',async()=>{
    let response=await fetchLocal(route);assert.equal(response.status,200);assert.equal(Number(response.headers.get('Content-Length')),item.bytes);assert.equal(response.headers.get('ETag'),etag);
    response=await fetchLocal(route,{Range:'bytes=0-15'});assert.equal(response.status,206);assert.equal(response.headers.get('Content-Length'),'16');assert.equal(response.headers.get('Content-Range'),`bytes 0-15/${item.bytes}`);
    response=await fetchLocal(route,{Range:'bytes=-32'});assert.equal(response.status,206);assert.equal(response.headers.get('Content-Length'),'32');
    response=await fetchLocal(route,{Range:`bytes=${item.bytes}-`});assert.equal(response.status,416);
    response=await fetchLocal(route,{Range:'bytes=0-3,8-9'});assert.equal(response.status,416);
    response=await fetchLocal(route,{Range:'bytes=0-15','If-Range':'"different-version"'});assert.equal(response.status,200);assert.equal(Number(response.headers.get('Content-Length')),item.bytes);
    response=await fetchLocal(route,{'If-None-Match':`W/${etag}`});assert.equal(response.status,304);
  });
}
await check('Routes reject unsafe or unsupported requests',async()=>{
  assert.equal((await fetchLocal('/files/%ZZ')).status,400);
  assert.equal((await fetchLocal('/files/../missing')).status,404);
  assert.equal((await fetchLocal('/__chunks/windows-setup/000.part')).status,404);
  assert.equal((await fetchLocal('/',{},'POST')).status,405);
});
await check('Three-language download page and truthful mirror metadata',async()=>{
  for(const lang of ['zh-Hans','zh-Hant','en']){
    const response=await fetchLocal('/?lang='+lang,{},'GET'),html=await response.text();
    assert.equal(response.status,200);assert.ok(html.includes('2026-09-24'),'Old mirror date must not change without an actual mirror update');
    for(const item of release.artifacts)assert.ok(html.includes(item.fileName)&&html.includes(item.sha256));
    assert.ok(response.headers.get('Content-Security-Policy').includes("connect-src 'none'"));
  }
});
const base=process.env.CYB_DOWNLOAD_TEST_URL;
if(base)for(const item of release.artifacts)await check(item.id+': actual Worker transfer and boundary resume',async()=>{
  const url=base+'/files/'+item.fileName,response=await fetch(url);assert.equal(response.status,200);
  const data=Buffer.from(await response.arrayBuffer());assert.equal(data.length,item.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex').toUpperCase(),item.sha256);
  const start=Math.min(item.bytes-100,16*1024*1024-10),end=Math.min(item.bytes-1,start+99);
  const partial=await fetch(url,{headers:{Range:`bytes=${start}-${end}`,'If-Range':`"sha256-${item.sha256}"`}});assert.equal(partial.status,206);assert.deepEqual(Buffer.from(await partial.arrayBuffer()),data.subarray(start,end+1));
});
await fs.mkdir('test-results/ux',{recursive:true});await fs.writeFile('test-results/ux/downloads.json',JSON.stringify({passed:results.every(result=>result.passed),actualWorker:Boolean(base),results},null,2));
if(results.some(result=>!result.passed))process.exitCode=1;
