const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat'],
DEFAULT_PERIODS=[['P1','09:10','10:00'],['P2','10:00','10:40'],['P3','10:40','11:20'],['P4','11:50','12:30'],['P5','12:30','13:10'],['P6','13:10','13:50'],['P7','13:50','14:30']].map(([label,start,end])=>({label,start,end})),
DAILY_LIMIT=6,KEY='lakshya-subplanner-v1',GROUPS=['SST','Sci','Math','Lang','IT','PE','Lib','Other'];
const $=s=>document.querySelector(s),
esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
fmt=c=>c.replace(/^([IVX]+)([A-D])?$/,'$1 $2').trim(),
norm=c=>c.replace(/\s+/g,'').toUpperCase(),
grid=s=>{const r=s.split('/');return DAYS.map((_,i)=>{const c=(r[i]||'').split('|');return Array.from({length:7},(_,p)=>c[p]||'')})};
const fresh=()=>({periods:DEFAULT_PERIODS.map(p=>({...p})),teachers:SEED.map((t,i)=>({id:'t'+i,name:t[0],sub:t[1],grp:t[2],tt:grid(t[3])})),abs:{},asg:{},n:SEED.length});
let st;try{st=JSON.parse(localStorage.getItem(KEY))||fresh()}catch(e){st=fresh()}
if(!Array.isArray(st.periods)||st.periods.length!==DEFAULT_PERIODS.length)st.periods=DEFAULT_PERIODS.map(p=>({...p}));
else st.periods=st.periods.map((p,i)=>({...DEFAULT_PERIODS[i],...p,label:typeof p.label==='string'&&p.label.trim()?p.label:`P${i+1}`}));
let apiReady=false,saveTimer,savePromise,saveRevision=0,lastSavedRevision=0;
const persist=async state=>{
 const response=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state})});
 if(!response.ok){
  const result=await response.json().catch(()=>({}));
  throw new Error(result.error||`Server returned ${response.status}`);
 }
};
const setSaveStatus=(message,state)=>{
 const status=$('#save-status');
 if(!status)return;
 status.textContent=message;
 status.dataset.state=state;
};
const save=()=>{
 localStorage.setItem(KEY,JSON.stringify(st));
 saveRevision++;
 setSaveStatus(apiReady?'Unsaved changes':'Offline · saved on this device','pending');
 clearTimeout(saveTimer);
 if(apiReady)saveTimer=setTimeout(()=>saveToBackend().catch(()=>{}),300);
};
const saveToBackend=async()=>{
 clearTimeout(saveTimer);
 if(savePromise){
  await savePromise;
  if(lastSavedRevision<saveRevision)return saveToBackend();
  return;
 }
 const revision=saveRevision,snapshot=JSON.parse(JSON.stringify(st));
 setSaveStatus('Saving to Supabase…','saving');
 savePromise=(async()=>{
  let saved=false;
  try{
   await persist(snapshot);
   saved=true;
   apiReady=true;
   lastSavedRevision=revision;
   if(saveRevision===revision)setSaveStatus('Saved to Supabase','saved');
  }catch(error){
   setSaveStatus('Save failed · device copy only','error');
   throw error;
  }finally{
   savePromise=null;
    if(saved&&apiReady&&saveRevision!==lastSavedRevision)saveTimer=setTimeout(()=>saveToBackend().catch(()=>{}),0);
  }
 })();
 return savePromise;
};
const clockTime=value=>{const [h,m]=value.split(':');return `${Number(h)%12||12}:${m}`},
periodTime=p=>`${clockTime(p.start)}–${clockTime(p.end)}`;
const iso=()=>{const n=new Date();n.setMinutes(n.getMinutes()-n.getTimezoneOffset());return n.toISOString().slice(0,10)};
let date=iso(),tab='sub',sel=null,q='',periodSettingsOpen=false;
const dIdx=()=>new Date(date+'T00:00:00').getDay()-1;
const T=id=>st.teachers.find(t=>t.id===id),
has=t=>t.tt.some(d=>d.some(Boolean)),
absn=()=>st.abs[date]||(st.abs[date]=[]),
asg=()=>st.asg[date]||(st.asg[date]={}),
load=(t,d)=>t.tt[d].filter(Boolean).length,
used=id=>Object.values(asg()).filter(v=>v===id).length,
dailyLoad=(t,d)=>load(t,d)+used(t.id),
busy=(id,p,key)=>Object.entries(asg()).some(([k,v])=>v===id&&k!==key&&k.split(':')[1]==p);
function cands(a,p,key){const d=dIdx();
 return st.teachers.filter(t=>t.id!==a.id&&!absn().includes(t.id)&&has(t)&&!t.tt[d][p]&&!busy(t.id,p,key)&&dailyLoad(t,d)-(asg()[key]===t.id?1:0)<DAILY_LIMIT)
 .map(t=>({t,s:(t.grp===a.grp?100:0)-used(t.id)*10-load(t,d)})).sort((x,y)=>y.s-x.s).map(x=>x.t)}
const lessons=t=>t.tt[dIdx()].map((c,p)=>c?{p,c}:null).filter(Boolean);
const toast=m=>{const e=$('#toast');e.textContent=m;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),1800)};
function summary(){const groups=absn().map(id=>{const a=T(id),items=lessons(a).map(l=>{const s=asg()[id+':'+l.p],period=st.periods[l.p];return `${period.label} | ${periodTime(period)}\nClass: ${fmt(l.c)}\nCover teacher: ${s?T(s).name:'NOT ASSIGNED'}`});
  return `ABSENT TEACHER: ${a.name} (${a.sub})\n\n${items.join('\n\n')}`});
 const nice=new Date(date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 return groups.length?`SUBSTITUTION PLAN\n${nice}\n\n${groups.join('\n\n------------------------------\n\n')}`:''}
function subView(){
 const d=dIdx(),list=st.teachers.filter(t=>t.name.toLowerCase().includes(q.toLowerCase()));
 const side=`<aside class="card side"><h2>Who is absent?</h2><p class="hint">Tap a name to mark absent. Their classes appear on the right.</p>
 <input id="q" placeholder="Search teacher" value="${esc(q)}"><div class="list">${list.map(t=>{const total=d<0?0:dailyLoad(t,d);return `<button class="tb ${absn().includes(t.id)?'abs':''} ${has(t)?'':'nodata'}" data-abs="${t.id}"><span>${esc(t.name)}<br><small>${esc(t.sub)}</small></span><small class="${total>=DAILY_LIMIT?'limit-hit':''}">${d<0?'':has(t)?`${total}/${DAILY_LIMIT} classes today${total>=DAILY_LIMIT?' · FULL':''}`:'no timetable'}</small></button>`}).join('')}</div></aside>`;
 let main;
 if(d<0)main=`<div class="empty"><h3>Sunday</h3>School is closed. Pick a Monday–Saturday date.</div>`;
 else if(!absn().length)main=`<div class="empty"><h3>No one is absent</h3>Select an absent teacher from the list. Free teachers for each period are suggested automatically.</div>`;
 else{const required=absn().reduce((n,id)=>n+lessons(T(id)).length,0),assigned=Object.keys(asg()).filter(k=>absn().some(id=>k.startsWith(id+':'))).length;
 main=`<div class="metrics"><div><strong>${absn().length}</strong><span>Absent</span></div><div><strong>${required}</strong><span>Classes to cover</span></div><div><strong>${assigned}/${required}</strong><span>Assigned</span></div></div><div class="bar"><span class="hint">Same subject group is prioritised. Maximum ${DAILY_LIMIT} total classes per teacher today, including regular classes.</span><span><button class="pri" data-auto>Auto-assign all</button> <button data-clear>Clear</button></span></div>`+
  absn().map(id=>{const a=T(id),ls=lessons(a);return `<section class="grp"><h3>${esc(a.name)} <span class="badge warn">absent</span></h3><span class="hint">${esc(a.sub)} · ${ls.length} periods on ${DAYS[d]}</span>${ls.length?`<div class="lessons">${ls.map(l=>{const key=id+':'+l.p,cur=asg()[key],cs=cands(a,l.p,key);
  return `<div class="lesson ${cur?'done':''}"><span class="p">${esc(st.periods[l.p].label)} · ${periodTime(st.periods[l.p])}</span><div class="cls">${fmt(l.c)}</div>
    ${cs.length?`<select data-k="${key}"><option value="">Choose teacher (${cs.length} available)</option>${cs.map(t=>`<option value="${t.id}" ${cur===t.id?'selected':''}>${esc(t.name)} · ${t.grp===a.grp?'same group · ':''}${dailyLoad(t,d)}/${DAILY_LIMIT} classes today</option>`).join('')}</select>`:`<div class="nofree">No eligible teacher: check timetables, period clashes, and the ${DAILY_LIMIT}-class daily limit.</div>`}</div>`}).join('')}</div>`:`<p class="hint">No classes on this day.</p>`}</section>`}).join('')+
  `<div class="card sum"><h3>Substitution slip</h3><pre id="sl">${esc(summary())||'Nothing assigned yet.'}</pre><button class="pri" data-copy>Copy for WhatsApp</button> <button onclick="print()">Print</button></div>`}
 return side+`<div>${main}</div>`}
function tchView(){
 const t=T(sel)||st.teachers[0];sel=t.id;
 const side=`<aside class="card side"><h2>Teachers (${st.teachers.length})</h2><div class="list">${st.teachers.map(x=>`<button class="tb ${x.id===sel?'abs':''}" data-sel="${x.id}" style="${x.id===sel?'background:var(--amber);border-color:var(--amber);color:#2b2200':''}"><span>${esc(x.name)}<br><small>${esc(x.sub)}</small></span><span class="badge ${has(x)?'ok':'warn'}">${has(x)?x.tt.flat().filter(Boolean).length+'/wk':'empty'}</span></button>`).join('')}</div>
 <h3>Add teacher</h3><div class="row2"><input id="nn" class="full" placeholder="Name"><input id="ns" placeholder="Subject"><select id="ng">${GROUPS.map(g=>`<option>${g}</option>`).join('')}</select><button class="pri full" data-add>Add teacher</button></div></aside>`;
 const main=`<div class="card"><div class="bar"><div><h2>${esc(t.name)}</h2><span class="hint">Edit teacher details and weekly timetable. Blank periods count as free; fill the timetable to make this teacher eligible.</span></div><button data-del="${t.id}">Delete</button></div>
 <div class="profile"><label>Name<input id="edit-name" value="${esc(t.name)}"></label><label>Subject(s)<input id="edit-sub" value="${esc(t.sub)}"></label><label>Subject group<select id="edit-grp">${GROUPS.map(g=>`<option ${t.grp===g?'selected':''}>${g}</option>`).join('')}</select></label></div>
 <details class="period-settings" ${periodSettingsOpen?'open':''}><summary>Edit school periods and timings</summary><p class="hint">Change period names and start/end times. Updates are saved automatically.</p><div class="period-grid">${st.periods.map((p,i)=>`<div class="period-row"><label>Period name<input value="${esc(p.label)}" data-period-label="${i}" aria-label="Period ${i+1} name"></label><label>Starts<input type="time" value="${esc(p.start)}" data-period="${i}" data-part="start" aria-label="${p.label} start time"></label><label>Ends<input type="time" value="${esc(p.end)}" data-period="${i}" data-part="end" aria-label="${p.label} end time"></label></div>`).join('')}</div></details>
 <div class="tblwrap"><table><tr><th></th>${st.periods.map(p=>`<th>${esc(p.label)}<br>${periodTime(p)}</th>`).join('')}</tr>${DAYS.map((dn,di)=>`<tr><th>${dn}</th>${t.tt[di].map((c,p)=>`<td><input placeholder="" value="${esc(c)}" data-d="${di}" data-p="${p}" aria-label="${dn} ${st.periods[p].label}"></td>`).join('')}</tr>`).join('')}</table></div>
 <p class="hint">Teachers with an empty timetable are not suggested as free. <button data-reset style="margin-left:8px">Reset all data</button></p></div>`;
 return side+main}
function R(){document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
 const f=document.activeElement&&document.activeElement.id==='q';$('#app').innerHTML=tab==='sub'?subView():tchView();
 if(f){const i=$('#q');i.focus();i.setSelectionRange(q.length,q.length)}}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const D=b.dataset;
 if(D.tab){tab=D.tab;R()}
 else if('save' in D){saveToBackend().then(()=>toast('Saved to Supabase')).catch(error=>toast(error.message||'Save failed. Check the shared server connection.'))}
 else if(D.abs){const a=absn(),i=a.indexOf(D.abs);if(i<0)a.push(D.abs);else{a.splice(i,1);Object.keys(asg()).filter(k=>k.startsWith(D.abs+':')).forEach(k=>delete asg()[k])}save();R()}
 else if('auto' in D){absn().forEach(id=>lessons(T(id)).forEach(l=>{const k=id+':'+l.p;if(!asg()[k]){const c=cands(T(id),l.p,k)[0];if(c)asg()[k]=c.id}}));save();R();toast('Free teachers assigned')}
 else if('clear' in D){st.asg[date]={};save();R()}
 else if('copy' in D){navigator.clipboard.writeText(summary()).then(()=>toast('Copied'))}
 else if(D.sel){sel=D.sel;R()}
 else if('add' in D){const n=$('#nn').value.trim();if(!n)return toast('Enter a name');const id='t'+(++st.n)+Date.now();st.teachers.push({id,name:n,sub:$('#ns').value.trim()||'—',grp:$('#ng').value,tt:grid('')});sel=id;save();R()}
 else if(D.del){if(confirm('Delete this teacher?')){st.teachers=st.teachers.filter(t=>t.id!==D.del);Object.keys(st.abs).forEach(day=>{st.abs[day]=st.abs[day].filter(id=>id!==D.del)});Object.keys(st.asg).forEach(day=>{Object.keys(st.asg[day]).forEach(k=>{if(k.startsWith(D.del+':')||st.asg[day][k]===D.del)delete st.asg[day][k]})});sel=null;save();R()}}
 else if('reset' in D){if(confirm('Reset to the original timetable data?')){st=fresh();save();R()}}});
document.addEventListener('change',e=>{const s=e.target;
 if(s.dataset.k){if(s.value)asg()[s.dataset.k]=s.value;else delete asg()[s.dataset.k];save();R()}
 else if(s.dataset.periodLabel!==undefined){const i=+s.dataset.periodLabel,value=s.value.trim();if(!value){s.value=st.periods[i].label;return toast('Period name cannot be empty')}st.periods[i].label=value;save();R()}
 else if(s.dataset.period!==undefined){const i=+s.dataset.period,part=s.dataset.part,value=s.value,period=st.periods[i];if(!value){s.value=period[part];return toast('Enter a period time')}const start=part==='start'?value:period.start,end=part==='end'?value:period.end;if(start>=end){s.value=period[part];return toast('End time must be later than start time')}period[part]=value;save();R()}
 else if(s.id==='edit-name'){const value=s.value.trim();if(value){T(sel).name=value;save();R()}else{s.value=T(sel).name;toast('Name cannot be empty')}}
 else if(s.id==='edit-sub'){T(sel).sub=s.value.trim()||'—';save();R()}
 else if(s.id==='edit-grp'){T(sel).grp=s.value;save();R()}
 else if(s.dataset.d!==undefined){T(sel).tt[+s.dataset.d][+s.dataset.p]=norm(s.value);save();R()}});
document.addEventListener('input',e=>{if(e.target.id==='q'){q=e.target.value;R()}});
document.addEventListener('toggle',e=>{if(e.target.matches('details.period-settings'))periodSettingsOpen=e.target.open},true);
$('#date').value=date;$('#date').addEventListener('change',e=>{date=e.target.value||iso();R()});
async function init(){
 setSaveStatus('Connecting to Supabase…','saving');
 try{
  const response=await fetch('/api/state');
  if(!response.ok)throw new Error(`Server returned ${response.status}`);
  const {state}=await response.json();
  if(state)st=state;
  else await persist(st);
  apiReady=true;
  lastSavedRevision=saveRevision;
  setSaveStatus('Saved to Supabase','saved');
  localStorage.setItem(KEY,JSON.stringify(st));
 }catch(e){
  apiReady=false;
  setSaveStatus('Offline · saved on this device','error');
  toast('Supabase unavailable. Changes are only saved in this browser.');
 }
 R();
}
init();
