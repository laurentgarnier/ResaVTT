// Écran de connexion par numéro de téléphone.
import { echapper } from '../logique/html.js';
import { NOM_APPLI_DEFAUT } from './nom-appli.js';

const BANDEAU_NAVIGATEUR = "Vous avez installé l'appli ? Ouvrez-la depuis votre écran d'accueil. Sinon, saisissez votre numéro ci-dessous.";

export function renderConnexion({ modeNavigateur = false, indiceDemo = '', erreur = '', nom = NOM_APPLI_DEFAUT } = {}) {
  return `
  <section class="connexion">
    ${modeNavigateur ? `<p class="bandeau-info">${echapper(BANDEAU_NAVIGATEUR)}</p>` : ''}
    <img class="logo-connexion" src="icones/icone-512.png" alt="" width="96" height="96">
    <h1>${echapper(nom)}</h1>
    <p class="mut">Connectez-vous avec le numéro de téléphone que vous avez donné au club.</p>
    <form id="form-connexion" class="carte-form">
      <label for="tel">Votre numéro de téléphone</label>
      <input id="tel" name="tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="06 12 34 56 78" required>
      ${erreur ? `<p class="erreur" role="alert">${echapper(erreur)}</p>` : ''}
      <button class="btn p" type="submit">Se connecter</button>
    </form>
    ${indiceDemo ? `<p class="indice">${echapper(indiceDemo)}</p>` : ''}
    <p class="mut petit">Votre numéro sert uniquement à vous reconnaître. Il n'est jamais affiché aux autres adhérents.</p>
  </section>`;
}

export function brancherConnexion(racine, actions) {
  const form = racine.querySelector('#form-connexion');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const bouton = form.querySelector('button');
    bouton.disabled = true;
    try {
      const r = await actions.appeler('connexion', { telephone: form.tel.value, appareil: navigator.userAgent.slice(0, 80) });
      actions.connecte(r.jeton);
    } catch (e) {
      actions.afficherConnexion(e.message);
    } finally {
      bouton.disabled = false;
    }
  });
}
