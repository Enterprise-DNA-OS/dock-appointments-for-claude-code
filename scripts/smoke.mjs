import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {execute,COMMANDS,parseArgs,timestamp} from './docks.mjs';
import {parseCsv} from './lib/csv.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dock-test-'));
process.env.DATA_DIR=path.join(dir,'db');process.env.OUTPUT_DIR=path.join(dir,'out');process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'';
const schema='test_'+randomUUID().replaceAll('-','');
if(process.env.TEST_DATABASE_URL){const u=new URL(process.env.DATABASE_URL);u.searchParams.set('options',`-c search_path=${schema}`);process.env.DATABASE_URL=u.toString();}
const db=await getDb();let assertions=0;const used=new Set();
const eq=(a,b)=>{assert.deepEqual(a,b);assertions++;};const ok=x=>{assert.ok(x);assertions++;};
const run=(c,o={},pos=[])=>{used.add(c);return execute(db,c,o,pos);};
async function fail(c,o,re,pos=[]){await assert.rejects(()=>run(c,o,pos),re);assertions++;}
const count=async t=>(await db.query(`select count(*)::int n from ${t}`))[0].n;
const ago=n=>new Date(Date.now()-n*60000).toISOString();const later=n=>new Date(Date.now()+n*60000).toISOString();const actor='Rae Test';
try{
 if(process.env.TEST_DATABASE_URL)await db.exec(`create schema ${schema}`);
 eq((await migrate(db)).ran.length,1);eq((await migrate(db)).ran.length,0);await seed(db);await seed(db);eq(await count('appointments'),7);
 for(const c of ['help','sites','docks','carriers','appointments','dock-plan','attention','conflicts','carrier-scorecard','detention','compliance','imports','audit','source-freshness','weekly-review'])ok(await run(c));
 ok((await run('attention')).some(r=>r.reason==='dock_conflict'));ok((await run('compliance')).some(r=>r.rule==='TIMELINE'));eq((await run('source-freshness'))[0].finding,'no export loaded');
 const a=(await run('detail',{appointment:'apt-101'}));eq(a.code,'APT-101');eq((await run('detail',{appointment:a.id.slice(0,8)})).id,a.id);
 await fail('detail',{appointment:'APT-'},/Ambiguous/);await fail('detail',{appointment:'MISSING'},/No matching/);
 await fail('add-carrier',{code:'NEW',name:'New'},/actor/);
 const s=await run('add-site',{code:'TEST',name:'<script>alert(1)</script>',timezone:'Pacific/Auckland',actor});ok(s.id);
 await fail('add-site',{code:'BAD',name:'Bad',timezone:'not/a/zone',actor},/timezone/);
 await fail('site-plan',{site:'TEST','traffic-plan':'Observed controls','review-due':'2026-02-30',actor},/calendar/);
 await run('site-plan',{site:'TEST','traffic-plan':'Observed test controls; pedestrian area segregated','review-due':'2099-01-01',actor});
 await run('add-dock',{site:'TEST',code:'IN-1',name:'Test receiving',actor});await run('add-carrier',{code:'TEST-CARRIER',name:'Test Carrier',actor});
 const book={code:'TEST-1',site:'TEST',dock:'IN-1',carrier:'TEST-CARRIER',reference:'TEST-PO','load-type':'inbound',start:ago(120),end:ago(60),owner:'Rae',actor};
 await fail('book',{...book,carrier:'Fer'},/Ambiguous/); // exact FERN code intentionally takes precedence; test name ambiguity below
 await fail('book',{...book,start:'2026-11-10T09:00:00'},/UTC offset/);
 await fail('book',{...book,end:ago(180)},/End must/);
 await fail('book',{...book,'free-minutes':'-1'},/integer/);
 const b=await run('book',book);ok(b.id);
 await fail('book',{...book,code:'TEST-CLASH'},/Dock conflict/);
 await fail('reschedule',{appointment:b.code,site:'HARBOUR',dock:'IN-1',start:later(130),end:later(170),reason:'Test clash',actor},/Dock conflict/);
 await run('reschedule',{appointment:b.code,site:'TEST',dock:'IN-1',start:ago(110),end:ago(50),reason:'Operator confirmed change',actor});
 await fail('start',{appointment:b.code,at:ago(90),evidence:'No arrival yet',actor},/requires arrived/);
 await fail('arrive',{appointment:b.code,at:later(10),evidence:'Not yet',actor},/future/);
 await run('arrive',{appointment:b.code,at:ago(100),evidence:'Operator observed arrival',actor});
 await fail('start',{appointment:b.code,at:ago(90),evidence:'Missing safety',actor},/safety evidence/);
 const safety={appointment:b.code,controller:'Jules', 'load-information':'Pallet weight and load plan checked',restraint:'Dock lock checked','exclusion-zone':'Barriers observed','driver-brief':'Driver waiting area explained',at:ago(95),actor};
 await fail('check-safety',{...safety,at:ago(150)},/follow arrival/);
 const safetyRecord=await run('check-safety',safety);ok(safetyRecord.id);
 await fail('start',{appointment:b.code,at:ago(99),evidence:'Too early',actor},/safety evidence/);
 await run('site-plan',{site:'TEST','traffic-plan':'Overdue plan','review-due':'2020-01-01',actor});
 await fail('start',{appointment:b.code,at:ago(90),evidence:'Overdue review',actor},/overdue/);
 await run('site-plan',{site:'TEST','traffic-plan':'Review complete','review-due':'2099-01-01',actor});
 await run('start',{appointment:b.code,at:ago(90),evidence:'Loading observed',actor});
 await fail('reschedule',{appointment:b.code,site:'TEST',dock:'IN-1',start:later(50),end:later(100),reason:'Too late',actor},/Only requested/);
 await fail('complete',{appointment:b.code,at:ago(30),'departed-at':ago(40),evidence:'Bad sequence',actor},/must follow/);
 await run('complete',{appointment:b.code,at:ago(30),'departed-at':ago(20),evidence:'Load complete and departure observed',actor});
 eq((await run('detail',{appointment:b.code})).status,'completed');
 await run('log',{appointment:b.code,note:'Carrier acknowledged the movement record',actor});
 const draft=await run('draft-carrier-note',{appointment:b.code,file:path.join(REPO_ROOT,'fixtures/carrier-note.txt'),actor});ok(fs.readFileSync(draft.file,'utf8').includes('Draft for manual review'));eq(draft.sent,false);
 const history=await run('history',{appointment:b.code});eq(history.safety.length,1);ok(history.events.length>=6);
 await run('book',{...book,code:'CANCEL-1',start:later(200),end:later(260)});await fail('no-show',{appointment:'CANCEL-1',reason:'Not yet',actor},/not ended/);await run('cancel',{appointment:'CANCEL-1',reason:'Carrier cancelled',actor});
 await run('book',{...book,code:'NOSHOW-1',start:ago(500),end:ago(440)});await run('no-show',{appointment:'NOSHOW-1',reason:'No arrival observed',actor});
 const fixture=path.join(REPO_ROOT,'fixtures/opendock.csv'),mapping=path.join(REPO_ROOT,'fixtures/opendock-map.json');
 const imp={file:fixture,map:mapping,site:'HARBOUR',source:'synthetic-source','exported-at':'2026-10-10T00:00:00Z',owner:'Rae',actor};
 let before=await count('appointments');eq((await run('import',{...imp,'dry-run':true},['opendock'])).added,2);eq(await count('appointments'),before);eq(await count('imports'),0);
 eq((await run('import',imp,['opendock'])).added,2);eq((await run('import',imp,['opendock'])).unchanged,2);eq(await count('appointments'),before+2);
 ok((await run('compliance')).some(r=>r.code==='IMPORTED-1'&&r.rule==='LOAD-EVIDENCE'));
 const changed=path.join(dir,'changed.csv');fs.writeFileSync(changed,fs.readFileSync(fixture,'utf8').replace('PO-EXAMPLE-1','PO-CHANGED'));
 await fail('import',{...imp,file:changed},/later exported-at/,['opendock']);
 eq((await run('import',{...imp,file:changed,'exported-at':'2026-10-11T00:00:00Z'},['opendock'])).changed,1);
 eq((await run('detail',{appointment:'IMPORTED-1'})).reference,'PO-CHANGED');
 eq((await run('history',{appointment:'IMPORTED-1'})).source_versions.length,3);
 await fail('import',imp,/older/,['opendock']);
 const bad=path.join(dir,'bad.csv');const raw=fs.readFileSync(fixture,'utf8');fs.writeFileSync(bad,raw.replace('SYN-2','SYN-1'));
 await fail('import',{...imp,file:bad,source:'other'},/Duplicate/,['opendock']);eq(await count('appointments'),before+2);
 fs.writeFileSync(bad,raw.replace('No Show','Mystery'));await fail('import',{...imp,file:bad,source:'other'},/Unknown source status/,['opendock']);
 // A failure during the second write rolls back the first appointment, import and source version.
 fs.writeFileSync(bad,raw.replace('SYN-1','NEW-1').replace('SYN-2','NEW-2').replace('IMPORTED-1','NEW-ROW').replace('2026-10-01T10:30:00+13:00','2026-10-01T08:30:00+13:00'));
 const batches=await count('imports');await fail('import',{...imp,file:bad,source:'bad'},/check constraint/,['opendock']);eq(await count('imports'),batches);eq(await count('appointments'),before+2);
 // Imported planned records can be operated locally; a later changed export cannot overwrite them.
 fs.writeFileSync(bad,raw.replaceAll('SYN-','ACTIVE-').replaceAll('IMPORTED-','ACTIVE-').replace(',Completed,',',Scheduled,'));
 await run('import',{...imp,file:bad,source:'active'},['opendock']);await run('cancel',{appointment:'ACTIVE-1',reason:'Operator owns this now',actor});
 fs.writeFileSync(bad,fs.readFileSync(bad,'utf8').replace('PO-EXAMPLE-1','CHANGED'));
 await fail('import',{...imp,file:bad,source:'active','exported-at':'2026-10-12T00:00:00Z'},/Local work/,['opendock']);
 await assert.rejects(()=>db.query('delete from safety_checks where id=$1',[safetyRecord.id]),/append only/);assertions++;
 await assert.rejects(()=>db.query('update events set evidence=\'changed\''),/append only/);assertions++;
 const exp=await run('export',{file:path.join(dir,'export.json')});eq(exp.counts.appointments,await count('appointments'));eq(JSON.parse(fs.readFileSync(exp.file)).data.imports[0].original_csv,raw);
 await fail('export',{file:exp.file},/EEXIST/);await fail('appointments',{typo:true},/Unknown option/);
 eq(parseArgs(['detail','--appointment',a.code,'--json']).o,{appointment:a.code,json:true});assert.throws(()=>parseArgs(['--json','--json']),/Duplicate/);assertions++;
 assert.throws(()=>timestamp('2026-02-30T09:00:00Z'),/calendar/);assertions++;
 eq(parseCsv('\uFEFFid,text\r\n1,"a,b\nHe said ""yes"""\r\n')[0].text,'a,b\nHe said "yes"');assert.throws(()=>parseCsv('id,ID\n1,2'),/unique/);assertions++;
 await db.close();
 for(const script of ['view','docs']){const p=spawnSync(process.execPath,[`scripts/${script}.mjs`],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(p.status,0);}
 const html=fs.readFileSync(path.join(dir,'out','docs-out','shift-handover',`test-${s.id}.html`),'utf8');ok(html.includes('&lt;script&gt;'));ok(!html.includes('<script>alert(1)</script>'));
 const cli=spawnSync(process.execPath,['scripts/docks.mjs','appointments','--json'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(cli.status,0);ok(JSON.parse(cli.stdout).length>7);
 const ambiguous=spawnSync(process.execPath,['scripts/docks.mjs','detail','--appointment=APT-'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(ambiguous.status,1);ok(ambiguous.stderr.includes('Ambiguous'));
 eq([...used].sort(),COMMANDS.slice().sort());
 console.log(`PASS: ${assertions} assertions, ${used.size} CLI commands, ${process.env.TEST_DATABASE_URL?'PostgreSQL':'PGlite'}, rendered documents and views`);
}catch(e){console.error(e.message);process.exitCode=1;}
finally{
 try{await db.close();}catch{}
 if(process.env.TEST_DATABASE_URL){const cleanup=await getDb();try{await cleanup.exec(`drop schema if exists ${schema} cascade`);}finally{await cleanup.close();}}
 fs.rmSync(dir,{recursive:true,force:true});
}
