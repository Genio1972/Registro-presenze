(() => {
const { pad, key, dim, slotMins, yearCalc, monthStats } = Calc;
const LS = 'registro-presenze-v1';
const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const GS = ['D','L','M','M','G','V','S'];
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let DB; try { DB = JSON.parse(localStorage[LS]); } catch (e) {}
if (!DB || !DB.years) DB = clone(window.SEED);
const save = () => { DB.settings.lastModified = Date.now(); localStorage[LS] = JSON.stringify(DB); };
const now = new Date(), ys = () => Object.keys(DB.years).sort();
const ui = { tab: 'cal', year: DB.years[now.getFullYear()] ? now.getFullYear() : +ys().filter(y => !DB.years[y].archived).pop() || +ys().pop(), month: now.getMonth(), filter: '', rep: -1, sub: 'codici', edit: null, msg: '' };
const cm = () => Object.fromEntries(DB.codes.map(c => [c.code, c]));
const fmtH = m => `${Math.floor(m / 60)}h${pad(Math.round(m % 60))}`;
const num = n => Math.round(n * 100) / 100;
const chip = (c, M = cm()) => `<span class="chip" style="background:${M[c]?.color || '#888'}">${esc(c)}</span>`;
const fmtDate = (d, m, y) => `${d} ${MESI[m].toLowerCase()} ${y}`;
const usedCount = code => Object.values(DB.years).reduce((n, Y) => n + Object.values(Y.days).filter(e => e.codes.includes(code)).length, 0);
function applyTheme() { const t = DB.settings.theme; if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t; }
function dl(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
const today = () => new Date().toISOString().slice(0, 10);
function exportJSON() { dl(`registro-presenze-backup-${today()}.json`, new Blob([JSON.stringify(DB, null, 1)], { type: 'application/json' })); DB.settings.lastExport = Date.now(); save(); }

// ---------- CALENDARIO ----------
function calView() {
  const y = ui.year, m = ui.month, Y = DB.years[y], M = cm(), ws = DB.settings.weekStart;
  if (!Y) return '<p class="card">Nessun anno. Aggiungilo da Impostazioni → Anni.</p>';
  const off = (new Date(y, m, 1).getDay() - ws + 7) % 7, td = today();
  let cells = '<i></i>'.repeat(off);
  for (let d = 1; d <= dim(y, m); d++) {
    const k = key(y, m, d), e = Y.days[k], wd = new Date(y, m, d).getDay();
    const hit = !ui.filter || (e && e.codes.some(c => ui.filter.startsWith('cat:') ? M[c]?.cat === ui.filter.slice(4) : c === ui.filter));
    cells += `<button class="day${k === td ? ' today' : ''}${wd === 0 ? ' dom' : ''}${hit ? '' : ' dim'}" data-act="day" data-d="${d}"><b>${d}</b><span class="chips">${e ? e.codes.map(c => chip(c, M)).join('') : ''}</span><small>${e ? (slotMins(e.perm) ? '⏱' : '') + (slotMins(e.ot) ? '＋' : '') + (e.note ? '✎' : '') : ''}</small></button>`;
  }
  const r = yearCalc(Y, y)[m], P = Y.params;
  const cats = [...new Set(DB.codes.map(c => c.cat))];
  const cnt = c => r.s.counts[c] || 0;
  return `<div class="bar2"><button data-act="prev">‹</button><h2>${MESI[m]} ${y}</h2><button data-act="next">›</button><button data-act="oggi" class="ghost">Oggi</button></div>
  <div class="tools"><input type="date" data-act="goto" aria-label="Vai a data"><select data-f="filter"><option value="">Tutti i codici</option>${DB.codes.map(c => `<option value="${esc(c.code)}"${ui.filter === c.code ? ' selected' : ''}>${esc(c.code)} ${esc(c.desc)}</option>`).join('')}${cats.map(c => `<option value="cat:${esc(c)}"${ui.filter === 'cat:' + c ? ' selected' : ''}>Categoria: ${esc(c)}</option>`).join('')}</select></div>
  <div class="grid">${[0,1,2,3,4,5,6].map(i => `<em>${GS[(ws + i) % 7]}</em>`).join('')}${cells}</div>
  <div class="card"><h3>Riepilogo ${MESI[m]} <span class="tag">calcolato</span></h3><div class="kv">
  <div><span>Permessi usati</span><b>${fmtH(r.s.perm)}</b></div><div><span>Permessi residui mese</span><b>${num(r.permLeft)} min</b></div>
  ${P.congedi.map((c, i) => `<div><span>${esc(c.label)} residuo</span><b>${num(r.congLeft[i])}</b></div>`).join('')}
  <div><span>Straordinario mese</span><b>${num(r.s.ot / 60)} h</b></div><div><span>Straordinario anno</span><b>${num(r.otCum)} h</b></div>
  <div><span>Trasferta</span><b>${cnt('T')}</b></div><div><span>Malattia</span><b>${cnt('M')}</b></div><div><span>Infortunio</span><b>${cnt('I')}</b></div><div><span>Fest. nazionali</span><b>${cnt('FN')}</b></div><div><span>Fest. soppresse</span><b>${cnt('FS')}</b></div></div></div>`;
}
function editView() {
  const { d } = ui.edit, y = ui.year, m = ui.month, e = DB.years[y].days[key(y, m, d)] || { codes: [], perm: [], ot: [], note: '' }, wd = new Date(y, m, d).getDay();
  const sl = (arr, n, name) => [0, 1].map(i => `<div class="slot"><input type="time" data-s="${name}${i}a" value="${arr[i]?.[0] || ''}"><span>→</span><input type="time" data-s="${name}${i}b" value="${arr[i]?.[1] || ''}"></div>`).join('');
  ui.edit.codes ??= [...e.codes];
  return `<div class="modal" data-act="close"><div class="sheet"><h3>${['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'][wd]} ${fmtDate(d, m, y)}</h3>
  <p class="lbl">Codici (max 3)</p><div class="pick">${DB.codes.filter(c => c.active || ui.edit.codes.includes(c.code)).map(c => `<button data-act="tog" data-c="${esc(c.code)}" class="${ui.edit.codes.includes(c.code) ? 'on' : ''}" style="--c:${c.color}" title="${esc(c.desc)}">${esc(c.code)}</button>`).join('')}</div>
  <p class="lbl">Permessi (dalle → alle)</p>${sl(e.perm, 2, 'p')}<p class="lbl">Straordinari (dalle → alle)</p>${sl(e.ot, 2, 'o')}
  <p class="lbl">Nota</p><textarea data-s="note" rows="2">${esc(e.note)}</textarea>
  <div class="row"><button class="primary" data-act="saveDay">Salva</button><button data-act="clearDay" class="danger">Cancella giorno</button><button data-act="close" class="ghost">Annulla</button></div></div></div>`;
}
function saveDay() {
  const y = ui.year, k = key(y, ui.month, ui.edit.d), g = n => document.querySelector(`[data-s="${n}"]`).value;
  const sl = p => [0, 1].map(i => [g(p + i + 'a'), g(p + i + 'b')]).filter(x => x[0] && x[1]);
  const e = { codes: ui.edit.codes, perm: sl('p'), ot: sl('o'), note: g('note').trim() };
  if (e.codes.length || e.perm.length || e.ot.length || e.note) DB.years[y].days[k] = e; else delete DB.years[y].days[k];
  save(); ui.edit = null; render();
}

// ---------- REPORT ----------
function repView() {
  const y = ui.year, Y = DB.years[y]; if (!Y) return '';
  const rows = yearCalc(Y, y), P = Y.params, M = cm(), sel = ui.rep >= 0 ? [rows[ui.rep]] : rows, last = sel[sel.length - 1];
  const tot = {}; sel.forEach(r => { for (const c in r.s.counts) tot[c] = (tot[c] || 0) + r.s.counts[c]; });
  const perm = sel.reduce((t, r) => t + r.s.perm, 0), ot = sel.reduce((t, r) => t + r.s.ot, 0);
  const bars = (items, fmt = v => v) => { const mx = Math.max(1, ...items.map(i => i[1])); return items.map(([l, v, col]) => `<div class="b"><span>${l}</span><i style="width:${v / mx * 100}%;background:${col || 'var(--ac)'}"></i><em>${fmt(v)}</em></div>`).join(''); };
  const otDays = sel.flatMap(r => r.s.otDays.map(([d, mn]) => `${d} ${MESI[r.m].slice(0, 3).toLowerCase()}: ${fmtH(mn)}`));
  const F = tot.F || 0;
  return `<div class="tools"><select data-f="rep"><option value="-1">Anno ${y} intero</option>${MESI.map((n, i) => `<option value="${i}"${ui.rep === i ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
  <div class="card"><h3>Presenze · codici registrati</h3>${bars(Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([c, v]) => [`${chip(c, M)} ${esc(M[c]?.desc || '')}`, v, M[c]?.color]))}${Object.keys(tot).length ? '' : '<p class="mut">Nessun dato nel periodo.</p>'}</div>
  <div class="card"><h3>Ferie</h3><div class="kv"><div><span>Utilizzate (cod. F)</span><b>${F}</b></div>${P.ferieDisp != null ? `<div><span>Disponibili anno</span><b>${P.ferieDisp}</b></div><div><span>Residue a fine anno</span><b>${P.ferieDisp - rows.reduce((t, r) => t + (r.s.counts.F || 0), 0)}</b></div>` : '<div><span>Disponibili</span><b>non impostate</b></div>'}</div></div>
  <div class="card"><h3>Permessi</h3><div class="kv"><div><span>Disponibilità mensile</span><b>${P.permMin} min</b></div><div><span>Usati nel periodo</span><b>${fmtH(perm)}</b></div>${ui.rep >= 0 ? `<div><span>Residuo mese</span><b>${num(last.permLeft)} min</b></div>` : ''}</div>${bars(rows.map(r => [MESI[r.m].slice(0, 3), r.s.perm]), v => fmtH(v))}</div>
  <div class="card"><h3>Congedi</h3><div class="kv">${P.congedi.map((c, i) => `<div><span>${esc(c.label)}</span><b>${num(c.initial - last.congLeft[i])} usati · residuo ${num(last.congLeft[i])} su ${c.initial}</b></div>`).join('')}</div></div>
  <div class="card"><h3>Straordinari</h3><div class="kv"><div><span>Totale periodo</span><b>${num(ot / 60)} h</b></div><div><span>Totale anno</span><b>${num(rows[11].otCum)} h</b></div></div>${bars(rows.map(r => [MESI[r.m].slice(0, 3), r.s.ot / 60]), v => num(v))}<p class="mut">${otDays.length ? 'Giorni con straordinario → ' + otDays.join(' · ') : 'Nessun straordinario nel periodo.'}</p></div>
  <div class="card"><h3>Tabella mensile ${y}</h3><div class="scroll"><table><tr><th>Mese</th><th>Perm. usati</th><th>Perm. residui</th>${P.congedi.map(c => `<th>${esc(c.code)} res.</th>`).join('')}<th>Straord. h</th><th>Cumul. h</th><th>T</th><th>M</th><th>I</th><th>FN</th><th>FS</th></tr>${rows.map(r => `<tr><td>${MESI[r.m].slice(0, 3)}</td><td>${fmtH(r.s.perm)}</td><td>${num(r.permLeft)}</td>${r.congLeft.map(v => `<td>${num(v)}</td>`).join('')}<td>${num(r.s.ot / 60)}</td><td>${num(r.otCum)}</td>${['T','M','I','FN','FS'].map(c => `<td>${r.s.counts[c] || 0}</td>`).join('')}</tr>`).join('')}</table></div></div>`;
}

// ---------- IMPOSTAZIONI ----------
const SUBS = [['codici','Codici'],['anni','Anni'],['param','Parametri annuali'],['backup','Backup e dati'],['excel','Excel'],['gen','Generali'],['reset','Reset']];
function setView() {
  const s = ui.sub, nav = `<div class="subnav">${SUBS.map(([k, n]) => `<button data-act="sub" data-k="${k}" class="${s === k ? 'on' : ''}">${n}</button>`).join('')}</div>`;
  return nav + (ui.msg ? `<div class="card ok">${ui.msg}</div>` : '') + ({ codici: setCodici, anni: setAnni, param: setParam, backup: setBackup, excel: setExcel, gen: setGen, reset: setReset }[s])();
}
function setCodici() {
  const cats = [...new Set(DB.codes.map(c => c.cat))];
  return `<datalist id="cats">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist><p class="mut">I codici partono da quelli presenti nel file Excel. Se un codice è già usato non si elimina: si disattiva.</p>
  ${DB.codes.map((c, i) => { const u = usedCount(c.code); return `<div class="card code"><div class="r"><input data-f="code" data-i="${i}" value="${esc(c.code)}" class="cd" aria-label="Codice"><input type="color" data-f="color" data-i="${i}" value="${c.color}"><label><input type="checkbox" data-f="active" data-i="${i}" ${c.active ? 'checked' : ''}> Attivo</label><button class="danger" data-act="delCode" data-i="${i}">🗑</button></div>
  <input data-f="desc" data-i="${i}" value="${esc(c.desc)}" placeholder="Descrizione (da definire)"><div class="r"><input data-f="cat" data-i="${i}" value="${esc(c.cat)}" list="cats" placeholder="Categoria"><input data-f="val" data-i="${i}" type="number" step="any" value="${c.val ?? ''}" placeholder="Valore/ore"></div><small class="mut">Usato in ${u} giorni</small></div>`; }).join('')}
  <button class="primary" data-act="addCode">＋ Nuovo codice</button>`;
}
function setAnni() {
  return `${ys().map(y => `<div class="card r"><b>${y}</b><span class="mut">${Object.keys(DB.years[y].days).length} giorni registrati${DB.years[y].archived ? ' · archiviato' : ''}</span><button data-act="arch" data-y="${y}">${DB.years[y].archived ? 'Riattiva' : 'Archivia'}</button></div>`).join('')}
  <div class="card"><h3>Nuovo anno</h3><div class="r"><input id="ny" type="number" value="${+ys().pop() + 1}"><label><input type="checkbox" id="carry" checked> Riporta i residui congedi dall'anno precedente</label></div><p class="mut">Il calendario (mesi, giorni, bisestili) è generato automaticamente. Le presenze non vengono copiate.</p><button class="primary" data-act="addYear">Crea anno</button></div>`;
}
function setParam() {
  const y = ui.year, P = DB.years[y]?.params; if (!P) return '';
  return `<div class="tools"><select data-f="year">${ys().map(v => `<option${+v === y ? ' selected' : ''}>${v}</option>`).join('')}</select></div><div class="card"><h3>Parametri ${y} <span class="tag">inseriti</span></h3>
  <label>Permessi disponibili al mese (minuti)<input id="pm" type="number" value="${P.permMin}"></label>
  <label>Ferie disponibili (giorni, facoltativo)<input id="fd" type="number" step="any" value="${P.ferieDisp ?? ''}"></label>
  <p class="lbl">Congedi / contatori (codice · nome · disponibilità iniziale)</p>${P.congedi.map((c, i) => `<div class="r"><input data-p="code${i}" value="${esc(c.code)}" class="cd"><input data-p="label${i}" value="${esc(c.label)}"><input data-p="ini${i}" type="number" step="any" value="${c.initial}" class="cd"><button class="danger" data-act="delCong" data-i="${i}">🗑</button></div>`).join('')}
  <button data-act="addCong">＋ Contatore</button> <button class="primary" data-act="saveParam">Salva parametri</button></div>`;
}
function setBackup() {
  const d = t => t ? new Date(t).toLocaleString('it-IT') : '—', n = ys().reduce((t, y) => t + Object.keys(DB.years[y].days).length, 0), old = !DB.settings.lastExport || Date.now() - DB.settings.lastExport > 30 * 864e5;
  return `<div class="card ${old ? 'warn' : ''}"><h3>💾 Dati salvati solo su questo dispositivo</h3><p>Sono memorizzati nel browser (nessun cloud). ${old ? '<b>Fai un backup: se cancelli i dati del browser li perdi.</b>' : ''}</p>
  <button class="primary" data-act="expJson">📥 Esporta backup</button> <label class="btn">📤 Importa backup<input type="file" accept=".json" data-act="impJson" hidden></label></div>
  <div class="card"><h3>Stato dati</h3><div class="kv"><div><span>Anni</span><b>${ys().length}</b></div><div><span>Giornate registrate</span><b>${n}</b></div><div><span>Codici</span><b>${DB.codes.length}</b></div><div><span>Ultima modifica</span><b>${d(DB.settings.lastModified)}</b></div><div><span>Ultima esportazione</span><b>${d(DB.settings.lastExport)}</b></div><div><span>Sincronizzazione</span><b>Locale</b></div></div></div>`;
}
function setExcel() { return `<div class="card"><button class="primary" data-act="expXlsx">📊 Esporta Excel</button><p class="mut">Fogli: Giorni, Riepilogo, Codici.</p></div><div class="card"><label class="btn">📊 Importa Excel<input type="file" accept=".xlsx,.xls" data-act="impXlsx" hidden></label><p class="mut">Stesso formato del Registro Presenze originale (un foglio per anno). Prima di importare vedrai un riepilogo e dovrai confermare.</p></div>`; }
function setGen() { const s = DB.settings; return `<div class="card"><label>Aspetto<select data-f="theme">${[['auto','Automatico'],['light','Chiaro'],['dark','Scuro']].map(([v, n]) => `<option value="${v}"${s.theme === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label><label>Primo giorno della settimana<select data-f="ws"><option value="1"${s.weekStart == 1 ? ' selected' : ''}>Lunedì</option><option value="0"${s.weekStart == 0 ? ' selected' : ''}>Domenica</option></select></label></div>`; }
function setReset() { return `<div class="card warn"><h3>⚠️ Ripristina applicazione</h3><p>Cancella tutti i dati e ripristina quelli iniziali importati dal file Excel originale.</p><button class="danger" data-act="reset">Ripristina…</button></div>`; }

// ---------- EXCEL ----------
function parseXlsx(buf) {
  const wb = XLSX.read(buf, { type: 'array', cellFormula: true }), out = {}, g = (ws, r, c) => ws[XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })];
  const val = (ws, r, c) => g(ws, r, c)?.v, hm = f => { const t = Math.round((f % 1) * 1440); return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`; };
  wb.SheetNames.filter(n => /^\d{4}$/.test(n)).forEach(n => {
    const ws = wb.Sheets[n], days = {}, cong = [];
    [[9, 7], [10, 9], [11, 11]].forEach(([r, c]) => { const code = val(ws, 24, c), a = g(ws, r, 39), f = a?.f ? /^(\d+)-/.exec(a.f) : null; if (code) cong.push({ code: String(code), label: String(val(ws, r, 37) || code).replace(' residuo', ''), initial: f ? +f[1] : (typeof a?.v === 'number' && !a.f ? a.v : 0) }); });
    const pf = /^(\d+)-/.exec(g(ws, 8, 39)?.f || '');
    for (let i = 0; i < 12; i++) { const b = 8 + 24 * i; for (let c = 3; c <= 33; c++) {
      const ser = val(ws, b + 2, c); if (typeof ser !== 'number') continue; const dt = new Date(Math.round((ser - 25569) * 864e5)); if (dt.getUTCMonth() !== i) continue;
      const codes = [3, 4, 5].map(a => val(ws, b + a, c)).filter(x => x != null && String(x).trim()).map(x => String(x).trim());
      const sl = (a1, a2) => [a1, a2].map(a => [val(ws, b + a, c), val(ws, b + a + 1, c)]).filter(x => typeof x[0] === 'number' && typeof x[1] === 'number').map(x => [hm(x[0]), hm(x[1])]);
      const perm = sl(7, 9), ot = sl(12, 14);
      if (codes.length || perm.length || ot.length) days[`${dt.getUTCFullYear()}-${pad(i + 1)}-${pad(dt.getUTCDate())}`] = { codes, perm, ot, note: '' };
    } }
    out[n] = { archived: false, params: { permMin: pf ? +pf[1] : 240, congedi: cong, ferieDisp: null }, days };
  });
  return out;
}
async function impXlsx(file) {
  const yrs = parseXlsx(await file.arrayBuffer()), names = Object.keys(yrs);
  if (!names.length) return alert('Nessun foglio con nome anno (es. "2026") trovato.');
  const known = new Set(DB.codes.map(c => c.code)), unk = new Set(); let rec = 0, conf = 0;
  names.forEach(y => { const Y = yrs[y]; Y.params.congedi.forEach(c => !known.has(c.code) && unk.add(c.code)); for (const k in Y.days) { rec++; Y.days[k].codes.forEach(c => !known.has(c) && unk.add(c)); const o = DB.years[y]?.days[k]; if (o && JSON.stringify(o) !== JSON.stringify(Y.days[k])) conf++; } });
  if (!confirm(`Anni trovati: ${names.join(', ')}\nGiornate con dati: ${rec}\nConflitti (giorni già presenti e diversi): ${conf}\nCodici nuovi: ${unk.size ? [...unk].join(', ') : 'nessuno'}\n\nI dati degli anni importati sostituiranno quelli attuali. Prima verrà scaricato un backup. Continuare?`)) return;
  exportJSON(); const pal = ['#0891b2', '#db2777', '#65a30d', '#ea580c'];
  unk.forEach((c, i) => DB.codes.push({ code: c, desc: '', cat: 'Da definire', color: pal[i % 4], val: null, active: true }));
  names.forEach(y => { const keep = DB.years[y]?.archived; DB.years[y] = yrs[y]; DB.years[y].archived = !!keep; });
  save(); ui.msg = `Importati ${names.length} anni, ${rec} giornate.`; render();
}
function expXlsx() {
  const wb = XLSX.utils.book_new(), days = [], rie = [];
  ys().forEach(y => { const Y = DB.years[y], P = Y.params; Object.keys(Y.days).sort().forEach(k => { const e = Y.days[k], dt = new Date(k + 'T12:00:00'); days.push({ Anno: +y, Data: k, Giorno: GS[dt.getDay()], Codici: e.codes.join(' '), 'Permessi (min)': slotMins(e.perm), 'Permessi (orari)': e.perm.map(x => x.join('-')).join(' / '), 'Straordinari (ore)': num(slotMins(e.ot) / 60), 'Straordinari (orari)': e.ot.map(x => x.join('-')).join(' / '), Nota: e.note }); });
    yearCalc(Y, +y).forEach(r => { const o = { Anno: +y, Mese: MESI[r.m], 'Permessi usati (min)': r.s.perm, 'Permessi residui (min)': num(r.permLeft) }; P.congedi.forEach((c, i) => o[`${c.label} residuo`] = num(r.congLeft[i])); Object.assign(o, { 'Straordinario mese (h)': num(r.s.ot / 60), 'Straordinario cumulato (h)': num(r.otCum) }); ['T','M','I','FN','FS'].forEach(c => o[c] = r.s.counts[c] || 0); rie.push(o); }); });
  [[days, 'Giorni'], [rie, 'Riepilogo'], [DB.codes.map(c => ({ Codice: c.code, Descrizione: c.desc, Categoria: c.cat, Colore: c.color, Valore: c.val, Attivo: c.active ? 'sì' : 'no' })), 'Codici']].forEach(([d, n]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d), n));
  XLSX.writeFile(wb, `registro-presenze-${today()}.xlsx`);
}

// ---------- EVENTI ----------
const A = {
  day: t => { ui.edit = { d: +t.dataset.d }; }, close: () => { ui.edit = null; }, tog: t => { const c = t.dataset.c, a = ui.edit.codes, i = a.indexOf(c); if (i >= 0) a.splice(i, 1); else if (a.length < 3) a.push(c); else alert('Massimo 3 codici per giorno (come nel foglio Excel).'); t.classList.toggle('on', a.includes(c)); },
  saveDay, clearDay: () => { delete DB.years[ui.year].days[key(ui.year, ui.month, ui.edit.d)]; save(); ui.edit = null; },
  prev: () => { if (--ui.month < 0) { ui.month = 11; ui.year--; if (!DB.years[ui.year]) { ui.year++; ui.month = 0; } } }, next: () => { if (++ui.month > 11) { ui.month = 0; ui.year++; if (!DB.years[ui.year]) { ui.year--; ui.month = 11; } } },
  oggi: () => { if (DB.years[now.getFullYear()]) { ui.year = now.getFullYear(); ui.month = now.getMonth(); } },
  tab: t => { ui.tab = t.dataset.k; ui.msg = ''; }, sub: t => { ui.sub = t.dataset.k; ui.msg = ''; },
  addCode: () => { DB.codes.push({ code: 'NUOVO', desc: '', cat: 'Da definire', color: '#64748b', val: null, active: true }); save(); },
  delCode: t => { const c = DB.codes[+t.dataset.i]; if (usedCount(c.code)) return alert(`"${c.code}" è già usato nel registro: disattivalo invece di eliminarlo, per non perdere lo storico.`); if (confirm(`Eliminare il codice ${c.code}?`)) { DB.codes.splice(+t.dataset.i, 1); save(); } },
  arch: t => { DB.years[t.dataset.y].archived = !DB.years[t.dataset.y].archived; save(); },
  addYear: () => { const y = +document.getElementById('ny').value; if (!(y >= 1990 && y <= 2100) || DB.years[y]) return alert('Anno non valido o già presente.'); const p = DB.years[y - 1], carry = document.getElementById('carry').checked && p;
    const congedi = p ? yearCalc(p, y - 1)[11].congLeft.map((l, i) => ({ ...p.params.congedi[i], initial: carry ? l : p.params.congedi[i].initial })) : [];
    DB.years[y] = { archived: false, params: { permMin: p?.params.permMin ?? 240, congedi, ferieDisp: null }, days: {} }; save(); ui.msg = `Anno ${y} creato. Controlla i parametri annuali.`; },
  delCong: t => { DB.years[ui.year].params.congedi.splice(+t.dataset.i, 1); save(); },
  addCong: () => { collectParam(); DB.years[ui.year].params.congedi.push({ code: '', label: 'Nuovo contatore', initial: 0 }); save(); },
  saveParam: () => { collectParam(); save(); ui.msg = 'Parametri salvati: il Report è stato ricalcolato.'; },
  expJson: () => { exportJSON(); }, expXlsx: () => expXlsx(),
  reset: () => { if (!confirm('Verranno cancellati TUTTI i dati. Continuare?')) return; if (confirm('Vuoi scaricare prima un backup? (consigliato)\nOK = scarica backup')) exportJSON(); if (prompt('Seconda conferma: scrivi RESET per cancellare tutto.') !== 'RESET') return; DB = clone(window.SEED); save(); applyTheme(); ui.year = ys().filter(y => !DB.years[y].archived).pop(); ui.msg = 'Applicazione ripristinata.'; },
};
function collectParam() { const P = DB.years[ui.year].params, q = n => document.querySelector(`[data-p="${n}"]`); if (!document.getElementById('pm')) return; P.permMin = +document.getElementById('pm').value || 0; const f = document.getElementById('fd').value; P.ferieDisp = f === '' ? null : +f; P.congedi.forEach((c, i) => { c.code = q('code' + i).value.trim(); c.label = q('label' + i).value.trim(); c.initial = +q('ini' + i).value || 0; }); }
document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-act]'); if (!t || t.tagName === 'INPUT') return; const a = t.dataset.act; if (!A[a] || (a === 'close' && ev.target !== t)) return; A[a](t);
  if (a === 'tog') return; render();
});
document.addEventListener('change', ev => {
  const t = ev.target, a = t.dataset.act, f = t.dataset.f;
  if (a === 'goto' && t.value) { const [y, m, d] = t.value.split('-').map(Number); if (DB.years[y]) { ui.year = y; ui.month = m - 1; ui.edit = { d }; render(); } else alert('Anno non presente.'); return; }
  if (a === 'impJson') { const r = new FileReader(); r.onload = () => { try { const o = JSON.parse(r.result); if (!o.years || !o.codes) throw 0; if (!confirm('Il ripristino sostituirà i dati attualmente presenti. Vuoi continuare?\n(Verrà scaricato prima un backup dei dati attuali.)')) return; exportJSON(); DB = o; save(); applyTheme(); ui.year = +ys().pop(); ui.msg = 'Backup ripristinato.'; render(); } catch (e) { alert('File di backup non valido.'); } }; r.readAsText(t.files[0]); t.value = ''; return; }
  if (a === 'impXlsx') { impXlsx(t.files[0]).catch(e => alert('Errore lettura Excel: ' + e.message)); t.value = ''; return; }
  if (!f) return; const i = +t.dataset.i;
  if (f === 'year') ui.year = +t.value; else if (f === 'filter') ui.filter = t.value; else if (f === 'rep') ui.rep = +t.value; else if (f === 'theme') { DB.settings.theme = t.value; save(); applyTheme(); } else if (f === 'ws') { DB.settings.weekStart = +t.value; save(); }
  else {
    const c = DB.codes[i];
    if (f === 'code') { const v = t.value.trim(); if (!v || DB.codes.some((x, j) => j !== i && x.code === v)) { alert('Codice vuoto o già esistente.'); return render(); } for (const Y of Object.values(DB.years)) { Object.values(Y.days).forEach(e => e.codes = e.codes.map(x => x === c.code ? v : x)); Y.params.congedi.forEach(x => x.code === c.code && (x.code = v)); } c.code = v; }
    else if (f === 'active') c.active = t.checked; else if (f === 'val') c.val = t.value === '' ? null : +t.value; else c[f] = t.value;
    save();
  }
  render();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.edit) { ui.edit = null; render(); } });

// ---------- RENDER ----------
function render() {
  const ysel = ys().filter(y => !DB.years[y].archived || +y === ui.year);
  document.getElementById('app').innerHTML = `<header><h1>Registro Presenze</h1><select data-f="year" aria-label="Anno">${ysel.map(y => `<option${+y === ui.year ? ' selected' : ''}>${y}</option>`).join('')}</select></header><main>${{ cal: calView, rep: repView, set: setView }[ui.tab]()}</main>
  <nav>${[['cal','📅','Calendario'],['rep','📊','Report'],['set','⚙️','Impostazioni']].map(([k, i, n]) => `<button data-act="tab" data-k="${k}" class="${ui.tab === k ? 'on' : ''}">${i}<span>${n}</span></button>`).join('')}</nav><div id="modal">${ui.edit ? editView() : ''}</div>`;
}
applyTheme(); localStorage[LS] = JSON.stringify(DB); render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
