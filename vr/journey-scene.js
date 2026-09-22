import {createGrandArchitecture} from './grand-hall.js';
import {createOriginEffect} from './origin.js';
import {createHumanityGlobe} from './humanity-globe.js';
import {createFutureGallery} from './future-gallery.js';
import {createSculptureGallery} from './sculptures.js';
import {TEXTURE_CAP, TEXTURE_SCALE} from './detail.js';

export const HALL_STEP=88;
// Exhibit board: 1.76 m tall, 0.09 m thick, inclined 36 degrees, standing on
// the plinth's gold cap (top at 0.86 m) so nothing of the plinth crosses it.
const BOARD_TILT=Math.PI/5,CAP_TOP=.86;
const BOARD_Y=CAP_TOP-.01+.88*Math.cos(BOARD_TILT)+.045*Math.sin(BOARD_TILT);
export const STATIONS=12;
export const stationZ=(wing,index)=>-5-wing*HALL_STEP-index*5.5;
export const elapsedSeconds=e=>e.s??(13.797e9-e.yearsAgo)*3.1557e7;
export const chronologicalWing=e=>e.yearsAgo>=4.54e9?0:e.yearsAgo>315000?1:2;
export function timeSinceBigBang(e){
  const seconds=Math.max(0,elapsedSeconds(e));
  if(seconds<.001&&seconds>0){
    const [coefficient,exponent]=seconds.toExponential(2).split('e');
    const superscripts={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
    return `${Number(coefficient)} × 10${String(Number(exponent)).split('').map(c=>superscripts[c]).join('')} seconds`;
  }
  if(seconds<3.1557e7)return `${Number(seconds.toPrecision(4)).toLocaleString('en-US',{maximumFractionDigits:6})} ${seconds===1?'second':'seconds'}`;
  return `≈ ${Math.round(seconds/3.1557e7).toLocaleString('en-US')} years`;
}

const DOORS=[
  {label:'THE LIVING EARTH',           gallery:'GALLERY II',  cartouche:['THE LIVING','EARTH']},
  {label:'HUMANITY · THE GLOBE ROOM',  gallery:'GALLERY III', cartouche:['HUMANITY','THE GLOBE ROOM']},
  {label:'THE UNWRITTEN FUTURE',       gallery:'THE FINALE',  cartouche:['THE UNWRITTEN','FUTURE']}
];

export function createJourneyScene(THREE,scene,callbacks){
  const architecture=createGrandArchitecture(THREE);scene.add(architecture.group);
  const sculpture=createSculptureGallery(THREE,{materials:architecture.materials,hallStep:HALL_STEP});scene.add(sculpture.group);
  const futureGallery=createFutureGallery(THREE);futureGallery.group.position.z=52;scene.add(futureGallery.group);
  const floor=architecture.floor;floor.userData.floor=true;
  const pickables=[floor],panels=[[],[],[]],doors=[],collectionSigns=[[],[],[]],textureLoader=new THREE.TextureLoader();
  const origin=createOriginEffect(THREE);origin.group.position.set(0,5,16);scene.add(origin.group);
  const stone=new THREE.MeshStandardMaterial({name:'plinth stone',color:'#dcd2b9',roughness:.6});
  const dark=new THREE.MeshStandardMaterial({name:'plinth slate',color:'#24303b',roughness:.48});
  const gold=new THREE.MeshStandardMaterial({name:'plinth gilt',color:'#c9a664',metalness:.5,roughness:.32});
  const accents=['#293a55','#31534b','#593c38'].map((color,index)=>new THREE.MeshStandardMaterial({name:`hall accent ${index+1}`,color,roughness:.58}));
  let textureFailures=0,texturePending=0;
  const B=(parent,w,h,d,x,y,z,material)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);parent.add(m);return m;};
  // Lettering is painted on whole pixels: a half-pixel baseline is resampled
  // across two rows of texels and reads as a soft edge in the headset.
  function texture(lines,{w=1024,h=256,size=42,bg='#172027',color='#f1ddba'}={}){
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;
    const ls=Array.isArray(lines)?lines:[lines];ls.forEach((s,i)=>{ctx.font=`${i===0?'':'italic '}${size}px Georgia`;ctx.fillText(s,Math.round(w/2),Math.round(h/2+(i-(ls.length-1)/2)*size*1.4),w-64);});
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  /**
   * A canvas for a surface `width` by `height` metres: the same texels per
   * metre everywhere, and the same proportions as the surface, so lettering is
   * never stretched by being painted on a canvas of a different shape.
   * `line` is the height of a line of text as a fraction of the surface.
   */
  // Texels a metre for anything with words on it, and the largest canvas the
  // museum will paint. A headset resolves more than 680 a metre at reading
  // distance, so the native build asks for more of both (see vr/detail.js).
  const SIGN_PX=Math.round(680*TEXTURE_SCALE);
  function canvasFor(width,height,line){
    const px=Math.min(SIGN_PX,TEXTURE_CAP/Math.max(width,height));
    const h=Math.round(height*px);
    return {w:Math.round(width*px),h,size:Math.round(h*line)};
  }
  function plane(parent,w,h,x,y,z,map){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));m.position.set(x,y,z);parent.add(m);return m;}
  function action(parent,label,x,y,z,w,h,fn){const m=plane(parent,w,h,x,y,z,texture(label,canvasFor(w,h,.26)));m.userData.action=fn;pickables.push(m);
    // The native build presses the same plates: it takes the place and size
    // from here and the purpose from the words, so 'TURN STYLE' is 'turn-style'.
    m.userData.nativeAction={id:label.toLowerCase().replace(/[^a-z ]/g,'').trim().replace(/\s+/g,'-'),w,h};
    return m;}
  // The opening is an artistic visualization of expansion, housed at the closed
  // end of the Cosmos hall. The chronological path runs away from it.
  const originTitle=plane(scene,6.8,.6,0,10.4,21,texture('THE BEGINNING OF EVERYTHING',{...canvasFor(6.8,.6,.37),bg:'#141824',color:'#efd7a7'}));originTitle.rotation.y=Math.PI;
  const originDate=plane(scene,4.8,.35,0,9.75,21,texture('13.8 BILLION YEARS AGO',{...canvasFor(4.8,.35,.306),bg:'#141824',color:'#c8b793'}));originDate.rotation.y=Math.PI;
  const originControl=new THREE.Group();originControl.position.set(0,0,9.8);originControl.rotation.y=Math.PI;scene.add(originControl);
  // One dedication, on a lectern beside the opening, in place of a line on
  // every plaque: every work of art in the museum was made for it. It stands
  // to the left of the control desk, turned toward a visitor arriving to face
  // the expansion, with its plate raked back to be read from standing height.
  {
    const lectern=new THREE.Group();lectern.position.set(3.2,0,9.1);lectern.rotation.y=Math.PI+Math.atan2(3.2,5.1);scene.add(lectern);
    B(lectern,1.5,1.0,.46,0,.5,0,dark);B(lectern,1.58,.045,.54,0,1.02,0,gold);
    const rake=new THREE.Group();rake.position.set(0,1.34,.04);rake.rotation.x=-.52;lectern.add(rake);
    B(rake,1.52,.9,.04,0,0,-.03,gold);
    const W=1.44,H=.82,{w,h}=canvasFor(W,H,.1),c=document.createElement('canvas');c.width=w;c.height=h;
    const ctx=c.getContext('2d');ctx.scale(w/W,h/H);          // drawn in metres
    ctx.fillStyle='#172027';ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#e1c393';ctx.font='600 .062px Arial, sans-serif';ctx.letterSpacing='.012px';
    ctx.fillText('ORIGINAL TO THIS MUSEUM',W/2,.13,W-.1);ctx.letterSpacing='0px';
    ctx.fillStyle='rgba(201,166,100,.55)';ctx.fillRect(.32,.2,W-.64,.004);
    ctx.fillStyle='#f1ddba';ctx.font='.056px Georgia, serif';
    ['Every statue, every sculpture on its pedestal,','and every work hung from the vaults','was made for Hallways of Time,','and is found nowhere else.']
      .forEach((line,i)=>ctx.fillText(line,W/2,.31+i*.097,W-.12));
    ctx.fillStyle='#a99a7c';ctx.font='italic .042px Georgia, serif';
    ctx.fillText('The photographs on the exhibits are not; each is credited where it hangs.',W/2,.73,W-.12);
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
    plane(rake,W,H,0,0,0,map);
  }
  B(originControl,2.1,.55,.8,0,.275,0,dark);B(originControl,2.2,.045,.87,0,.575,0,gold);
  action(originControl,'FOLLOW TIME →',0,.82,.05,1.9,.32,()=>callbacks.begin());
  action(originControl,'REPLAY THE ORIGIN',0,.36,.43,1.9,.22,()=>origin.restart());
  const threadMat=new THREE.MeshBasicMaterial({color:'#bfaa6d'});
  for(let wing=0;wing<2;wing++){
    B(scene,.045,.012,72,0,.015,-36-wing*HALL_STEP,threadMat);
    for(let n=0;n<STATIONS;n++){
      const z=stationZ(wing,n),g=new THREE.Group();g.name=`Exhibit station ${wing}.${n}`;g.position.set(0,0,z);scene.add(g);
      const accent=accents[wing];
      B(g,2.75,.13,1.35,0,.065,0,stone);B(g,2.52,.055,1.17,0,.158,0,gold);
      B(g,2.25,.62,.86,0,.49,0,accent);B(g,2.42,.06,1.04,0,.83,0,gold);
      const board=new THREE.Group();board.name='Exhibit board';board.position.set(0,BOARD_Y,0);board.rotation.x=-BOARD_TILT;g.add(board);
      B(board,2.84,1.76,.09,0,0,0,gold);B(board,2.75,1.67,.075,0,0,.05,dark);
      const art=plane(board,2.6,1.12,0,.20,.10,texture('Preparing this moment…'));
      const label=plane(board,2.6,.34,0,-.59,.11,texture('',canvasFor(2.6,.34,.212)));
      art.userData.event=null;pickables.push(art);label.userData.proxy=art;pickables.push(label);
      const ordinal=plane(g,2.05,.39,0,.48,.445,texture('',{...canvasFor(2.05,.39,.172),bg:'#26313b'}));
      const badge=plane(g,2.4,.65,2.65,.026,1.3,texture('',{...canvasFor(2.4,.65,.172),bg:'#e1d8c3',color:'#433c2e'}));badge.rotation.x=-Math.PI/2;
      const p={g,art,label,ordinal,badge,wing,index:n,generation:0,event:null};panels[wing].push(p);
    }
  }
  // Bronze double doors are full-height spatial objects. They open on approach
  // and by controller selection; floor teleports cannot pass through a closed door.
  for(const opening of architecture.doorways){
    const {index,z,width,height}=opening,door={index,z,width,height,openness:0,target:0,leaves:[]};
    const {label,gallery,cartouche}=DOORS[index];
    door.label=label;
    for(const side of [-1,1]){
      const hinge=new THREE.Group();hinge.position.set(side*width/2,0,z);scene.add(hinge);
      // The native build swings this leaf itself, from the same hinge and the
      // same angle, so the leaf says which door it belongs to and where it hangs.
      hinge.name=`Door ${index} ${side<0?'left':'right'}`;
      hinge.userData.nativePart={kind:'door',name:hinge.name,piece:label,index,side,width,height,z,
        base:{position:hinge.position.toArray(),quaternion:hinge.quaternion.toArray(),scale:hinge.scale.toArray()}};
      const center=-side*width/4,wood=new THREE.MeshStandardMaterial({color:['#1b3049','#204139','#492e2b'][index],metalness:.12,roughness:.47});
      const leaf=B(hinge,width/2-.025,height,.18,center,height/2,0,wood);leaf.userData.action=()=>openDoor(index);pickables.push(leaf);
      for(const edge of [-1,1])B(hinge,.055,height-.12,.025,center+edge*(width/4-.075),height/2,.105,gold);
      for(const cy of [height*.25,height*.70]){
        B(hinge,width/2-.40,height*.38,.045,center,cy,.105,stone);
        B(hinge,width/2-.49,height*.38-.09,.04,center,cy,.135,wood);
      }
      const ornament=new THREE.Mesh(new THREE.TorusGeometry(.39,.024,6,36),gold);ornament.position.set(center,height*.49,.16);hinge.add(ornament);
      B(hinge,.07,.56,.13,-side*.18+center,height*.42,.21,gold);
      door.leaves.push({hinge,side});
    }
    // Lettering sits in front of the thick portal wall and its raised cartouche.
    B(scene,5.1,.74,.1,0,height+1.1,z+.68,gold);
    plane(scene,4.95,.59,0,height+1.1,z+.74,texture(label,{...canvasFor(4.95,.59,.29),bg:'#23303b',color:'#e1c393'}));
    B(scene,2.0,1.08,.13,3.95,2.55,z+.58,gold);
    plane(scene,1.86,.94,3.95,2.55,z+.66,texture([gallery,...cartouche],{...canvasFor(1.86,.94,.115),bg:'#23303b',color:'#f1ddba'}));
    action(scene,'APPROACH TO CONTINUE',0,height+.56,z+.74,3,.28,()=>openDoor(index));
    doors.push(door);
  }
  // Chapter desks at both ends make the full collection discoverable in-headset.
  for(let wing=0;wing<2;wing++)for(const offset of [1,-70]){
    const nav=new THREE.Group();nav.position.set(5.7,0,offset-wing*HALL_STEP);nav.rotation.y=-.22;scene.add(nav);
    B(nav,1.35,.85,.55,0,.425,0,dark);B(nav,1.43,.04,.62,0,.87,0,gold);
    collectionSigns[wing].push(plane(nav,2.3,.75,0,2.0,0,texture('THE COMPLETE COLLECTION',canvasFor(2.3,.75,.16))));
    const next=action(nav,'NEXT CHAPTER →',0,1.27,.10,1.3,.22,()=>callbacks.nextCollection(wing,1));
    const previous=action(nav,'← PREVIOUS CHAPTER',0,1.01,.10,1.3,.22,()=>callbacks.nextCollection(wing,-1));
    next.userData.chapterDirection=1;previous.userData.chapterDirection=-1;next.userData.wing=previous.userData.wing=wing;
    action(nav,'GUIDE',0,.74,.30,1.3,.19,callbacks.help);
    action(nav,'TURN STYLE',0,.51,.30,1.3,.19,callbacks.turnStyle);
    action(nav,'EXIT VR',0,.28,.30,1.3,.19,callbacks.exit);
  }
  B(scene,5.76,1.66,.06,0,3.3,-217.08,gold);
  const future=plane(scene,5.6,1.5,0,3.3,-217,texture(['The next chapter','is yours to imagine.'],{h:400,size:62}));
  B(scene,3.72,.5,.06,0,1.7,-217.03,gold);
  action(scene,'RETURN TO THE BEGINNING',0,1.7,-216.95,3.6,.38,callbacks.origin);
  // Batch the repeated static geometry while retaining all clickable surfaces.
  const batches=new Map();scene.updateMatrixWorld(true);
  for(const parent of [scene,...panels.flat().map(p=>p.g),...panels.flat().map(p=>p.art.parent)])for(const mesh of [...parent.children]){
    if(!mesh.isMesh||mesh.geometry.type!=='BoxGeometry'||mesh.userData.action)continue;
    const key=mesh.material.uuid;if(!batches.has(key))batches.set(key,{mat:mesh.material,items:[]});
    const params=mesh.geometry.parameters,matrix=mesh.matrixWorld.clone().multiply(new THREE.Matrix4().makeScale(params.width,params.height,params.depth));
    const panel=panels.flat().find(p=>p.g===parent||p.art.parent===parent);batches.get(key).items.push({matrix,panel});mesh.removeFromParent();mesh.geometry.dispose();
  }
  for(const batch of batches.values()){
    const instance=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),batch.mat,batch.items.length);scene.add(instance);
    batch.items.forEach(({matrix,panel},index)=>{instance.setMatrixAt(index,matrix);if(panel)(panel.instances??=[]).push({instance,index,matrix});});
  }
  // Hall III is the globe room: one instrument instead of a line of plinths.
  const humanity=createHumanityGlobe(THREE,callbacks.humanEvents||[],{change:callbacks.globeChange,read:callbacks.read,help:callbacks.help});
  scene.add(humanity.group);pickables.push(...humanity.pickables);
  function refresh(wing,list,collection){
    if(wing===2)return;
    if(collection){
      for(const sign of collectionSigns[wing]){sign.material.map.dispose();sign.material.map=texture([`CHAPTER ${collection.page+1} OF ${collection.pageCount}`,`Entries ${collection.start}–${collection.end} of ${collection.total}`,'Follow every moment, in order'],canvasFor(2.3,.75,.12));}
      for(const target of pickables)if(target.userData.wing===wing&&target.userData.chapterDirection){
        const enabled=target.userData.chapterDirection>0?collection.page<collection.pageCount-1:collection.page>0;
        target.material.color.set(enabled?'#ffffff':'#606060');
      }
    }
    panels[wing].forEach((p,i)=>{
      const e=list[i];p.event=e;p.g.visible=!!e;p.art.userData.event=e;p.generation++;
      for(const part of p.instances||[]){part.instance.setMatrixAt(part.index,e?part.matrix:new THREE.Matrix4().makeScale(0,0,0));part.instance.instanceMatrix.needsUpdate=true;}
      if(!e)return;
      const elapsedLabel=timeSinceBigBang(e);
      for(const [m,box] of [[p.ordinal,canvasFor(2.05,.39,.172)],[p.badge,canvasFor(2.4,.65,.172)]]){
        m.material.map.dispose();
        m.material.map=texture([elapsedLabel,'AFTER THE BIG BANG'],{...box,bg:m===p.badge?'#e1d8c3':'#26313b',color:m===p.badge?'#433c2e':'#f1ddba'});
      }
      p.label.material.map.dispose();p.label.material.map=texture([e.title,e.date],{...canvasFor(2.6,.34,.212),color:'#efd7a7'});
      p.art.material.map.dispose();p.art.material.map=texture('');const gen=p.generation;p.artSource=null;p.picture=null;p.credit=null;if(p.sharp)sharpBoards--;p.sharp=false;p.sharpness=1;
      const paint=im=>{p.picture=im;paintArt(p,p.sharp);};
      texturePending++;
      textureLoader.load(new URL(e.art,location.href).href,t=>{
        texturePending--;
        if(gen!==p.generation||p.artSource==='photo'){t.dispose();return;}
        paint(t.image);p.artSource='plate';
      },undefined,()=>{texturePending--;textureFailures++;});
      // The timeline's photograph replaces the illustration if one can be found.
      if(callbacks.imagery){
        p.photoPending=true;
        callbacks.imagery.photo(e).then(found=>{if(found&&gen===p.generation){p.credit=found.credit;p.artSource='photo';paint(found.image);}})
          .catch(()=>{}).finally(()=>{if(gen===p.generation)p.photoPending=false;});
      }
    });
  }
  /**
   * Fit a picture whole within a board's art area, on black. Boards near the
   * visitor are painted at 1.5 times the resolution; the rest stay at the
   * standard size, so texture memory stays bounded however long the hall.
   */
  // A board is 2.6 m wide and read from about 1.4 m, which subtends some 85
  // degrees: at the twenty pixels a degree a headset resolves, a near board is
  // worth about 1,700 texels across, and no more. Distant boards keep the
  // smaller canvas, so texture memory stays bounded however long the hall.
  const ART={w:1280,h:560,pad:25},SHARPER=1.35,NEAR=9,FAR=15;
  let detail='sharp',sharpBoards=0;
  function paintArt(p,sharp){
    const im=p.picture;if(!im)return;
    const k=sharp?SHARPER:1,c=document.createElement('canvas');c.width=Math.round(ART.w*k);c.height=Math.round(ART.h*k);
    const ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';ctx.fillStyle='#08090a';ctx.fillRect(0,0,c.width,c.height);
    const width=im.naturalWidth||im.width,height=im.naturalHeight||im.height;
    // A photograph keeps a strip at the foot of the board for its credit.
    const credit=p.artSource==='photo'?p.credit:null,strip=credit?38*k:0;
    const r=Math.min((c.width-ART.pad*2*k)/width,(c.height-ART.pad*2*k-strip)/height),w=width*r,h=height*r;
    ctx.drawImage(im,(c.width-w)/2,(c.height-strip-h)/2,w,h);
    if(credit){
      ctx.fillStyle='#c4b898';ctx.font=`${20*k}px Arial`;ctx.textAlign='right';ctx.textBaseline='middle';
      ctx.fillText(`Picture: ${credit.artist} · ${credit.license} · ${credit.host==='enwiki'?'English Wikipedia':'Wikimedia Commons'}`,Math.round(c.width-ART.pad*k),Math.round(c.height-strip/2-3*k),c.width-ART.pad*2*k);
    }
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
    p.art.material.map.dispose();p.art.material.map=map;
    if(p.sharp!==sharp)sharpBoards+=sharp?1:-1;
    p.sharp=sharp;p.sharpness=k;
  }
  // At most one board is repainted per frame, so walking never stalls on uploads.
  function sharpenNear(head){
    for(const p of panels.flat()){
      if(!p.event||!p.picture)continue;
      const d=Math.hypot(head.x-p.g.position.x,head.z-p.g.position.z);
      if(detail==='sharp'&&!p.sharp&&d<NEAR){paintArt(p,true);return;}
      if(p.sharp&&(d>FAR||detail!=='sharp')){paintArt(p,false);return;}
    }
  }
  // ── For the native build ────────────────────────────────────────────────
  // What each station of a hall shows at this moment, as pictures, with where
  // each face hangs: the board's picture and title, the date on the plinth and
  // the badge on the floor. The picture is repainted sharp first. The native
  // build keeps these as the museum painted them, so its exhibits read in the
  // museum's own hand (scripts/export-native.mjs, MuseumCollection.cs).
  function faceOf(mesh,width,height,type='image/png'){
    mesh.updateMatrixWorld(true);
    const at=new THREE.Vector3(),turn=new THREE.Quaternion(),size=new THREE.Vector3();mesh.matrixWorld.decompose(at,turn,size);
    const image=mesh.material.map?.image;
    return {image:image?.toDataURL?image.toDataURL(type,.92):null,width,height,position:at.toArray(),rotation:turn.toArray()};
  }
  function stationFaces(wing){
    const faces=panels[wing].map(p=>{
      if(p.event&&p.picture)paintArt(p,true);
      return {index:p.index,event:p.event?.id||null,title:p.event?.title||null,artSource:p.artSource||null,
        art:faceOf(p.art,2.6,1.12,'image/jpeg'),label:faceOf(p.label,2.6,.34),ordinal:faceOf(p.ordinal,2.05,.39),badge:faceOf(p.badge,2.4,.65)};
    });
    const signs=collectionSigns[wing].map(sign=>faceOf(sign,2.3,.75));
    return {faces,signs};
  }
  /** Whether every station of a hall has its picture, and no photograph is still on its way. */
  const stationsSettled=wing=>panels[wing].every(p=>!p.event||(p.picture&&!p.photoPending));
  /** Which instances of the batched plinths and frames belong to which station. */
  const stationParts=()=>panels.flat().map(p=>{p.g.updateMatrixWorld(true);
    return {wing:p.wing,index:p.index,matrix:p.g.matrixWorld.toArray(),parts:(p.instances||[]).map(part=>[part.instance.uuid,part.index])};});

  const forward=new THREE.Vector3(),look={forwardZ:0,doorOpen:z=>doors.some(d=>d.z===z&&d.openness>.02)};
  function openDoor(index){const d=doors[index];if(d)d.target=1;}
  function resetDoorsThrough(wing){for(const d of doors)if(d.index<wing){d.target=1;d.openness=1;}}
  function update(dt,elapsed,head,reducedMotion,view,stillSculpture=reducedMotion){
    origin.update(elapsed,reducedMotion);
    sharpenNear(head);
    if(view){look.forwardZ=forward.set(0,0,-1).applyQuaternion(view.quaternion).z;}
    sculpture.update(elapsed,stillSculpture,head.z,view?look:null);
    humanity.update(dt,head.z<-164&&head.z>-200,view);
    for(const d of doors){
      if(head.z>d.z && head.z-d.z<5 && Math.abs(head.x)<3.5)d.target=1;
      d.openness=Math.min(d.target,d.openness+dt*.75);
      for(const {hinge,side} of d.leaves)hinge.rotation.y=-side*d.openness*Math.PI*.49;
    }
  }
  function validPosition(x,z,fromZ=z,headY){
    if(Math.abs(x)>8.25 || z>8.5 || z<-217)return false;
    for(const d of doors){
      const crossing=(fromZ-d.z)*(z-d.z)<=0;
      if((Math.abs(z-d.z)<.55||crossing) && (Math.abs(x)>d.width/2-.15||d.openness<.9))return false;
      // Risen above the floor, only the doorway's own arch is open, not the wall above it.
      const arch=4.7+Math.sqrt(Math.max(0,(d.width/2)**2-x*x));
      if((Math.abs(z-d.z)<.55||crossing) && headY!==undefined && headY>arch-.2)return false;
    }
    if(!humanity.validPosition(x,z,fromZ))return false;
    for(const p of panels.flat())if(p.event&&Math.abs(x)<1.75&&Math.abs(z-p.g.position.z)<1.15)return false;
    for(let w=0;w<2;w++)for(const offset of [1,-70])if(Math.abs(x-5.7)<.95&&Math.abs(z-(offset-w*HALL_STEP))<.65)return false;
    for(const o of sculpture.obstacles)if(Math.abs(x-o.x)<o.halfX&&Math.abs(z-o.z)<o.halfZ)return false;
    for(const o of architecture.collisionObstacles||[]){if(Number.isFinite(o.x)&&Number.isFinite(o.z)&&Math.abs(x-o.x)<(o.halfX??.5)&&Math.abs(z-o.z)<(o.halfZ??.5))return false;}
    return true;
  }
  function getLayout(){
    scene.updateMatrixWorld(true);return {columns:architecture.collisionObstacles||[],exhibits:panels.flat().filter(p=>p.event).map(p=>{
      const target=new THREE.Vector3();p.art.getWorldPosition(target);
      const titleFoot=p.label.localToWorld(new THREE.Vector3(0,-.17,0));
      return {wing:p.wing,index:p.index,x:p.g.position.x,y:target.y,z:p.g.position.z,target:{x:target.x,y:target.y,z:target.z},titleFootY:titleFoot.y,capTopY:CAP_TOP,eventId:p.event.id,yearsAgo:p.event.yearsAgo,timeSeconds:elapsedSeconds(p.event),elapsedLabel:timeSinceBigBang(p.event)};
    }),chapterControls:pickables.filter(p=>p.userData.chapterDirection).map(p=>{const target=new THREE.Vector3();p.getWorldPosition(target);return {wing:p.userData.wing,direction:p.userData.chapterDirection,target:{x:target.x,y:target.y,z:target.z}};}),doorways:doors.map(d=>({index:d.index,z:d.z,width:d.width,height:d.height,label:d.label,open:d.openness>=.9})),origin:{x:0,y:5,z:16},sculptures:sculpture.getLayout(),lighting:architecture.lighting,glazing:architecture.glazing,globeRoom:{center:[0,4.95,-182],radius:4.4,near:-164,far:-200}};
  }
  const setDetail=value=>{detail=value;};
  return {floor,pickables,panels,origin,humanity,refresh,update,validPosition,openDoor,resetDoorsThrough,getLayout,setDetail,stationFaces,stationsSettled,stationParts,getState:()=>({detail,sharpBoards,sharpening:SHARPER,boardSharpness:panels.flat().filter(p=>p.event&&p.picture).map(p=>({z:p.g.position.z,sharpness:p.sharpness||1})),humanity:humanity.getState(),textureFailures,texturePending,exhibitPhotos:panels.flat().filter(p=>p.event&&p.artSource==='photo').length,origin:origin.getState(),doors:doors.map(d=>({index:d.index,openness:d.openness,open:d.openness>=.9})),architecture:architecture.getState?.(),sculpture:sculpture.getState(),future:futureGallery.getState()})};
}
