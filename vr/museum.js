import * as THREE from '../vendor/three.module.js';
import {nativePlates} from './native-plates.js';
import {createJourneyScene,HALL_STEP,STATIONS,stationZ,elapsedSeconds,chronologicalWing,timeSinceBigBang} from './journey-scene.js';
import {createImagery,creditLine} from './imagery.js';
const $=s=>document.querySelector(s);
const WINGS=[
  {key:'cosmic',name:'The Cosmos',roman:'Ⅰ'},
  {key:'bio',name:'The Living Earth',roman:'Ⅱ'},
  {key:'sapiens',name:'The Globe of Human Time',roman:'Ⅲ'}
];
// Hall III is a room and the salon beyond it is a fourth space, so which room
// the visitor stands in is read from the doorways rather than from hall pitch.
const GLOBE_ROOM=2,FINALE=3;
const roomAt=z=>z>-76?0:z>-164?1:z>-200?GLOBE_ROOM:FINALE;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),clock=new THREE.Clock();
const pickables=[],panels=[],controllers=[],keys=new Set(),visited=new Set();
const pages=[0,0,0],records=[];
let renderer,scene,camera,rig,journey,events=[],started=false,currentWing=0,drag=null,activeStory=null,storyPage=0;
let storyGroup,storyTargets=[],turnLatched=false,ready=false,lastWing=-1,teleportMarker;
let menuGroup=null,menuTargets=[],menuLatched=false;
let currentRoom=0,globe=null,railBusy=false,storyArt=false,storyPhoto=false;
let imagery=createImagery(),listening=false,voiceMissing=false,reflectiveMaterials=0;
// Headset image quality. Sharp renders above the browser's default resolution
// with light foveation; if the headset cannot hold its frame rate it falls
// back to the default for the rest of the visit and remembers that.
const QUALITY_KEY='hallways-xr-quality',SHARP={scale:1.2,foveation:.35},SMOOTH={scale:1,foveation:1};
let xrQuality={...SHARP,sharp:true,reduced:false,slowFrames:0,frames:0,windowStart:0};
try{if(JSON.parse(localStorage.getItem(QUALITY_KEY)||'null')?.sharp===false)xrQuality={...xrQuality,...SMOOTH,sharp:false};}catch{}
function setSharpXR(sharp,{remember=true,reduced=false}={}){
  Object.assign(xrQuality,sharp?SHARP:SMOOTH,{sharp,reduced});
  if(renderer?.xr.isPresenting)renderer.xr.setFoveation(xrQuality.foveation);
  if(remember)try{localStorage.setItem(QUALITY_KEY,JSON.stringify({sharp}));}catch{}
  const box=document.querySelector('#sharp-xr');if(box)box.checked=sharp;
  const note=document.querySelector('#sharp-note');if(note)note.hidden=!reduced;
  if(menuGroup)drawMenu();
}
/** A still, softly lit gallery for reflections: warm walls, bright windows, chandeliers overhead. */
function galleryEnvironment(){
  const env=new THREE.Scene(),shell=new THREE.SphereGeometry(40,48,24),colour=new THREE.Color(),colours=[];
  const floor=new THREE.Color('#8f8676'),wall=new THREE.Color('#efe5d1'),ceiling=new THREE.Color('#fff6e6');
  for(let i=0;i<shell.attributes.position.count;i++){
    const t=shell.attributes.position.getY(i)/40;
    if(t<0)colour.copy(wall).lerp(floor,Math.min(1,-t*2.4));else colour.copy(wall).lerp(ceiling,t);
    colours.push(colour.r,colour.g,colour.b);
  }
  shell.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
  env.add(new THREE.Mesh(shell,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
  const window_=new THREE.MeshBasicMaterial({color:new THREE.Color(2.3,2.4,2.5)}),warm=new THREE.MeshBasicMaterial({color:new THREE.Color(3.2,2.5,1.5)});
  for(const side of [-1,1])for(const z of [-24,-8,8,24]){const pane=new THREE.Mesh(new THREE.PlaneGeometry(7,10),window_);pane.position.set(side*30,4,z);pane.lookAt(0,4,z);env.add(pane);}
  for(const z of [-16,0,16]){const lamp=new THREE.Mesh(new THREE.SphereGeometry(1.6,16,8),warm);lamp.position.set(0,22,z);env.add(lamp);}
  const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(env,.03);
  pmrem.dispose();env.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
  return target.texture;
}
const photoAsked=new Set();
let frameCounter=0,elapsed=0,focusedIndex=-1;
/**
 * How the visitor moves and what moves around them. One store answers both
 * menus — the dialog on screen and the panel inside the headset — so a choice
 * made in either shows in the other, and is remembered on this device.
 *
 * The opening display and the moving sculpture are stilled separately; a
 * system request for reduced motion stills both.
 */
const SETTINGS_KEY='hallways-settings';
const SPEEDS=[{id:'slow',label:'Slow',walk:1.0,rise:.9,turn:1.4},
  {id:'steady',label:'Steady',walk:1.7,rise:1.4,turn:2.1},
  {id:'brisk',label:'Brisk',walk:2.6,rise:2.1,turn:2.8}];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const comfort={speed:'steady',smoothTurn:false,gentle:reducedMotion,stillSculpture:reducedMotion};
try{
  const saved=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null');
  if(saved){
    if(SPEEDS.some(s=>s.id===saved.speed))comfort.speed=saved.speed;
    if(typeof saved.smoothTurn==='boolean')comfort.smoothTurn=saved.smoothTurn;
    if(!reducedMotion){
      if(typeof saved.gentle==='boolean')comfort.gentle=saved.gentle;
      if(typeof saved.stillSculpture==='boolean')comfort.stillSculpture=saved.stillSculpture;
    }
  }
}catch{}
const pace=()=>SPEEDS.find(s=>s.id===comfort.speed)||SPEEDS[1];
function rememberComfort(){
  try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(comfort));}catch{}
}
/** Apply a change from either menu: remember it, and redraw both. */
function setComfort(change){
  Object.assign(comfort,change);
  rememberComfort();
  syncSettingsDialog();
  if(menuGroup)drawMenu();
}
function syncSettingsDialog(){
  const box=id=>document.querySelector(id);
  if(box('#gentle'))box('#gentle').checked=comfort.gentle;
  if(box('#still-sculpture'))box('#still-sculpture').checked=comfort.stillSculpture;
  if(box('#smooth-turn'))box('#smooth-turn').checked=comfort.smoothTurn;
  const speed=box('#speed-'+comfort.speed);if(speed)speed.checked=true;
}
const direction=new THREE.Vector3(),head=new THREE.Vector3(),temp=new THREE.Vector3(),rotation=new THREE.Quaternion();
const viewPose={position:new THREE.Vector3(),quaternion:new THREE.Quaternion()},grip=new THREE.Quaternion(),spinAxis=new THREE.Vector3();
const assetURL=e=>new URL(e.art,location.href).href;
/**
 * The date line for an entry: its own date, and how long after the Big Bang
 * that was — unless the date is already counted from the origin, in which case
 * the two are the same sentence and only one is shown.
 */
function dateLine(e){
  if(!Number.isFinite(e.yearsAgo))return e.date;
  if(/after the Big Bang$/.test(e.date))return e.date;
  return `${e.date} · ${timeSinceBigBang(e)} after the Big Bang`;
}
const plates=new Map();
/** The illustration for an exhibit, once decoded; redraws the panel on arrival. */
function storyPlate(event){
  if(!event?.art)return null;
  const url=assetURL(event);
  const held=plates.get(url);
  if(held)return held.complete&&held.naturalWidth?held:null;
  const image=new Image();
  plates.set(url,image);
  image.onload=()=>{if(storyGroup&&activeStory?.art&&assetURL(activeStory)===url)drawStory();};
  image.src=url;
  return null;
}
/** The best picture ready for a story: the photograph once it has loaded, else the illustration. */
function storyPicture(event){
  if(!event?.art)return null;
  const photo=imagery.ready(event);
  if(photo)return {image:photo,photo:true,credit:imagery.credit(event)};
  if(!photoAsked.has(event.id)){photoAsked.add(event.id);imagery.photo(event).then(found=>{if(found&&storyGroup&&activeStory===event)drawStory();});}
  const plate=storyPlate(event);
  return plate?{image:plate,photo:false}:null;
}
/** Read the open story aloud in the headset, or stop. Says so if this browser has no voice. */
function listen(){
  if(voiceMissing)return;
  if(!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined'){voiceMissing=true;drawStory();return;}
  if(listening){speechSynthesis.cancel();listening=false;drawStory();return;}
  const e=activeStory;
  const utterance=new SpeechSynthesisUtterance(`${e.title}. ${e.detail}${e.evidence?` How we know: ${e.evidence}`:''}`);
  utterance.rate=.92;
  let started=false;
  utterance.onstart=()=>{started=true;};
  utterance.onend=utterance.onerror=()=>{if(listening&&activeStory===e){listening=false;if(storyGroup)drawStory();}};
  speechSynthesis.cancel();speechSynthesis.speak(utterance);listening=true;drawStory();
  // A browser with the speech API but no installed voice never starts speaking.
  setTimeout(()=>{if(listening&&activeStory===e&&!started&&!speechSynthesis.speaking){listening=false;voiceMissing=true;speechSynthesis.cancel();if(storyGroup)drawStory();}},3000);
}
function material(color,extra={}) {return new THREE.MeshStandardMaterial({color,roughness:.82,...extra});}
function box(parent,size,pos,mat) {const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);parent.add(m);return m;}
function textTexture(lines,{width=1024,height=512,bg='#20271f',color='#eddfc4',size=48,align='center'}={}) {
  const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');
  ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';
  const arr=Array.isArray(lines)?lines:[lines];const lineHeight=size*1.4;
  arr.forEach((line,i)=>{ctx.font=`${i===0?'':'italic '}${size}px Georgia`;ctx.fillText(line,align==='left'?50:width/2,(height-(arr.length-1)*lineHeight)/2+i*lineHeight,width-80);});
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function plane(parent,w,h,pos,texture,ry=0) {
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
  m.position.set(...pos);m.rotation.y=ry;parent.add(m);return m;
}
function wrapped(ctx,text,width) {
  const out=[];let line='';
  for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>width && line){out.push(line);line=word;}else line=next;}
  if(line)out.push(line);return out;
}
function setSmoothTurn(value){setComfort({smoothTurn:value});}
function selected(wi){return records[wi].slice(pages[wi]*STATIONS,pages[wi]*STATIONS+STATIONS);}
function collectionState(wi){return {page:pages[wi],pageCount:Math.ceil(records[wi].length/STATIONS),total:records[wi].length,start:pages[wi]*STATIONS+1,end:Math.min((pages[wi]+1)*STATIONS,records[wi].length)};}
function refreshExhibits(wi){journey.refresh(wi,selected(wi),collectionState(wi));updateUI();}
function showGuide(){
  if(!renderer.xr.isPresenting){$('#guide').showModal();return;}
  activeStory={id:'museum-guide',title:'Follow the thread of time.',date:'YOUR JOURNEY',detail:'Begin beside the cosmic expansion. Follow the single sequence of central plinths, from the earliest moments toward the present. Aim a controller at a plinth and press its trigger to read. Aim at the floor to teleport. Doors open when you approach them.',evidence:'Push the right thumbstick to walk. The left thumbstick turns the view in 30-degree steps, or smoothly if you choose that in the Guide. Hold Y on the left controller to rise and X to descend; teleporting to the floor brings you back down. The opening is an artistic visualization of expansion, and exhibit spacing is chronological rather than proportional. All 495 entries are included, in chapters of up to 12. Use NEXT CHAPTER at the desks at either end of a hall to continue in chronological order. The chapter signs show your progress. Doors lead directly to the next hall.',facts:[['Comfort','Use the Guide on screen to select a still cosmic display.']]};storyPage=0;drawStory();
}
function placeVisitor(x,z,yaw=0){
  rig.position.y=0;rig.rotation.y=yaw;camera.rotation.set(0,0,0);rig.updateMatrixWorld(true);getCamera().getWorldPosition(head);
  rig.position.x+=x-head.x;rig.position.z+=z-head.z;rig.updateMatrixWorld(true);
}
// Off the plinth's corner, turned to look at its board.
const STAND={x:2.15,z:2.15};
function faceExhibit(wing,index){
  placeVisitor(STAND.x,stationZ(wing,index)+STAND.z,Math.atan2(STAND.x,STAND.z));
}
function resetOpeningChapter(){if(pages[0]!==0){pages[0]=0;refreshExhibits(0);}}
function beginJourney(){resetOpeningChapter();startTour();focusedIndex=-1;placeVisitor(2.6,2,0);currentWing=currentRoom=lastWing=0;updateUI();}
function goOrigin(){closeStory();resetOpeningChapter();startTour();focusedIndex=-1;placeVisitor(0,4,Math.PI);currentWing=currentRoom=lastWing=0;journey.origin.restart();updateUI();}
function continueHall(){
  if(currentRoom===FINALE){goOrigin();return;}
  const d=journey.getLayout().doorways[currentRoom];closeStory();journey.openDoor(currentRoom);placeVisitor(2.35,d.z+3,0);
}
function nextMoment(delta=1){
  startTour();closeStory();
  // In the globe room a moment is a position on the rail, not a plinth.
  if(currentRoom===GLOBE_ROOM){globe.step(delta);updateUI();return;}
  focusedIndex+=delta;
  if(focusedIndex<0){
    if(pages[currentWing]>0){changePage(currentWing,-1);focusedIndex=selected(currentWing).length-1;}
    else if(currentWing>0){const wi=currentWing-1;pages[wi]=Math.ceil(records[wi].length/STATIONS)-1;refreshExhibits(wi);enterWing(wi);focusedIndex=selected(wi).length-1;}
    else{goOrigin();return;}
  }
  if(focusedIndex>=selected(currentWing).length){
    if(pages[currentWing]<Math.ceil(records[currentWing].length/STATIONS)-1){changePage(currentWing,1);focusedIndex=0;}
    else{focusedIndex=selected(currentWing).length-1;continueHall();return;}
  }
  faceExhibit(currentWing,focusedIndex);updateUI();
}
function changePage(wi,delta){
  const next=pages[wi]+delta,count=Math.ceil(records[wi].length/STATIONS);
  if(next<0||next>=count)return;
  pages[wi]=next;refreshExhibits(wi);enterWing(wi);
}
function getCamera(){return camera;}
function validPosition(x,z,fromZ,headY){return journey.validPosition(x,z,fromZ,headY);}
function teleport(x,z){
  getCamera().getWorldPosition(head);if(!journey.validPosition(x,z,head.z))return;
  rig.position.x+=x-head.x;rig.position.z+=z-head.z;rig.position.y=0;
}
function enterWing(wi){
  closeStory();startTour();focusedIndex=-1;journey.resetDoorsThrough(wi);
  if(wi===GLOBE_ROOM)placeVisitor(0,-166.8,0);else placeVisitor(2.6,2-wi*HALL_STEP,0);
  currentWing=wi;currentRoom=lastWing=wi;updateUI();
}
function startTour(){started=true;document.body.classList.add('touring');$('#tour-ui').hidden=false;}
function updateUI(){
  if(!records[currentWing])return;
  const wing=WINGS[currentWing],finale=currentRoom===FINALE,inGlobe=currentRoom===GLOBE_ROOM;
  const collection=collectionState(currentWing);
  $('#wing-number').textContent=finale?'THE FINALE':'GALLERY '+wing.roman;
  $('#wing-title').textContent=finale?'The Unwritten Future':wing.name;
  $('#exhibit-count').textContent=finale?'Mathematics · Art · Architecture · Possibility'
    :inGlobe?`${globe.info.total} moments · ${globe.info.placed} placed on the Earth · ${globe.info.total-globe.info.placed} worldwide`
    :`Chapter ${collection.page+1} of ${collection.pageCount} · Entries ${collection.start}–${collection.end} of ${collection.total}`;
  $('#chapter-previous').disabled=collection.page===0;$('#chapter-next').disabled=collection.page===collection.pageCount-1;
  $('#chapter-status').textContent=inGlobe?'300,000 YEARS · ONE SPECIES':`${events.length} entries · Complete collection`;
  $('.chapter-controls').hidden=finale||inGlobe;
  $('#previous').hidden=finale;$('#next').hidden=finale;
  $('#previous').textContent=inGlobe?'← Earlier moment':'← Previous moment';
  $('#next').textContent=inGlobe?'Later moment →':'Next moment →';
  $('#next-hall').textContent=finale?'Return to the beginning':inGlobe?'Continue to the finale ↗':'Continue to next hall ↗';
  document.body.classList.toggle('globe-room',inGlobe);
  $('#globe-ui').hidden=!inGlobe;
  if(inGlobe)updateGlobeUI();
  document.querySelectorAll('[data-wing]').forEach(b=>b.setAttribute('aria-pressed',String(!finale&&Number(b.dataset.wing)===currentRoom)));
}
const RAIL_STEPS=10000;
function buildGlobeUI(){
  const axis=globe.axis;
  $('#globe-eras').replaceChildren(...axis.eras.map((era,index)=>{
    const b=document.createElement('button');
    b.type='button';b.dataset.era=String(index);b.title=`${era.span} · ${era.count} moments`;
    b.append(Object.assign(document.createElement('b'),{textContent:era.name}),
             Object.assign(document.createElement('i'),{textContent:era.span}));
    b.onclick=()=>{globe.setEra(index);updateGlobeUI();};
    return b;
  }));
  $('#rail-dots').replaceChildren(...axis.entries.map(entry=>{
    const dot=document.createElement('u');dot.dataset.id=entry.event.id;return dot;
  }));
  $('#rail').max=String(RAIL_STEPS);
  $('#rail').oninput=e=>{const {viewLo,viewHi}=globe.info;globe.setCursorTo(viewLo+(viewHi-viewLo)*e.target.value/RAIL_STEPS);};
  $('#rail').onpointerdown=()=>{railBusy=true;globe.stop();};
  $('#rail').onpointerup=$('#rail').onpointercancel=()=>{railBusy=false;};
  addEventListener('pointerup',()=>{railBusy=false;});
  $('#globe-rewind').onclick=()=>{globe.play(-1);updateGlobeUI();};
  $('#globe-hold').onclick=()=>{globe.stop();updateGlobeUI();};
  $('#globe-play').onclick=()=>{globe.play(1);updateGlobeUI();};
  $('#globe-speed').onclick=()=>{const order=[.5,1,2,4,8];globe.setSpeed(order[(order.indexOf(globe.info.speed)+1)%order.length]);updateGlobeUI();};
  $('#globe-follow').onclick=()=>{globe.setFollow(!globe.info.follow);updateGlobeUI();};
  $('#globe-upright').onclick=()=>{globe.resetView();updateGlobeUI();};
  $('#globe-read').onclick=()=>globe.read();
  paintRailBands();
}
function paintRailBands(){
  const axis=globe.axis,{viewLo,viewHi}=globe.info,span=Math.max(viewHi-viewLo,1e-6);
  $('#rail-bands').replaceChildren(...axis.bands.map(band=>{
    const {lo,hi}=axis.bandSpan(band);
    if(hi<viewLo||lo>viewHi)return null;
    const left=Math.max(0,(lo-viewLo)/span),right=Math.min(1,(hi-viewLo)/span);
    const i=document.createElement('i');
    i.style.left=(left*100).toFixed(3)+'%';i.style.width=((right-left)*100).toFixed(3)+'%';
    i.style.background=band.color;i.title=band.label;
    return i;
  }).filter(Boolean));
  for(const dot of $('#rail-dots').children){
    const entry=axis.byId.get(dot.dataset.id);
    const inside=entry.u>=viewLo-1e-9&&entry.u<=viewHi+1e-9;
    dot.hidden=!inside;
    if(inside)dot.style.left=((entry.u-viewLo)/span*100).toFixed(3)+'%';
  }
}
let railEra=-1;
function updateGlobeUI(){
  if(!globe||$('#globe-ui').hidden)return;
  const info=globe.info,axis=globe.axis,span=Math.max(info.viewHi-info.viewLo,1e-6);
  if(railEra!==info.era){railEra=info.era;paintRailBands();}
  const at=(info.cursor-info.viewLo)/span;
  if(!railBusy)$('#rail').value=String(Math.round(at*RAIL_STEPS));
  const reach=Math.min(axis.windowHalf(info.viewLo,info.viewHi),span/2)/span;
  $('#rail-window').style.left=(Math.max(0,at-reach)*100).toFixed(2)+'%';
  $('#rail-window').style.width=(Math.min(1,at+reach)-Math.max(0,at-reach))*100+'%';
  $('#globe-band').textContent=info.band.label.toUpperCase();
  $('#globe-band').style.color=info.band.color;
  $('#globe-date').textContent=info.label;
  $('#globe-live').textContent=info.active
    ?`${info.live.length} in view · ${info.active.title}`
    :`${info.live.length} of ${info.total} moments in view`;
  $('#globe-speed').textContent='Speed ×'+info.speed;
  $('#globe-follow').textContent='Follow: '+(info.follow?'on':'off');
  $('#globe-follow').setAttribute('aria-pressed',String(info.follow));
  for(const b of [['#globe-rewind',info.playing<0],['#globe-play',info.playing>0],['#globe-hold',!info.playing]])
    $(b[0]).classList.toggle('on',b[1]);
  for(const b of $('#globe-eras').children)b.setAttribute('aria-pressed',String(Number(b.dataset.era)===info.era));
  for(const dot of $('#rail-dots').children){
    const entry=axis.byId.get(dot.dataset.id);
    const state=info.live.includes(entry.event)?'live':entry.u<=info.cursor?'past':'';
    if(dot.className!==state)dot.className=state;
  }
}
function showEvent(e){
  if(!e)return;visited.add(e.id);activeStory=e;storyPage=0;
  if(renderer.xr.isPresenting){drawStory();return;}
  $('#story-title').textContent=e.title;$('#story-date').textContent=dateLine(e);$('#story-art').src=assetURL(e);$('#story-art').alt='Schematic illustration: '+e.title;$('#story-credit').replaceChildren();
  imagery.photo(e).then(found=>{if(!found||activeStory!==e)return;$('#story-art').src=found.url;$('#story-art').alt='Photograph: '+e.title;showCredit($('#story-credit'),found.credit);});
  $('#story-detail').textContent=e.detail;$('#story-evidence').textContent=e.evidence || 'No evidence note is supplied for this event.';
  $('#story-facts').replaceChildren();
  for(const [key,value] of e.facts||[]){const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;div.append(dt,dd);$('#story-facts').append(div);}
  $('#story').showModal();
}
/** Picture: author · licence · source, with the file page and licence linked. */
function showCredit(target,credit){
  const link=(href,text)=>{const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=text;return a;};
  target.replaceChildren('Picture: ',link(credit.page,credit.artist),' · ',credit.licenseUrl?link(credit.licenseUrl,credit.license):credit.license,
    ' · ',link(credit.page,credit.host==='enwiki'?'English Wikipedia':'Wikimedia Commons'));
}
function disposeGroup(group){
  group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});group.removeFromParent();
}
function closeStory(){
  if(storyGroup){disposeGroup(storyGroup);storyGroup=null;storyTargets=[];}
  if($('#story').open)$('#story').close();activeStory=null;listening=false;window.speechSynthesis?.cancel();$('#narrate').textContent='Read aloud';
}
/**
 * Where a panel hangs: an arm's length in front of the visitor, at eye height.
 * On the first frame of an immersive session the headset pose has not reached
 * the camera yet, so a standing eye height above the floor is used instead —
 * otherwise a panel opened that instant would lie at the visitor's feet.
 */
function panelAt(group,distance){
  const cam=getCamera();cam.getWorldPosition(head);cam.getWorldDirection(direction);
  const eye=renderer.xr.isPresenting&&Math.abs(head.y-rig.position.y)<.2?rig.position.y+1.6:head.y;
  direction.y=0;direction.normalize();
  group.position.copy(head).addScaledVector(direction,distance);
  group.position.y=eye;
  group.rotation.y=Math.atan2(-direction.x,-direction.z);
}
/**
 * One page of an event's reading panel, painted. The headset's panel draws it,
 * and the native build keeps the same picture of each page, so both read the
 * same. Answers the canvas, the page it painted and how many pages there are.
 */
function paintStory(e,page,inset=false){
  const c=document.createElement('canvas');c.width=1800;c.height=1500;const ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';ctx.scale(1.5,1.5);ctx.fillStyle='#20271f';ctx.fillRect(0,0,1200,1000);
  ctx.strokeStyle='#9e8859';ctx.lineWidth=3;ctx.strokeRect(8,8,1184,984);ctx.fillStyle='#d9bc7d';ctx.font='26px Arial';ctx.fillText(dateLine(e),60,64,1080);
  ctx.fillStyle='#f1e5d0';ctx.font='44px Georgia';let y=130;for(const line of wrapped(ctx,e.title,1080)){ctx.fillText(line,60,y);y+=53;}
  const picture=storyPicture(e);
  const art=page===0&&!!picture,photo=art&&picture.photo;let hole=null;
  if(art){
    const plate=picture.image,room=picture.photo?340:300;
    const fit=Math.min(1080/plate.naturalWidth,room/plate.naturalHeight);
    const w=plate.naturalWidth*fit,h=plate.naturalHeight*fit,x=60+(1080-w)/2;
    ctx.fillStyle='#12160f';ctx.fillRect(x-8,y-8,w+16,h+16);
    // For the native build a photograph is left out of the page and handed over
    // apart, as a JPEG to lay over its place: lossless lettering, compact photographs.
    if(inset&&picture.photo)hole={x:x*1.5,y:y*1.5,w:w*1.5,h:h*1.5,image:plate};else ctx.drawImage(plate,x,y,w,h);
    ctx.strokeStyle='#6f6a4e';ctx.lineWidth=2;ctx.strokeRect(x-8,y-8,w+16,h+16);
    y+=h+30;
    if(picture.photo&&picture.credit){ctx.fillStyle='#b3a98c';ctx.font='20px Arial';ctx.fillText(creditLine(picture.credit),60,y-4,1080);y+=18;}
  }
  ctx.font='30px Georgia';
  const all=[...wrapped(ctx,e.detail,1080),'','HOW WE KNOW',...wrapped(ctx,e.evidence || 'No evidence note supplied.',1080),'',...wrapped(ctx,(e.facts||[]).map(f=>f.join(': ')).join(' · '),1080)];
  const perPage=Math.max(8,Math.floor((830-y)/43)),pageCount=Math.ceil(all.length/perPage);page=Math.min(page,pageCount-1);
  y+=30;for(const line of all.slice(page*perPage,(page+1)*perPage)){ctx.fillStyle=line==='HOW WE KNOW'?'#d9bc7d':'#f1e5d0';ctx.fillText(line,60,y);y+=43;}
  ctx.font='24px Arial';ctx.fillStyle='#d9bc7d';ctx.fillText(`PAGE ${page+1} / ${pageCount}    ·    ORIGINAL COLLECTION`,60,940);
  return {canvas:c,page,pageCount,art,photo,hole};
}
function drawStory(){
  const prior=storyGroup;
  storyGroup=new THREE.Group();
  if(prior){storyGroup.position.copy(prior.position);storyGroup.quaternion.copy(prior.quaternion);disposeGroup(prior);}
  else panelAt(storyGroup,1.65);
  scene.add(storyGroup);storyTargets=[];
  const e=activeStory,painted=paintStory(e,storyPage),pageCount=painted.pageCount;
  storyPage=painted.page;storyArt=painted.art;storyPhoto=painted.photo;
  const texture=new THREE.CanvasTexture(painted.canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const board=plane(storyGroup,1.8,1.5,[0,0,0],texture);board.userData.action=()=>{};storyTargets.push(board);
  const voice=voiceMissing?'NO VOICE':listening?'STOP':'LISTEN';
  const actions=[['← BACK',()=>{storyPage=Math.max(0,storyPage-1);drawStory();}],[voice,listen],['CLOSE',closeStory],['NEXT →',()=>{storyPage=Math.min(pageCount-1,storyPage+1);drawStory();}]];
  actions.forEach(([text,fn],i)=>{
    const tone=text==='STOP'?'#7a6530':text==='NO VOICE'?'#3a3f36':'#4b5640';
    const m=plane(storyGroup,.42,.14,[(i-1.5)*.46,-.85,.01],textTexture(text,{width:768,height:256,size:66,bg:tone,color:text==='NO VOICE'?'#9d9786':'#eddfc4'}));
    m.userData.action=fn;m.userData.label=text;storyTargets.push(m);
  });
}
/** The settings, as the headset shows them: a row for each, with its value. */
function menuRows(){
  return [
    {label:'Walking speed',value:pace().label,
      tap:()=>setComfort({speed:SPEEDS[(SPEEDS.findIndex(s=>s.id===comfort.speed)+1)%SPEEDS.length].id})},
    {label:'Turning',value:comfort.smoothTurn?'Smooth':'30° steps',tap:()=>setComfort({smoothTurn:!comfort.smoothTurn})},
    {label:'Opening display',value:comfort.gentle?'Still':'Moving',tap:()=>setComfort({gentle:!comfort.gentle})},
    {label:'Moving sculpture',value:comfort.stillSculpture?'Still':'Moving',tap:()=>setComfort({stillSculpture:!comfort.stillSculpture})},
    {label:'Headset image',value:xrQuality.sharp?'Sharpest':'Standard',
      tap:()=>{setSharpXR(!xrQuality.sharp);journey.setDetail?.(xrQuality.sharp?'sharp':'smooth');}}
  ];
}
// The panel's canvas and the board that carries it, so the planes that pick a
// row can be placed from the same numbers the row is drawn with.
const MENU={width:1.4,height:1.16,canvas:{w:1120,h:928,rowTop:196,rowStep:124,rowHeight:108,noteY:846}};
MENU.perPixel=MENU.height/MENU.canvas.h;
MENU.rowAt=i=>(MENU.canvas.h/2-(MENU.canvas.rowTop+MENU.canvas.rowHeight/2+i*MENU.canvas.rowStep))*MENU.perPixel;
MENU.noteAt=()=>(MENU.canvas.h/2-MENU.canvas.noteY)*MENU.perPixel;
/** One canvas for the whole panel; the rows are picked by invisible planes over it. */
function menuTexture(rows){
  const {w,h,rowTop,rowStep,rowHeight,noteY}=MENU.canvas;
  const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');
  ctx.fillStyle='#20271f';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#9e8859';ctx.lineWidth=3;ctx.strokeRect(8,8,w-16,h-16);
  ctx.fillStyle='#d9bc7d';ctx.font='26px Arial';ctx.fillText('HOW YOU MOVE',56,62);
  ctx.fillStyle='#f1e5d0';ctx.font='54px Georgia';ctx.fillText('Settings',56,132);
  rows.forEach((row,i)=>{
    const y=rowTop+i*rowStep;
    ctx.fillStyle=i%2?'#242c22':'#2a3327';ctx.fillRect(40,y,w-80,rowHeight);
    ctx.strokeStyle='#4b5640';ctx.lineWidth=2;ctx.strokeRect(40,y,w-80,rowHeight);
    ctx.fillStyle='#f1e5d0';ctx.font='36px Georgia';ctx.textAlign='left';ctx.fillText(row.label,72,y+rowHeight/2+12,620);
    ctx.fillStyle='#d9bc7d';ctx.font='36px Arial';ctx.textAlign='right';ctx.fillText(row.value,w-72,y+rowHeight/2+12,340);
    ctx.textAlign='left';
  });
  ctx.fillStyle='#9d9786';ctx.font='24px Arial';
  ctx.fillText('Point at a row and press the trigger to change it · B closes this menu',56,noteY+18,1000);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function closeMenu(){
  if(!menuGroup)return;
  disposeGroup(menuGroup);menuGroup=null;menuTargets=[];
}
function drawMenu(){
  const prior=menuGroup;
  menuGroup=new THREE.Group();
  if(prior){menuGroup.position.copy(prior.position);menuGroup.quaternion.copy(prior.quaternion);disposeGroup(prior);}
  else panelAt(menuGroup,1.5);
  scene.add(menuGroup);menuTargets=[];
  const rows=menuRows();
  const board=plane(menuGroup,MENU.width,MENU.height,[0,0,0],menuTexture(rows));
  board.userData.action=()=>{};menuTargets.push(board);
  // A pick plane over each row, and one over the note at the foot to close.
  rows.forEach((row,i)=>{
    const m=plane(menuGroup,MENU.width-.1,MENU.canvas.rowHeight*MENU.perPixel,[0,MENU.rowAt(i),.006],null);
    m.material.visible=false;m.userData.action=row.tap;m.userData.label=row.label;m.userData.value=row.value;
    menuTargets.push(m);
  });
  const close=plane(menuGroup,MENU.width-.1,.1,[0,MENU.noteAt(),.006],null);
  close.material.visible=false;close.userData.action=closeMenu;close.userData.label='Close settings';
  menuTargets.push(close);
}
function toggleMenu(){
  if(menuGroup){closeMenu();return;}
  closeStory();drawMenu();
}
function aimController(c){
  c.updateWorldMatrix(true,false);rotation.setFromRotationMatrix(c.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(c.matrixWorld);
  raycaster.ray.direction.set(0,0,-1).applyQuaternion(rotation);
  return hitFromRay();
}
function hitFromRay(){
  const list=menuGroup?menuTargets:storyGroup?storyTargets:pickables;
  return raycaster.intersectObjects(list,false).find(h=>{if(h.distance>=16)return false;for(let p=h.object;p;p=p.parent)if(!p.visible)return false;return true;});
}
function activate(hit){
  if(!hit)return;const obj=hit.object.userData.proxy || hit.object,data=obj.userData;
  if(data.action)data.action(hit);else if(data.event)showEvent(data.event);else if(data.floor)teleport(hit.point.x,hit.point.z);
}
function addControllers(){
  for(let i=0;i<2;i++){
    const c=renderer.xr.getController(i);rig.add(c);controllers.push(c);
    const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]);
    const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:'#e2c895'}));line.scale.z=8;c.add(line);c.userData.line=line;
    c.addEventListener('selectstart',()=>{
      if(storyGroup||c.userData.grab)return;
      const hit=aimController(c);if(!hit)return;
      const obj=hit.object.userData.proxy||hit.object;
      if(!globe?.dragKind(obj))return;
      c.userData.grab=hit;c.userData.moved=false;c.userData.grip=c.getWorldQuaternion(new THREE.Quaternion());
      globe.beginDrag(obj,{ray:raycaster.ray.clone(),grip:c.userData.grip});
      updateGlobeUI();
    });
    c.addEventListener('select',()=>{
      if(c.userData.grab)return;
      const hit=aimController(c);
      if(hit&&globe?.dragKind(hit.object.userData.proxy||hit.object))return;
      activate(hit);
    });
    c.addEventListener('selectend',()=>{
      const grabbed=c.userData.grab;
      if(!grabbed)return;
      delete c.userData.grab;delete c.userData.grip;
      globe?.endDrag();
      // Letting go without turning is a tap: read what was under the ray.
      if(!c.userData.moved)activate(grabbed);
      updateGlobeUI();
    });
    c.addEventListener('connected',event=>{c.userData.source=event.data;});c.addEventListener('disconnected',()=>{delete c.userData.source;});
    const grip=renderer.xr.getControllerGrip(i);rig.add(grip);
    const handle=new THREE.Mesh(new THREE.CylinderGeometry(.019,.024,.12,8),material('#c7c7b6'));handle.rotation.x=Math.PI/2;grip.add(handle);
  }
}
function move(dx,dz,dt){
  const cam=getCamera();cam.getWorldDirection(direction);direction.y=0;direction.normalize();const right=new THREE.Vector3(-direction.z,0,direction.x);
  temp.copy(direction).multiplyScalar(-dz).addScaledVector(right,dx);if(temp.length()>1)temp.normalize();temp.multiplyScalar(dt*pace().walk);
  cam.getWorldPosition(head);
  if(journey.validPosition(head.x+temp.x,head.z,head.z,head.y))rig.position.x+=temp.x;
  if(journey.validPosition(head.x,head.z+temp.z,head.z,head.y))rig.position.z+=temp.z;
}
/** Rise (+1) or descend (-1): never below the floor, and always half a metre under the vault. */
function rise(amount,dt){
  getCamera().getWorldPosition(head);
  const eye=head.y-rig.position.y,vault=7+5.7*Math.sqrt(Math.max(0,1-(head.x/9)**2));
  rig.position.y=THREE.MathUtils.clamp(rig.position.y+amount*dt*pace().rise,0,Math.max(0,vault-.5-eye));
}
/** Fall back to the default headset resolution if frames are being dropped for several seconds. */
function watchFrames(raw){
  const q=xrQuality,now=performance.now()/1000,budget=1/(renderer.xr.getSession()?.frameRate||72);
  if(!q.windowStart){q.windowStart=now+3;return;}          // let the first seconds of a session settle
  if(now<q.windowStart)return;
  q.frames++;if(raw>budget*1.6)q.slowFrames++;
  if(now-q.windowStart<4)return;
  if(q.slowFrames>q.frames*.15){setSharpXR(false,{reduced:true});journey.setDetail?.('smooth');}
  q.frames=q.slowFrames=0;q.windowStart=now;
}
function snap(angle){
  getCamera().getWorldPosition(head);const before=head.clone();rig.rotation.y+=angle;rig.updateMatrixWorld(true);getCamera().getWorldPosition(head);rig.position.x+=before.x-head.x;rig.position.z+=before.z-head.z;
}
function animate(){
  const raw=clock.getDelta(),dt=Math.min(raw,.05);frameCounter++;elapsed+=dt;
  if(renderer.xr.isPresenting&&xrQuality.sharp)watchFrames(raw);
  teleportMarker.visible=false;
  getCamera().getWorldPosition(head);
  if(started && !document.querySelector('dialog[open]')){
    if(renderer.xr.isPresenting){
      let turn=0;
      for(const source of renderer.xr.getSession().inputSources){
        const axes=source.gamepad?.axes;if(!axes)continue;const x=axes[2]??axes[0]??0,y=axes[3]??axes[1]??0;
        if(source.handedness==='left'){
          turn=x;
          // Left controller: Y rises, X descends (xr-standard buttons 5 and 4).
          const buttons=source.gamepad.buttons,lift=(buttons[5]?.pressed?1:0)-(buttons[4]?.pressed?1:0);
          if(lift&&!storyGroup&&!menuGroup)rise(lift,dt);
        }
        if(source.handedness==='right'){
          // B on the right controller opens and closes the settings panel.
          const pressed=!!source.gamepad.buttons[5]?.pressed;
          if(pressed&&!menuLatched)toggleMenu();
          menuLatched=pressed;
          if(!storyGroup&&!menuGroup)move(Math.abs(x)>.18?x:0,Math.abs(y)>.18?y:0,dt);
        }
      }
      if(comfort.smoothTurn){
        if(Math.abs(turn)>.18)snap(-turn*dt*pace().turn);
        turnLatched=false;
      }else{
        if(Math.abs(turn)>.65 && !turnLatched){snap(-Math.sign(turn)*Math.PI/6);turnLatched=true;}
        if(Math.abs(turn)<.3)turnLatched=false;
      }
      for(const c of controllers){
        if(!c.userData.source)continue;
        if(c.userData.grab){
          c.updateWorldMatrix(true,false);rotation.setFromRotationMatrix(c.matrixWorld);
          raycaster.ray.origin.setFromMatrixPosition(c.matrixWorld);raycaster.ray.direction.set(0,0,-1).applyQuaternion(rotation);
          c.getWorldQuaternion(grip);
          if(grip.angleTo(c.userData.grip)>.05)c.userData.moved=true;
          globe.moveDrag({ray:raycaster.ray,grip});
          c.userData.line.scale.z=3;c.userData.line.material.color.set('#ffe9ab');
          continue;
        }
        const hit=aimController(c);
        c.userData.line.scale.z=hit?.distance||8;c.userData.line.material.color.set(hit?'#9ce2b3':'#e2c895');
        if(hit?.object.userData.floor && validPosition(hit.point.x,hit.point.z,head.z)){teleportMarker.visible=true;teleportMarker.position.set(hit.point.x,.025,hit.point.z);}
      }
    }else{
      const x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),z=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);move(x,z,dt);
      const lift=(keys.has('t')?1:0)-(keys.has('h')?1:0);if(lift)rise(lift,dt);
    }
  }
  const view=getCamera();view.getWorldPosition(head);view.getWorldQuaternion(viewPose.quaternion);viewPose.position.copy(head);
  const room=roomAt(head.z);currentRoom=room;currentWing=Math.min(room,2);
  journey.update(dt,elapsed,head,comfort.gentle,viewPose,comfort.stillSculpture);
  if(room!==lastWing){lastWing=room;focusedIndex=-1;updateUI();}
  else if(room===GLOBE_ROOM&&(frameCounter&3)===0)updateGlobeUI();
  renderer.render(scene,camera);
}
async function enterVR(){
  if(!ready)return;
  let session;
  try{
    if(!window.isSecureContext)throw new Error('Open the museum over HTTPS on your Quest to enter VR.');
    if(!navigator.xr || !await navigator.xr.isSessionSupported('immersive-vr'))throw new Error('Open this page in the Meta Quest browser to enter VR.');
    session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor'],optionalFeatures:['bounded-floor']});
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());closeStory();closeMenu();startTour();
    camera.position.set(0,0,0);camera.rotation.set(0,0,0);rig.rotation.y=Math.PI;rig.position.set(0,0,4);
    // The resolution is fixed when the session starts; foveation can still change within it.
    renderer.xr.setFramebufferScaleFactor(xrQuality.scale);renderer.xr.setFoveation(xrQuality.foveation);
    Object.assign(xrQuality,{slowFrames:0,frames:0,windowStart:0});
    await renderer.xr.setSession(session);
    session.addEventListener('end',()=>{closeStory();closeMenu();camera.position.set(0,1.65,0);camera.rotation.set(0,0,0);turnLatched=false;menuLatched=false;});
  }catch(err){if(session)await session.end().catch(()=>{});camera.position.set(0,1.65,0);$('#xr-status').textContent=err.message;$('#guide-status').textContent=err.message;}
}
function populateLibrary(){
  const q=$('#query').value.toLowerCase().trim(),list=events.filter(e=>(e.title+' '+e.detail+' '+e.date).toLowerCase().includes(q));
  list.sort((a,b)=>elapsedSeconds(a)-elapsedSeconds(b));
  $('#results-count').textContent=`${list.length} of ${events.length} entries · In chronological order`;$('#results').replaceChildren();
  for(const e of list){const b=document.createElement('button'),span=document.createElement('span'),small=document.createElement('small');span.textContent=e.title;small.textContent=e.date;b.append(span,small);b.onclick=()=>{
    $('#library').close();const wi=chronologicalWing(e);
    if(wi===GLOBE_ROOM){enterWing(GLOBE_ROOM);globe.focusEvent(e.id);updateUI();showEvent(e);return;}
    const index=records[wi].indexOf(e);pages[wi]=Math.floor(index/STATIONS);refreshExhibits(wi);enterWing(wi);focusedIndex=index%STATIONS;faceExhibit(wi,focusedIndex);updateUI();showEvent(e);
  };$('#results').append(b);}
}
function wireUI(){
  $('#explore').onclick=beginJourney;$('#enter-vr').onclick=enterVR;$('#vr-from-guide').onclick=enterVR;
  $('#help').onclick=showGuide;
  $('#origin').onclick=goOrigin;$('#next-hall').onclick=continueHall;
  $('#settings-open').onclick=()=>$('#settings').showModal();
  $('#gentle').onchange=e=>setComfort({gentle:e.target.checked});
  $('#still-sculpture').onchange=e=>setComfort({stillSculpture:e.target.checked});
  $('#smooth-turn').onchange=e=>setComfort({smoothTurn:e.target.checked});
  for(const speed of SPEEDS)$('#speed-'+speed.id).onchange=e=>{if(e.target.checked)setComfort({speed:speed.id});};
  syncSettingsDialog();
  document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  $('#story').addEventListener('close',()=>{window.speechSynthesis?.cancel();$('#narrate').textContent='Read aloud';});
  document.querySelectorAll('[data-wing]').forEach(b=>b.onclick=()=>enterWing(Number(b.dataset.wing)));
  $('#next').onclick=()=>nextMoment(1);$('#previous').onclick=()=>nextMoment(-1);
  $('#chapter-next').onclick=()=>changePage(currentWing,1);$('#chapter-previous').onclick=()=>changePage(currentWing,-1);
  $('#catalog').onclick=()=>{populateLibrary();$('#library').showModal();$('#query').focus();};$('#query').oninput=populateLibrary;
  $('#sharp-xr').checked=xrQuality.sharp;$('#sharp-xr').onchange=e=>{setSharpXR(e.target.checked);journey.setDetail?.(e.target.checked?'sharp':'smooth');if(menuGroup)drawMenu();};
  $('#narrate').disabled=!('speechSynthesis' in window);
  $('#narrate').onclick=()=>{if(speechSynthesis.speaking){speechSynthesis.cancel();$('#narrate').textContent='Read aloud';return;}const u=new SpeechSynthesisUtterance(activeStory.title+'. '+activeStory.detail);u.rate=.9;u.onend=()=>$('#narrate').textContent='Read aloud';u.onerror=u.onend;speechSynthesis.speak(u);$('#narrate').textContent='Stop reading';};
  const canvas=renderer.domElement;
  const aimAt=e=>{
    const r=canvas.getBoundingClientRect();
    pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    return raycaster.ray;
  };
  const aimPointer=e=>{aimAt(e);return hitFromRay();};
  canvas.addEventListener('pointerdown',e=>{
    if(!started)return;
    drag={x:e.clientX,y:e.clientY,total:0,time:e.timeStamp};
    canvas.setPointerCapture(e.pointerId);
    if(storyGroup||menuGroup)return;
    const hit=aimPointer(e);if(!hit)return;
    const obj=hit.object.userData.proxy||hit.object;
    if(globe?.dragKind(obj)){drag.globe=globe.beginDrag(obj,{ray:raycaster.ray.clone()});updateGlobeUI();}
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.total+=Math.abs(dx)+Math.abs(dy);
    drag.x=e.clientX;drag.y=e.clientY;
    if(drag.globe==='turn'){
      // The coast after release follows how fast the hand was moving, not how
      // far a single event happened to jump.
      const rate=1/Math.max((e.timeStamp-drag.time)/1000,1/120);drag.time=e.timeStamp;
      camera.getWorldDirection(direction);spinAxis.set(-direction.z,0,direction.x).normalize();
      globe.moveDrag({dx:dx*.0062,dy:dy*.0062,rate,axisRight:spinAxis});
      return;
    }
    if(drag.globe==='scrub'){globe.moveDrag({ray:aimAt(e)});updateGlobeUI();return;}
    rig.rotation.y-=dx*.003;camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x-dy*.003,-1.15,1.15);
  });
  canvas.addEventListener('pointerup',e=>{
    if(!drag)return;
    if(drag.globe){const tapped=drag.total<6;globe.endDrag();if(tapped)activate(aimPointer(e));updateGlobeUI();drag=null;return;}
    if(drag.total<6)activate(aimPointer(e));
    drag=null;
  });
  canvas.addEventListener('pointercancel',()=>{if(drag?.globe)globe.endDrag();drag=null;});
  window.addEventListener('keydown',e=>{
    if(/INPUT|TEXTAREA/.test(e.target.tagName)||document.querySelector('dialog[open]'))return;
    const k=e.key.toLowerCase();
    if(['w','a','s','d','t','h','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();keys.add(k);return;}
    if(currentRoom!==GLOBE_ROOM||!globe)return;
    if(k===','){e.preventDefault();globe.step(-1);updateGlobeUI();}
    if(k==='.'){e.preventDefault();globe.step(1);updateGlobeUI();}
    if(k===' '){e.preventDefault();globe.info.playing?globe.stop():globe.play(1);updateGlobeUI();}
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
  document.querySelectorAll('[data-move]').forEach(b=>{const key={left:'a',forward:'w',back:'s',right:'d'}[b.dataset.move];b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(key);};b.onpointerup=b.onpointercancel=()=>keys.delete(key);});
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
}
async function init(){
  try{
    renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.xr.setFramebufferScaleFactor(xrQuality.scale);renderer.xr.setFoveation(xrQuality.foveation);
    // Every texture made from here on is filtered as sharply as the device allows at an angle.
    THREE.Texture.DEFAULT_ANISOTROPY=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;$('#scene').append(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error').hidden=false;$('#error').textContent='The graphics session was interrupted. Reload this page to return to the museum.';});
    scene=new THREE.Scene();scene.background=new THREE.Color('#151b29');scene.fog=new THREE.Fog('#c5c4bb',65,150);
    camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.05,185);camera.position.set(0,1.65,0);camera.rotation.order='YXZ';rig=new THREE.Group();rig.position.set(0,0,4);rig.rotation.y=Math.PI;rig.add(camera);scene.add(rig);
    const response=await fetch('../data/events.json');if(!response.ok)throw new Error('The exhibit collection could not be loaded. Reload to try again.');events=await response.json();
    // The timeline's picture sources; without them every exhibit keeps its illustration.
    // Pictures pinned with their credits; without them every exhibit keeps its illustration.
    imagery=createImagery(await fetch('../data/image-credits.json').then(r=>r.ok?r.json():{}).then(data=>data.credits||{}).catch(()=>({})));
    for(let wi=0;wi<3;wi++)records.push(events.filter(e=>chronologicalWing(e)===wi).sort((a,b)=>elapsedSeconds(a)-elapsedSeconds(b)));
    journey=createJourneyScene(THREE,scene,{
      begin:beginJourney,origin:goOrigin,nextCollection:changePage,help:showGuide,
      turnStyle:()=>setSmoothTurn(!comfort.smoothTurn),
      exit:()=>{if(renderer.xr.isPresenting)renderer.xr.getSession().end();else location.href='../';},
      humanEvents:records[GLOBE_ROOM],read:showEvent,globeChange:()=>updateGlobeUI(),imagery
    });
    // Only metal takes the reflections: that is where they show, and it keeps the
    // per-pixel cost off the walls, floor and vault that fill most of the view.
    const reflections=galleryEnvironment();let reflective=0;
    scene.traverse(o=>{for(const m of [o.material].flat()){if(m?.isMeshStandardMaterial&&m.metalness>=.3&&!m.envMap){m.envMap=reflections;m.envMapIntensity=.85;m.needsUpdate=true;reflective++;}}});
    reflectiveMaterials=reflective;
    globe=journey.humanity;
    pickables.push(...journey.pickables);panels.push(...journey.panels);for(let wi=0;wi<3;wi++)refreshExhibits(wi);
    teleportMarker=new THREE.Mesh(new THREE.RingGeometry(.23,.28,36),new THREE.MeshBasicMaterial({color:'#adf2c2',side:THREE.DoubleSide}));teleportMarker.rotation.x=-Math.PI/2;teleportMarker.visible=false;scene.add(teleportMarker);
    addControllers();wireUI();buildGlobeUI();ready=true;
    $('#explore').disabled=false;$('#explore').textContent='Begin your journey   →';
    const supports=window.isSecureContext && navigator.xr && await navigator.xr.isSessionSupported('immersive-vr').catch(()=>false);
    $('#enter-vr').disabled=!supports;$('#enter-vr').textContent=supports?'Enter with Meta Quest':'Meta Quest VR';
    $('#xr-status').textContent=supports?'Your headset is ready. Step inside.':'Explore here, or open this museum over HTTPS in your Quest browser.';
    $('#guide-status').textContent=supports?'Your headset is ready.':'Immersive VR requires a headset browser and HTTPS.';
    renderer.setAnimationLoop(animate);
    // Meta treats launching the installed immersive PWA as the activation gesture.
    if(supports && window.getDigitalGoodsService!==undefined && new URLSearchParams(location.search).has('installed'))enterVR();
    if('serviceWorker' in navigator && window.isSecureContext)navigator.serviceWorker.register('../sw.js').catch(()=>{});
    window.museum={getLayout:()=>journey.getLayout(),nativePlates,
      // For the native build: a hall's stations as pictures, whether they have
      // all arrived, which plinth instances are whose, a chapter by number, and
      // every page of an event's reading panel once its picture is in.
      nativeStations:wi=>({...journey.stationFaces(wi),collection:collectionState(wi)}),
      stationsSettled:wi=>journey.stationsSettled(wi),
      nativeStationParts:()=>journey.stationParts(),
      setPage:(wi,p)=>{pages[wi]=Math.max(0,Math.min(p,Math.ceil(records[wi].length/STATIONS)-1));refreshExhibits(wi);},
      nativeStory:async id=>{
        const e=events.find(x=>x.id===id);if(!e)return [];
        await imagery.photo(e).catch(()=>null);
        for(let wait=0;wait<30&&!storyPicture(e);wait++)await new Promise(done=>setTimeout(done,100));
        const first=paintStory(e,0,true),pages=[first];
        for(let p=1;p<first.pageCount;p++)pages.push(paintStory(e,p,true));
        return pages.map(p=>{
          const png=p.canvas.toDataURL('image/png');
          if(!p.hole)return {png};
          const {x,y,w,h,image}=p.hole,c=document.createElement('canvas');c.width=Math.round(w);c.height=Math.round(h);
          const cx=c.getContext('2d');cx.imageSmoothingQuality='high';cx.drawImage(image,0,0,c.width,c.height);
          return {png,inset:{x:x/1800,y:y/1500,width:w/1800,height:h/1500,jpg:c.toDataURL('image/jpeg',.92)}};
        });
      },globe,getState:()=>({ready,started,currentWing,currentRoom,pages:[...pages],collections:records.map((_,wi)=>collectionState(wi)),eventCount:events.length,visibleExhibits:panels.flat().filter(p=>p.g.visible).length,position:rig.position.toArray(),yaw:rig.rotation.y,visited:[...visited],story:activeStory?.id,storyPage,storyInVR:!!storyGroup,storyArt,storyPhoto,storyListening:listening,storyVoiceMissing:voiceMissing,storyControls:storyTargets.filter(m=>m.userData.label).map(m=>({label:m.userData.label,target:m.getWorldPosition(new THREE.Vector3()).toArray()})),settings:{...comfort,walk:pace().walk,rise:pace().rise,turn:pace().turn,sharp:xrQuality.sharp,speeds:SPEEDS.map(s=>s.id)},menuInVR:!!menuGroup,menuControls:menuTargets.filter(m=>m.userData.label).map(m=>({label:m.userData.label,value:m.userData.value||null,target:m.getWorldPosition(new THREE.Vector3()).toArray()})),photos:imagery.getState(),quality:{sharp:xrQuality.sharp,reduced:xrQuality.reduced,scale:xrQuality.scale,foveation:xrQuality.foveation,pixelRatio:renderer.getPixelRatio(),anisotropy:THREE.Texture.DEFAULT_ANISOTROPY,environment:reflectiveMaterials>0,reflectiveMaterials},frames:frameCounter,focusedIndex,...journey.getState(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,xr:renderer.xr.isPresenting}),enterWing,goOrigin,nextMoment,openDoor:i=>journey.openDoor(i),showEvent:id=>showEvent(events.find(e=>e.id===id)),changePage,validPosition,roomAt,rise:(amount,seconds)=>rise(amount,seconds),menu:open=>{if(open&&!menuGroup)drawMenu();else if(!open)closeMenu();},setComfort,viewFrom:(x,z,yaw=0,pitch=0)=>{startTour();placeVisitor(x,z,yaw);camera.rotation.x=pitch;}}

  }catch(err){console.error(err);$('#error').hidden=false;$('#error').textContent='The museum could not start: '+err.message+' You can still explore the original timeline using the link above.';$('#explore').textContent='Museum unavailable';}
}
init();
