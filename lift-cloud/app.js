/* =====================================================================
   LIFT — suivi de musculation + coach IA (Gemini). PWA.
   Comptes + données : Firebase (voir backend.js), synchronisés en temps réel.
   Clé Gemini : uniquement sur l'appareil (localStorage).
   ===================================================================== */
import * as backend from './backend.js';

/* ---------- utilitaires ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 9));
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : null; };
const fmt = n => n == null ? '–' : String(Math.round(n * 100) / 100).replace('.', ',');
const fmtIn = n => n == null ? '' : String(n).replace('.', ',');
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const fmtDate = ts => new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const fmtDateL = ts => cap(new Date(ts).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
const dur = ms => { const m = Math.max(1, Math.round(ms / 60000)); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); };
const clock = ms => {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(x).padStart(2, '0');
};
const addDays = (ts, n) => { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); };
const mondayOf = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); };
const standalone = () => navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);

/* ---------- données de base ---------- */
const MUSCLES = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps', 'Ischios', 'Fessiers', 'Mollets', 'Abdos'];
const SEED = {
  Pectoraux: ['Développé couché (barre)', 'Développé couché (haltères)', 'Développé incliné (barre)', 'Développé incliné (haltères)', 'Développé couché (machine)', 'Développé incliné (machine)', 'Pec deck (butterfly)', 'Écartés poulie vis-à-vis', 'Dips (pectoraux)', 'Pompes'],
  Dos: ['Tractions', 'Tirage vertical (poulie haute)', 'Tirage horizontal (poulie basse)', 'Rowing barre', 'Rowing haltère (unilatéral)', 'Rowing machine', 'Pull-over poulie', 'Soulevé de terre', 'Shrugs'],
  'Épaules': ['Développé militaire (barre)', 'Développé épaules (haltères)', 'Développé épaules (machine)', 'Élévations latérales (haltères)', 'Élévations latérales (poulie)', 'Élévations latérales (machine)', 'Oiseau (haltères)', 'Reverse pec deck', 'Face pull'],
  Biceps: ['Curl barre', 'Curl haltères', 'Curl incliné', 'Curl marteau', 'Curl pupitre (machine)', 'Curl poulie basse'],
  Triceps: ['Extension poulie haute (corde)', 'Extension poulie haute (barre)', 'Barre au front', 'Dips (triceps)', 'Extension nuque (haltère)', 'Extension triceps (machine)', 'Kickback poulie'],
  Quadriceps: ['Squat (barre)', 'Squat (Smith)', 'Presse à cuisses', 'Leg extension', 'Hack squat', 'Fentes marchées', 'Squat bulgare'],
  Ischios: ['Leg curl assis', 'Leg curl allongé', 'Soulevé de terre jambes tendues', 'Good morning'],
  Fessiers: ['Hip thrust', 'Hip thrust (machine)', 'Abduction (machine)', 'Kickback poulie (fessiers)'],
  Mollets: ['Mollets debout (machine)', 'Mollets assis (machine)', 'Mollets à la presse'],
  Abdos: ['Crunch poulie', 'Crunch (machine)', 'Relevé de jambes', 'Roue abdominale']
};
const GOALS = {
  hypertrophie: { label: 'Prise de muscle', ia: 'prise de muscle (hypertrophie)' },
  force: { label: 'Force', ia: 'gain de force maximale' },
  seche: { label: 'Perte de gras', ia: 'perte de gras en conservant le muscle' },
  forme: { label: 'Forme / entretien', ia: 'forme générale et entretien' }
};
const LEVELS = ['débutant', 'intermédiaire', 'avancé'];

/* ---------- réglages ---------- */
// Réglages synchronisés entre appareils (SYNCED) ; clé API et modèle restent propres à chaque appareil.
const DEF = { goal: 'hypertrophie', perWeek: 4, level: 'intermédiaire', apiKey: '', model: 'gemini-3.5-flash', rest: 90, bw: '', pseudo: '' };
const SYNCED = ['goal', 'perWeek', 'level', 'bw', 'rest', 'pseudo'];
let cfg = { ...DEF };
try { cfg = { ...DEF, ...JSON.parse(localStorage.getItem('lift.cfg') || '{}') }; } catch (e) { }
const storeCfg = () => { try { localStorage.setItem('lift.cfg', JSON.stringify(cfg)); } catch (e) { } };
let cfgTimer = null;
const saveCfg = () => {
  storeCfg();
  if (!S.user) return;
  clearTimeout(cfgTimer);
  cfgTimer = setTimeout(() => backend.saveSettings(S.user.uid, Object.fromEntries(SYNCED.map(k => [k, cfg[k]]))).catch(syncError), 600);
};
const loadAnalysis = () => { try { return JSON.parse(localStorage.getItem('lift.analysis') || 'null'); } catch (e) { return null; } };

/* ---------- état ---------- */
const S = {
  tab: 'train', exercises: [], custom: [], workouts: [], routines: [], active: null,
  user: null, authReady: false, loading: false, setup: false, syncErr: '',
  auth: { mode: 'login', err: '', info: '', busy: false, email: '' }
};
const seedList = () => { let i = 0; const out = []; for (const [muscle, names] of Object.entries(SEED)) for (const name of names) out.push({ id: 'x' + (++i), name, muscle, custom: false }); return out; };
const SEEDS = seedList();
const rebuildEx = () => { S.exercises = [...SEEDS, ...S.custom]; };
rebuildEx();
const ex = id => S.exercises.find(e => e.id === id);
const exName = id => ex(id)?.name || 'Exercice supprimé';
const finished = () => S.workouts.filter(w => w.endedAt).sort((a, b) => a.startedAt - b.startedAt);
const newSet = () => ({ w: null, r: null, done: false, type: 'N' });

/* ---------- synchro cloud ---------- */
function syncError(e) {
  const c = (e && (e.code || e.message)) || '';
  S.syncErr = /permission/i.test(c) ? 'Accès refusé par Firebase : vérifie que les règles Firestore sont publiées (voir le guide).' : 'Synchronisation impossible pour le moment. Tes données restent sur cet appareil et seront envoyées au retour du réseau.';
  renderSoft();
}
function put(col, obj) {
  if (!S.user) return;
  if (col === 'workouts') obj.updatedAt = Date.now();
  backend.save(S.user.uid, col, obj).catch(syncError);
}
function del(col, id) { if (S.user) backend.remove(S.user.uid, col, id).catch(syncError); }
let saveTimer = null;
function flush() { clearTimeout(saveTimer); saveTimer = null; if (S.active) put('workouts', S.active); }
// Sauvegarde de la séance en cours, regroupée pour limiter les écritures (quota gratuit).
function persist() {
  if (!S.active) return;
  S.active.updatedAt = Date.now();
  clearTimeout(saveTimer); saveTimer = setTimeout(flush, 500);
}
const typing = () => { const a = document.activeElement; return !!a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName); };
// Évite de recréer l'écran pendant que tu tapes une valeur.
function renderSoft() { if (typing()) S.dirty = true; else render(); }
document.addEventListener('focusout', () => { setTimeout(() => { if (S.dirty && !typing()) { S.dirty = false; render(); } }, 80); });

let unsubs = [];
function startSession(user) {
  S.user = user; S.loading = true; S.syncErr = ''; S.tab = 'train';
  S.auth = { mode: 'login', err: '', info: '', busy: false, email: '' }; render();
  const seen = new Set();
  const ready = k => { seen.add(k); if (seen.size >= 4 && S.loading) { S.loading = false; render(); } };
  setTimeout(() => { if (S.loading) { S.loading = false; render(); } }, 7000);
  unsubs = [
    backend.watch(user.uid, 'workouts', (list, m) => { if (list) applyWorkouts(list); else syncError(m && m.error); ready('w'); }),
    backend.watch(user.uid, 'routines', (list, m) => { if (list) applyRoutines(list); else syncError(m && m.error); ready('r'); }),
    backend.watch(user.uid, 'exercises', (list, m) => { if (list) applyCustom(list); else syncError(m && m.error); ready('e'); }),
    backend.watchSettings(user.uid, s => { applySettings(s); ready('s'); })
  ];
}
function endSession() {
  unsubs.forEach(f => { try { f(); } catch (e) { } }); unsubs = [];
  S.user = null; S.workouts = []; S.routines = []; S.custom = []; rebuildEx(); S.active = null; S.loading = false; S.syncErr = '';
  S.auth = { mode: 'login', err: '', info: '', busy: false, email: '' };
  // Rien du compte précédent ne doit rester visible ni être recopié dans le prochain compte.
  SYNCED.forEach(k => { cfg[k] = DEF[k]; }); storeCfg();
  try { localStorage.removeItem('lift.analysis'); } catch (e) { }
  rest = null; drawRest(); unwake(); closeSheet(); render();
}
function applyWorkouts(list) {
  const local = S.active;
  // On garde notre version locale de la séance en cours tant qu'elle est plus récente que celle du cloud.
  const merged = list.map(w => (local && w.id === local.id && !(w.updatedAt > local.updatedAt)) ? local : w);
  const sig = a => a.map(w => w.id + ':' + (w.updatedAt || 0) + (w.endedAt ? 'e' : '')).sort().join();
  const changed = sig(merged) !== sig(S.workouts);
  S.workouts = merged;
  const prev = S.active;
  S.active = merged.filter(w => !w.endedAt).sort((a, b) => b.startedAt - a.startedAt)[0] || null;
  if (S.active && !prev) wake();
  if (!S.active && prev) { rest = null; drawRest(); unwake(); }
  if (changed || (prev && prev.id) !== (S.active && S.active.id)) renderSoft();
}
function applyRoutines(list) {
  list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  if (JSON.stringify(list) === JSON.stringify(S.routines)) return;
  S.routines = list; renderSoft();
}
function applyCustom(list) {
  list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  if (JSON.stringify(list) === JSON.stringify(S.custom)) return;
  S.custom = list; rebuildEx(); renderSoft();
}
function applySettings(s) {
  if (!s) { saveCfg(); return; } // premier compte : on crée le document de réglages
  let ch = false;
  SYNCED.forEach(k => { if (s[k] !== undefined && s[k] !== cfg[k]) { cfg[k] = s[k]; ch = true; } });
  if (ch) { storeCfg(); renderSoft(); }
}

/* ---------- calculs ---------- */
const workSets = e => e.sets.filter(s => s.done && s.type !== 'W' && s.r > 0);
const setW = s => s.w || 0;
const e1rm = (w, r) => r <= 0 ? 0 : r === 1 ? w : w * (1 + Math.min(r, 12) / 30);
function best(sets) {
  let b = null;
  for (const s of sets) {
    const e = e1rm(setW(s), s.r);
    if (!b || e > b.e || (e === b.e && s.r > b.r)) b = { w: setW(s), r: s.r, e };
  }
  return b;
}
const entryVol = e => workSets(e).reduce((a, s) => a + setW(s) * s.r, 0);
const wVol = w => w.entries.reduce((a, e) => a + entryVol(e), 0);
const wSets = w => w.entries.reduce((a, e) => a + workSets(e).length, 0);
const metric = b => b ? (b.e > 0 ? b.e : b.r) : 0;

function exHistory(exId, beforeTs = Infinity) {
  const out = [];
  for (const w of finished()) {
    if (w.startedAt >= beforeTs) continue;
    for (const e of w.entries) {
      if (e.exId !== exId) continue;
      const ws = workSets(e);
      if (ws.length) out.push({ wid: w.id, t: w.startedAt, sets: ws, best: best(ws), vol: entryVol(e) });
    }
  }
  return out;
}
const prevFor = exId => { const h = exHistory(exId, S.active ? S.active.startedAt : Infinity); return h[h.length - 1] || null; };

function muscleSets(from, to) {
  const o = {};
  for (const w of finished()) {
    if (w.startedAt < from || w.startedAt >= to) continue;
    for (const e of w.entries) { const m = ex(e.exId)?.muscle || 'Autre'; o[m] = (o[m] || 0) + workSets(e).length; }
  }
  return o;
}
const fmtMuscles = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m} ${n}`).join(', ') || 'aucune';
function weeksSummary(n) {
  const ms = mondayOf(Date.now()), out = [];
  for (let k = n - 1; k >= 0; k--) {
    const a = addDays(ms, -7 * k), b = addDays(a, 7);
    out.push({ a, c: finished().filter(w => w.startedAt >= a && w.startedAt < b).length, mu: muscleSets(a, b) });
  }
  return out;
}

function prsFor(w) {
  const out = [];
  for (const e of w.entries) {
    const ws = workSets(e); if (!ws.length) continue;
    const hist = exHistory(e.exId, w.startedAt); if (!hist.length) continue;
    const b = best(ws);
    const prevE = Math.max(...hist.map(h => h.best.e)), prevW = Math.max(...hist.map(h => Math.max(...h.sets.map(setW))));
    const maxW = Math.max(...ws.map(setW));
    if (maxW > prevW) out.push(`${exName(e.exId)} : record de charge ${fmt(maxW)} kg (avant ${fmt(prevW)})`);
    else if (b.e > prevE * 1.0001) out.push(`${exName(e.exId)} : nouveau meilleur e1RM ≈ ${fmt(Math.round(b.e * 10) / 10)} kg (avant ${fmt(Math.round(prevE * 10) / 10)})`);
  }
  return out;
}

/* ---------- Gemini ---------- */
const SYSTEM = `Tu es un coach de musculation expert (hypertrophie, force, périodisation). Tu t'appuies UNIQUEMENT sur les données fournies, sans rien inventer. Réponds en français, de façon concrète et directement exploitable, avec des charges chiffrées en kg (arrondies au pas de 1,25 ou 2,5 kg) et des plages de répétitions. Si les données sont insuffisantes pour conclure, dis-le franchement. Format : titres "## ", puces "- ", **gras** pour les chiffres clés. Pas d'introduction ni de conclusion superflue. Tu ne donnes pas de conseil médical ; en cas de douleur évoquée, recommande un avis professionnel.`;

async function gemini(prompt) {
  if (!cfg.apiKey) throw new Error('NOKEY');
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 4096 }
      })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const m = j?.error?.message || '';
      if (r.status === 400 && /api key/i.test(m)) throw new Error('Clé API invalide. Vérifie-la dans l’onglet Coach.');
      if (r.status === 403) throw new Error('Accès refusé (clé invalide ou API non autorisée).');
      if (r.status === 404) throw new Error(`Modèle « ${cfg.model} » introuvable. Change le modèle dans l’onglet Coach.`);
      if (r.status === 429) throw new Error('Quota gratuit atteint. Réessaie dans quelques minutes.');
      throw new Error(`Erreur Gemini (${r.status}). ${m}`.trim());
    }
    const text = (j.candidates?.[0]?.content?.parts || []).filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
    if (!text) throw new Error('Réponse vide de Gemini' + (j.candidates?.[0]?.finishReason ? ` (${j.candidates[0].finishReason})` : '') + '.');
    return text;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Délai dépassé. Réessaie.');
    if (e.message === 'NOKEY') throw new Error('Ajoute ta clé Gemini dans l’onglet Coach.');
    if (e instanceof TypeError) throw new Error('Pas de connexion à Gemini (réseau).');
    throw e;
  } finally { clearTimeout(timer); }
}

function profileLine() {
  return `Objectif : ${GOALS[cfg.goal].ia}. Niveau : ${cfg.level}. Fréquence visée : ${cfg.perWeek} séances/semaine.` + (num(cfg.bw) ? ` Poids de corps : ${fmt(num(cfg.bw))} kg.` : '');
}
const setTxt = s => `${fmt(setW(s))}×${s.r}`;

function sessionPrompt(w) {
  const lines = w.entries.map(e => {
    const ws = workSets(e), b = best(ws), h = exHistory(e.exId, w.startedAt), p = h[h.length - 1];
    let l = `- ${exName(e.exId)} [${ex(e.exId)?.muscle || '?'}] : ${ws.map(setTxt).join(', ')} | volume ${fmt(entryVol(e))} kg | e1RM ${fmt(Math.round(b.e * 10) / 10)}`;
    l += p ? ` | séance précédente (${fmtDate(p.t)}) : ${p.sets.map(setTxt).join(', ')} (e1RM ${fmt(Math.round(p.best.e * 10) / 10)})` : ' | première fois enregistrée';
    const older = h.slice(-5, -1);
    if (older.length) l += ` | avant : ` + older.map(o => `${fmtDate(o.t)} ${setTxt(o.sets.reduce((x, y) => e1rm(setW(y), y.r) > e1rm(setW(x), x.r) ? y : x))}`).join(' ; ');
    return l;
  });
  const wk = weeksSummary(4);
  return `${profileLine()}

SÉANCE DU ${fmtDateL(w.startedAt)} « ${w.name} » — durée ${dur(w.endedAt - w.startedAt)}, ${wSets(w)} séries de travail (hors échauffement), volume ${fmt(wVol(w))} kg.
(Les séries d'échauffement sont exclues.)
${lines.join('\n')}

RECORDS : ${prsFor(w).join(' ; ') || 'aucun'}

FRÉQUENCE (4 dernières semaines, séances/semaine, séries par groupe) :
${wk.map(x => `- semaine du ${fmtDate(x.a)} : ${x.c} séance(s) — séries : ${fmtMuscles(x.mu)}`).join('\n')}

Rédige le bilan :
## Bilan de la séance (2-3 lignes : qualité, volume, point marquant)
## Progression (pour chaque exercice : verdict court + charge × reps cibles à la prochaine séance, selon la règle de double progression adaptée à l'objectif)
## Semaine (ajustement par rapport à l'objectif et aux ${cfg.perWeek} séances/semaine visées ; équilibre entre groupes musculaires ; quoi faire à la prochaine séance)
## À surveiller (1 à 2 points, seulement s'ils sont justifiés par les données)
Maximum 250 mots.`;
}

function analysisPrompt() {
  const wk = weeksSummary(6), since = wk[0].a;
  const ids = [...new Set(finished().filter(w => w.startedAt >= since).flatMap(w => w.entries.map(e => e.exId)))];
  const rows = ids.map(id => ({ id, h: exHistory(id).filter(x => x.t >= since) })).filter(r => r.h.length >= 2)
    .sort((a, b) => b.h.length - a.h.length).slice(0, 14);
  const lines = rows.map(r => {
    const h = r.h.slice(-6), ms = h.map(x => metric(x.best));
    const stag = h.length >= 3 && Math.max(...ms.slice(-3)) <= Math.max(...ms.slice(0, -3).concat([0])) * 1.005;
    return `- ${exName(r.id)} [${ex(r.id)?.muscle || '?'}] (${r.h.length} séances) : ` + h.map(x => `${fmtDate(x.t)} ${setTxt(x.sets.reduce((a, b) => e1rm(setW(b), b.r) > e1rm(setW(a), a.r) ? b : a))}`).join(' → ') + (stag ? ' | PLATEAU possible' : '');
  });
  return `${profileLine()}

DONNÉES DES 6 DERNIÈRES SEMAINES (meilleure série par séance, séries de travail uniquement) :
${wk.map(x => `- semaine du ${fmtDate(x.a)} : ${x.c} séance(s) — séries : ${fmtMuscles(x.mu)}`).join('\n')}

PROGRESSION PAR EXERCICE :
${lines.join('\n') || '(aucun exercice avec au moins 2 séances)'}

Rédige une analyse :
## Régularité (assiduité par rapport aux ${cfg.perWeek} séances/semaine visées)
## Ce qui progresse / ce qui stagne (exercices, avec chiffres)
## Volume par groupe musculaire (comparé à l'objectif ; groupes sous-stimulés ou surchargés, en séries/semaine)
## Plan pour les 2 prochaines semaines (organisation sur ${cfg.perWeek} séances/semaine, charges cibles par exercice clé, quand faire une semaine allégée si nécessaire)
Maximum 400 mots.`;
}

/* mini rendu markdown (échappé) */
function md(t) {
  const inline = s => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
  let out = '', list = false;
  for (const raw of esc(t).split('\n')) {
    const l = raw.trim();
    if (/^[-*•]\s+/.test(l)) { if (!list) { out += '<ul>'; list = true; } out += '<li>' + inline(l.replace(/^[-*•]\s+/, '')) + '</li>'; continue; }
    if (list) { out += '</ul>'; list = false; }
    if (!l) continue;
    const h = l.match(/^#{1,4}\s+(.*)/);
    out += h ? '<h4>' + inline(h[1]) + '</h4>' : '<p>' + inline(l) + '</p>';
  }
  return out + (list ? '</ul>' : '');
}

/* ---------- graphiques SVG ---------- */
function lineChart(pts, unit) {
  const W = 320, H = 150, L = 34, R = 10, T = 12, B = 22;
  if (!pts.length) return '';
  let lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v));
  if (hi - lo < 1) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.15; lo -= pad; hi += pad;
  const x = i => pts.length === 1 ? (L + W - R) / 2 : L + (W - L - R) * i / (pts.length - 1);
  const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const grid = [0, .5, 1].map(f => { const v = lo + (hi - lo) * f; return `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#272729"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${Math.round(v)}</text>`; }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Progression (${unit})">${grid}
    <path d="${d}" fill="none" stroke="#ff3030" stroke-width="2.2" stroke-linejoin="round" style="filter:drop-shadow(0 0 4px rgba(255,48,48,.6))"/>
    ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="3.2" fill="#ff3030"/>`).join('')}
    <text x="${L}" y="${H - 6}">${fmtDate(pts[0].t)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${fmtDate(pts[pts.length - 1].t)}</text></svg>`;
}
function spark(vals) {
  if (vals.length < 2) return '<svg width="64" height="28"></svg>';
  const lo = Math.min(...vals), hi = Math.max(...vals), r = hi - lo || 1;
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${(i * 62 / (vals.length - 1) + 1).toFixed(1)},${(26 - (v - lo) / r * 24).toFixed(1)}`).join(' ');
  return `<svg width="64" height="28" viewBox="0 0 64 28"><path d="${d}" fill="none" stroke="#ff3030" stroke-width="2" stroke-linejoin="round"/></svg>`;
}

/* ---------- audio, minuteur de repos, écran allumé ---------- */
let actx = null, rest = null, wl = null;
function unlockAudio() {
  try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { }
}
function beep() {
  try { navigator.vibrate && navigator.vibrate([200, 80, 200]); } catch (e) { }
  if (!actx) return;
  [0, .22, .44].forEach((t, i) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = i === 2 ? 1040 : 780; o.connect(g); g.connect(actx.destination);
    const n = actx.currentTime + t; g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(.25, n + .02); g.gain.exponentialRampToValueAtTime(.0001, n + .18);
    o.start(n); o.stop(n + .2);
  });
}
function startRest(sec) { rest = { end: Date.now() + sec * 1000, total: sec * 1000 }; drawRest(); }
function drawRest() {
  const el = $('#restbar'); if (!el) return;
  if (!rest) { el.className = ''; el.innerHTML = ''; return; }
  el.className = 'show';
  el.innerHTML = `<div class="rin"><div class="fill"></div><span class="rl">REPOS</span><span class="rt" id="rt">${clock(rest.end - Date.now())}</span>
    <button data-act="rest" data-d="-15">−15</button><button data-act="rest" data-d="15">+15</button><button data-act="restskip">Passer</button></div>`;
  tickRest();
}
function tickRest() {
  if (!rest) return;
  const left = rest.end - Date.now();
  if (left <= 0) { rest = null; beep(); drawRest(); return; }
  const rt = $('#rt'), f = $('#restbar .fill');
  if (rt) rt.textContent = clock(left);
  if (f) f.style.width = Math.min(100, left / rest.total * 100) + '%';
}
async function wake() {
  try { if (S.active && !wl && 'wakeLock' in navigator && document.visibilityState === 'visible') { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch (e) { }
}
function unwake() { try { wl && wl.release(); } catch (e) { } wl = null; }

/* ---------- vues ---------- */
const ICONS = {
  train: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.4"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/></svg>',
  history: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  progress: '<svg viewBox="0 0 24 24"><path d="M3 17l5-6 4 3 8-9"/><path d="M15 5h5v5"/></svg>',
  coach: '<svg viewBox="0 0 24 24"><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M8 10h8M8 13h5"/></svg>'
};
const TABS = [['train', 'Séance'], ['history', 'Historique'], ['progress', 'Progrès'], ['coach', 'Coach']];

function render() {
  const y = window.scrollY;
  let body, tabs = false, sign = '<div class="sign">OFF AIR</div>';
  if (S.setup) body = viewSetup();
  else if (!S.authReady) body = viewWait('Chargement…');
  else if (!S.user) body = viewAuth();
  else if (S.loading) body = viewWait('Synchronisation de tes données…');
  else {
    tabs = true;
    if (S.active) sign = '<div class="sign on"><i></i>ON AIR</div>';
    body = syncBanner() + { train: viewTrain, history: viewHistory, progress: viewProgress, coach: viewCoach }[S.tab]();
  }
  $('#app').innerHTML = `<header class="top"><div class="logo">LIFT</div>${S.user && !S.loading ? sign : ''}</header><main>${body}</main>`;
  $('#tabs').innerHTML = !tabs ? '' : TABS.map(([k, l]) => `<button class="tab ${S.tab === k ? 'on' : ''}" data-act="tab" data-t="${k}">${ICONS[k]}<span>${l}</span>${k === 'train' && S.active ? '<b class="dot"></b>' : ''}</button>`).join('');
  window.scrollTo(0, y);
}

function syncBanner() {
  if (S.syncErr) return `<div class="card hint err-card"><span>${esc(S.syncErr)}</span></div>`;
  if (!navigator.onLine) return '<div class="card hint"><span><b>Hors ligne.</b> Tu peux continuer ta séance : tout sera synchronisé au retour du réseau.</span></div>';
  return '';
}
const viewWait = t => `<div class="loading" style="padding:40px 0"><i></i>${esc(t)}</div>`;

function viewSetup() {
  return `<div class="auth"><h3>Configuration à faire</h3>
    <p class="muted">L'app n'est pas encore reliée à ton projet Firebase. Ouvre le fichier <b>firebase-config.js</b> et colle la configuration de ton projet à la place des valeurs « REMPLACE… ». Le guide (GUIDE.md) détaille chaque étape.</p></div>`;
}

function viewAuth() {
  const a = S.auth, m = a.mode;
  const title = m === 'signup' ? 'Créer un compte' : m === 'reset' ? 'Mot de passe oublié' : 'Connexion';
  const intro = m === 'signup' ? 'Tes séances sont enregistrées dans ton compte et synchronisées sur tous tes appareils. Chaque compte est séparé des autres.'
    : m === 'reset' ? 'Entre ton email : tu recevras un lien pour choisir un nouveau mot de passe.'
      : 'Connecte-toi pour retrouver tes séances sur tous tes appareils.';
  return `<div class="auth"><h3>${title}</h3><p class="muted" style="margin:-4px 0 14px;font-size:14px">${intro}</p>
    <form data-form="auth" novalidate>
      ${m === 'signup' ? '<label class="l" style="margin-top:0">Pseudo</label><input class="field" name="pseudo" autocomplete="nickname" maxlength="24" placeholder="ex. Evan">' : ''}
      <label class="l" ${m !== 'signup' ? 'style="margin-top:0"' : ''}>Email</label>
      <input class="field" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" value="${esc(a.email)}" required>
      ${m !== 'reset' ? `<label class="l">Mot de passe</label><input class="field" name="password" type="password" minlength="6" autocomplete="${m === 'signup' ? 'new-password' : 'current-password'}" required>` : ''}
      ${a.err ? `<div class="err">${esc(a.err)}</div>` : ''}${a.info ? `<div class="okmsg">${esc(a.info)}</div>` : ''}
      <button class="btn primary" type="submit" style="margin-top:12px" ${a.busy ? 'disabled' : ''}>${a.busy ? 'Patiente…' : m === 'signup' ? 'Créer mon compte' : m === 'reset' ? 'Envoyer le lien' : 'Se connecter'}</button>
    </form>
    <div class="authlinks">${m === 'login' ? '<button data-act="auth-mode" data-m="signup">Créer un compte</button><button data-act="auth-mode" data-m="reset">Mot de passe oublié ?</button>' : '<button data-act="auth-mode" data-m="login">← Retour à la connexion</button>'}</div></div>`;
}

function installHint() {
  let seen = false; try { seen = !!localStorage.getItem('lift.hint'); } catch (e) { }
  if (standalone() || seen) return '';
  return `<div class="card hint"><span>Pour l'installer comme une vraie app : bouton <b>Partager</b> de Safari → <b>Sur l'écran d'accueil</b>.</span><button class="x" data-act="hint">✕</button></div>`;
}

function viewTrain() { return S.active ? viewActive() : viewStart(); }

function viewStart() {
  const fw = finished(), ws = mondayOf(Date.now()), n = fw.filter(w => w.startedAt >= ws).length, last = fw[fw.length - 1];
  const dots = Array.from({ length: Math.max(cfg.perWeek, n) }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  return `${installHint()}
  <section class="card week"><div class="lbl">Cette semaine</div><div class="big">${n}<span> / ${cfg.perWeek} séances</span></div><div class="dots">${dots}</div></section>
  <button class="btn primary xl" data-act="start">Démarrer la séance</button>
  <div class="lbl sec">Routines</div>
  ${S.routines.map(r => `<div class="card routine"><div class="meta"><b>${esc(r.name)}</b><small>${r.exIds.length} exercice${r.exIds.length > 1 ? 's' : ''} · ${esc(r.exIds.slice(0, 3).map(exName).join(', '))}${r.exIds.length > 3 ? '…' : ''}</small></div>
    <button class="btn sm" data-act="startroutine" data-id="${r.id}">Lancer</button><button class="x" data-act="delroutine" data-id="${r.id}" aria-label="Supprimer">✕</button></div>`).join('')
    || '<p class="empty">Aucune routine pour l’instant. Crée-en une, ou enregistre une séance terminée comme routine.</p>'}
  <button class="btn ghost" data-act="newroutine">+ Nouvelle routine</button>
  ${last ? `<div class="lbl sec">Dernière séance</div>${workoutCard(last)}` : ''}`;
}

function viewActive() {
  const w = S.active;
  return `<section class="live"><div class="clock" id="clock">${clock(Date.now() - w.startedAt)}</div>
    <input class="wname" data-f="wname" value="${esc(w.name)}" aria-label="Nom de la séance" autocomplete="off">
    <button class="btn primary sm" data-act="finish">Terminer</button></section>
    ${w.entries.map(entryHtml).join('')}
    <button class="btn ghost" data-act="addex">+ Ajouter un exercice</button>
    <button class="btn danger-text" data-act="cancel">Annuler la séance</button>`;
}

function placeholders(e, i) {
  if (e.sets[i].type === 'W') return { w: '', r: '' };
  let n = 0; for (let j = 0; j <= i; j++) if (e.sets[j].type !== 'W') n++;
  for (let j = i - 1; j >= 0; j--) { const x = e.sets[j]; if (x.type !== 'W' && x.done && x.r > 0) return { w: x.w ?? 0, r: x.r }; }
  const prev = prevFor(e.exId), p = prev && prev.sets[Math.min(n, prev.sets.length) - 1];
  return p ? { w: setW(p), r: p.r } : { w: '', r: '' };
}

function entryHtml(e) {
  const m = ex(e.exId)?.muscle || '', prev = prevFor(e.exId); let n = 0;
  const rows = e.sets.map((s, i) => {
    const isW = s.type === 'W'; if (!isW) n++;
    const p = !isW && prev ? prev.sets[n - 1] : null, ph = placeholders(e, i);
    return `<div class="set ${s.done ? 'done' : ''}" data-e="${e.id}" data-i="${i}">
      <button class="setno ${isW ? 'w' : ''}" data-act="settype" aria-label="Type de série">${isW ? 'É' : n}</button>
      <div class="prev">${p ? fmt(setW(p)) + '×' + p.r : '–'}</div>
      <input class="in" data-f="w" inputmode="decimal" autocomplete="off" value="${fmtIn(s.w)}" placeholder="${fmtIn(ph.w)}" aria-label="Charge en kg">
      <input class="in" data-f="r" inputmode="numeric" autocomplete="off" value="${s.r ?? ''}" placeholder="${ph.r}" aria-label="Répétitions">
      <button class="chk" data-act="check" aria-label="Valider la série">✓</button></div>`;
  }).join('');
  return `<section class="entry" data-e="${e.id}"><div class="eh"><b>${esc(exName(e.exId))}<small>${esc(m)}</small></b><button class="x" data-act="rmex" aria-label="Retirer l'exercice">✕</button></div>
    <div class="sethead"><span>SÉRIE</span><span>PRÉC.</span><span>KG</span><span>REPS</span><span></span></div>${rows}
    <div class="setbtns"><button data-act="addset">+ Série</button><button data-act="rmset">− Série</button></div></section>`;
}

function workoutCard(w) {
  const mus = [...new Set(w.entries.map(e => ex(e.exId)?.muscle).filter(Boolean))];
  return `<button class="card wk" data-act="openw" data-id="${w.id}"><div class="t"><b>${esc(w.name)}${w.review ? '<span class="tag">Bilan</span>' : ''}</b><span>${fmtDate(w.startedAt)}</span></div>
    <div class="s"><span><em>${dur(w.endedAt - w.startedAt)}</em></span><span><em>${wSets(w)}</em> séries</span><span><em>${Math.round(wVol(w)).toLocaleString('fr-FR')}</em> kg</span></div>
    ${mus.length ? `<div class="s">${esc(mus.join(' · '))}</div>` : ''}</button>`;
}

function viewHistory() {
  const fw = finished().reverse();
  if (!fw.length) return '<p class="empty">Aucune séance terminée pour l’instant. Ton historique apparaîtra ici.</p>';
  return `<div class="lbl" style="margin-bottom:10px">${fw.length} séance${fw.length > 1 ? 's' : ''}</div>${fw.map(workoutCard).join('')}`;
}

function viewProgress() {
  const fw = finished();
  const ids = [...new Set(fw.flatMap(w => w.entries.map(e => e.exId)))];
  const rows = ids.map(id => ({ id, h: exHistory(id) })).filter(r => r.h.length).sort((a, b) => b.h[b.h.length - 1].t - a.h[a.h.length - 1].t);
  const now = Date.now(), mu = muscleSets(addDays(now, -7), now + 1), mx = Math.max(20, ...Object.values(mu));
  return `<div class="lbl" style="margin-bottom:10px">Séries de travail · 7 derniers jours</div>
  <section class="card bars">${MUSCLES.map(m => `<div class="b"><span>${m}</span><div class="track"><i style="width:${(mu[m] || 0) / mx * 100}%"></i></div><span class="n">${mu[m] || 0}</span></div>`).join('')}</section>
  <div class="lbl sec">Exercices</div>
  ${rows.map(r => {
    const last = r.h[r.h.length - 1], ser = r.h.slice(-8).map(x => metric(x.best)), d = ser.length > 1 && ser[0] > 0 ? (ser[ser.length - 1] / ser[0] - 1) * 100 : null;
    return `<button class="card prow wk" data-act="exdetail" data-id="${r.id}"><div class="meta"><b>${esc(exName(r.id))}</b><small>${esc(ex(r.id)?.muscle || '')} · ${r.h.length} séance${r.h.length > 1 ? 's' : ''}</small></div>
      ${spark(ser)}<div class="val">${fmt(last.best.w)} × ${last.best.r}<small class="${d == null ? '' : d >= 0 ? 'up' : 'down'}">${d == null ? '' : (d >= 0 ? '+' : '') + Math.round(d) + ' %'}</small></div></button>`;
  }).join('') || '<p class="empty">Les courbes de progression apparaîtront après ta première séance.</p>'}`;
}

function viewCoach() {
  const a = loadAnalysis();
  return `${installHint()}
  <div class="lbl" style="margin-bottom:10px">Compte</div>
  <section class="card"><div class="row" style="align-items:center"><div style="min-width:0"><b>${esc(cfg.pseudo || 'Mon compte')}</b><div class="muted" style="font-size:13px;overflow:hidden;text-overflow:ellipsis">${esc(S.user ? S.user.email : '')}</div>
    <div style="font:600 11px var(--mono);letter-spacing:.14em;margin-top:6px" class="${navigator.onLine && !S.syncErr ? 'up' : 'down'}">${navigator.onLine && !S.syncErr ? '● SYNCHRONISÉ' : '● HORS LIGNE / ERREUR'}</div></div>
    <button class="btn sm" style="flex:none;width:auto" data-act="logout">Se déconnecter</button></div></section>

  <div class="lbl sec">Analyse de progression</div>
  <section class="card"><p class="muted" style="margin:0 0 12px;font-size:14px">Gemini analyse tes 6 dernières semaines (régularité, progression, volume par muscle) et propose un plan pour les 2 prochaines.</p>
  <button class="btn primary" data-act="analyze" id="anbtn">Analyser ma progression</button><div id="anout">${a ? `<div class="review">${md(a.text)}<div class="meta">${new Date(a.ts).toLocaleDateString('fr-FR')} · ${esc(a.model)}</div></div>` : ''}</div></section>

  <div class="lbl sec">Mon objectif</div>
  <section class="card">
    <label class="l" style="margin-top:0">Objectif</label>
    <select class="field" data-cfg="goal">${Object.entries(GOALS).map(([k, g]) => `<option value="${k}" ${cfg.goal === k ? 'selected' : ''}>${g.label}</option>`).join('')}</select>
    <label class="l">Séances par semaine</label>
    <div class="seg">${[2, 3, 4, 5, 6].map(n => `<button class="${cfg.perWeek === n ? 'on' : ''}" data-act="perweek" data-n="${n}">${n}</button>`).join('')}</div>
    <label class="l">Niveau</label>
    <select class="field" data-cfg="level">${LEVELS.map(l => `<option ${cfg.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <div class="row"><div><label class="l">Poids de corps (kg)</label><input class="field" data-cfg="bw" inputmode="decimal" placeholder="optionnel" value="${esc(cfg.bw)}"></div>
    <div><label class="l">Repos (secondes)</label><input class="field" data-cfg="rest" inputmode="numeric" value="${cfg.rest}"></div></div>
  </section>

  <div class="lbl sec">Connexion Gemini</div>
  <section class="card">
    <small class="note">L'app utilise l'API Gemini (gratuite avec limites), pas ton abonnement. Crée une clé sur <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>. Elle reste stockée uniquement sur cet appareil (pas dans le cloud) : saisis-la une fois sur chaque appareil. Chacun utilise sa propre clé gratuite.</small>
    <label class="l" style="margin-top:0">Clé API</label>
    <input class="field" type="password" data-cfg="apiKey" placeholder="AIza…" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(cfg.apiKey)}">
    <label class="l">Modèle</label>
    <input class="field" data-cfg="model" list="models" autocapitalize="off" spellcheck="false" value="${esc(cfg.model)}">
    <datalist id="models"><option value="gemini-3.5-flash"><option value="gemini-3.1-flash-lite"><option value="gemini-2.5-flash"><option value="gemini-2.5-flash-lite"></datalist>
    <button class="btn" data-act="testkey">Tester la connexion</button><div id="keystatus" class="muted" style="font-size:14px"></div>
  </section>

  <div class="lbl sec">Données</div>
  <section class="card">
    <small class="note">Tes séances sont enregistrées dans ton compte et synchronisées en temps réel. L'export crée une copie de sécurité (la clé API n'y est jamais incluse). L'import ajoute une sauvegarde à ton compte, par exemple celle de l'ancienne version de l'app.</small>
    <div class="row"><button class="btn" data-act="export">Exporter</button><button class="btn" data-act="import">Importer</button></div>
  </section>`;
}

/* ---------- feuilles (sheets) ---------- */
function sheet(html) {
  const s = $('#sheet'); s.innerHTML = `<div class="backdrop" data-act="closesheet"></div><div class="panel"><div class="grab"></div>${html}</div>`;
  s.classList.add('open'); document.body.classList.add('lock');
}
function closeSheet() { const s = $('#sheet'); s.classList.remove('open'); s.innerHTML = ''; document.body.classList.remove('lock'); picker = null; }

/* sélecteur d'exercices */
let picker = null;
function openPicker(cb) { picker = { sel: new Set(), q: '', mu: '', cb, creating: false }; drawPicker(); }
function pkList() {
  const used = {}; finished().forEach(w => w.entries.forEach(e => { used[e.exId] = (used[e.exId] || 0) + 1; }));
  const q = norm(picker.q);
  const list = S.exercises.filter(e => (!picker.mu || e.muscle === picker.mu) && (!q || norm(e.name).includes(q)))
    .sort((a, b) => (used[b.id] || 0) - (used[a.id] || 0) || a.name.localeCompare(b.name, 'fr'));
  return list.map(e => `<button class="pk-item ${picker.sel.has(e.id) ? 'on' : ''}" data-act="pk-toggle" data-id="${e.id}"><span class="tick"></span><span>${esc(e.name)}</span><small>${esc(e.muscle)}</small></button>`).join('')
    || '<p class="empty">Aucun résultat. Crée l’exercice avec le bouton ci-dessous.</p>';
}
function drawPicker() {
  if (picker.creating) {
    sheet(`<h3>Nouvel exercice</h3><input id="nx-name" class="field" placeholder="Nom (ex. Chest press Technogym)" value="${esc(picker.q)}" autocomplete="off">
      <select id="nx-mu" class="field">${MUSCLES.map(m => `<option ${m === picker.mu ? 'selected' : ''}>${m}</option>`).join('')}</select>
      <div class="pk-foot"><button class="btn ghost" data-act="pk-back">Retour</button><button class="btn primary" data-act="pk-save">Créer</button></div>`);
    return;
  }
  sheet(`<input id="pk-q" class="field" placeholder="Rechercher un exercice" value="${esc(picker.q)}" autocomplete="off">
    <div class="chips">${['', ...MUSCLES].map(m => `<button class="chip ${picker.mu === m ? 'on' : ''}" data-act="pk-mu" data-m="${m}">${m || 'Tous'}</button>`).join('')}</div>
    <div id="pk-list" class="pk-list">${pkList()}</div>
    <div class="pk-foot"><button class="btn ghost" data-act="pk-new">+ Nouvel exercice</button><button class="btn primary" data-act="pk-ok">Ajouter (${picker.sel.size})</button></div>`);
}

function workoutDetail(w, fresh) {
  const prs = prsFor(w);
  sheet(`<h3>${esc(w.name)}</h3>
    <div class="muted" style="margin:-8px 0 8px;font-size:14px">${fmtDateL(w.startedAt)}</div>
    <div class="stats"><div class="stat"><b>${dur(w.endedAt - w.startedAt)}</b><span>Durée</span></div><div class="stat"><b>${Math.round(wVol(w)).toLocaleString('fr-FR')}</b><span>Volume (kg)</span></div>
    <div class="stat"><b>${wSets(w)}</b><span>Séries de travail</span></div><div class="stat"><b>${w.entries.length}</b><span>Exercices</span></div></div>
    ${prs.length ? `<div class="lbl sec" style="margin-top:16px">Records</div>${prs.map(p => `<div class="pr">${esc(p)}</div>`).join('')}` : ''}
    <div class="lbl sec" style="margin-top:16px">Coach IA</div><div id="review-box" data-w="${w.id}">${reviewHtml(w)}</div>
    <div class="lbl sec" style="margin-top:16px">Détail</div>
    ${w.entries.map(e => `<div style="margin:10px 0"><b>${esc(exName(e.exId))}</b><div class="chips2">${e.sets.filter(s => s.done).map(s => `<span class="sc ${s.type === 'W' ? 'w' : ''}">${s.type === 'W' ? 'É ' : ''}${fmt(setW(s))}×${s.r}</span>`).join('')}</div></div>`).join('')}
    <div class="row" style="margin-top:14px"><button class="btn" data-act="saveroutine" data-id="${w.id}">Enregistrer en routine</button>
    ${fresh ? '<button class="btn primary" data-act="closesheet">Fermer</button>' : '<button class="btn" data-act="delw" data-id="' + w.id + '" style="color:#ff8a4c">Supprimer</button>'}</div>`);
  if (fresh && cfg.apiKey && !w.review) runReview(w.id);
}
function reviewHtml(w, err) {
  if (w.review) return `<div class="review">${md(w.review.text)}<div class="meta">${new Date(w.review.ts).toLocaleDateString('fr-FR')} · ${esc(w.review.model)}</div></div><button class="btn ghost" data-act="review" data-id="${w.id}">Régénérer le bilan</button>`;
  return `${err ? `<div class="err">${esc(err)}</div>` : ''}<button class="btn ${cfg.apiKey ? 'primary' : ''}" data-act="review" data-id="${w.id}">Obtenir le bilan IA</button>${cfg.apiKey ? '' : '<small class="note">Ajoute d’abord ta clé Gemini dans l’onglet Coach.</small>'}`;
}
async function runReview(id) {
  const w = S.workouts.find(x => x.id === id); if (!w) return;
  const box = () => { const b = $('#review-box'); return b && b.dataset.w === id ? b : null; };
  if (box()) box().innerHTML = '<div class="loading"><i></i>Le coach analyse ta séance…</div>';
  try {
    const text = await gemini(sessionPrompt(w));
    w.review = { text, ts: Date.now(), model: cfg.model }; put('workouts', w);
    if (box()) box().innerHTML = reviewHtml(w);
    if (S.tab === 'history') render();
  } catch (e) { if (box()) box().innerHTML = reviewHtml(w, e.message); }
}

function exDetail(id) {
  const h = exHistory(id), unit = h.some(x => x.best.e > 0) ? 'e1RM kg' : 'reps';
  const pts = h.slice(-20).map(x => ({ t: x.t, v: Math.round(metric(x.best) * 10) / 10 }));
  const maxW = Math.max(...h.map(x => Math.max(...x.sets.map(setW)))), bestE = Math.max(...h.map(x => x.best.e));
  sheet(`<h3>${esc(exName(id))}</h3>
    <div class="stats"><div class="stat"><b>${fmt(maxW)} kg</b><span>Charge max</span></div><div class="stat"><b>${bestE > 0 ? fmt(Math.round(bestE * 10) / 10) + ' kg' : '–'}</b><span>Meilleur e1RM</span></div></div>
    <div class="lbl sec" style="margin-top:16px">Progression (${unit})</div>${lineChart(pts, unit)}
    <small class="note">e1RM = charge maximale estimée sur 1 répétition (formule d'Epley). Séries de travail uniquement.</small>
    <div class="lbl sec" style="margin-top:12px">Dernières séances</div>
    ${h.slice(-10).reverse().map(x => `<div style="margin:8px 0"><span class="muted" style="font:500 12px var(--mono)">${fmtDate(x.t)}</span><div class="chips2">${x.sets.map(s => `<span class="sc">${fmt(setW(s))}×${s.r}</span>`).join('')}</div></div>`).join('')}`);
}

/* ---------- actions ---------- */
const defaultName = () => { const d = new Date(), h = d.getHours(); return cap(DAYS[d.getDay()]) + ' ' + (h < 12 ? 'matin' : h < 18 ? 'après-midi' : 'soir'); };

function makeEntries(exIds) {
  return exIds.map(id => { const p = prevFor(id); return { id: uid(), exId: id, sets: Array.from({ length: p ? p.sets.length : 3 }, newSet) }; });
}
async function startWorkout(exIds = [], name) {
  const w = { id: uid(), startedAt: Date.now(), endedAt: null, name: name || defaultName(), entries: [], review: null };
  S.workouts.push(w); S.active = w; w.entries = makeEntries(exIds);
  put('workouts', w); S.tab = 'train'; wake(); render();
}
async function finishWorkout() {
  const w = S.active;
  const pending = w.entries.flatMap(e => e.sets).filter(s => !s.done && (s.w != null || s.r != null)).length;
  const kept = w.entries.map(e => ({ ...e, sets: e.sets.filter(s => s.done) })).filter(e => e.sets.length);
  if (!kept.length) {
    if (confirm('Aucune série validée. Supprimer cette séance ?')) await discardWorkout();
    return;
  }
  if (pending && !confirm(`${pending} série(s) non validée(s) seront ignorées. Terminer la séance ?`)) return;
  clearTimeout(saveTimer); saveTimer = null;
  w.entries = kept; w.endedAt = Date.now(); put('workouts', w);
  S.active = null; rest = null; drawRest(); unwake(); render(); workoutDetail(w, true);
}
async function discardWorkout() {
  const w = S.active; clearTimeout(saveTimer); saveTimer = null;
  S.workouts = S.workouts.filter(x => x.id !== w.id); del('workouts', w.id);
  S.active = null; rest = null; drawRest(); unwake(); render();
}
function toggleCheck(row) {
  const e = S.active.entries.find(x => x.id === row.dataset.e), i = +row.dataset.i, s = e.sets[i];
  if (!s.done) {
    const ph = placeholders(e, i);
    if (s.r == null && ph.r !== '') s.r = ph.r;
    if (s.w == null && ph.w !== '') s.w = ph.w;
    if (!(s.r > 0)) { row.classList.add('bad'); setTimeout(() => row.classList.remove('bad'), 400); return; }
    if (s.w == null) s.w = 0;
    s.done = true; if (s.type !== 'W') startRest(num(cfg.rest) > 0 ? Math.round(num(cfg.rest)) : 90);
  } else s.done = false;
  persist(); render();
}

async function saveRoutine(wid) {
  const w = S.workouts.find(x => x.id === wid); if (!w) return;
  const name = prompt('Nom de la routine', w.name.replace(/ (matin|après-midi|soir)$/, ''));
  if (!name || !name.trim()) return;
  const r = { id: uid(), name: name.trim(), exIds: w.entries.map(e => e.exId), createdAt: Date.now() };
  S.routines.push(r); put('routines', r); closeSheet(); S.tab = 'train'; render();
}
function newRoutine() {
  openPicker(async ids => {
    if (!ids.length) return;
    const name = prompt('Nom de la routine (ex. Push, Pull, Jambes)'); if (!name || !name.trim()) return;
    const r = { id: uid(), name: name.trim(), exIds: ids, createdAt: Date.now() }; S.routines.push(r); put('routines', r); render();
  });
}

async function analyze() {
  const btn = $('#anbtn'), out = $('#anout');
  if (finished().length < 2) { out.innerHTML = '<div class="err">Il faut au moins 2 séances terminées pour une analyse.</div>'; return; }
  btn.disabled = true; out.innerHTML = '<div class="loading"><i></i>Analyse en cours…</div>';
  try {
    const text = await gemini(analysisPrompt()), a = { text, ts: Date.now(), model: cfg.model };
    try { localStorage.setItem('lift.analysis', JSON.stringify(a)); } catch (e) { }
    out.innerHTML = `<div class="review">${md(text)}<div class="meta">${new Date(a.ts).toLocaleDateString('fr-FR')} · ${esc(a.model)}</div></div>`;
  } catch (e) { out.innerHTML = `<div class="err">${esc(e.message)}</div>`; }
  btn.disabled = false;
}
async function testKey() {
  const el = $('#keystatus'); el.textContent = 'Test en cours…';
  try { const t = await gemini('Réponds uniquement par le mot : OK'); el.innerHTML = `<span class="up">Connexion réussie</span> (${esc(t.slice(0, 20))})`; }
  catch (e) { el.innerHTML = `<span class="err">${esc(e.message)}</span>`; }
}

async function exportData() {
  const data = { app: 'lift', v: 2, exportedAt: Date.now(), exercises: S.exercises, workouts: S.workouts, routines: S.routines, cfg: Object.fromEntries(SYNCED.map(k => [k, cfg[k]])) };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const file = new File([blob], `lift-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Sauvegarde Lift' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
async function importData(file) {
  try {
    const d = JSON.parse(await file.text());
    if (d.app !== 'lift' || !Array.isArray(d.workouts) || !Array.isArray(d.exercises)) throw new Error();
    if (!S.user) throw new Error('nouser');
    if (!navigator.onLine) { alert('L’import nécessite une connexion internet.'); return; }
    if (!confirm(`Ajouter ${d.workouts.length} séance(s) de cette sauvegarde à ton compte ? (Les séances déjà présentes sont mises à jour, rien n’est supprimé.)`)) return;
    const isSeed = x => /^x\d+$/.test(String(x.id));
    const workouts = d.workouts.filter(w => w && w.id && Array.isArray(w.entries)).map(w => ({ ...w, updatedAt: w.updatedAt || w.endedAt || w.startedAt || Date.now() }));
    const custom = d.exercises.filter(x => x && x.id && x.name && !isSeed(x)).map(x => ({ id: x.id, name: x.name, muscle: x.muscle || 'Dos', custom: true }));
    const routines = (d.routines || []).filter(r => r && r.id && Array.isArray(r.exIds)).map((r, i) => ({ ...r, createdAt: r.createdAt || i }));
    await backend.saveMany(S.user.uid, 'exercises', custom);
    await backend.saveMany(S.user.uid, 'workouts', workouts);
    await backend.saveMany(S.user.uid, 'routines', routines);
    alert(`Import terminé : ${workouts.length} séance(s).`);
  } catch (e) { alert(e.message === 'nouser' ? 'Connecte-toi d’abord.' : 'Import impossible : fichier invalide ou erreur réseau.'); }
}

/* ---------- événements ---------- */
document.addEventListener('click', async ev => {
  const t = ev.target.closest('[data-act]'); if (!t) return;
  unlockAudio();
  const a = t.dataset.act, id = t.dataset.id, entry = () => S.active.entries.find(x => x.id === t.closest('.entry').dataset.e);
  switch (a) {
    case 'tab': S.tab = t.dataset.t; closeSheet(); render(); window.scrollTo(0, 0); break;
    case 'hint': try { localStorage.setItem('lift.hint', '1'); } catch (e) { } render(); break;
    case 'start': startWorkout(); break;
    case 'startroutine': { const r = S.routines.find(x => x.id === id); if (r) startWorkout(r.exIds.filter(ex), r.name); break; }
    case 'delroutine': if (confirm('Supprimer cette routine ?')) { S.routines = S.routines.filter(x => x.id !== id); del('routines', id); render(); } break;
    case 'newroutine': newRoutine(); break;
    case 'addex': openPicker(ids => { S.active.entries.push(...makeEntries(ids)); persist(); render(); }); break;
    case 'rmex': if (confirm('Retirer cet exercice de la séance ?')) { S.active.entries = S.active.entries.filter(x => x.id !== entry().id); persist(); render(); } break;
    case 'addset': entry().sets.push(newSet()); persist(); render(); break;
    case 'rmset': { const e = entry(); if (e.sets.length > 1) { e.sets.pop(); persist(); render(); } break; }
    case 'settype': { const row = t.closest('.set'), s = S.active.entries.find(x => x.id === row.dataset.e).sets[+row.dataset.i]; s.type = s.type === 'W' ? 'N' : 'W'; persist(); render(); break; }
    case 'check': toggleCheck(t.closest('.set')); break;
    case 'finish': finishWorkout(); break;
    case 'cancel': if (confirm('Annuler et supprimer cette séance en cours ?')) discardWorkout(); break;
    case 'rest': if (rest) { rest.end += +t.dataset.d * 1000; rest.total = Math.max(rest.total, rest.end - Date.now()); if (rest.end <= Date.now()) rest.end = Date.now() + 1000; drawRest(); } break;
    case 'restskip': rest = null; drawRest(); break;
    case 'closesheet': closeSheet(); break;
    case 'openw': { const w = S.workouts.find(x => x.id === id); if (w) workoutDetail(w, false); break; }
    case 'delw': if (confirm('Supprimer définitivement cette séance ?')) { S.workouts = S.workouts.filter(x => x.id !== id); del('workouts', id); closeSheet(); render(); } break;
    case 'review': runReview(id); break;
    case 'saveroutine': saveRoutine(id); break;
    case 'exdetail': exDetail(id); break;
    case 'pk-toggle': picker.sel.has(id) ? picker.sel.delete(id) : picker.sel.add(id); t.classList.toggle('on'); { const b = $('[data-act="pk-ok"]'); if (b) b.textContent = `Ajouter (${picker.sel.size})`; } break;
    case 'pk-mu': picker.mu = t.dataset.m; drawPicker(); break;
    case 'pk-new': picker.creating = true; if (!picker.mu) picker.mu = MUSCLES[0]; drawPicker(); break;
    case 'pk-back': picker.creating = false; drawPicker(); break;
    case 'pk-save': {
      const name = ($('#nx-name').value || '').trim(); if (!name) { $('#nx-name').focus(); break; }
      const e = { id: uid(), name, muscle: $('#nx-mu').value, custom: true };
      S.custom.push(e); rebuildEx(); put('exercises', e); picker.sel.add(e.id); picker.creating = false; picker.q = ''; picker.mu = ''; drawPicker(); break;
    }
    case 'auth-mode': S.auth = { mode: t.dataset.m, err: '', info: '', busy: false, email: S.auth.email }; render(); break;
    case 'logout': if (confirm('Te déconnecter de cet appareil ? Tes données restent dans ton compte.')) { flush(); await backend.signOut(); } break;
    case 'pk-ok': { const cb = picker.cb, ids = [...picker.sel]; closeSheet(); if (ids.length) cb(ids); break; }
    case 'perweek': cfg.perWeek = +t.dataset.n; saveCfg(); render(); break;
    case 'analyze': analyze(); break;
    case 'testkey': testKey(); break;
    case 'export': exportData(); break;
    case 'import': $('#importfile').click(); break;
  }
});

document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.id === 'pk-q' && picker) { picker.q = t.value; $('#pk-list').innerHTML = pkList(); return; }
  if (t.dataset.f === 'wname' && S.active) { S.active.name = t.value; persist(); return; }
  if ((t.dataset.f === 'w' || t.dataset.f === 'r') && S.active) {
    const row = t.closest('.set'); if (!row) return;
    const s = S.active.entries.find(x => x.id === row.dataset.e)?.sets[+row.dataset.i]; if (!s) return;
    const v = num(t.value);
    if (t.dataset.f === 'w') s.w = v == null || v < 0 ? null : v; else s.r = v == null || v < 0 ? null : Math.round(v);
    persist();
  }
});
document.addEventListener('change', ev => {
  const k = ev.target.dataset.cfg; if (!k) return;
  let v = ev.target.value;
  if (k === 'rest') v = Math.min(600, Math.max(10, Math.round(num(v) || 90)));
  if (k === 'apiKey') v = v.trim();
  if (k === 'model') v = v.trim() || DEF.model;
  cfg[k] = v; saveCfg(); if (k === 'rest') ev.target.value = v;
});
$('#importfile').addEventListener('change', ev => { const f = ev.target.files[0]; ev.target.value = ''; if (f) importData(f); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { wake(); tickRest(); } else flush(); });

setInterval(() => { const c = $('#clock'); if (c && S.active) c.textContent = clock(Date.now() - S.active.startedAt); }, 1000);
setInterval(tickRest, 250);

/* ---------- connexion ---------- */
const AUTH_ERR = {
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/wrong-password': 'Email ou mot de passe incorrect.',
  'auth/user-not-found': 'Email ou mot de passe incorrect.',
  'auth/invalid-email': 'Adresse email invalide.',
  'auth/email-already-in-use': 'Un compte existe déjà avec cet email. Connecte-toi.',
  'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
  'auth/missing-password': 'Entre ton mot de passe.',
  'auth/too-many-requests': 'Trop de tentatives. Réessaie dans quelques minutes.',
  'auth/network-request-failed': 'Pas de connexion internet.',
  'auth/operation-not-allowed': 'La connexion par email n’est pas activée dans Firebase (voir le guide).'
};
document.addEventListener('submit', async ev => {
  const f = ev.target; if (!f.matches || !f.matches('[data-form="auth"]')) return;
  ev.preventDefault();
  const fd = new FormData(f), email = String(fd.get('email') || '').trim(), pw = String(fd.get('password') || ''), pseudo = String(fd.get('pseudo') || '').trim();
  const m = S.auth.mode;
  S.auth = { ...S.auth, email, err: '', info: '', busy: true }; render();
  try {
    if (m === 'signup') { cfg.pseudo = pseudo; storeCfg(); await backend.signUp(email, pw); }
    else if (m === 'login') await backend.signIn(email, pw);
    else { await backend.resetPassword(email); S.auth = { ...S.auth, busy: false, info: 'Si un compte existe pour cet email, un lien de réinitialisation vient d’être envoyé (pense aux spams).' }; render(); return; }
    S.auth.busy = false;
  } catch (e) {
    S.auth = { ...S.auth, busy: false, err: AUTH_ERR[e && e.code] || 'Erreur de connexion. Réessaie.' }; render();
  }
});
window.addEventListener('online', renderSoft);
window.addEventListener('offline', renderSoft);
window.addEventListener('pagehide', flush);

/* ---------- démarrage ---------- */
(function init() {
  if (!backend.configured) { S.setup = true; S.authReady = true; render(); return; }
  render();
  backend.onAuth(user => {
    S.authReady = true;
    if (user) { if (!S.user || S.user.uid !== user.uid) startSession(user); }
    else if (S.user) endSession();
    else render();
  });
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
