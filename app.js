// ============================================================
// SUNUCU AYARI — paylaşımlı bildirimler için üç seçenek, sırayla denenir:
// 1) Kendi sunucun (PHP): api/ klasörünü bu sayfayla aynı hostinge yüklediysen
//    hiçbir şey yazma, uygulama onu kendisi bulur. Sunucu başka bir adresteyse
//    (ör. sayfa GitHub Pages'te, api başka hostingde) adresini API_URL'e yaz:
//    const API_URL = 'https://alanadin.com/api/';
// 2) Firebase: "firebaseConfig" nesnesini FIREBASE_CONFIG'e yapıştır.
// 3) İkisi de yoksa yerel mod: bildirimler yalnızca bu cihazda kalır.
// ============================================================
const API_URL = null;
const FIREBASE_CONFIG = null;
/* Örnek:
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "proje-adi.firebaseapp.com",
  projectId: "proje-adi",
  appId: "1:123:web:abc"
};
*/

(() => {
'use strict';
if(typeof L==='undefined'){document.getElementById('startErr').textContent='Harita yüklenemedi. Dosyayı Chrome ile açın.';document.getElementById('startErr').hidden=false;return;}

// ---------- İkonlar ----------
const ICONS = {
  camera:'<rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 7l1.5-2.5h5L16 7"/>',
  speed:'<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/><circle cx="12" cy="17" r="1.2"/>',
  eds:'<rect x="3" y="6" width="12" height="9" rx="1.5"/><path d="M15 9l5-2.5v8L15 12"/><path d="M8 15v5M5 20h6"/>',
  cone:'<path d="M9.5 4h5l4.5 15h-14z"/><path d="M7.6 11h8.8M6.3 15.5h11.4"/><path d="M3 19.5h18"/>',
  alert:'<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5"/><path d="M12 17.3v.2"/>',
  flood:'<path d="M3 8c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"/><path d="M3 13c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"/><path d="M3 18c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"/>',
  landslide:'<path d="M3 20h18L12 6z"/><circle cx="17" cy="9" r="1.3"/><circle cx="19.5" cy="13" r="1.3"/>',
  fire:'<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-3.5 3-5.5 3.5-9 2 1.3 3.2 3 3.5 5 .8-.8 1.3-2 1.4-3 2.4 2 4.6 4.6 4.6 7 0 3.4-2.5 6-6.5 6z"/>',
  snow:'<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
  fog:'<path d="M4 7h16M3 11h14M6 15h15M4 19h12"/>',
  quake:'<path d="M2 12h4l2-6 3 12 3-9 2 5 2-2h4"/>',
  storm:'<path d="M13 2L5 13h6l-1 9 8-12h-6z"/>',
  barrier:'<path d="M3 8h18v6H3z"/><path d="M7 8l4 6M13 8l4 6M6 14v6M18 14v6"/>',
  download:'<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M5 20h14"/>',
  map:'<path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  traffic:'<rect x="8" y="2.5" width="8" height="19" rx="3"/><circle cx="12" cy="7" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="17" r="1.6"/>',
  megaphone:'<path d="M4 10v4h3l7 4V6L7 10z"/><path d="M17.5 9a4 4 0 0 1 0 6"/>',
  other:'<path d="M12 4v11"/><path d="M12 19v.5"/>',
  gear:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  vol:'<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute:'<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  shield:'<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  zone:'<circle cx="12" cy="12" r="8.5" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="2"/>',
  locate:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  pin:'<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  route:'<circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="5" r="2.2"/><path d="M8.2 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.8"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  t_straight:'<path d="M12 20V5M6.5 10.5L12 5l5.5 5.5"/>',
  t_right:'<path d="M7 20v-7a4 4 0 0 1 4-4h8M14.5 4.5L19 9l-4.5 4.5"/>',
  t_left:'<path d="M17 20v-7a4 4 0 0 0-4-4H5M9.5 4.5L5 9l4.5 4.5"/>',
  t_sright:'<path d="M8 20v-6l8-8M10 6h6v6"/>',
  t_sleft:'<path d="M16 20v-6L8 6M14 6H8v6"/>',
  t_uturn:'<path d="M16 20V9a4 4 0 0 0-8 0v4M4.5 10.5L8 14l3.5-3.5"/>',
  t_round:'<circle cx="12" cy="10" r="4"/><path d="M12 14v7M15 7l4-4M15.5 3H19v3.5"/>',
  t_arrive:'<path d="M6 21V4M6 4h11l-2.5 4L17 12H6"/>',
  wind:'<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

// ---------- Türler ----------
const TYPES = {
  fixedRadar:    {label:'Sabit radar',        spoken:'radar',                  icon:'camera', color:'#E5484D', enf:true,  ttl:null},
  mobileRadar:   {label:'Mobil radar',        spoken:'mobil radar',            icon:'speed',  color:'#F7712B', enf:true,  ttl:3},
  eds:           {label:'EDS / Ortalama hız', spoken:'EDS denetimi',           icon:'eds',    color:'#A35BEA', enf:true,  ttl:null},
  trafficControl:{label:'Trafik kontrolü',    spoken:'trafik kontrol noktası', icon:'cone',   color:'#3E8BFF', enf:true,  ttl:3},
  accident:      {label:'Trafik kazası',      spoken:'trafik kazası',          icon:'alert',  color:'#E9A913', enf:false, ttl:2},
  roadwork:      {label:'Yol çalışması',      spoken:'yol çalışması',          icon:'barrier',color:'#C05621', enf:false, ttl:168},
  natural:       {label:'Doğa olayı',         spoken:'doğa olayı',             icon:'storm',  color:'#17A897', enf:false, ttl:12},
};
const SUB = {
  flood:['Sel / su baskını','flood'], landslide:['Heyelan','landslide'], fire:['Yangın','fire'],
  snowIce:['Kar / buzlanma','snow'], fog:['Yoğun sis','fog'], earthquake:['Deprem hasarı','quake'],
  storm:['Fırtına','storm'], other:['Diğer','other'],
};
const EDS_SUB = { avgStart:['Ortalama hız başlangıcı','ortalama hız koridoru başlangıcı'], avgEnd:['Ortalama hız bitişi','ortalama hız koridoru sonu'] };
const hTitle = h => h.mag ? `Deprem M${h.mag.toFixed(1).replace('.',',')}`
  : h.type==='natural' && SUB[h.sub] ? SUB[h.sub][0] : h.type==='eds' && EDS_SUB[h.sub] ? EDS_SUB[h.sub][0] : TYPES[h.type].label;
const hIcon  = h => h.type==='natural' && SUB[h.sub] ? SUB[h.sub][1] : TYPES[h.type].icon;
const hSpoken= h => h.type==='natural' && SUB[h.sub] ? SUB[h.sub][0].toLowerCase() : h.type==='eds' && EDS_SUB[h.sub] ? EDS_SUB[h.sub][1] : TYPES[h.type].spoken;

// ---------- Coğrafya ----------
const R_EARTH=6371008.8, rad=d=>d*Math.PI/180, deg=r=>r*180/Math.PI;
function dist(a,b){ const dLat=rad(b.lat-a.lat), dLng=rad(b.lng-a.lng);
  const s=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2; return 2*R_EARTH*Math.asin(Math.sqrt(s)); }
function bearing(a,b){ const y=Math.sin(rad(b.lng-a.lng))*Math.cos(rad(b.lat));
  const x=Math.cos(rad(a.lat))*Math.sin(rad(b.lat))-Math.sin(rad(a.lat))*Math.cos(rad(b.lat))*Math.cos(rad(b.lng-a.lng));
  return (deg(Math.atan2(y,x))+360)%360; }
const angDiff=(a,b)=>Math.abs(((a-b+540)%360)-180);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const fmtD=d=>d<1000?`${Math.max(10,Math.round(d/10)*10)} m`:`${(d/1000).toFixed(1).replace('.',',')} km`;
const B32='0123456789bcdefghjkmnpqrstuvwxyz';
function geohash(lat,lon,p=5){ let la=[-90,90],lo=[-180,180],out='',bit=0,ch=0,even=true;
  while(out.length<p){ const r=even?lo:la, v=even?lon:lat, mid=(r[0]+r[1])/2;
    if(v>=mid){ch=ch*2+1;r[0]=mid;}else{ch=ch*2;r[1]=mid;} even=!even;
    if(++bit===5){out+=B32[ch];bit=0;ch=0;} } return out; }
function geohashCover(c,radius){ const dLat=radius/111320, dLon=radius/(111320*Math.max(0.01,Math.abs(Math.cos(rad(c.lat))))), step=0.02, s=new Set();
  for(let la=c.lat-dLat;la<=c.lat+dLat+step;la+=step) for(let lo=c.lng-dLon;lo<=c.lng+dLon+step;lo+=step)
    s.add(geohash(clamp(la,-89.999,89.999),((lo+540)%360)-180)); return [...s]; }

// ---------- Kalıcı ayarlar (yalnızca bu cihaz) ----------
const store={ get(k,d){ try{ const v=localStorage.getItem('yu.'+k); return v==null?d:JSON.parse(v);}catch(e){return d;} },
  set(k,v){ try{ localStorage.setItem('yu.'+k,JSON.stringify(v)); }catch(e){} } };
const cfg={ voice:store.get('voice',true), zone:store.get('zone',false), night:store.get('night',true),
  beep:store.get('beep',true), northUp:store.get('northUp',false), autoCache:store.get('autoCache',true), traffic:store.get('traffic',false), shareSpeed:store.get('shareSpeed',true), limWarn:store.get('limWarn',true), wx:store.get('wx',true), quake:store.get('quake',true),
  enabled:new Set(store.get('types',Object.keys(TYPES))) };
const saveCfg=()=>{ store.set('voice',cfg.voice); store.set('zone',cfg.zone); store.set('night',cfg.night); store.set('beep',cfg.beep); store.set('northUp',cfg.northUp); store.set('autoCache',cfg.autoCache); store.set('traffic',cfg.traffic); store.set('shareSpeed',cfg.shareSpeed);
  store.set('limWarn',cfg.limWarn); store.set('wx',cfg.wx); store.set('quake',cfg.quake); store.set('types',[...cfg.enabled]); };
document.body.classList.toggle('night',cfg.night);

// ---------- Veri durumu ----------
const osm = new Map();      // OpenStreetMap'ten canlı çekilen sabit radarlar
const official = new Map(); // otomatik resmî kaynaklar (deprem)
const corridors = new Map(); // OSM ortalama hız koridorları: id -> {start,end,limit}
const remote = new Map();   // Firestore (herkesin bildirimleri)
let localReports = store.get('local',[]).filter(h=>!h.exp||h.exp>Date.now()); // yerel modda kendi bildirimlerin
const localVotes = store.get('votes',{}); // id -> 1 | -1
let db=null, uid=null, fbState='off';     // off | connecting | live | error
let api=null;                             // kendi sunucunun adresi (bulunursa)
const deviceId=(()=>{ let id=store.get('dev',null);
  if(!id){ try{ id='d'+Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join(''); }
    catch(e){ id='d'+Date.now().toString(36)+Math.random().toString(36).slice(2,12); } store.set('dev',id); }
  return id; })();
const shared=()=>!!(db||api);

function allHazards(){
  const m=new Map(osm); for(const [k,v] of official) m.set(k,v); for(const [k,v] of remote) m.set(k,v); for(const h of localReports) m.set(h.id,h);
  return [...m.values()];
}
const isExpired=h=>h.exp && h.exp<Date.now();
function visible(h){
  if(!cfg.enabled.has(h.type) || isExpired(h)) return false;
  let conf=h.conf||0, deny=h.deny||0;
  if(!h.remote && localVotes[h.id]===-1) deny+=3; // kendi "yok" oyun yerel noktayı gizler
  return deny-conf<3;
}

// ---------- Harita ----------
const map=L.map('map',{zoomControl:false,attributionControl:true,rotate:true,bearing:0,touchRotate:false,
  rotateControl:false,shiftKeyRotate:false,zoomSnap:0,zoomDelta:0.5}).setView([39.0,35.0],6);
const mapEl=document.getElementById('map');

// ---------- Harita katmanı: kendi vektör haritamız (çevrimdışı çalışır) ya da OSM ----------
// Kendi harita dosyası (tiles/turkiye.pmtiles) sunucuda varsa harita ondan çizilir; gezilen ve
// indirilen bölgeler telefonda (IndexedDB) saklanır, internet yokken oradan gösterilir.
// Dosya yoksa OpenStreetMap'in çevrimiçi haritası kullanılır (onun kuralları çevrimdışı indirmeye izin vermez).
let TILES_URL=store.get('tilesUrl',null), tilesMaxZoom=store.get('tilesMaxZ',14);
let tdb=null;
function idb(){
  if(tdb) return tdb;
  tdb=new Promise((ok,no)=>{ try{
    const r=indexedDB.open('yu-tiles',1);
    r.onupgradeneeded=()=>{ const d=r.result; d.createObjectStore('tiles'); d.createObjectStore('regions',{keyPath:'id'}); };
    r.onsuccess=()=>ok(r.result); r.onerror=()=>no(r.error);
  }catch(e){ no(e); } });
  return tdb;
}
async function idbDo(store,mode,fn){
  const d=await idb();
  return new Promise((ok,no)=>{ const tx=d.transaction(store,mode); const req=fn(tx.objectStore(store));
    tx.oncomplete=()=>ok(req&&'result' in req?req.result:undefined); tx.onerror=()=>no(tx.error); tx.onabort=()=>no(tx.error); });
}
const tileGet=k=>idbDo('tiles','readonly',s=>s.get(k)).catch(()=>undefined);
class OfflineTiles{
  constructor(url){ this.url=url; this.remote=url&&window.pmtiles?new pmtiles.PMTiles(url):null; }
  async getZxy(z,x,y,signal){
    const k=z+'/'+x+'/'+y;
    const rec=await tileGet(k);
    if(rec) return {data:rec.d};
    if(!this.remote||navigator.onLine===false) return undefined;
    try{
      const r=await this.remote.getZxy(z,x,y,signal);
      if(r&&r.data&&cfg.autoCache) idbDo('tiles','readwrite',s=>s.put({d:r.data,r:[],a:1},k)).catch(()=>{});
      return r;
    }catch(e){ return undefined; }
  }
}
let baseLayer=null, vtiles=null;
function makeBase(){
  if(baseLayer) map.removeLayer(baseLayer);
  const vector=!!(TILES_URL&&window.protomapsL&&window.indexedDB);
  if(vector){
    if(!vtiles||vtiles.url!==TILES_URL) vtiles=new OfflineTiles(TILES_URL);
    baseLayer=protomapsL.leafletLayer({url:vtiles,flavor:cfg.night?'dark':'light',lang:'tr',maxDataZoom:tilesMaxZoom,
      attribution:'© OpenStreetMap katkıcıları · Protomaps'});
  } else {
    baseLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap katkıcıları'});
  }
  baseLayer.addTo(map); if(baseLayer.bringToBack) baseLayer.bringToBack();
  document.body.classList.toggle('vector',vector);
}
makeBase();
// Sunucuda harita dosyası var mı? (açılışta bir kez; çevrimdışıyken son bilinen ayar kullanılır)
async function detectTiles(){
  if(!window.pmtiles||navigator.onLine===false) return;
  const cands=[...new Set([srv&&srv.tiles_url,'tiles/turkiye.pmtiles'].filter(Boolean))];
  for(const u of cands){
    try{
      const h=await new pmtiles.PMTiles(u).getHeader();
      if(h&&h.maxZoom!=null){
        const changed=TILES_URL!==u; TILES_URL=u; tilesMaxZoom=h.maxZoom; store.set('tilesUrl',u); store.set('tilesMaxZ',h.maxZoom);
        tilesInfo={minLon:h.minLon,minLat:h.minLat,maxLon:h.maxLon,maxLat:h.maxLat};
        if(changed) makeBase(); return;
      }
    }catch(e){}
  }
  if(TILES_URL){ TILES_URL=null; store.set('tilesUrl',null); makeBase(); }
}
let tilesInfo=null;
// Kullanıcı haritayı elle kaydırır/yakınlaştırırsa takip durur, "Ortala" düğmesi çıkar
let follow=true;
function stopFollow(){ if(!follow) return; follow=false; $('recenter').hidden=false; }
function startFollow(){
  follow=true; $('recenter').hidden=true;
  cam.zoom=map.getZoom(); cam.bearing=map.getBearing?map.getBearing():0;
}
map.on('dragstart',stopFollow);
mapEl.addEventListener('wheel',stopFollow,{passive:true});
mapEl.addEventListener('touchstart',e=>{ if(e.touches&&e.touches.length>1) stopFollow(); },{passive:true});
mapEl.addEventListener('dblclick',stopFollow);
map.on('contextmenu',e=>openPointMenu(e.latlng.lat,e.latlng.lng)); // uzun basma: buraya git / bildir

const $=id=>document.getElementById(id);
$('voiceBtn').innerHTML=ic(cfg.voice?'vol':'mute'); $('voiceBtn').classList.toggle('off',!cfg.voice);
$('setBtn').innerHTML=ic('gear'); $('fab').innerHTML=ic('plus'); $('recenter').innerHTML=ic('locate')+'<span>Ortala</span>';
$('compass').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l4 9.5h-8z" fill="#E5484D"/><path d="M12 21.5l-4-9.5h8z" fill="#C9D3DB"/></svg>';
function setModeLine(){
  $('modeLine').innerHTML = api ? '<span class="dot live"></span>Canlı mod (kendi sunucun): bildirimler tüm kullanıcılarla paylaşılır'
    : FIREBASE_CONFIG ? '<span class="dot live"></span>Canlı mod (Firebase): bildirimler tüm kullanıcılarla paylaşılır'
    : '<span class="dot warn"></span>Yerel mod: sunucu bağlı değil, bildirimler yalnızca bu cihazda kalır';
  if(native.ok()) $('modeLine').insertAdjacentHTML('beforeend',' · Android uygulaması');
}

// İşaretçiler
const layers=new Map(); // id -> {key, layer}
function pinHtml(h){
  const t=TYPES[h.type];
  return `<div class="hpin" style="background:${t.color};--c:${t.color}">${h.heading!=null?`<span class="dir" style="--hd:${h.heading}deg"><i></i></span>`:''}${ic(hIcon(h))}${h.limit?`<span class="lim">${h.limit}</span>`:''}</div>`;
}
function syncMarkers(){
  const seen=new Set();
  for(const h of allHazards()){
    if(!visible(h)) continue;
    const zoneShape = cfg.zone && TYPES[h.type].enf;
    const key=[h.type,h.sub,h.limit,h.heading,zoneShape,h.lat,h.lng].join('|');
    seen.add(h.id);
    const cur=layers.get(h.id);
    if(cur && cur.key===key) { cur.h=h; continue; }
    if(cur) map.removeLayer(cur.layer);
    let layer;
    if(zoneShape){
      layer=L.circle([h.lat,h.lng],{radius:500,color:TYPES[h.type].color,weight:2,fillOpacity:.18});
    } else {
      layer=L.marker([h.lat,h.lng],{icon:L.divIcon({html:pinHtml(h),className:'',iconSize:[36,36],iconAnchor:[18,18]}),keyboard:true,title:hTitle(h)});
    }
    const entry={key,layer,h};
    layer.on('click',()=>openHazard(entry.h));
    layer.addTo(map); layers.set(h.id,entry);
  }
  for(const [id,e] of layers) if(!seen.has(id)){ map.removeLayer(e.layer); layers.delete(id); }
}

// Araç
const carIcon=L.divIcon({className:'',iconSize:[44,44],iconAnchor:[22,22],
  html:`<div class="car"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="rgba(76,154,255,.25)"/><path d="M22 7l11 27-11-6-11 6z" fill="#fff" stroke="#4C9AFF" stroke-width="2.5" stroke-linejoin="round"/></svg></div>`});
let carMarker=null;

// ---------- Kamera: aracı ortalar, gidiş yönüne göre döndürür, hıza göre yakınlaşır ----------
let fixAt=null, camHeading=0, lastCamT=0, camSnap=true, lastSet=null;
const cam={zoom:16,bearing:0};
const destPoint=(p,brg,d)=>({lat:p.lat+d*Math.cos(rad(brg))/111320,
  lng:p.lng+d*Math.sin(rad(brg))/(111320*Math.max(0.01,Math.cos(rad(p.lat))))});
const zoomForSpeed=k=>k<12?17.2:k<35?16.6:k<60?16:k<90?15.4:k<115?14.9:14.5;
const angLerp=(a,b,t)=>{ const d=((b-a+540)%360)-180; return (a+d*t+360)%360; };
function camFrame(now){
  requestAnimationFrame(camFrame);
  if(!fixAt||!carMarker||now-lastCamT<40) return;
  const dt=Math.min(0.25,(now-lastCamT)/1000); lastCamT=now;
  const moving=fixAt.heading!=null&&fixAt.kmh>5;
  if(moving) camHeading=fixAt.heading;
  // GPS güncellemeleri arasında aracın yerini tahmin et (akıcı hareket)
  const age=Math.min(1.5,(now-fixAt.t)/1000);
  const car=moving?destPoint(fixAt,fixAt.heading,fixAt.kmh/3.6*age):fixAt;
  carMarker.setLatLng([car.lat,car.lng]);
  const mb=map.getBearing?map.getBearing():0;
  const svg=carMarker.getElement()?.querySelector('svg'); if(svg) svg.style.transform=`rotate(${camHeading+mb}deg)`;
  mapEl.style.setProperty('--mb',mb+'deg');
  const cs=$('compass').querySelector('svg'); if(cs) cs.style.transform=`rotate(${mb}deg)`;
  if(!follow) return;
  const headUp=!cfg.northUp;
  const tz=zoomForSpeed(fixAt.kmh), tb=headUp?(360-camHeading)%360:0;
  if(camSnap){ cam.zoom=tz; cam.bearing=tb; camSnap=false; }
  else { cam.zoom+=(tz-cam.zoom)*(1-Math.exp(-dt*1.2)); cam.bearing=angLerp(cam.bearing,tb,1-Math.exp(-dt*3)); }
  // Gidiş yönü yukarıdayken araç ekranın alt kısmında durur, önü daha çok görünür
  const mpp=40075016.686*Math.cos(rad(car.lat))/Math.pow(2,cam.zoom+8);
  const c=headUp?destPoint(car,camHeading,map.getSize().y*0.22*mpp):car;
  if(lastSet && Math.abs(lastSet.lat-c.lat)<2e-6 && Math.abs(lastSet.lng-c.lng)<2e-6 && Math.abs(lastSet.z-cam.zoom)<0.005
     && Math.abs(((lastSet.b-cam.bearing+540)%360)-180)<0.2) return;
  map.setView([c.lat,c.lng],cam.zoom,{animate:false});
  if(map.setBearing) map.setBearing(cam.bearing);
  lastSet={lat:c.lat,lng:c.lng,z:cam.zoom,b:cam.bearing};
}
requestAnimationFrame(camFrame);

// ---------- Ses ----------
let trVoice=null;
function pickVoice(){ if(!('speechSynthesis' in window)) return; trVoice=speechSynthesis.getVoices().find(v=>(v.lang||'').toLowerCase().startsWith('tr'))||null; }
if('speechSynthesis' in window){ pickVoice(); speechSynthesis.onvoiceschanged=pickVoice; }
// Android uygulaması (APK) içinde açıldıysa konum ve ses telefonun kendi servislerinden gelir
const native={ ok:()=>!!(window.flutter_inappwebview&&window.flutter_inappwebview.callHandler),
  call:(n,...a)=>{ try{ return Promise.resolve(window.flutter_inappwebview.callHandler(n,...a)); }catch(e){ return Promise.resolve(null); } } };
let actx=null;
function webBeep(){
  try{
    actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    const t0=actx.currentTime+0.02;
    [0,0.18].forEach(off=>{ const o=actx.createOscillator(), g=actx.createGain();
      o.type='sine'; o.frequency.value=off?1175:880;
      g.gain.setValueAtTime(0.0001,t0+off); g.gain.exponentialRampToValueAtTime(0.45,t0+off+0.015); g.gain.exponentialRampToValueAtTime(0.0001,t0+off+0.13);
      o.connect(g); g.connect(actx.destination); o.start(t0+off); o.stop(t0+off+0.14); });
  }catch(e){}
}
// Uygulama arka plandayken / ekran kapalıyken sistem bildirimi
let swReg=null;
function notifyUser(title,body,tag){
  try{
    if(native.ok()){ native.call('notify',title,body,tag||'uyari'); return; }
    if(document.visibilityState==='visible'||!swReg||!('Notification' in window)||Notification.permission!=='granted') return;
    swReg.showNotification(title,{body,tag:tag||'uyari',renotify:true,icon:'icon-192.png',badge:'icon-192.png',vibrate:[200,100,200]});
  }catch(e){}
}
async function setupNotifications(){
  try{
    if(!swReg && 'serviceWorker' in navigator && window.isSecureContext) swReg=await navigator.serviceWorker.register('sw.js');
    if('Notification' in window && Notification.permission==='default') await Notification.requestPermission();
  }catch(e){}
}
let sayT;
function say(text,beep=false){
  if(beep) notifyUser('Yol Uyarı',text);
  const el=$('say'); el.innerHTML=ic('vol')+'<span></span>'; el.lastChild.textContent=text; el.hidden=false;
  clearTimeout(sayT); sayT=setTimeout(()=>el.hidden=true,6000);
  if(!cfg.voice) return;
  const b=beep&&cfg.beep;
  if(b) webBeep();
  if(native.ok()){ setTimeout(()=>native.call('speak',text),b?380:0); return; }
  if(!('speechSynthesis' in window)) return;
  try{ const u=new SpeechSynthesisUtterance(text); u.lang='tr-TR'; if(trVoice) u.voice=trVoice; u.rate=1.0; u.volume=1;
    if(b) setTimeout(()=>speechSynthesis.speak(u),380); else speechSynthesis.speak(u); }catch(e){}
}
function announce(h,d,kmh){
  const m=Math.max(50,Math.round(d/50)*50); let t;
  if(cfg.zone && TYPES[h.type].enf) t=`${m} metre sonra denetim bölgesi.`;
  else if(TYPES[h.type].enf){ t=`${m} metre sonra ${hSpoken(h)}.`; if(h.limit){ t+=` Hız sınırı ${h.limit}.`; if(kmh>h.limit+2) t+=' Lütfen yavaşlayın.'; } }
  else t=`Dikkat! ${m} metre sonra ${hSpoken(h)}. Dikkatli sürün.`;
  say(t,true);
}

let toastT;
function toast(msg,ms=2800){ const t=$('toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>t.hidden=true,ms); }

// ---------- OpenStreetMap canlı radar verisi ----------
let osmCenter=null, osmBusy=false, osmNextTry=0;
async function loadOsm(c){
  if(osmBusy || Date.now()<osmNextTry) return;
  if(osmCenter && dist(osmCenter,c)<7000) return;
  osmBusy=true;
  const q=`[out:json][timeout:25];(node["highway"="speed_camera"](around:15000,${c.lat},${c.lng});node["enforcement"="maxspeed"](around:15000,${c.lat},${c.lng}););out body;relation["enforcement"="average_speed"](around:40000,${c.lat},${c.lng});out body;node(r);out body;`;
  const els=await overpass(q);
  osmBusy=false;
  if(els){ addOsm(els); osmCenter=c; dataChanged(); } else osmNextTry=Date.now()+60000;
}
async function overpass(q){
  const servers=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  for(const url of servers){
    try{
      const res=await fetch(url,{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'}});
      if(!res.ok) throw new Error(res.status);
      return (await res.json()).elements||[];
    }catch(e){ /* sıradaki sunucuyu dene */ }
  }
  return null;
}
function parseMaxspeed(v){
  if(v==null) return null; v=String(v).trim();
  const named={'TR:urban':50,'TR:rural':90}; if(named[v]) return named[v];
  const m=v.match(/^(\d+(?:\.\d+)?)\s*(mph)?$/); if(!m) return null;
  const n=m[2]?Math.round(+m[1]*1.609):Math.round(+m[1]); return n>0&&n<=160?n:null;
}
function addOsm(els){
  const nodes=new Map(), edsNodes=new Map();
  for(const e of els) if(e.type==='node') nodes.set(e.id,e);
  // Ortalama hız koridorları (relation enforcement=average_speed)
  for(const r of els){
    if(r.type!=='relation'||!r.tags||r.tags.enforcement!=='average_speed') continue;
    const lim=parseMaxspeed(r.tags.maxspeed), mem=(r.members||[]).filter(m=>m.type==='node');
    const devs=mem.filter(m=>m.role==='device');
    const f=mem.find(m=>m.role==='from')||devs[0], t=mem.find(m=>m.role==='to')||devs[devs.length-1];
    const fn=f&&nodes.get(f.ref), tn=t&&nodes.get(t.ref);
    if(fn&&tn&&fn!==tn) corridors.set(r.id,{id:r.id,start:{lat:fn.lat,lng:fn.lon},end:{lat:tn.lat,lng:tn.lon},limit:lim});
    devs.forEach(m=>edsNodes.set(m.ref,lim));
  }
  for(const el of els){
    if(el.type!=='node'||el.lat==null) continue;
    const tg=el.tags||{};
    if(tg.highway!=='speed_camera' && !tg.enforcement) continue;
    const dir=parseFloat(tg.direction||tg['camera:direction']);
    const isEds=edsNodes.has(el.id);
    osm.set('osm_'+el.id,{id:'osm_'+el.id,type:isEds?'eds':'fixedRadar',lat:el.lat,lng:el.lon,
      limit:parseMaxspeed(tg.maxspeed)||(isEds?edsNodes.get(el.id):null),
      heading:dir>=0&&dir<=360?dir:null,sub:null,conf:0,deny:0,source:'osm',created:null,exp:null});
  }
}
// Türkiye radar listesi (GitHub her hafta günceller): internet zayıfken de uyarı verir
let bundled={count:0,date:null};
// Hosting'deki kopya eskiyse GitHub'daki haftalık güncel liste kullanılır (hangisi yeniyse)
const RADAR_LIST_URLS=['data/radars-tr.json','https://raw.githubusercontent.com/earas1439/yol-uyari/main/data/radars-tr.json'];
async function loadBundled(){
  try{
    const got=await Promise.all(RADAR_LIST_URLS.map(u=>fetch(u,{cache:'no-cache'}).then(r=>r.ok?r.json():null).catch(()=>null)));
    const js=got.filter(x=>x&&x.elements&&x.elements.length).sort((a,b)=>String(b.generated||'').localeCompare(String(a.generated||'')))[0];
    if(!js) return;
    const els=js.elements;
    addOsm(els); bundled={count:els.filter(e=>e.type==='node'&&e.tags&&(e.tags.highway==='speed_camera'||e.tags.enforcement)).length,date:js.generated};
    dataChanged();
  }catch(e){}
}

// ---------- Bulunduğun yolun hız sınırı (OSM maxspeed) ----------
let roadWays=[], roadCenter=null, roadBusy=false, roadNext=0, curLimit=null, curRoad='', lastMatchT=0, overSince=0, lastOverWarn=0;
async function loadRoads(c){
  if(roadBusy||Date.now()<roadNext) return;
  if(roadCenter&&dist(roadCenter,c)<700) return;
  roadBusy=true; roadNext=Date.now()+20000;
  const q=`[out:json][timeout:25];way["highway"]["maxspeed"](around:1500,${c.lat},${c.lng});out tags geom;`;
  const els=await overpass(q); roadBusy=false;
  if(!els) return;
  roadCenter=c;
  roadWays=els.filter(w=>w.geometry&&w.geometry.length>1).map(w=>{ const t=w.tags||{};
    return {id:w.id,g:w.geometry.map(p=>[p.lat,p.lon]),fwd:parseMaxspeed(t['maxspeed:forward']||t.maxspeed),bwd:parseMaxspeed(t['maxspeed:backward']||t.maxspeed),
      oneway:t.oneway==='yes'||t.highway==='motorway',name:t.name||t.ref||''}; });
  matchRoad();
}
function matchRoad(){
  if(!lastPos) return;
  const p=lastPos, k=Math.cos(rad(p.lat)), X=q=>rad(q[1]-p.lng)*R_EARTH*k, Y=q=>rad(q[0]-p.lat)*R_EARTH;
  const moving=p.heading!=null&&p.kmh>8;
  let best=null;
  for(const w of roadWays){
    const g=w.g;
    for(let i=0;i<g.length-1;i++){
      const ax=X(g[i]),ay=Y(g[i]),bx=X(g[i+1]),by=Y(g[i+1]), dx=bx-ax, dy=by-ay, L2=dx*dx+dy*dy;
      if(!L2) continue;
      const t=clamp(-(ax*dx+ay*dy)/L2,0,1), off=Math.hypot(ax+dx*t,ay+dy*t);
      if(off>25||(best&&off>=best.off)) continue;
      let forward=true;
      if(moving){ const a=angDiff((deg(Math.atan2(dx,dy))+360)%360,p.heading); if(a>40&&a<140) continue; forward=a<=40; if(!forward&&w.oneway) continue; }
      best={off,w,forward};
    }
  }
  if(best){ curLimit=best.forward?best.w.fwd:best.w.bwd; curRoad=best.w.name; lastMatchT=Date.now(); }
  else if(Date.now()-lastMatchT>8000){ curLimit=null; curRoad=''; }
}
function checkOverspeed(){
  if(!lastPos||!curLimit||!cfg.limWarn){ overSince=0; return; }
  const now=lastPos.t||Date.now();
  if(lastPos.kmh>curLimit+5){
    if(!overSince) overSince=now;
    if(now-overSince>4000 && now-lastOverWarn>60000){ lastOverWarn=now; say(`Hız sınırı ${curLimit}. Yavaşlayın.`,true); }
  } else overSince=0;
}

// ---------- EDS ortalama hız takibi ----------
let odo=0, odoPrev=null, avg=null; const avgDone=new Map();
function updateOdo(here,acc){
  if(odoPrev && (acc||0)<60){ const d=dist(odoPrev,here); if(d>2 && d<800) odo+=d; }
  odoPrev=here;
}
function startAvg(o){
  const now=(lastPos&&lastPos.t)||Date.now();
  if(avgDone.has(o.key) && now-avgDone.get(o.key)<10*60000) return;
  avg={...o,startT:now,startOdo:odo,lastWarn:0,v:0,km:0};
  say('Ortalama hız koridoru başladı.'+(o.limit?` Sınır ${o.limit}.`:''),true);
}
function checkAvg(){
  if(!lastPos) return;
  const p=lastPos, now=p.t||Date.now();
  if(!avg){
    for(const c of corridors.values()){
      if(dist(p,c.start)<45 && dist(p,c.end)>200){ startAvg({key:'c'+c.id,limit:c.limit,end:c.end}); return; }
    }
    for(const h of allHazards()){
      if(h.type!=='eds'||h.sub!=='avgStart'||!visible(h)||dist(p,h)>45) continue;
      if(h.heading!=null && p.heading!=null && p.kmh>10 && angDiff(h.heading,p.heading)>60) continue;
      startAvg({key:h.id,limit:h.limit,end:null}); return;
    }
    return;
  }
  avg.km=(odo-avg.startOdo)/1000;
  const hrs=(now-avg.startT)/3600e3;
  avg.v=hrs>0.0005?avg.km/hrs:p.kmh;
  let ended=false;
  if(avg.end){ if(dist(p,avg.end)<45) ended=true; }
  else for(const h of allHazards()){
    if(h.type==='eds'&&h.sub==='avgEnd'&&visible(h)&&avg.km>0.3&&dist(p,h)<45){ if(h.limit&&!avg.limit) avg.limit=h.limit; ended=true; break; }
  }
  if(ended){
    const v=Math.round(avg.v);
    say(`Ortalama hız koridoru bitti. Ortalamanız ${v}.`+(avg.limit?(v>avg.limit?' Sınırın üzerinde.':' Sınırın altında.'):''),true);
    avgDone.set(avg.key,now); avg=null; return;
  }
  // Vazgeç: çok uzadı ya da koridor sonundan uzaklaşıyoruz (başka yola sapıldı)
  if(avg.end){ const de=dist(p,avg.end); avg.minEnd=Math.min(avg.minEnd??de,de); if(de>avg.minEnd+3000){ avg=null; return; } }
  if(avg.km>60||now-avg.startT>2*3600e3){ avg=null; return; }
  if(avg.limit && avg.km>0.5 && avg.v>avg.limit+1 && now-avg.lastWarn>90000){
    avg.lastWarn=now; say(`Ortalama hızınız ${Math.round(avg.v)}. Sınır ${avg.limit}. Yavaşlayın.`,true);
  }
}
function renderAvg(){
  const el=$('avgbox');
  if(!avg){ el.hidden=true; return; }
  el.hidden=false;
  const v=Math.round(avg.v), over=avg.limit&&v>avg.limit;
  el.classList.toggle('over',!!over);
  const rest=avg.end&&lastPos?`${fmtKm(dist(lastPos,avg.end))} kaldı`:`${avg.km.toFixed(1).replace('.',',')} km`;
  el.innerHTML=`<span class="al">ORT. HIZ</span><b>${v}</b>${avg.limit?`<span class="al">/ ${avg.limit}</span>`:''}<span class="ar"></span>`;
  el.querySelector('.ar').textContent=rest;
}

// ---------- Hava durumu riskleri (Open-Meteo) ----------
let wx=null, wxCenter=null, wxNext=0; const wxSpoken=new Set();
function weatherRisks(c,vis){
  const code=c.weather_code, t=c.temperature_2m, gust=c.wind_gusts_10m, pr=c.precipitation||0, snow=c.snowfall||0;
  const snowCodes=[71,73,75,77,85,86], freezing=[56,57,66,67], risks=[];
  if(code===45||code===48||(vis!=null&&vis<300)) risks.push({key:'fog',icon:'fog',label:'Yoğun sis'+(vis!=null&&vis<1000?` · görüş ${Math.round(vis)} m`:''),spoken:'bölgede yoğun sis var, görüş mesafesi düşük'});
  if(freezing.includes(code)||(t!=null&&t<=1&&(pr>0||snow>0||snowCodes.includes(code)))) risks.push({key:'ice',icon:'snow',label:`Buzlanma riski · ${Math.round(t)}°C`,spoken:'yollarda buzlanma riski var'});
  else if(snowCodes.includes(code)||snow>0) risks.push({key:'snow',icon:'snow',label:'Kar yağışı',spoken:'bölgede kar yağışı var'});
  if([65,82].includes(code)||pr>=4) risks.push({key:'rain',icon:'flood',label:'Kuvvetli yağış',spoken:'bölgede kuvvetli yağış var, su birikintilerine dikkat'});
  if([95,96,99].includes(code)) risks.push({key:'storm',icon:'storm',label:'Gök gürültülü fırtına',spoken:'bölgede gök gürültülü fırtına var'});
  else if(gust!=null&&gust>=60) risks.push({key:'wind',icon:'wind',label:`Kuvvetli rüzgâr · ${Math.round(gust)} km/s`,spoken:'bölgede kuvvetli rüzgâr var'});
  return {risks,t,code};
}
async function loadWeather(c){
  if(!cfg.wx) return;
  if(Date.now()<wxNext && wxCenter && dist(wxCenter,c)<15000) return;
  wxNext=Date.now()+10*60000; wxCenter=c;
  try{
    const u=`https://api.open-meteo.com/v1/forecast?latitude=${c.lat.toFixed(3)}&longitude=${c.lng.toFixed(3)}`+
      `&current=temperature_2m,precipitation,snowfall,weather_code,wind_gusts_10m&hourly=visibility&forecast_hours=1&wind_speed_unit=kmh&timezone=auto`;
    const r=await fetch(u); if(!r.ok) return;
    const js=await r.json(); if(!js.current) return;
    const vis=js.hourly&&js.hourly.visibility?js.hourly.visibility[0]:null;
    wx=weatherRisks(js.current,vis); renderWx();
    for(const w of wx.risks) if(!wxSpoken.has(w.key)){ wxSpoken.add(w.key); say(`Dikkat, ${w.spoken}.`,true); }
  }catch(e){}
}
function renderWx(){
  const el=$('wx');
  if(!cfg.wx||!wx||!wx.risks.length){ el.hidden=true; return; }
  el.hidden=false; el.innerHTML='';
  for(const w of wx.risks){ const s=document.createElement('span'); s.className='wxchip'; s.innerHTML=ic(w.icon)+'<span></span>'; s.lastChild.textContent=w.label; el.appendChild(s); }
}

// ---------- Depremler (USGS, son 24 saat) ----------
let quakeNext=0; const quakeSpoken=new Set();
async function loadQuakes(c){
  if(!cfg.quake||Date.now()<quakeNext) return;
  quakeNext=Date.now()+10*60000;
  try{
    const r=await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'); if(!r.ok) return;
    const js=await r.json();
    official.clear();
    for(const f of js.features||[]){
      const pr=f.properties||{}, co=(f.geometry||{}).coordinates||[], mag=+pr.mag;
      if(!(mag>=4)||co.length<2) continue;
      const q={id:'eq_'+f.id,type:'natural',sub:'earthquake',lat:co[1],lng:co[0],mag,place:pr.place||'',heading:null,limit:null,
        conf:0,deny:0,source:'official',created:pr.time,exp:null,area:true};
      const d=dist(c,q); if(d>200000) continue;
      official.set(q.id,q);
      if(d<120000 && mag>=4.5 && Date.now()-pr.time<6*3600e3 && !quakeSpoken.has(q.id)){
        quakeSpoken.add(q.id);
        say(`Dikkat. ${Math.round(d/1000)} kilometre uzakta ${mag.toFixed(1).replace('.',',')} büyüklüğünde deprem oldu. Yollarda hasar olabilir, dikkatli sürün.`,true);
      }
    }
    dataChanged();
  }catch(e){}
}
// Rota boyunca 200 m'lik şeritteki radarlar (uzun yol için)
async function loadOsmRoute(){
  if(!nav) return;
  const myNav=nav;
  const spacing=Math.max(400, nav.total/1200);
  const pts=[]; let acc=-Infinity;
  for(let i=0;i<nav.coords.length;i++){
    if(nav.cum[i]-acc>=spacing || i===nav.coords.length-1){ pts.push(nav.coords[i]); acc=nav.cum[i]; }
  }
  const line=pts.map(c=>`${c[0].toFixed(5)},${c[1].toFixed(5)}`).join(',');
  const q=`[out:json][timeout:90];(node["highway"="speed_camera"](around:200,${line});node["enforcement"="maxspeed"](around:200,${line}););out body;relation["enforcement"="average_speed"](around:300,${line});out body;node(r);out body;`;
  const els=await overpass(q);
  if(els && nav===myNav){ addOsm(els); dataChanged(); }
}

// ---------- Firebase (canlı paylaşım) ----------
function loadScript(src){ return new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>no(new Error('yüklenemedi: '+src)); document.head.appendChild(s); }); }
async function initFirebase(){
  if(!FIREBASE_CONFIG) return;
  fbState='connecting'; status();
  try{
    const v='10.12.2', base=`https://www.gstatic.com/firebasejs/${v}/`;
    await loadScript(base+'firebase-app-compat.js');
    await loadScript(base+'firebase-auth-compat.js');
    await loadScript(base+'firebase-firestore-compat.js');
    firebase.initializeApp(FIREBASE_CONFIG);
    const cred=await firebase.auth().signInAnonymously();
    uid=cred.user.uid; db=firebase.firestore();
    fbState='live'; status();
    if(lastPos) watchRemote(lastPos);
  }catch(e){ fbState='error'; status(); toast('Canlı bağlantı kurulamadı: '+(e.code||e.message),5000); }
}
const tsToMs=v=>v==null?null:(typeof v.toMillis==='function'?v.toMillis():(typeof v==='number'?v:Date.parse(v)));
function fromDoc(d){ const m=d.data();
  return {id:d.id,type:TYPES[m.type]?m.type:'natural',sub:m.subtype||null,lat:m.lat,lng:m.lng,heading:m.heading??null,limit:m.speedLimit??null,
    note:m.note||null,conf:m.confirmations||0,deny:m.denials||0,source:m.source||'user',created:tsToMs(m.createdAt),exp:tsToMs(m.expiresAt),remote:true,
    mine:m.reporterId===uid}; }
let remoteCenter=null, remoteUnsubs=[], chunkData=[];
// ---------- Kendi sunucun (PHP api/) ----------
async function initBackend(){
  const cands = API_URL ? [API_URL.endsWith('/')?API_URL:API_URL+'/'] : ['api/'];
  for(const base of cands){
    try{
      const r=await fetch(base+'?action=ping',{cache:'no-store'});
      if(r.ok){ const j=await r.json(); if(j && j.app==='yol-uyari'){ api=base; fbState='live'; status(); setModeLine(); await loadServerConfig(); if(lastPos) watchRemote(lastPos); return; } }
    }catch(e){ /* sunucu yok */ }
  }
  setModeLine();
  await initFirebase();
}
const apiHeaders=()=>({'Content-Type':'application/json','X-Device-Id':deviceId});
const fromApi=m=>({id:'srv_'+m.id,sid:m.id,type:TYPES[m.type]?m.type:'natural',sub:m.subtype||null,lat:m.lat,lng:m.lng,
  heading:m.heading??null,limit:m.speedLimit??null,note:m.note||null,conf:m.confirmations||0,deny:m.denials||0,
  source:m.source==='official'?'official':'user',created:m.createdAt,exp:m.expiresAt,remote:true,mine:!!m.mine});
// Yönetici panelinden gelen uygulama ayarları
let srv={poll_seconds:10,start_notice:'',report_types:Object.keys(TYPES)};
async function loadServerConfig(){
  try{
    const r=await fetch(api+'?action=config',{headers:{'X-Device-Id':deviceId},cache:'no-store'}); if(!r.ok) return;
    const j=await r.json(); srv={...srv,...j};
    if(srv.start_notice){ const n=$('notice'); n.textContent=srv.start_notice; n.hidden=false; }
    if(store.get('zone',null)===null && j.default_zone_mode){ cfg.zone=true; }
    if(apiCenter){ clearInterval(apiTimer); apiTimer=setInterval(pollApi,Math.max(5,+srv.poll_seconds||10)*1000); }
    startTrafficTimer(); if(cfg.traffic&&trafficAvailable()) setTraffic(true);
  }catch(e){}
}
// Toplu bildirimler (duyurular)
let lastMsgId=store.get('lastMsg',0);
async function pollMessages(c){
  try{
    const r=await fetch(`${api}?action=messages&after=${lastMsgId}&lat=${c.lat.toFixed(4)}&lng=${c.lng.toFixed(4)}`,{headers:{'X-Device-Id':deviceId},cache:'no-store'});
    if(!r.ok) return;
    const list=await r.json();
    for(const m of list){
      lastMsgId=Math.max(lastMsgId,+m.id); store.set('lastMsg',lastMsgId);
      showMessage(m);
    }
  }catch(e){}
}
function showMessage(m){
  const lvl={info:'#1F6FEB',warning:'#E9A913',danger:'#E5484D'}[m.level]||'#1F6FEB';
  openSheet(`<div class="hz-head"><div class="pinbig" style="background:${lvl}">${ic('megaphone')}</div>
    <div style="min-width:0"><h3 id="msgT"></h3><div class="meta">Duyuru · ${ago(m.createdAt)||'az önce'}</div></div></div>
    <p id="msgB" style="margin:0;line-height:1.5;white-space:pre-line"></p><button class="wide" id="msgOk">Tamam</button>`);
  $('msgT').textContent=m.title; $('msgB').textContent=m.body||''; $('msgOk').onclick=closeSheet;
  say(`Duyuru. ${m.title}. ${m.body||''}`,true);
  notifyUser(m.title,m.body||'','duyuru-'+m.id);
}
let apiCenter=null, apiTimer=null, apiPolled=false;
function watchApi(c){
  if(apiCenter && dist(apiCenter,c)<3000) return;
  apiCenter=c; clearInterval(apiTimer); pollApi(); apiTimer=setInterval(pollApi,Math.max(5,+srv.poll_seconds||10)*1000);
}
async function pollApi(){
  const c=apiCenter; if(!c||!api) return;
  try{
    const r=await fetch(`${api}?action=hazards&lat=${c.lat.toFixed(5)}&lng=${c.lng.toFixed(5)}&radius=8000`,{headers:{'X-Device-Id':deviceId},cache:'no-store'});
    if(!r.ok) throw new Error(r.status);
    const list=await r.json();
    store.set('remoteCache',{at:Date.now(),list:list.slice(0,600)});
    const before=new Set(remote.keys()), notify=apiPolled;
    remote.clear();
    for(const m of list){
      const h=fromApi(m); remote.set(h.id,h);
      if(notify && !before.has(h.id) && !h.mine && lastPos && Date.now()-h.created<120000)
        toast(`Yeni bildirim · ${hTitle(h)}, ${fmtD(dist(lastPos,h))} uzakta`);
    }
    apiPolled=true; fbState='live'; status(); dataChanged();
    pollMessages(lastPos||c);
  }catch(e){ fbState='error'; status(); }
}

function watchRemote(c){
  if(api){ watchApi(c); return; }
  if(!db) return;
  if(remoteCenter && dist(remoteCenter,c)<3000) return;
  remoteCenter=c; remoteUnsubs.forEach(u=>u()); remoteUnsubs=[]; chunkData=[];
  const cells=geohashCover(c,8000);
  for(let i=0;i<cells.length;i+=30){
    const idx=chunkData.length; chunkData.push([]);
    remoteUnsubs.push(db.collection('hazards').where('geohash5','in',cells.slice(i,i+30)).onSnapshot(snap=>{
      const before=new Set(remote.keys());
      chunkData[idx]=snap.docs.map(fromDoc);
      remote.clear(); chunkData.flat().forEach(h=>remote.set(h.id,h));
      // Başkasının yeni bildirimi
      snap.docChanges().forEach(ch=>{ if(ch.type==='added' && !before.has(ch.doc.id) && before.size){ const h=fromDoc(ch.doc);
        if(!h.mine && lastPos && h.created && Date.now()-h.created<120000) toast(`Yeni bildirim · ${hTitle(h)}, ${fmtD(dist(lastPos,h))} uzakta`); } });
      fbState='live'; status(); dataChanged();
    },err=>{ fbState='error'; status(); toast('Canlı veri hatası: '+err.code,5000); }));
  }
}
async function report(d){
  const t=TYPES[d.type];
  if(api){
    const r=await fetch(api+'?action=report',{method:'POST',headers:apiHeaders(),
      body:JSON.stringify({type:d.type,subtype:d.sub,lat:d.lat,lng:d.lng,heading:d.heading,speedLimit:d.limit})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok) throw {code:j.error||('HTTP '+r.status)};
    pollApi(); return;
  }
  if(db){
    const F=firebase.firestore;
    await db.collection('hazards').add({type:d.type,subtype:d.sub,lat:d.lat,lng:d.lng,heading:d.heading,speedLimit:d.limit,note:null,
      geohash5:geohash(d.lat,d.lng),createdAt:F.FieldValue.serverTimestamp(),
      expiresAt:t.ttl?F.Timestamp.fromDate(new Date(Date.now()+t.ttl*3600e3)):null,
      confirmations:0,denials:0,reporterId:uid,source:'user'});
  } else {
    localReports.push({id:'loc_'+Date.now(),type:d.type,sub:d.sub,lat:d.lat,lng:d.lng,heading:d.heading,limit:d.limit,conf:0,deny:0,source:'user',
      created:Date.now(),exp:t.ttl?Date.now()+t.ttl*3600e3:null,mine:true});
    store.set('local',localReports); dataChanged();
  }
}
async function vote(h,ok){
  if(api && h.sid){
    const r=await fetch(api+'?action=vote',{method:'POST',headers:apiHeaders(),body:JSON.stringify({id:+h.sid,value:ok?1:-1})});
    const j=await r.json().catch(()=>({}));
    if(r.status===409) throw {code:'already-voted'};
    if(r.status===404) throw {code:'not-found'};
    if(!r.ok) throw {code:j.error||('HTTP '+r.status)};
    pollApi(); return;
  }
  if(db && h.remote){
    const F=firebase.firestore, ref=db.collection('hazards').doc(h.id), vref=ref.collection('votes').doc(uid);
    await db.runTransaction(async tx=>{
      const v=await tx.get(vref); if(v.exists) throw {code:'already-voted'};
      const s=await tx.get(ref); if(!s.exists) throw {code:'not-found'};
      const upd={[ok?'confirmations':'denials']:F.FieldValue.increment(1)};
      const ttl=TYPES[s.data().type]?.ttl; if(ok&&ttl) upd.expiresAt=F.Timestamp.fromDate(new Date(Date.now()+ttl*3600e3));
      tx.set(vref,{value:ok?1:-1,at:F.FieldValue.serverTimestamp()}); tx.update(ref,upd);
    });
  } else {
    if(localVotes[h.id]) throw {code:'already-voted'};
    localVotes[h.id]=ok?1:-1; store.set('votes',localVotes); dataChanged();
  }
}

// ---------- Konum ----------
let lastPos=null, prevFix=null, watchId=null, alertNow=null;
const announced=new Set();
function onFix(p){
  const c=p.coords, now=p.timestamp||Date.now();
  let kmh = c.speed!=null && c.speed>=0 ? c.speed*3.6 : null;
  let heading = c.heading!=null && !isNaN(c.heading) && c.heading>=0 ? c.heading : null;
  const here={lat:c.latitude,lng:c.longitude};
  if(prevFix){ const d=dist(prevFix,here), dt=(now-prevFix.t)/1000;
    if(kmh==null && dt>0) kmh=d/dt*3.6;
    if(heading==null && d>8) heading=bearing(prevFix,here); }
  if(heading==null && lastPos) heading=lastPos.heading;
  if(!prevFix || dist(prevFix,here)>8 || now-prevFix.t>5000) prevFix={...here,t:now};
  lastPos={...here,kmh:kmh||0,heading,acc:c.accuracy,t:now};
  if(!carMarker){ carMarker=L.marker([here.lat,here.lng],{icon:carIcon,interactive:false,zIndexOffset:1000}).addTo(map); camSnap=true; }
  fixAt={lat:here.lat,lng:here.lng,t:performance.now(),kmh:kmh||0,heading};
  updateOdo(here,c.accuracy);
  loadOsm(here); watchRemote(here); loadRoads(here); loadWeather(here); loadQuakes(here); collectSample(); trafficOnFix();
  matchRoad();
  evaluate();
  checkAvg(); checkOverspeed(); hud();
}
function onGeoErr(e){
  const msg = e.code===1 ? 'Konum izni reddedildi. Tarayıcı ayarlarından bu siteye konum izni ver.' :
              e.code===2 ? 'Konum alınamıyor. GPS açık mı?' : 'Konum zaman aşımı, tekrar deneniyor…';
  $('idleText').textContent=msg;
  if(e.code===1){ $('start').hidden=false; $('startErr').textContent=msg; $('startErr').hidden=false; }
}

// ---------- Uyarı değerlendirme ----------
function evaluate(){
  if(!lastPos){ hud(); return; }
  if(nav) updateNav();
  const kmh=lastPos.kmh, moving=kmh>10 && lastPos.heading!=null;
  const range=clamp(kmh*12,400,1500);
  let best=null;
  if(nav){
    // Rota varken: yalnızca rota üzerindeki noktalar, mesafe yol boyunca ölçülür
    for(const h of allHazards()) if(dist(lastPos,h)>3000) announced.delete(h.id);
    for(const x of nav.hz){
      const d=x.along-nav.carAlong;
      if(d<-30) continue;
      if(d>range) break;
      if(!visible(x.h)) continue;
      const dd=Math.max(0,d);
      if(!best||dd<best.d) best={h:x.h,d:dd};
      if(!announced.has(x.h.id)){ announced.add(x.h.id); announce(x.h,dd,kmh); }
    }
    alertNow=best; hud(); return;
  }
  for(const h of allHazards()){
    if(!visible(h)||h.area) continue;
    const d=dist(lastPos,h);
    if(d>3000){ announced.delete(h.id); continue; }
    if(d>range) continue;
    if(moving){
      if(d>60 && angDiff(bearing(lastPos,h),lastPos.heading)>50) continue;
      if(h.heading!=null && angDiff(h.heading,lastPos.heading)>60) continue;
    }
    if(!best||d<best.d) best={h,d};
    if(!announced.has(h.id)){ announced.add(h.id); announce(h,d,kmh); }
  }
  alertNow=best; hud();
}
function dataChanged(){ syncMarkers(); if(nav) computeRouteHazards(); evaluate(); }

// ---------- Navigasyon: hedef seçimi, rota, sesli yol tarifi ----------
let nav=null;
const fmtKm=m=>m<1000?`${Math.max(10,Math.round(m/10)*10)} m`:`${(m/1000).toFixed(m<100000?1:0).replace('.',',')} km`;
const fmtSpeak=m=>m<1000?`${Math.max(50,Math.round(m/50)*50)} metre`:`${(m/1000).toFixed(m<10000?1:0).replace('.',',')} kilometre`;
const fmtDur=s=>{ const m=Math.round(s/60); return m<60?`${Math.max(1,m)} dk`:`${Math.floor(m/60)} sa ${m%60} dk`; };
const cap=s=>s.charAt(0).toLocaleUpperCase('tr')+s.slice(1);

// Noktanın rotaya izdüşümü -> {along: rota başından metre, off: rotaya uzaklık, i: parça}
function project(p,from=0,to=Infinity){
  const c=nav.coords, cum=nav.cum, k=Math.cos(rad(p.lat));
  const X=q=>rad(q[1]-p.lng)*R_EARTH*k, Y=q=>rad(q[0]-p.lat)*R_EARTH;
  let best={along:0,off:Infinity,i:0};
  const end=Math.min(to,c.length-1);
  for(let i=Math.max(0,from);i<end;i++){
    const ax=X(c[i]),ay=Y(c[i]),bx=X(c[i+1]),by=Y(c[i+1]);
    const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy;
    const t=L2?clamp(-(ax*dx+ay*dy)/L2,0,1):0;
    const off=Math.hypot(ax+dx*t,ay+dy*t);
    if(off<best.off) best={along:cum[i]+(cum[i+1]-cum[i])*t,off,i};
  }
  return best;
}
function routeBearingAt(i){ const c=nav.coords, j=Math.min(i,c.length-2);
  return bearing({lat:c[j][0],lng:c[j][1]},{lat:c[j+1][0],lng:c[j+1][1]}); }

const MOD_TR={'uturn':'U dönüşü yapın','sharp right':'keskin sağa dönün','right':'sağa dönün','slight right':'hafif sağa dönün',
  'straight':'düz devam edin','slight left':'hafif sola dönün','left':'sola dönün','sharp left':'keskin sola dönün'};
const MOD_IC={'uturn':'t_uturn','sharp right':'t_right','right':'t_right','slight right':'t_sright','straight':'t_straight',
  'slight left':'t_sleft','left':'t_left','sharp left':'t_left'};
function stepText(m){
  const mod=m.modifier||'straight', t=m.type, L=mod.includes('left');
  let text, icon=MOD_IC[mod]||'t_straight';
  if(t==='arrive'){ text='hedefe ulaşacaksınız'; icon='t_arrive'; }
  else if(t==='roundabout'||t==='rotary'){ text=m.exit?`döner kavşaktan ${m.exit}. çıkıştan çıkın`:'döner kavşağa girin'; icon='t_round'; }
  else if(t==='exit roundabout'||t==='exit rotary'){ text='döner kavşaktan çıkın'; icon='t_round'; }
  else if(t==='on ramp') text=L?'soldaki bağlantı yoluna girin':'sağdaki bağlantı yoluna girin';
  else if(t==='off ramp') text=L?'soldan çıkışa girin':'sağdan çıkışa girin';
  else if(t==='fork') text=L?'ayrımda soldan devam edin':'ayrımda sağdan devam edin';
  else if(t==='merge') text='yola katılın';
  else if(t==='end of road') text='yolun sonunda '+(MOD_TR[mod]||'devam edin');
  else text=MOD_TR[mod]||'devam edin';
  return {text,icon};
}

async function fetchRoute(from,to){
  const url=`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
  let r;
  try{ r=await fetch(url); }catch(e){ throw new Error('Rota sunucusuna ulaşılamadı. İnternet bağlantını kontrol et.'); }
  if(!r.ok) throw new Error(`Rota sunucusu yanıt vermedi (${r.status}). Biraz sonra tekrar dene.`);
  const js=await r.json();
  if(js.code!=='Ok'||!js.routes||!js.routes.length) throw new Error('Bu hedefe araçla gidilebilecek bir rota bulunamadı.');
  return js.routes[0];
}

let routing=false;
async function startRoute(dest,reroute=false){
  if(!lastPos){ toast('Konum bekleniyor… Önce GPS konumun bulunmalı.',4000); return; }
  if(routing) return; routing=true;
  if(!reroute) toast('Rota hesaplanıyor…',10000);
  let r;
  try{ r=await fetchRoute(lastPos,dest); }
  catch(e){ routing=false; toast(e.message,5000); return; }
  routing=false;
  clearRoute(true);
  const coords=r.geometry.coordinates.map(([lng,lat])=>[lat,lng]);
  const cum=[0];
  for(let i=1;i<coords.length;i++) cum.push(cum[i-1]+dist({lat:coords[i-1][0],lng:coords[i-1][1]},{lat:coords[i][0],lng:coords[i][1]}));
  nav={dest,coords,cum,total:cum[cum.length-1]||1,duration:r.duration||0,steps:[],hz:[],idx:0,carAlong:0,off:0,offCount:0,
    lastReroute:Date.now(),spoken:new Set(),next:null};
  let si=0;
  for(const leg of r.legs||[]) for(const s of leg.steps||[]){
    const m=s.maneuver||{}, mod=m.modifier||'straight';
    if(m.type==='depart'||m.type==='new name'||m.type==='notification'||(m.type==='continue'&&mod==='straight')) continue;
    const pr=project({lat:m.location[1],lng:m.location[0]},si); si=pr.i;
    const {text,icon}=stepText(m);
    nav.steps.push({id:nav.steps.length,along:pr.along,text,icon,name:s.name||s.ref||''});
  }
  nav.casing=L.polyline(coords,{color:'#0B3D91',weight:11,opacity:.9,interactive:false}).addTo(map);
  nav.line=L.polyline(coords,{color:'#4C9AFF',weight:7,opacity:1,interactive:false}).addTo(map);
  nav.flag=L.marker([dest.lat,dest.lng],{interactive:false,
    icon:L.divIcon({className:'',html:'<div class="flag"><i></i></div>',iconSize:[34,34],iconAnchor:[17,41]})}).addTo(map);
  $('toast').hidden=true;
  computeRouteHazards();
  if(!reroute){
    addRecent(dest);
    loadOsmRoute();
    // Önce rotanın tamamını göster, 4 sn sonra aracı takibe dön
    stopFollow(); if(map.setBearing) map.setBearing(0);
    map.fitBounds(nav.line.getBounds(),{padding:[90,40]});
    setTimeout(()=>{ if(nav && !follow) startFollow(); },4000);
    const n=nav.hz.length;
    say(`Rota hazır. ${fmtSpeak(nav.total)}, yaklaşık ${fmtDur(nav.duration).replace('sa','saat').replace(/dk/g,'dakika')}.`
      +(n?` Rota üzerinde ${n} uyarı noktası var.`:''));
  } else say('Rota yeniden hesaplandı.');
  evaluate();
}

function clearRoute(silent){
  if(!nav) return;
  [nav.line,nav.casing,nav.flag].forEach(l=>{ if(l) map.removeLayer(l); });
  nav=null; navKey='';
  $('navcard').hidden=true; $('trip').hidden=true;
  if(!silent){ toast('Rota bitirildi'); evaluate(); }
}

function computeRouteHazards(){
  if(!nav||!nav.line) return;
  const b=nav.line.getBounds(), sw=b.getSouthWest(), ne=b.getNorthEast();
  const box=L.latLngBounds([sw.lat-.002,sw.lng-.003],[ne.lat+.002,ne.lng+.003]);
  nav.hz=[];
  for(const h of allHazards()){
    if(!visible(h)||h.area||!box.contains([h.lat,h.lng])) continue;
    const pr=project(h);
    if(pr.off>40) continue; // rotanın üzerinde değil
    if(h.heading!=null && angDiff(h.heading,routeBearingAt(pr.i))>60) continue; // karşı yöndeki denetim
    nav.hz.push({h,along:pr.along});
  }
  nav.hz.sort((a,b)=>a.along-b.along);
}

function updateNav(){
  if(!nav||!lastPos) return;
  let pr=project(lastPos,nav.idx-30,nav.idx+400);
  if(pr.off>60) pr=project(lastPos);
  nav.idx=pr.i; nav.carAlong=pr.along; nav.off=pr.off;
  const remain=Math.max(0,nav.total-nav.carAlong);
  if(remain<35 && pr.off<60){
    const name=nav.dest.name; clearRoute(true);
    say('Hedefe ulaştınız.'); toast(`Hedefe ulaştın · ${name}`,5000); return;
  }
  // Rotadan çıkınca yeniden hesapla
  if(pr.off>70 && (lastPos.acc||0)<60) nav.offCount++; else nav.offCount=0;
  if(nav.offCount>=3 && Date.now()-nav.lastReroute>15000){
    nav.lastReroute=Date.now(); nav.offCount=0;
    say('Rotadan çıktınız. Rota yeniden hesaplanıyor.');
    startRoute(nav.dest,true);
  }
  // Sonraki manevra ve sesli tarif
  const next=nav.steps.find(s=>s.along>nav.carAlong+8)||null;
  nav.next=next;
  if(next){
    const d=next.along-nav.carAlong, kmh=lastPos.kmh||0;
    const far=clamp(kmh*14,250,1200);
    if(d<=far && d>120 && !nav.spoken.has(next.id+'f')){
      nav.spoken.add(next.id+'f');
      say(`${fmtSpeak(d)} sonra ${next.text}.`+(next.name?` ${next.name.replace(/\.+$/,'')}.`:''));
    }
    if(d<=Math.max(60,kmh*2.5) && !nav.spoken.has(next.id+'n')){
      nav.spoken.add(next.id+'n'); nav.spoken.add(next.id+'f');
      say(cap(next.text)+'.');
    }
  }
  const eta=nav.duration*(remain/nav.total);
  const arr=new Date(Date.now()+eta*1000).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
  const ahead=nav.hz.filter(x=>x.along>nav.carAlong-20&&visible(x.h)).length;
  $('trip').hidden=false;
  $('tripMain').textContent=`${fmtKm(remain)} · ${fmtDur(eta)}`;
  $('tripSub').textContent=`Varış ${arr}`+(ahead?` · ${ahead} uyarı`:'');
  renderNavCard();
}

let navKey='';
function renderNavCard(){
  const el=$('navcard');
  if(!nav){ el.hidden=true; navKey=''; return; }
  const n=nav.next, d=n?n.along-nav.carAlong:nav.total-nav.carAlong;
  el.classList.toggle('soon',d<150);   // dönüşe az kaldı: kart belirginleşir
  const key=(n?n.id:'end')+'|'+Math.round(d/10);
  if(key===navKey) return; navKey=key;
  el.hidden=false;
  el.innerHTML=`<div class="arrow">${ic(n?n.icon:'t_arrive')}</div><div class="txt"><div class="nd">${fmtD(d)}</div><div class="ni"></div><div class="nn"></div></div>`;
  el.querySelector('.ni').textContent=n?cap(n.text):'Hedefe doğru devam edin';
  el.querySelector('.nn').textContent=n?(n.name||''):nav.dest.name;
}

function addRecent(p){
  const list=store.get('recent',[]).filter(x=>dist(x,p)>50);
  list.unshift({lat:p.lat,lng:p.lng,name:p.name,sub:p.sub||''});
  store.set('recent',list.slice(0,6));
}
async function geocode(q){
  const u=new URL('https://nominatim.openstreetmap.org/search');
  u.searchParams.set('q',q); u.searchParams.set('format','jsonv2'); u.searchParams.set('limit','8'); u.searchParams.set('accept-language','tr');
  if(lastPos){ const d=1.5; u.searchParams.set('viewbox',`${lastPos.lng-d},${lastPos.lat+d},${lastPos.lng+d},${lastPos.lat-d}`); }
  const r=await fetch(u); if(!r.ok) throw new Error(r.status);
  return (await r.json()).map(x=>{ const parts=(x.display_name||'').split(', ');
    return {lat:+x.lat,lng:+x.lon,name:x.name||parts[0],sub:parts.slice(1,4).join(', ')}; });
}
async function reverseName(lat,lng){
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17&accept-language=tr`);
    if(!r.ok) return null;
    const x=await r.json(); const parts=(x.display_name||'').split(', ');
    return {name:x.name||parts[0]||'Seçilen nokta',sub:parts.slice(1,3).join(', ')};
  }catch(e){ return null; }
}
function placeItem(p,icon){
  const b=document.createElement('button'); b.className='item'; b.type='button';
  b.innerHTML=`${ic(icon)}<span class="lab"><b></b><small></small></span>${lastPos?`<span class="km">${fmtKm(dist(lastPos,p))}</span>`:''}`;
  b.querySelector('b').textContent=p.name; b.querySelector('small').textContent=p.sub||'';
  b.onclick=()=>{ closeSheet(); startRoute(p); };
  return b;
}
function openSearch(){
  const rec=store.get('recent',[]);
  openSheet(`<h3>Nereye gideceksin?</h3>
    <form class="search" id="sForm"><input id="sQ" type="search" placeholder="Adres, yer veya şehir" autocomplete="off" enterkeyhint="search" aria-label="Hedef ara"><button type="submit">Ara</button></form>
    <div class="list" id="sRes"></div>
    <p class="note">Haritada bir yere uzun basarak da hedef seçebilirsin.</p>`);
  const res=$('sRes');
  if(rec.length){ const h=document.createElement('h4'); h.textContent='Son gidilenler'; res.appendChild(h); rec.forEach(p=>res.appendChild(placeItem(p,'clock'))); }
  $('sForm').onsubmit=async e=>{
    e.preventDefault();
    const q=$('sQ').value.trim(); if(!q) return;
    $('sQ').blur();
    res.innerHTML='<p class="note">Aranıyor…</p>';
    try{
      const list=await geocode(q);
      res.innerHTML='';
      if(!list.length) res.innerHTML='<p class="note">Sonuç bulunamadı. Şehir adıyla birlikte yazmayı dene (ör. "Kızılay Ankara").</p>';
      list.forEach(p=>res.appendChild(placeItem(p,'pin')));
    }catch(err){ res.innerHTML='<p class="note">Arama yapılamadı. İnternet bağlantını kontrol et.</p>'; }
  };
  setTimeout(()=>{ const i=$('sQ'); if(i) i.focus(); },60);
}
function openPointMenu(lat,lng){
  const p={lat,lng,name:'Haritada seçilen nokta',sub:`${lat.toFixed(5)}, ${lng.toFixed(5)}`};
  openSheet(`<h3>Bu nokta</h3><div class="meta" id="pmName"></div>
    <div class="choice"><button class="go2" id="pmGo">${ic('route')}Buraya git</button><button id="pmRep">${ic('alert')}Burayı bildir</button></div>`);
  $('pmName').textContent=p.sub+(lastPos?` · ${fmtKm(dist(lastPos,p))} uzakta`:'');
  reverseName(lat,lng).then(n=>{ if(!n) return; p.name=n.name; p.sub=n.sub; const el=$('pmName');
    if(el) el.textContent=n.name+(n.sub?' · '+n.sub:''); });
  $('pmGo').onclick=()=>{ closeSheet(); startRoute(p); };
  $('pmRep').onclick=()=>openReport(lat,lng,null,'Haritada seçilen nokta');
}
function openRouteList(){
  if(!nav) return;
  const ahead=nav.hz.filter(x=>x.along>nav.carAlong-20&&visible(x.h));
  const remain=Math.max(0,nav.total-nav.carAlong);
  openSheet(`<h3 id="rlT"></h3><div class="meta">${fmtKm(remain)} kaldı · ${fmtDur(nav.duration*remain/nav.total)}</div>
    <h4>Rotadaki uyarılar (${ahead.length})</h4><div class="list" id="rl"></div>
    <button class="wide" id="rlEnd" style="background:#B3242A;color:#fff">Rotayı bitir</button>`);
  $('rlT').textContent=nav.dest.name;
  const l=$('rl');
  if(!ahead.length) l.innerHTML='<p class="note">Rota üzerinde bilinen radar veya tehlike yok.</p>';
  for(const x of ahead){
    const h=x.h, masked=cfg.zone&&TYPES[h.type].enf;
    const b=document.createElement('button'); b.className='item'; b.type='button';
    b.innerHTML=`<span class="dot2" style="background:${masked?'#46525C':TYPES[h.type].color}">${ic(masked?'zone':hIcon(h))}</span><span class="lab"><b></b><small></small></span><span class="km">${fmtKm(Math.max(0,x.along-nav.carAlong))}</span>`;
    b.querySelector('b').textContent=masked?'Denetim bölgesi':hTitle(h);
    b.querySelector('small').textContent=[h.limit&&!masked?`Sınır ${h.limit} km/s`:null,h.source==='osm'?'OpenStreetMap':'Sürücü bildirimi'].filter(Boolean).join(' · ');
    b.onclick=()=>{ follow=false; $('recenter').hidden=false; map.setView([h.lat,h.lng],16); openHazard(h); };
    l.appendChild(b);
  }
  $('rlEnd').onclick=()=>{ closeSheet(); clearRoute(); say('Rota bitirildi.'); };
}

// ---------- Trafik yoğunluğu ----------
// 1) Kullanıcıların anonim hız örnekleri (kimlik gönderilmez, sunucu yalnızca konum+hız+yön tutar)
// 2) Yönetici TomTom anahtarı girdiyse tüm dünyada canlı trafik katmanı
let speedBuf=[], lastSampleT=0, lastFlush=Date.now();
function collectSample(){
  if(!api||!cfg.shareSpeed||srv.traffic_enabled===false||!lastPos) return;
  const now=Date.now();
  if(lastPos.kmh>3 && lastPos.heading!=null && (lastPos.acc||99)<40 && now-lastSampleT>8000){
    lastSampleT=now;
    speedBuf.push([+lastPos.lat.toFixed(5),+lastPos.lng.toFixed(5),Math.round(lastPos.kmh),Math.round(lastPos.heading)%360,now]);
  }
  if(speedBuf.length && navigator.onLine!==false && (speedBuf.length>=20 || now-lastFlush>30000)){
    const batch=speedBuf.splice(0,40); lastFlush=now;
    fetch(api+'?action=samples',{method:'POST',headers:apiHeaders(),body:JSON.stringify({s:batch})})
      .catch(()=>{ if(speedBuf.length<200) speedBuf.unshift(...batch.filter(x=>now-x[4]<10*60000)); });
  }
}
const TRAF_COL=['#2FBF71','#F59E0B','#E5484D'];
const trafRenderer=L.canvas({padding:0.3});
let trafLayer=null, ttLayer=null, trafCells=[], trafTimer=null, trafBusy=false, lastJamWarn=0, trafAt=null, lastJamCheck=0;
// Her konum güncellemesinde: 1,5 km ilerlendiyse veriyi yenile, önündeki yoğunluğu kontrol et
function trafficOnFix(){
  if(!api||srv.traffic_enabled===false||!lastPos) return;
  if((cfg.traffic||lastPos.kmh>15) && (!trafAt||dist(trafAt,lastPos)>1500)) loadTraffic();
  if(Date.now()-lastJamCheck>3000){ lastJamCheck=Date.now(); checkTrafficAhead(); }
}
const trafficAvailable=()=>!!(srv.tomtom_key||(api&&srv.traffic_enabled!==false));
function setTraffic(on){
  cfg.traffic=on; saveCfg();
  $('trafficBtn').classList.toggle('on',on); $('traflegend').hidden=!on;
  if(ttLayer){ map.removeLayer(ttLayer); ttLayer=null; }
  if(trafLayer){ map.removeLayer(trafLayer); trafLayer=null; }
  if(!on) return;
  if(srv.tomtom_key) ttLayer=L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${encodeURIComponent(srv.tomtom_key)}&tileSize=256`,
    {opacity:.85,maxZoom:22,zIndex:5,attribution:'Trafik © TomTom'}).addTo(map);
  if(api&&srv.traffic_enabled!==false){ trafLayer=L.layerGroup().addTo(map); loadTraffic(); }
}
function startTrafficTimer(){
  clearInterval(trafTimer);
  if(!api||srv.traffic_enabled===false) return;
  // Katman açıkken 30 sn'de bir; kapalıyken de sürüşte önündeki yoğunluğu uyarmak için
  trafTimer=setInterval(()=>{ if(cfg.traffic||(lastPos&&lastPos.kmh>15)) loadTraffic(); },30000);
}
async function loadTraffic(){
  if(!api||trafBusy||navigator.onLine===false||srv.traffic_enabled===false) return;
  // Aracın çevresi (~4 km, önündeki yoğunluğu uyarmak için) + katman açıksa ekrandaki alan
  let bb=null;
  if(lastPos){ const d=0.036; bb=[lastPos.lat-d,lastPos.lng-d*1.3,lastPos.lat+d,lastPos.lng+d*1.3]; trafAt={lat:lastPos.lat,lng:lastPos.lng}; }
  if(trafLayer && map.getZoom()>=11){ const b=map.getBounds().pad(0.15), v=[b.getSouth(),b.getWest(),b.getNorth(),b.getEast()];
    bb=bb?[Math.min(bb[0],v[0]),Math.min(bb[1],v[1]),Math.max(bb[2],v[2]),Math.max(bb[3],v[3])]:v; }
  if(!bb) return;
  if(Math.abs(bb[2]-bb[0])>1.4||Math.abs(bb[3]-bb[1])>1.9){ if(trafLayer) trafLayer.clearLayers(); return; }
  trafBusy=true;
  try{
    const r=await fetch(`${api}?action=traffic&bbox=${bb.map(v=>v.toFixed(4)).join(',')}`,{headers:{'X-Device-Id':deviceId},cache:'no-store'});
    if(r.ok){ trafCells=await r.json(); drawTraffic(); checkTrafficAhead(); }
  }catch(e){} finally{ trafBusy=false; }
}
function drawTraffic(){
  if(!trafLayer) return;
  trafLayer.clearLayers();
  for(const c of trafCells){
    const a=destPoint(c,(c.h+180)%360,70), b=destPoint(c,c.h,70);
    L.polyline([[a.lat,a.lng],[b.lat,b.lng]],{renderer:trafRenderer,color:TRAF_COL[c.l]||TRAF_COL[0],weight:7,opacity:.9,lineCap:'round',interactive:false}).addTo(trafLayer);
  }
}
let trafMoveT;
map.on('moveend',()=>{ if(!trafLayer||follow) return; clearTimeout(trafMoveT); trafMoveT=setTimeout(loadTraffic,1200); });
function checkTrafficAhead(){
  if(!lastPos||!trafCells.length||Date.now()-lastJamWarn<5*60000) return;
  let best=null;
  for(const c of trafCells){
    if(c.l<2) continue;
    let d;
    if(nav){ const pr=project(c); if(pr.off>50||angDiff(c.h,routeBearingAt(pr.i))>60) continue; d=pr.along-nav.carAlong; }
    else{ if(lastPos.heading==null||lastPos.kmh<10) continue; d=dist(lastPos,c);
      if(angDiff(bearing(lastPos,c),lastPos.heading)>25||angDiff(c.h,lastPos.heading)>50) continue; }
    if(d<250||d>4000) continue;
    if(best==null||d<best) best=d;
  }
  if(best!=null){ lastJamWarn=Date.now(); say(`Dikkat, ${fmtSpeak(best)} sonra yoğun trafik.`,true); }
}

// ---------- Çevrimdışı haritalar: ülke / il / ilçe / mahalle, ekrandaki alan, rota boyunca ----------
const KIND_TR={country:'Ülke',state:'İl',province:'İl',city:'İl / şehir',county:'İlçe',municipality:'İlçe',town:'İlçe',district:'İlçe',
  borough:'İlçe',suburb:'Mahalle',quarter:'Mahalle',neighbourhood:'Mahalle',village:'Köy',hamlet:'Köy',view:'Ekrandaki alan',route:'Rota boyunca'};
const DEFAULT_Z={country:9,state:13,province:13,city:13,county:14,municipality:14,town:14,district:14,borough:14,suburb:14,quarter:14,neighbourhood:14,village:14,hamlet:14,view:14,route:14};
const AVG_TILE_KB=z=>z<=8?35:z<=11?25:z<=13?14:10;   // tahmini ortalama parça boyutu
function tileRange(b,z){
  const n=2**z, ty=lat=>Math.floor((1-Math.asinh(Math.tan(rad(clamp(lat,-85,85))))/Math.PI)/2*n);
  return {x0:clamp(Math.floor((b.w+180)/360*n),0,n-1),x1:clamp(Math.floor((b.e+180)/360*n),0,n-1),y0:clamp(ty(b.n),0,n-1),y1:clamp(ty(b.s),0,n-1)};
}
function* regionTiles(reg){
  const seen=new Set();
  for(let z=reg.minz;z<=reg.maxz;z++) for(const b of reg.boxes){
    const r=tileRange(b,z);
    for(let x=r.x0;x<=r.x1;x++) for(let y=r.y0;y<=r.y1;y++){ const k=z+'/'+x+'/'+y; if(!seen.has(k)){ seen.add(k); yield k; } }
  }
}
function estimate(reg){ let n=0,kb=0; for(const k of regionTiles(reg)){ n++; kb+=AVG_TILE_KB(+k.split('/')[0]); if(n>400000) break; } return {n,mb:Math.round(kb/1024)}; }
const fmtMB=mb=>mb>=1024?`${(mb/1024).toFixed(1).replace('.',',')} GB`:`${Math.max(1,Math.round(mb))} MB`;
function routeBoxes(){
  if(!nav) return [];
  const out=[], pad=0.015; let last=-1e9;
  for(let i=0;i<nav.coords.length;i++){
    if(nav.cum[i]-last<1500 && i<nav.coords.length-1) continue; last=nav.cum[i];
    const [la,lo]=nav.coords[i], dl=pad/Math.max(0.2,Math.cos(rad(la)));
    out.push({s:la-pad,n:la+pad,w:lo-dl,e:lo+dl});
  }
  return out;
}
let dl=null;   // süren indirme
async function downloadRegion(reg){
  if(!vtiles||!vtiles.remote){ toast('Harita dosyasına ulaşılamıyor. İnternet bağlantını kontrol et.',4000); return; }
  if(dl){ toast('Başka bir indirme sürüyor.'); return; }
  try{ if(navigator.storage&&navigator.storage.persist) await navigator.storage.persist(); }catch(e){}
  reg.status='downloading'; reg.created=Date.now(); reg.done=0; reg.bytes=0;
  await idbDo('regions','readwrite',s=>s.put(reg));
  const keys=[...regionTiles(reg)]; reg.total=keys.length;
  dl={reg,cancel:false,done:0,fail:0};
  showDlBar();
  let i=0;
  const worker=async()=>{
    while(!dl.cancel && i<keys.length){
      const k=keys[i++];
      try{
        const rec=await tileGet(k);
        if(rec){ if(!rec.r.includes(reg.id)){ rec.r.push(reg.id); await idbDo('tiles','readwrite',s=>s.put(rec,k)); } reg.bytes+=rec.d.byteLength; }
        else{
          const [z,x,y]=k.split('/').map(Number);
          const t=await vtiles.remote.getZxy(z,x,y);
          if(t&&t.data){ await idbDo('tiles','readwrite',s=>s.put({d:t.data,r:[reg.id],a:0},k)); reg.bytes+=t.data.byteLength; }
        }
      }catch(e){ dl.fail++; if(navigator.onLine===false){ dl.cancel=true; } }
      dl.done++;
      if(dl.done%25===0) showDlBar();
    }
  };
  await Promise.all(Array.from({length:6},worker));
  const cancelled=dl.cancel;
  reg.done=dl.done; reg.status=cancelled?'partial':(dl.fail?'partial':'ready');
  await idbDo('regions','readwrite',s=>s.put(reg));
  const fail=dl.fail; dl=null; showDlBar();
  if(cancelled) toast('İndirme durduruldu. Bölgeyi açıp "Devam et" diyerek kaldığın yerden sürdürebilirsin.',5000);
  else toast(fail?`${reg.name} indirildi, ${fail} parça alınamadı (tekrar dene).`:`${reg.name} indirildi · ${fmtMB(reg.bytes/1048576)}. İnternetsiz kullanılabilir.`,5000);
  if(!$('sheet').hidden && $('offList')) openOffline();
}
function showDlBar(){
  const el=$('dlbar');
  if(!dl){ el.hidden=true; return; }
  el.hidden=false;
  const pct=Math.floor(dl.done/Math.max(1,dl.reg.total)*100);
  el.innerHTML=`<span>${ic('download')}</span><span class="dlt"></span><b>%${pct}</b><button id="dlStop" aria-label="İndirmeyi durdur">${ic('x')}</button><i style="width:${pct}%"></i>`;
  el.querySelector('.dlt').textContent=dl.reg.name;
  $('dlStop').onclick=()=>{ if(dl) dl.cancel=true; };
}
async function deleteRegion(reg){
  for(const k of regionTiles(reg)){
    const rec=await tileGet(k); if(!rec) continue;
    rec.r=rec.r.filter(id=>id!==reg.id);
    await idbDo('tiles','readwrite',s=>(rec.r.length||rec.a)?s.put(rec,k):s.delete(k));
  }
  await idbDo('regions','readwrite',s=>s.delete(reg.id));
}
async function clearAutoCache(){
  const d=await idb();
  await new Promise((ok,no)=>{ const tx=d.transaction('tiles','readwrite'); const st=tx.objectStore('tiles');
    const c=st.openCursor(); c.onsuccess=()=>{ const cur=c.result; if(!cur) return;
      const v=cur.value; if(v.a){ if(v.r&&v.r.length){ v.a=0; cur.update(v); } else cur.delete(); } cur.continue(); };
    tx.oncomplete=ok; tx.onerror=()=>no(tx.error); });
}
async function openOffline(){
  let regions=[]; try{ regions=await idbDo('regions','readonly',s=>s.getAll()); }catch(e){}
  let est=null; try{ est=navigator.storage&&await navigator.storage.estimate(); }catch(e){}
  const ok=!!TILES_URL;
  openSheet(`<h3>Çevrimdışı haritalar</h3>
    ${ok?`<p class="note">İndirdiğin bölgelerde internet yokken de harita görünür; radar uyarıları ve hız sınırı çalışmaya devam eder. Rota ve adres araması için internet gerekir.</p>`
       :`<p class="note">Çevrimdışı harita için sunucuda Türkiye harita dosyasının kurulu olması gerekiyor (Yönetim paneli → Ayarlar → Harita dosyası). Şu an OpenStreetMap'in çevrimiçi haritası kullanılıyor; onun kuralları indirmeye izin vermiyor.</p>`}
    ${est&&est.usage!=null?`<div class="meta">Telefonda kullanılan alan: ${fmtMB(est.usage/1048576)}${est.quota?` / ${fmtMB(est.quota/1048576)}`:''}</div>`:''}
    ${ok?`<button class="wide" id="offAdd">${ic('download')} Bölge indir</button>`:''}
    <h4>İndirilen bölgeler</h4><div class="list" id="offList"></div>
    <label class="sw">${ic('route')}<span class="lab">Gezdiğim yerleri otomatik sakla<small>Haritada baktığın yerler telefonda saklanır, sonra internetsiz de açılır.</small></span><input type="checkbox" id="offAuto" ${cfg.autoCache?'checked':''}></label>
    <button class="vbtn no" id="offClear" style="width:100%">Otomatik saklananları temizle</button>`);
  const l=$('offList');
  if(!regions.length) l.innerHTML='<p class="note">Henüz indirilmiş bölge yok.</p>';
  for(const r of regions.sort((a,b)=>b.created-a.created)){
    const b=document.createElement('div'); b.className='item';
    const st=r.status==='ready'?'Hazır':r.status==='downloading'&&dl&&dl.reg.id===r.id?'İndiriliyor…':'Yarım kaldı';
    b.innerHTML=`${ic('map')}<span class="lab"><b></b><small></small></span>
      ${r.status!=='ready'&&!(dl&&dl.reg.id===r.id)?`<button class="chip" data-a="resume">Devam et</button>`:''}<button class="chip" data-a="del" aria-label="Sil">${ic('x')}</button>`;
    b.querySelector('b').textContent=r.name;
    b.querySelector('small').textContent=`${KIND_TR[r.kind]||''} · ${st} · ${fmtMB((r.bytes||0)/1048576)} · ayrıntı ${r.maxz}`;
    b.querySelector('[data-a=del]').onclick=async()=>{ if(dl&&dl.reg.id===r.id){ dl.cancel=true; return; } b.style.opacity=.5; await deleteRegion(r); toast(`${r.name} silindi`); openOffline(); };
    const res=b.querySelector('[data-a=resume]'); if(res) res.onclick=()=>{ closeSheet(); downloadRegion(r); };
    l.appendChild(b);
  }
  if(ok) $('offAdd').onclick=openRegionPicker;
  $('offAuto').onchange=e=>{ cfg.autoCache=e.target.checked; saveCfg(); };
  $('offClear').onclick=async()=>{ await clearAutoCache(); toast('Otomatik saklanan harita parçaları silindi'); openOffline(); };
}
function openRegionPicker(){
  openSheet(`<h3>Hangi bölgeyi indirelim?</h3>
    <form class="search" id="rgForm"><input id="rgQ" type="search" placeholder="Ülke, il, ilçe veya mahalle" autocomplete="off" enterkeyhint="search" aria-label="Bölge ara"><button type="submit">Ara</button></form>
    <div class="list" id="rgRes"></div>
    <div class="list">
      <button class="item" id="rgView">${ic('zone')}<span class="lab"><b>Ekranda görünen alan</b><small>Haritayı istediğin yere getirip bunu seç</small></span></button>
      ${nav?`<button class="item" id="rgRoute">${ic('route')}<span class="lab"><b>Rota boyunca</b><small id="rgRouteS"></small></span></button>`:''}
    </div>`);
  $('rgForm').onsubmit=async e=>{
    e.preventDefault(); const q=$('rgQ').value.trim(); if(!q) return; $('rgQ').blur();
    const res=$('rgRes'); res.innerHTML='<p class="note">Aranıyor…</p>';
    try{
      const u=new URL('https://nominatim.openstreetmap.org/search');
      u.searchParams.set('q',q); u.searchParams.set('format','jsonv2'); u.searchParams.set('limit','8'); u.searchParams.set('accept-language','tr');
      const list=await (await fetch(u)).json();
      res.innerHTML='';
      if(!list.length) res.innerHTML='<p class="note">Bulunamadı. Örnek: "Kadıköy", "Ankara", "Moda Mahallesi Kadıköy".</p>';
      for(const x of list){
        const bb=(x.boundingbox||[]).map(Number); if(bb.length!==4) continue;
        const kind=x.addresstype||x.type||'view';
        const b=document.createElement('button'); b.className='item'; b.type='button';
        b.innerHTML=`${ic('pin')}<span class="lab"><b></b><small></small></span><span class="chip">${KIND_TR[kind]||'Bölge'}</span>`;
        b.querySelector('b').textContent=x.name||x.display_name.split(',')[0];
        b.querySelector('small').textContent=x.display_name.split(', ').slice(1,4).join(', ');
        b.onclick=()=>confirmRegion({name:x.name||x.display_name.split(',')[0],kind,boxes:[{s:bb[0],n:bb[1],w:bb[2],e:bb[3]}]});
        res.appendChild(b);
      }
    }catch(err){ res.innerHTML='<p class="note">Arama için internet gerekiyor.</p>'; }
  };
  $('rgView').onclick=()=>{ const b=map.getBounds(); confirmRegion({name:'Seçilen alan '+new Date().toLocaleDateString('tr-TR'),kind:'view',
    boxes:[{s:b.getSouth(),n:b.getNorth(),w:b.getWest(),e:b.getEast()}]}); };
  if(nav){ $('rgRouteS').textContent=`${nav.dest.name} · ${fmtKm(nav.total)}, yolun iki yanı 1,5 km`;
    $('rgRoute').onclick=()=>confirmRegion({name:'Rota: '+nav.dest.name,kind:'route',boxes:routeBoxes()}); }
  setTimeout(()=>{ const i=$('rgQ'); if(i) i.focus(); },60);
}
function confirmRegion(base){
  const levels=[[10,'Az ayrıntı','ana yollar, şehirler'],[12,'Orta','tüm ana caddeler'],[13,'Ayrıntılı','sokaklar'],[Math.min(14,tilesMaxZoom),'Tam ayrıntı','tüm sokaklar ve isimler']];
  let maxz=Math.min(DEFAULT_Z[base.kind]||13,tilesMaxZoom);
  const render=()=>{
    const reg={...base,id:'r'+Date.now().toString(36),minz:0,maxz};
    const e=estimate(reg);
    openSheet(`<h3 id="crT"></h3><div class="meta">${KIND_TR[base.kind]||'Bölge'}</div>
      <h4>Ayrıntı düzeyi</h4>
      <div class="chips">${levels.filter((l,i,a)=>a.findIndex(x=>x[0]===l[0])===i).map(([z,l,d])=>`<button class="chip" data-z="${z}" aria-pressed="${z===maxz}" title="${d}">${l}</button>`).join('')}</div>
      <p class="note">Yaklaşık ${e.n.toLocaleString('tr-TR')} harita parçası · tahmini ${fmtMB(e.mb)}${e.mb>800?'. Bu çok büyük; daha az ayrıntı seç ya da daha küçük bir bölge indir.':''}${base.kind==='country'?' Ülke için düşük ayrıntı önerilir; gideceğin il veya rotayı ayrıca tam ayrıntıyla indirebilirsin.':''}</p>
      <p class="note">Wi-Fi'de indirmen önerilir. İndirme sürerken uygulamayı kullanmaya devam edebilirsin.</p>
      <button class="wide" id="crGo" ${e.n>400000?'disabled':''}>${ic('download')} İndir</button>`);
    $('crT').textContent=base.name;
    $('sheet').querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>{ maxz=+b.dataset.z; render(); });
    $('crGo').onclick=()=>{ closeSheet(); downloadRegion(reg); toast('İndirme başladı'); };
  };
  render();
}
window.addEventListener('online',()=>{ toast('İnternet bağlantısı geri geldi'); setModeLine(); });
window.addEventListener('offline',()=>{ toast('İnternet yok: indirilen haritalar ve kayıtlı uyarılar kullanılıyor',4500); });

// ---------- Uygulamanın internetsiz açılması ----------
function registerSW(){
  try{ if('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js').then(r=>{ swReg=r; }).catch(()=>{}); }catch(e){}
}
function restoreRemoteCache(){
  // Son alınan sunucu uyarılarını (internet gelene kadar) göster
  const c=store.get('remoteCache',null);
  if(!c||!Array.isArray(c.list)||Date.now()-c.at>24*3600e3) return;
  for(const m of c.list){ const h=fromApi(m); if(!h.exp||h.exp>Date.now()) remote.set(h.id,h); }
  dataChanged();
}

// ---------- HUD ----------
function status(){
  const dot=$('dot');
  dot.className='dot '+(fbState==='live'?'live':fbState==='error'||!(FIREBASE_CONFIG||api)?'warn':'');
}
let bannerKey='';
function hud(){
  const kmh=lastPos?Math.round(lastPos.kmh):null;
  $('spd').textContent=kmh==null?'–':kmh;
  const a=alertNow, masked=a && cfg.zone && TYPES[a.h.type].enf;
  const lim=a && !masked ? a.h.limit : null;
  const effLim=lim||curLimit;
  $('speedo').classList.toggle('over',!!(effLim && kmh>effLim+2));
  const cl=$('curlim'); if(curLimit){ cl.hidden=false; cl.textContent=curLimit; } else cl.hidden=true;
  renderAvg();
  if(!a){
    $('banner').hidden=true; $('idle').hidden=false; bannerKey='';
    if(lastPos){
      const gps=lastPos.acc>50?` · GPS ±${Math.round(lastPos.acc)} m`:'';
      if(nav){ const n=nav.hz.filter(x=>x.along>nav.carAlong-20&&visible(x.h)).length;
        $('idleText').innerHTML=`<b>Önünde uyarı yok</b> · rotada ${n} nokta`+gps; }
      else { const n=allHazards().filter(h=>visible(h)&&dist(lastPos,h)<15000).length;
        $('idleText').innerHTML=`<b>Önünde uyarı yok</b> · çevrede ${n} nokta`+gps; }
    }
    return;
  }
  const key=`${a.h.id}|${Math.round(a.d/10)}|${cfg.zone}`; if(key===bannerKey) return; bannerKey=key;
  const b=$('banner'); $('idle').hidden=true; b.hidden=false;
  b.style.background=masked?'#46525C':TYPES[a.h.type].color;
  b.innerHTML=`<div class="tile">${ic(masked?'zone':hIcon(a.h))}</div><div class="txt"><div class="dist">${fmtD(a.d)}</div><div class="what"></div></div>${lim?`<div class="limit">${lim}</div>`:''}`;
  b.querySelector('.what').textContent=masked?'Denetim bölgesi':hTitle(a.h);
  b.onclick=()=>openHazard(a.h);
}
setInterval(()=>{ // süresi dolanları düşür
  localReports=localReports.filter(h=>!isExpired(h)); dataChanged(); },30000);

// ---------- Başlat ----------
let wakeLock=null;
async function keepAwake(){ try{ if('wakeLock' in navigator && document.visibilityState==='visible') wakeLock=await navigator.wakeLock.request('screen'); }catch(e){} }
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible' && watchId!=null) keepAwake(); });
// Android uygulamasından gelen konumlar (ekran kapalıyken de)
window.YU={
  nativeFix:(lat,lng,acc,speed,heading,ts)=>onFix({timestamp:ts||Date.now(),coords:{latitude:lat,longitude:lng,accuracy:acc,speed:speed,heading:heading}}),
  nativeError:msg=>{ $('idleText').textContent=msg; },
};
$('go').onclick=async()=>{
  $('startErr').hidden=true;
  try{ actx=actx||new (window.AudioContext||window.webkitAudioContext)(); actx.resume(); }catch(e){}
  if(native.ok()){
    const res=await native.call('startTracking');
    if(res && res!=='ok'){ $('startErr').textContent=res; $('startErr').hidden=false; return; }
    $('start').hidden=true;
    if(watchId==null){ watchId='native'; say('Yol Uyarı aktif. İyi yolculuklar.'); }
    return;
  }
  if(!('geolocation' in navigator)){ $('startErr').textContent='Bu tarayıcı konumu desteklemiyor.'; $('startErr').hidden=false; return; }
  if(window.isSecureContext===false){ $('startErr').textContent='Konum yalnızca güvenli (https://) adreste çalışır. Dosyayı bir https adresinde yayınla.'; $('startErr').hidden=false; return; }
  $('start').hidden=true;
  if(watchId==null) say('Yol Uyarı aktif. İyi yolculuklar.');
  keepAwake(); setupNotifications();
  if(watchId==null) watchId=navigator.geolocation.watchPosition(onFix,onGeoErr,{enableHighAccuracy:true,maximumAge:1000,timeout:20000});
};
setModeLine(); status(); initBackend().finally(detectTiles); syncMarkers(); loadBundled(); registerSW(); restoreRemoteCache();

// ---------- Kontroller ----------
$('recenter').onclick=startFollow;
$('trafficBtn').innerHTML=ic('traffic');
$('trafficBtn').onclick=()=>{ if(!trafficAvailable()) return toast('Trafik için sunucu bağlantısı ya da yöneticinin TomTom anahtarı gerekiyor.',4500);
  setTraffic(!cfg.traffic); toast(cfg.traffic?'Trafik yoğunluğu açık':'Trafik yoğunluğu kapalı'); };
$('compass').onclick=()=>{ cfg.northUp=!cfg.northUp; saveCfg(); startFollow();
  toast(cfg.northUp?'Harita: kuzey yukarı':'Harita: gidiş yönü yukarı'); };
$('voiceBtn').onclick=()=>{ cfg.voice=!cfg.voice; saveCfg(); $('voiceBtn').innerHTML=ic(cfg.voice?'vol':'mute'); $('voiceBtn').classList.toggle('off',!cfg.voice);
  if(!cfg.voice && 'speechSynthesis' in window) speechSynthesis.cancel(); toast(cfg.voice?'Sesli uyarı açık':'Sesli uyarı kapalı'); };
$('fab').onclick=()=>{ if(!lastPos) return toast('Konum bekleniyor… Haritaya uzun basarak da bildirebilirsin.');
  openReport(lastPos.lat,lastPos.lng, lastPos.kmh>10?lastPos.heading:null,'Bulunduğun konum'); };
$('setBtn').onclick=openSettings;
$('searchBtn').innerHTML=ic('search'); $('searchBtn').onclick=openSearch;
$('tripEnd').innerHTML=ic('x'); $('tripEnd').onclick=()=>{ clearRoute(); say('Rota bitirildi.'); };
$('tripInfo').onclick=openRouteList;
$('navcard').onclick=openRouteList;

// ---------- Alt sayfalar ----------
function openSheet(html){ $('sheet').innerHTML='<div class="grab"></div>'+html; $('sheet').hidden=false; $('scrim').hidden=false; }
function closeSheet(){ $('sheet').hidden=true; $('scrim').hidden=true; }
$('scrim').onclick=closeSheet;
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeSheet(); });

function openReport(lat,lng,heading,where){
  const r={type:null,sub:null,limit:null};
  const render=()=>{
    const enf=r.type && TYPES[r.type].enf;
    openSheet(`<h3>Ne bildirmek istiyorsun?</h3><div class="meta">${where}</div>
      <div class="grid3">${Object.entries(TYPES).filter(([k])=>!api||!srv.report_types||srv.report_types.includes(k)).map(([k,v])=>`<button class="tt" data-t="${k}" style="background:${r.type===k?v.color:v.color+'26'};color:${r.type===k?'#fff':v.color};border-color:${r.type===k?v.color:'transparent'}">${ic(v.icon)}<span style="color:${r.type===k?'#fff':'var(--fg)'}">${v.label}</span></button>`).join('')}</div>
      ${r.type==='natural'?`<h4>Olay türü</h4><div class="chips">${Object.entries(SUB).map(([k,[l,i]])=>`<button class="chip" data-s="${k}" aria-pressed="${r.sub===k}">${ic(i)}${l}</button>`).join('')}</div>`:''}
      ${r.type==='eds'?`<h4>EDS türü</h4><div class="chips">${[['','Tek nokta'],['avgStart','Ortalama hız başlangıcı'],['avgEnd','Ortalama hız bitişi']].map(([k,l])=>`<button class="chip" data-e="${k}" aria-pressed="${(r.sub||'')===k}">${l}</button>`).join('')}</div>`:''}
      ${enf?`<h4>Hız sınırı (isteğe bağlı)</h4><div class="chips">${[30,50,70,82,90,110,120,140].map(l=>`<button class="chip" data-l="${l}" aria-pressed="${r.limit===l}">${l}</button>`).join('')}</div>`:''}
      <button class="wide" id="send" ${r.type&&(r.type!=='natural'||r.sub)?'':'disabled'}>Bildir</button>`);
    const sh=$('sheet');
    sh.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ r.type=b.dataset.t; r.sub=null; r.limit=null; render(); });
    sh.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{ r.sub=b.dataset.s; render(); });
    sh.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{ r.sub=b.dataset.e||null; render(); });
    sh.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{ const l=+b.dataset.l; r.limit=r.limit===l?null:l; render(); });
    $('send').onclick=async()=>{
      const enfT=TYPES[r.type].enf;
      const d={type:r.type,sub:(r.type==='natural'||r.type==='eds')?r.sub:null,lat,lng,heading:enfT?heading:null,limit:enfT?r.limit:null};
      $('send').disabled=true;
      try{ await report(d); closeSheet(); toast(shared()?'Bildirildi. Çevredeki herkes görüyor.':'Bildirildi (yerel mod: yalnızca bu cihazda).'); }
      catch(e){ $('send').disabled=false; toast('Gönderilemedi: '+(e.code||e.message),5000); }
    };
  };
  render();
}
function ago(ms){ if(!ms) return null; const m=Math.round((Date.now()-ms)/60000); if(m<1) return 'az önce'; if(m<60) return `${m} dk önce`;
  const h=Math.round(m/60); if(h<24) return `${h} sa önce`; return `${Math.round(h/24)} gün önce`; }
function openHazard(h){
  const masked=cfg.zone && TYPES[h.type].enf;
  const src=h.source==='osm'?'Kaynak: OpenStreetMap':h.area?'Kaynak: USGS':h.source==='official'?'Kaynak: yönetici (doğrulanmış)':h.mine?'Senin bildirimin':'Sürücü bildirimi';
  const meta=[lastPos?fmtD(dist(lastPos,h)):null, h.limit&&!masked?`Sınır ${h.limit} km/s`:null, ago(h.created), src].filter(Boolean).join(' · ');
  openSheet(`<div class="hz-head"><div class="pinbig" style="background:${masked?'#46525C':TYPES[h.type].color}">${ic(masked?'zone':hIcon(h))}</div>
      <div style="min-width:0"><h3 id="hzT"></h3><div class="meta">${meta}</div></div></div>
    ${h.area?`<p class="note" id="hzPlace"></p><p class="note">Deprem verisi USGS'den otomatik gelir. Merkez üssüne yakın yollarda hasar, heyelan veya kapanma olabilir.</p>`:`
    <div class="votes"><span class="ok">${h.conf||0} kişi “var” dedi</span><span class="no">${h.deny||0} kişi “yok” dedi</span></div>
    <div class="row2"><button class="vbtn yes" id="vy">${ic('check')}Hâlâ orada</button><button class="vbtn no" id="vn">${ic('x')}Yok</button></div>
    ${!h.remote&&db?'<p class="note">Bu nokta OpenStreetMap verisi; oyun yalnızca bu cihazda saklanır.</p>':''}`}`);
  $('hzT').textContent=masked?'Denetim bölgesi':hTitle(h);
  if(h.area){ $('hzPlace').textContent=h.place; return; }
  const go=async ok=>{
    $('vy').disabled=$('vn').disabled=true;
    try{ await vote(h,ok); closeSheet(); toast(ok?'Teşekkürler, onaylandı.':'Teşekkürler, oyun kaydedildi.'); }
    catch(e){ closeSheet(); toast(e.code==='already-voted'?'Bu nokta için zaten oy verdin.':e.code==='not-found'?'Bu nokta artık mevcut değil.':'Gönderilemedi: '+(e.code||e.message),4000); }
  };
  $('vy').onclick=()=>go(true); $('vn').onclick=()=>go(false);
}
function openSettings(){
  const via = api ? 'kendi sunucun' : 'Firebase';
  const fbLine = !(api||FIREBASE_CONFIG) ? 'Yerel mod (sunucu bağlı değil)' : fbState==='live' ? `Canlı (${via}): bildirimler herkesle paylaşılıyor` : fbState==='error' ? `Bağlantı hatası (${via})` : 'Bağlanıyor…';
  openSheet(`<h3>Ayarlar</h3>
    <div>
      <label class="sw">${ic('vol')}<span class="lab">Sesli uyarı</span><input type="checkbox" id="s-voice" ${cfg.voice?'checked':''}></label>
      <label class="sw">${ic('zone')}<span class="lab">Bölge modu<small>Denetim noktaları kesin konum yerine 500 m'lik bölge olarak gösterilir. Kesin konum uyarısını kısıtlayan ülkeler için.</small></span><input type="checkbox" id="s-zone" ${cfg.zone?'checked':''}></label>
      <label class="sw">${ic('moon')}<span class="lab">Gece haritası</span><input type="checkbox" id="s-night" ${cfg.night?'checked':''}></label>
      <label class="sw">${ic('alert')}<span class="lab">Uyarıdan önce bip sesi</span><input type="checkbox" id="s-beep" ${cfg.beep?'checked':''}></label>
      <label class="sw">${ic('speed')}<span class="lab">Hız sınırı aşım uyarısı<small>Bulunduğun yolun sınırını 5 km/s'ten fazla aşarsan uyarır.</small></span><input type="checkbox" id="s-lim" ${cfg.limWarn?'checked':''}></label>
      <label class="sw">${ic('fog')}<span class="lab">Hava durumu uyarıları<small>Sis, buzlanma, kar, kuvvetli yağış ve rüzgâr.</small></span><input type="checkbox" id="s-wx" ${cfg.wx?'checked':''}></label>
      <label class="sw">${ic('traffic')}<span class="lab">Anonim hız verimi paylaş<small>Trafik yoğunluğu hesabına katkı verir. Kimliğin gönderilmez; yalnızca konum, hız ve yön.</small></span><input type="checkbox" id="s-share" ${cfg.shareSpeed?'checked':''}></label>
      <label class="sw">${ic('quake')}<span class="lab">Deprem uyarıları<small>Son 24 saatte 200 km içindeki 4 ve üzeri depremler.</small></span><input type="checkbox" id="s-quake" ${cfg.quake?'checked':''}></label>
    </div>
    <button class="wide" id="s-offline" style="background:var(--panel-2);color:var(--fg);border:1px solid var(--line)">${ic('map')} Çevrimdışı haritalar</button>
    <h4>Uyarı türleri</h4>
    <div>${Object.entries(TYPES).map(([k,v])=>`<label class="sw"><span style="color:${v.color}">${ic(v.icon)}</span><span class="lab">${v.label}</span><input type="checkbox" data-k="${k}" ${cfg.enabled.has(k)?'checked':''}></label>`).join('')}</div>
    <h4>Veri</h4>
    <p class="note">${fbLine}. Radarlar OpenStreetMap'ten gelir (${osm.size} nokta yüklü${bundled.count?`, Türkiye listesi: ${bundled.count} radar, ${bundled.date?new Date(bundled.date).toLocaleDateString('tr-TR'):''}`:''}). ${corridors.size?`${corridors.size} ortalama hız koridoru biliniyor. `:''}Yol hız sınırları OpenStreetMap, hava durumu Open-Meteo, depremler USGS verisidir.</p>
    <p class="note">Hız sınırlarına her zaman uyun. Bazı ülkelerde (ör. Almanya, İsviçre) sürüşte radar uyarı uygulaması kullanmak yasaktır.</p>`);
  $('s-voice').onchange=e=>{ cfg.voice=e.target.checked; saveCfg(); $('voiceBtn').innerHTML=ic(cfg.voice?'vol':'mute'); $('voiceBtn').classList.toggle('off',!cfg.voice); };
  $('s-zone').onchange=e=>{ cfg.zone=e.target.checked; saveCfg(); bannerKey=''; dataChanged(); };
  $('s-night').onchange=e=>{ cfg.night=e.target.checked; saveCfg(); document.body.classList.toggle('night',cfg.night); if(TILES_URL) makeBase(); };
  $('s-offline').onclick=openOffline;
  $('s-share').onchange=e=>{ cfg.shareSpeed=e.target.checked; saveCfg(); if(!cfg.shareSpeed) speedBuf=[]; };
  $('s-beep').onchange=e=>{ cfg.beep=e.target.checked; saveCfg(); if(cfg.beep) webBeep(); };
  $('s-lim').onchange=e=>{ cfg.limWarn=e.target.checked; saveCfg(); };
  $('s-wx').onchange=e=>{ cfg.wx=e.target.checked; saveCfg(); wxNext=0; renderWx(); if(cfg.wx&&lastPos) loadWeather(lastPos); };
  $('s-quake').onchange=e=>{ cfg.quake=e.target.checked; saveCfg(); if(!cfg.quake){ official.clear(); dataChanged(); } else { quakeNext=0; if(lastPos) loadQuakes(lastPos); } };
  $('sheet').querySelectorAll('[data-k]').forEach(i=>i.onchange=()=>{ i.checked?cfg.enabled.add(i.dataset.k):cfg.enabled.delete(i.dataset.k); saveCfg(); bannerKey=''; dataChanged(); });
}
})();
