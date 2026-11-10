import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv} from './lib/csv.mjs';
import {table} from './lib/format.mjs';

const READS={
 sites:'select * from sites order by code',
 docks:'select d.id,s.code site,d.code,d.name from docks d join sites s on s.id=d.site_id order by site,d.code',
 carriers:'select * from carriers order by code',
 appointments:'select code,site,dock,carrier,local_start,timezone,status,reference,owner from v_appointments order by starts_at,code',
 'dock-plan':"select code,site,dock,carrier,local_start,local_end,timezone,status,reference,owner from v_appointments where status in ('requested','scheduled','arrived','in_progress') order by starts_at,code",
 attention:'select code,site,dock,carrier,owner,reason,detail from v_attention order by reason,code',
 conflicts:'select appointment,conflicting_appointment,starts_at,ends_at from v_conflicts order by starts_at,appointment',
 'carrier-scorecard':'select * from v_carrier_scorecard order by carrier',
 detention:"select code,site,carrier,status,free_minutes,wait_minutes,excess_minutes,departed_at from v_appointments where excess_minutes>0 and status not in ('canceled','no_show') order by excess_minutes desc,code",
 compliance:'select code,rule,finding from v_compliance order by rule,code',
 imports:'select id,source,exported_at,row_count,actor,created_at from imports order by created_at desc',
 audit:'select * from events order by created_at,id',
 'source-freshness':"select s.code site,max(i.exported_at) latest_export,case when max(i.exported_at) is null then 'no export loaded' when max(i.exported_at)<now()-interval '7 days' then 'review source freshness' else 'recent export' end finding from sites s left join docks d on d.site_id=s.id left join appointments a on a.dock_id=d.id left join source_versions v on v.appointment_id=a.id left join imports i on i.id=v.import_id group by s.id,s.code order by s.code"
};
const OPTIONS={
 help:[],...Object.fromEntries(Object.keys(READS).map(c=>[c,[]])),
 'weekly-review':[], detail:['appointment'], history:['appointment'],
 'add-site':['code','name','timezone','traffic-plan','review-due','actor'],
 'site-plan':['site','traffic-plan','review-due','actor'],
 'add-dock':['site','code','name','actor'], 'add-carrier':['code','name','actor'],
 book:['code','site','dock','carrier','reference','load-type','start','end','owner','free-minutes','actor'],
 reschedule:['appointment','site','dock','start','end','reason','actor'],
 arrive:['appointment','at','evidence','actor'], start:['appointment','at','evidence','actor'],
 complete:['appointment','at','departed-at','evidence','actor'], cancel:['appointment','reason','actor'],
 'no-show':['appointment','reason','actor'],
 'check-safety':['appointment','controller','load-information','restraint','exclusion-zone','driver-brief','at','actor'],
 log:['appointment','note','actor'], 'draft-carrier-note':['appointment','file','actor'],
 import:['file','map','site','source','exported-at','owner','free-minutes','actor','dry-run'], export:['file']
};
export const COMMANDS=Object.keys(OPTIONS);
export function parseArgs(args){const o={},pos=[];for(let i=0;i<args.length;i++){const a=args[i];if(!a.startsWith('--')){pos.push(a);continue;}const [k,...v]=a.slice(2).split('=');if(k in o)throw Error(`Duplicate option ${k}`);o[k]=v.length?v.join('='):['json','dry-run'].includes(k)?true:args[++i];if(o[k]===undefined||String(o[k]).startsWith('--'))throw Error(`Missing value for ${k}`);}return {command:pos.shift()||'help',o,pos};}
const required=(o,k)=>{if(typeof o[k]!=='string'||!o[k].trim())throw Error(`Required --${k}`);return o[k].trim();};
function integer(v,def=120){if(v===undefined)return def;if(!/^\d+$/.test(String(v))||Number(v)>10080)throw Error('free-minutes must be an integer from 0 to 10080');return Number(v);}
export function timestamp(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v)))throw Error('Timestamp requires an explicit UTC offset, for example 2026-11-10T09:00:00+13:00');calendar(v.slice(0,10));return new Date(v).toISOString();}
function calendar(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('Invalid calendar date');return v;}
function observed(v){const t=timestamp(v);if(Date.parse(t)>Date.now()+1000)throw Error('Observed timestamp cannot be in the future');return t;}
function code(v){if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,59}$/.test(v))throw Error('Code needs 1 to 60 letters, digits, underscores or hyphens');return v.toUpperCase();}
async function resolve(db,entity,ref,site=null){
 const scope=site?' and site_id=$2':'';const params=site?[ref,site]:[ref];
 let rows=await db.query(`select * from ${entity} where (lower(code)=lower($1) or id::text=$1${entity==='appointments'?'':' or lower(name)=lower($1)'})${scope}`,params);
 if(!rows.length)rows=await db.query(`select * from ${entity} where (strpos(lower(code),lower($1))>0 or id::text like $1||'%'${entity==='appointments'?'':' or strpos(lower(name),lower($1))>0'})${scope} order by code`,params);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous ${entity}: ${rows.map(r=>`${r.code} (${r.id})`).join(', ')}`:`No matching ${entity}: ${ref}`);return rows[0];
}
async function event(db,a,kind,actor,evidence,payload={}){return (await db.query('insert into events(appointment_id,kind,actor,evidence,payload) values($1,$2,$3,$4,$5) returning *',[a?.id||null,kind,actor,evidence,JSON.stringify(payload)]))[0];}
async function available(db,dock,start,end,except=null){if(Date.parse(end)<=Date.parse(start))throw Error('End must follow start');const conflicts=await db.query("select code from appointments where dock_id=$1 and starts_at<$3 and ends_at>$2 and ($4::uuid is null or id<>$4) and status in ('requested','scheduled','arrived','in_progress')",[dock,start,end,except]);if(conflicts.length)throw Error(`Dock conflict: ${conflicts.map(r=>r.code).join(', ')}`);}
const normalStatus=v=>({'Requested':'requested','Scheduled':'scheduled','Arrived':'arrived','In Progress':'in_progress','Completed':'completed','Canceled':'canceled','Cancelled':'canceled','No Show':'no_show'}[v]||(['requested','scheduled','arrived','in_progress','completed','canceled','no_show'].includes(v)?v:null));
async function importRows(db,o,actor){
 const original=fs.readFileSync(required(o,'file'),'utf8');const rows=parseCsv(original);if(!rows.length)throw Error('No appointment rows');
 const mapping=JSON.parse(fs.readFileSync(required(o,'map'),'utf8'));const keys=['external_id','code','dock','carrier','reference','load_type','start','end','status','arrived_at','started_at','completed_at','departed_at'];
 for(const k of Object.keys(mapping))if(!keys.includes(k))throw Error(`Unknown mapping field ${k}`);
 for(const k of ['external_id','dock','carrier','start','end','status','load_type'])if(!mapping[k])throw Error(`Required mapping field ${k}`);
 for(const h of Object.values(mapping))if(typeof h!=='string'||!Object.hasOwn(rows[0],h))throw Error(`Mapping column not found: ${h}`);
 const source=required(o,'source'),site=await resolve(db,'sites',required(o,'site')),exported=observed(required(o,'exported-at')),owner=required(o,'owner'),free=integer(o['free-minutes']);
 const seen=new Set(),prepared=[];const counts={added:0,changed:0,unchanged:0};
 for(const raw of rows){
  const r=Object.fromEntries(Object.entries(mapping).map(([k,h])=>[k,raw[h].trim()]));if(!r.external_id||seen.has(r.external_id))throw Error('Duplicate or missing external appointment ID');seen.add(r.external_id);
  const dock=await resolve(db,'docks',r.dock,site.id),carrier=await resolve(db,'carriers',r.carrier);const status=normalStatus(r.status);if(!status)throw Error(`Unknown source status: ${r.status}`);
  if(!['inbound','outbound','other'].includes(r.load_type.toLowerCase()))throw Error('Map load_type values to inbound, outbound or other before importing');
  const normalized={dock_id:dock.id,carrier_id:carrier.id,reference:r.reference||'',load_type:r.load_type.toLowerCase(),starts_at:timestamp(r.start),ends_at:timestamp(r.end),status,arrived_at:r.arrived_at?observed(r.arrived_at):null,started_at:r.started_at?observed(r.started_at):null,completed_at:r.completed_at?observed(r.completed_at):null,departed_at:r.departed_at?observed(r.departed_at):null};
  if(Date.parse(normalized.ends_at)<=Date.parse(normalized.starts_at))throw Error('End must follow start');
  const old=(await db.query('select * from appointments where source=$1 and source_id=$2',[source,r.external_id]))[0];
  const last=old?(await db.query('select normalized,raw from source_versions where appointment_id=$1 order by created_at desc,id desc limit 1',[old.id]))[0]:null;
  const canonical=x=>JSON.stringify(Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))));
  const changed=!last||canonical(last.normalized)!==canonical(normalized)||canonical(last.raw)!==canonical(raw);
  if(old&&Date.parse(exported)<Date.parse(old.exported_at))throw Error('Export is older than the stored source record');
  if(old&&changed){if(Date.parse(exported)<=Date.parse(old.exported_at))throw Error('Changed records require a later exported-at');if(old.local_changed)throw Error(`Local work exists for ${old.code}; reconcile it before replacing source history`);}
  const localCode=old?.code||code(r.code||`OD-${createHash('sha256').update(source+'\0'+r.external_id).digest('hex').slice(0,16)}`);
  counts[!old?'added':changed?'changed':'unchanged']++;prepared.push({raw,r,normalized,old,changed,localCode});
 }
 const batch=(await db.query('insert into imports(source,exported_at,sha256,original_csv,mapping,actor,row_count) values($1,$2,$3,$4,$5,$6,$7) returning id',[source,exported,createHash('sha256').update(original).digest('hex'),original,JSON.stringify(mapping),actor,rows.length]))[0];
 for(const p of prepared){let a=p.old;const keys=Object.keys(p.normalized),values=Object.values(p.normalized);
  if(!a)a=(await db.query(`insert into appointments(code,source,source_id,exported_at,owner,free_minutes,${keys.join(',')}) values(${[...Array(6+keys.length)].map((_,i)=>'$'+(i+1)).join(',')}) returning *`,[p.localCode,source,p.r.external_id,exported,owner,free,...values]))[0];
  else if(p.changed)a=(await db.query(`update appointments set ${keys.map((k,i)=>k+'=$'+(i+1)).join(',')},exported_at=$${keys.length+1} where id=$${keys.length+2} returning *`,[...values,exported,a.id]))[0];
  else await db.query('update appointments set exported_at=$1 where id=$2',[exported,a.id]);
  await db.query('insert into source_versions(appointment_id,import_id,raw,normalized) values($1,$2,$3,$4)',[a.id,batch.id,JSON.stringify(p.raw),JSON.stringify(p.normalized)]);
 }
 await event(db,null,'import',actor,`${source}: ${rows.length} rows; overlaps retained for review`,counts);
 return {...counts,rows:rows.length,batch:batch.id,dry_run:Boolean(o['dry-run'])};
}
export async function execute(db,command,o={},pos=[]){
 if(!OPTIONS[command])throw Error(`Unknown command: ${command}`);
 for(const key of Object.keys(o))if(key!=='json'&&!OPTIONS[command].includes(key))throw Error(`Unknown option --${key}`);
 if(pos.length&&(command!=='import'||pos.length!==1||pos[0]!=='opendock'))throw Error('Only import accepts a positional argument: opendock');
 if(command==='help')return {commands:OPTIONS,notes:'Use --json for records. Every write needs --actor. Timestamps require UTC offsets. Import requires explicit mapping. No sends or physical gate control.'};
 if(READS[command])return db.query(READS[command]);
 if(command==='weekly-review'){const out={};for(const c of ['dock-plan','attention','carrier-scorecard','detention','compliance','source-freshness'])out[c]=await db.query(READS[c]);return out;}
 if(['detail','history'].includes(command)){const a=await resolve(db,'appointments',required(o,'appointment'));if(command==='detail')return (await db.query('select * from v_appointments where id=$1',[a.id]))[0];return {appointment:a,safety:await db.query('select * from safety_checks where appointment_id=$1 order by created_at',[a.id]),events:await db.query('select * from events where appointment_id=$1 order by created_at',[a.id]),source_versions:await db.query('select * from source_versions where appointment_id=$1 order by created_at',[a.id])};}
 if(command==='export'){
  const out={format:'dock-appointments-v1',exported_at:new Date().toISOString(),data:{}};await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try{for(const t of ['sites','docks','carriers','appointments','safety_checks','events','imports','source_versions'])out.data[t]=await db.query(`select * from ${t} order by created_at,id`);}finally{await db.exec('ROLLBACK');}
  const file=path.resolve(required(o,'file'));fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n',{flag:'wx',mode:0o600});return {file,counts:Object.fromEntries(Object.entries(out.data).map(([k,v])=>[k,v.length]))};
 }
 const actor=required(o,'actor');await db.exec('BEGIN');
 try{
  // Serialise appointment decisions on both engines. Never a booking race on a shared dock.
  await db.exec('LOCK TABLE appointments IN SHARE ROW EXCLUSIVE MODE');
  let result;
  if(command==='import'){if(pos[0]!=='opendock')throw Error('Use import opendock');result=await importRows(db,o,actor);}
  else if(command==='add-site'){
   const zone=required(o,'timezone');try{new Intl.DateTimeFormat('en',{timeZone:zone}).format();}catch{throw Error('Invalid IANA timezone');}
   result=(await db.query('insert into sites(code,name,timezone,traffic_plan,review_due) values($1,$2,$3,$4,$5) returning *',[code(required(o,'code')),required(o,'name'),zone,o['traffic-plan']||null,o['review-due']?calendar(o['review-due']):null]))[0];
   await event(db,null,command,actor,'Registered site',{id:result.id});
  }else if(command==='site-plan'){
   const s=await resolve(db,'sites',required(o,'site'));result=(await db.query('update sites set traffic_plan=$1,review_due=$2 where id=$3 returning *',[required(o,'traffic-plan'),calendar(required(o,'review-due')),s.id]))[0];await event(db,null,command,actor,required(o,'traffic-plan'),{site:s.id,review_due:result.review_due});
  }else if(command==='add-dock'){
   const s=await resolve(db,'sites',required(o,'site'));result=(await db.query('insert into docks(site_id,code,name) values($1,$2,$3) returning *',[s.id,code(required(o,'code')),required(o,'name')]))[0];await event(db,null,command,actor,'Registered dock',{id:result.id});
  }else if(command==='add-carrier'){
   result=(await db.query('insert into carriers(code,name) values($1,$2) returning *',[code(required(o,'code')),required(o,'name')]))[0];await event(db,null,command,actor,'Registered carrier',{id:result.id});
  }else if(command==='book'){
   const s=await resolve(db,'sites',required(o,'site')),d=await resolve(db,'docks',required(o,'dock'),s.id),c=await resolve(db,'carriers',required(o,'carrier'));
   const start=timestamp(required(o,'start')),end=timestamp(required(o,'end'));await available(db,d.id,start,end);
   result=(await db.query('insert into appointments(code,dock_id,carrier_id,reference,load_type,starts_at,ends_at,owner,free_minutes,local_changed) values($1,$2,$3,$4,$5,$6,$7,$8,$9,true) returning *',[code(required(o,'code')),d.id,c.id,required(o,'reference'),required(o,'load-type'),start,end,required(o,'owner'),integer(o['free-minutes'])]))[0];await event(db,result,command,actor,'Operator booking',{start,end});
  }else{
   const a=await resolve(db,'appointments',required(o,'appointment'));
   if(command==='log'){result=await event(db,a,'note',actor,required(o,'note'));await db.query('update appointments set local_changed=true where id=$1',[a.id]);}
   else if(command==='draft-carrier-note'){
    const body=fs.readFileSync(required(o,'file'),'utf8');if(!body.trim())throw Error('Draft is empty');const id=randomUUID();
    const dir=path.join(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true,mode:0o700});const file=path.join(dir,`${a.code}-${id}.md`);fs.writeFileSync(file,`# Draft for manual review: ${a.code}\n\n${body}\n`,{flag:'wx',mode:0o600});await event(db,a,command,actor,'Draft saved; nothing sent',{draft_id:id,sha256:createHash('sha256').update(body).digest('hex')});await db.query('update appointments set local_changed=true where id=$1',[a.id]);result={file,id,sent:false};
   }else if(command==='check-safety'){
    if(!['arrived','in_progress'].includes(a.status))throw Error('Safety evidence needs an arrived or in-progress appointment');const at=observed(required(o,'at'));if(!a.arrived_at||Date.parse(at)<Date.parse(a.arrived_at))throw Error('Safety check must follow arrival');
    result=(await db.query('insert into safety_checks(appointment_id,controller,load_information,restraint,exclusion_zone,driver_brief,actor,checked_at) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[a.id,...['controller','load-information','restraint','exclusion-zone','driver-brief'].map(k=>required(o,k)),actor,at]))[0];await db.query('update appointments set local_changed=true where id=$1',[a.id]);await event(db,a,command,actor,'Recorded operator observations',{safety_id:result.id});
   }else if(command==='reschedule'){
    if(!['scheduled','requested'].includes(a.status))throw Error('Only requested or scheduled appointments can be rescheduled');const s=await resolve(db,'sites',required(o,'site')),d=await resolve(db,'docks',required(o,'dock'),s.id);const start=timestamp(required(o,'start')),end=timestamp(required(o,'end'));await available(db,d.id,start,end,a.id);
    result=(await db.query('update appointments set dock_id=$1,starts_at=$2,ends_at=$3,status=\'scheduled\',local_changed=true where id=$4 returning *',[d.id,start,end,a.id]))[0];await event(db,a,command,actor,required(o,'reason'),{before:{dock_id:a.dock_id,start:a.starts_at,end:a.ends_at},after:{dock_id:d.id,start,end}});
   }else if(['cancel','no-show'].includes(command)){
    if(!['requested','scheduled'].includes(a.status))throw Error('Only requested or scheduled appointments can be closed this way');if(command==='no-show'&&Date.parse(a.ends_at)>Date.now())throw Error('Appointment window has not ended');result=(await db.query('update appointments set status=$1,local_changed=true where id=$2 returning *',[command==='cancel'?'canceled':'no_show',a.id]))[0];await event(db,a,command,actor,required(o,'reason'));
   }else{
    const at=observed(required(o,'at'));const expected={arrive:'scheduled',start:'arrived',complete:'in_progress'}[command];if(a.status!==expected)throw Error(`${command} requires ${expected} status`);
    if(command==='arrive')result=(await db.query("update appointments set status='arrived',arrived_at=$1,local_changed=true where id=$2 returning *",[at,a.id]))[0];
    if(command==='start'){
     const checks=await db.query('select * from safety_checks where appointment_id=$1 and checked_at<=$2 order by checked_at desc limit 1',[a.id,at]);if(!checks.length)throw Error('Record safety evidence before starting');if(!a.arrived_at||Date.parse(at)<Date.parse(a.arrived_at))throw Error('Start must follow recorded arrival');
     const site=(await db.query('select s.* from sites s join docks d on d.site_id=s.id where d.id=$1',[a.dock_id]))[0];if(!site.traffic_plan||!site.review_due||String(site.review_due).slice(0,10)<new Date().toISOString().slice(0,10))throw Error('Site traffic plan review is missing or overdue');
     result=(await db.query("update appointments set status='in_progress',started_at=$1,local_changed=true where id=$2 returning *",[at,a.id]))[0];
    }
    if(command==='complete'){
     const departure=observed(required(o,'departed-at'));if(!a.started_at||Date.parse(at)<Date.parse(a.started_at)||Date.parse(departure)<Date.parse(at))throw Error('Completion and departure must follow loading start');result=(await db.query("update appointments set status='completed',completed_at=$1,departed_at=$2,local_changed=true where id=$3 returning *",[at,departure,a.id]))[0];
    }
    await event(db,a,command,actor,required(o,'evidence'),{at,...(command==='complete'?{departed_at:result.departed_at}:{})});
   }
  }
  await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
export function human(value){if(Array.isArray(value)){if(!value.length)return '(none)';return table(value,Object.keys(value[0]).map(key=>({key,label:key,width:72,format:v=>v instanceof Date?v.toISOString():v&&typeof v==='object'?JSON.stringify(v):v})));}if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>`${k}\n${human(v)}`).join('\n\n');return String(value??'');}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{const {command,o,pos}=parseArgs(process.argv.slice(2));db=await getDb();const result=await execute(db,command,o,pos);console.log(o.json?JSON.stringify(result,null,2):human(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
