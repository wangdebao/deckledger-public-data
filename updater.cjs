'use strict';
// Public reference data only. No model, account collections, or Site session tokens.
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const games = {ygo:2,mtg:1,pokemon:3,onepiece:68,digimon:63,dbmasters:27,dbfusion:80,gundam:86,lorcana:71,union:81,weiss:20,vanguard:16,fab:62,starwars:79,ff:24,shadowverse:73,hololive:87,riftbound:89};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function normalize(p, group) {
  const ext = Object.fromEntries((p.extendedData || []).map(v => [v.name, String(v.value)]));
  const no = ext.Number || ext.CardNumber || '';
  if (!no && !ext.CardType && !ext.Type) return null;
  if (!Number.isInteger(p.productId) || typeof p.name !== 'string') throw Error('Invalid product');
  return {id:p.productId,n:p.name,s:group.name,g:group.groupId,no,r:ext.Rarity||'',pre:!!p.presaleInfo?.isPresale};
}
function prices(rows, ids) {
  const out = {};
  for (const p of rows) {
    if (!ids.has(p.productId) || typeof p.marketPrice !== 'number' || !Number.isFinite(p.marketPrice) || p.marketPrice <= 0) continue;
    (out[p.productId] ??= []).push({type:String(p.subTypeName || '未注明工艺'),usd:p.marketPrice});
  }
  return out;
}
async function source(route) {
  if (!/^\d+(?:\/\d+)?\/(groups|products|prices)$/.test(route)) throw Error('Invalid source route');
  for (let attempt=0; attempt<3; attempt++) {
    try {
      const response = await fetch('https://tcgcsv.com/tcgplayer/'+route, {signal:AbortSignal.timeout(30000),headers:{'User-Agent':'DeckLedger/1.0 (public reference data)'},redirect:'error'});
      if (!response.ok) throw Error('Source HTTP '+response.status);
      const result = await response.json();
      if (!result.success || !Array.isArray(result.results)) throw Error('Invalid source response');
      await pause(350);
      return result.results;
    } catch (error) { if (attempt===2) throw error; await pause(1500*(attempt+1)); }
  }
}
async function run(mode='smoke', output='out') {
  if (!['smoke','snapshot'].includes(mode)) throw Error('Expected smoke or snapshot');
  await fs.mkdir(output,{recursive:true});
  const report = {schema:1,mode,complete:false,generatedAt:new Date().toISOString(),games:{},files:[]};
  async function save(name, value) {
    const data = JSON.stringify(value);
    await fs.writeFile(path.join(output,name),data);
    report.files.push({name,sha256:createHash('sha256').update(data).digest('hex'),bytes:Buffer.byteLength(data)});
  }
  for (const [game,category] of Object.entries(games)) {
    const allGroups = await source(category+'/groups');
    if (!allGroups.length || allGroups.some(g=>!Number.isInteger(g.groupId))) throw Error(game+' invalid groups');
    const groups = mode==='smoke' ? allGroups.slice(0,1) : allGroups;
    let next=0, completed=0;
    const cards = new Map(), priceMap={};
    await Promise.all(Array.from({length:Math.min(3,groups.length)},async()=>{
      while(next<groups.length) {
        const group=groups[next++];
        const products=await source(category+'/'+group.groupId+'/products');
        const normalized=products.map(p=>normalize(p,group)).filter(Boolean);
        for(const card of normalized) cards.set(card.id,card);
        Object.assign(priceMap,prices(await source(category+'/'+group.groupId+'/prices'),new Set(normalized.map(c=>c.id))));
        completed++;
        if(completed%100===0) console.log(game+': '+completed+'/'+groups.length+' groups');
      }
    }));
    const rows=[...cards.values()].sort((a,b)=>a.id-b.id);
    if(mode==='snapshot' && (!rows.length || !Object.keys(priceMap).length)) throw Error(game+' empty snapshot');
    report.games[game]={category,groups:allGroups.length,checkedGroups:groups.length,cards:rows.length,pricedCards:Object.keys(priceMap).length};
    if(mode==='snapshot') {
      for(let i=0;i<rows.length;i+=4000) await save(game+'-'+i/4000+'.json',rows.slice(i,i+4000));
      await save(game+'-prices.json',{source:'https://tcgcsv.com/',currency:'USD',game,fetchedAt:new Date().toISOString(),prices:priceMap});
    }
    console.log(game+': validated '+groups.length+' groups');
  }
  report.complete=mode==='snapshot';
  report.finishedAt=new Date().toISOString();
  // Written last; partial files never have a successful manifest.
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({ok:true,mode,games:Object.keys(report.games).length,complete:report.complete}));
  return report;
}
if(require.main===module) run(process.argv[2],process.argv[3]).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={normalize,prices,run};

