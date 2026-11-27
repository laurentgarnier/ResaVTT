// Barre de menu du bas et page Profil (option CONFIG.menuBas).
import { echapper, couleurAvatar } from '../logique/html.js';
import { entreesMenuBas, entreeActive } from '../logique/menu-bas.js';
import { renderChoixAffichage } from './affichage.js';
import { formPersonnes } from './formulaire.js';

export function renderMenuBas(cal, hash) {
  const { entrees, profil } = entreesMenuBas(cal);
  const actif = entreeActive(hash);
  const courant = (id) => (id === actif ? ' aria-current="page" class="on"' : '');
  return `<div class="menu-bas-contenu">
    ${entrees.map((e) => `<a href="${e.href}"${courant(e.id)}><span class="menu-icone" aria-hidden="true">${e.icone}${e.pastille ? `<span class="pastille-attente">${e.pastille}</span>` : ''}</span><span class="menu-libelle">${e.libelle}${e.pastille ? `<span class="visuellement-cache"> (${e.pastille} en attente)</span>` : ''}</span></a>`).join('')}
    <span class="sp"></span>
    <a href="${profil.href}" class="menu-profil${actif === 'profil' ? ' on' : ''}"${actif === 'profil' ? ' aria-current="page"' : ''} aria-label="Mon profil : ${echapper(profil.nom)}" title="Mon profil">
      <span class="menu-avatar" style="background:${couleurAvatar(profil.nom)}">${echapper(profil.initiales)}</span><span class="menu-libelle">Profil</span>
    </a>
  </div>`;
}

export function renderBlocAffichage(affichage) {
  return `<div class="bloc profil-affichage">
      <h3>Affichage</h3>
      ${renderChoixAffichage(affichage)}
    </div>`;
}

export function renderProfil(cal, affichage, version) {
  return `<section class="profil">
    <div class="profil-tete">
      <span class="menu-avatar grand" style="background:${couleurAvatar(cal.moi.nom)}">${echapper(entreesMenuBas(cal).profil.initiales)}</span>
      <div><h1>${echapper(cal.moi.nom)}</h1><div class="mut petit">${cal.est_admin ? 'Administrateur' : 'Adhérent'}</div></div>
    </div>
    ${renderBlocAffichage(affichage)}
    <div class="bloc personnes">
      <h3>Personnes de mon compte</h3>
      <p class="mut petit">Vous pouvez inscrire ces personnes en même temps que vous : famille, ami sans smartphone…</p>
      ${formPersonnes(cal.personnes)}
    </div>
    <p style="margin-top:22px"><a class="btn o" href="#/deconnexion">Se déconnecter de cet appareil</a></p>
    <p class="mut petit">${echapper(version)}</p>
  </section>`;
}
