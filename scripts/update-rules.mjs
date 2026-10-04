import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const revision='8ad869604b361f4d139b7a6793f9072e221584d1';
const root=new URL('../',import.meta.url);
const lists=[['ads','easylist'],['privacy','easyprivacy'],['regional','spa-1']];
const metadata={revision,packagedOn:'2026-10-03',lists:[]};
await mkdir(new URL('rules/',root),{recursive:true});
await mkdir(new URL('vendor/',root),{recursive:true});
for(const [id,upstream] of lists){
 const url=`https://raw.githubusercontent.com/uBlockOrigin/uBOL-home/${revision}/chromium/rulesets/main/${upstream}.json`;
 const response=await fetch(url);if(!response.ok)throw Error('Download: '+response.status);
 const source=await response.text();const original=JSON.parse(source);
 // Data only: no remote scriptlets, headers or redirects to extension resources.
 const rules=original.filter(r=>['block','allow'].includes(r.action.type));
 if(!rules.length||rules.some(r=>!r.id||!r.condition))throw Error('Invalid rules');
 await writeFile(new URL(`vendor/${upstream}.json`,root),source);
 await writeFile(new URL(`rules/${id}.json`,root),JSON.stringify(rules));
 metadata.lists.push({id,upstream,url,count:rules.length,blocked:rules.filter(r=>r.action.type==='block').length,omitted:original.length-rules.length,sha256:createHash('sha256').update(source).digest('hex')});
 console.log(id+': '+rules.length+' rules');
}
await writeFile(new URL('rules/metadata.json',root),JSON.stringify(metadata,null,2)+'\n');
const license=await fetch(`https://raw.githubusercontent.com/uBlockOrigin/uBOL-home/${revision}/LICENSE`);
if(!license.ok)throw Error('License download failed');
await writeFile(new URL('LICENSE',root),await license.text());
