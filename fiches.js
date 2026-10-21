/* Fiches techniques des exercices — rédigées pour Lift.
   e = exécution, f = erreurs fréquentes, p = précaution, v = variantes et effet sur le recrutement.
   Repères généraux d'anatomie et de pratique ; ne remplacent pas l'avis d'un professionnel. */
export const FICHES = {
  /* ---------- Pectoraux ---------- */
  x1: {
    e: ['Omoplates serrées et abaissées dans le banc, légère cambrure lombaire, pieds ancrés au sol.', 'Barre descendue au bas des pectoraux, coudes à 45–70° du torse.', 'Poussée en arc léger vers le haut des yeux, sans décoller les fesses.'],
    f: ['Coudes ouverts à 90°, qui chargent l’articulation de l’épaule.', 'Rebond de la barre sur le sternum.', 'Fesses qui décollent pour raccourcir la trajectoire.'],
    p: 'Au-delà de charges lourdes, travaille avec un pareur ou des sécurités réglées à hauteur de poitrine.',
    v: 'Prise large : plus de pectoral, plus de contrainte sur l’épaule. Prise serrée : plus de triceps.'
  },
  x2: {
    e: ['Haltères au niveau des pectoraux, poignets à l’aplomb des coudes.', 'Descente jusqu’à sentir l’étirement, sans forcer au-delà.', 'En haut, rapproche les haltères sans les entrechoquer et garde une légère flexion de coude.'],
    f: ['Descente excessive qui tire sur l’épaule antérieure.', 'Trajectoire ramenée vers le visage.'],
    p: 'Mets-toi en position en basculant les haltères avec les genoux ; ne les lâche pas sur le côté en fin de série.',
    v: 'Amplitude supérieure à la barre et stabilisation plus exigeante : la charge sera plus basse à volume égal.'
  },
  x3: {
    e: ['Banc à 30° environ : au-delà, l’épaule prend le relais du pectoral.', 'Barre descendue haut sur la poitrine, sous les clavicules.', 'Omoplates maintenues serrées pendant toute la série.'],
    f: ['Banc trop relevé, qui transforme le mouvement en développé épaules.', 'Décollement des omoplates en fin de poussée.'],
    v: 'Cible le faisceau claviculaire (haut) du grand pectoral, avec une participation marquée du deltoïde antérieur.'
  },
  x4: {
    e: ['Banc à 30°, haltères au niveau du haut de la poitrine.', 'Coudes légèrement rentrés, pas en ligne avec les épaules.', 'Poussée convergente, sans verrouiller les coudes.'],
    f: ['Angle du banc trop prononcé.', 'Amplitude écourtée en haut par peur de la charge.'],
    v: 'Même cible que la version barre, avec plus d’amplitude et un travail de stabilisation supplémentaire.'
  },
  x5: {
    e: ['Règle le siège pour que les poignées soient à hauteur du bas des pectoraux.', 'Dos et omoplates plaqués au dossier.', 'Pousse sans verrouiller brutalement les coudes, reviens en contrôlant.'],
    f: ['Poignées trop hautes, qui déplacent le travail sur l’épaule.', 'Décollement du dos pour forcer.'],
    v: 'Trajectoire guidée : utile pour aller près de l’échec en sécurité, ou en fin de séance.'
  },
  x6: {
    e: ['Poignées à hauteur du haut de la poitrine.', 'Dos plaqué, omoplates basses.', 'Contraction marquée en fin de poussée, retour lent.'],
    f: ['Épaules qui remontent vers les oreilles.'],
    v: 'Version guidée du développé incliné : pratique pour travailler lourd sans pareur.'
  },
  x7: {
    e: ['Coudes à hauteur des épaules, légèrement fléchis et fixes.', 'Rapproche les coudes, pas les mains.', 'Retour contrôlé jusqu’à l’étirement, sans à-coup.'],
    f: ['Pousser avec les mains comme sur un développé.', 'Amplitude arrière excessive.'],
    p: 'Réduis l’amplitude arrière si tu as déjà eu mal à l’épaule.',
    v: 'Isole le grand pectoral en supprimant presque tout le travail des triceps.'
  },
  x8: {
    e: ['Poulies hautes pour viser le bas des pectoraux, basses pour le haut.', 'Buste légèrement penché, un pied devant pour la stabilité.', 'Coudes à peine fléchis, mains qui se croisent en fin de mouvement.'],
    f: ['Fléchir les coudes pour tricher sur la charge.', 'Mouvement lancé avec le buste.'],
    v: 'Tension constante sur toute l’amplitude, contrairement aux écartés avec haltères.'
  },
  x9: {
    e: ['Buste penché en avant d’environ 30°, jambes légèrement devant.', 'Coudes qui s’écartent un peu du corps.', 'Descente jusqu’à ce que les épaules passent sous les coudes, pas plus bas.'],
    f: ['Buste droit, qui déplace le travail sur les triceps.', 'Descente trop profonde.'],
    p: 'Exercice exigeant pour l’épaule : évite-le en cas de douleur antérieure ou de passé de luxation.',
    v: 'Le lest à la ceinture permet de progresser une fois le poids du corps maîtrisé.'
  },
  x10: {
    e: ['Corps gainé en ligne, mains un peu plus larges que les épaules.', 'Coudes à 45° du torse.', 'Poitrine proche du sol, puis poussée complète en écartant les omoplates en fin de mouvement.'],
    f: ['Bassin qui s’affaisse ou remonte.', 'Amplitude partielle.'],
    v: 'Pieds surélevés : davantage de haut des pectoraux. Mains surélevées : variante allégée.'
  },

  /* ---------- Dos ---------- */
  x11: {
    e: ['Prise pronation un peu plus large que les épaules.', 'Initie le mouvement en abaissant les omoplates avant de plier les bras.', 'Monte jusqu’au menton au-dessus de la barre, descends en contrôlant sans relâcher totalement en bas.'],
    f: ['Balancement du corps pour se lancer.', 'Amplitude partielle en haut comme en bas.'],
    v: 'Prise supination : plus de biceps. Prise large : accent sur la largeur du grand dorsal.'
  },
  x12: {
    e: ['Cuisses bien calées sous les boudins, buste très légèrement incliné en arrière.', 'Tire la barre vers le haut de la poitrine en abaissant les omoplates.', 'Remontée contrôlée jusqu’à l’étirement complet.'],
    f: ['Buste qui bascule en arrière pour accompagner la charge.', 'Barre tirée derrière la nuque.'],
    p: 'Évite la version derrière la nuque : elle place l’épaule en rotation externe extrême pour peu de bénéfice.',
    v: 'Alternative aux tractions quand le poids du corps est encore trop lourd.'
  },
  x13: {
    e: ['Dos droit, légère flexion de genoux, buste quasi vertical.', 'Tire la poignée vers le nombril en serrant les omoplates.', 'Retour contrôlé jusqu’à un étirement complet, sans arrondir le bas du dos.'],
    f: ['Balancement du buste d’avant en arrière.', 'Épaules qui remontent pendant la traction.'],
    v: 'Travaille l’épaisseur du dos : rhomboïdes, trapèzes moyens et grand dorsal.'
  },
  x14: {
    e: ['Buste penché entre 45° et l’horizontale, dos gainé et neutre.', 'Tire la barre vers le nombril, coudes le long du corps.', 'Descente contrôlée, sans laisser le dos s’arrondir.'],
    f: ['Dos arrondi sous la charge.', 'Buste qui se redresse à chaque répétition.'],
    p: 'Exigeant pour les lombaires : choisis une charge que tu contrôles buste immobile.',
    v: 'Prise supination : plus de grand dorsal et de biceps. Buste plus horizontal : plus de trapèzes moyens.'
  },
  x15: {
    e: ['Un genou et une main sur le banc, dos parallèle au sol.', 'Tire l’haltère vers la hanche, coude proche du corps.', 'Descente complète pour étirer le grand dorsal.'],
    f: ['Rotation du buste pour aider à monter la charge.', 'Tirage vers l’épaule plutôt que vers la hanche.'],
    v: 'Le travail unilatéral permet de corriger un déséquilibre droite/gauche.'
  },
  x16: {
    e: ['Poitrine calée contre le support, pieds stables.', 'Tire les poignées en amenant les coudes vers l’arrière.', 'Serre les omoplates en fin de traction, relâche progressivement.'],
    f: ['Poitrine décollée du support.'],
    v: 'Le support supprime la contrainte lombaire : utile après un soulevé de terre ou en cas de dos fatigué.'
  },
  x17: {
    e: ['Debout face à la poulie haute, buste légèrement penché, bras presque tendus.', 'Descends la barre vers les cuisses en gardant les coudes fixes.', 'Remontée lente jusqu’à l’étirement complet du dos.'],
    f: ['Plier les coudes, ce qui en fait un tirage.', 'Charge trop lourde qui force à utiliser le buste.'],
    v: 'Isole le grand dorsal sans faire intervenir les biceps.'
  },
  x18: {
    e: ['Barre contre les tibias, hanches plus hautes que les genoux, dos neutre et gainé.', 'Pousse dans le sol avec les jambes et garde la barre contre le corps.', 'Verrouille hanches et genoux en même temps, sans hyperextension lombaire.'],
    f: ['Dos arrondi au décollage.', 'Barre qui s’éloigne des jambes.', 'Tirer avec les bras.'],
    p: 'L’exercice le plus technique du catalogue : apprends le geste léger avant de charger, et arrête la série dès que le dos s’arrondit.',
    v: 'Sollicite toute la chaîne postérieure : ischio-jambiers, fessiers, érecteurs du rachis, trapèzes et avant-bras.'
  },
  x19: {
    e: ['Bras tendus, charge dans les mains le long du corps.', 'Hausse les épaules droit vers les oreilles.', 'Marque un temps en haut, redescends en contrôlant.'],
    f: ['Rotations d’épaules, inutiles et irritantes pour l’articulation.', 'Amplitude réduite par une charge excessive.'],
    v: 'Cible le faisceau supérieur du trapèze.'
  },

  /* ---------- Épaules ---------- */
  x20: {
    e: ['Debout ou assis, abdominaux gainés, fessiers serrés.', 'Barre partant du haut de la poitrine, trajectoire verticale devant le visage.', 'Passe la tête légèrement en avant une fois la barre au-dessus du front.'],
    f: ['Cambrure lombaire excessive pour compenser le manque de mobilité.', 'Version derrière la nuque.'],
    p: 'Ne descends pas la barre derrière la nuque : rotation externe extrême et risque pour l’épaule.',
    v: 'Debout : plus de gainage. Assis avec dossier : plus de charge sur les deltoïdes.'
  },
  x21: {
    e: ['Haltères au niveau des oreilles, coudes légèrement en avant du plan du corps.', 'Poussée convergente vers le haut sans entrechoquer les haltères.', 'Descente contrôlée jusqu’au niveau du menton.'],
    f: ['Coudes trop ouverts sur les côtés.', 'Cambrure du bas du dos.'],
    v: 'Les coudes légèrement en avant réduisent la contrainte sur l’épaule par rapport à la barre.'
  },
  x22: {
    e: ['Poignées à hauteur des épaules, dos plaqué.', 'Poussée complète sans verrouiller sèchement.', 'Retour lent jusqu’à l’angle droit au coude.'],
    f: ['Siège mal réglé, poignées trop basses ou trop hautes.'],
    v: 'Trajectoire guidée : pratique pour les séries longues en fin de séance.'
  },
  x23: {
    e: ['Buste très légèrement penché en avant, coudes un peu fléchis et fixes.', 'Monte jusqu’à l’horizontale, pas plus haut.', 'Mène le mouvement avec les coudes, pas avec les mains.'],
    f: ['Balancement du buste pour lancer la charge.', 'Épaules qui montent vers les oreilles.', 'Charge trop lourde, qui transforme l’exercice en haussement d’épaules.'],
    v: 'Isole le faisceau moyen du deltoïde, celui qui donne la largeur d’épaules.'
  },
  x24: {
    e: ['Poulie basse derrière le dos ou devant les jambes, câble passant devant le corps.', 'Même trajectoire qu’aux haltères, coudes fixes.', 'Arrêt à l’horizontale.'],
    f: ['Se pencher pour gagner de l’amplitude.'],
    v: 'Tension constante en bas de mouvement, là où les haltères n’en donnent presque aucune.'
  },
  x25: {
    e: ['Axe de la machine aligné avec l’articulation de l’épaule.', 'Pousse avec les coudes contre les coussinets.', 'Retour lent, sans laisser la charge retomber.'],
    f: ['Siège trop haut ou trop bas, qui désaligne l’épaule.'],
    v: 'Version guidée des élévations latérales : plus facile de prolonger la série.'
  },
  x26: {
    e: ['Buste penché vers l’avant, dos droit, ou poitrine calée sur un banc incliné.', 'Écarte les bras sur les côtés, coudes légèrement fléchis.', 'Serre brièvement les omoplates en fin de mouvement.'],
    f: ['Se redresser à chaque répétition.', 'Charge excessive qui fait intervenir les trapèzes.'],
    v: 'Cible le faisceau postérieur du deltoïde, souvent négligé et utile à la posture.'
  },
  x27: {
    e: ['Poitrine contre le dossier, poignées à hauteur d’épaules.', 'Écarte les bras vers l’arrière en gardant les coudes hauts.', 'Retour contrôlé sans relâcher la tension.'],
    f: ['Poignées trop basses, qui font travailler les trapèzes.'],
    v: 'Alternative guidée à l’oiseau, plus facile à exécuter proprement.'
  },
  x28: {
    e: ['Poulie à hauteur du visage, corde saisie en prise neutre.', 'Tire la corde vers le front en écartant les mains.', 'Finis en rotation externe, coudes à hauteur d’épaules.'],
    f: ['Tirer vers la poitrine, ce qui en fait un tirage horizontal.', 'Charge trop lourde qui empêche la rotation externe.'],
    v: 'Travaille le deltoïde postérieur et les rotateurs externes : bon contrepoids à tout le travail de poussée.'
  },

  /* ---------- Biceps ---------- */
  x29: {
    e: ['Coudes fixes le long du corps, buste immobile.', 'Monte la barre jusqu’à la contraction complète.', 'Descente lente jusqu’à l’extension quasi complète.'],
    f: ['Balancement du buste.', 'Coudes qui avancent en fin de montée.'],
    p: 'La barre EZ ménage les poignets si la barre droite te gêne.',
    v: 'Prise large : accent sur le chef court. Prise serrée : accent sur le chef long.'
  },
  x30: {
    e: ['Bras le long du corps, paumes vers l’avant au départ ou en supination progressive.', 'Monte sans avancer le coude.', 'Descente complète, contrôlée.'],
    f: ['Monter les deux bras en se penchant alternativement.'],
    v: 'En alternant les bras, tu peux mieux contrôler chaque côté.'
  },
  x31: {
    e: ['Banc incliné à 45–60°, bras pendant librement derrière le plan du corps.', 'Monte sans avancer les coudes.', 'Descente complète pour conserver l’étirement.'],
    f: ['Avancer les épaules pour aider la montée.'],
    v: 'L’épaule en extension étire le chef long du biceps : c’est tout l’intérêt de la variante.'
  },
  x32: {
    e: ['Prise neutre, pouces vers le haut, coudes fixes.', 'Monte vers l’épaule opposée ou droit devant.', 'Descente contrôlée.'],
    f: ['Rotation du poignet en cours de montée.'],
    v: 'Sollicite le brachial et le brachio-radial : c’est l’exercice de l’épaisseur du bras et de l’avant-bras.'
  },
  x33: {
    e: ['Aisselles calées sur le pupitre, bras entièrement en appui.', 'Montée jusqu’à la contraction, sans décoller les coudes.', 'Descente lente, extension presque complète en bas.'],
    f: ['Décoller les coudes pour finir la répétition.', 'Lâcher la charge en bas, le bras tendu sous tension brutale.'],
    p: 'Ne relâche jamais d’un coup en bas : le coude est en position vulnérable.',
    v: 'Le bras fixé en avant met l’accent sur le chef court du biceps.'
  },
  x34: {
    e: ['Debout face à la poulie basse, coudes fixes le long du corps.', 'Monte en contractant, redescends en résistant.', 'Garde le buste immobile.'],
    f: ['Reculer pour aider la montée.'],
    v: 'Tension constante sur toute l’amplitude, ce que la barre ne donne pas en haut.'
  },

  /* ---------- Triceps ---------- */
  x35: {
    e: ['Coudes serrés le long du corps, buste légèrement penché.', 'Pousse vers le bas et écarte les brins de la corde en fin de mouvement.', 'Remontée contrôlée jusqu’à l’angle droit.'],
    f: ['Coudes qui s’écartent ou avancent.', 'Buste qui pousse sur la charge.'],
    v: 'La corde permet une contraction finale plus complète que la barre.'
  },
  x36: {
    e: ['Prise pronation, mains écartées de la largeur des épaules.', 'Coudes bloqués le long du corps.', 'Extension complète, retour contrôlé.'],
    f: ['Se pencher en avant pour pousser avec le poids du corps.'],
    v: 'Prise inversée (supination) : accent sur le chef médial.'
  },
  x37: {
    e: ['Allongé, barre EZ, bras inclinés vers l’arrière plutôt qu’à la verticale.', 'Descends la barre vers le haut du front ou derrière la tête.', 'Coudes aussi fixes que possible.'],
    f: ['Coudes qui s’écartent.', 'Bras strictement verticaux, qui suppriment la tension en haut.'],
    p: 'Mouvement exigeant pour les coudes : échauffe-les et reste sur une charge contrôlable.',
    v: 'L’inclinaison des bras vers l’arrière étire le chef long du triceps.'
  },
  x38: {
    e: ['Buste le plus vertical possible, jambes sous le corps.', 'Coudes serrés le long du tronc.', 'Descente jusqu’à l’angle droit au coude.'],
    f: ['Pencher le buste, ce qui ramène le travail sur les pectoraux.', 'Descente trop profonde.'],
    p: 'À éviter en cas de douleur d’épaule antérieure.',
    v: 'Sur banc, pieds au sol : version allégée, mais plus contraignante pour l’épaule.'
  },
  x39: {
    e: ['Haltère tenu à deux mains au-dessus de la tête, coudes serrés et dirigés vers le haut.', 'Descends derrière la nuque jusqu’à l’étirement.', 'Extension complète sans verrouiller sèchement.'],
    f: ['Coudes qui s’écartent largement.', 'Cambrure lombaire.'],
    v: 'Bras au-dessus de la tête : c’est la position qui étire le plus le chef long du triceps.'
  },
  x40: {
    e: ['Coudes calés sur le support, alignés avec l’axe de la machine.', 'Extension complète, retour contrôlé.'],
    f: ['Décoller les coudes du support.'],
    v: 'Version guidée : utile pour finir la séance en sécurité.'
  },
  x41: {
    e: ['Buste penché, bras parallèle au sol, coude fixe et haut.', 'Tends le bras vers l’arrière et marque la contraction.', 'Retour lent.'],
    f: ['Coude qui descend au fil des répétitions.', 'Mouvement lancé avec l’épaule.'],
    v: 'Bras léger : garde une charge modérée et cherche la contraction plutôt que le poids.'
  },

  /* ---------- Quadriceps ---------- */
  x42: {
    e: ['Barre sur les trapèzes, pieds écartés de la largeur des épaules, pointes légèrement ouvertes.', 'Descends en poussant les hanches en arrière et les genoux vers l’extérieur.', 'Descends au moins jusqu’aux cuisses parallèles si la mobilité le permet, dos neutre.'],
    f: ['Genoux qui rentrent vers l’intérieur.', 'Bas du dos qui s’enroule en bas de la descente.', 'Talons qui décollent.'],
    p: 'Utilise les sécurités de la cage. Si les talons décollent, travaille la mobilité de cheville ou surélève légèrement les talons.',
    v: 'Barre haute : plus de quadriceps. Barre basse : plus de fessiers et d’ischio-jambiers.'
  },
  x43: {
    e: ['Pieds légèrement en avant de l’aplomb des hanches, dos plaqué à la barre.', 'Descente jusqu’aux cuisses parallèles.', 'Poussée dans tout le pied.'],
    f: ['Pieds trop en avant, qui chargent les genoux en cisaillement.'],
    v: 'La trajectoire fixe supprime le travail d’équilibre : tu peux pousser plus lourd mais tu gagnes moins en stabilité.'
  },
  x44: {
    e: ['Dos et bassin entièrement plaqués, pieds à mi-hauteur de la plateforme.', 'Descends jusqu’à 90° au genou, ou plus bas si le bassin ne décolle pas.', 'Ne verrouille pas les genoux en fin de poussée.'],
    f: ['Bassin qui s’enroule en bas, le fameux décollement lombaire.', 'Mains sur les genoux.'],
    p: 'Arrête la descente dès que le bas du dos décolle du dossier.',
    v: 'Pieds hauts : plus de fessiers et d’ischio-jambiers. Pieds bas : plus de quadriceps.'
  },
  x45: {
    e: ['Axe de rotation de la machine aligné avec le genou.', 'Extension complète, temps d’arrêt bref en haut.', 'Retour contrôlé sans laisser la charge chuter.'],
    f: ['À-coups en fin d’extension.', 'Siège mal réglé.'],
    v: 'Seul exercice qui isole le quadriceps sans solliciter les fessiers.'
  },
  x46: {
    e: ['Dos plaqué, pieds à plat au milieu de la plateforme.', 'Descente contrôlée jusqu’aux cuisses parallèles ou en dessous.', 'Poussée sans verrouillage brutal.'],
    f: ['Décoller les talons.', 'Rebondir en bas.'],
    v: 'Dos soutenu : l’accent va sur les quadriceps, avec peu de contrainte lombaire.'
  },
  x47: {
    e: ['Pas assez long pour que le genou avant reste au-dessus du pied.', 'Descends le genou arrière vers le sol, buste droit.', 'Pousse sur le talon avant pour enchaîner.'],
    f: ['Pas trop courts, qui surchargent le genou avant.', 'Buste qui s’effondre en avant.'],
    v: 'Grands pas : plus de fessiers. Petits pas : plus de quadriceps.'
  },
  x48: {
    e: ['Pied arrière sur un banc, pied avant assez loin devant.', 'Descends à la verticale, genou arrière vers le sol.', 'Buste droit pour les quadriceps, légèrement penché pour les fessiers.'],
    f: ['Pied avant trop près du banc.', 'Perte d’équilibre faute de point de repère.'],
    v: 'Exercice unilatéral exigeant : excellent pour corriger un déséquilibre entre les deux jambes.'
  },

  /* ---------- Ischios ---------- */
  x49: {
    e: ['Dossier réglé pour que le genou soit aligné avec l’axe de la machine.', 'Ceinture serrée sur les cuisses.', 'Fléchis complètement, retour lent.'],
    f: ['Décoller le bassin pour forcer.'],
    v: 'Hanche fléchie : les ischio-jambiers sont plus étirés qu’en version allongée, ce qui semble favoriser le développement du chef long.'
  },
  x50: {
    e: ['Bassin bien à plat sur le banc, genou aligné avec l’axe.', 'Fléchis jusqu’à la contraction complète.', 'Retour contrôlé, sans extension sèche.'],
    f: ['Bassin qui décolle en fin de flexion.', 'À-coups.'],
    v: 'Complémentaire du leg curl assis : les deux versions travaillent les ischio-jambiers à des longueurs différentes.'
  },
  x51: {
    e: ['Jambes quasi tendues, légère flexion de genou constante.', 'Pousse les hanches en arrière et descends la barre le long des jambes.', 'Remonte dès que l’étirement est maximal, dos neutre.'],
    f: ['Arrondir le bas du dos pour descendre plus bas.', 'Plier les genoux comme sur un soulevé de terre classique.'],
    p: 'L’amplitude est dictée par la souplesse de tes ischio-jambiers, pas par le sol.',
    v: 'Étire fortement les ischio-jambiers et travaille les fessiers en fin de remontée.'
  },
  x52: {
    e: ['Barre sur les trapèzes, genoux légèrement fléchis.', 'Penche le buste en poussant les hanches en arrière, dos gainé.', 'Remonte en contractant les fessiers.'],
    f: ['Dos arrondi.', 'Charge excessive sur un mouvement à grand bras de levier.'],
    p: 'Très exigeant pour les lombaires : reste léger et privilégie la technique.',
    v: 'Travaille les ischio-jambiers et les érecteurs du rachis en chaîne.'
  },

  /* ---------- Fessiers ---------- */
  x53: {
    e: ['Omoplates appuyées sur un banc, barre sur le pli de la hanche avec une protection.', 'Pieds à plat, tibias verticaux en position haute.', 'Monte jusqu’à l’alignement épaules-hanches-genoux, menton rentré.'],
    f: ['Hyperextension lombaire en haut au lieu d’une contraction des fessiers.', 'Pieds trop proches ou trop loin.'],
    v: 'L’exercice le plus direct pour le grand fessier, avec une contrainte faible sur le bas du dos.'
  },
  x54: {
    e: ['Coussin sur les hanches, dos plaqué au dossier.', 'Pousse par les talons jusqu’à l’extension complète.', 'Marque un temps en haut.'],
    f: ['Amplitude écourtée.'],
    v: 'Version guidée du hip thrust : mise en place beaucoup plus rapide.'
  },
  x55: {
    e: ['Dos contre le dossier, légère inclinaison du buste en avant.', 'Écarte les genoux en contrôlant, marque la contraction.', 'Retour lent sans laisser claquer la charge.'],
    f: ['Mouvement lancé par à-coups.'],
    v: 'Cible le moyen et le petit fessier, importants pour la stabilité du bassin.'
  },
  x56: {
    e: ['Sangle à la cheville, buste penché en appui.', 'Pousse la jambe en arrière en contractant le fessier.', 'Retour contrôlé, sans cambrer.'],
    f: ['Cambrure lombaire pour gagner de l’amplitude.'],
    v: 'Isolation du grand fessier, utile en complément du hip thrust.'
  },

  /* ---------- Mollets ---------- */
  x57: {
    e: ['Avant-pieds sur la marche, talons dans le vide.', 'Descends jusqu’à l’étirement complet, monte jusqu’à l’extension maximale.', 'Marque un temps en haut et en bas, sans rebond.'],
    f: ['Rebondir sur le tendon d’Achille.', 'Amplitude partielle.'],
    v: 'Jambes tendues : accent sur les gastrocnémiens, le muscle visible du mollet.'
  },
  x58: {
    e: ['Coussin sur le bas des cuisses, avant-pieds sur la cale.', 'Amplitude complète, temps d’arrêt en haut.'],
    f: ['Séries trop rapides sans contraction.'],
    v: 'Genou fléchi : les gastrocnémiens sont relâchés, le travail porte sur le soléaire, situé en dessous.'
  },
  x59: {
    e: ['Avant-pieds en bas de la plateforme, genoux presque tendus.', 'Pousse en extension complète de cheville, descends en contrôlant.'],
    f: ['Plier les genoux pour aider.'],
    p: 'Garde les sécurités enclenchées : les pieds peuvent glisser de la plateforme.',
    v: 'Permet des charges élevées sans compression de la colonne.'
  },

  /* ---------- Abdos ---------- */
  x60: {
    e: ['À genoux face à la poulie haute, corde près du front.', 'Enroule la colonne vertèbre après vertèbre en rapprochant les côtes du bassin.', 'Déroule lentement.'],
    f: ['Plier les hanches au lieu d’enrouler le dos.', 'Tirer avec les bras.'],
    v: 'Permet d’ajouter de la charge progressivement, ce que le crunch au sol ne permet pas.'
  },
  x61: {
    e: ['Dos calé, mains sur les poignées.', 'Enroule le buste en soufflant, pas de traction avec les bras.', 'Retour contrôlé.'],
    f: ['Pousser avec les bras ou les épaules.'],
    v: 'Trajectoire guidée : pratique pour charger les abdominaux en sécurité.'
  },
  x62: {
    e: ['Suspendu ou sur chaise romaine, épaules basses et actives.', 'Monte les genoux ou les jambes en enroulant le bassin vers le haut.', 'Descente lente, sans balancement.'],
    f: ['Se balancer pour lancer les jambes.', 'Ne monter que les cuisses sans enrouler le bassin.'],
    v: 'Enrouler le bassin est ce qui fait travailler les abdominaux plutôt que les fléchisseurs de hanche.'
  },
  x63: {
    e: ['À genoux, bras tendus, abdominaux et fessiers contractés.', 'Déroule vers l’avant sans laisser le bas du dos se creuser.', 'Reviens en contractant les abdominaux.'],
    f: ['Cambrure lombaire en position basse.', 'Aller trop loin trop tôt.'],
    p: 'Commence avec une amplitude courte face à un mur, puis augmente progressivement.',
    v: 'Travail anti-extension : les abdominaux luttent contre l’ouverture du tronc, ce qui est leur rôle réel.'
  },

  /* ---------- Smith machine ---------- */
  x64: {
    e: ['Place le banc de façon que la barre descende au bas des pectoraux.', 'Omoplates serrées, pieds ancrés.', 'Utilise les crochets de sécurité en fin de série.'],
    f: ['Banc mal positionné, barre qui descend sur la gorge ou sur le ventre.'],
    v: 'Trajectoire fixe : tu peux aller à l’échec sans pareur, mais le travail de stabilisation disparaît.'
  },
  x65: {
    e: ['Banc à 30°, barre à hauteur du haut de la poitrine.', 'Omoplates basses et serrées pendant toute la série.'],
    f: ['Banc trop relevé.'],
    v: 'Le guidage permet de se concentrer sur le haut des pectoraux sans gérer l’équilibre.'
  },
  x66: {
    e: ['Banc décliné, barre descendue au bas des pectoraux.', 'Cale bien les jambes avant de commencer.'],
    f: ['Descente trop haute, vers le sternum.'],
    p: 'La tête en bas peut donner des vertiges : évite les séries très longues.',
    v: 'Accent sur le faisceau inférieur du grand pectoral, avec moins de contrainte d’épaule qu’en incliné.'
  },
  x67: {
    e: ['Mains écartées de la largeur des épaules, pas moins.', 'Coudes serrés le long du corps.', 'Barre descendue au bas des pectoraux.'],
    f: ['Prise trop serrée, qui met les poignets en tension.'],
    v: 'Exercice de triceps avec charge lourde, les pectoraux restant fortement impliqués.'
  },
  x68: {
    e: ['Buste penché à 45° ou à l’horizontale, dos gainé.', 'Tire la barre vers le nombril.', 'Règle la hauteur de départ pour ne pas avoir à arrondir le dos.'],
    f: ['Dos arrondi.', 'Buste qui se redresse à chaque répétition.'],
    v: 'La trajectoire fixe facilite le maintien de la position, mais impose de bien placer les pieds.'
  },
  x69: {
    e: ['Assis, barre à hauteur du menton au départ.', 'Trajectoire verticale devant le visage.', 'Dos plaqué au dossier.'],
    f: ['Barre passée derrière la nuque.'],
    p: 'Reste sur la version devant la tête.',
    v: 'Permet de pousser lourd sur les deltoïdes sans travail d’équilibre.'
  },
  x70: {
    e: ['Mains écartées de la largeur des épaules au minimum.', 'Monte la barre jusqu’au niveau de la poitrine, pas plus haut.', 'Coudes qui mènent le mouvement.'],
    f: ['Prise trop serrée et montée jusqu’au menton, posture qui pince l’épaule.'],
    p: 'En cas de gêne à l’épaule, remplace par des élévations latérales.',
    v: 'Travaille le deltoïde moyen et les trapèzes.'
  },
  x71: {
    e: ['Pied arrière surélevé ou en arrière, pied avant bien placé sous la barre.', 'Descente verticale, buste droit.', 'Pousse sur tout le pied avant.'],
    f: ['Pied avant mal placé, genou qui part loin devant.'],
    v: 'Le guidage supprime le problème d’équilibre du squat bulgare classique.'
  },
  x72: {
    e: ['Barre contre les cuisses, genoux à peine fléchis.', 'Pousse les hanches en arrière, dos neutre.', 'Descends jusqu’à l’étirement des ischio-jambiers.'],
    f: ['Dos arrondi.', 'Pieds mal placés par rapport à la barre fixe.'],
    v: 'La barre guidée impose une trajectoire verticale : place-toi de façon à la garder contre les jambes.'
  },
  x73: {
    e: ['Avant-pieds sur une cale, barre sur les trapèzes.', 'Amplitude complète, temps d’arrêt en haut et en bas.'],
    f: ['Rebondir.'],
    v: 'Permet de charger les mollets lourd sans problème d’équilibre.'
  },
  x74: {
    e: ['Barre derrière les fessiers, bras tendus.', 'Hausse les épaules droit vers le haut.', 'Temps d’arrêt en haut, descente contrôlée.'],
    f: ['Pencher le buste en avant.'],
    v: 'La barre dans le dos ouvre la poitrine et empêche les épaules de s’enrouler vers l’avant.'
  },
  x75: {
    e: ['Omoplates sur un banc, barre sur le pli de la hanche avec une protection.', 'Pieds placés pour que les tibias soient verticaux en haut.', 'Extension complète, menton rentré.'],
    f: ['Hyperextension lombaire en haut.'],
    v: 'Mise en place plus rapide et plus stable qu’avec une barre libre.'
  },

  /* ---------- Divers ---------- */
  x76: {
    e: ['Banc décliné, jambes bien calées.', 'Barre descendue au bas des pectoraux, coudes modérément écartés.', 'Poussée verticale.'],
    f: ['Descente trop haute.'],
    p: 'Travaille avec un pareur : la sortie de barre est délicate en position déclinée.',
    v: 'Cible le faisceau inférieur du grand pectoral et ménage l’épaule par rapport à l’incliné.'
  },
  x77: {
    e: ['Allongé, haltères au-dessus de la poitrine, coudes légèrement fléchis et fixes.', 'Écarte les bras jusqu’à l’étirement, sans descendre plus bas que le niveau du banc.', 'Remonte en rapprochant les coudes, pas les mains.'],
    f: ['Transformer le mouvement en développé en pliant les coudes.', 'Descente excessive.'],
    p: 'Exercice très étirant pour l’épaule : reste modéré en charge.',
    v: 'Étirement maximal du grand pectoral, sans travail des triceps.'
  },
  x78: {
    e: ['Mains écartées de la largeur des épaules, poignets alignés avec les avant-bras.', 'Coudes serrés le long du corps.', 'Barre descendue au bas des pectoraux.'],
    f: ['Prise trop serrée, douloureuse pour les poignets.', 'Coudes qui s’ouvrent.'],
    v: 'Permet de charger lourd les triceps, avec une participation importante des pectoraux et du deltoïde antérieur.'
  },
  x79: {
    e: ['Poignée en V ou prise serrée en supination.', 'Tire vers le haut de la poitrine en abaissant les omoplates.', 'Remontée complète.'],
    f: ['Buste qui bascule fortement en arrière.'],
    v: 'La prise serrée augmente l’amplitude du grand dorsal et fait davantage travailler les biceps.'
  },
  x80: {
    e: ['Buste penché, poitrine éventuellement calée sur le support.', 'Tire la barre vers le ventre, coudes proches du corps.', 'Descente complète.'],
    f: ['Se redresser pour lancer la charge.'],
    v: 'Le support, quand il existe, supprime la contrainte lombaire du rowing barre.'
  },
  x81: {
    e: ['Coussin juste sous les hanches pour pouvoir fléchir librement.', 'Descends en gardant le dos droit, remonte jusqu’à l’alignement.', 'Ne dépasse pas l’alignement en haut.'],
    f: ['Hyperextension en fin de montée.', 'À-coups.'],
    v: 'Travaille les érecteurs du rachis, les fessiers et les ischio-jambiers : bon exercice de prévention pour le dos.'
  },
  x82: {
    e: ['Départ paumes vers soi au niveau du menton.', 'Tourne les paumes vers l’avant en poussant vers le haut.', 'Redescends en inversant la rotation.'],
    f: ['Rotation faite trop tôt ou trop tard.', 'Cambrure lombaire.'],
    v: 'La rotation ajoute du travail au deltoïde antérieur sur toute l’amplitude.'
  },
  x83: {
    e: ['Bras le long du corps, coudes à peine fléchis.', 'Monte jusqu’à l’horizontale, pas au-dessus.', 'Descente contrôlée, sans balancement.'],
    f: ['Se cambrer pour lancer la charge.', 'Monter trop haut.'],
    v: 'Isole le deltoïde antérieur, déjà très sollicité par tous les développés : à doser.'
  },
  x84: {
    e: ['Assis, coude calé contre l’intérieur de la cuisse.', 'Monte jusqu’à la contraction maximale.', 'Descente lente jusqu’à l’extension.'],
    f: ['Décoller le coude de la cuisse.', 'Tirer avec l’épaule.'],
    v: 'Le coude fixé donne une contraction très marquée : exercice de finition plus que de charge.'
  },
  x85: {
    e: ['Haltères le long du corps, pas assez long.', 'Descends le genou arrière vers le sol, buste droit.', 'Pousse sur le talon avant.'],
    f: ['Pas trop court.', 'Genou avant qui dépasse largement la pointe du pied.'],
    v: 'Les haltères déchargent la colonne par rapport à la version barre.'
  },
  x86: {
    e: ['Allongé, genoux fléchis, mains sur la poitrine ou les tempes sans tirer sur la nuque.', 'Enroule le haut du dos en soufflant.', 'Descente lente sans relâcher complètement.'],
    f: ['Tirer sur la nuque avec les mains.', 'Monter le buste entier au lieu d’enrouler.'],
    v: 'Amplitude courte par nature : cherche la contraction, pas le nombre de répétitions.'
  },

  /* ---------- variantes et unilatéral ---------- */
  x87: {
    e: ['Prise supination, mains à largeur d’épaules.', 'Abaisse les omoplates avant de tirer avec les bras.', 'Menton au-dessus de la barre, descente contrôlée sans relâcher en bas.'],
    f: ['Balancement du bassin pour se lancer.', 'Coudes qui partent vers l’avant.'],
    v: 'La supination raccourcit le bras de levier et fait beaucoup plus travailler le biceps que la prise pronation.'
  },
  x88: {
    e: ['Poignées parallèles, paumes face à face.', 'Tire en amenant la poitrine vers les mains.', 'Descente complète, épaules actives en bas.'],
    f: ['Amplitude écourtée en haut.'],
    p: 'C’est la prise la plus confortable pour l’épaule et le coude : bonne porte d’entrée si la pronation te gêne.',
    v: 'Équilibre entre grand dorsal, brachial et brachio-radial.'
  },
  x89: {
    e: ['Poignée simple, assis de biais ou à genoux face à la poulie.', 'Tire le coude vers la hanche en abaissant l’omoplate.', 'Laisse l’épaule monter en fin de remontée pour étirer le dos.'],
    f: ['Tourner le buste pour aider.', 'Tirer uniquement avec le bras.'],
    v: 'Le travail à un bras augmente l’amplitude et permet de corriger un retard d’un côté.'
  },
  x90: {
    e: ['Une poignée, buste droit et immobile.', 'Tire le coude vers l’arrière, le long du corps.', 'Retour complet, en laissant l’omoplate s’avancer.'],
    f: ['Rotation du buste à chaque répétition.'],
    v: 'Permet de sentir l’omoplate travailler, souvent noyée dans la version à deux bras.'
  },
  x91: {
    e: ['Barre au sol à chaque répétition, buste proche de l’horizontale.', 'Tire explosivement vers le nombril, dos gainé et neutre.', 'Repose la barre complètement avant la répétition suivante.'],
    f: ['Dos arrondi au décollage.', 'Enchaîner sans reposer la barre, ce qui en fait un rowing classique.'],
    p: 'Très exigeant pour les lombaires : garde une charge que tu contrôles buste immobile.',
    v: 'L’arrêt au sol supprime l’élan et oblige à repartir de zéro à chaque répétition.'
  },
  x92: {
    e: ['Un haltère dans chaque main, bras tendus le long du corps.', 'Hausse les épaules droit vers le haut, temps d’arrêt en haut.', 'Descente contrôlée jusqu’à l’étirement.'],
    f: ['Rotations d’épaules.', 'Plier les coudes pour tricher.'],
    v: 'Les haltères laissent les bras le long du corps, position plus naturelle que la barre devant les cuisses.'
  },
  x93: {
    e: ['Buste penché vers l’avant, poulie basse, câble passant devant le corps.', 'Écarte le bras vers l’extérieur et l’arrière, coude à peine fléchi.', 'Retour lent sans relâcher la tension.'],
    f: ['Se redresser pendant le mouvement.', 'Charge trop lourde qui fait intervenir le trapèze.'],
    v: 'Mélange d’élévation latérale et d’oiseau : touche le faisceau moyen et le faisceau postérieur.'
  },
  x94: {
    e: ['Un seul haltère, l’autre main tient un appui pour stabiliser le buste.', 'Monte jusqu’à l’horizontale, coude légèrement fléchi.', 'Descente lente, sans balancement.'],
    f: ['Pencher le buste du côté opposé pour aider.'],
    v: 'L’appui supprime la triche du buste : charge plus faible, mais travail plus propre.'
  },
  x95: {
    e: ['Assis ou debout, un seul haltère, abdominaux gainés.', 'Poussée verticale, coude légèrement en avant du plan du corps.', 'Descente jusqu’au niveau du menton.'],
    f: ['Cambrure lombaire pour compenser.', 'Inclinaison du buste du côté opposé.'],
    v: 'Oblige le tronc à résister à la rotation : gainage en plus du travail d’épaule.'
  },
  x96: {
    e: ['Coude collé au corps, fléchi à 90°, poulie à hauteur du coude.', 'Fais tourner l’avant-bras vers l’extérieur sans bouger le coude.', 'Retour lent.'],
    f: ['Décoller le coude du corps.', 'Charge excessive, qui transforme le geste en tirage.'],
    p: 'Exercice de prévention : reste très léger, la coiffe des rotateurs est un petit muscle.',
    v: 'Travaille les rotateurs externes, le contrepoids de tout le travail de poussée.'
  },
  x97: {
    e: ['Une poignée à hauteur du visage, tirage vers la tempe.', 'Finis en rotation externe, coude à hauteur d’épaule.', 'Retour contrôlé.'],
    f: ['Tirer vers la poitrine.'],
    v: 'Même cible que le face pull classique, avec plus d’amplitude par bras.'
  },
  x98: {
    e: ['Poulie basse, coude fixe le long du corps.', 'Monte en contractant, redescends en résistant.', 'Buste immobile.'],
    f: ['Reculer pour aider la montée.', 'Coude qui avance.'],
    v: 'Tension constante sur toute l’amplitude. À deux poulies en même temps, un bras de chaque côté, la charge affichée est celle d’un seul côté.'
  },
  x99: {
    e: ['Bras calés sur le pupitre, poulie basse devant.', 'Montée complète sans décoller les coudes.', 'Descente lente, extension presque complète en bas.'],
    f: ['Relâcher d’un coup en bas, le coude en position vulnérable.'],
    p: 'Ne lâche jamais la charge en bas : laisse redescendre en résistant.',
    v: 'La poulie garde de la tension en haut, là où la barre n’en donne plus.'
  },
  x100: {
    e: ['Poitrine calée sur un banc incliné, bras pendants à la verticale.', 'Monte les haltères sans bouger les coudes.', 'Contraction marquée en haut, descente lente.'],
    f: ['Décoller la poitrine du banc.'],
    v: 'Le bras à la verticale met la tension maximale en position contractée.'
  },
  x101: {
    e: ['Une poignée, coude serré le long du corps.', 'Extension complète, petite rotation du poignet en fin de mouvement.', 'Remontée contrôlée jusqu’à l’angle droit.'],
    f: ['Coude qui s’écarte ou avance.', 'Buste qui pousse sur la charge.'],
    v: 'Permet de corriger un déséquilibre entre les deux bras, fréquent sur les triceps.'
  },
  x102: {
    e: ['Haltère au-dessus de la tête, un seul bras, coude dirigé vers le haut.', 'Descends derrière la nuque jusqu’à l’étirement.', 'Extension complète sans verrouiller sèchement.'],
    f: ['Coude qui part sur le côté.', 'Cambrure lombaire.'],
    v: 'Bras au-dessus de la tête : c’est la position qui étire le plus le chef long du triceps.'
  },
  x103: {
    e: ['Une seule jambe, axe de la machine aligné avec le genou.', 'Extension complète, temps d’arrêt en haut.', 'Retour contrôlé sans laisser la charge chuter.'],
    f: ['Décoller le bassin du siège.'],
    v: 'Révèle les écarts entre les deux jambes que la version bilatérale masque.'
  },
  x104: {
    e: ['Un pied au centre de la plateforme, bassin bien plaqué.', 'Descends jusqu’à 90° au genou, sans décoller le bas du dos.', 'Poussée sans verrouiller le genou.'],
    f: ['Bassin qui s’enroule en bas.', 'Pied trop haut ou trop bas sur la plateforme.'],
    p: 'Charge nettement plus légère qu’à deux jambes : commence prudemment.',
    v: 'Bonne alternative au squat bulgare quand l’équilibre ou le dos limite.'
  },
  x105: {
    e: ['Banc ou caisse à hauteur de genou, pied entier posé dessus.', 'Pousse avec la jambe du dessus, sans impulsion de la jambe au sol.', 'Descente contrôlée, le pied arrière effleure le sol.'],
    f: ['Prendre appui sur la jambe restée au sol.', 'Marche trop haute, qui fait basculer le buste.'],
    v: 'Très transférable aux escaliers et à la course. Plus la marche est haute, plus les fessiers travaillent.'
  },
  x106: {
    e: ['Pas vers l’arrière, genou arrière vers le sol.', 'Buste droit, poids sur le talon avant.', 'Reviens en poussant sur la jambe avant.'],
    f: ['Pas trop court, genou avant qui part loin devant.'],
    v: 'Moins traumatisant pour le genou que la fente avant, car il n’y a pas de freinage à l’impact.'
  },
  x107: {
    e: ['Une seule jambe, bassin à plat sur le banc.', 'Fléchis jusqu’à la contraction complète.', 'Retour lent sans extension sèche.'],
    f: ['Décoller le bassin en fin de flexion.'],
    v: 'Permet de rattraper un côté plus faible, fréquent après une blessure.'
  },
  x108: {
    e: ['En appui sur une jambe, haltère dans la main opposée.', 'Penche le buste en poussant la hanche en arrière, jambe libre tendue derrière.', 'Dos neutre, remonte en contractant le fessier.'],
    f: ['Dos arrondi.', 'Hanche qui s’ouvre sur le côté.'],
    p: 'Cherche d’abord l’équilibre à vide : la technique prime sur la charge.',
    v: 'Travaille les ischio-jambiers, le fessier et la stabilité de la hanche en même temps.'
  },
  x109: {
    e: ['Omoplates sur un banc, une seule jambe au sol, tibia vertical en haut.', 'Monte jusqu’à l’alignement épaules-hanches-genou, menton rentré.', 'Garde le bassin horizontal, sans rotation.'],
    f: ['Bassin qui s’affaisse du côté libre.', 'Hyperextension lombaire en haut.'],
    v: 'Oblige le moyen fessier à stabiliser le bassin en plus du travail du grand fessier.'
  },
  x110: {
    e: ['Sangle à la cheville, poulie basse, appui sur l’autre jambe.', 'Écarte la jambe sur le côté sans pencher le buste.', 'Retour contrôlé.'],
    f: ['Se pencher du côté opposé pour gagner de l’amplitude.'],
    v: 'Tension constante, contrairement à la machine qui en perd en fin de course.'
  },
  x111: {
    e: ['Dos plaqué, genoux alignés avec l’axe de la machine.', 'Resserre les cuisses en contrôlant, temps d’arrêt en fin de course.', 'Retour lent sans laisser claquer la charge.'],
    f: ['À-coups en fin d’ouverture.'],
    p: 'Ouvre progressivement l’amplitude : les adducteurs se claquent facilement à froid.',
    v: 'Utile en complément des fentes et du squat, où les adducteurs travaillent déjà.'
  },
  x112: {
    e: ['Un seul avant-pied sur la marche, l’autre jambe relevée.', 'Descends jusqu’à l’étirement complet, monte jusqu’à l’extension maximale.', 'Temps d’arrêt en haut et en bas, sans rebond.'],
    f: ['Rebondir sur le tendon d’Achille.'],
    v: 'Permet de charger lourd au poids du corps seul, et de rattraper un mollet en retard.'
  },
  x113: {
    e: ['Pieds largement écartés, pointes ouvertes, barre entre les jambes.', 'Hanches plus basses qu’au conventionnel, buste plus vertical.', 'Pousse dans le sol en écartant les genoux, barre contre les jambes.'],
    f: ['Genoux qui rentrent.', 'Bassin qui monte avant les épaules.'],
    p: 'Même prudence qu’au soulevé classique : arrête la série dès que le dos s’arrondit.',
    v: 'Sollicite davantage les quadriceps, les adducteurs et les fessiers, et moins les lombaires.'
  },
  x114: {
    e: ['Appui sur les avant-bras et les pointes de pieds, corps en ligne.', 'Fessiers et abdominaux contractés, bassin légèrement rétroversé.', 'Respire normalement, sans bloquer.'],
    f: ['Bassin qui s’affaisse ou qui remonte.', 'Tenir longtemps en position dégradée plutôt que court et propre.'],
    v: 'Travail anti-extension : la durée compte moins que la qualité de l’alignement.'
  },
  x115: {
    e: ['Appui sur un avant-bras et le bord du pied, corps en ligne vu de face.', 'Monte la hanche jusqu’à l’alignement et tiens.', 'Épaule à l’aplomb du coude.'],
    f: ['Hanche qui descend.', 'Buste qui bascule vers l’avant.'],
    v: 'Travail anti-inclinaison : cible les obliques et le carré des lombes.'
  },
  x116: {
    e: ['Allongé, genoux fléchis, mains aux tempes sans tirer sur la nuque.', 'Enroule en amenant l’épaule vers la hanche opposée.', 'Descente lente, alterne les côtés.'],
    f: ['Tirer sur la nuque.', 'Mouvement rapide sans contraction.'],
    v: 'Cible les obliques. Évite de charger lourd si tu ne veux pas épaissir la taille.'
  }
};
