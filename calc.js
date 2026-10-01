// Logica di calcolo (equivalente alle formule del foglio Excel). Funzioni pure, testabili in Node.
(function (root) {
  const pad = n => String(n).padStart(2, '0');
  const key = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const dim = (y, m) => new Date(y, m + 1, 0).getDate();           // gestisce gli anni bisestili
  const mins = (a, b) => { if (!a || !b) return 0; const [h1, m1] = a.split(':').map(Number), [h2, m2] = b.split(':').map(Number); const d = h2 * 60 + m2 - (h1 * 60 + m1); return d < 0 ? d + 1440 : d; };
  const slotMins = s => (s || []).reduce((t, x) => t + mins(x[0], x[1]), 0);
  // Statistiche di un mese (m = 0..11): equivalente al blocco mensile del foglio
  function monthStats(Y, y, m) {
    const st = { perm: 0, ot: 0, counts: {}, otDays: [], permDays: [] };
    for (let d = 1; d <= dim(y, m); d++) {
      const e = Y.days[key(y, m, d)]; if (!e) continue;
      const p = slotMins(e.perm), o = slotMins(e.ot);
      st.perm += p; st.ot += o;
      if (p) st.permDays.push([d, p]); if (o) st.otDays.push([d, o]);
      (e.codes || []).forEach(c => st.counts[c] = (st.counts[c] || 0) + 1);
    }
    return st;
  }
  // Calcolo annuale con residui a cascata
  function yearCalc(Y, y) {
    const P = Y.params, left = P.congedi.map(c => c.initial || 0); let otCum = 0; const rows = [];
    for (let m = 0; m < 12; m++) {
      const s = monthStats(Y, y, m);
      P.congedi.forEach((c, i) => left[i] -= s.counts[c.code] || 0);
      otCum += s.ot / 60;
      rows.push({ m, s, permLeft: P.permMin - s.perm, congLeft: left.slice(), otCum });
    }
    return rows;
  }
  const api = { pad, key, dim, mins, slotMins, monthStats, yearCalc };
  if (typeof module !== 'undefined') module.exports = api; else root.Calc = api;
})(this);
