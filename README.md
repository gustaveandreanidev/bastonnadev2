# Bastonnade

Jeu de combat 2D en 1v1 peer-to-peer, ambiance taverne médiévale. HTML/CSS/JS vanilla, canvas 2D, aucune étape de build, aucun fichier image ou son.

## Lancer

Servir le dossier avec un serveur local, puis ouvrir http://localhost:8080 :

```bash
python serve.py
```

(ou `npx http-server -c-1 -p 8080 .`). Le jeu en ligne a besoin d'Internet : PeerJS est chargé depuis un CDN et utilise son serveur public pour mettre les deux joueurs en relation.

## Contrôles

Z saut / double saut · Q D gauche droite (double tap : courir) · S accroupi / chute rapide (S + Z : descendre d'une table) · L attaque légère · M attaque lourde (maintenir pour charger) · K esquive · Échap pause. En entraînement : R réinitialise la taverne, H affiche les hitbox.

## Modes

- **En ligne** : créer ou rejoindre un salon avec un code, premier à 3 K.O.
- **Contre un bot** : même règles, contre une IA en trois niveaux (Facile, Normal, Difficile). Le bot joue avec les mêmes entrées clavier qu'un joueur.
- **Entraînement** : contre un mannequin, avec affichage des dégâts et des combos.

## Armes

Rapière, Hache, Lance, Dagues (deux lames, très rapides et courtes), Marteau (lent, projette vers le haut, onde de choc au sol) et Fléau (grands arcs qui frappent aussi derrière). Les attaques lourdes au sol de la hache, du marteau et du fléau ont une super armure : les coups reçus font des dégâts mais ne les interrompent pas.

## Équilibrage

Tout est dans [js/config.js](js/config.js) : physique, esquive, règles (vie, régénération, KO, dégressivité des combos), décors, et les 5 attaques de chaque arme (frames, dégâts, knockback, hitbox, hitstop, charge, super armure).

## Structure

| Dossier | Rôle |
|---|---|
| `js/sim/` | Simulation déterministe en entiers : combattants, combat, décors, état, PRNG seedé |
| `js/net/` | PeerJS (`peer.js`) et rollback netcode (`rollback.js`) |
| `js/render/` | Stickman, poses, armes, taverne, particules en pool, caméra, HUD |
| `js/game/` | Sessions locales (entraînement, bot), IA du bot, effets (événements → particules, sons, tremblements) |
| `js/audio/` | Sons synthétisés en Web Audio |
| `js/ui/` | Menus, salons, lobby, fin de match |

## Tests

```bash
node tests/rollback_test.js
```

Vérifie le déterminisme de la simulation et fait jouer deux sessions rollback reliées par un faux réseau (20 à 110 ms de latence, gigue) en comparant leurs checksums.

```bash
node tests/bot_test.js
```

Fait s'affronter des bots : vérifie que la difficulté compte et donne un aperçu (grossier) de l'équilibrage entre armes.
