// Couche d'accès au cloud (Firebase : comptes + Firestore). Seul fichier qui parle à Firebase.
import * as F from './firebase.js';

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

/* ---------- amis (pseudos uniques, demandes, partage limité, boîte de réception) ---------- */
export const pairId = (a, b) => (a < b ? a + '_' + b : b + '_' + a);

// Pseudo unique : le document usernames/{pseudo en minuscules} ne peut être créé que s'il n'existe pas (règles Firestore).
export async function claimHandle(uid, lower, display, oldLower) {
  const b = F.writeBatch(fs);
  if (oldLower && oldLower !== lower) b.delete(F.doc(fs, 'usernames', oldLower));
  b.set(F.doc(fs, 'usernames', lower), { uid, lower, pseudo: display });
  await b.commit();
}
export async function searchHandles(prefix) {
  const q = F.query(F.collection(fs, 'usernames'), F.where('lower', '>=', prefix), F.where('lower', '<', prefix + ''), F.limit(8));
  const snap = await F.getDocs(q);
  return snap.docs.map(d => d.data());
}
export function watchFriendships(uid, cb) {
  return F.onSnapshot(F.query(F.collection(fs, 'friendships'), F.where('users', 'array-contains', uid)),
    snap => cb(snap.docs.map(d => ({ ...d.data(), id: d.id })), { fromCache: snap.metadata.fromCache }),
    err => cb(null, { error: err && err.code }));
}
export const requestFriend = (me, other, names) => {
  const users = [me, other].sort();
  return F.setDoc(F.doc(fs, 'friendships', pairId(me, other)), { users, from: me, status: 'pending', names, ts: Date.now() });
};
export const acceptFriend = (me, other) => F.updateDoc(F.doc(fs, 'friendships', pairId(me, other)), { status: 'accepted' });
export const removeFriendship = (me, other) => F.deleteDoc(F.doc(fs, 'friendships', pairId(me, other)));
export const saveShared = (uid, obj) => F.setDoc(F.doc(fs, 'shared', uid), clean(obj));
export function watchShared(uid, cb) {
  return F.onSnapshot(F.doc(fs, 'shared', uid), s => cb(s.exists() ? s.data() : null), () => cb(null, true));
}
export const sendInbox = (toUid, obj) => F.setDoc(F.doc(fs, 'users', toUid, 'inbox', obj.id), clean(obj));
