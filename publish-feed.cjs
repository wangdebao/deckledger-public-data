'use strict';
// Only public reference metadata and prices. No website source or user records.
const fs=require('node:fs/promises');
const path=require('node:path');
const {run}=require('./updater.cjs');
async function main(){
 const previous=await fs.readFile('feed/report.json','utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 const baseline=JSON.parse(await fs.readFile('baseline.json','utf8'));
 await run('snapshot','staging');
 const report=JSON.parse(await fs.readFile('staging/report.json','utf8'));
 if(!report.complete||Object.keys(report.games).length!==18)throw Error('Incomplete snapshot');
 const manifest={version:1,source:'https://tcgcsv.com/',generatedAt:report.generatedAt,builtAt:report.finishedAt,scope:'海外产品参考目录；并非全部语言或全部版本。',games:{}};
 for(const [game,entry]of Object.entries(report.games)){
  const floor=previous?.games[game]||baseline[game];
  if(!floor||entry.cards<floor.cards*.95||entry.pricedCards<floor.pricedCards*.95)throw Error(game+' coverage drop; keep previous data');
  manifest.games[game]={category:entry.category,count:entry.cards,groups:entry.groups,failures:[],files:report.files.map(f=>f.name).filter(n=>n.startsWith(game+'-')&&!n.endsWith('-prices.json'))};
 }
 await fs.writeFile('staging/manifest.json',JSON.stringify(manifest));
 await fs.writeFile('staging/status.json',JSON.stringify({prices:{updatedAt:report.finishedAt,files:18},catalog:{updatedAt:report.finishedAt,files:report.files.length-18}}));
 // Replace only generated files after every game passed. git push publishes atomically.
 await fs.mkdir('feed',{recursive:true});
 for(const name of await fs.readdir('staging')){
  if(!/^[a-z0-9-]+\.json$/.test(name))throw Error('Unexpected output filename');
  await fs.copyFile(path.join('staging',name),path.join('feed',name));
 }
 console.log('Validated complete public feed; ready for atomic commit');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

