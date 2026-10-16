(() => {
'use strict';
const API = '../api/admin.php';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let csrf = null;

const TYPES = {
  fixedRadar: ['Sabit radar', '#E5484D'], mobileRadar: ['Mobil radar', '#F7712B'], eds: ['EDS / Ortalama hız', '#A35BEA'],
  trafficControl: ['Trafik kontrolü', '#3E8BFF'], accident: ['Trafik kazası', '#E9A913'], roadwork: ['Yol çalışması', '#C05621'],
  natural: ['Doğa olayı', '#17A897'],
};
const SUBS = {
  natural: { flood: 'Sel / su baskını', landslide: 'Heyelan', fire: 'Yangın', snowIce: 'Kar / buzlanma', fog: 'Yoğun sis', earthquake: 'Deprem hasarı', storm: 'Fırtına', other: 'Diğer' },
  eds: { avgStart: 'Ortalama hız başlangıcı', avgEnd: 'Ortalama hız bitişi' },
};
const PERMANENT = ['fixedRadar', 'eds'];
const typeName = h => (SUBS[h.type] && SUBS[h.type][h.subtype]) || (TYPES[h.type] || [h.type])[0];

// ---------------- Yardımcılar ----------------
async function call(action, { body, params } = {}) {
  const url = API + '?action=' + action + (params ? '&' + new URLSearchParams(params) : '');
  const r = await fetch(url, {
    method: body ? 'POST' : 'GET', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF': csrf } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({ error: `Sunucu yanıtı okunamadı (${r.status})` }));
  if (r.status === 401 && action !== 'login') { showLogin(); throw new Error(j.error || 'Oturum kapandı'); }
  if (!r.ok) throw new Error(j.error || `Hata (${r.status})`);
  return j;
}
let toastT;
function toast(msg, ms = 2800) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms); }
const fmtDate = ms => ms ? new Date(+ms).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–';
function ago(ms) {
  if (!ms) return '–';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'az önce'; if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60); if (h < 24) return `${h} sa önce`;
  return `${Math.round(h / 24)} gün önce`;
}
function left(ms) {
  if (!ms) return 'Kalıcı';
  const m = Math.round((ms - Date.now()) / 60000);
  if (m <= 0) return 'Süresi doldu'; if (m < 60) return `${m} dk`;
  const h = Math.round(m / 60); return h < 48 ? `${h} sa` : `${Math.round(h / 24)} gün`;
}
const typeOptions = sel => Object.entries(TYPES).map(([k, [l]]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${l}</option>`).join('');
function guard(fn) { return async (...a) => { try { await fn(...a); } catch (e) { toast(e.message, 4500); } }; }

// ---------------- Oturum ----------------
function showLogin() { $('appView').hidden = true; $('loginView').hidden = false; csrf = null; setTimeout(() => $('lu').focus(), 30); }
async function boot() {
  try {
    const me = await call('me');
    if (!me.configured) {
      $('loginView').hidden = false;
      $('loginErr').textContent = 'Yönetici hesabı tanımlı değil. Hostinge kurulum.php dosyasını yükleyip yeniden kurulum yapın; kurulumda yönetici kullanıcı adı ve şifresi belirlenir.';
      $('loginErr').hidden = false; return;
    }
    if (me.authed) { csrf = me.csrf; showApp(me.user); } else showLogin();
  } catch (e) {
    $('loginView').hidden = false; $('loginErr').textContent = 'Sunucuya ulaşılamadı: ' + e.message; $('loginErr').hidden = false;
  }
}
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault(); $('loginErr').hidden = true;
  try {
    const r = await call('login', { body: { user: $('lu').value.trim(), pass: $('lp').value } });
    csrf = r.csrf; $('lp').value = ''; showApp(r.user);
  } catch (err) { $('loginErr').textContent = err.message; $('loginErr').hidden = false; }
});
$('logout').onclick = guard(async () => { await call('logout', { body: {} }); showLogin(); });

function showApp(user) {
  $('loginView').hidden = true; $('appView').hidden = false;
  $('who').textContent = 'Giriş: ' + user;
  document.querySelectorAll('.side .tab').forEach(b => b.onclick = () => go(b.dataset.v));
  go((location.hash || '').slice(1) || localStorage.getItem('yu_admin_tab') || 'ozet');
}
const VIEWS = { ozet: vOzet, harita: vHarita, noktalar: vNoktalar, kullanicilar: vKullanicilar, duyurular: vDuyurular, ayarlar: vAyarlar };
let mapInst = null;
function go(v) {
  if (!VIEWS[v]) v = 'ozet';
  try { localStorage.setItem('yu_admin_tab', v); } catch (e) {}
  history.replaceState(null, '', '#' + v);
  document.querySelectorAll('.side .tab').forEach(b => b.setAttribute('aria-selected', b.dataset.v === v));
  if (mapInst) { mapInst.remove(); mapInst = null; }
  const m = $('main'); m.innerHTML = '<p class="muted">Yükleniyor…</p>';
  guard(VIEWS[v])(m);
}

// ---------------- Özet ----------------
async function vOzet(m) {
  const s = await call('stats');
  const tiles = [
    ['Aktif uyarı noktası', s.activeHazards], ['Yönetici noktası', s.officialHazards], ['Bildirim (24 saat)', s.reports24h],
    ['Bildirim (7 gün)', s.reports7d], ['Şu an çevrimiçi', s.online], ['Aktif kullanıcı (24 saat)', s.devices24h],
    ['Toplam kullanıcı', s.devices], ['Trafik verisi (son 10 dk)', s.trafficSamples10m],
  ];
  const days = Object.entries(s.daily), max = Math.max(1, ...days.map(d => d[1]));
  const byType = Object.entries(TYPES).map(([k, [l, c]]) => {
    const t = s.byType[k] || {}; return { k, l, c, user: t.user || 0, off: t.official || 0, total: (t.user || 0) + (t.official || 0) };
  });
  const tmax = Math.max(1, ...byType.map(t => t.total));
  m.innerHTML = `<div class="view">
    <div class="head"><h2>Özet</h2><button class="btn sm" id="ref">Yenile</button></div>
    <div class="tiles">${tiles.map(([l, v]) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`).join('')}</div>
    <div class="grid2">
      <div class="card"><h3>Son 14 gün · kullanıcı bildirimleri</h3>
        <div class="bars">${days.map(([d, v]) => `<div class="bar" title="${d}: ${v}"><b>${v || ''}</b><i style="height:${(v / max) * 100}%"></i><span>${d.slice(8)}.${d.slice(5, 7)}</span></div>`).join('')}</div></div>
      <div class="card"><h3>Aktif noktalar · türe göre</h3>
        <div class="legend" style="margin-top:10px">${byType.map(t => `<div><span class="tdot" style="background:${t.c}"></span><span style="width:140px">${t.l}</span>
          <span class="bar2"><i style="width:${(t.total / tmax) * 100}%;background:${t.c}"></i></span><span class="num" style="width:70px;text-align:right">${t.total}${t.off ? ` <small class="muted">(${t.off} yön.)</small>` : ''}</span></div>`).join('')}</div></div>
    </div>
    <div class="card"><h3>En çok bildirim yapan kullanıcılar</h3>
      <div class="tablewrap" style="margin-top:10px"><table><thead><tr><th>Cihaz</th><th>Bildirim</th><th>Oy</th><th>Son görülme</th><th>Durum</th></tr></thead><tbody>
      ${s.topReporters.length ? s.topReporters.map(d => `<tr><td title="${esc(d.id)}">${esc(d.id.slice(0, 12))}…</td><td class="num">${d.reports}</td><td class="num">${d.votes}</td><td>${ago(+d.last_seen)}</td><td>${+d.banned ? '<span class="pill bad">Engelli</span>' : '<span class="pill ok">Aktif</span>'}</td></tr>`).join('')
        : '<tr><td colspan="5" class="muted">Henüz kullanıcı yok. Uygulamayı açan her telefon burada görünür.</td></tr>'}
      </tbody></table></div></div>
    <p class="muted">Veritabanı: ${esc(s.db)} · PHP ${esc(s.php)} · Engelli cihaz: ${s.banned} · Harita dosyası: ${s.mapFile && s.mapFile.exists ? (s.mapFile.size / 1048576).toFixed(0) + ' MB' : 'yok (Ayarlar → Harita dosyası)'}</p></div>`;
  $('ref').onclick = () => go('ozet');
}

// ---------------- Harita: noktaları haritadan ekle / düzenle / sil ----------------
let focusHazard = null;
async function vHarita(m) {
  m.innerHTML = `<div class="view">
    <div class="head"><h2>Harita</h2>
      <div class="chips" id="tchips">${Object.entries(TYPES).map(([k, [l, c]]) => `<button class="chip" data-k="${k}" aria-pressed="true"><i style="background:${c}"></i>${l}</button>`).join('')}</div></div>
    <div class="mapwrap" id="mw"><div id="amap"></div>
      <div class="maptip" id="tip">Yeni nokta eklemek için haritada bir yere tıkla. Var olan noktayı düzenlemek veya silmek için üzerine tıkla. Turuncu çerçeveli noktalar yöneticiye aittir.</div>
      <div class="editor" id="ed" hidden></div></div></div>`;
  let saved = null; try { saved = JSON.parse(localStorage.getItem('yu_admin_map') || 'null'); } catch (e) {}
  const map = mapInst = L.map('amap', { zoomControl: true }).setView(saved ? [saved.lat, saved.lng] : [39.0, 35.0], saved ? saved.z : 6);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap katkıcıları' }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  const shown = new Set(Object.keys(TYPES));
  let data = [], editMarker = null, editing = null;

  const icon = (h, sel) => L.divIcon({ className: '', iconSize: [28, 28], iconAnchor: [14, 14],
    html: `<div class="mk ${h.source === 'official' ? 'off' : ''} ${sel ? 'sel' : ''}" style="background:${(TYPES[h.type] || ['', '#888'])[1]}">${h.speedLimit || ''}</div>` });
  function draw() {
    layer.clearLayers();
    for (const h of data) {
      if (!shown.has(h.type) || (editing && editing.id === h.id)) continue;
      L.marker([h.lat, h.lng], { icon: icon(h), title: typeName(h) }).on('click', () => openEditor(h)).addTo(layer);
    }
  }
  const load = guard(async () => {
    if (map.getZoom() < 8) { data = []; draw(); $('tip').textContent = 'Noktaları görmek için yakınlaş (il veya ilçe ölçeği). Yeni nokta eklemek için haritada bir yere tıkla.'; return; }
    const b = map.getBounds();
    data = await call('hazards', { params: { bbox: [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].map(x => x.toFixed(5)).join(',') } });
    $('tip').textContent = `${data.length} nokta gösteriliyor. Eklemek için haritaya, düzenlemek için noktaya tıkla.`;
    draw();
  });
  map.on('moveend', () => { const c = map.getCenter(); try { localStorage.setItem('yu_admin_map', JSON.stringify({ lat: c.lat, lng: c.lng, z: map.getZoom() })); } catch (e) {} load(); });
  map.on('click', e => {
    if (editing) { editMarker.setLatLng(e.latlng); syncLatLng(); return; }
    openEditor({ id: null, type: 'mobileRadar', subtype: null, lat: e.latlng.lat, lng: e.latlng.lng, speedLimit: null, heading: null, note: '', expiresAt: null, source: 'official' });
  });
  $('tchips').querySelectorAll('.chip').forEach(c => c.onclick = () => {
    const on = c.getAttribute('aria-pressed') !== 'true'; c.setAttribute('aria-pressed', on);
    on ? shown.add(c.dataset.k) : shown.delete(c.dataset.k); draw();
  });

  function syncLatLng() { const p = editMarker.getLatLng(); $('e_lat').value = p.lat.toFixed(6); $('e_lng').value = p.lng.toFixed(6); }
  function closeEditor() { editing = null; if (editMarker) { map.removeLayer(editMarker); editMarker = null; } $('ed').hidden = true; draw(); }
  function openEditor(h) {
    if (editMarker) map.removeLayer(editMarker);
    editing = h;
    editMarker = L.marker([h.lat, h.lng], { icon: icon(h, true), draggable: true, zIndexOffset: 1000 }).addTo(map);
    editMarker.on('dragend', syncLatLng);
    draw();
    const isNew = !h.id;
    const hours = h.expiresAt ? Math.max(1, Math.round((h.expiresAt - Date.now()) / 3600000)) : '';
    const ed = $('ed'); ed.hidden = false;
    ed.innerHTML = `<div class="head"><h3>${isNew ? 'Yeni uyarı noktası' : 'Noktayı düzenle'}</h3><button class="btn sm" id="e_x" aria-label="Kapat">Kapat</button></div>
      ${isNew ? '' : `<div class="muted" style="font-size:13px">${h.source === 'official' ? '<span class="pill off">Yönetici</span>' : '<span class="pill user">Kullanıcı bildirimi</span>'}
        · ${fmtDate(h.createdAt)} · 👍 ${h.confirmations} 👎 ${h.denials}${h.reporter ? `<br>Bildiren: <span title="${esc(h.reporter)}">${esc(h.reporter.slice(0, 18))}</span>` : ''}</div>`}
      <label class="f">Tür<select id="e_type">${typeOptions(h.type)}</select></label>
      <label class="f" id="e_subw">Alt tür<select id="e_sub"></select></label>
      <div class="row"><label class="f">Hız sınırı (km/s)<input type="number" id="e_lim" min="5" max="160" value="${h.speedLimit ?? ''}" placeholder="yok"></label>
        <label class="f">Yön (0–360°)<input type="number" id="e_hd" min="0" max="360" value="${h.heading ?? ''}" placeholder="her iki yön"></label></div>
      <label class="f">Süre<select id="e_dur">
        <option value="">Kalıcı</option><option value="3">3 saat</option><option value="12">12 saat</option><option value="24">1 gün</option>
        <option value="168">7 gün</option><option value="720">30 gün</option>${hours && ![3, 12, 24, 168, 720].includes(hours) ? `<option value="${hours}" selected>${hours} saat (kalan)</option>` : ''}</select></label>
      <label class="f">Not (kullanıcılara görünür)<input type="text" id="e_note" maxlength="200" value="${esc(h.note || '')}"></label>
      <div class="row"><label class="f">Enlem<input type="text" id="e_lat" value="${h.lat.toFixed(6)}"></label><label class="f">Boylam<input type="text" id="e_lng" value="${h.lng.toFixed(6)}"></label></div>
      <p class="muted" style="margin:0;font-size:13px">Konumu değiştirmek için işaretçiyi sürükle ya da haritada başka bir yere tıkla.</p>
      <div class="row"><button class="btn primary" id="e_save">${isNew ? 'Ekle' : 'Kaydet'}</button>${isNew ? '' : '<button class="btn danger" id="e_del">Sil</button>'}</div>
      ${!isNew && h.source !== 'official' ? '<p class="muted" style="margin:0;font-size:12px">Kaydedince nokta yönetici noktasına dönüşür ve oylarla gizlenmez.</p>' : ''}`;
    const subSync = () => {
      const t = $('e_type').value, subs = SUBS[t];
      $('e_subw').hidden = !subs;
      $('e_sub').innerHTML = subs ? (t === 'eds' ? '<option value="">Tek nokta</option>' : '') + Object.entries(subs).map(([k, l]) => `<option value="${k}" ${k === h.subtype ? 'selected' : ''}>${l}</option>`).join('') : '';
      if (!h.id && !h.expiresAt) $('e_dur').value = PERMANENT.includes(t) ? '' : t === 'roadwork' ? '168' : t === 'natural' ? '12' : '3';
    };
    $('e_type').onchange = subSync; subSync();
    if (!isNew) $('e_dur').value = hours && [3, 12, 24, 168, 720].includes(hours) ? String(hours) : hours ? String(hours) : '';
    $('e_x').onclick = closeEditor;
    $('e_save').onclick = guard(async () => {
      const t = $('e_type').value;
      await call('hazard_save', { body: { id: h.id ? +h.id : null, type: t, subtype: SUBS[t] ? ($('e_sub').value || null) : null,
        lat: +$('e_lat').value, lng: +$('e_lng').value, speedLimit: $('e_lim').value || null, heading: $('e_hd').value || null,
        note: $('e_note').value, hours: $('e_dur').value || null } });
      toast(isNew ? 'Nokta eklendi. Uygulamada birkaç saniye içinde görünür.' : 'Kaydedildi');
      closeEditor(); load();
    });
    if (!isNew) $('e_del').onclick = guard(async () => {
      if (!confirm('Bu nokta silinsin mi?')) return;
      await call('hazard_delete', { body: { ids: [+h.id] } }); toast('Silindi'); closeEditor(); load();
    });
  }
  if (focusHazard) { const f = focusHazard; focusHazard = null; map.setView([f.lat, f.lng], 16); setTimeout(() => openEditor(f), 300); }
  load();
}

// ---------------- Uyarı noktaları (liste, toplu silme, CSV) ----------------
async function vNoktalar(m) {
  m.innerHTML = `<div class="view">
    <div class="head"><h2>Uyarı noktaları</h2><button class="btn primary sm" id="addOnMap">Haritadan ekle</button></div>
    <div class="card"><div class="row">
      <label class="f">Tür<select id="f_type"><option value="">Tümü</option>${typeOptions('')}</select></label>
      <label class="f">Kaynak<select id="f_src"><option value="">Tümü</option><option value="official">Yönetici</option><option value="user">Kullanıcı</option></select></label>
      <label class="f">Ara (not / bildiren)<input type="text" id="f_q"></label>
      <label class="check"><input type="checkbox" id="f_exp"> Süresi dolanlar dahil</label>
      <button class="btn" id="f_go">Listele</button></div></div>
    <div class="head"><span class="muted" id="cnt"></span><button class="btn danger sm" id="delSel" disabled>Seçilenleri sil</button></div>
    <div class="tablewrap" style="max-height:60vh"><table><thead><tr><th><input type="checkbox" id="all" aria-label="Tümünü seç"></th><th>Tür</th><th>Kaynak</th><th>Sınır</th><th>Eklenme</th><th>Kalan</th><th>Oy</th><th>Not</th><th>Konum</th></tr></thead><tbody id="tb"></tbody></table></div>
    <div class="card"><h3>Toplu içe aktar (CSV)</h3>
      <p class="muted" style="margin:6px 0 10px">Her satır: <code>enlem, boylam, tür, hız sınırı, yön, not</code>. Yalnızca enlem ve boylam zorunlu.
      Tür yazılmazsa aşağıdaki varsayılan kullanılır. Tür adları: ${Object.keys(TYPES).join(', ')}. Excel'den kopyalanan noktalı virgüllü satırlar da olur.</p>
      <textarea id="csv" placeholder="41.0151, 28.9795, fixedRadar, 50&#10;39.9208; 32.8541; eds; 82"></textarea>
      <div class="row" style="margin-top:10px"><label class="f">Varsayılan tür<select id="csvType">${typeOptions('fixedRadar')}</select></label><button class="btn blue" id="imp">İçe aktar</button></div>
      <p id="impRes" class="muted"></p></div></div>`;
  let rows = [];
  const sel = new Set();
  const updSel = () => { $('delSel').disabled = !sel.size; $('delSel').textContent = sel.size ? `Seçilenleri sil (${sel.size})` : 'Seçilenleri sil'; };
  const list = guard(async () => {
    const p = {}; if ($('f_type').value) p.type = $('f_type').value; if ($('f_src').value) p.source = $('f_src').value;
    if ($('f_q').value.trim()) p.q = $('f_q').value.trim(); if ($('f_exp').checked) p.expired = 1; p.limit = 1000;
    rows = await call('hazards', { params: p }); sel.clear(); updSel();
    $('cnt').textContent = `${rows.length} nokta${rows.length >= 1000 ? ' (ilk 1000)' : ''}`;
    $('tb').innerHTML = rows.length ? rows.map((h, i) => `<tr>
      <td><input type="checkbox" data-i="${i}" aria-label="Seç"></td>
      <td><span class="tdot" style="background:${(TYPES[h.type] || ['', '#888'])[1]}"></span> ${esc(typeName(h))}</td>
      <td>${h.source === 'official' ? '<span class="pill off">Yönetici</span>' : '<span class="pill user">Kullanıcı</span>'}</td>
      <td class="num">${h.speedLimit || '–'}</td><td>${fmtDate(h.createdAt)}</td><td>${left(h.expiresAt)}</td>
      <td class="num">+${h.confirmations} / −${h.denials}</td><td class="wrap">${esc(h.note || '')}</td>
      <td><button class="btn sm" data-map="${i}">Haritada</button></td></tr>`).join('')
      : '<tr><td colspan="9" class="muted">Bu filtreye uyan nokta yok.</td></tr>';
    $('tb').querySelectorAll('input[data-i]').forEach(c => c.onchange = () => { const id = rows[+c.dataset.i].id; c.checked ? sel.add(id) : sel.delete(id); updSel(); });
    $('tb').querySelectorAll('[data-map]').forEach(b => b.onclick = () => { focusHazard = rows[+b.dataset.map]; go('harita'); });
  });
  $('all').onchange = e => { $('tb').querySelectorAll('input[data-i]').forEach(c => { c.checked = e.target.checked; c.onchange(); }); };
  $('f_go').onclick = list;
  $('f_q').onkeydown = e => { if (e.key === 'Enter') list(); };
  $('addOnMap').onclick = () => go('harita');
  $('delSel').onclick = guard(async () => {
    if (!confirm(`${sel.size} nokta silinsin mi?`)) return;
    const r = await call('hazard_delete', { body: { ids: [...sel].map(Number) } }); toast(`${r.deleted} nokta silindi`); list();
  });
  $('imp').onclick = guard(async () => {
    const r = await call('hazards_import', { body: { csv: $('csv').value, type: $('csvType').value } });
    $('impRes').textContent = `${r.imported} nokta eklendi.` + (r.badLines.length ? ` Okunamayan satırlar: ${r.badLines.join(', ')}` : '');
    if (r.imported) { $('csv').value = ''; list(); }
  });
  list();
}

// ---------------- Kullanıcılar ----------------
async function vKullanicilar(m) {
  m.innerHTML = `<div class="view">
    <div class="head"><h2>Kullanıcılar</h2></div>
    <p class="muted" style="margin:0;max-width:70ch">Uygulama kayıt istemez; her telefon rastgele bir cihaz kimliğiyle tanınır. Kötüye kullanan bir cihazı engellediğinde
      o cihaz bildirim yapamaz ve oy veremez, ama uyarıları görmeye devam eder. Not alanına kendin için açıklama yazabilirsin.</p>
    <div class="card"><div class="row">
      <label class="f">Ara (cihaz, IP, not)<input type="text" id="d_q"></label>
      <label class="f">Göster<select id="d_f"><option value="">Tümü</option><option value="active">Son 24 saatte aktif</option><option value="banned">Engelliler</option></select></label>
      <label class="f">Sırala<select id="d_s"><option value="seen">Son görülme</option><option value="reports">Bildirim sayısı</option><option value="first">İlk görülme</option></select></label>
      <button class="btn" id="d_go">Listele</button></div></div>
    <div class="tablewrap" style="max-height:65vh"><table><thead><tr><th>Cihaz</th><th>İlk görülme</th><th>Son görülme</th><th>Son IP</th><th>Bildirim</th><th>Oy</th><th>Durum</th><th>Not</th><th></th></tr></thead><tbody id="dtb"></tbody></table></div></div>`;
  const list = guard(async () => {
    const p = {}; if ($('d_q').value.trim()) p.q = $('d_q').value.trim(); if ($('d_f').value) p.filter = $('d_f').value; p.sort = $('d_s').value;
    const rows = await call('devices', { params: p });
    $('dtb').innerHTML = rows.length ? rows.map((d, i) => `<tr>
      <td title="${esc(d.id)}">${esc(d.id.slice(0, 14))}…</td><td>${fmtDate(+d.first_seen)}</td><td>${ago(+d.last_seen)}</td><td>${esc(d.last_ip || '')}</td>
      <td class="num">${d.reports}</td><td class="num">${d.votes}</td>
      <td>${+d.banned ? '<span class="pill bad">Engelli</span>' : '<span class="pill ok">Aktif</span>'}</td>
      <td class="wrap">${esc(d.note || '')}</td>
      <td><button class="btn sm ${+d.banned ? '' : 'danger'}" data-ban="${i}">${+d.banned ? 'Engeli kaldır' : 'Engelle'}</button>
        <button class="btn sm" data-note="${i}">Not</button>${+d.reports ? `<button class="btn sm danger" data-del="${i}">Bildirimlerini sil</button>` : ''}</td></tr>`).join('')
      : '<tr><td colspan="9" class="muted">Kullanıcı bulunamadı.</td></tr>';
    $('dtb').querySelectorAll('[data-ban]').forEach(b => b.onclick = guard(async () => {
      const d = rows[+b.dataset.ban], ban = !+d.banned;
      if (ban && !confirm('Bu cihaz engellensin mi? Bildirim yapamaz ve oy veremez.')) return;
      await call('device_update', { body: { id: d.id, banned: ban } }); toast(ban ? 'Cihaz engellendi' : 'Engel kaldırıldı'); list();
    }));
    $('dtb').querySelectorAll('[data-note]').forEach(b => b.onclick = guard(async () => {
      const d = rows[+b.dataset.note]; const n = prompt('Not', d.note || ''); if (n === null) return;
      await call('device_update', { body: { id: d.id, note: n } }); list();
    }));
    $('dtb').querySelectorAll('[data-del]').forEach(b => b.onclick = guard(async () => {
      const d = rows[+b.dataset.del]; if (!confirm(`Bu cihazın ${d.reports} kullanıcı bildirimi silinsin mi?`)) return;
      const r = await call('device_update', { body: { id: d.id, deleteReports: true } }); toast(`${r.deletedReports} bildirim silindi`); list();
    }));
  });
  $('d_go').onclick = list; $('d_q').onkeydown = e => { if (e.key === 'Enter') list(); };
  list();
}

// ---------------- Toplu bildirim ----------------
async function vDuyurular(m) {
  m.innerHTML = `<div class="view">
    <div class="head"><h2>Toplu bildirim</h2></div>
    <div class="grid2">
      <form class="card" id="mf" style="display:flex;flex-direction:column;gap:10px">
        <h3>Yeni duyuru</h3>
        <label class="f">Başlık<input type="text" id="m_t" maxlength="120" required placeholder="Ör. D-100'de kaza nedeniyle yoğunluk"></label>
        <label class="f">Metin<textarea id="m_b" maxlength="1000" placeholder="Ayrıntı (isteğe bağlı)"></textarea></label>
        <div class="row"><label class="f">Önem<select id="m_l"><option value="info">Bilgi</option><option value="warning">Uyarı</option><option value="danger">Acil</option></select></label>
          <label class="f">Geçerlilik<select id="m_h"><option value="1">1 saat</option><option value="6">6 saat</option><option value="24" selected>1 gün</option><option value="72">3 gün</option><option value="168">7 gün</option></select></label></div>
        <div class="chips"><label class="check"><input type="radio" name="scope" value="all" checked> Herkese</label><label class="check"><input type="radio" name="scope" value="area"> Belirli bölgeye</label></div>
        <div id="areaBox" hidden>
          <div class="row"><label class="f">Yarıçap (km)<input type="number" id="m_r" min="1" max="2000" value="25"></label></div>
          <div class="mapwrap" style="height:260px;min-height:0;margin-top:8px"><div id="amap"></div></div>
          <p class="muted" style="margin:6px 0 0;font-size:13px" id="m_c">Haritada bölgenin merkezine tıkla.</p></div>
        <button class="btn primary" type="submit" style="justify-content:center;padding:11px">Gönder</button>
        <p class="muted" style="margin:0;font-size:13px">Uygulaması açık olanlara birkaç saniye içinde sesli ve yazılı olarak ulaşır; Android uygulaması arka plandaysa
          telefon bildirimi olarak gelir. Duyuru süresi dolana kadar uygulamayı yeni açanlar da görür.</p>
      </form>
      <div class="card"><h3>Gönderilenler</h3><div class="tablewrap" style="margin-top:10px"><table><thead><tr><th>Tarih</th><th>Başlık</th><th>Kapsam</th><th>Bitiş</th><th></th></tr></thead><tbody id="mtb"></tbody></table></div></div>
    </div></div>`;
  let center = null, circle = null, map = null;
  const lvl = { info: 'Bilgi', warning: 'Uyarı', danger: 'Acil' };
  const list = guard(async () => {
    const rows = await call('messages');
    $('mtb').innerHTML = rows.length ? rows.map(r => `<tr><td>${fmtDate(+r.created_at)}</td><td class="wrap"><b>${esc(r.title)}</b> <small class="muted">${lvl[r.level] || ''}</small></td>
      <td>${r.radius_km ? `${Math.round(r.radius_km)} km çevre` : 'Herkes'}</td><td>${+r.expires_at < Date.now() ? 'Bitti' : left(+r.expires_at)}</td>
      <td><button class="btn sm danger" data-id="${r.id}">Sil</button></td></tr>`).join('') : '<tr><td colspan="5" class="muted">Henüz duyuru yok.</td></tr>';
    $('mtb').querySelectorAll('[data-id]').forEach(b => b.onclick = guard(async () => { await call('message_delete', { body: { id: +b.dataset.id } }); list(); }));
  });
  document.querySelectorAll('input[name=scope]').forEach(r => r.onchange = () => {
    const area = document.querySelector('input[name=scope]:checked').value === 'area';
    $('areaBox').hidden = !area;
    if (area && !map) {
      map = mapInst = L.map('amap').setView([39, 35], 5);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
      const drawC = () => { if (!center) return; if (circle) map.removeLayer(circle); circle = L.circle(center, { radius: (+$('m_r').value || 25) * 1000, color: '#FF8A1F' }).addTo(map); };
      map.on('click', e => { center = e.latlng; drawC(); $('m_c').textContent = `Merkez: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`; });
      $('m_r').oninput = drawC;
    }
  });
  $('mf').addEventListener('submit', guard(async e => {
    e.preventDefault();
    const area = document.querySelector('input[name=scope]:checked').value === 'area';
    if (area && !center) { toast('Haritada bölgenin merkezine tıkla'); return; }
    await call('message_send', { body: { title: $('m_t').value, body: $('m_b').value, level: $('m_l').value, hours: +$('m_h').value,
      ...(area ? { lat: center.lat, lng: center.lng, radius_km: +$('m_r').value } : {}) } });
    toast('Duyuru gönderildi'); $('m_t').value = ''; $('m_b').value = ''; list();
  }));
  list();
}

// ---------------- Ayarlar ----------------
async function vAyarlar(m) {
  const { settings: s } = await call('settings');
  const tt = s.ttl_hours || {};
  m.innerHTML = `<div class="view">
    <div class="head"><h2>Uygulama ayarları</h2></div>
    <form class="card" id="sf" style="display:flex;flex-direction:column;gap:14px">
      <label class="check"><input type="checkbox" id="s_rep" ${s.reporting_enabled ? 'checked' : ''}> Kullanıcılar bildirim yapabilsin</label>
      <div><div class="muted" style="font-size:13px;font-weight:600;margin-bottom:6px">Bildirilebilecek türler</div>
        <div class="chips">${Object.entries(TYPES).map(([k, [l, c]]) => `<label class="chip"><input type="checkbox" data-rt="${k}" ${(s.report_types || []).includes(k) ? 'checked' : ''}><i style="background:${c}"></i>${l}</label>`).join('')}</div></div>
      <label class="f">Açılış ekranı duyurusu (boş bırakılabilir)<textarea id="s_notice" maxlength="500">${esc(s.start_notice || '')}</textarea></label>
      <label class="check"><input type="checkbox" id="s_zone" ${s.default_zone_mode ? 'checked' : ''}> Yeni kullanıcılarda "bölge modu" varsayılan açık (kesin radar konumu yerine 500 m bölge)</label>
      <div class="row">
        <label class="f">Güncelleme aralığı (sn)<input type="number" id="s_poll" min="5" max="120" value="${s.poll_seconds}"></label>
        <label class="f">Cihaz başına saatlik bildirim sınırı<input type="number" id="s_rph" min="1" max="1000" value="${s.reports_per_hour}"></label>
        <label class="f">Cihaz başına saatlik oy sınırı<input type="number" id="s_vph" min="1" max="5000" value="${s.votes_per_hour}"></label>
        <label class="f">Gizlemek için gereken fazla "yok" oyu<input type="number" id="s_hide" min="1" max="50" value="${s.hide_after}"></label>
      </div>
      <div><div class="muted" style="font-size:13px;font-weight:600;margin-bottom:6px">Kullanıcı bildirimlerinin ömrü (saat) — "Hâlâ orada" oyu süreyi yeniler</div>
        <div class="row">${['mobileRadar', 'trafficControl', 'accident', 'roadwork', 'natural'].map(k => `<label class="f">${TYPES[k][0]}<input type="number" min="0.25" step="0.25" data-ttl="${k}" value="${tt[k] ?? ''}"></label>`).join('')}</div>
        <p class="muted" style="margin:6px 0 0;font-size:13px">Sabit radar ve EDS kalıcıdır.</p></div>
      <div><div class="muted" style="font-size:13px;font-weight:600;margin-bottom:6px">Trafik yoğunluğu</div>
        <label class="check"><input type="checkbox" id="s_traf" ${s.traffic_enabled ? 'checked' : ''}> Kullanıcıların anonim hız verisinden trafik yoğunluğu hesapla ve göster</label>
        <label class="f" style="margin-top:8px">TomTom API anahtarı (isteğe bağlı — tüm dünyada canlı trafik katmanı)
          <input type="text" id="s_tt" value="${esc(s.tomtom_key || '')}" placeholder="developer.tomtom.com → ücretsiz hesap → API anahtarı" autocomplete="off"></label>
        <p class="muted" style="margin:6px 0 0;font-size:13px">Kullanıcı verisi yalnızca uygulamayı kullananların geçtiği yollarda oluşur. TomTom anahtarı girersen tüm yollar için canlı trafik gösterilir
          (ücretsiz planda günlük 50.000 harita parçası). Anahtarı TomTom panelinden yalnızca kendi alan adına kısıtla.</p></div>
      <label class="f">Harita dosyası adresi (boş = bu sitedeki tiles/turkiye.pmtiles)<input type="text" id="s_tiles" value="${esc(s.tiles_url || '')}" placeholder="tiles/turkiye.pmtiles"></label>
      <div><button class="btn primary" type="submit">Kaydet</button></div>
    </form>
    <div class="card" style="display:flex;flex-direction:column;gap:10px">
      <h3>Harita dosyası (çevrimdışı harita)</h3>
      <p class="muted" style="margin:0;max-width:75ch">Uygulama haritayı bu sitedeki <code>tiles/turkiye.pmtiles</code> dosyasından çizer; kullanıcılar bölge indirip internetsiz kullanabilir.
        Dosya yoksa OpenStreetMap'in çevrimiçi haritası kullanılır ve çevrimdışı indirme kapalıdır. Dosyayı GitHub'daki <b>Türkiye Haritasını Üret</b> işlemi hazırlar; aşağıdan sunucuya indirirsin.</p>
      <div id="mapStat" class="muted">Kontrol ediliyor…</div>
      <label class="f">Kaynak adres<input type="text" id="m_src" placeholder="GitHub Releases adresi"></label>
      <div style="height:8px;background:var(--panel-2);border-radius:4px;overflow:hidden" hidden id="m_barw"><i id="m_bar" style="display:block;height:100%;width:0;background:var(--accent)"></i></div>
      <div class="row"><button class="btn blue" id="m_dl">Sunucuya indir / güncelle</button><button class="btn danger" id="m_del">Harita dosyasını sil</button></div>
    </div>
    <form class="card" id="pf" style="display:flex;flex-direction:column;gap:10px;max-width:520px">
      <h3>Yönetici hesabı</h3>
      <label class="f">Yeni kullanıcı adı (değişmeyecekse boş bırak)<input type="text" id="p_u" autocomplete="username"></label>
      <label class="f">Mevcut şifre<input type="password" id="p_o" autocomplete="current-password" required></label>
      <div class="row"><label class="f">Yeni şifre (en az 8 karakter)<input type="password" id="p_n" autocomplete="new-password" minlength="8" required></label>
        <label class="f">Yeni şifre (tekrar)<input type="password" id="p_n2" autocomplete="new-password" minlength="8" required></label></div>
      <div><button class="btn" type="submit">Şifreyi değiştir</button></div>
    </form></div>`;
  $('sf').addEventListener('submit', guard(async e => {
    e.preventDefault();
    const ttl = {}; document.querySelectorAll('[data-ttl]').forEach(i => { if (i.value) ttl[i.dataset.ttl] = +i.value; });
    await call('settings_save', { body: {
      reporting_enabled: $('s_rep').checked, report_types: [...document.querySelectorAll('[data-rt]:checked')].map(i => i.dataset.rt),
      start_notice: $('s_notice').value, default_zone_mode: $('s_zone').checked, poll_seconds: +$('s_poll').value,
      reports_per_hour: +$('s_rph').value, votes_per_hour: +$('s_vph').value, hide_after: +$('s_hide').value, ttl_hours: ttl,
      traffic_enabled: $('s_traf').checked, tomtom_key: $('s_tt').value.trim(), tiles_url: $('s_tiles').value.trim() } });
    toast('Ayarlar kaydedildi. Uygulamalar bir sonraki açılışta uygular.');
  }));
  const mapStat = async () => {
    const i = await call('map_info');
    if (!$('m_src').value) $('m_src').value = i.source;
    $('mapStat').innerHTML = i.exists ? `<span class="pill ok">Kurulu</span> ${(i.size / 1048576).toFixed(0)} MB · ${fmtDate(i.updated)}`
      : `<span class="pill bad">Yok</span>${i.partSize ? ` · yarım kalmış indirme: ${(i.partSize / 1048576).toFixed(0)} MB` : ''}`;
  };
  guard(mapStat)();
  let mapBusy = false;
  $('m_dl').onclick = guard(async () => {
    if (mapBusy) return; mapBusy = true; $('m_dl').disabled = true; $('m_barw').hidden = false;
    try {
      const url = $('m_src').value.trim();
      let r = await call('map_download', { body: { url, reset: true } });
      while (!r.done) {
        r = await call('map_download', { body: { url } });
        const pct = Math.floor(r.received / r.total * 100);
        $('m_bar').style.width = pct + '%';
        $('mapStat').textContent = `İndiriliyor: ${(r.received / 1048576).toFixed(0)} / ${(r.total / 1048576).toFixed(0)} MB (%${pct}) — bu sayfayı kapatma`;
      }
      toast('Harita dosyası kuruldu. Uygulamalar bir sonraki açılışta yeni haritayı kullanır.', 5000);
    } finally { mapBusy = false; $('m_dl').disabled = false; $('m_barw').hidden = true; await mapStat(); }
  });
  $('m_del').onclick = guard(async () => { if (!confirm('Harita dosyası silinsin mi? Uygulama OpenStreetMap haritasına döner.')) return; await call('map_delete', { body: {} }); toast('Silindi'); mapStat(); });
  $('pf').addEventListener('submit', guard(async e => {
    e.preventDefault();
    if ($('p_n').value !== $('p_n2').value) { toast('Yeni şifreler aynı değil'); return; }
    await call('password', { body: { old: $('p_o').value, new: $('p_n').value, user: $('p_u').value.trim() || undefined } });
    toast('Yönetici hesabı güncellendi'); e.target.reset();
  }));
}

boot();
})();
