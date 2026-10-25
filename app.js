/* =====================================================================
   LIFT — suivi de musculation + coach IA (Gemini). PWA.
   Comptes + données : Firebase (voir backend.js), synchronisés en temps réel.
   Clé Gemini : uniquement sur l'appareil (localStorage).
   ===================================================================== */
import * as backend from './backend.js';
import { FICHES } from './fiches.js';

/* Version de l'app. À incrémenter à chaque publication, en gardant CACHE
   (dans sw.js) strictement identique : 'lift-cloud-' + VERSION. */
const VERSION = 'v26';

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
// Part du poids du corps portée par l'exercice (0 = aucune). Modifiable exercice par exercice dans l'app.
const BW_DEF = { x9: 1, x10: .65, x11: 1, x38: 1, x87: 1, x88: 1, x47: .85, x48: .85, x71: .85, x85: .85, x105: .85, x106: .85, x114: .6, x115: .6 };
// Charge saisie « par côté » : haltères tenus à deux mains séparées, ou deux poulies en même temps.
const SIDES_DEF = { x2: 2, x4: 2, x21: 2, x23: 2, x26: 2, x30: 2, x31: 2, x32: 2, x77: 2, x82: 2, x83: 2, x85: 2, x92: 2 };
const MUSCLES = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps', 'Ischios', 'Fessiers', 'Mollets', 'Abdos'];
// Catalogue des exercices pré-chargés : [identifiant, nom, groupe musculaire, image, muscles principaux, muscles secondaires].
// ⚠️ Chaque identifiant est DÉFINITIF (l'historique des utilisateurs y fait référence) : ne jamais renuméroter,
// réordonner, supprimer ni réutiliser un identifiant. Pour ajouter un exercice : AJOUTER une ligne À LA FIN avec le
// prochain identifiant libre (x87, x88…). Image = identifiant de l'exercice dans la base libre « free-exercise-db »
// (domaine public), ou null s'il n'y en a pas de fiable.
const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const CATALOG = [
  ['x1', 'Développé couché (barre)', 'Pectoraux', 'Barbell_Bench_Press_-_Medium_Grip', 'chest', 'shoulders,triceps'],
  ['x2', 'Développé couché (haltères)', 'Pectoraux', 'Dumbbell_Bench_Press', 'chest', 'shoulders,triceps'],
  ['x3', 'Développé incliné (barre)', 'Pectoraux', 'Barbell_Incline_Bench_Press_-_Medium_Grip', 'chest', 'shoulders,triceps'],
  ['x4', 'Développé incliné (haltères)', 'Pectoraux', 'Incline_Dumbbell_Press', 'chest', 'shoulders,triceps'],
  ['x5', 'Développé couché (machine)', 'Pectoraux', 'Machine_Bench_Press', 'chest', 'shoulders,triceps'],
  ['x6', 'Développé incliné (machine)', 'Pectoraux', 'Leverage_Incline_Chest_Press', 'chest', 'shoulders,triceps'],
  ['x7', 'Pec deck (butterfly)', 'Pectoraux', 'Butterfly', 'chest', ''],
  ['x8', 'Écartés poulie vis-à-vis', 'Pectoraux', 'Cable_Crossover', 'chest', 'shoulders'],
  ['x9', 'Dips (pectoraux)', 'Pectoraux', 'Dips_-_Chest_Version', 'chest', 'shoulders,triceps'],
  ['x10', 'Pompes', 'Pectoraux', 'Pushups', 'chest', 'shoulders,triceps'],
  ['x11', 'Tractions', 'Dos', 'Pullups', 'lats', 'biceps,middle back'],
  ['x12', 'Tirage vertical (poulie haute)', 'Dos', 'Wide-Grip_Lat_Pulldown', 'lats', 'biceps,middle back,shoulders'],
  ['x13', 'Tirage horizontal (poulie basse)', 'Dos', 'Seated_Cable_Rows', 'middle back', 'biceps,lats,shoulders'],
  ['x14', 'Rowing barre', 'Dos', 'Bent_Over_Barbell_Row', 'middle back', 'biceps,lats,shoulders'],
  ['x15', 'Rowing haltère (unilatéral)', 'Dos', 'One-Arm_Dumbbell_Row', 'middle back', 'biceps,lats,shoulders'],
  ['x16', 'Rowing machine', 'Dos', 'Leverage_High_Row', 'middle back', 'lats'],
  ['x17', 'Pull-over poulie', 'Dos', 'Straight-Arm_Pulldown', 'lats', ''],
  ['x18', 'Soulevé de terre', 'Dos', 'Barbell_Deadlift', 'lower back', 'calves,forearms,glutes,hamstrings,lats,middle back,quadriceps,traps'],
  ['x19', 'Shrugs', 'Dos', 'Barbell_Shrug', 'traps', ''],
  ['x20', 'Développé militaire (barre)', 'Épaules', 'Standing_Military_Press', 'shoulders', 'triceps'],
  ['x21', 'Développé épaules (haltères)', 'Épaules', 'Dumbbell_Shoulder_Press', 'shoulders', 'triceps'],
  ['x22', 'Développé épaules (machine)', 'Épaules', 'Machine_Shoulder_Military_Press', 'shoulders', 'triceps'],
  ['x23', 'Élévations latérales (haltères)', 'Épaules', 'Side_Lateral_Raise', 'shoulders', ''],
  ['x24', 'Élévations latérales (poulie)', 'Épaules', 'Standing_Low-Pulley_Deltoid_Raise', 'shoulders', 'forearms'],
  ['x25', 'Élévations latérales (machine)', 'Épaules', null, 'shoulders', 'traps'],
  ['x26', 'Oiseau (haltères)', 'Épaules', 'Reverse_Flyes', 'shoulders', ''],
  ['x27', 'Reverse pec deck', 'Épaules', 'Reverse_Machine_Flyes', 'shoulders', ''],
  ['x28', 'Face pull', 'Épaules', 'Face_Pull', 'shoulders', 'middle back'],
  ['x29', 'Curl barre', 'Biceps', 'Barbell_Curl', 'biceps', 'forearms'],
  ['x30', 'Curl haltères', 'Biceps', 'Dumbbell_Bicep_Curl', 'biceps', 'forearms'],
  ['x31', 'Curl incliné', 'Biceps', 'Incline_Dumbbell_Curl', 'biceps', ''],
  ['x32', 'Curl marteau', 'Biceps', 'Hammer_Curls', 'biceps', ''],
  ['x33', 'Curl pupitre (machine)', 'Biceps', 'Machine_Preacher_Curls', 'biceps', ''],
  ['x34', 'Curl poulie basse', 'Biceps', 'Standing_Biceps_Cable_Curl', 'biceps', ''],
  ['x35', 'Extension poulie haute (corde)', 'Triceps', 'Triceps_Pushdown_-_Rope_Attachment', 'triceps', ''],
  ['x36', 'Extension poulie haute (barre)', 'Triceps', 'Triceps_Pushdown', 'triceps', ''],
  ['x37', 'Barre au front', 'Triceps', 'EZ-Bar_Skullcrusher', 'triceps', 'forearms'],
  ['x38', 'Dips (triceps)', 'Triceps', 'Dips_-_Triceps_Version', 'triceps', 'chest,shoulders'],
  ['x39', 'Extension nuque (haltère)', 'Triceps', 'Standing_Dumbbell_Triceps_Extension', 'triceps', ''],
  ['x40', 'Extension triceps (machine)', 'Triceps', 'Machine_Triceps_Extension', 'triceps', ''],
  ['x41', 'Kickback poulie', 'Triceps', null, 'triceps', 'shoulders'],
  ['x42', 'Squat (barre)', 'Quadriceps', 'Barbell_Full_Squat', 'quadriceps', 'calves,glutes,hamstrings,lower back'],
  ['x43', 'Squat (Smith)', 'Quadriceps', 'Smith_Machine_Squat', 'quadriceps', 'calves,glutes,hamstrings,lower back'],
  ['x44', 'Presse à cuisses', 'Quadriceps', 'Leg_Press', 'quadriceps', 'calves,glutes,hamstrings'],
  ['x45', 'Leg extension', 'Quadriceps', 'Leg_Extensions', 'quadriceps', ''],
  ['x46', 'Hack squat', 'Quadriceps', 'Hack_Squat', 'quadriceps', 'calves,glutes,hamstrings'],
  ['x47', 'Fentes marchées', 'Quadriceps', 'Bodyweight_Walking_Lunge', 'quadriceps', 'calves,glutes,hamstrings'],
  ['x48', 'Squat bulgare', 'Quadriceps', null, 'quadriceps', 'glutes,hamstrings,adductors'],
  ['x49', 'Leg curl assis', 'Ischios', 'Seated_Leg_Curl', 'hamstrings', ''],
  ['x50', 'Leg curl allongé', 'Ischios', 'Lying_Leg_Curls', 'hamstrings', ''],
  ['x51', 'Soulevé de terre jambes tendues', 'Ischios', 'Stiff-Legged_Barbell_Deadlift', 'hamstrings', 'glutes,lower back'],
  ['x52', 'Good morning', 'Ischios', 'Good_Morning', 'hamstrings', 'abdominals,glutes,lower back'],
  ['x53', 'Hip thrust', 'Fessiers', 'Barbell_Hip_Thrust', 'glutes', 'calves,hamstrings'],
  ['x54', 'Hip thrust (machine)', 'Fessiers', null, 'glutes', 'hamstrings,quadriceps'],
  ['x55', 'Abduction (machine)', 'Fessiers', 'Thigh_Abductor', 'abductors', 'glutes'],
  ['x56', 'Kickback poulie (fessiers)', 'Fessiers', 'One-Legged_Cable_Kickback', 'glutes', 'hamstrings'],
  ['x57', 'Mollets debout (machine)', 'Mollets', 'Standing_Calf_Raises', 'calves', ''],
  ['x58', 'Mollets assis (machine)', 'Mollets', 'Seated_Calf_Raise', 'calves', ''],
  ['x59', 'Mollets à la presse', 'Mollets', 'Calf_Press_On_The_Leg_Press_Machine', 'calves', ''],
  ['x60', 'Crunch poulie', 'Abdos', 'Cable_Crunch', 'abdominals', ''],
  ['x61', 'Crunch (machine)', 'Abdos', 'Ab_Crunch_Machine', 'abdominals', ''],
  ['x62', 'Relevé de jambes', 'Abdos', 'Hanging_Leg_Raise', 'abdominals', ''],
  ['x63', 'Roue abdominale', 'Abdos', 'Ab_Roller', 'abdominals', 'shoulders'],
  ['x64', 'Développé couché (Smith)', 'Pectoraux', 'Smith_Machine_Bench_Press', 'chest', 'shoulders,triceps'],
  ['x65', 'Développé incliné (Smith)', 'Pectoraux', 'Smith_Machine_Incline_Bench_Press', 'chest', 'shoulders,triceps'],
  ['x66', 'Développé décliné (Smith)', 'Pectoraux', 'Smith_Machine_Decline_Press', 'chest', 'shoulders,triceps'],
  ['x67', 'Développé couché prise serrée (Smith)', 'Triceps', 'Smith_Machine_Close-Grip_Bench_Press', 'triceps', 'chest,shoulders'],
  ['x68', 'Rowing penché (Smith)', 'Dos', 'Smith_Machine_Bent_Over_Row', 'middle back', 'biceps,lats,shoulders'],
  ['x69', 'Développé épaules (Smith)', 'Épaules', 'Smith_Machine_Overhead_Shoulder_Press', 'shoulders', 'triceps'],
  ['x70', 'Tirage menton (Smith)', 'Épaules', 'Smith_Machine_Upright_Row', 'traps', 'biceps,middle back,shoulders'],
  ['x71', 'Split squat (Smith)', 'Quadriceps', 'Smith_Single-Leg_Split_Squat', 'quadriceps', 'calves,glutes,hamstrings'],
  ['x72', 'Soulevé de terre jambes tendues (Smith)', 'Ischios', 'Smith_Machine_Stiff-Legged_Deadlift', 'hamstrings', 'glutes,lower back'],
  ['x73', 'Mollets debout (Smith)', 'Mollets', 'Smith_Machine_Calf_Raise', 'calves', ''],
  ['x74', 'Shrugs dans le dos (Smith)', 'Dos', 'Smith_Machine_Behind_the_Back_Shrug', 'traps', 'shoulders'],
  ['x75', 'Hip thrust (Smith)', 'Fessiers', null, 'glutes', 'hamstrings,quadriceps'],
  ['x76', 'Développé décliné (barre)', 'Pectoraux', 'Decline_Barbell_Bench_Press', 'chest', 'shoulders,triceps'],
  ['x77', 'Écartés couché (haltères)', 'Pectoraux', 'Dumbbell_Flyes', 'chest', ''],
  ['x78', 'Développé couché prise serrée (barre)', 'Triceps', 'Close-Grip_Barbell_Bench_Press', 'triceps', 'chest,shoulders'],
  ['x79', 'Tirage vertical prise serrée', 'Dos', 'Close-Grip_Front_Lat_Pulldown', 'lats', 'biceps,middle back,shoulders'],
  ['x80', 'Rowing T-bar', 'Dos', 'T-Bar_Row_with_Handle', 'middle back', 'biceps,lats'],
  ['x81', 'Extension lombaires (banc à 45°)', 'Dos', 'Hyperextensions_Back_Extensions', 'lower back', 'glutes,hamstrings'],
  ['x82', 'Arnold press', 'Épaules', 'Arnold_Dumbbell_Press', 'shoulders', 'triceps'],
  ['x83', 'Élévations frontales (haltères)', 'Épaules', 'Front_Dumbbell_Raise', 'shoulders', ''],
  ['x84', 'Curl concentré', 'Biceps', 'Concentration_Curls', 'biceps', 'forearms'],
  ['x85', 'Fentes (haltères)', 'Quadriceps', 'Dumbbell_Lunges', 'quadriceps', 'calves,glutes,hamstrings'],
  ['x86', 'Crunch au sol', 'Abdos', 'Crunches', 'abdominals', ''],
  ['x87', 'Tractions (supination)', 'Dos', 'Pullups', 'lats', 'biceps,middle back'],
  ['x88', 'Tractions (prise neutre)', 'Dos', 'Pullups', 'lats', 'biceps,middle back,forearms'],
  ['x89', 'Tirage vertical unilatéral (poulie)', 'Dos', 'Wide-Grip_Lat_Pulldown', 'lats', 'biceps'],
  ['x90', 'Tirage horizontal unilatéral (poulie)', 'Dos', 'Seated_Cable_Rows', 'middle back', 'biceps,lats'],
  ['x91', 'Rowing Pendlay', 'Dos', 'Bent_Over_Barbell_Row', 'middle back', 'biceps,lats,lower back'],
  ['x92', 'Shrugs (haltères)', 'Dos', 'Barbell_Shrug', 'traps', 'forearms'],
  ['x93', 'Élévations latérales penchées (poulie)', 'Épaules', 'Standing_Low-Pulley_Deltoid_Raise', 'shoulders', ''],
  ['x94', 'Élévation latérale unilatérale (haltère)', 'Épaules', 'Side_Lateral_Raise', 'shoulders', ''],
  ['x95', 'Développé épaules unilatéral (haltère)', 'Épaules', 'Dumbbell_Shoulder_Press', 'shoulders', 'triceps'],
  ['x96', 'Rotation externe (poulie)', 'Épaules', null, 'shoulders', ''],
  ['x97', 'Face pull unilatéral', 'Épaules', 'Face_Pull', 'shoulders', 'middle back'],
  ['x98', 'Curl poulie basse unilatéral', 'Biceps', 'Standing_Biceps_Cable_Curl', 'biceps', 'forearms'],
  ['x99', 'Curl pupitre à la poulie', 'Biceps', 'Machine_Preacher_Curls', 'biceps', ''],
  ['x100', 'Curl araignée', 'Biceps', null, 'biceps', ''],
  ['x101', 'Extension poulie haute unilatérale', 'Triceps', 'Triceps_Pushdown_-_Rope_Attachment', 'triceps', ''],
  ['x102', 'Extension triceps unilatérale (haltère)', 'Triceps', 'Standing_Dumbbell_Triceps_Extension', 'triceps', ''],
  ['x103', 'Leg extension unilatéral', 'Quadriceps', 'Leg_Extensions', 'quadriceps', ''],
  ['x104', 'Presse à cuisses unilatérale', 'Quadriceps', 'Leg_Press', 'quadriceps', 'glutes,hamstrings'],
  ['x105', 'Step-up', 'Quadriceps', null, 'quadriceps', 'glutes,hamstrings,calves'],
  ['x106', 'Fentes inversées', 'Quadriceps', 'Bodyweight_Walking_Lunge', 'quadriceps', 'glutes,hamstrings'],
  ['x107', 'Leg curl unilatéral', 'Ischios', 'Lying_Leg_Curls', 'hamstrings', ''],
  ['x108', 'Soulevé de terre roumain unilatéral', 'Ischios', 'Stiff-Legged_Barbell_Deadlift', 'hamstrings', 'glutes,lower back'],
  ['x109', 'Hip thrust unilatéral', 'Fessiers', 'Barbell_Hip_Thrust', 'glutes', 'hamstrings'],
  ['x110', 'Abduction (poulie)', 'Fessiers', 'Thigh_Abductor', 'abductors', 'glutes'],
  ['x111', 'Adducteurs (machine)', 'Quadriceps', null, 'adductors', ''],
  ['x112', 'Mollets debout unilatéral', 'Mollets', 'Standing_Calf_Raises', 'calves', ''],
  ['x113', 'Soulevé de terre sumo', 'Dos', 'Barbell_Deadlift', 'lower back', 'glutes,hamstrings,quadriceps,traps,forearms'],
  ['x114', 'Gainage (planche)', 'Abdos', null, 'abdominals', 'shoulders'],
  ['x115', 'Gainage latéral', 'Abdos', null, 'abdominals', 'shoulders'],
  ['x116', 'Crunch oblique au sol', 'Abdos', 'Crunches', 'abdominals', ''],
];
const GOALS = {
  hypertrophie: { label: 'Prise de muscle', ia: 'prise de muscle (hypertrophie)' },
  force: { label: 'Force', ia: 'gain de force maximale' },
  seche: { label: 'Perte de gras', ia: 'perte de gras en conservant le muscle' },
  forme: { label: 'Forme / entretien', ia: 'forme générale et entretien' }
};
const LEVELS = ['débutant', 'intermédiaire', 'avancé'];

/* ---------- réglages ---------- */
// Réglages synchronisés entre appareils (SYNCED). La clé API ne l'est QUE si l'utilisateur coche « synchroniser ma clé » (syncKey) ; le modèle reste propre à l'appareil.
const DEF = { goal: 'hypertrophie', perWeek: 4, level: 'intermédiaire', apiKey: '', syncKey: false, model: 'gemini-3.5-flash', rest: 90, bw: '', pseudo: '', handle: '', tipW: false, shAct: false, shRec: false, shRcd: false, shLive: false, shW: false, shAsked: false, rir: false, restEx: '{}', exOpt: '{}', autoRev: true, revWk: '', revTxt: '', avatar: '', yearEx: '[]' };
const SYNCED = ['goal', 'perWeek', 'level', 'bw', 'rest', 'pseudo', 'handle', 'tipW', 'shAct', 'shRec', 'shRcd', 'shLive', 'shW', 'shAsked', 'rir', 'restEx', 'exOpt', 'autoRev', 'revWk', 'revTxt', 'avatar', 'yearEx'];
let cfg = { ...DEF };
try { cfg = { ...DEF, ...JSON.parse(localStorage.getItem('lift.cfg') || '{}') }; } catch (e) { }
const storeCfg = () => { try { localStorage.setItem('lift.cfg', JSON.stringify(cfg)); } catch (e) { } };
let cfgTimer = null;
const saveCfg = () => {
  storeCfg();
  if (!S.user) return;
  clearTimeout(cfgTimer);
  cfgTimer = setTimeout(() => {
    const o = Object.fromEntries(SYNCED.map(k => [k, cfg[k]]));
    o.syncKey = !!cfg.syncKey; o.apiKey = cfg.syncKey ? cfg.apiKey : '';
    backend.saveSettings(S.user.uid, o).catch(syncError);
  }, 600);
};
const loadAnalysis = () => { try { return JSON.parse(localStorage.getItem('lift.analysis') || 'null'); } catch (e) { return null; } };

/* ---------- état ---------- */
const S = {
  tab: 'train', exercises: [], custom: [], workouts: [], routines: [], active: null,
  chat: [], facts: [], body: [], chatBusy: false, chatErr: '', chatDraft: '', chatImg: null, memoSug: [], bodyBusy: false, bodyMsg: '', bodyMetric: 'weight', sub: '', pm: 'dur',
  prs: [], cal: { z: 'm', ref: Date.now() }, volZ: 7, jz: 'list', cz: 'chat',
  friends: [], shared: {}, sharedUnsubs: {}, inbox: [], friend: '', fr: { q: '', results: [], msg: '', busy: false },
  user: null, authReady: false, loading: false, setup: false, syncErr: '',
  auth: { mode: 'login', err: '', info: '', busy: false, email: '' }
};
const SEEDS = CATALOG.map(([id, name, muscle, img, p, q]) => ({ id, name, muscle, img, prim: p ? p.split(',') : [], sec: q ? q.split(',') : [], custom: false }));
const rebuildEx = () => { S.exercises = [...SEEDS, ...S.custom]; };
rebuildEx();
const ex = id => S.exercises.find(e => e.id === id);
const exName = id => ex(id)?.name || 'Exercice supprimé';
/* carte musculaire (corps stylisé dessiné pour l'app) */
const MU_FR = { abdominals: 'Abdos', abductors: 'Abducteurs', adductors: 'Adducteurs', biceps: 'Biceps', calves: 'Mollets', chest: 'Pectoraux', forearms: 'Avant-bras', glutes: 'Fessiers', hamstrings: 'Ischios', lats: 'Grands dorsaux', 'lower back': 'Lombaires', 'middle back': 'Milieu du dos', quadriceps: 'Quadriceps', shoulders: 'Épaules', traps: 'Trapèzes', triceps: 'Triceps' };
const BODY_BASE = ['M100 56 C124 58 146 62 156 76 C162 96 146 108 140 128 C137 150 138 180 142 206 C142 218 126 226 100 226 Z', 'M101 224 L142 206 C148 250 140 292 132 330 C130 372 126 404 124 424 L106 424 L103 330 C102 300 101 260 101 224 Z', 'M154 100 C164 98 170 112 170 130 C172 160 176 190 174 214 C172 224 162 224 160 212 C156 190 154 150 152 120 Z'];
const BODY_F = {
  traps: 'M100 50 L112 55 C124 60 134 66 136 70 L118 72 L100 62 Z',
  shoulders: 'M138 70 C152 66 164 74 166 88 C166 100 160 104 154 102 C146 96 140 84 138 70 Z',
  chest: 'M102 74 C114 70 132 71 142 82 C146 94 140 108 124 112 C112 114 104 108 102 100 Z',
  biceps: 'M156 104 C164 104 168 114 168 128 C167 140 162 146 158 146 C154 140 152 124 154 112 Z',
  forearms: 'M158 150 C166 148 172 160 172 178 C171 194 168 204 164 206 C160 196 156 172 158 150 Z',
  abdominals: 'M102 116 L120 116 L120 134 L102 134 Z M102 137 L120 137 L120 155 L102 155 Z M102 158 L119 158 L118 176 L102 178 Z M102 181 L117 181 C116 192 110 200 102 204 Z',
  abductors: 'M138 206 C146 210 148 222 146 240 C142 236 138 224 138 206 Z',
  adductors: 'M101 226 L113 232 C113 258 111 280 108 292 C104 280 102 252 101 226 Z',
  quadriceps: 'M104 212 C122 204 138 210 143 230 C143 262 138 288 130 298 C118 300 112 292 112 262 C112 244 108 230 104 212 Z',
  calves: 'M120 316 C132 314 138 330 136 352 C134 372 128 384 124 388 C118 380 116 340 120 316 Z'
};
const BODY_B = {
  traps: 'M100 50 L112 55 C128 62 140 68 142 74 C132 90 116 100 100 114 Z',
  shoulders: 'M142 72 C154 68 164 76 166 90 C166 102 160 106 154 104 C146 98 142 86 142 72 Z',
  lats: 'M144 98 C152 106 150 128 144 148 C140 162 134 170 126 174 C116 170 108 156 106 140 C122 136 136 122 144 98 Z',
  'middle back': 'M101 108 C110 102 121 102 125 110 C123 124 113 132 101 134 Z',
  'lower back': 'M101 140 C112 142 122 154 126 164 L124 188 C114 192 106 190 101 190 Z',
  triceps: 'M156 104 C164 104 168 114 168 128 C167 140 162 146 158 146 C154 140 152 124 154 112 Z',
  forearms: 'M158 150 C166 148 172 160 172 178 C171 194 168 204 164 206 C160 196 156 172 158 150 Z',
  glutes: 'M101 194 C118 188 140 192 143 212 C143 230 128 238 114 234 C104 232 101 226 101 222 Z',
  abductors: 'M138 196 C146 200 148 216 146 232 C140 230 138 214 138 196 Z',
  hamstrings: 'M103 242 C122 240 140 240 143 254 C143 282 138 300 130 306 C118 308 108 298 105 272 Z',
  calves: 'M118 318 C132 314 140 330 138 352 C136 372 130 386 124 390 C116 380 114 340 118 318 Z'
};
let bodyN = 0;
function bodySvg(view, prim, sec) {
  const M = view === 'front' ? BODY_F : BODY_B, id = 'gl' + (++bodyN);
  const half = () => BODY_BASE.map(d => `<path d="${d}" fill="#1b1b1f" stroke="#34343a" stroke-width="1.2"/>`).join('') + Object.entries(M).map(([k, d]) =>
    prim.includes(k) ? `<path d="${d}" fill="#ff3030" stroke="#ff7a7a" stroke-width="1" filter="url(#${id})"/>`
      : sec.includes(k) ? `<path d="${d}" fill="#a42a2a" fill-opacity=".75" stroke="#d65a5a" stroke-width=".8"/>`
        : `<path d="${d}" fill="#2a2a30" stroke="#3b3b42" stroke-width=".8"/>`).join('');
  return `<svg viewBox="0 0 200 430" role="img" aria-label="${view === 'front' ? 'Vue de face' : 'Vue de dos'}"><defs><filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
    + `<ellipse cx="100" cy="26" rx="15" ry="19" fill="#1b1b1f" stroke="#34343a" stroke-width="1.2"/><rect x="93" y="42" width="14" height="14" fill="#1b1b1f"/><g>${half()}</g><g transform="translate(200,0) scale(-1,1)">${half()}</g></svg>`;
}
const hasMap = e => !!(e && e.prim && e.prim.length);
const muscleMap = e => !hasMap(e) ? '' : `<div class="bodymap">${bodySvg('front', e.prim, e.sec)}${bodySvg('back', e.prim, e.sec)}
  <div class="leg"><span><i class="p"></i>${esc(e.prim.map(k => MU_FR[k] || k).join(' · '))}</span>${e.sec.length ? `<span><i class="s"></i>${esc(e.sec.map(k => MU_FR[k] || k).join(' · '))}</span>` : ''}</div></div>`;
// Photos maison (dossier img/), prioritaires sur la banque d'images libre.
// Valeur = nombre de photos, nommées img/<id>-1.jpg, img/<id>-2.jpg…
const PHOTOS = { x98: 2 };
const exImgs = e => !e ? [] :
  PHOTOS[e.id] ? Array.from({ length: PHOTOS[e.id] }, (_, i) => `img/${e.id}-${i + 1}.jpg`) :
    e.img ? [IMG_BASE + e.img + '/0.jpg', IMG_BASE + e.img + '/1.jpg'] : [];
const thumb = e => { const u = exImgs(e)[0]; return u ? `<img class="thumb" src="${u}" alt="" loading="lazy" decoding="async">` : '<span class="thumb ph"></span>'; };
const eyeBtn = (e, cls) => e && (e.img || PHOTOS[e.id] || hasMap(e)) ? `<button class="${cls}" data-act="exview" data-id="${e.id}" aria-label="Voir l'illustration">👁</button>` : '';
const finished = () => S.workouts.filter(w => w.endedAt).sort((a, b) => a.startedAt - b.startedAt);
const newSet = () => ({ w: null, r: null, done: false, type: 'N' });
// Temps de repos : valeur par défaut des réglages, ou valeur propre à l'exercice.
const restMap = () => { try { return JSON.parse(cfg.restEx || '{}') || {}; } catch (e) { return {}; } };
const defRest = () => num(cfg.rest) > 0 ? Math.round(num(cfg.rest)) : 90;
const restFor = id => { const v = restMap()[id]; return v > 0 ? v : defRest(); };
const restLabel = n => n >= 120 && n % 60 === 0 ? n / 60 + ' min' : n + ' s';
function setRestFor(id, sec) { const m = restMap(); if (sec) m[id] = sec; else delete m[id]; cfg.restEx = JSON.stringify(m); saveCfg(); }

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
let saveTimer = null, editId = null;
// W() = séance sur laquelle on écrit : celle en cours, ou une séance passée en cours de modification.
const W = () => editId ? S.workouts.find(w => w.id === editId) : S.active;
const editing = () => !!editId && !!W();
function flush() { clearTimeout(saveTimer); saveTimer = null; const w = W(); if (w) put('workouts', w); }
// Sauvegarde de la séance en cours, regroupée pour limiter les écritures (quota gratuit).
function persist() {
  const w = W(); if (!w) return;
  w.updatedAt = Date.now();
  clearTimeout(saveTimer); saveTimer = setTimeout(flush, 500);
}
const typing = () => { const a = document.activeElement; return !!a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName); };
// Évite de recréer l'écran pendant que tu tapes une valeur.
function renderSoft() { if (typing()) S.dirty = true; else render(); }
document.addEventListener('focusout', () => { setTimeout(() => { if (S.dirty && !typing()) { S.dirty = false; render(); } }, 80); });

let unsubs = [];
function startSession(user) {
  S.user = user; S.loading = true; S.syncErr = ''; S.tab = 'train'; S.sub = '';
  S.auth = { mode: 'login', err: '', info: '', busy: false, email: '' }; render();
  const seen = new Set();
  const ready = k => { seen.add(k); if (['w', 'r', 'e', 'p'].every(k => seen.has(k))) mergeDuplicates(); if (['w', 's'].every(k => seen.has(k))) setTimeout(maybeWeekReview, 2000); if (seen.size >= 4 && S.loading) { S.loading = false; render(); } };
  setTimeout(() => { if (S.loading) { S.loading = false; render(); } }, 7000);
  unsubs = [
    backend.watch(user.uid, 'workouts', (list, m) => { if (list) applyWorkouts(list); else syncError(m && m.error); ready('w'); }),
    backend.watch(user.uid, 'routines', (list, m) => { if (list) applyRoutines(list); else syncError(m && m.error); ready('r'); }),
    backend.watch(user.uid, 'exercises', (list, m) => { if (list) applyCustom(list); else syncError(m && m.error); ready('e'); }),
    backend.watchSettings(user.uid, s => { applySettings(s); ready('s'); }),
    backend.watch(user.uid, 'chat', (list, m) => { if (list) applyChat(list); }),
    backend.watch(user.uid, 'facts', (list, m) => { if (list) applyFacts(list); }),
    backend.watch(user.uid, 'body', (list, m) => { if (list) applyBody(list); }),
    backend.watch(user.uid, 'prs', (list) => { if (list) applyPrs(list); ready('p'); }),
    backend.watchFriendships(user.uid, (list) => { if (list) applyFriends(list); }),
    backend.watch(user.uid, 'inbox', (list) => { if (list) applyInbox(list); })
  ];
}
function endSession() {
  unsubs.forEach(f => { try { f(); } catch (e) { } }); unsubs = [];
  Object.values(S.sharedUnsubs).forEach(f => { try { f(); } catch (e) { } }); S.sharedUnsubs = {}; S.shared = {}; S.friends = []; S.inbox = []; S.friend = ''; S.fr = { q: '', results: [], msg: '', busy: false }; clearTimeout(pushTimer); lastPush = '';
  S.user = null; S.workouts = []; S.routines = []; S.custom = []; rebuildEx(); S.active = null; S.loading = false; S.syncErr = '';
  S.auth = { mode: 'login', err: '', info: '', busy: false, email: '' };
  // Rien du compte précédent ne doit rester visible ni être recopié dans le prochain compte.
  SYNCED.forEach(k => { cfg[k] = DEF[k]; });
  if (cfg.syncKey) { cfg.apiKey = ''; cfg.syncKey = false; } // clé synchronisée : retirée de cet appareil à la déconnexion (elle reste dans le compte)
  storeCfg();
  merged = false; askedStale = false; undoFn = null;
  S.chat = []; S.facts = []; S.body = []; S.prs = []; S.cal = { z: 'm', ref: Date.now() }; S.chatDraft = ''; S.chatImg = null; S.memoSug = []; S.chatBusy = false; S.chatErr = ''; S.bodyMsg = ''; S.bodyBusy = false;
  try { localStorage.removeItem('lift.analysis'); localStorage.removeItem('lift.bodyAnalysis'); } catch (e) { }
  rest = null; drawRest(); unwake(); closeSheet(); render();
}
function applyWorkouts(list) {
  // On garde nos versions locales (séance en cours, séance en cours de modification) tant qu'elles sont plus récentes que le cloud.
  const keep = [S.active, editId ? S.workouts.find(x => x.id === editId) : null].filter(Boolean);
  const merged = list.map(w => { const l = keep.find(k => k.id === w.id); return (l && !(w.updatedAt > l.updatedAt)) ? l : w; });
  const sig = a => a.map(w => w.id + ':' + (w.updatedAt || 0) + (w.endedAt ? 'e' : '')).sort().join();
  const changed = sig(merged) !== sig(S.workouts);
  S.workouts = merged;
  const prev = S.active;
  S.active = merged.filter(w => !w.endedAt).sort((a, b) => b.startedAt - a.startedAt)[0] || null;
  if (S.active && !prev) wake();
  if (S.active) checkStale();
  if (!S.active && prev) { rest = null; drawRest(); unwake(); }
  if (changed || (prev && prev.id) !== (S.active && S.active.id)) { renderSoft(); schedulePush(!!prev !== !!S.active); }
}
function applyRoutines(list) {
  list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  if (JSON.stringify(list) === JSON.stringify(S.routines)) return;
  S.routines = list; renderSoft();
}
// Un exercice perso créé avant qu'une variante n'arrive au catalogue est rebasculé dessus
// automatiquement : l'historique, les routines et les records suivent, rien ne change à l'écran.
const MERGE_ALIAS = {
  'curl poulie basse unilaterale x2': { to: 'x98', sides: 2 }, 'curl poulie basse unilaterale': 'x98',
  'curl poulie basse unilateral x2': { to: 'x98', sides: 2 }, 'extension poulie haute unilaterale': 'x101',
  'extension poulie haute unilateral': 'x101', 'curl pupitre a la poulie': 'x99',
  'curl pupitre poulie': 'x99', 'tirage horizontal unilateral': 'x90', 'tirage vertical unilateral': 'x89',
  'leg extension unilateral': 'x103', 'leg curl unilateral': 'x107', 'presse a cuisses unilaterale': 'x104',
  'mollets debout unilateral': 'x112', 'gainage': 'x114', 'planche': 'x114', 'gainage lateral': 'x115',
  'step up': 'x105', 'fentes inversees': 'x106', 'souleve de terre sumo': 'x113', 'tractions supination': 'x87',
  'tractions prise neutre': 'x88', 'adducteurs machine': 'x111', 'curl araignee': 'x100'
};
let merged = false;
function mergeDuplicates() {
  if (merged || !S.user || !S.custom.length) return;
  const byName = {}; SEEDS.forEach(e => { byName[norm(e.name)] = e.id; });
  const map = {};
  for (const c of S.custom) {
    const n = norm(c.name).replace(/\s+/g, ' ').trim();
    const a = byName[n] || MERGE_ALIAS[n], target = a && a.to ? a.to : a;
    if (target && ex(target) && target !== c.id) { map[c.id] = target; if (a && a.sides) setExOpt(target, 'sides', a.sides); }
  }
  if (!Object.keys(map).length) { merged = true; return; }
  merged = true;
  for (const w of S.workouts) {
    let ch = false;
    for (const e of w.entries) if (map[e.exId]) { e.exId = map[e.exId]; ch = true; }
    if (ch) put('workouts', w);
  }
  for (const r of S.routines) {
    const ids = r.exIds.map(i => map[i] || i);
    if (ids.join() !== r.exIds.join()) { r.exIds = ids; put('routines', r); }
  }
  for (const p of S.prs) if (map[p.exId]) { p.exId = map[p.exId]; put('prs', p); }
  for (const [k, o] of [['restEx', restMap()], ['exOpt', exOpts()]]) {
    let ch = false;
    for (const id of Object.keys(o)) if (map[id]) { o[map[id]] = o[id]; delete o[id]; ch = true; }
    if (ch) { cfg[k] = JSON.stringify(o); saveCfg(); }
  }
  Object.keys(map).forEach(id => del('exercises', id));
  S.custom = S.custom.filter(c => !map[c.id]); rebuildEx(); renderSoft();
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
  if (s.syncKey === true) {
    if (!cfg.syncKey) { cfg.syncKey = true; ch = true; }
    if (s.apiKey && s.apiKey !== cfg.apiKey) { cfg.apiKey = s.apiKey; ch = true; }
  } else if (s.syncKey === false && cfg.syncKey) { cfg.syncKey = false; ch = true; }
  if (ch) { storeCfg(); renderSoft(); schedulePush(); }
}

/* ---------- calculs ---------- */
const workSets = e => e.sets.filter(s => s.done && s.type !== 'W' && s.r > 0);
const setW = s => s.w || 0;                       // charge saisie, telle quelle
const e1rm = (w, r) => r <= 0 ? 0 : r === 1 ? w : w * (1 + Math.min(r, 12) / 30);

/* Charge réelle d'une série.
   - un exercice au poids du corps porte une fraction de ton poids (tractions 100 %, pompes 65 %) ;
   - une charge « par côté » (haltères, deux poulies) compte double dans le volume, mais pas dans le e1RM. */
const exOpts = () => { try { return JSON.parse(cfg.exOpt || '{}') || {}; } catch (e) { return {}; } };
const bwPart = id => { const o = exOpts()[id]; return o && o.bw != null ? o.bw : (BW_DEF[id] || 0); };
const sidesOf = id => { const o = exOpts()[id]; return o && o.sides ? o.sides : (SIDES_DEF[id] || 1); };
function setExOpt(id, k, v) {
  const m = exOpts(); const o = m[id] || (m[id] = {});
  if (v == null) delete o[k]; else o[k] = v;
  if (!Object.keys(o).length) delete m[id];
  cfg.exOpt = JSON.stringify(m); saveCfg();
}
// Poids de corps à la date d'une séance : la mesure connue la plus proche, sinon le réglage.
function bwAt(ts) {
  const ms = S.body.filter(b => num(b.weight) > 0).sort((a, b) => a.ts - b.ts);
  const before = ms.filter(b => b.ts <= ts);
  if (before.length) return num(before[before.length - 1].weight);
  if (ms.length) return num(ms[0].weight);
  return num(cfg.bw) || 0;
}
const loadAt = (exId, s, ts) => Math.round((bwPart(exId) * bwAt(ts) + setW(s)) * 100) / 100;
const hasBw = exId => bwPart(exId) > 0;

function best(sets, exId, ts) {
  let b = null;
  for (const s of sets) {
    const w = exId ? loadAt(exId, s, ts) : setW(s), e = e1rm(w, s.r);
    if (!b || e > b.e || (e === b.e && s.r > b.r)) b = { w, r: s.r, e, raw: setW(s) };
  }
  return b;
}
const entryVol = (e, ts) => workSets(e).reduce((a, s) => a + loadAt(e.exId, s, ts) * s.r, 0) * sidesOf(e.exId);
const wVol = w => w.entries.reduce((a, e) => a + entryVol(e, w.startedAt), 0);
const wSets = w => w.entries.reduce((a, e) => a + workSets(e).length, 0);
const metric = b => b ? (b.e > 0 ? b.e : b.r) : 0;

function exHistory(exId, beforeTs = Infinity) {
  const out = [];
  for (const w of finished()) {
    if (w.startedAt >= beforeTs) continue;
    for (const e of w.entries) {
      if (e.exId !== exId) continue;
      const ws = workSets(e);
      if (ws.length) out.push({ wid: w.id, t: w.startedAt, sets: ws, best: best(ws, exId, w.startedAt), vol: entryVol(e, w.startedAt) });
    }
  }
  return out;
}
const prevFor = exId => { const t = W(); const h = exHistory(exId, t ? t.startedAt : Infinity); return h[h.length - 1] || null; };

/* ---------- plateau (stagnation) ----------
   Plateau : au moins 4 séances sur l'exercice, et les 3 dernières n'ont pas
   amélioré le meilleur des séances précédentes (tolérance de 0,5 %).
   Mesure = e1RM estimé, ou nombre de répétitions pour les exercices sans charge. */
function stagFor(exId) {
  const h = exHistory(exId);
  if (h.length < 4) return null;
  const ms = h.map(x => metric(x.best)), peak = Math.max(...ms.slice(0, -3));
  if (!(peak > 0) || Math.max(...ms.slice(-3)) > peak * 1.005) return null;
  return { since: h[h.length - 3].t, peak, last: ms[ms.length - 1], n: h.length };
}
const STAG_TIP = "Trois séances sans nouveau record. Trois pistes : atteindre le haut de la fourchette de répétitions sur toutes les séries avant d'ajouter du poids ; faire une semaine allégée (environ −10 % de charge) puis reprendre ; ou passer 3 à 4 semaines sur une variante proche.";
const bestSetOf = x => x.sets.reduce((a, b) => e1rm(setW(b), b.r) > e1rm(setW(a), a.r) ? b : a);

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
    const b = best(ws, e.exId, w.startedAt);
    const prevE = Math.max(...hist.map(h => h.best.e)), prevW = Math.max(...hist.map(h => Math.max(...h.sets.map(x => loadAt(e.exId, x, h.t)))));
    const maxW = Math.max(...ws.map(x => loadAt(e.exId, x, w.startedAt)));
    if (maxW > prevW) out.push(`${exName(e.exId)} : record de charge ${fmt(maxW)} kg (avant ${fmt(prevW)})`);
    else if (b.e > prevE * 1.0001) out.push(`${exName(e.exId)} : nouveau meilleur e1RM ≈ ${fmt(Math.round(b.e * 10) / 10)} kg (avant ${fmt(Math.round(prevE * 10) / 10)})`);
  }
  return out;
}

/* ---------- Gemini ---------- */
const SYSTEM = `Tu es un coach de musculation expert (hypertrophie, force, périodisation). Tu t'appuies UNIQUEMENT sur les données fournies, sans rien inventer. Réponds en français, de façon concrète et directement exploitable, avec des charges chiffrées en kg (arrondies au pas de 1,25 ou 2,5 kg) et des plages de répétitions. Si les données sont insuffisantes pour conclure, dis-le franchement. Format : titres "## ", puces "- ", **gras** pour les chiffres clés. Pas d'introduction ni de conclusion superflue. Tu ne donnes pas de conseil médical ; en cas de douleur évoquée, recommande un avis professionnel.`;

const gemini = prompt => geminiCall({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
async function geminiCall({ contents, system = SYSTEM, json = false, temperature = 0.5, maxTokens = 4096 }) {
  if (!cfg.apiKey) throw new Error('NOKEY');
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 90000);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature, maxOutputTokens: maxTokens, ...(json ? { responseMimeType: 'application/json' } : {}) }
      })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const m = j?.error?.message || '';
      if (r.status === 400 && /api key/i.test(m)) throw new Error('Clé API invalide. Vérifie-la dans Profil → Réglages.');
      if (r.status === 403) throw new Error('Accès refusé (clé invalide ou API non autorisée).');
      if (r.status === 404) throw new Error(`Modèle « ${cfg.model} » introuvable. Change le modèle dans Profil → Réglages.`);
      if (r.status === 429) throw new Error('Quota gratuit atteint. Réessaie dans quelques minutes.');
      throw new Error(`Erreur Gemini (${r.status}). ${m}`.trim());
    }
    const text = (j.candidates?.[0]?.content?.parts || []).filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
    if (!text) throw new Error('Réponse vide de Gemini' + (j.candidates?.[0]?.finishReason ? ` (${j.candidates[0].finishReason})` : '') + '.');
    return text;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Délai dépassé. Réessaie.');
    if (e.message === 'NOKEY') throw new Error('Ajoute ta clé Gemini dans Profil → Réglages.');
    if (e instanceof TypeError) throw new Error('Pas de connexion à Gemini (réseau).');
    throw e;
  } finally { clearTimeout(timer); }
}

// L'app ne contient des données que depuis la première séance enregistrée : le coach doit le savoir
// pour ne pas interpréter l'absence d'historique comme un arrêt ou un manque d'assiduité.
function historyLine() {
  const fw = finished();
  if (!fw.length) return "HISTORIQUE : aucune séance enregistrée pour l'instant. L'utilisateur débute avec l'app ; ne suppose aucun passé d'entraînement et ne compare à aucune période antérieure.";
  const d0 = fw[0].startedAt, days = Math.max(1, Math.round((Date.now() - d0) / 86400000));
  const young = days < 42 || fw.length < 8;
  return `HISTORIQUE DISPONIBLE : l'utilisateur a commencé à enregistrer ses séances dans l'app le ${fmtDateL(d0)} (il y a ${days} jour${days > 1 ? 's' : ''}), ${fw.length} séance${fw.length > 1 ? 's' : ''} au total.`
    + ` Il n'existe aucune donnée avant cette date, non pas parce qu'il ne s'entraînait pas, mais parce que l'app n'existait pas : ne traite jamais cette absence comme un arrêt, une baisse de régime ou un manque d'assiduité, et ne compare à aucune période antérieure.`
    + (young ? ` Le recul est encore court : évite les conclusions sur les tendances longues, dis ce que les données permettent de dire et ce qu'il faudra confirmer dans les prochaines semaines.` : '');
}

// Une séance saisie après coup affiche une durée minuscule : elle ne doit pas être interprétée.
const durOdd = w => { const n = wSets(w), m = (w.endedAt - w.startedAt) / 60000; return n >= 3 && (m < 10 || m / n < 1.2); };
const DUR_NOTE = "(Quand une durée est signalée « non significative », la séance a été saisie après coup, hors de la salle : ignore-la complètement, ne commente ni la densité, ni le temps de repos, ni le rythme, et ne la compte pas dans les totaux de temps.)";

function profileLine() {
  return `Objectif : ${GOALS[cfg.goal].ia}. Niveau : ${cfg.level}. Fréquence visée : ${cfg.perWeek} séances/semaine.` + (num(cfg.bw) ? ` Poids de corps : ${fmt(num(cfg.bw))} kg.` : '');
}
const setTxt = (s, exId, ts) => {
  const bw = exId && hasBw(exId), w = exId ? loadAt(exId, s, ts) : setW(s);
  return `${bw ? (setW(s) ? (setW(s) > 0 ? 'PDC+' + fmt(setW(s)) : 'PDC' + fmt(setW(s))) : 'PDC') + ' = ' : ''}${fmt(w)}×${s.r}${s.rir != null ? ` (RIR ${s.rir})` : ''}`;
};
// libellé court affiché dans l'app (ce que tu as tapé)
const setChip = (s, exId) => (exId && hasBw(exId) ? (setW(s) ? (setW(s) > 0 ? 'PDC+' + fmt(setW(s)) : 'PDC' + fmt(setW(s))) : 'PDC') : fmt(setW(s))) + '×' + s.r;

// Intervalle médian entre deux séries validées (repos + durée de la série).
function restReal(e) {
  const ts = e.sets.filter(s => s.done && s.ts > 0).map(s => s.ts).sort((a, b) => a - b);
  if (ts.length < 2) return null;
  const g = []; for (let i = 1; i < ts.length; i++) g.push((ts[i] - ts[i - 1]) / 1000);
  g.sort((a, b) => a - b);
  const m = Math.round(g[Math.floor(g.length / 2)]);
  return m > 15 && m < 1800 ? m : null;
}
// Un seul muscle secondaire (les avant-bras sur un curl) ne fait pas un
// mouvement polyarticulaire : on exige au moins deux groupes assistants.
const isCompound = id => (ex(id)?.sec || []).length >= 2;
// Exercices du catalogue visant les mêmes muscles, non utilisés dans la séance :
// sans cette liste le modèle propose des exercices qui n'existent pas dans l'app.
function subsFor(exIds) {
  const used = new Set(exIds), out = [];
  for (const m of [...new Set(exIds.map(id => ex(id)?.muscle).filter(Boolean))]) {
    const l = S.exercises.filter(e => e.muscle === m && !used.has(e.id)).map(e => e.name).slice(0, 10);
    if (l.length) out.push(`- ${m} : ${l.join(', ')}`);
  }
  return out.join('\n');
}

function sessionPrompt(w) {
  const lines = w.entries.map((e, i) => {
    const ws = workSets(e), b = best(ws, e.exId, w.startedAt), h = exHistory(e.exId, w.startedAt), p = h[h.length - 1];
    const wu = e.sets.filter(x => x.done && x.type === 'W' && x.r > 0);
    const rr = restReal(e), st = stagFor(e.exId);
    let l = `- [${i + 1}e exercice] ${exName(e.exId)} [${ex(e.exId)?.muscle || '?'}, ${isCompound(e.exId) ? 'polyarticulaire' : 'isolation'}]${sidesOf(e.exId) > 1 ? ' (charge par côté : le volume compte les deux)' : ''} : ${wu.length ? `échauffement ${wu.map(x => setTxt(x, e.exId, w.startedAt)).join(', ')} ; ` : ''}séries de travail ${ws.map(x => setTxt(x, e.exId, w.startedAt)).join(', ')} | volume ${fmt(entryVol(e, w.startedAt))} kg | e1RM ${fmt(Math.round(b.e * 10) / 10)}`;
    if (rr) l += ` | intervalle médian entre séries ${Math.round(rr / 5) * 5} s (repos visé ${restFor(e.exId)} s ; l'intervalle inclut la durée de la série)`;
    if (st) l += ` | PLATEAU : 3 séances sans record`;
    l += p ? ` | séance précédente (${fmtDate(p.t)}) : ${p.sets.map(x => setTxt(x, e.exId, p.t)).join(', ')} (e1RM ${fmt(Math.round(p.best.e * 10) / 10)})` : ' | première fois enregistrée';
    const older = h.slice(-5, -1);
    if (older.length) l += ` | avant : ` + older.map(o => `${fmtDate(o.t)} ${setTxt(o.sets.reduce((x, y) => e1rm(setW(y), y.r) > e1rm(setW(x), x.r) ? y : x), e.exId, o.t)}`).join(' ; ');
    if (e.note && e.note.trim()) l += ` | COMMENTAIRE DE L'UTILISATEUR : « ${e.note.trim().replace(/\s+/g, ' ')} »`;
    return l;
  });
  const wk = weeksSummary(4), ids = w.entries.map(e => e.exId);
  const muS = {}; for (const e of w.entries) { const m = ex(e.exId)?.muscle || 'Autre'; muS[m] = (muS[m] || 0) + workSets(e).length; }
  // Semaine de la séance analysée, pas la semaine courante : une séance
  // d'il y a trois semaines doit être jugée dans son propre contexte.
  const wMon = mondayOf(w.startedAt), wEnd = Math.min(Date.now(), addDays(wMon, 7)) + 1;
  const muWeek = muscleSets(wMon, wEnd), absent = MUSCLES.filter(m => !(muWeek[m] > 0));
  const old = Date.now() - w.startedAt > 10 * 86400000;
  return `${profileLine()}

${historyLine()}

SÉANCE DU ${fmtDateL(w.startedAt)} « ${w.name} » — durée ${durOdd(w) ? 'non significative' : dur(w.endedAt - w.startedAt)}, ${wSets(w)} séries de travail (hors échauffement), volume ${fmt(wVol(w))} kg.
${durOdd(w) ? DUR_NOTE + '\n' : ''}
(Les séries d'échauffement sont indiquées à part et exclues du volume, du e1RM et des records.)
(Un « COMMENTAIRE DE L'UTILISATEUR » explique le contexte d'un exercice — aide d'un partenaire, série délestée, blessure, reprise progressive, etc. Tu dois en tenir compte : une série avec aide ou une charge réduite volontairement n'est pas un échec ni une régression ; adapte la recommandation à la situation décrite, avec prudence en cas de blessure.)
${lines.join('\n')}

RECORDS : ${prsFor(w).join(' ; ') || 'aucun'}

RÉPARTITION DE CETTE SÉANCE (séries de travail) : ${fmtMuscles(muS)}
SEMAINE DE CETTE SÉANCE (du ${fmtDate(wMon)}, séries par groupe) : ${fmtMuscles(muWeek)}${absent.length ? `\nNON TRAVAILLÉ CETTE SEMAINE-LÀ : ${absent.join(', ')}` : ''}
${old ? `(Séance passée, analysée après coup : les données d'intervalle entre séries peuvent manquer si elles sont antérieures à cette fonctionnalité. Juge-la dans son contexte de l'époque, et formule les recommandations pour les séances à venir.)` : ''}

EXERCICES DISPONIBLES DANS L'APP POUR CES MÊMES MUSCLES (non utilisés dans cette séance ; tu ne peux proposer de substitution ou d'ajout qu'en les nommant exactement tels qu'écrits ici) :
${subsFor(ids) || '(aucun autre exercice disponible)'}

${ficheBlock(ids)}

FRÉQUENCE (4 dernières semaines, séances/semaine, séries par groupe) :
${wk.map(x => `- semaine du ${fmtDate(x.a)} : ${x.c} séance(s) — séries : ${fmtMuscles(x.mu)}`).join('\n')}

TA MISSION : analyser cette séance, pas la raconter. L'utilisateur a ses chiffres sous les yeux dans l'app : ne les lui réénumère pas. Chaque phrase doit soit porter un jugement, soit prescrire une action, et s'appuyer sur une donnée précise (charge, répétitions, RIR, intervalle de repos, série, e1RM). Sois franc quand quelque chose ne va pas : volume insuffisant ou excessif sur un muscle, ordre des exercices discutable, redondance entre deux exercices qui sollicitent la même chose, séries trop faciles au vu du RIR, repos trop courts ou trop longs pour l'objectif, progression absente. Si un point est bon, dis-le en une ligne et passe à la suite.

Plan :
## Verdict
Deux ou trois phrases : ce que vaut cette séance et le problème principal à corriger.
## Structure
Ordre des exercices, équilibre entre les muscles, redondances, volume de la séance et de la semaine par rapport à l'objectif. Ce qui manque, ce qui est en trop.
## Exécution et intensité
Ce que montrent le RIR, les intervalles de repos et l'écart entre séries (fatigue, charges trop légères ou trop lourdes, séries non menées assez près de l'échec).
## Exercices
Lesquels garder, lesquels remplacer et par quoi, lesquels ajouter — uniquement des noms figurant dans la liste fournie, chacun avec la raison du changement. Si aucun changement ne se justifie, écris-le en une ligne.
## Prochaine séance
Pour chaque exercice conservé : charge × répétitions visées, selon la double progression adaptée à l'objectif.

Maximum 350 mots.`;
}

function notesBlock(since) {
  const out = [];
  for (const w of finished().filter(x => x.startedAt >= since).sort((a, b) => a.startedAt - b.startedAt))
    for (const e of w.entries) if (e.note && e.note.trim()) out.push(`- ${fmtDate(w.startedAt)} ${exName(e.exId)} : « ${e.note.trim().replace(/\s+/g, ' ')} »`);
  return out.length ? `\nCOMMENTAIRES DE L'UTILISATEUR (contexte à prendre en compte : aide d'un partenaire, délestage, blessure, reprise progressive… ; ne pas interpréter ces séances comme de simples plateaux ou régressions) :\n${out.slice(-20).join('\n')}\n` : '';
}
function analysisPrompt() {
  const wk = weeksSummary(6), since = wk[0].a;
  const ids = [...new Set(finished().filter(w => w.startedAt >= since).flatMap(w => w.entries.map(e => e.exId)))];
  const rows = ids.map(id => ({ id, h: exHistory(id).filter(x => x.t >= since) })).filter(r => r.h.length >= 2)
    .sort((a, b) => b.h.length - a.h.length).slice(0, 14);
  const lines = rows.map(r => {
    const h = r.h.slice(-6), stag = !!stagFor(r.id);
    return `- ${exName(r.id)} [${ex(r.id)?.muscle || '?'}] (${r.h.length} séances) : ` + h.map(x => `${fmtDate(x.t)} ${setTxt(x.sets.reduce((a, b) => e1rm(setW(b), b.r) > e1rm(setW(a), a.r) ? b : a), r.id, x.t)}`).join(' → ') + (stag ? ' | PLATEAU possible' : '');
  });
  const odd = finished().filter(w => w.startedAt >= since && durOdd(w)).length;
  return `${profileLine()}

${historyLine()}
${odd ? DUR_NOTE + '\n' : ''}
DONNÉES DES 6 DERNIÈRES SEMAINES (meilleure série par séance, séries de travail uniquement) :
${wk.map(x => `- semaine du ${fmtDate(x.a)} : ${x.c} séance(s) — séries : ${fmtMuscles(x.mu)}`).join('\n')}

PROGRESSION PAR EXERCICE :
${lines.join('\n') || '(aucun exercice avec au moins 2 séances)'}
${notesBlock(since)}
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
  body: '<svg viewBox="0 0 24 24"><circle cx="12" cy="4.8" r="2.2"/><path d="M6.5 9.5 12 8l5.5 1.5M12 8v6M9 21l3-7 3 7"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M8 10h8M8 13h5"/></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 4M17 6h2.5a2.5 2.5 0 0 1-2.5 4"/><path d="M12 14v3M9 20h6M10 17h4v3h-4z"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/><rect x="7" y="12.5" width="3" height="3" rx=".8" fill="currentColor" stroke="none"/></svg>',
  friends: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.6 3.2-5.4 6-5.4s5.4 1.8 6 5.4"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.4c2.6.1 4.1 1.7 4.5 4.6"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>',
  profile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6"/></svg>',
  coach: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>'
};
const TABS = [['train', 'Séance'], ['journal', 'Journal'], ['coach', 'Coach'], ['friends', 'Amis'], ['profile', 'Profil']];
ICONS.journal = ICONS.cal; ICONS.coach = ICONS.chat;

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
    body = syncBanner() + { train: viewTrain, journal: viewJournal, coach: viewCoach, friends: viewFriendsTab, profile: viewProfile }[S.tab]();
  }
  $('#app').innerHTML = `<header class="top"><div class="logo">LIFT</div>${S.user && !S.loading ? sign : ''}</header><main>${body}</main>`;
  $('#tabs').innerHTML = !tabs ? '' : TABS.map(([k, l]) => `<button class="tab ${S.tab === k ? 'on' : ''}" data-act="tab" data-t="${k}">${ICONS[k]}<span>${l}</span>${k === 'train' && S.active ? '<b class="dot"></b>' : ''}${k === 'friends' && friendBadge() ? `<i class="badge tb">${friendBadge()}</i>` : ''}</button>`).join('');
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

function viewTrain() { return editing() ? viewEdit() : S.active ? viewActive() : viewStart(); }

function viewEdit() {
  const w = W(), mins = Math.max(1, Math.round((w.endedAt - w.startedAt) / 60000));
  return `<section class="live edit"><div class="lbl" style="flex:none">Modification</div>
    <input class="wname" data-f="wname" value="${esc(w.name)}" aria-label="Nom de la séance" autocomplete="off">
    <button class="btn primary sm" data-act="editdone">Terminer</button></section>
    <div class="row" style="margin-bottom:12px">
      <div><label class="l">Date</label><input class="field" data-f="wdate" type="date" value="${new Date(w.startedAt).toISOString().slice(0, 10)}"></div>
      <div><label class="l">Durée (min)</label><input class="field" data-f="wdur" inputmode="numeric" value="${mins}"></div></div>
    ${w.entries.map(entryHtml).join('')}
    <button class="btn ghost" data-act="addex">+ Ajouter un exercice</button>
    <button class="btn" data-act="editdone" style="margin-top:4px">Terminer les modifications</button>`;
}

function viewStart() {
  const fw = finished(), ws = mondayOf(Date.now()), n = fw.filter(w => w.startedAt >= ws).length, last = fw[fw.length - 1];
  const dots = Array.from({ length: Math.max(cfg.perWeek, n) }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  return `${installHint()}
  <section class="card week"><div class="lbl">Cette semaine</div><div class="big">${n}<span> / ${cfg.perWeek} séances</span></div><div class="dots">${dots}</div></section>
  <button class="btn primary xl" data-act="start">Démarrer la séance</button>
  <button class="btn ghost" data-act="pastopen">+ Ajouter une séance passée</button>
  <div class="lbl sec">Routines</div>
  ${S.routines.map(r => `<div class="card routine"><div class="meta" data-act="routedit" data-id="${r.id}"><b>${esc(r.name)}</b><small>${r.exIds.length} exercice${r.exIds.length > 1 ? 's' : ''} · ${esc(r.exIds.slice(0, 3).map(exName).join(', '))}${r.exIds.length > 3 ? '…' : ''}</small></div>
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
    return `<div class="set ${cfg.rir ? 'r6' : ''} ${s.done ? 'done' : ''}" data-e="${e.id}" data-i="${i}">
      <button class="setno ${isW ? 'w' : ''}" data-act="settype" aria-label="Type de série">${isW ? 'É' : n}</button>
      <div class="prev">${p ? setChip(p, e.exId) : '–'}</div>
      <input class="in" data-f="w" inputmode="decimal" enterkeyhint="next" autocomplete="off" value="${fmtIn(s.w)}" placeholder="${fmtIn(ph.w)}" aria-label="Charge en kg">
      <input class="in" data-f="r" inputmode="numeric" enterkeyhint="done" autocomplete="off" value="${s.r ?? ''}" placeholder="${ph.r}" aria-label="Répétitions">
      ${cfg.rir ? (isW ? '<i></i>' : `<button class="rir ${s.rir != null ? 'on' : ''}" data-act="rir" aria-label="Répétitions en réserve">${s.rir != null ? s.rir : '–'}</button>`) : ''}
      <button class="chk" data-act="check" aria-label="Valider la série">✓</button></div>`;
  }).join('');
  return `<section class="entry" data-e="${e.id}"><div class="eh"><b>${esc(exName(e.exId))}<small>${esc(m)}</small></b>${editing() ? '' : `<button class="ehrest" data-act="restex" data-id="${e.exId}">⏱ ${restLabel(restFor(e.exId))}</button>`}${eyeBtn(ex(e.exId), 'x')}<button class="x" data-act="rmex" aria-label="Retirer l'exercice">✕</button></div>
    ${editing() ? '' : suggHtml(e)}
    <div class="sethead ${cfg.rir ? 'r6' : ''}"><span>SÉRIE</span><span>PRÉC.</span><span>KG</span><span>REPS</span>${cfg.rir ? '<span>RIR</span>' : ''}<span></span></div>${rows}
    ${cfg.tipW ? '' : '<div class="tip"><span>Touche le numéro d’une série pour la passer en échauffement, et inversement.</span><button class="x" data-act="tipw" aria-label="Compris">✕</button></div>'}
    <div class="setbtns"><button data-act="addwarm">+ Échauffement</button><button data-act="rmwarm">− Échauffement</button></div>
    <div class="setbtns"><button data-act="addset">+ Série</button><button data-act="rmset">− Série</button></div>
    <textarea class="note-in" data-f="note" rows="2" maxlength="500" placeholder="Commentaire sur cet exercice (aide d'un partenaire, série délestée, blessure…) — lu par le coach IA" aria-label="Commentaire sur l'exercice">${esc(e.note || '')}</textarea></section>`;
}

function workoutCard(w) {
  const mus = [...new Set(w.entries.map(e => ex(e.exId)?.muscle).filter(Boolean))];
  return `<button class="card wk" data-act="openw" data-id="${w.id}"><div class="t"><b>${esc(w.name)}${w.review ? '<span class="tag">Bilan</span>' : ''}</b><span>${fmtDate(w.startedAt)}</span></div>
    <div class="s"><span><em>${durOdd(w) ? '–' : dur(w.endedAt - w.startedAt)}</em></span><span><em>${wSets(w)}</em> séries</span><span><em>${Math.round(wVol(w)).toLocaleString('fr-FR')}</em> kg</span></div>
    ${mus.length ? `<div class="s">${esc(mus.join(' · '))}</div>` : ''}</button>`;
}

/* ---------- Journal : historique et calendrier réunis ---------- */
function viewJournal() {
  const z = S.jz === 'cal' ? 'cal' : 'list';
  const seg = `<div class="seg">${[['list', 'Liste'], ['cal', 'Calendrier']].map(([k, l]) => `<button class="${z === k ? 'on' : ''}" data-act="jz" data-k="${k}">${l}</button>`).join('')}</div>`;
  return seg + (z === 'cal' ? viewCalendar() : viewHistory());
}

/* ---------- Coach : conversation et analyses ---------- */
function viewCoach() {
  const z = S.cz === 'an' ? 'an' : 'chat';
  const seg = `<div class="seg">${[['chat', 'Conversation'], ['an', 'Analyses']].map(([k, l]) => `<button class="${z === k ? 'on' : ''}" data-act="cz" data-k="${k}">${l}</button>`).join('')}</div>`;
  if (z === 'chat') return seg + viewChat();
  const a = loadAnalysis();
  return seg + `${weekRevCard()}
  <div class="lbl sec">Analyse de progression</div>
  <section class="card"><p class="muted" style="margin:0 0 12px;font-size:14px">Gemini analyse tes 6 dernières semaines (régularité, progression, volume par muscle) et propose un plan pour les 2 prochaines.</p>
  <button class="btn primary" data-act="analyze" id="anbtn">Analyser ma progression</button><div id="anout">${a ? `<div class="review">${md(a.text)}<div class="meta">${new Date(a.ts).toLocaleDateString('fr-FR')} · ${esc(a.model)}</div></div>` : ''}</div></section>`;
}

function viewFriendsTab() { return S.sub === 'friend' ? viewFriend() : viewFriends(); }

function viewHistory() {
  const fw = finished().reverse();
  if (!fw.length) return '<p class="empty">Aucune séance terminée pour l’instant. Ton historique apparaîtra ici.</p>';
  return `<div class="lbl" style="margin-bottom:10px">${fw.length} séance${fw.length > 1 ? 's' : ''}</div>${fw.map(workoutCard).join('')}`;
}

/* Séries de travail par muscle, sur 7 jours ou en moyenne hebdomadaire sur
   4 semaines, comparées à la période précédente. Les deux repères sur la barre
   marquent 10 et 20 séries par semaine. */
function volCard() {
  const z = S.volZ === 28 ? 28 : 7, now = Date.now();
  const cur = muscleSets(addDays(now, -z), now + 1), prv = muscleSets(addDays(now, -2 * z), addDays(now, -z));
  const per = n => z === 28 ? Math.round((n || 0) / 4) : (n || 0);
  const mx = Math.max(22, ...MUSCLES.map(m => per(cur[m])));
  const pct = v => Math.min(100, v / mx * 100);
  return `<div class="lbl sec">Séries de travail par muscle</div>
  <div class="chips">${[[7, '7 derniers jours'], [28, 'moyenne sur 4 semaines']].map(([n, l]) => `<button class="chip ${z === n ? 'on' : ''}" data-act="volz" data-n="${n}">${l}</button>`).join('')}</div>
  <section class="card bars">
    ${MUSCLES.map(m => { const v = per(cur[m]), d = v - per(prv[m]);
      return `<div class="b"><span>${m}</span>
      <div class="track"><i style="width:${pct(v)}%"></i><u style="left:${pct(10)}%"></u><u style="left:${pct(20)}%"></u></div>
      <span class="n">${v}${d ? `<em class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}</em>` : ''}</span></div>`; }).join('')}
    <small class="note">${z === 28 ? 'Moyenne par semaine sur les 4 dernières semaines' : 'Total des 7 derniers jours'}, comparée à la période précédente. Les deux traits marquent 10 et 20 séries par semaine, la fourchette habituellement citée pour faire progresser un muscle.</small>
  </section>`;
}

/* ---------- bilan hebdomadaire automatique ----------
   Généré une fois par semaine, à la première ouverture de l'app à partir du
   dimanche 18 h. Sans notifications (plan Firebase gratuit), il ne peut pas
   arriver tout seul quand l'app est fermée. */
const wkKey = ts => new Date(mondayOf(ts)).toISOString().slice(0, 10);
const loadRev = () => { try { return JSON.parse(cfg.revTxt || 'null'); } catch (e) { return null; } };

function weekRevCard() {
  const r = loadRev(); if (!r || !r.text) return '';
  const a = mondayOf(new Date(r.week + 'T12:00:00').getTime());
  return `<div class="lbl" style="margin-bottom:10px">Bilan de la semaine du ${fmtDate(a)}</div>
  <section class="card"><div class="review">${md(r.text)}<div class="meta">généré le ${new Date(r.ts).toLocaleDateString('fr-FR')} · ${esc(r.model)}</div></div></section>`;
}

function weekRevPrompt(a, b) {
  const ws = finished().filter(w => w.startedAt >= a && w.startedAt < b);
  const cur = muscleSets(a, b), prev = [1, 2, 3].map(k => muscleSets(addDays(a, -7 * k), addDays(b, -7 * k)));
  const vol = MUSCLES.map(m => {
    const c = cur[m] || 0, p = Math.round(prev.reduce((s, o) => s + (o[m] || 0), 0) / 3);
    return (c || p) ? `${m} ${c} (moyenne des 3 semaines précédentes : ${p})` : null;
  }).filter(Boolean).join(', ');
  const recs = [], plats = [];
  for (const id of [...new Set(ws.flatMap(w => w.entries.map(e => e.exId)))]) {
    const h = exHistory(id); if (h.length < 2) continue;
    const ms = h.map(x => metric(x.best)), last = h[h.length - 1];
    if (ms[ms.length - 1] > Math.max(...ms.slice(0, -1)) * 1.005) recs.push(`${exName(id)} → ${setTxt(bestSetOf(last), id, last.t)}`);
    if (stagFor(id)) plats.push(exName(id));
  }
  return `${profileLine()}

${historyLine()}

SEMAINE DU ${fmtDate(a)} AU ${fmtDate(addDays(b, -1))} :
- séances réalisées : ${ws.length} (objectif : ${cfg.perWeek} par semaine)
- séries de travail par muscle : ${vol || 'aucune'}
- nouveaux records cette semaine : ${recs.join(' ; ') || 'aucun'}
- exercices en plateau (3 séances sans record) : ${plats.join(', ') || 'aucun'}
${notesBlock(a)}
Rédige le bilan de cette semaine, en t'adressant directement à l'utilisateur :
## La semaine en bref
## Ce qui a bien marché
## À surveiller
## La semaine qui vient (2 ou 3 actions précises)
Maximum 250 mots. N'avance aucun chiffre qui ne figure pas dans les données ci-dessus.`;
}

let revTried = false;
async function maybeWeekReview() {
  if (revTried || !cfg.autoRev || !cfg.apiKey || !S.user) return;
  revTried = true;
  const d = new Date(), ms = mondayOf(d.getTime());
  // La semaine n'est considérée comme terminée que le dimanche à partir de 18 h.
  const a = (d.getDay() === 0 && d.getHours() >= 18) ? ms : addDays(ms, -7), b = addDays(a, 7);
  const key = wkKey(a);
  if (cfg.revWk === key) return;
  if (!finished().some(w => w.startedAt >= a && w.startedAt < b)) { cfg.revWk = key; saveCfg(); return; }
  try {
    const text = await gemini(weekRevPrompt(a, b));
    cfg.revTxt = JSON.stringify({ text, ts: Date.now(), week: key, model: cfg.model });
    cfg.revWk = key; saveCfg();
    if (S.sub === 'progress') render();
    toastMsg('Ton bilan de la semaine est prêt.', 'gorev');
  } catch (e) { revTried = false; /* on retentera à la prochaine ouverture */ }
}

/* ---------- charge sur 12 mois glissants (visuel) ----------
   Une ligne par mois, la meilleure charge de travail du mois. Un mois sans
   séance reprend la charge du mois précédent, en grisé. Pour les exercices à
   barre, la charge est dessinée avec les disques réellement nécessaires ;
   pour une poulie ou une machine, une jauge proportionnelle. */
const BAR_KG = 20;
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATE_H = { 25: 23, 20: 21, 15: 18, 10: 15, 5: 12, 2.5: 9, 1.25: 7 };
const PLATE_F = { 25: '#F03024', 20: '#F03024', 15: '#CF291F', 10: '#CF291F', 5: '#9E201A', 2.5: '#9E201A', 1.25: '#7A1813' };
const MO3 = ['JANV', 'FÉVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
const isBarbell = id => { const e = ex(id); return !!e && (/^Barbell_/.test(e.img || '') || /\(barre\)/i.test(e.name) || /^Soulevé de terre/i.test(e.name)); };

function plateBreak(total, bar = BAR_KG) {
  let side = Math.round((total - bar) * 100) / 200, out = [];
  if (!(side > 0)) return out;
  for (const p of PLATES) while (side >= p - 1e-9 && out.length < 8) { out.push(p); side = Math.round((side - p) * 100) / 100; }
  return out;
}

// Meilleure charge de travail mois par mois, report inclus.
function monthlyLoad(exId, n = 12) {
  const first = new Date(); first.setDate(1); first.setHours(0, 0, 0, 0);
  const fw = finished(), out = [];
  for (let k = n - 1; k >= 0; k--) {
    const a = new Date(first); a.setMonth(a.getMonth() - k);
    const b = new Date(a); b.setMonth(b.getMonth() + 1);
    let best = 0;
    for (const w of fw) {
      if (w.startedAt < a.getTime() || w.startedAt >= b.getTime()) continue;
      for (const e of w.entries) if (e.exId === exId) for (const st of workSets(e)) best = Math.max(best, loadAt(exId, st, w.startedAt));
    }
    out.push({ t: a.getTime(), label: MO3[a.getMonth()], v: best || null, real: best > 0 });
  }
  let carry = null;
  for (const r of out) { if (r.v == null) r.v = carry; else carry = r.v; }
  return out;
}

function yearSvg(exId, w = 340) {
  const rows = monthlyLoad(exId), bb = isBarbell(exId);
  const RH = 30, H = rows.length * RH + 4;
  const LX = 42, RX = w - 58, GW = 58, bx0 = LX + GW, bx1 = RX - GW;
  const vals = rows.map(r => r.v).filter(v => v != null);
  const mx = Math.max(1, ...vals), mn = Math.min(...vals);
  // base de l'échelle sous le minimum, sinon des charges proches donnent des jauges toutes pleines
  const base = vals.length > 1 ? Math.max(0, mn - (mx - mn) * 0.9 - mx * 0.04) : 0;
  const body = rows.map((r, i) => {
    const y = i * RH + RH / 2, o = r.real ? 1 : .42;
    let draw = '';
    if (r.v == null) draw = `<text x="${LX}" y="${y + 4}" fill="#67645F" font-size="11">pas de donnée</text>`;
    else if (bb) {
      const pl = plateBreak(r.v);
      draw = `<rect x="${bx0}" y="${y - 1.5}" width="${bx1 - bx0}" height="3" rx="1.5" fill="#EFEADF" opacity="${o}"/>`;
      for (const [sign, edge] of [[-1, bx0], [1, bx1]]) {
        let off = 0;
        for (const p of pl) {
          const ph = PLATE_H[p], pw = 6;
          const x = sign < 0 ? edge - off - pw : edge + off;
          draw += `<rect x="${x}" y="${y - ph / 2}" width="${pw}" height="${ph}" rx="2" fill="${PLATE_F[p]}" opacity="${o}"/>`;
          off += pw + 1.5;
        }
      }
      if (!pl.length) draw += `<text x="${bx0 - 6}" y="${y + 4}" text-anchor="end" fill="#67645F" font-size="10" opacity="${o}">barre</text>`;
    } else {
      const fw2 = Math.max(6, ((r.v - base) / Math.max(1e-6, mx - base)) * (RX - LX));
      draw = `<rect x="${LX}" y="${y - 5}" width="${RX - LX}" height="10" rx="5" fill="#1E1E21"/>
        <rect x="${LX}" y="${y - 5}" width="${fw2}" height="10" rx="5" fill="#F03024" opacity="${o}"/>`;
    }
    return `<text x="0" y="${y + 4}" fill="#F03024" font-size="10.5" font-weight="600" opacity="${o}" letter-spacing=".06em">${r.label}</text>
      ${draw}
      <text x="${w}" y="${y + 4.5}" text-anchor="end" fill="#F2F1EF" font-size="13.5" font-weight="650" opacity="${o}">${r.v == null ? '–' : fmt(Math.round(r.v * 10) / 10)}</text>
      ${i ? `<line x1="0" x2="${w}" y1="${i * RH}" y2="${i * RH}" stroke="#FFFFFF" stroke-opacity=".05"/>` : ''}`;
  }).join('');
  return { svg: `<g>${body}</g>`, h: H, rows };
}

function yearCard(exId) {
  const W = 340, { svg, h, rows } = yearSvg(exId, W);
  const seen = rows.filter(r => r.v != null);
  const delta = seen.length > 1 ? Math.round((seen[seen.length - 1].v - seen[0].v) * 10) / 10 : null;
  return `<section class="card ycard" data-ex="${exId}">
    <div class="yhead"><b>${esc(exName(exId))}</b><small>${isBarbell(exId) ? 'barre de ' + BAR_KG + ' kg + disques par côté' : 'charge de travail'}</small></div>
    <svg class="ysvg" viewBox="0 0 ${W} ${h}" width="100%" role="img" aria-label="Charge mois par mois">${svg}</svg>
    <div class="yfoot"><span>Sur 12 mois</span><b style="color:var(--red)">${delta == null ? '–' : (delta > 0 ? '+' : '') + fmt(delta) + ' kg'}</b></div>
  </section>`;
}

const yearExs = () => { try { const a = JSON.parse(cfg.yearEx || '[]'); return Array.isArray(a) ? a.filter(ex).slice(0, 3) : []; } catch (e) { return []; } };
function yearDefaults() {
  const n = {};
  for (const w of finished()) for (const e of w.entries) if (workSets(e).length) n[e.exId] = (n[e.exId] || 0) + 1;
  return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
}
function yearBlock() {
  const ids = yearExs().length ? yearExs() : yearDefaults();
  if (!ids.length) return '';
  return `<div class="lbl sec">Ta charge sur 12 mois<button class="linkbtn yedit" data-act="year-pick">choisir</button></div>
    ${ids.map(yearCard).join('')}
    <button class="btn" data-act="year-img">Exporter en image</button>`;
}
function yearPick() {
  const n = {};
  for (const w of finished()) for (const e of w.entries) if (workSets(e).length) n[e.exId] = (n[e.exId] || 0) + 1;
  const list = Object.entries(n).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const cur = yearExs().length ? yearExs() : yearDefaults();
  sheet(`<h3>Exercices suivis</h3><p class="muted" style="margin:-8px 0 12px;font-size:14px">Jusqu'à trois exercices. ${list.length} pratiqués.</p>
    <div class="pk-list">${list.map(id => `<button class="pk-item ${cur.includes(id) ? 'on' : ''}" data-act="year-tog" data-id="${id}"><span class="tick"></span><span class="pk-n">${esc(exName(id))}</span><small>${n[id]} séance${n[id] > 1 ? 's' : ''}</small></button>`).join('')}</div>
    <button class="btn primary" data-act="closesheet">Terminé</button>`);
}
function yearToggle(id) {
  let cur = yearExs().length ? yearExs() : yearDefaults();
  cur = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id].slice(-3);
  cfg.yearEx = JSON.stringify(cur); saveCfg(); yearPick(); render();
}

// Export : le SVG est autonome (couleurs et tailles en attributs), donc il se
// rend tel quel dans un canvas, sans dépendre de la feuille de style.
async function yearImage() {
  const ids = yearExs().length ? yearExs() : yearDefaults();
  if (!ids.length) return;
  const W = 340, PAD = 18, GAP = 22, HEAD = 64;
  const parts = ids.map(id => ({ id, ...yearSvg(id, W) }));
  const total = HEAD + parts.reduce((t, p) => t + p.h + GAP + 34, 0) + PAD;
  const inner = parts.map((p, i) => {
    const top = HEAD + parts.slice(0, i).reduce((t, q) => t + q.h + GAP + 34, 0);
    const seen = p.rows.filter(r => r.v != null);
    const d = seen.length > 1 ? Math.round((seen[seen.length - 1].v - seen[0].v) * 10) / 10 : null;
    return `<g transform="translate(${PAD},${top})">
      <text x="0" y="0" fill="#F2F1EF" font-size="15" font-weight="650">${esc(exName(p.id))}</text>
      <g transform="translate(0,12)">${p.svg}</g>
      <text x="0" y="${p.h + 28}" fill="#9A9791" font-size="12">Sur 12 mois</text>
      <text x="${W}" y="${p.h + 28}" text-anchor="end" fill="#F03024" font-size="17" font-weight="700">${d == null ? '–' : (d > 0 ? '+' : '') + fmt(d) + ' kg'}</text></g>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W + PAD * 2}" height="${total}" viewBox="0 0 ${W + PAD * 2} ${total}" font-family="-apple-system,system-ui,sans-serif">
    <rect width="100%" height="100%" fill="#09090B"/>
    <text x="${PAD}" y="28" fill="#F2F1EF" font-size="19" font-weight="700" letter-spacing=".16em">LIFT</text>
    <text x="${W + PAD}" y="28" text-anchor="end" fill="#67645F" font-size="12">${new Date().toLocaleDateString('fr-FR')}</text>
    ${inner}</svg>`;
  try {
    const blob = await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = (W + PAD * 2) * 2; c.height = total * 2;
        const x = c.getContext('2d'); x.scale(2, 2); x.drawImage(img, 0, 0);
        c.toBlob(b => b ? res(b) : rej(new Error('rendu impossible')), 'image/png');
      };
      img.onerror = () => rej(new Error('rendu impossible'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    const file = new File([blob], `lift-charge-${new Date().toISOString().slice(0, 10)}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Ma charge sur 12 mois' }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch (e) { alert("Export impossible sur cet appareil."); }
}

function viewProgress() {
  const fw = finished();
  const ids = [...new Set(fw.flatMap(w => w.entries.map(e => e.exId)))];
  const rows = ids.map(id => ({ id, h: exHistory(id) })).filter(r => r.h.length).sort((a, b) => b.h[b.h.length - 1].t - a.h[a.h.length - 1].t);
  return `${yearBlock()}
  ${volCard()}
  <div class="lbl sec">Exercices</div>
  ${rows.map(r => {
    const last = r.h[r.h.length - 1], ser = r.h.slice(-8).map(x => metric(x.best)), d = ser.length > 1 && ser[0] > 0 ? (ser[ser.length - 1] / ser[0] - 1) * 100 : null;
    return `<button class="card prow wk" data-act="exdetail" data-id="${r.id}"><div class="meta"><b>${esc(exName(r.id))}</b><small>${esc(ex(r.id)?.muscle || '')} · ${r.h.length} séance${r.h.length > 1 ? 's' : ''}${stagFor(r.id) ? ' · <span class="plat">plateau</span>' : ''}</small></div>
      ${spark(ser)}<div class="val">${fmt(last.best.w)} × ${last.best.r}<small class="${d == null ? '' : d >= 0 ? 'up' : 'down'}">${d == null ? '' : (d >= 0 ? '+' : '') + Math.round(d) + ' %'}</small></div></button>`;
  }).join('') || '<p class="empty">Les courbes de progression apparaîtront après ta première séance.</p>'}`;
}

function viewSettings() {
  return `${installHint()}
  <div class="lbl" style="margin-bottom:10px">Compte</div>
  <section class="card"><b>Amis et partage</b><div class="muted" style="font-size:13px;margin:4px 0 10px">Pseudo : ${cfg.handle ? '<b>@' + esc(cfg.handle) + '</b>' : 'non choisi'}</div><div class="row"><button class="btn" data-act="handle-open">${cfg.handle ? 'Changer de pseudo' : 'Choisir un pseudo'}</button><button class="btn" data-act="share-open">Ce que je partage</button></div></section>
  <section class="card"><div class="row" style="align-items:center"><div style="min-width:0"><b>${esc(cfg.pseudo || 'Mon compte')}</b><div class="muted" style="font-size:13px;overflow:hidden;text-overflow:ellipsis">${esc(S.user ? S.user.email : '')}</div>
    <div style="font:500 13px var(--sans);margin-top:6px" class="${navigator.onLine && !S.syncErr ? 'up' : 'down'}">${navigator.onLine && !S.syncErr ? '● Synchronisé' : '● Hors ligne'}</div></div>
    <button class="btn sm" style="flex:none;width:auto" data-act="logout">Se déconnecter</button></div></section>

  <div class="lbl sec">Mon objectif</div>
  <section class="card">
    <label class="l" style="margin-top:0">Objectif</label>
    <select class="field" data-cfg="goal">${Object.entries(GOALS).map(([k, g]) => `<option value="${k}" ${cfg.goal === k ? 'selected' : ''}>${g.label}</option>`).join('')}</select>
    <label class="l">Séances par semaine</label>
    <div class="seg">${[2, 3, 4, 5, 6].map(n => `<button class="${cfg.perWeek === n ? 'on' : ''}" data-act="perweek" data-n="${n}">${n}</button>`).join('')}</div>
    <label class="l">Niveau</label>
    <select class="field" data-cfg="level">${LEVELS.map(l => `<option ${cfg.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <div class="row"><div><label class="l">Poids de corps (kg)</label><input class="field" data-cfg="bw" inputmode="decimal" placeholder="optionnel" value="${esc(cfg.bw)}"></div>
    <div><label class="l">Repos par défaut (secondes)</label><input class="field" data-cfg="rest" inputmode="numeric" value="${cfg.rest}"></div></div>
    <label class="shrow" style="border-top:0;padding-bottom:0"><input type="checkbox" data-cfg="rir" ${cfg.rir ? 'checked' : ''}><span><b>Noter la difficulté (RIR)</b><br><small class="note">Ajoute une colonne pour indiquer combien de répétitions il te restait en réserve. L’objectif de charge et le coach IA en tiennent compte.</small></span></label>
  </section>

  <div class="lbl sec">Connexion Gemini</div>
  <section class="card">
    <small class="note">L'app utilise l'API Gemini (gratuite avec limites), pas ton abonnement. Crée une clé sur <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>. Par défaut elle reste uniquement sur cet appareil. Coche l'option ci-dessous pour la retrouver automatiquement sur tes autres appareils. Chacun utilise sa propre clé gratuite.</small>
    <label class="l" style="margin-top:0">Clé API</label>
    <input class="field" type="password" data-cfg="apiKey" placeholder="AIza…" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(cfg.apiKey)}">
    <label class="l" style="display:flex;gap:10px;align-items:flex-start;text-transform:none;letter-spacing:0;font-size:14px"><input type="checkbox" data-cfg="syncKey" ${cfg.syncKey ? 'checked' : ''} style="margin-top:3px"><span>Synchroniser ma clé entre mes appareils<br><small class="note">Elle est alors enregistrée dans ton compte (visible uniquement par toi et par l'administrateur de l'app) et retirée de l'appareil à la déconnexion.</small></span></label>
    <label class="l">Modèle</label>
    <input class="field" data-cfg="model" list="models" autocapitalize="off" spellcheck="false" value="${esc(cfg.model)}">
    <datalist id="models"><option value="gemini-3.5-flash"><option value="gemini-3.1-flash-lite"><option value="gemini-2.5-flash"><option value="gemini-2.5-flash-lite"></datalist>
    <label class="l" style="display:flex;gap:10px;align-items:flex-start;text-transform:none;letter-spacing:0;font-size:14px"><input type="checkbox" data-cfg="autoRev" ${cfg.autoRev ? 'checked' : ''} style="margin-top:3px"><span>Bilan hebdomadaire automatique<br><small class="note">Le coach rédige le bilan de ta semaine à la première ouverture de l'app à partir du dimanche 18 h, puis l'affiche dans Statistiques. Une requête Gemini par semaine. Sans notifications sur le plan gratuit, il ne peut pas arriver quand l'app est fermée.</small></span></label>
    <button class="btn" data-act="testkey">Tester la connexion</button><div id="keystatus" class="muted" style="font-size:14px"></div>
  </section>

  <div class="lbl sec">Données</div>
  <section class="card">
    <small class="note">Tes séances sont enregistrées dans ton compte et synchronisées en temps réel. L'export crée une copie de sécurité (la clé API n'y est jamais incluse). L'import ajoute une sauvegarde à ton compte, par exemple celle de l'ancienne version de l'app.</small>
    <div class="row"><button class="btn" data-act="export">Exporter</button><button class="btn" data-act="import">Importer</button></div>
  </section>

  ${versionCard()}`;
}

/* ---------- version et mise à jour ---------- */
function versionCard() {
  const swv = SW.cache ? SW.cache.replace(/^lift-cloud-/, '') : null;
  const mismatch = swv && swv !== VERSION;
  return `<div class="lbl sec">Version</div>
  <section class="card">
    <div class="vrow"><span>Application</span><b>${VERSION}</b></div>
    <div class="vrow"><span>Cache hors ligne</span><b class="${mismatch ? 'down' : ''}">${swv ? esc(swv) : SW.asked ? 'indisponible' : '…'}</b></div>
    ${mismatch ? `<p class="note down" style="margin:8px 0 0">Les fichiers chargés et le cache hors ligne ne sont pas de la même version : la mise à jour est incomplète. Force-la ci-dessous.</p>` : ''}
    <small class="note">Si un écran ne se comporte pas comme prévu, compare d'abord cette version à la dernière publiée. « Forcer la mise à jour » vide le cache de l'app et recharge les fichiers depuis le serveur. Tes séances, tes réglages et ta connexion ne sont pas touchés.</small>
    <button class="btn" data-act="forceupdate" id="fupd">Forcer la mise à jour</button>
  </section>`;
}

const SW = { cache: null, asked: false, nagged: false };
let swReg = null;

function swAsk() {
  try {
    const c = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (c) { SW.asked = true; c.postMessage('version'); }
  } catch (e) { }
}

function swNotice() {
  if (SW.nagged) return; SW.nagged = true;
  const el = $('#toast'); if (!el) return;
  clearTimeout(undoT); undoFn = null;
  el.innerHTML = `<span>Nouvelle version installée.</span><button data-act="swreload">Mettre à jour</button>`;
  el.classList.add('on');
}

async function forceUpdate() {
  const b = $('#fupd'); if (b) { b.disabled = true; b.textContent = 'Mise à jour…'; }
  try {
    if (swReg) await swReg.unregister().catch(() => { });
    else if (navigator.serviceWorker) {
      const rs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(rs.map(r => r.unregister().catch(() => { })));
    }
  } catch (e) { }
  try {
    if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
  } catch (e) { }
  // Les données (séances, compte, clé) vivent dans IndexedDB / localStorage : rien n'est effacé ici.
  const u = location.origin + location.pathname + '?maj=' + Date.now();
  try { location.replace(u); } catch (e) { location.href = u; }
}

function swSetup() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  const hadCtrl = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('message', ev => {
    const d = ev.data || {};
    if (d.type === 'swv') { SW.cache = d.cache; if (S.sub === 'settings') render(); }
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => { swAsk(); if (hadCtrl) swNotice(); });
  navigator.serviceWorker.register('sw.js').then(reg => {
    swReg = reg;
    swAsk();
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing || reg.waiting; if (!nw) return;
      nw.addEventListener('statechange', () => {
        if ((nw.state === 'installed' || nw.state === 'activated') && hadCtrl) swNotice();
      });
    });
    setTimeout(() => { reg.update().catch(() => { }); }, 2500);
  }).catch(() => { });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    swAsk();
    if (swReg) swReg.update().catch(() => { });
  });
}

/* ---------- fiches techniques ---------- */
const ficheHtml = id => {
  const f = FICHES[id]; if (!f) return '';
  const ul = a => `<ul class="fi-l">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return `<div class="fiche"><div class="lbl">Exécution</div>${ul(f.e)}
    ${f.f ? `<div class="lbl">Erreurs fréquentes</div>${ul(f.f)}` : ''}
    ${f.p ? `<div class="lbl">Précaution</div><p class="fi-p">${esc(f.p)}</p>` : ''}
    ${f.v ? `<div class="lbl">Variantes</div><p class="fi-p">${esc(f.v)}</p>` : ''}</div>`;
};
// version compacte envoyée au coach IA (une ligne par exercice)
const ficheLine = id => {
  const f = FICHES[id]; if (!f) return null;
  return `- ${exName(id)} : exécution — ${f.e.join(' ')}${f.f ? ` Erreurs — ${f.f.join(' ')}` : ''}${f.p ? ` Précaution — ${f.p}` : ''}${f.v ? ` Variantes — ${f.v}` : ''}`;
};
function ficheBlock(ids, max = 10) {
  const l = [...new Set(ids)].slice(0, max).map(ficheLine).filter(Boolean);
  return l.length ? `REPÈRES TECHNIQUES DE L'APP (à utiliser pour tes conseils d'exécution ; ne les recopie pas tels quels) :\n${l.join('\n')}` : '';
}

/* ---------- annulation (bandeau temporaire) ---------- */
let undoT = null;
function undoable(msg, fn) {
  clearTimeout(undoT);
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span><button data-act="undo">Annuler</button>`;
  el.classList.add('on'); undoFn = fn;
  undoT = setTimeout(() => { el.classList.remove('on'); undoFn = null; }, 7000);
}
let undoFn = null;
// Bandeau simple, sans annulation : une information et un bouton d'action.
function toastMsg(msg, act) {
  const el = $('#toast'); if (!el) return;
  clearTimeout(undoT); undoFn = null;
  el.innerHTML = `<span>${esc(msg)}</span><button data-act="${act || 'toastx'}">${act ? 'Voir' : 'OK'}</button>`;
  el.classList.add('on');
  undoT = setTimeout(() => el.classList.remove('on'), 12000);
}
function doUndo() { const f = undoFn; undoFn = null; clearTimeout(undoT); $('#toast').classList.remove('on'); if (f) f(); }

/* ---------- photo de profil ----------
   Recadrée au carré et compressée dans le navigateur, puis stockée dans le
   compte (quelques kilo-octets) : elle suit l'utilisateur d'un appareil à
   l'autre et s'affiche chez ses amis s'il partage. */
function avatarSheet() {
  sheet(`<h3>Ma photo</h3>
    <div style="display:flex;justify-content:center;margin:4px 0 16px">${avatarImg(cfg.pseudo, cfg.avatar, 'xl')}</div>
    <button class="btn primary" data-act="avatar-pick">${cfg.avatar ? 'Changer la photo' : 'Choisir une photo'}</button>
    ${cfg.avatar ? '<button class="btn danger-text" data-act="avatar-del">Retirer la photo</button>' : ''}
    <small class="note">Elle est recadrée au carré et réduite avant d'être enregistrée dans ton compte. Tes amis la voient si tu partages ton activité.</small>`);
}
const AV_PX = 256;
function setAvatar(file) {
  if (!/^image\//.test(file.type)) { alert('Choisis une image.'); return; }
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const side = Math.min(im.width, im.height);
      const c = document.createElement('canvas'); c.width = c.height = AV_PX;
      const x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(im, (im.width - side) / 2, (im.height - side) / 2, side, side, 0, 0, AV_PX, AV_PX);
      let q = .72, url = c.toDataURL('image/jpeg', q);
      while (url.length > 90000 && q > .35) { q -= .12; url = c.toDataURL('image/jpeg', q); }
      if (url.length > 120000) { alert("Cette image est trop lourde même après compression. Essaie-en une autre."); return; }
      cfg.avatar = url; saveCfg(); closeSheet(); render(); schedulePush(true);
    };
    im.onerror = () => alert("Image illisible.");
    im.src = fr.result;
  };
  fr.onerror = () => alert("Lecture du fichier impossible.");
  fr.readAsDataURL(file);
}

/* ---------- feuilles (sheets) ---------- */
function openRestSheet(exId) {
  const cur = restMap()[exId] || 0;
  const opt = n => `<button class="chip ${cur === n ? 'on' : ''}" data-act="restset" data-ex="${exId}" data-n="${n}">${restLabel(n)}</button>`;
  sheet(`<h3>Repos — ${esc(exName(exId))}</h3>
    <p class="muted" style="margin:-6px 0 12px;font-size:14px">Temps de repos lancé après chaque série de travail de cet exercice.</p>
    <div class="chips">${[30, 45, 60, 90, 120, 150, 180, 240, 300].map(opt).join('')}</div>
    <div class="pk-foot"><button class="btn ghost" data-act="restset" data-ex="${exId}" data-n="0">Valeur par défaut (${restLabel(defRest())})</button><button class="btn primary" data-act="closesheet">Fermer</button></div>`);
}

function sheet(html) {
  const s = $('#sheet'); s.innerHTML = `<div class="backdrop" data-act="closesheet"></div><div class="panel"><div class="sheet-bar"><div class="grab"></div><button class="sheet-x" data-act="closesheet" aria-label="Fermer">✕</button></div>${html}</div>`;
  s.classList.add('open'); document.body.classList.add('lock');
}
function closeSheet() { const s = $('#sheet'); s.classList.remove('open'); s.innerHTML = ''; document.body.classList.remove('lock'); picker = null; closeView(); }

/* illustration (lightbox) */
function exView(id) {
  const e = ex(id); if (!e || !(e.img || hasMap(e))) return; closeView();
  const d = document.createElement('div'); d.id = 'lightbox';
  d.innerHTML = `<div class="lb-bg" data-act="lbclose"></div><div class="lb-card"><button class="lb-x" data-act="lbclose" aria-label="Fermer">✕</button>
    <h3>${esc(e.name)}</h3><div class="lb-m">${esc(e.muscle)}</div>
    ${exImgs(e).length ? `<div class="lb-imgs">${exImgs(e).map(u => `<img src="${u}" alt="${esc(e.name)}">`).join('')}</div>` : ''}
    ${muscleMap(e)}
    ${ficheHtml(e.id)}
    <small class="note">Photos à titre d'exemple (base libre free-exercise-db) : le matériel de ta salle peut différer légèrement. Muscles : principal en rouge vif, secondaires en rouge foncé.</small></div>`;
  document.body.appendChild(d);
}
function closeView() { const d = $('#lightbox'); if (d) d.remove(); }
document.addEventListener('error', ev => {
  const i = ev.target; if (!i || i.tagName !== 'IMG') return;
  if (i.classList.contains('thumb')) i.style.visibility = 'hidden';
  else { const m = document.createElement('p'); m.className = 'empty'; m.textContent = 'Image indisponible (connexion ?)'; i.replaceWith(m); }
}, true);

/* sélecteur d'exercices */
let picker = null;
function openPicker(cb) { picker = { sel: new Set(), q: '', mu: '', cb, creating: false }; drawPicker(); }
function pkList() {
  const used = {}; finished().forEach(w => w.entries.forEach(e => { used[e.exId] = (used[e.exId] || 0) + 1; }));
  const q = norm(picker.q);
  const list = S.exercises.filter(e => (!picker.mu || e.muscle === picker.mu) && (!q || q.split(/\s+/).every(tk => norm(e.name + ' ' + e.muscle + (/\(Smith\)/.test(e.name) ? ' smith machine barre guidee' : '')).includes(tk))))
    .sort((a, b) => (used[b.id] || 0) - (used[a.id] || 0) || a.name.localeCompare(b.name, 'fr'));
  return list.map(e => `<div class="pk-row"><button class="pk-item ${picker.sel.has(e.id) ? 'on' : ''}" data-act="pk-toggle" data-id="${e.id}"><span class="tick"></span>${thumb(e)}<span class="pk-n">${esc(e.name)}</span><small>${esc(e.muscle)}</small></button>${eyeBtn(e, 'pk-eye')}</div>`).join('')
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
    <div class="stats"><div class="stat"><b>${durOdd(w) ? '–' : dur(w.endedAt - w.startedAt)}</b><span>Durée</span></div><div class="stat"><b>${Math.round(wVol(w)).toLocaleString('fr-FR')}</b><span>Volume (kg)</span></div>
    <div class="stat"><b>${wSets(w)}</b><span>Séries de travail</span></div><div class="stat"><b>${w.entries.length}</b><span>Exercices</span></div></div>
    ${durOdd(w) ? `<div class="hint" style="margin-top:12px"><span>Durée mesurée : ${dur(w.endedAt - w.startedAt)} pour ${wSets(w)} séries. La séance a sans doute été saisie après coup : elle est ignorée dans les totaux de temps et par le coach. <button class="linkbtn" data-act="editw" data-id="${w.id}">Corriger la durée</button></span></div>` : ''}
    ${prs.length ? `<div class="lbl sec" style="margin-top:16px">Records</div>${prs.map(p => `<div class="pr">${esc(p)}</div>`).join('')}` : ''}
    <div class="lbl sec" style="margin-top:16px">Coach IA</div><div id="review-box" data-w="${w.id}">${reviewHtml(w)}</div>
    <div class="lbl sec" style="margin-top:16px">Détail</div>
    ${w.entries.map(e => `<div style="margin:10px 0"><b>${esc(exName(e.exId))}</b><div class="chips2">${e.sets.filter(s => s.done).map(s => `<span class="sc ${s.type === 'W' ? 'w' : ''}">${s.type === 'W' ? 'É ' : ''}${setChip(s, e.exId)}${s.rir != null ? ` <em>RIR ${s.rir}</em>` : ''}</span>`).join('')}</div>${e.note && e.note.trim() ? `<div class="note-txt">💬 ${esc(e.note.trim())}</div>` : ''}</div>`).join('')}
    <div class="row" style="margin-top:14px"><button class="btn" data-act="saveroutine" data-id="${w.id}">Enregistrer en routine</button>
    <button class="btn" data-act="editw" data-id="${w.id}">Modifier</button>
    ${friendsAccepted().length ? `<button class="btn" data-act="send-open" data-id="${w.id}">Envoyer à un ami</button>` : ''}
    ${fresh ? '<button class="btn primary" data-act="closesheet">Fermer</button>' : '<button class="btn" data-act="delw" data-id="' + w.id + '" style="color:#ff8a4c">Supprimer</button>'}</div>`);
  if (fresh && cfg.apiKey && !w.review) runReview(w.id);
}
function reviewHtml(w, err) {
  if (w.review) return `<div class="review">${md(w.review.text)}<div class="meta">${new Date(w.review.ts).toLocaleDateString('fr-FR')} · ${esc(w.review.model)}</div></div><button class="btn ghost" data-act="review" data-id="${w.id}">Régénérer le bilan</button>`;
  return `${err ? `<div class="err">${esc(err)}</div>` : ''}<button class="btn ${cfg.apiKey ? 'primary' : ''}" data-act="review" data-id="${w.id}">Obtenir le bilan IA</button>${cfg.apiKey ? '' : '<small class="note">Ajoute d’abord ta clé Gemini dans Profil → Réglages.</small>'}`;
}
async function runReview(id) {
  const w = S.workouts.find(x => x.id === id); if (!w) return;
  const box = () => { const b = $('#review-box'); return b && b.dataset.w === id ? b : null; };
  if (box()) box().innerHTML = '<div class="loading"><i></i>Le coach analyse ta séance…</div>';
  try {
    const text = await gemini(sessionPrompt(w));
    w.review = { text, ts: Date.now(), model: cfg.model }; put('workouts', w);
    if (box()) box().innerHTML = reviewHtml(w);
    if (S.tab === 'journal') render();
  } catch (e) { if (box()) box().innerHTML = reviewHtml(w, e.message); }
}

function exDetail(id) {
  const h = exHistory(id), unit = h.some(x => x.best.e > 0) ? 'e1RM kg' : 'reps';
  const pts = h.slice(-20).map(x => ({ t: x.t, v: Math.round(metric(x.best) * 10) / 10 }));
  const maxW = Math.max(...h.map(x => Math.max(...x.sets.map(y => loadAt(id, y, x.t))))), bestE = Math.max(...h.map(x => x.best.e));
  sheet(`<h3>${esc(exName(id))}</h3>
    ${exImgs(ex(id)).length ? `<div class="lb-imgs">${exImgs(ex(id)).map(u => `<img src="${u}" alt="" loading="lazy">`).join('')}</div>` : ''}
    ${muscleMap(ex(id))}
    ${ficheHtml(id)}
    <div class="stats"><div class="stat"><b>${fmt(maxW)} kg</b><span>Charge max</span></div><div class="stat"><b>${bestE > 0 ? fmt(Math.round(bestE * 10) / 10) + ' kg' : '–'}</b><span>Meilleur e1RM</span></div></div>
    ${(() => { const st = stagFor(id); return st ? `<div class="tip plateau"><span>⚠︎</span><span><b>Plateau depuis le ${fmtDate(st.since)}.</b> ${STAG_TIP}</span></div>` : ''; })()}
    <div class="lbl sec" style="margin-top:16px">Charge sur 12 mois</div>${yearCard(id)}
    <div class="lbl sec" style="margin-top:16px">Progression (${unit})</div>${lineChart(pts, unit)}
    <small class="note">e1RM = charge maximale estimée sur 1 répétition (formule d'Epley). Séries de travail uniquement.</small>
    <div class="lbl sec" style="margin-top:12px">Dernières séances</div>
    ${h.slice(-10).reverse().map(x => `<div style="margin:8px 0"><span class="muted" style="font:500 12px var(--mono)">${fmtDate(x.t)}</span><div class="chips2">${x.sets.map(s => `<span class="sc">${setChip(s, id)}</span>`).join('')}</div></div>`).join('')}`);
}

/* ---------- séance passée, routines, séance oubliée ---------- */
function openPastSheet() {
  sheet(`<h3>Ajouter une séance passée</h3>
    <p class="muted" style="margin:-6px 0 12px;font-size:14px">Pour saisir après coup une séance faite à la salle. Tu choisis la date, puis tu ajoutes les exercices comme d’habitude.</p>
    <label class="l" style="margin-top:0">Date</label><input id="pw-d" class="field" type="date" max="${new Date().toISOString().slice(0, 10)}" value="${new Date().toISOString().slice(0, 10)}">
    <label class="l">Nom</label><input id="pw-n" class="field" maxlength="40" value="${esc(defaultName())}" autocomplete="off">
    <div class="pk-foot"><button class="btn ghost" data-act="closesheet">Annuler</button><button class="btn primary" data-act="pastgo">Créer</button></div>`);
}
function createPast() {
  const d = $('#pw-d').value, nm = ($('#pw-n').value || '').trim() || defaultName();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
  const ts = new Date(d + 'T18:00:00').getTime();
  if (ts > Date.now()) { alert('Choisis une date passée.'); return; }
  const w = { id: uid(), startedAt: ts, endedAt: ts + 1000, name: nm.slice(0, 40), entries: [], review: null, updatedAt: Date.now() };
  S.workouts.push(w); put('workouts', w);
  editId = w.id; closeSheet(); S.tab = 'train'; S.sub = ''; render(); window.scrollTo(0, 0);
}
function routineSheet(id) {
  const r = S.routines.find(x => x.id === id); if (!r) return;
  sheet(`<h3>Modifier la routine</h3>
    <label class="l" style="margin-top:0">Nom</label><input id="ro-n" class="field" maxlength="40" value="${esc(r.name)}" autocomplete="off">
    <div class="lbl sec">Exercices</div>
    ${r.exIds.map((x, i) => `<div class="frow"><span class="fn"><b>${esc(exName(x))}</b><small class="muted">${esc(ex(x)?.muscle || '')}</small></span>
      <button class="x" data-act="ro-up" data-id="${id}" data-i="${i}" ${i ? '' : 'disabled'} aria-label="Monter">▲</button>
      <button class="x" data-act="ro-dn" data-id="${id}" data-i="${i}" ${i === r.exIds.length - 1 ? 'disabled' : ''} aria-label="Descendre">▼</button>
      <button class="x" data-act="ro-rm" data-id="${id}" data-i="${i}" aria-label="Retirer">✕</button></div>`).join('') || '<p class="empty">Aucun exercice.</p>'}
    <button class="btn ghost" data-act="ro-add" data-id="${id}">+ Ajouter un exercice</button>
    <div class="pk-foot"><button class="btn ghost" data-act="ro-del" data-id="${id}" style="color:#ff8a4c">Supprimer</button><button class="btn primary" data-act="ro-save" data-id="${id}">Enregistrer</button></div>`);
}
// Le nom en cours de saisie doit survivre aux manipulations de la liste.
function keepRoutineName(r) { const el = $('#ro-n'); const v = el && (el.value || '').trim(); if (v) r.name = v.slice(0, 40); }
function routineMove(id, i, d) {
  const r = S.routines.find(x => x.id === id); if (!r) return;
  keepRoutineName(r);
  const j = i + d; if (j < 0 || j >= r.exIds.length) return;
  [r.exIds[i], r.exIds[j]] = [r.exIds[j], r.exIds[i]]; put('routines', r); routineSheet(id);
}
// Séance laissée ouverte : on propose de la fermer à la dernière série validée.
let askedStale = false;
function checkStale() {
  const w = S.active; if (!w || askedStale) return;
  if (Date.now() - w.startedAt < 5 * 3600000) return;
  askedStale = true;
  const done = w.entries.flatMap(e => e.sets).filter(x => x.done && x.ts), last = done.length ? Math.max(...done.map(x => x.ts)) : 0;
  const end = last > w.startedAt ? last : w.startedAt + 3600000;
  sheet(`<h3>Séance restée ouverte</h3>
    <p style="font-size:15px;line-height:1.5">Ta séance « ${esc(w.name)} » a commencé ${fmtDateL(w.startedAt)} et tourne depuis ${dur(Date.now() - w.startedAt)}. Tu as sans doute oublié de la terminer.</p>
    <div class="pk-foot" style="grid-template-columns:1fr"><button class="btn primary" data-act="stale-end" data-n="${end}">Terminer à ${new Date(end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</button></div>
    <div class="row" style="margin-top:8px"><button class="btn" data-act="closesheet">Continuer la séance</button><button class="btn" data-act="stale-del" style="color:#ff8a4c">Supprimer</button></div>`);
}

/* ---------- actions ---------- */
const defaultName = () => { const d = new Date(), h = d.getHours(); return cap(DAYS[d.getDay()]) + ' ' + (h < 12 ? 'matin' : h < 18 ? 'après-midi' : 'soir'); };

function makeEntries(exIds) {
  return exIds.map(id => { const p = prevFor(id); return { id: uid(), exId: id, sets: Array.from({ length: p ? p.sets.length : 3 }, newSet) }; });
}
async function startWorkout(exIds = [], name) {
  const w = { id: uid(), startedAt: Date.now(), endedAt: null, name: name || defaultName(), entries: [], review: null };
  S.workouts.push(w); S.active = w; w.entries = makeEntries(exIds);
  put('workouts', w); S.tab = 'train'; wake(); render(); schedulePush(true);
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
  S.active = null; rest = null; drawRest(); unwake(); render(); workoutDetail(w, true); schedulePush(true);
}
async function discardWorkout() {
  const w = S.active; clearTimeout(saveTimer); saveTimer = null;
  S.workouts = S.workouts.filter(x => x.id !== w.id); del('workouts', w.id);
  S.active = null; rest = null; drawRest(); unwake(); render(); schedulePush(true);
}
function toggleCheck(row) {
  const cw = W(); if (!cw) return;
  const e = cw.entries.find(x => x.id === row.dataset.e), i = +row.dataset.i, s = e.sets[i];
  if (!s.done) {
    const ph = placeholders(e, i);
    if (s.r == null && ph.r !== '') s.r = ph.r;
    if (s.w == null && ph.w !== '') s.w = ph.w;
    if (!(s.r > 0)) { row.classList.add('bad'); setTimeout(() => row.classList.remove('bad'), 400); return; }
    if (s.w == null) s.w = 0;
    const cur = e.sets.filter(x => x.done && x !== s && x.w > 0).map(x => setW(x));
    const ref = Math.max(exHistory(e.exId).reduce((a, h) => Math.max(a, Math.max(...h.sets.map(x => setW(x)))), 0), ...cur, 0);
    if (ref > 10 && s.w > ref * 1.5 && !confirm(`${fmt(s.w)} kg sur ${exName(e.exId)} ? Ton maximum enregistré est ${fmt(ref)} kg. Valider quand même ?`)) return;
    s.done = true; s.ts = Date.now(); if (s.type !== 'W' && !editing()) startRest(restFor(e.exId));
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
  const data = { app: 'lift', v: 2, exportedAt: Date.now(), exercises: S.exercises, workouts: S.workouts, routines: S.routines, body: S.body, facts: S.facts, cfg: Object.fromEntries(SYNCED.map(k => [k, cfg[k]])) };
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
    const body = (d.body || []).filter(m => m && m.id && m.ts).map(m => ({ ...m, fromAI: undefined })), facts = (d.facts || []).filter(f => f && f.id && f.text);
    if (body.length) await backend.saveMany(S.user.uid, 'body', body);
    if (facts.length) await backend.saveMany(S.user.uid, 'facts', facts);
    alert(`Import terminé : ${workouts.length} séance(s).`);
  } catch (e) { alert(e.message === 'nouser' ? 'Connecte-toi d’abord.' : 'Import impossible : fichier invalide ou erreur réseau.'); }
}

/* ---------- amis : pseudo unique, demandes, partage limité, séances reçues ---------- */
const HANDLE_RE = /^[A-Za-z0-9_.-]{3,20}$/;
const meUid = () => S.user && S.user.uid;
const otherUid = f => f.users.find(u => u !== meUid());
const friendsAccepted = () => S.friends.filter(f => f.status === 'accepted');
const friendName = (uid, f) => (S.shared[uid] && S.shared[uid].pseudo) || (f && f.names && f.names[uid]) || 'Ami';
const incomingReq = () => S.friends.filter(f => f.status === 'pending' && f.from !== meUid());
const outgoingReq = () => S.friends.filter(f => f.status === 'pending' && f.from === meUid());
const friendBadge = () => incomingReq().length + S.inbox.length;

function syncSharedWatchers() {
  const want = new Set(friendsAccepted().map(otherUid));
  for (const uid of Object.keys(S.sharedUnsubs)) if (!want.has(uid)) { try { S.sharedUnsubs[uid](); } catch (e) { } delete S.sharedUnsubs[uid]; delete S.shared[uid]; }
  for (const uid of want) if (!S.sharedUnsubs[uid]) S.sharedUnsubs[uid] = backend.watchShared(uid, d => { if (d) S.shared[uid] = d; else delete S.shared[uid]; renderSoft(); });
}
function applyFriends(list) {
  list.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  if (JSON.stringify(list) === JSON.stringify(S.friends)) return;
  S.friends = list; syncSharedWatchers(); renderSoft();
}
function applyInbox(list) {
  list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  if (JSON.stringify(list) === JSON.stringify(S.inbox)) return;
  S.inbox = list; renderSoft();
}

/* partage : copie réduite de mes données, lisible uniquement par mes amis acceptés (selon mes choix) */
function buildShared() {
  const fw = finished(), o = {
    uid: S.user.uid, pseudo: cfg.pseudo || cfg.handle, handle: cfg.handle, av: cfg.avatar || '', updatedAt: Date.now(),
    flags: { act: !!cfg.shAct, rec: !!cfg.shRec, rcd: !!cfg.shRcd, live: !!cfg.shLive, w: !!cfg.shW }
  };
  if (cfg.shAct) {
    const ms = mondayOf(Date.now());
    o.act = {
      sessions: fw.length, sets: fw.reduce((t, w) => t + wSets(w), 0), volume: Math.round(fw.reduce((t, w) => t + wVol(w), 0)),
      weeks: Array.from({ length: 12 }, (_, i) => {
        const a = addDays(ms, -7 * (11 - i)), ws = fw.filter(w => w.startedAt >= a && w.startedAt < addDays(a, 7));
        return { a, c: ws.length, sets: ws.reduce((t, w) => t + wSets(w), 0), dur: Math.round(ws.reduce((t, w) => t + (durOdd(w) ? 0 : (w.endedAt - w.startedAt) / 60000), 0)), vol: Math.round(ws.reduce((t, w) => t + wVol(w), 0)) };
      })
    };
  }
  if (cfg.shRec) {
    o.recent = fw.slice(-10).reverse().map(w => ({
      id: w.id, name: w.name, ts: w.startedAt, dur: durOdd(w) ? 0 : Math.round((w.endedAt - w.startedAt) / 60000), sets: wSets(w),
      entries: w.entries.map(e => {
        const ws = workSets(e), x = { exId: e.exId, nm: exName(e.exId), mu: ex(e.exId)?.muscle || '', n: ws.length };
        if (cfg.shW) x.s = ws.map(s => [loadAt(e.exId, s, w.startedAt), s.r]);
        return x;
      }).filter(x => x.n)
    }));
  }
  if (cfg.shRcd) {
    o.showcase = prSorted().map(p => ({ exId: p.exId, nm: exName(p.exId), mu: ex(p.exId)?.muscle || '', w: p.w, r: p.r, ts: p.ts }));
    const ids = [...new Set(fw.flatMap(w => w.entries.map(e => e.exId)))];
    o.records = ids.map(id => {
      const h = exHistory(id); if (!h.length) return null;
      const b = h.reduce((a, x) => x.best.e > a.best.e ? x : a, h[0]);
      return { exId: id, nm: exName(id), mu: ex(id)?.muscle || '', w: b.best.w, r: b.best.r, ts: b.t };
    }).filter(Boolean).sort((a, b) => b.ts - a.ts).slice(0, 30);
  }
  if (cfg.shLive && S.active) o.live = { since: S.active.startedAt, name: S.active.name };
  return o;
}
let pushTimer = null, lastPush = '';
function schedulePush(fast) {
  if (!S.user || !cfg.handle) return;
  clearTimeout(pushTimer); pushTimer = setTimeout(doPush, fast ? 300 : 4000);
}
async function doPush() {
  if (!S.user || !cfg.handle) return;
  const o = buildShared(), sig = JSON.stringify({ ...o, updatedAt: 0 });
  if (sig === lastPush) return;
  lastPush = sig;
  try { await backend.saveShared(S.user.uid, o); } catch (e) { lastPush = ''; }
}

/* pseudo */
function openHandleSheet() {
  sheet(`<h3>${cfg.handle ? 'Changer de pseudo' : 'Choisis ton pseudo'}</h3>
    <p class="muted" style="margin:-6px 0 12px;font-size:14px">C'est le nom sous lequel tes amis te trouvent (3 à 20 caractères : lettres, chiffres, point, tiret, tiret bas). Il est unique : deux personnes ne peuvent pas avoir le même.</p>
    <input id="hd-in" class="field" maxlength="20" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="ex. evan.b" value="${esc(cfg.pseudo || '')}">
    <div id="hd-msg" class="err"></div>
    <div class="pk-foot"><button class="btn ghost" data-act="closesheet">Annuler</button><button class="btn primary" data-act="handle-save">Réserver</button></div>`);
}
async function claimHandleAction() {
  const v = ($('#hd-in').value || '').trim(), msg = $('#hd-msg');
  if (!HANDLE_RE.test(v)) { msg.textContent = 'Pseudo invalide : 3 à 20 caractères (lettres, chiffres, . - _).'; return; }
  if (v.toLowerCase() === cfg.handle) { cfg.pseudo = v; saveCfg(); schedulePush(true); closeSheet(); render(); return; }
  if (!navigator.onLine) { msg.textContent = 'Connexion requise.'; return; }
  try {
    await backend.claimHandle(S.user.uid, v.toLowerCase(), v, cfg.handle);
    cfg.handle = v.toLowerCase(); cfg.pseudo = v; saveCfg(); schedulePush(true); closeSheet(); render();
  } catch (e) { msg.textContent = 'Ce pseudo est déjà pris (ou la connexion a échoué). Essaie-en un autre.'; }
}

/* réglages de partage */
function openShareSettings() {
  if (!cfg.shAsked) { cfg.shAsked = true; saveCfg(); }
  const row = (k, t, d) => `<label class="shrow"><input type="checkbox" data-cfg="${k}" ${cfg[k] ? 'checked' : ''}><span><b>${t}</b><br><small class="note">${d}</small></span></label>`;
  sheet(`<h3>Ce que je partage</h3>
    <p class="muted" style="margin:-6px 0 10px;font-size:14px">Visible uniquement par tes amis acceptés. Tout est désactivé tant que tu ne coches pas. Tes commentaires, ta composition corporelle, le chat, la mémoire du coach et ta clé ne sont jamais partagés.</p>
    ${row('shAct', 'Activité', 'Nombre de séances, de séries, volume total et graphique par semaine.')}
    ${row('shRec', 'Dernières séances', 'Nom, date, durée et exercices de tes 10 dernières séances.')}
    ${row('shW', '… avec mes charges', 'Ajoute les séries (kg × reps) aux dernières séances.')}
    ${row('shRcd', 'Records', 'Ta meilleure série sur chaque exercice.')}
    ${row('shLive', 'Statut ON AIR', 'Ils voient quand tu es en séance.')}
    <div class="pk-foot"><button class="btn primary" data-act="closesheet" style="grid-column:1/-1">Terminé</button></div>`);
}

/* actions amis */
async function searchFriends(q) {
  const v = q.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  if (v.length < 2) { S.fr.results = []; S.fr.msg = ''; drawFrResults(); return; }
  S.fr.busy = true; S.fr.msg = ''; drawFrResults();
  try { S.fr.results = (await backend.searchHandles(v)).filter(r => r.uid !== meUid()); S.fr.msg = S.fr.results.length ? '' : 'Aucun pseudo trouvé.'; }
  catch (e) { S.fr.results = []; S.fr.msg = 'Recherche impossible (connexion ?).'; }
  S.fr.busy = false; drawFrResults();
}
function drawFrResults() { const b = $('#fr-res'); if (b) b.innerHTML = frResultsHtml(); }
function frResultsHtml() {
  if (S.fr.busy) return '<div class="loading"><i></i>Recherche…</div>';
  const rows = S.fr.results.map(r => {
    const f = S.friends.find(x => x.users.includes(r.uid));
    const act = !f ? `<button class="btn sm primary" data-act="fr-add" data-id="${r.uid}" data-p="${esc(r.pseudo)}">Ajouter</button>`
      : f.status === 'accepted' ? '<span class="muted">Ami</span>' : f.from === meUid() ? '<span class="muted">Demande envoyée</span>' : `<button class="btn sm primary" data-act="fr-accept" data-id="${r.uid}">Accepter</button>`;
    return `<div class="frow"><div class="avatar sm">${esc(r.pseudo.charAt(0).toUpperCase())}</div><b>${esc(r.pseudo)}</b>${act}</div>`;
  }).join('');
  return rows || (S.fr.msg ? `<p class="empty">${esc(S.fr.msg)}</p>` : '');
}
async function addFriend(uid, pseudo) {
  const inc = S.friends.find(f => f.users.includes(uid) && f.status === 'pending' && f.from === uid);
  try {
    if (inc) await backend.acceptFriend(meUid(), uid); else await backend.requestFriend(meUid(), uid, { [meUid()]: cfg.pseudo || cfg.handle, [uid]: pseudo });
    S.fr.results = []; S.fr.q = ''; render(); if (!cfg.shAsked) openShareSettings();
  } catch (e) { alert('Impossible d’envoyer la demande (déjà en attente, ou connexion).'); }
}

/* pages */
const avatarImg = (n, src, cls = '') => `<div class="avatar ${cls}">${src ? `<img src="${esc(src)}" alt="">` : esc((n || '?').charAt(0).toUpperCase())}</div>`;
// Avatar d'un ami : sa photo si elle est partagée, sinon son initiale.
const avatar = (n, cls = '', uid = '') => avatarImg(n, uid && S.shared[uid] ? S.shared[uid].av : '', cls);
function viewFriends() {
  if (!cfg.handle) return `<section class="card"><p class="muted" style="margin:0 0 12px">Pour trouver tes amis et être trouvé, choisis d'abord un pseudo unique.</p><button class="btn primary" data-act="handle-open">Choisir mon pseudo</button></section>`;
  const inc = incomingReq(), out = outgoingReq(), fr = friendsAccepted();
  return `<div class="muted" style="margin:-4px 0 10px;font-size:14px">Ton pseudo : <b>${esc(cfg.pseudo || cfg.handle)}</b> · <button class="linkbtn" data-act="handle-open">changer</button></div>
    <section class="card"><input id="fr-q" class="field" placeholder="Rechercher un pseudo" autocapitalize="off" autocomplete="off" spellcheck="false" value="${esc(S.fr.q)}" style="margin-bottom:6px"><div id="fr-res">${frResultsHtml()}</div></section>
    ${inc.length ? `<div class="lbl sec">Demandes reçues</div>${inc.map(f => { const u = otherUid(f); return `<div class="card frow">${avatar(friendName(u, f), 'sm')}<b>${esc(friendName(u, f))}</b><button class="btn sm primary" data-act="fr-accept" data-id="${u}">Accepter</button><button class="btn sm" data-act="fr-remove" data-id="${u}" data-c="0">Refuser</button></div>`; }).join('')}` : ''}
    ${S.inbox.length ? `<div class="lbl sec">Séances reçues (${S.inbox.length})</div>${S.inbox.map(m => `<button class="card bm" data-act="inbox-open" data-id="${m.id}"><b>${esc(m.name)}</b><span class="muted">de ${esc(m.fromPseudo || 'un ami')} · ${m.exercises.length} exercice${m.exercises.length > 1 ? 's' : ''} · ${fmtDate(m.ts)}</span></button>`).join('')}` : ''}
    <div class="lbl sec">Mes amis (${fr.length})</div>
    ${fr.map(f => { const u = otherUid(f), sh = S.shared[u], live = sh && sh.live; return `<button class="card frow" data-act="friend-open" data-id="${u}">${avatar(friendName(u, f), 'sm', u)}<span class="fn"><b>${esc(friendName(u, f))}</b>${live ? `<small class="onair">● ON AIR · ${esc(live.name || '')}</small>` : ''}</span><span class="muted">›</span></button>`; }).join('') || '<p class="empty">Aucun ami pour l’instant. Cherche un pseudo ci-dessus.</p>'}
    ${out.length ? `<div class="lbl sec">Demandes envoyées</div>${out.map(f => { const u = otherUid(f); return `<div class="card frow">${avatar(friendName(u, f), 'sm')}<b>${esc(friendName(u, f))}</b><button class="btn sm" data-act="fr-remove" data-id="${u}" data-c="0">Annuler</button></div>`; }).join('')}` : ''}
    <button class="btn" style="margin-top:14px" data-act="share-open">Ce que je partage</button>`;
}
function viewFriend() {
  const uid = S.friend, f = S.friends.find(x => x.users.includes(uid) && x.status === 'accepted');
  if (!f) { S.sub = ''; return viewFriends(); }
  const d = S.shared[uid], name = friendName(uid, f);
  let body = '';
  if (!d) body = '<p class="empty">Chargement…</p>';
  else {
    const fl = d.flags || {};
    if (d.live) body += `<div class="card hint"><span class="onair">● ON AIR</span><span>${esc(d.live.name || 'Séance')} · commencée à ${new Date(d.live.since).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></div>`;
    if (!fl.act && !fl.rec && !fl.rcd) body += `<p class="empty">${esc(name)} n’a encore rien partagé.</p>`;
    if (d.act) {
      const vals = d.act.weeks.map(w => S.pm === 'vol' ? w.vol : S.pm === 'sets' ? w.sets : w.dur / 60), cur = vals[vals.length - 1], unit = S.pm === 'vol' ? 'kg' : S.pm === 'sets' ? 'séries' : 'h';
      body += `<div class="stats pstats"><div class="stat"><b>${d.act.sessions}</b><span>Séances</span></div><div class="stat"><b>${d.act.sets.toLocaleString('fr-FR')}</b><span>Séries</span></div><div class="stat"><b>${d.act.volume >= 1000 ? fmt(Math.round(d.act.volume / 100) / 10) + ' t' : d.act.volume + ' kg'}</b><span>Volume</span></div></div>
        <div class="lbl sec"><b style="color:var(--text);font-size:16px;letter-spacing:0;text-transform:none">${S.pm === 'dur' ? fmt(Math.round(cur * 10) / 10) : Math.round(cur).toLocaleString('fr-FR')} ${unit}</b> cette semaine</div>
        <section class="card">${barChart(vals, d.act.weeks.map(w => fmtDate(w.a)))}<div class="chips" style="margin:6px 0 0">${[['dur', 'Durée'], ['vol', 'Volume'], ['sets', 'Séries']].map(([k, l]) => `<button class="chip ${S.pm === k ? 'on' : ''}" data-act="pmetric" data-k="${k}">${l}</button>`).join('')}</div></section>`;
    }
    if (d.recent) body += `<div class="lbl sec">Dernières séances</div>${d.recent.map(w => `<button class="card bm" data-act="fworkout" data-id="${w.id}"><b>${esc(w.name)}</b><span class="muted">${fmtDate(w.ts)} · ${w.dur} min · ${w.sets} séries · ${w.entries.length} exercice${w.entries.length > 1 ? 's' : ''}</span></button>`).join('') || '<p class="empty">Aucune séance.</p>'}`;
    if (d.showcase && d.showcase.length) body += `<div class="lbl sec">Ses records</div>${d.showcase.map(r => `<div class="card prc"><div class="prc-t"><b>${esc(r.nm)}</b><small>${esc(r.mu)}${r.ts ? ' · ' + fmtDate(r.ts) : ''}</small></div><div class="prc-v"><b>${r.w > 0 ? fmt(r.w) + ' kg' : 'PDC'}</b><span>× ${r.r}</span></div></div>`).join('')}`;
    if (d.records) body += `<div class="lbl sec">Meilleures perfs</div>${d.records.map(r => `<div class="card prow"><div class="meta"><b>${esc(r.nm)}</b><small>${esc(r.mu)} · ${fmtDate(r.ts)}</small></div><div class="val">${fmt(r.w)} × ${r.r}</div></div>`).join('') || '<p class="empty">Aucun record.</p>'}`;
  }
  return subPage(esc(name), `<div class="phead">${avatar(name, '', uid)}<div class="pinfo"><b>${esc(name)}</b><small class="muted" style="font-weight:500;letter-spacing:.06em">@${esc((d && d.handle) || '')}</small></div></div>${body}
    <button class="btn" style="margin-top:16px" data-act="send-open" data-id="">Envoyer une de mes séances</button>
    <button class="btn danger-text" data-act="fr-remove" data-id="${uid}" data-c="1">Retirer cet ami</button>`, '', 'Amis');
}
function friendWorkoutSheet(uid, wid) {
  const d = S.shared[uid], w = d && d.recent && d.recent.find(x => x.id === wid); if (!w) return;
  sheet(`<h3>${esc(w.name)}</h3><div class="muted" style="margin:-8px 0 10px;font-size:14px">${esc(friendName(uid))} · ${fmtDateL(w.ts)} · ${w.dur} min</div>
    ${w.entries.map(e => `<div style="margin:10px 0"><b>${esc(e.nm)}</b> <small class="muted">${esc(e.mu)}</small><div class="chips2">${e.s ? e.s.map(s => `<span class="sc">${fmt(s[0])}×${s[1]}</span>`).join('') : `<span class="sc">${e.n} série${e.n > 1 ? 's' : ''}</span>`}</div></div>`).join('')}
    <div class="row" style="margin-top:14px"><button class="btn primary" data-act="fw-routine" data-u="${uid}" data-id="${wid}">Essayer : enregistrer en routine</button></div>`);
}
function ensureExercises(list) {
  let added = false;
  for (const e of list) if (!ex(e.exId) && e.nm) { const c = { id: e.exId, name: e.nm, muscle: MUSCLES.includes(e.mu) ? e.mu : 'Dos', custom: true }; S.custom.push(c); put('exercises', c); added = true; }
  if (added) rebuildEx();
}
function saveRoutineFrom(name, entries) {
  ensureExercises(entries);
  const ids = entries.map(e => e.exId).filter(ex);
  if (!ids.length) { alert('Aucun exercice reconnu.'); return false; }
  const r = { id: uid(), name: String(name).slice(0, 40), exIds: ids, createdAt: Date.now() };
  S.routines.push(r); put('routines', r); return true;
}
function inboxSheet(id) {
  const m = S.inbox.find(x => x.id === id); if (!m) return;
  sheet(`<h3>${esc(m.name)}</h3><div class="muted" style="margin:-8px 0 10px;font-size:14px">de ${esc(m.fromPseudo || 'un ami')} · ${fmtDateL(m.ts)}</div>
    ${m.message ? `<div class="review" style="margin-top:0">💬 ${esc(m.message)}</div>` : ''}
    ${m.exercises.map(e => `<div style="margin:10px 0"><b>${esc(e.nm || exName(e.exId))}</b> <small class="muted">${esc(e.mu || '')}</small><div class="chips2"><span class="sc">${e.n || '?'} série${e.n > 1 ? 's' : ''}${e.r ? ' × ' + esc(String(e.r)) : ''}${m.withWeights && e.w != null ? ' · ' + fmt(e.w) + ' kg' : ''}</span></div></div>`).join('')}
    <div class="row" style="margin-top:14px"><button class="btn primary" data-act="inbox-save" data-id="${m.id}">Enregistrer en routine</button><button class="btn" data-act="inbox-del" data-id="${m.id}" style="color:#ff8a4c">Supprimer</button></div>`);
}
function openSendSheet(wid) {
  const fr = friendsAccepted(), list = S.workouts.filter(w => w.endedAt).sort((a, b) => b.startedAt - a.startedAt).slice(0, 10);
  if (!fr.length) { alert('Ajoute d’abord un ami (Profil → Amis).'); return; }
  if (!list.length) { alert('Termine d’abord une séance.'); return; }
  sheet(`<h3>Envoyer une séance</h3>
    <label class="l" style="margin-top:0">À</label><select id="sd-to" class="field">${fr.map(f => { const u = otherUid(f); return `<option value="${u}" ${u === S.friend ? 'selected' : ''}>${esc(friendName(u, f))}</option>`; }).join('')}</select>
    <label class="l">Séance</label><select id="sd-w" class="field">${list.map(w => `<option value="${w.id}" ${w.id === (wid || list[0].id) ? 'selected' : ''}>${esc(w.name)} · ${fmtDate(w.startedAt)}</option>`).join('')}</select>
    <label class="l">Message (optionnel)</label><input id="sd-msg" class="field" maxlength="140" placeholder="Fais-la, elle est top !" autocomplete="off">
    <label class="shrow"><input type="checkbox" id="sd-w2"><span><b>Inclure mes charges</b><br><small class="note">Par défaut seuls les exercices, séries et répétitions sont envoyés.</small></span></label>
    <div id="sd-err" class="err"></div>
    <div class="pk-foot"><button class="btn ghost" data-act="closesheet">Annuler</button><button class="btn primary" data-act="send-go">Envoyer</button></div>`);
}
async function sendSession() {
  const to = $('#sd-to').value, w = S.workouts.find(x => x.id === $('#sd-w').value), withW = $('#sd-w2').checked, err = $('#sd-err');
  if (!w || !to) return;
  const ex2 = w.entries.map(e => {
    const ws = workSets(e); if (!ws.length) return null; const b = best(ws, e.exId, w.startedAt);
    const o = { exId: e.exId, nm: exName(e.exId), mu: ex(e.exId)?.muscle || '', n: ws.length, r: ws.map(s => s.r).sort((a, c) => a - c).filter((v, i, a) => i === 0 || i === a.length - 1).join('-') };
    if (withW) o.w = b.w;
    return o;
  }).filter(Boolean);
  if (!ex2.length) { err.textContent = 'Cette séance ne contient aucune série validée.'; return; }
  const msg = { id: uid(), from: meUid(), fromPseudo: cfg.pseudo || cfg.handle, name: w.name.slice(0, 60), exercises: ex2, withWeights: withW, ts: Date.now() };
  const m = ($('#sd-msg').value || '').trim().slice(0, 140); if (m) msg.message = m;
  try { await backend.sendInbox(to, msg); closeSheet(); alert('Séance envoyée.'); }
  catch (e) { err.textContent = 'Envoi impossible : cet ami doit t’avoir accepté, et tu dois être connecté.'; }
}


/* ---------- records "vitrine" (choisis par l'utilisateur) ---------- */
const prOrder = (a, b) => (MUSCLES.indexOf(ex(a.exId)?.muscle) - MUSCLES.indexOf(ex(b.exId)?.muscle)) || (b.w || 0) - (a.w || 0);
const prSorted = () => [...S.prs].sort(prOrder);
function applyPrs(list) { if (JSON.stringify(list) === JSON.stringify(S.prs)) return; S.prs = list; renderSoft(); schedulePush(); }

// meilleures performances calculées depuis l'historique, pour proposer en un tap
function computedBests() {
  const ids = [...new Set(finished().flatMap(w => w.entries.map(e => e.exId)))];
  return ids.map(id => {
    const h = exHistory(id); if (!h.length) return null;
    const b = h.reduce((a, x) => x.best.e > a.best.e ? x : a, h[0]);
    return { exId: id, w: b.best.w, r: b.best.r, ts: b.t, e: b.best.e };
  }).filter(Boolean).sort((a, b) => b.e - a.e);
}
const prCard = p => `<button class="card prc" data-act="pr-open" data-id="${p.id}">
  <div class="prc-i">${thumb(ex(p.exId)) || ''}</div>
  <div class="prc-t"><b>${esc(exName(p.exId))}</b><small>${esc(ex(p.exId)?.muscle || '')}${p.ts ? ' · ' + fmtDate(p.ts) : ''}</small></div>
  <div class="prc-v"><b>${p.w > 0 ? fmt(p.w) + ' kg' : 'PDC'}</b><span>× ${p.r}</span></div></button>`;

function viewRecords() {
  const list = prSorted(), have = new Set(S.prs.map(p => p.exId));
  const sug = computedBests().filter(b => !have.has(b.exId)).slice(0, 6);
  return subPage('Records', `<p class="muted" style="margin:-4px 0 12px;font-size:14px">Tes meilleures perfs, choisies par toi. Elles s’affichent sur ton profil et, si tu partages tes records, chez tes amis.</p>
    ${list.map(prCard).join('') || '<p class="empty">Aucun record pour l’instant.</p>'}
    <button class="btn primary" style="margin-top:12px" data-act="pr-add">+ Ajouter un record</button>
    ${sug.length ? `<div class="lbl sec">D’après tes séances</div>${sug.map(b => `<div class="card frow"><span class="fn"><b>${esc(exName(b.exId))}</b><small class="muted">${fmt(b.w)} kg × ${b.r} · ${fmtDate(b.ts)}</small></span><button class="btn sm" data-act="pr-quick" data-id="${b.exId}">Ajouter</button></div>`).join('')}` : ''}`);
}
function prForm(p) {
  const nw = !p.id;
  sheet(`<h3>${nw ? 'Nouveau record' : esc(exName(p.exId))}</h3>
    ${nw ? `<div class="muted" style="margin:-8px 0 10px;font-size:14px">${esc(exName(p.exId))}</div>` : ''}
    <div class="row"><div><label class="l">Charge (kg)</label><input id="pr-w" class="field" inputmode="decimal" placeholder="0 = poids du corps" value="${p.w != null ? fmtIn(p.w) : ''}"></div>
    <div><label class="l">Répétitions</label><input id="pr-r" class="field" inputmode="numeric" value="${p.r || ''}"></div></div>
    <label class="l">Date</label><input id="pr-d" class="field" type="date" value="${new Date(p.ts || Date.now()).toISOString().slice(0, 10)}">
    <div id="pr-err" class="err"></div>
    <div class="pk-foot">${nw ? '<button class="btn ghost" data-act="closesheet">Annuler</button>' : `<button class="btn ghost" data-act="pr-del" data-id="${p.id}" style="color:#ff8a4c">Supprimer</button>`}
    <button class="btn primary" data-act="pr-save" data-id="${p.id || ''}" data-ex="${p.exId}">Enregistrer</button></div>`);
}
function savePr(id, exId) {
  const w = num($('#pr-w').value), r = Math.round(num($('#pr-r').value) || 0), d = $('#pr-d').value;
  if (!(r > 0)) { $('#pr-err').textContent = 'Indique au moins le nombre de répétitions.'; return; }
  if (w == null || w < 0 || w > 1000) { $('#pr-err').textContent = 'Charge invalide (0 pour le poids du corps).'; return; }
  const ts = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T12:00:00').getTime() : Date.now();
  const old = S.prs.find(x => x.id === id);
  const p = { id: id || uid(), exId, w, r, ts, createdAt: old ? old.createdAt : Date.now() };
  if (old) Object.assign(old, p); else S.prs.push(p);
  put('prs', p); closeSheet(); render(); schedulePush(true);
}
function delPr(id) {
  S.prs = S.prs.filter(x => x.id !== id); del('prs', id); closeSheet(); render(); schedulePush(true);
}

/* ---------- calendrier (année / mois / semaine) ---------- */
const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
function daysMap() {
  const m = {};
  for (const w of finished()) (m[dayKey(w.startedAt)] ||= []).push(w);
  return m;
}
function streakWeeks() {
  const set = new Set(finished().map(w => mondayOf(w.startedAt)));
  let n = 0, cur = mondayOf(Date.now());
  if (!set.has(cur)) cur = addDays(cur, -7); // la semaine en cours ne casse pas la série
  while (set.has(cur)) { n++; cur = addDays(cur, -7); }
  return n;
}
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
function monthCells(y, mo, map, mini) {
  const first = new Date(y, mo, 1), pad = (first.getDay() + 6) % 7, n = new Date(y, mo + 1, 0).getDate(), today = dayKey(Date.now());
  let h = '';
  for (let i = 0; i < pad; i++) h += '<i class="cal-c pad"></i>';
  for (let d = 1; d <= n; d++) {
    const k = y + '-' + (mo + 1) + '-' + d, on = !!map[k], ts = new Date(y, mo, d, 12).getTime();
    h += `<${on && !mini ? 'button' : 'i'} class="cal-c ${on ? 'on' : ''} ${k === today ? 'today' : ''}"${on && !mini ? ` data-act="cal-day" data-d="${ts}"` : ''}>${mini ? '' : d}</${on && !mini ? 'button' : 'i'}>`;
  }
  return h;
}
function viewCalendar() {
  const c = S.cal, map = daysMap(), d = new Date(c.ref), y = d.getFullYear(), mo = d.getMonth();
  const chips = `<div class="chips" style="margin-bottom:12px">${[['y', 'Année'], ['m', 'Mois'], ['w', 'Semaine']].map(([k, l]) => `<button class="chip ${c.z === k ? 'on' : ''}" data-act="cal-z" data-k="${k}">${l}</button>`).join('')}</div>`;
  const nav = title => `<div class="cal-nav"><button class="x" data-act="cal-mv" data-n="-1" aria-label="Précédent">‹</button><b>${title}</b><button class="x" data-act="cal-mv" data-n="1" aria-label="Suivant">›</button></div>`;
  let body = '', count = 0;
  if (c.z === 'y') {
    count = finished().filter(w => new Date(w.startedAt).getFullYear() === y).length;
    body = nav(y) + `<div class="cal-year">${MONTHS.map((nm, i) => `<div class="cal-mini"><b>${cap(nm).slice(0, 4)}</b><div class="cal-grid mini">${monthCells(y, i, map, true)}</div></div>`).join('')}</div>`;
  } else if (c.z === 'm') {
    count = finished().filter(w => { const x = new Date(w.startedAt); return x.getFullYear() === y && x.getMonth() === mo; }).length;
    body = nav(cap(MONTHS[mo]) + ' ' + y) + `<div class="cal-dow">${DOW.map(x => `<i>${x}</i>`).join('')}</div><div class="cal-grid">${monthCells(y, mo, map, false)}</div>`;
  } else {
    const ms = mondayOf(c.ref), days = Array.from({ length: 7 }, (_, i) => addDays(ms, i));
    count = days.filter(t => map[dayKey(t)]).length;
    body = nav('Semaine du ' + fmtDate(ms)) + days.map(t => {
      const ws = map[dayKey(t)] || [], dn = cap(new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }));
      return `<div class="cal-day ${ws.length ? 'on' : ''}"><div class="cal-dn">${dn}</div>${ws.length ? ws.map(w => `<button class="card bm" data-act="openw" data-id="${w.id}" style="margin:6px 0 0"><b>${esc(w.name)}</b><span class="muted">${dur(w.endedAt - w.startedAt)} · ${wSets(w)} séries · ${Math.round(wVol(w)).toLocaleString('fr-FR')} kg</span></button>`).join('') : '<span class="muted" style="font-size:14px">Repos</span>'}</div>`;
    }).join('');
  }
  const st = streakWeeks();
  return `${chips}
    <div class="stats pstats"><div class="stat"><b>${count}</b><span>${c.z === 'y' ? 'Cette année' : c.z === 'm' ? 'Ce mois' : 'Cette semaine'}</span></div>
    <div class="stat"><b>${st}</b><span>Semaine${st > 1 ? 's' : ''} d’affilée</span></div>
    <div class="stat"><b>${finished().length}</b><span>Au total</span></div></div>
    <section class="card">${body}</section>
    <p class="muted" style="font-size:13px">Rouge : jour avec une séance. Touche un jour pour l’ouvrir.</p>`;
}

/* ---------- suggestion de charge (double progression, calcul local) ---------- */
const REP_RANGE = { force: [3, 6], hypertrophie: [6, 12], seche: [8, 15], forme: [8, 12] };
const stepFor = w => w < 10 ? 0.5 : w < 20 ? 1 : 2.5;
function suggest(exId) {
  const t = W(); const h = exHistory(exId, t ? t.startedAt : Infinity);
  if (!h.length) return null;
  const last = h[h.length - 1], sets = last.sets; if (!sets.length) return null;
  const [lo, hi] = REP_RANGE[cfg.goal] || REP_RANGE.hypertrophie;
  const w0 = setW(sets[0]), r0 = sets[0].r, rir = sets[0].rir;
  const stale = Date.now() - last.t > 70 * 86400000; // longue pause : on ne pousse pas
  const allTop = sets.every(s => s.r >= hi);
  if (stale) return { w: w0, r: Math.max(lo, Math.min(r0, hi)), why: 'reprise après une pause : refais la même chose' };
  if (rir != null && rir >= 3 && w0 > 0) return { w: Math.round((w0 + stepFor(w0)) * 100) / 100, r: Math.max(lo, Math.min(r0, hi)), why: `il te restait ${rir} reps en réserve : monte la charge` };
  if (rir === 0 && r0 < hi) return { w: w0, r: r0, why: 'série menée à l’échec : referme-la proprement avant de pousser' };
  if (allTop && w0 > 0) return { w: Math.round((w0 + stepFor(w0)) * 100) / 100, r: lo, why: `${hi} reps atteintes partout : monte la charge` };
  if (r0 >= hi) return { w: w0, r: hi, why: 'tiens ce niveau sur toutes les séries' };
  return { w: w0, r: Math.min(r0 + 1, hi), why: 'ajoute une répétition' };
}
function suggHtml(e) {
  const s = suggest(e.exId); if (!s) return '';
  return `<button class="sugg" data-act="sugg-apply" data-e="${e.id}" title="${esc(s.why)}">
    <span class="sg-l">Objectif</span><b>${s.w > 0 ? fmt(s.w) + ' kg' : 'PDC'} × ${s.r}</b><small>${esc(s.why)} · touche pour remplir</small>${stagFor(e.exId) ? '<small class="plat">plateau : 3 séances sans record</small>' : ''}</button>`;
}
function applySugg(eId) {
  const e = S.active.entries.find(x => x.id === eId), s = e && suggest(e.exId); if (!s) return;
  for (const st of e.sets) if (!st.done && st.type !== 'W') { st.w = s.w > 0 ? s.w : null; st.r = s.r; }
  persist(); render();
}


/* ---------- événements ---------- */
document.addEventListener('click', async ev => {
  const t = ev.target.closest('[data-act]'); if (!t) return;
  unlockAudio();
  const a = t.dataset.act, id = t.dataset.id, entry = () => W().entries.find(x => x.id === t.closest('.entry').dataset.e);
  switch (a) {
    case 'tab': S.tab = t.dataset.t; S.sub = ''; closeSheet(); render(); window.scrollTo(0, 0); if (S.tab === 'coach' && S.cz !== 'an') scrollEnd(); break;
    case 'sub': S.sub = t.dataset.s || ''; closeSheet(); render(); window.scrollTo(0, 0); break;
    case 'pr-add': openPicker(ids => prForm({ exId: ids[0] })); break;
    case 'pr-quick': { const b = computedBests().find(x => x.exId === id); if (b) prForm({ exId: b.exId, w: b.w, r: b.r, ts: b.ts }); break; }
    case 'pr-open': { const p = S.prs.find(x => x.id === id); if (p) prForm(p); break; }
    case 'pr-save': savePr(id, t.dataset.ex); break;
    case 'pr-del': if (confirm('Supprimer ce record ?')) delPr(id); break;
    case 'cal-z': S.cal.z = t.dataset.k; S.cal.ref = Date.now(); render(); break;
    case 'cal-mv': { const n = +t.dataset.n, d = new Date(S.cal.ref); if (S.cal.z === 'y') d.setFullYear(d.getFullYear() + n); else if (S.cal.z === 'm') d.setMonth(d.getMonth() + n, 1); else d.setDate(d.getDate() + 7 * n); S.cal.ref = d.getTime(); render(); break; }
    case 'cal-day': { const k = dayKey(+t.dataset.d), w = finished().filter(x => dayKey(x.startedAt) === k); if (w.length) workoutDetail(w[0]); break; }
    case 'sugg-apply': applySugg(t.dataset.e); break;
    case 'handle-open': openHandleSheet(); break;
    case 'handle-save': claimHandleAction(); break;
    case 'share-open': openShareSettings(); break;
    case 'fr-add': addFriend(id, t.dataset.p); break;
    case 'fr-accept': try { await backend.acceptFriend(meUid(), id); if (!cfg.shAsked) openShareSettings(); } catch (e) { alert('Impossible d’accepter (connexion ?).'); } break;
    case 'fr-remove': if (t.dataset.c !== '1' || confirm('Retirer cet ami ? Il ne verra plus tes données.')) { try { await backend.removeFriendship(meUid(), id); if (S.friend === id) { S.friend = ''; S.sub = ''; } } catch (e) { alert('Action impossible (connexion ?).'); } } break;
    case 'friend-open': S.friend = id; S.sub = 'friend'; render(); window.scrollTo(0, 0); break;
    case 'fworkout': friendWorkoutSheet(S.friend, id); break;
    case 'fw-routine': { const d = S.shared[t.dataset.u], w = d && d.recent && d.recent.find(x => x.id === id); if (w && saveRoutineFrom(w.name, w.entries)) { closeSheet(); alert('Routine enregistrée. Retrouve-la dans l’onglet Séance.'); } break; }
    case 'send-open': openSendSheet(id || ''); break;
    case 'send-go': sendSession(); break;
    case 'inbox-open': inboxSheet(id); break;
    case 'inbox-save': { const m = S.inbox.find(x => x.id === id); if (m && saveRoutineFrom(m.name, m.exercises)) { del('inbox', id); S.inbox = S.inbox.filter(x => x.id !== id); closeSheet(); render(); alert('Routine enregistrée.'); } break; }
    case 'inbox-del': del('inbox', id); S.inbox = S.inbox.filter(x => x.id !== id); closeSheet(); render(); break;
    case 'undo': doUndo(); break;
    case 'tipw': cfg.tipW = true; saveCfg(); render(); break;
    case 'pastopen': openPastSheet(); break;
    case 'pastgo': createPast(); break;
    case 'routedit': routineSheet(id); break;
    case 'ro-up': routineMove(id, +t.dataset.i, -1); break;
    case 'ro-dn': routineMove(id, +t.dataset.i, 1); break;
    case 'ro-rm': { const r = S.routines.find(x => x.id === id); if (r) { keepRoutineName(r); r.exIds.splice(+t.dataset.i, 1); put('routines', r); routineSheet(id); } break; }
    case 'ro-add': { const r0 = S.routines.find(x => x.id === id); if (r0) keepRoutineName(r0); } openPicker(ids => { const r = S.routines.find(x => x.id === id); if (r) { r.exIds.push(...ids); put('routines', r); routineSheet(id); } }); break;
    case 'ro-save': { const r = S.routines.find(x => x.id === id); if (r) { keepRoutineName(r); put('routines', r); } closeSheet(); render(); break; }
    case 'ro-del': { const r = S.routines.find(x => x.id === id); if (!r) break; const copy = JSON.parse(JSON.stringify(r)); S.routines = S.routines.filter(x => x.id !== id); del('routines', id); closeSheet(); render(); undoable('Routine supprimée.', () => { S.routines.push(copy); put('routines', copy); render(); }); break; }
    case 'stale-end': { const w = S.active; if (w) { w.endedAt = +t.dataset.n; put('workouts', w); S.active = null; rest = null; drawRest(); unwake(); } closeSheet(); render(); break; }
    case 'stale-del': if (confirm('Supprimer cette séance ?')) { discardWorkout(); closeSheet(); } break;
    case 'pmetric': S.pm = t.dataset.k; render(); break;
    case 'exbrowse': openExBrowse(); break;
    case 'exopen': if (exHistory(id).length) exDetail(id); else exView(id); break;
    case 'chat-send': sendChat(); break;
    case 'chat-ex': sendChat(t.dataset.q); break;
    case 'chat-attach': if (!warnImages()) break; pickFile(false, async f => { try { S.chatImg = await resizeImage(f[0]); } catch (e) { S.chatErr = e.message; } render(); }); break;
    case 'chat-rmimg': S.chatImg = null; render(); break;
    case 'chat-clear': if (confirm('Effacer toute la conversation ? (La mémoire du coach est conservée.)')) { S.chat.forEach(m => del('chat', m.id)); S.chat = []; S.memoSug = []; render(); } break;
    case 'memo-open': openMemory(); break;
    case 'memo-add': { const v = ($('#mem-new').value || '').trim().slice(0, 200); if (v) { const f = { id: uid(), text: v, ts: Date.now() }; S.facts.push(f); put('facts', f); } openMemory(); break; }
    case 'memo-del': S.facts = S.facts.filter(f => f.id !== id); del('facts', id); openMemory(); break;
    case 'memo-yes': { const m = S.memoSug[+t.dataset.i]; if (m) { const f = { id: uid(), text: m, ts: Date.now() }; S.facts.push(f); put('facts', f); S.memoSug.splice(+t.dataset.i, 1); render(); } break; }
    case 'memo-no': S.memoSug.splice(+t.dataset.i, 1); render(); break;
    case 'body-import': if (!warnImages()) break; pickFile(true, importBody); break;
    case 'body-new': bodyForm({}); break;
    case 'body-open': { const m = S.body.find(x => x.id === id); if (m) bodyForm(m); break; }
    case 'body-save': saveBodyForm(id || ''); break;
    case 'body-del': if (confirm('Supprimer cette mesure ?')) { S.body = S.body.filter(x => x.id !== id); del('body', id); closeSheet(); render(); } break;
    case 'body-metric': S.bodyMetric = t.dataset.k; render(); break;
    case 'body-analyze': analyzeBody(); break;
    case 'hint': try { localStorage.setItem('lift.hint', '1'); } catch (e) { } render(); break;
    case 'start': startWorkout(); break;
    case 'startroutine': { const r = S.routines.find(x => x.id === id); if (r) startWorkout(r.exIds.filter(ex), r.name); break; }
    case 'delroutine': { const r = S.routines.find(x => x.id === id); if (!r) break; const copy = JSON.parse(JSON.stringify(r)); S.routines = S.routines.filter(x => x.id !== id); del('routines', id); render(); undoable('Routine supprimée.', () => { S.routines.push(copy); put('routines', copy); render(); }); break; }
    case 'newroutine': newRoutine(); break;
    case 'addex': openPicker(ids => { W().entries.push(...makeEntries(ids)); persist(); render(); }); break;
    case 'rmex': { const cw = W(), en = entry(), copy = JSON.parse(JSON.stringify(en)), at = cw.entries.indexOf(en); cw.entries = cw.entries.filter(x => x.id !== en.id); persist(); render(); undoable('Exercice retiré.', () => { const c2 = W(); if (c2) { c2.entries.splice(at, 0, copy); persist(); render(); } }); break; }
    case 'addwarm': { const e = entry(); let k = 0; while (k < e.sets.length && e.sets[k].type === 'W') k++; e.sets.splice(k, 0, { w: null, r: null, done: false, type: 'W' }); persist(); render(); break; }
    case 'rmwarm': { const e = entry(); const k = e.sets.map(x => x.type).lastIndexOf('W'); if (k >= 0) { e.sets.splice(k, 1); persist(); render(); } break; }
    case 'addset': entry().sets.push(newSet()); persist(); render(); break;
    case 'rmset': { const e = entry(); if (e.sets.length > 1) { const s0 = e.sets.pop(); persist(); render(); if (s0.done) undoable('Série supprimée.', () => { const e2 = W() && W().entries.find(x => x.id === e.id); if (e2) { e2.sets.push(s0); persist(); render(); } }); } break; }
    case 'settype': { const row = t.closest('.set'), s = W().entries.find(x => x.id === row.dataset.e).sets[+row.dataset.i]; s.type = s.type === 'W' ? 'N' : 'W'; persist(); render(); break; }
    case 'check': toggleCheck(t.closest('.set')); break;
    case 'rir': { const row = t.closest('.set'), s = W().entries.find(x => x.id === row.dataset.e).sets[+row.dataset.i]; s.rir = s.rir == null ? 0 : s.rir >= 4 ? null : s.rir + 1; persist(); render(); break; }
    case 'restex': openRestSheet(id); break;
    case 'restset': { setRestFor(t.dataset.ex, +t.dataset.n || 0); closeSheet(); render(); break; }
    case 'editw': {
      if (S.active) { alert('Termine ou annule ta séance en cours avant de modifier une séance passée.'); break; }
      editId = id; closeSheet(); S.tab = 'train'; S.sub = ''; render(); window.scrollTo(0, 0); break;
    }
    case 'editdone': { flush(); editId = null; render(); window.scrollTo(0, 0); break; }
    case 'finish': finishWorkout(); break;
    case 'cancel': if (confirm('Annuler et supprimer cette séance en cours ?')) discardWorkout(); break;
    case 'rest': if (rest) { rest.end += +t.dataset.d * 1000; rest.total = Math.max(rest.total, rest.end - Date.now()); if (rest.end <= Date.now()) rest.end = Date.now() + 1000; drawRest(); } break;
    case 'restskip': rest = null; drawRest(); break;
    case 'closesheet': closeSheet(); break;
    case 'openw': { const w = S.workouts.find(x => x.id === id); if (w) workoutDetail(w, false); break; }
    case 'delw': { const w = S.workouts.find(x => x.id === id); if (!w || !confirm('Supprimer cette séance ?')) break; const copy = JSON.parse(JSON.stringify(w)); S.workouts = S.workouts.filter(x => x.id !== id); del('workouts', id); closeSheet(); render(); undoable('Séance supprimée.', () => { S.workouts.push(copy); put('workouts', copy); render(); }); break; }
    case 'review': runReview(id); break;
    case 'saveroutine': saveRoutine(id); break;
    case 'exdetail': exDetail(id); break;
    case 'exview': exView(id); break;
    case 'lbclose': closeView(); break;
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
    case 'volz': S.volZ = +t.dataset.n; render(); break;
    case 'year-pick': yearPick(); break;
    case 'year-tog': yearToggle(id); break;
    case 'year-img': await yearImage(); break;
    case 'avatar-open': avatarSheet(); break;
    case 'avatar-pick': $('#avatarfile').click(); break;
    case 'avatar-del': cfg.avatar = ''; saveCfg(); closeSheet(); render(); schedulePush(true); break;
    case 'jz': S.jz = t.dataset.k; render(); window.scrollTo(0, 0); break;
    case 'cz': S.cz = t.dataset.k; render(); window.scrollTo(0, 0); if (S.cz === 'chat') scrollEnd(); break;
    case 'toastx': $('#toast').classList.remove('on'); break;
    case 'gorev': $('#toast').classList.remove('on'); S.sub = 'progress'; render(); window.scrollTo(0, 0); break;
    case 'forceupdate': await forceUpdate(); break;
    case 'swreload': location.reload(); break;
    case 'export': exportData(); break;
    case 'import': $('#importfile').click(); break;
  }
});

let frTimer = null;
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.id === 'fr-q') { S.fr.q = t.value; clearTimeout(frTimer); frTimer = setTimeout(() => searchFriends(S.fr.q), 350); return; }
  if (t.id === 'ex-q') { $('#ex-list').innerHTML = exBrowseList(t.value); return; }
  if (t.id === 'pk-q' && picker) { picker.q = t.value; $('#pk-list').innerHTML = pkList(); return; }
  if (t.dataset.f === 'chat') { S.chatDraft = t.value; t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; return; }
  if (t.dataset.f === 'wname' && W()) { W().name = t.value; persist(); return; }
  if (t.dataset.f === 'note' && W()) { const en = W().entries.find(x => x.id === t.closest('.entry')?.dataset.e); if (en) { en.note = t.value.slice(0, 500); persist(); } return; }
  if ((t.dataset.f === 'w' || t.dataset.f === 'r') && W()) {
    const row = t.closest('.set'); if (!row) return;
    const s = W().entries.find(x => x.id === row.dataset.e)?.sets[+row.dataset.i]; if (!s) return;
    const v = num(t.value);
    if (t.dataset.f === 'w') s.w = v == null || v < 0 ? null : v; else s.r = v == null || v < 0 ? null : Math.round(v);
    persist();
  }
});
document.addEventListener('change', ev => {
  const f = ev.target.dataset.f, w = W();
  if (editing() && (f === 'wdate' || f === 'wdur') && w) {
    if (f === 'wdate' && /^\d{4}-\d{2}-\d{2}$/.test(ev.target.value)) {
      const o = new Date(w.startedAt), d = new Date(ev.target.value + 'T00:00:00');
      d.setHours(o.getHours(), o.getMinutes(), 0, 0);
      const dur0 = w.endedAt - w.startedAt; w.startedAt = d.getTime(); w.endedAt = w.startedAt + dur0;
    } else if (f === 'wdur') {
      const m = Math.min(600, Math.max(1, Math.round(num(ev.target.value) || 1)));
      w.endedAt = w.startedAt + m * 60000; ev.target.value = m;
    }
    persist(); render(); return;
  }
  const k = ev.target.dataset.cfg; if (!k) return;
  let v = ev.target.value;
  if (k === 'syncKey' || ev.target.type === 'checkbox') v = ev.target.checked;
  if (k === 'rest') v = Math.min(600, Math.max(10, Math.round(num(v) || 90)));
  if (k === 'apiKey') v = v.trim();
  if (k === 'model') v = v.trim() || DEF.model;
  cfg[k] = v; saveCfg(); if (k === 'rest') ev.target.value = v;
  if (/^sh[A-Z]/.test(k)) schedulePush(true);
});
// Le clavier iOS masque souvent la ligne en cours : on la ramène au centre.
document.addEventListener('focusin', ev => {
  const t = ev.target; if (!t.dataset || !/^(w|r|note)$/.test(t.dataset.f || '')) return;
  setTimeout(() => { const r = t.closest('.set') || t.closest('.entry'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 300);
});
// Entrée : charge → reps → validation → série suivante, sans lever le doigt du clavier.
document.addEventListener('keydown', ev => {
  if (ev.key !== 'Enter' || !ev.target.dataset) return;
  const f = ev.target.dataset.f, row = ev.target.closest('.set');
  if (!row || (f !== 'w' && f !== 'r')) return;
  ev.preventDefault();
  if (f === 'w') { const r = row.querySelector('[data-f="r"]'); if (r) r.focus(); return; }
  const e = row.dataset.e, i = +row.dataset.i;
  toggleCheck(row);
  const nx = $(`.set[data-e="${e}"][data-i="${i + 1}"] [data-f="w"]`);
  if (nx) nx.focus(); else ev.target.blur();
});
$('#importfile').addEventListener('change', ev => { const f = ev.target.files[0]; ev.target.value = ''; if (f) importData(f); });
$('#avatarfile').addEventListener('change', ev => { const f = ev.target.files[0]; ev.target.value = ''; if (f) setAvatar(f); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { wake(); tickRest(); checkStale(); } else flush(); });

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

/* ---------- chat IA avec mémoire ---------- */
const CHAT_SYSTEM = `Tu es le coach personnel de l'utilisateur dans l'app Lift : expert en musculation (hypertrophie, force, périodisation), en anatomie du mouvement et en nutrition sportive générale. Tu discutes avec lui sur la durée.
Règles :
- Tu t'appuies sur le CONTEXTE fourni (profil, mémoire, séances, composition corporelle) et sur la conversation. N'invente jamais de données : si une information manque, demande-la ou dis-le.
- Réponds en français, de façon concrète et directement exploitable : charges en kg, séries × répétitions, jours de la semaine quand tu proposes un programme. Reste concis (moins de 200 mots) sauf si on te demande un programme détaillé.
- Format : puces "- " et **gras** pour les points clés ; titres "## " seulement pour les réponses longues.
- Santé : tu ne poses aucun diagnostic et ne remplaces ni un médecin ni un diététicien. En cas de douleur, de blessure ou de trouble alimentaire évoqué, reste prudent et recommande un avis professionnel. Pas de régime extrême.
- Mémoire : quand l'utilisateur donne une information durable utile pour l'accompagner (blessure, matériel disponible, contrainte d'emploi du temps, préférence, objectif précis), ajoute à la FIN de ta réponse, sur une ligne séparée, [[MEMO: fait court à retenir]] (2 au maximum, seulement s'il est nouveau et absent de la MÉMOIRE).`;

/* composition corporelle */
const BODY_FIELDS = [
  ['weight', 'Poids', 'kg'], ['bodyFat', 'Taux de graisse (TGC)', '%'], ['fatMass', 'Masse grasse (MGC)', 'kg'], ['leanMass', 'Masse maigre (MMC)', 'kg'],
  ['smm', 'Masse musculaire squelettique (MMS)', 'kg'], ['muscle', 'Masse musculaire', 'kg'], ['tbw', 'Eau corporelle totale', 'kg'],
  ['protein', 'Masse de protéines', 'kg'], ['minerals', 'Sels inorganiques', 'kg'], ['bmi', 'IMC', ''], ['bmr', 'Métabolisme de base', 'kcal/j'],
  ['metaAge', 'Âge métabolique', 'ans'], ['whr', 'Rapport taille/hanches (RTH)', ''], ['visceral', 'Graisse viscérale (niveau)', '']
];
const BODY_SEG = [['la', 'Bras gauche'], ['ra', 'Bras droit'], ['trunk', 'Tronc'], ['ll', 'Jambe gauche'], ['rl', 'Jambe droite']];
const BODY_RANGE = { weight: [20, 300], bodyFat: [1, 70], fatMass: [0.5, 200], leanMass: [10, 200], smm: [5, 100], muscle: [5, 150], tbw: [10, 150], protein: [1, 50], minerals: [0.5, 15], bmi: [10, 70], bmr: [600, 5000], metaAge: [5, 100], whr: [0.5, 1.5], visceral: [0, 30] };
const BODY_METRICS = [['weight', 'Poids', 'kg'], ['bodyFat', 'TGC', '%'], ['smm', 'Muscle (MMS)', 'kg'], ['fatMass', 'Masse grasse', 'kg'], ['leanMass', 'Masse maigre', 'kg']];

const sortBy = (list, k) => list.sort((a, b) => (a[k] || 0) - (b[k] || 0));
function applyChat(list) { sortBy(list, 'ts'); if (JSON.stringify(list) === JSON.stringify(S.chat)) return; S.chat = list; renderSoft(); }
function applyFacts(list) { sortBy(list, 'ts'); if (JSON.stringify(list) === JSON.stringify(S.facts)) return; S.facts = list; renderSoft(); }
function applyBody(list) { sortBy(list, 'ts'); if (JSON.stringify(list) === JSON.stringify(S.body)) return; S.body = list; renderSoft(); }

const asym = (l, r) => l > 0 && r > 0 ? Math.round((r - l) / ((l + r) / 2) * 1000) / 10 : null;
function bodyLine(m) {
  const g = (k, u) => m[k] != null ? `${k === 'weight' ? 'poids' : k === 'bodyFat' ? 'TGC' : k === 'smm' ? 'MMS' : k === 'fatMass' ? 'masse grasse' : k === 'leanMass' ? 'masse maigre' : k} ${fmt(m[k])} ${u}`.trim() : null;
  const main = [g('weight', 'kg'), g('bodyFat', '%'), g('fatMass', 'kg'), g('leanMass', 'kg'), g('smm', 'kg'), g('visceral', ''), g('bmr', 'kcal/j')].filter(Boolean).join(', ');
  const seg = BODY_SEG.filter(([k]) => m['sm_' + k] != null).map(([k, l]) => `${l.toLowerCase()} ${fmt(m['sm_' + k])} kg`).join(', ');
  const al = asym(m.sm_la, m.sm_ra), ll = asym(m.sm_ll, m.sm_rl);
  return `- ${new Date(m.ts).toLocaleDateString('fr-FR')} : ${main || 'données partielles'}` + (seg ? ` | muscle par segment : ${seg}` : '')
    + (al != null || ll != null ? ` | écart droite/gauche : ${al != null ? 'bras ' + (al > 0 ? '+' : '') + fmt(al) + ' %' : ''}${al != null && ll != null ? ', ' : ''}${ll != null ? 'jambes ' + (ll > 0 ? '+' : '') + fmt(ll) + ' %' : ''}` : '');
}
const bodyContext = (n = 3) => S.body.length ? `COMPOSITION CORPORELLE (mesures par impédancemétrie, approximatives : l'hydratation et l'heure les font varier) :\n${S.body.slice(-n).map(bodyLine).join('\n')}` : '';

function chatContext() {
  const parts = [profileLine(), historyLine()];
  if (S.facts.length) parts.push('MÉMOIRE (faits retenus sur l\'utilisateur) :\n' + S.facts.map(f => '- ' + f.text).join('\n'));
  const fw = finished();
  if (fw.length) {
    parts.push('ENTRAÎNEMENT (4 dernières semaines, séances/semaine et séries par groupe) :\n' + weeksSummary(4).map(x => `- semaine du ${fmtDate(x.a)} : ${x.c} séance(s) — séries : ${fmtMuscles(x.mu)}`).join('\n'));
    parts.push('DERNIÈRES SÉANCES :\n' + fw.slice(-4).map(w => `- ${fmtDate(w.startedAt)} « ${w.name} » : ` + w.entries.map(e => {
      const ws = workSets(e); if (!ws.length) return null;
      return `${exName(e.exId)} ${ws.map(x => setTxt(x, e.exId, w.startedAt)).join(', ')}` + (e.note && e.note.trim() ? ` (commentaire : ${e.note.trim().replace(/\s+/g, ' ')})` : '');
    }).filter(Boolean).join(' ; ')).join('\n'));
  } else parts.push('ENTRAÎNEMENT : aucune séance enregistrée pour le moment.');
  if (fw.some(durOdd)) parts.push(DUR_NOTE);
  parts.push(bodyContext());
  const fb = ficheBlock(fw.slice(-3).flatMap(w => w.entries.map(e => e.exId)), 8);
  return parts.filter(Boolean).join('\n\n').slice(0, 9000) + (fb ? '\n\n' + fb : '');
}

function parseMemos(t) {
  const memos = []; const clean = t.replace(/\[\[\s*MEMO\s*:\s*([^\]]+?)\s*\]\]/gi, (_, m) => { memos.push(m.trim().slice(0, 200)); return ''; }).trim();
  return { clean, memos };
}
function chatContents(img) {
  const out = [];
  for (const m of S.chat.slice(-20)) {
    const role = m.role === 'model' ? 'model' : 'user', last = out[out.length - 1];
    if (last && last.role === role) last.parts[0].text += '\n\n' + m.text; else out.push({ role, parts: [{ text: m.text }] });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  if (img && out.length) out[out.length - 1].parts.push({ inlineData: { mimeType: img.mime, data: img.data } });
  return out;
}
const scrollEnd = () => setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30);
async function sendChat(textOverride) {
  const text = (textOverride != null ? textOverride : S.chatDraft || '').trim();
  if ((!text && !S.chatImg) || S.chatBusy) return;
  if (!cfg.apiKey) { S.chatErr = 'Ajoute ta clé Gemini dans Profil → Réglages.'; render(); return; }
  const img = S.chatImg, um = { id: uid(), role: 'user', text: text || '(image envoyée)', img: !!img, ts: Date.now() };
  S.chat.push(um); put('chat', um);
  S.chatDraft = ''; S.chatImg = null; S.chatBusy = true; S.chatErr = ''; S.memoSug = []; render(); scrollEnd();
  try {
    const reply = await geminiCall({ system: CHAT_SYSTEM + '\n\nCONTEXTE :\n' + chatContext(), contents: chatContents(img), maxTokens: 4096 });
    const { clean, memos } = parseMemos(reply);
    const am = { id: uid(), role: 'model', text: clean || reply, ts: Date.now() };
    S.chat.push(am); put('chat', am);
    S.memoSug = memos.filter(m => !S.facts.some(f => norm(f.text) === norm(m)));
  } catch (e) { S.chatErr = e.message; }
  S.chatBusy = false; render(); scrollEnd();
}

function viewChat() {
  const msgs = S.chat.map(m => `<div class="msg ${m.role === 'model' ? 'ai' : 'me'}">${m.role === 'model' ? md(m.text) : esc(m.text).replace(/\n/g, '<br>')}${m.img ? '<div class="imgtag">📷 image envoyée (non conservée)</div>' : ''}</div>`).join('');
  const starters = ['Propose-moi un programme pour la semaine', 'Quels sont mes points faibles ?', 'Que manger avant et après l’entraînement ?'];
  const memo = S.memoSug.map((m, i) => `<div class="memo"><span>🧠 Retenir : « ${esc(m)} »</span><button class="btn sm primary" data-act="memo-yes" data-i="${i}">Retenir</button><button class="btn sm" data-act="memo-no" data-i="${i}">Non</button></div>`).join('');
  return `<div class="row chat-top"><button class="btn sm" data-act="memo-open">🧠 Mémoire (${S.facts.length})</button><button class="btn sm" data-act="chat-clear" ${S.chat.length ? '' : 'disabled'}>Effacer</button></div>
  <div class="chat">${msgs || `<div class="muted chat-empty">Pose une question sur un exercice, un programme, la nutrition… Le coach connaît ton profil, tes séances et ta composition corporelle, et se souvient de la conversation.<div class="chips2" style="margin-top:12px">${starters.map(q => `<button class="sc" data-act="chat-ex" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>`}
    ${S.chatBusy ? '<div class="msg ai"><div class="loading"><i></i>Le coach réfléchit…</div></div>' : ''}${memo}${S.chatErr ? `<div class="err">${esc(S.chatErr)}</div>` : ''}</div>
  <div class="composer">${S.chatImg ? '<div class="attached">📷 Image jointe (envoyée à Gemini, non conservée) <button data-act="chat-rmimg">✕</button></div>' : ''}
    <div class="cbar"><button class="x" data-act="chat-attach" aria-label="Joindre une image">📷</button><textarea id="chat-in" data-f="chat" rows="1" maxlength="2000" placeholder="Écris au coach…" aria-label="Message">${esc(S.chatDraft)}</textarea><button class="btn primary sm" data-act="chat-send" ${S.chatBusy ? 'disabled' : ''}>Envoyer</button></div></div>`;
}

function openMemory() {
  sheet(`<h3>Mémoire du coach</h3><p class="muted" style="margin:-6px 0 12px;font-size:14px">Les faits ci-dessous sont transmis au coach à chaque message. Ajoute, modifie par suppression, ou efface ce que tu veux.</p>
    <div id="mem-list">${S.facts.map(f => `<div class="fact"><span>${esc(f.text)}</span><button class="x" data-act="memo-del" data-id="${f.id}" aria-label="Supprimer">✕</button></div>`).join('') || '<p class="empty">Rien de retenu pour l’instant.</p>'}</div>
    <input id="mem-new" class="field" maxlength="200" placeholder="Ex. épaule droite sensible, haltères max 30 kg à la maison" autocomplete="off">
    <div class="pk-foot"><button class="btn ghost" data-act="closesheet">Fermer</button><button class="btn primary" data-act="memo-add">Ajouter</button></div>`);
}

/* images : réduction avant envoi (le plus léger possible) */
function resizeImage(file, max = 1280) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      res({ mime: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.82).split(',')[1] });
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Image illisible.')); };
    im.src = url;
  });
}
const warnImages = () => {
  let ok = false; try { ok = localStorage.getItem('lift.imgwarn') === '1'; } catch (e) { }
  if (ok) return true;
  if (!confirm('Avec une clé Gemini gratuite, Google peut utiliser les images envoyées pour améliorer ses produits et les faire relire par des humains. Ne joins pas de photo sensible ni de capture avec ton nom. Continuer ?')) return false;
  try { localStorage.setItem('lift.imgwarn', '1'); } catch (e) { }
  return true;
};
function pickFile(multiple, cb) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = !!multiple; i.style.display = 'none';
  i.onchange = () => { const f = [...i.files]; i.remove(); if (f.length) cb(f); }; document.body.appendChild(i); i.click();
}

/* onglet Corps */
function viewBody() {
  const b = S.body, last = b[b.length - 1], met = BODY_METRICS.find(m => m[0] === S.bodyMetric) || BODY_METRICS[0];
  const pts = b.filter(m => m[met[0]] != null).map(m => ({ t: m.ts, v: m[met[0]] }));
  let an = null; try { an = JSON.parse(localStorage.getItem('lift.bodyAnalysis') || 'null'); } catch (e) { }
  const seg = last && BODY_SEG.some(([k]) => last['sm_' + k] != null) ? `<div class="lbl sec" style="margin-top:16px">Muscle par segment (dernière mesure)</div><div class="chips2">${BODY_SEG.filter(([k]) => last['sm_' + k] != null).map(([k, l]) => `<span class="sc">${l} ${fmt(last['sm_' + k])} kg</span>`).join('')}</div>
    ${[['bras', 'la', 'ra'], ['jambes', 'll', 'rl']].map(([n, l, r]) => { const a = asym(last['sm_' + l], last['sm_' + r]); return a == null ? '' : `<div class="muted" style="font-size:14px">Écart droite/gauche, ${n} : <b>${a > 0 ? '+' : ''}${fmt(a)} %</b> ${Math.abs(a) >= 5 ? '(à surveiller)' : '(équilibré)'}</div>`; }).join('')}` : '';
  return `<div class="lbl" style="margin-bottom:10px">Composition corporelle</div>
  <section class="card"><p class="muted" style="margin:0 0 12px;font-size:14px">Importe les captures de ton bilan (balance ou scanner à impédancemétrie) : Gemini lit les chiffres, tu les vérifies, puis l’app suit ton évolution. Les captures ne sont pas conservées, seuls les chiffres le sont.</p>
    <div class="row"><button class="btn primary" data-act="body-import">📷 Importer des captures</button><button class="btn" data-act="body-new">Saisir à la main</button></div>
    ${S.bodyBusy ? '<div class="loading"><i></i>Lecture des captures par Gemini…</div>' : ''}${S.bodyMsg ? `<div class="err">${esc(S.bodyMsg)}</div>` : ''}</section>
  ${last ? `<div class="lbl sec">Évolution</div><section class="card"><div class="chips" style="margin-bottom:0">${BODY_METRICS.map(([k, l]) => `<button class="chip ${met[0] === k ? 'on' : ''}" data-act="body-metric" data-k="${k}">${l}</button>`).join('')}</div>
    ${pts.length ? lineChart(pts, met[2]) : '<p class="empty">Pas de valeur pour cette mesure.</p>'}${seg}</section>
  <div class="lbl sec">Analyse du coach</div><section class="card"><button class="btn primary" data-act="body-analyze" id="banbtn">Analyser ma composition</button><div id="banout">${an ? `<div class="review">${md(an.text)}<div class="meta">${new Date(an.ts).toLocaleDateString('fr-FR')} · ${esc(an.model)}</div></div>` : ''}</div></section>
  <div class="lbl sec">Mesures</div>${b.slice().reverse().map(m => `<button class="card bm" data-act="body-open" data-id="${m.id}"><b>${new Date(m.ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</b><span class="muted">${[m.weight != null ? fmt(m.weight) + ' kg' : '', m.bodyFat != null ? 'TGC ' + fmt(m.bodyFat) + ' %' : '', m.smm != null ? 'MMS ' + fmt(m.smm) + ' kg' : ''].filter(Boolean).join(' · ')}</span></button>`).join('')}` : '<p class="empty" style="margin-top:24px">Aucune mesure pour l’instant.</p>'}`;
}

function bodyForm(m) {
  const dt = new Date(m.ts || Date.now()), iso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const inp = (k, l, u, v) => `<div><label class="l">${l}${u ? ' (' + u + ')' : ''}</label><input class="field" data-bf="${k}" inputmode="decimal" value="${v != null ? fmtIn(v) : ''}" autocomplete="off"></div>`;
  sheet(`<h3>${m.id ? 'Mesure' : 'Nouvelle mesure'}</h3>
    ${m.fromAI ? '<p class="muted" style="margin:-6px 0 8px;font-size:14px"><b>Vérifie les chiffres</b> lus par Gemini avant d’enregistrer (une erreur de lecture est possible). Laisse vide ce qui n’est pas disponible.</p>' : ''}
    <label class="l" style="margin-top:0">Date de la mesure</label><input class="field" type="date" id="bf-date" value="${iso}">
    <div class="bf-grid">${BODY_FIELDS.map(([k, l, u]) => inp(k, l, u, m[k])).join('')}</div>
    <div class="lbl sec" style="margin-top:12px">Masse musculaire par segment (kg)</div><div class="bf-grid">${BODY_SEG.map(([k, l]) => inp('sm_' + k, l, '', m['sm_' + k])).join('')}</div>
    <div class="lbl sec" style="margin-top:12px">Masse grasse par segment (kg)</div><div class="bf-grid">${BODY_SEG.map(([k, l]) => inp('sf_' + k, l, '', m['sf_' + k])).join('')}</div>
    <div class="pk-foot">${m.id ? `<button class="btn ghost" data-act="body-del" data-id="${m.id}" style="color:#ff8a4c">Supprimer</button>` : '<button class="btn ghost" data-act="closesheet">Annuler</button>'}<button class="btn primary" data-act="body-save" data-id="${m.id || ''}">Enregistrer</button></div>`);
}
function saveBodyForm(id) {
  const old = S.body.find(x => x.id === id) || {}, o = { ...old, id: id || uid() };
  const d = $('#bf-date').value; o.ts = d ? new Date(d + 'T12:00:00').getTime() : Date.now(); o.updatedAt = Date.now();
  let any = false;
  document.querySelectorAll('[data-bf]').forEach(el => { const v = num(el.value), k = el.dataset.bf; if (v == null || v < 0) delete o[k]; else { o[k] = v; any = true; } });
  if (!any) { alert('Renseigne au moins une valeur.'); return; }
  const i = S.body.findIndex(x => x.id === o.id); if (i >= 0) S.body[i] = o; else S.body.push(o);
  sortBy(S.body, 'ts'); put('body', o); closeSheet(); render();
}

const BODY_PROMPT = `Ces images sont des captures d'écran d'un bilan de composition corporelle (balance ou scanner à impédancemétrie). Extrais UNIQUEMENT les valeurs numériques affichées, sans rien inventer ni calculer. Ignore le nom, l'âge, la taille et les textes de conclusion. Réponds par un seul objet JSON avec ces clés (null si la valeur n'est pas visible) :
{"date": "AAAA-MM-JJ" ou null, "weight": poids en kg, "bodyFat": TGC / taux de graisse en %, "fatMass": MGC masse grasse en kg, "leanMass": MMC masse maigre en kg, "smm": MMS masse musculaire squelettique en kg, "muscle": masse musculaire en kg, "tbw": eau corporelle totale en kg, "protein": masse de protéines en kg, "minerals": sel inorganique en kg, "bmi": IMC, "bmr": métabolisme de base en kcal/j, "metaAge": âge métabolique, "whr": RTH (rapport taille/hanches), "visceral": niveau de graisse viscérale,
"segMuscle": {"la": bras gauche, "ra": bras droit, "trunk": tronc, "ll": jambe gauche, "rl": jambe droite} (masse musculaire par segment en kg ; « Gauche » et « Droite » sont indiqués sur le schéma), "segFat": {mêmes clés} (masse graisseuse par segment en kg, si visible)}
Les valeurs sont des nombres (point décimal).`;
async function extractBody(files) {
  const parts = [{ text: BODY_PROMPT }];
  for (const f of files.slice(0, 8)) { const im = await resizeImage(f, 1600); parts.push({ inlineData: { mimeType: im.mime, data: im.data } }); }
  const t = await geminiCall({ system: 'Tu extrais des données chiffrées de captures d\'écran. Tu réponds uniquement par un objet JSON valide, sans texte autour.', contents: [{ role: 'user', parts }], json: true, temperature: 0, maxTokens: 2048 });
  let j; try { j = JSON.parse(t.replace(/^```json|```$/g, '').trim()); } catch (e) { throw new Error('Lecture impossible : réponse inattendue de Gemini. Réessaie ou saisis à la main.'); }
  const m = { fromAI: true, ts: Date.now() };
  for (const [k, [lo, hi]] of Object.entries(BODY_RANGE)) { const v = num(j[k]); if (v != null && v >= lo && v <= hi) m[k] = v; }
  for (const [pre, src] of [['sm_', j.segMuscle], ['sf_', j.segFat]]) if (src && typeof src === 'object') for (const [k] of BODY_SEG) { const v = num(src[k]); if (v != null && v >= 0.1 && v <= 80) m[pre + k] = v; }
  if (j.date && /^\d{4}-\d{2}-\d{2}$/.test(j.date)) { const ts = new Date(j.date + 'T12:00:00').getTime(); if (ts <= Date.now() + 86400000 && ts > Date.now() - 5 * 365 * 86400000) m.ts = ts; }
  if (!Object.keys(m).some(k => k !== 'fromAI' && k !== 'ts')) throw new Error('Aucune valeur reconnue sur ces captures.');
  return m;
}
async function importBody(files) {
  if (!cfg.apiKey) { S.bodyMsg = 'Ajoute ta clé Gemini dans Profil → Réglages.'; render(); return; }
  S.bodyBusy = true; S.bodyMsg = ''; render();
  try { const m = await extractBody(files); S.bodyBusy = false; render(); bodyForm(m); }
  catch (e) { S.bodyBusy = false; S.bodyMsg = e.message; render(); }
}
function bodyAnalysisPrompt() {
  return `${profileLine()}

${historyLine()}

${S.facts.length ? 'MÉMOIRE :\n' + S.facts.map(f => '- ' + f.text).join('\n') + '\n\n' : ''}${bodyContext(8)}

ENTRAÎNEMENT (6 dernières semaines, séances/semaine et séries par groupe) :
${weeksSummary(6).map(x => `- semaine du ${fmtDate(x.a)} : ${x.c} séance(s) — séries : ${fmtMuscles(x.mu)}`).join('\n')}

Rédige une analyse (maximum 250 mots) :
## Lecture de la dernière mesure (ce qui est dans la norme, ce qui s'écarte, en restant nuancé : l'impédancemétrie est approximative)
## Évolution (par rapport aux mesures précédentes, avec les écarts chiffrés ; s'il n'y a qu'une mesure, dis-le)
## Points faibles et asymétries (par segment, écart droite/gauche)
## Conséquences pour l'entraînement (ajustements concrets : groupes à prioriser, séries par semaine, travail unilatéral) et pour l'alimentation (repères généraux)
Ne pose aucun diagnostic.`;
}
async function analyzeBody() {
  const b = $('#banbtn'), out = $('#banout'); if (!b) return;
  b.disabled = true; out.innerHTML = '<div class="loading"><i></i>Le coach analyse ta composition…</div>';
  try {
    const text = await gemini(bodyAnalysisPrompt()), a = { text, ts: Date.now(), model: cfg.model };
    try { localStorage.setItem('lift.bodyAnalysis', JSON.stringify(a)); } catch (e) { }
    out.innerHTML = `<div class="review">${md(text)}<div class="meta">${new Date(a.ts).toLocaleDateString('fr-FR')} · ${esc(a.model)}</div></div>`;
  } catch (e) { out.innerHTML = `<div class="err">${esc(e.message)}</div>`; }
  b.disabled = false;
}


/* ---------- profil (page d'accueil du profil, statistiques, corps, réglages) ---------- */
// Histogramme. Au-delà de 10 barres les valeurs ne sont plus lisibles : on ne
// les écrit qu'en deçà, ce qui rend le changement de métrique visible.
function barChart(vals, labels, show = false) {
  const W = 320, H = 150, L = 8, R = 8, T = show ? 20 : 10, B = 22, n = vals.length, mx = Math.max(...vals, 1e-9), bw = (W - L - R) / n;
  const num = v => v >= 1000 ? Math.round(v / 100) / 10 + 'k' : v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10).replace('.', ',');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Activité"><line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#272729"/>`
    + vals.map((v, i) => { const h = v / mx * (H - T - B), x = L + i * bw + 3; return `<rect x="${x}" y="${H - B - h}" width="${bw - 6}" height="${Math.max(h, v > 0 ? 2 : 0)}" rx="3" fill="${i === n - 1 ? '#ff3030' : '#8a2222'}"${i === n - 1 ? ' style="filter:drop-shadow(0 0 4px rgba(255,48,48,.6))"' : ''}/>`; }).join('')
    + (show ? vals.map((v, i) => v > 0 ? `<text class="bv" x="${L + i * bw + bw / 2}" y="${H - B - v / mx * (H - T - B) - 5}" text-anchor="middle">${num(v)}</text>` : '').join('') : '')
    + labels.map((l, i) => (n <= 6 || i % 3 === 0 || i === n - 1) ? `<text x="${L + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${l}</text>` : '').join('') + '</svg>';
}

/* Graphique d'activité du profil. Tant que l'historique est court, un
   découpage en semaines n'affiche que des colonnes vides : on montre alors
   les dernières séances une par une. */
function profChart() {
  const fw = finished();
  const val = w => S.pm === 'vol' ? wVol(w) : S.pm === 'sets' ? wSets(w) : durOdd(w) ? 0 : (w.endedAt - w.startedAt) / 3600000;
  const unit = S.pm === 'vol' ? 'kg' : S.pm === 'sets' ? 'séries' : 'h';
  const chips = `<div class="chips" style="margin:6px 0 0">${[['dur', 'Durée'], ['vol', 'Volume'], ['sets', 'Séries']].map(([k, l]) => `<button class="chip ${S.pm === k ? 'on' : ''}" data-act="pmetric" data-k="${k}">${l}</button>`).join('')}</div>`;
  if (!fw.length) return `<section class="card"><p class="empty" style="margin:18px 0">Ta première séance remplira ce graphique.</p>${chips}</section>`;
  const ms = mondayOf(Date.now()), nw = Math.round((ms - mondayOf(fw[0].startedAt)) / 604800000) + 1;
  const bySession = nw < 4;
  let vals, labels, cur, when;
  if (bySession) {
    const last = fw.slice(-10);
    vals = last.map(val); labels = last.map(w => fmtDate(w.startedAt));
    cur = vals[vals.length - 1]; when = 'dernière séance';
  } else {
    const n = Math.min(12, Math.max(6, nw));
    const weeks = Array.from({ length: n }, (_, i) => addDays(ms, -7 * (n - 1 - i)));
    vals = weeks.map(a => fw.filter(w => w.startedAt >= a && w.startedAt < addDays(a, 7)).reduce((t, w) => t + val(w), 0));
    labels = weeks.map(a => fmtDate(a)); cur = vals[vals.length - 1]; when = 'cette semaine';
  }
  const shown = bySession ? fw.slice(-10) : fw.filter(w => w.startedAt >= addDays(ms, -7 * (vals.length - 1)));
  const skipped = S.pm === 'dur' && shown.filter(durOdd).length;
  return `<div class="lbl sec"><b style="color:var(--text);font:700 16px var(--sans,inherit);letter-spacing:0;text-transform:none">${S.pm === 'dur' ? fmt(Math.round(cur * 10) / 10) : Math.round(cur).toLocaleString('fr-FR')} ${unit}</b> ${when}</div>
    <section class="card">${barChart(vals, labels, vals.length <= 10)}
      <small class="note">${bySession ? 'Une barre par séance : le découpage par semaine arrivera après un mois d’historique.' : 'Une barre par semaine.'}${skipped ? ` ${skipped} séance${skipped > 1 ? 's' : ''} enregistrée${skipped > 1 ? 's' : ''} après coup : durée non comptée.` : ''}</small>
      ${chips}</section>`;
}
function viewProfile() {
  if (S.sub === 'progress') return subPage('Statistiques', viewProgress());
  if (S.sub === 'body') return subPage('Corps', viewBody());
  if (S.sub === 'settings') return subPage('Réglages', viewSettings());
  if (S.sub === 'records') return viewRecords();
  const fw = finished(), name = cfg.pseudo || (S.user && S.user.email ? S.user.email.split('@')[0] : 'Moi');
  const totalVol = fw.reduce((t, w) => t + wVol(w), 0), totalSets = fw.reduce((t, w) => t + wSets(w), 0);
  const online = navigator.onLine && !S.syncErr;
  return `<div class="phead"><button class="avatar av-edit" data-act="avatar-open" aria-label="Changer ma photo">${cfg.avatar ? `<img src="${esc(cfg.avatar)}" alt="">` : esc(name.charAt(0).toUpperCase())}<i>✎</i></button>
      <div class="pinfo"><b>${esc(name)}</b><small class="${online ? 'up' : 'down'}">${online ? '● Synchronisé' : '● Hors ligne'}</small></div>
      <button class="x gear" data-act="sub" data-s="settings" aria-label="Réglages">⚙</button></div>
    <div class="stats pstats"><div class="stat"><b>${fw.length}</b><span>Séances</span></div><div class="stat"><b>${totalSets.toLocaleString('fr-FR')}</b><span>Séries</span></div><div class="stat"><b>${totalVol >= 1000 ? fmt(Math.round(totalVol / 100) / 10) + ' t' : Math.round(totalVol) + ' kg'}</b><span>Volume</span></div></div>
    ${profChart()}
    ${S.prs.length ? `<div class="lbl sec">Records</div><div class="prstrip">${prSorted().slice(0, 4).map(p => `<button class="prs-i" data-act="sub" data-s="records"><b>${p.w > 0 ? fmt(p.w) + ' kg' : 'PDC'}</b><span>× ${p.r}</span><small>${esc(exName(p.exId))}</small></button>`).join('')}</div>` : ''}
    <div class="lbl sec">Tableau de bord</div>
    <div class="tiles">
      <button class="tile" data-act="sub" data-s="progress">${ICONS.progress}<span>Statistiques</span></button>
      <button class="tile" data-act="sub" data-s="records">${ICONS.trophy}<span>Records</span></button>
      <button class="tile" data-act="sub" data-s="body">${ICONS.body}<span>Corps</span></button>
      <button class="tile" data-act="exbrowse">${ICONS.dumbbell}<span>Exercices</span></button>
      <button class="tile" data-act="sub" data-s="settings">${ICONS.profile}<span>Réglages</span></button>
    </div>`;
}
const subPage = (title, html, back = '', label = 'Profil') => `<div class="subhead"><button class="back" data-act="sub" data-s="${back}">‹ ${label}</button><b>${title}</b></div>${html}`;

/* catalogue complet des exercices (avec illustrations) */
function exBrowseList(q) {
  const toks = norm(q || '').split(/\s+/).filter(Boolean);
  const list = S.exercises.filter(e => !toks.length || toks.every(tk => norm(e.name + ' ' + e.muscle + (/\(Smith\)/.test(e.name) ? ' smith machine barre guidee' : '')).includes(tk)))
    .sort((a, b) => MUSCLES.indexOf(a.muscle) - MUSCLES.indexOf(b.muscle) || a.name.localeCompare(b.name, 'fr'));
  return list.map(e => `<div class="pk-row"><button class="pk-item" data-act="exopen" data-id="${e.id}">${thumb(e)}<span class="pk-n">${esc(e.name)}</span><small>${esc(e.muscle)}</small></button>${eyeBtn(e, 'pk-eye')}</div>`).join('') || '<p class="empty">Aucun résultat.</p>';
}
function openExBrowse() {
  sheet(`<h3>Exercices (${S.exercises.length})</h3><input id="ex-q" class="field" placeholder="Rechercher (ex. smith, dos, curl)" autocomplete="off">
    <p class="muted" style="margin:-4px 0 8px;font-size:13px">Touche 👁 pour voir l’illustration et les muscles. Touche le nom pour voir ta progression.</p>
    <div id="ex-list" class="pk-list" style="max-height:calc(100dvh - 300px);min-height:160px">${exBrowseList('')}</div>`);
}

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
  swSetup();
})();
