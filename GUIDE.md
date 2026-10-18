# Lift — mise en ligne (gratuit, environ 20 minutes)

Tu vas faire 3 choses : créer ton projet **Firebase** (comptes + base de données), mettre le site sur **GitHub Pages**, puis installer l'app sur l'iPhone et le Mac.

---

## 1. Créer le projet Firebase

Va sur **https://console.firebase.google.com** (connecte-toi avec ton compte Google).

1. **Ajouter un projet** → donne-lui un nom (ex. `lift-evan`). Tu peux désactiver Google Analytics, il ne sert à rien ici.
2. Menu de gauche → **Build → Authentication** → **Commencer** → onglet **Sign-in method** → **E-mail/Mot de passe** → active la première option (pas « lien par e-mail ») → **Enregistrer**.
3. Menu de gauche → **Build → Firestore Database** → **Créer une base de données**.
   - Emplacement : choisis un emplacement en Europe (ex. `eur3` ou `europe-west`). Il ne pourra plus être changé.
   - Si la console te demande une édition, prends **Standard**.
   - Mode : **Production** (les règles seront remplacées à l'étape suivante).
4. Dans Firestore, onglet **Règles** : efface tout le contenu, copie-colle celui du fichier **`firestore.rules`**, puis **Publier**.
   C'est cette étape qui garantit que chaque utilisateur ne voit que ses propres séances. **Ne la saute pas.**
5. Roue dentée ⚙ (en haut à gauche) → **Paramètres du projet** → section **Vos applications** → icône **Web `</>`** → donne un nom → **Enregistrer** (ne coche pas Firebase Hosting).
6. Firebase affiche un bloc `firebaseConfig = { apiKey: ..., authDomain: ..., ... }`. Ouvre le fichier **`firebase-config.js`** de ce dossier et remplace chaque valeur « REMPLACE… » par celle affichée. Garde les guillemets.

Ces valeurs ne sont **pas des secrets** : elles identifient ton projet. La sécurité vient des règles de l'étape 4.

---

## 2. Mettre le site sur GitHub Pages

1. Crée un compte sur **https://github.com** si besoin, puis **New repository** : nom `lift`, visibilité **Public** (GitHub Pages est gratuit pour les dépôts publics), **Create repository**.
2. Sur la page du dépôt : **uploading an existing file** → glisse **tout le contenu** de ce dossier (fichiers **et** dossiers `icons`, `vendor`) → **Commit changes**.
   Ne mets jamais ta clé Gemini dans un fichier : elle se saisit dans l'app et reste sur l'appareil.
3. **Settings → Pages** → *Build and deployment* → Source : **Deploy from a branch** → branche `main`, dossier `/ (root)` → **Save**.
4. Après environ une minute, l'adresse apparaît en haut de la page : `https://TON-PSEUDO.github.io/lift/`.
5. Retourne dans Firebase → **Authentication → Settings → Authorized domains** → **Add domain** → ajoute `TON-PSEUDO.github.io`.

---

## 3. Installer l'app

- **iPhone** : ouvre l'adresse dans **Safari** → bouton Partager → **Sur l'écran d'accueil**. Utilise ensuite toujours l'icône de l'écran d'accueil.
- **Mac** : ouvre l'adresse dans Safari → menu **Fichier → Ajouter au Dock**. (Chrome : menu ⋮ → Enregistrer et partager → Installer.)

Crée ton compte (email + mot de passe) sur l'un, connecte-toi avec le même compte sur l'autre : tes séances se synchronisent en temps réel.

## 4. Brancher le coach IA

Onglet **Coach** → colle ta clé Gemini (aistudio.google.com/apikey) → « Tester la connexion ». La clé reste **sur l'appareil** : à saisir une fois sur chaque appareil.

## 5. Récupérer tes anciennes données

Dans l'**ancienne app** (Netlify) : Coach → **Exporter**. Dans la **nouvelle** : Coach → **Importer** → choisis le fichier. Les séances sont ajoutées à ton compte, rien n'est supprimé.

---

## Pour tes amis

Envoie-leur l'adresse du site. Chacun crée **son** compte et saisit **sa** clé Gemini gratuite : les séances sont strictement séparées.

À savoir :
- En tant que propriétaire du projet Firebase, tu peux techniquement voir leurs données dans la console. Dis-le-leur.
- Le plan gratuit a des quotas quotidiens (1 Go de stockage, 50 000 lectures et 20 000 écritures par jour). Pour quelques amis c'est très largement suffisant. Si un quota est dépassé, l'app s'arrête de se synchroniser jusqu'au lendemain, sans aucune facture (ces conditions peuvent évoluer, vérifie sur firebase.google.com/pricing).
- N'importe qui connaissant l'adresse peut créer un compte. Une fois tes amis inscrits, tu peux regarder dans Firebase → Authentication les réglages pour limiter les inscriptions.
- Mot de passe oublié : le lien « Mot de passe oublié ? » envoie un email de réinitialisation.

## Mettre à jour l'app plus tard

Modifie les fichiers sur GitHub (ou remplace-les). Dans `sw.js`, change `lift-cloud-v1` en `lift-cloud-v2` pour que les appareils récupèrent la nouvelle version.

## En cas de problème

- « Accès refusé par Firebase » → les règles de l'étape 1.4 ne sont pas publiées.
- « La connexion par email n'est pas activée » → étape 1.2.
- Écran « Configuration à faire » → `firebase-config.js` contient encore des « REMPLACE… ».
- Le site ne change pas après une mise à jour → ferme complètement l'app et rouvre-la (ou change le numéro de version dans `sw.js`).
