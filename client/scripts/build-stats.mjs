import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url)),manifest=JSON.parse(await fs.readFile(path.join(root,'.vite/manifest.json'),'utf8'));
function collect(keys){const files=new Set(),visited=new Set();const visit=key=>{if(visited.has(key))return;visited.add(key);const entry=manifest[key];if(!entry)throw Error('Build entry missing: '+key);files.add(entry.file);for(const css of entry.css||[])files.add(css);for(const child of entry.imports||[])visit(child);};keys.forEach(visit);return files;}
async function measure(files){const stats={js:0,css:0,gzip:0};for(const file of files){const data=await fs.readFile(path.join(root,file));if(file.endsWith('.js'))stats.js+=data.length;else if(file.endsWith('.css'))stats.css+=data.length;stats.gzip+=zlib.gzipSync(data).length;}return stats;}
const mainKey=manifest['index.html'].dynamicImports?.find(key=>manifest[key]?.name==='main');if(!mainKey)throw Error('Main application chunk not found.');
const boot=await measure(collect(['index.html']));if(boot.js>300000||boot.css>5000)throw Error('Initial boot bundle exceeded the agreed performance budget.');
console.log(JSON.stringify({firstPaint:boot,appCode:await measure(collect(['index.html',mainKey]))},null,2));
for(const role of ['president','employee','manager','admin']){
 const names={president:['PresidentShell','PresidentHome'],employee:['EmployeeShell','EmployeeHome'],manager:['ManagerShell','ManagerHome'],admin:['AdminShell','AdminPanel']};
 const entries=names[role].map(name=>'src/features/'+role+'/'+name+'.jsx');
 console.log(role+': '+JSON.stringify(await measure(collect(['index.html',mainKey,...entries]))));
}
console.log('Values describe build bytes, not measured hosting latency. Other screens load on demand.');
