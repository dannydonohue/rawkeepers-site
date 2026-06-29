// Shared RAW Keepers UI logic - used by BOTH skins (Liquid Glass + Camera back).
// Both skins expose the SAME element ids; only the shell/CSS differ.

const glow = document.getElementById('glow');
if (glow) {
  let mx = innerWidth / 2, my = innerHeight / 2, gx = mx, gy = my;
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  (function loop(){ gx += (mx-gx)*0.09; gy += (my-gy)*0.09;
    glow.style.transform = `translate(${gx}px,${gy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop); })();
}

const state = {cull_src:"",cull_dst:"",edit_src:"",edit_dst:"",cull_amt:50,
  denoise:55,retouch:70,cull:true,straighten:true,vupright:false,autolight:true,
  hdr:false,sport:false,enhance:false,stage:false,pro:false,busy:false,activeKind:"edit"};

// --- subtle premium UI sounds (Web Audio, synthesised - no asset files, kept quiet) ---
let _actx=null;
function _audio(){try{if(!_actx)_actx=new (window.AudioContext||window.webkitAudioContext)();
  if(_actx.state==='suspended')_actx.resume();}catch(e){}return _actx;}
function _noise(dur,freq,q,gain,ftype){const a=_audio();if(!a)return;
  const n=Math.max(1,a.sampleRate*dur|0),b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
  const s=a.createBufferSource();s.buffer=b;
  const f=a.createBiquadFilter();f.type=ftype||'bandpass';f.frequency.value=freq;f.Q.value=q||1;
  const g=a.createGain(),t=a.currentTime;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(f);f.connect(g);g.connect(a.destination);s.start(t);s.stop(t+dur);}
function _tone(freq,dur,gain,otype){const a=_audio();if(!a)return;
  const o=a.createOscillator();o.type=otype||'sine';o.frequency.value=freq;
  const g=a.createGain(),t=a.currentTime;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur);}
function sndTick(){try{_noise(0.018,2800,7,0.05,'bandpass');}catch(e){}}                              // knob detent
function sndSwitch(){try{_tone(165,0.055,0.06,'triangle');_noise(0.016,3400,3,0.05,'highpass');}catch(e){}} // switch/key
function sndClick(){try{_noise(0.016,1700,5,0.075,'bandpass');}catch(e){}}                            // button press (louder)
document.addEventListener('pointerdown',function(e){
  const t=e.target.closest&&e.target.closest('.choose,.soft,.tab,.sbtn,.fbtn,.cbtn,.lbtn,.btn');
  if(t)sndClick();},true);

function setSlider(id,val){val=Math.max(0,Math.min(100,Math.round(val)));state[id]=val;
  const t=document.getElementById('t_'+id);if(!t)return;
  const f=t.querySelector('.fill');if(f)f.style.width=val+'%';
  const k=t.querySelector('.kb,.knob');if(k)k.style.left=val+'%';
  const p=document.getElementById('p_'+id);if(p)p.textContent=val;}
function bindSlider(id){const t=document.getElementById('t_'+id);if(!t)return;let drag=false;
  const set=e=>{const r=t.getBoundingClientRect();setSlider(id,(e.clientX-r.left)/r.width*100);};
  t.addEventListener('pointerdown',e=>{drag=true;t.setPointerCapture(e.pointerId);set(e);});
  t.addEventListener('pointermove',e=>{if(drag)set(e);});t.addEventListener('pointerup',()=>drag=false);}
bindSlider('denoise');bindSlider('retouch');setSlider('denoise',35);setSlider('retouch',70);

// cull-amount KNOB (the camera's mode dial): twist to select one of 5 options.
const CULL_OPTS=[{amt:5,lbl:'1 best / scene'},{amt:30,lbl:'fewer'},{amt:50,lbl:'balanced'},
                 {amt:75,lbl:'more'},{amt:100,lbl:'keep most'}];
const CULL_ANG=[-110,-55,0,55,110];
let cullIdx=2;
const knob=document.getElementById('knob'), knobDial=document.getElementById('knob_dial'),
      knobLbl=document.getElementById('knob_lbl');
let ticks=[];
if(knob){
  CULL_ANG.forEach(a=>{const t=document.createElement('i');t.className='tick';
    t.style.transform='rotate('+a+'deg) translateY(-54px)';knob.appendChild(t);});
  ticks=knob.querySelectorAll('.tick');
}
function setCull(i){i=Math.max(0,Math.min(4,i));cullIdx=i;state.cull_amt=CULL_OPTS[i].amt;
  if(knobDial)knobDial.style.transform='rotate('+CULL_ANG[i]+'deg)';
  if(knobLbl){knobLbl.textContent=CULL_OPTS[i].lbl;
    knobLbl.classList.add('pop');setTimeout(()=>knobLbl.classList.remove('pop'),170);}
  ticks.forEach((t,k)=>t.classList.toggle('on',k===i));
  sndTick();}
if(knob){
  let dragging=false;
  function twist(e){const r=knob.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;
    let d=Math.atan2(e.clientX-cx,-(e.clientY-cy))*180/Math.PI;d=Math.max(-110,Math.min(110,d));
    let best=0,bd=1e9;CULL_ANG.forEach((A,i)=>{const x=Math.abs(A-d);if(x<bd){bd=x;best=i;}});
    if(best!==cullIdx)setCull(best);}
  function onMove(e){if(dragging)twist(e);}
  function onUp(){dragging=false;document.removeEventListener('pointermove',onMove);document.removeEventListener('pointerup',onUp);}
  knob.addEventListener('pointerdown',e=>{dragging=true;twist(e);
    document.addEventListener('pointermove',onMove);document.addEventListener('pointerup',onUp);e.preventDefault();});
  knob.addEventListener('wheel',e=>{e.preventDefault();setCull(cullIdx+(e.deltaY>0?1:-1));},{passive:false});
  ticks.forEach((t,i)=>t.addEventListener('pointerdown',e=>{e.stopPropagation();setCull(i);}));
  setCull(2);
}

// hover tooltips: appear after the mouse rests on an element for ~1 second
const tip=document.createElement('div');tip.className='tip';document.body.appendChild(tip);
let tipTimer=null;
document.querySelectorAll('[data-tip]').forEach(el=>{
  el.addEventListener('mouseenter',()=>{tipTimer=setTimeout(()=>{
    tip.textContent=el.getAttribute('data-tip');
    const r=el.getBoundingClientRect();
    tip.style.left=Math.max(8,Math.min(innerWidth-266,r.left))+'px';
    tip.style.top=(r.bottom+8)+'px';tip.classList.add('show');},1000);});
  el.addEventListener('mouseleave',()=>{clearTimeout(tipTimer);tip.classList.remove('show');});
});

function selectivity(){return 1 - state.cull_amt/100;}
function tog(k){state[k]=!state[k];const el=document.getElementById('o_'+k);if(el)el.classList.toggle('on',state[k]);sndSwitch();}
async function upgrade(){
  if(window.pywebview&&window.pywebview.api&&window.pywebview.api.activate_pro){   // desktop app: enter a key
    var key=prompt('Enter your RAW Keepers Pro license key:');
    if(!key)return;
    try{ if(await window.pywebview.api.activate_pro(key)){state.pro=true;applyPlan();setStatus('Pro activated — RAW + Print + HDR unlocked.');}
         else setStatus('That license key was not recognised.'); }
    catch(e){ setStatus('Could not activate: '+e); }
  } else {                                                                          // website demo: go to pricing
    try{window.parent.location.hash='pricing';}catch(e){}
    try{setStatus('Pro unlocks saving untouched RAW / .DNG — $5.49/month.');}catch(e){}
  }
}
// Toggle the freemium (camera) skin between Free (RAW/Print locked) and Pro (unlocked).
function applyPlan(){
  var pb=document.getElementById('planbar'); if(!pb)return;   // only the freemium skin has a plan bar
  var pro=!!state.pro, pbe=document.getElementById('planbar_edit');
  var freeBar='<span><b>Free</b> version — JPG keepers</span><span class="up" onclick="upgrade()">Upgrade to Pro →</span>';
  var proBar='<span><b>Pro</b> · full version unlocked ✓</span><span class="up" style="background:#34d39a;color:#06281b;cursor:default">Pro</span>';
  pb.innerHTML=pro?proBar:freeBar; if(pbe)pbe.innerHTML=pro?proBar:freeBar;
  var braw=document.getElementById('b_raw');
  if(braw){ if(pro){braw.classList.remove('locked');braw.onclick=function(){run('dng');};braw.innerHTML='<b>Find Keepers · RAW</b>keep / .DNG';}
            else{braw.classList.add('locked');braw.onclick=function(){upgrade();};braw.innerHTML='<b>Find Keepers · RAW</b><span class="lock">🔒 Pro · $5.49/mo</span>';} }
  var bep=document.getElementById('b_edit_pro');
  if(bep){ if(pro){bep.classList.remove('locked');bep.onclick=function(){run('edit');};bep.innerHTML='<b>Edit All · Print + RAW</b>full-res';}
           else{bep.classList.add('locked');bep.onclick=function(){upgrade();};bep.innerHTML='<b>Edit All · Print + RAW</b><span class="lock">🔒 Pro · $5.49/mo</span>';} }
}
function toggleSettings(){const s=document.getElementById('settings'),d=document.getElementById('disc');
  if(s)s.classList.toggle('open');if(d)d.classList.toggle('open');}
async function switchSkin(){try{await window.pywebview.api.set_skin();}catch(e){}}

async function pick(which){const p=await window.pywebview.api.choose_folder();
  if(p){state[which]=p;const c=document.getElementById(which);c.textContent=p;c.classList.add('set');}}
function isCull(){return state.activeKind==='dng'||state.activeKind==='raw'||state.activeKind==='jpg';}
function setStatus(t){const e=document.getElementById(isCull()?'status_cull':'status_edit');if(e)e.textContent=t;}
function setProg(f){const e=document.getElementById(isCull()?'pbar_cull':'pbar_edit');if(e)e.style.width=(f*100)+'%';}
function setBusy(b){state.busy=b;
  ['b_jpg','b_edit'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.toggle('disabled',b);});
  const c=document.getElementById('b_cancel');if(c)c.style.display=b?'inline-flex':'none';}
async function cancelRun(){setStatus('Finishing the current photo, then stopping…');try{await window.pywebview.api.cancel();}catch(e){}}
function fmtTime(s){if(s<90)return s+' seconds';const m=s/60;return m<90?Math.round(m)+' minutes':(m/60).toFixed(1)+' hours';}

function folders(kind){return (kind==='dng'||kind==='raw'||kind==='jpg')?[state.cull_src,state.cull_dst]:[state.edit_src,state.edit_dst];}
async function run(kind){
  if(state.busy)return;
  state.activeKind=kind;
  const [src,dst]=folders(kind);
  if(!src){setStatus('Please choose the photos folder for this step.');return;}
  if(!dst){setStatus('Please choose where to save the results.');return;}
  setStatus('Finding the best shots…');
  const est=await window.pywebview.api.preflight(src,dst,kind,state.cull,selectivity(),state.hdr,state.sport);
  if(est.error){setStatus(est.error);return;}
  if((est.singles+est.brackets)===0){setStatus('No photos found in that folder.');return;}
  showModal(kind,est,dst);
}
function showModal(kind,est,dst){
  const title=kind==='raw'?'Find the Keepers · keep original RAW':kind==='dng'?'Find the Keepers · convert to DNG':kind==='jpg'?'Find the Keepers · save as JPG':'Edit All → Print + Phone';
  document.getElementById('m_title').textContent=title;
  const kept=state.cull?`Keeping the best ${est.singles} photo(s)${est.brackets?'  +  '+est.brackets+' HDR set(s)':''}${est.total_all?'   of '+est.total_all+' total':''}`:`Photos: ${est.singles}`;
  const freeTxt=est.free_gb!=null?`   (free on ${est.drive}: ${est.free_gb} GB)`:'';
  let body=`<div class="line"><span>${kept}</span></div>`+
    `<div class="line"><span>Estimated time</span><span>~${fmtTime(est.secs)}</span></div>`+
    `<div class="line"><span>Estimated space</span><span>~${est.need_gb} GB${freeTxt}</span></div>`;
  if(!est.enough)body+=`<div class="warn">Not enough free space on ${est.drive}. Choose a destination with more room.</div>`;
  document.getElementById('m_body').innerHTML=body;
  const go=document.getElementById('m_go');go.classList.toggle('disabled',!est.enough);
  go.onclick=()=>{closeModal();start(kind,dst);};
  document.getElementById('modal').classList.add('show');
}
function closeModal(){document.getElementById('modal').classList.remove('show');}
async function start(kind,dst){setBusy(true);setProg(0);setStatus('Starting…');
  await window.pywebview.api.start(kind,dst,{denoise:state.denoise/100,retouch:state.retouch/100,
    straighten:state.straighten,vupright:state.vupright,autolight:state.autolight,enhance:state.enhance,stage:state.stage,sport:state.sport});}

function prog(i,n,text){if(n>0)setProg(i/n);setStatus(text+(n>0?`   (${i}/${n})`:''));}
function preview(stage,name,url){
  const img=document.getElementById('thumb_img'),lbl=document.getElementById('thumb_lbl'),ph=document.getElementById('thumb_ph');
  if(!img)return;img.src=url;img.style.display='block';if(ph)ph.style.display='none';
  if(lbl){lbl.textContent=(stage==='edited'?'Edited':'Original');lbl.style.display='block';
    lbl.classList.toggle('edited',stage==='edited');}}
function done(msg,dst){setBusy(false);setProg(1);setStatus(msg);}

async function tickUsage(){try{const u=await window.pywebview.api.usage();
  const set=(m,v,val)=>{const a=document.getElementById(m),b=document.getElementById(v);
    if(a)a.style.width=val+'%';if(b)b.textContent=val+'%';};
  set('m_cpu','v_cpu',u.cpu);set('m_ram','v_ram',u.ram);set('m_gpu','v_gpu',u.gpu);
}catch(e){}setTimeout(tickUsage,1000);}
function setBrand(which,vendor){const map={intel:'logo_intel.png',amd:'logo_amd.png',nvidia:'logo_nvidia.png'};
  const img=document.getElementById(which+'_logo'),lbl=document.getElementById(which+'_lbl');
  if(img&&map[vendor]){img.src=map[vendor];img.style.display='inline-block';if(lbl)lbl.style.display='none';}}
window.addEventListener('pywebviewready',async()=>{
  try{const s=document.getElementById('specs');if(s)s.textContent=await window.pywebview.api.sysinfo();}catch(e){}
  try{const v=await window.pywebview.api.vendors();setBrand('cpu',v.cpu);setBrand('gpu',v.gpu);
    if(v.mem==='unified'){const r=document.getElementById('ram_lbl');if(r)r.textContent='Unified';}}catch(e){}
  try{state.pro=await window.pywebview.api.pro_status();}catch(e){}
  applyPlan();
  tickUsage();
});
applyPlan();   // initial render (Free until pro_status confirms Pro)
