// Couche d'accès au cloud (Firebase : comptes + Firestore). Seul fichier qui parle à Firebase.
import * as F from './vendor/firebase.js';

const cfg = window.LIFT_FIREBASE;
export const configured = !!(cfg && cfg.apiKey && cfg.projectId && !/REMPLACE|YOUR_/i.test(cfg.apiKey + cfg.projectId));

let auth, fs;
if (configured) {
  const app = F.initializeApp(cfg);
  auth = F.initializeAuth(app, { persistence: [F.indexedDBLocalPersistence, F.browserLocalPersistence] });
  try {
    // Cache local persistant : l'app marche hors ligne, tout se resynchronise au retour du réseau.
    fs = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  } catch (e) { fs = F.getFirestore(app); }
}

const clean = o => JSON.parse(JSON.stringify(o)); // retire les undefined, que Firestore refuse
const user = u => (u ? { uid: u.uid, email: u.email || '' } : null);

export const onAuth = cb => F.onAuthStateChanged(auth, u => cb(user(u)));
export const signUp = (email, pw) => F.createUserWithEmailAndPassword(auth, email, pw).then(c => user(c.user));
export const signIn = (email, pw) => F.signInWithEmailAndPassword(auth, email, pw).then(c => user(c.user));
export const signOut = () => F.signOut(auth);
export const resetPassword = email => F.sendPasswordResetEmail(auth, email);

// users/{uid}/{workouts|routines|exercises}/{id} et users/{uid}/meta/settings
export function watch(uid, col, cb) {
  return F.onSnapshot(
    F.collection(fs, 'users', uid, col),
    snap => cb(snap.docs.map(d => ({ ...d.data(), id: d.id })), { fromCache: snap.metadata.fromCache }),
    error => cb(null, { error })
  );
}
export function watchSettings(uid, cb) {
  return F.onSnapshot(F.doc(fs, 'users', uid, 'meta', 'settings'), s => cb(s.exists() ? s.data() : null), () => cb(null));
}
export const save = (uid, col, obj) => F.setDoc(F.doc(fs, 'users', uid, col, obj.id), clean(obj));
export const remove = (uid, col, id) => F.deleteDoc(F.doc(fs, 'users', uid, col, id));
export const saveSettings = (uid, obj) => F.setDoc(F.doc(fs, 'users', uid, 'meta', 'settings'), clean(obj), { merge: true });
export async function saveMany(uid, col, objs) {
  for (let i = 0; i < objs.length; i += 400) {
    const b = F.writeBatch(fs);
    objs.slice(i, i + 400).forEach(o => b.set(F.doc(fs, 'users', uid, col, o.id), clean(o)));
    await b.commit();
  }
}
