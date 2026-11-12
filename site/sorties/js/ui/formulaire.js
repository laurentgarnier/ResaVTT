// Formulaire « Créer une sortie » (court, détails facultatifs) et page des personnes du compte.
import { echapper } from '../logique/html.js';
import { creneau as creneauDe, libelleJour } from '../logique/dates.js';
import { lirePoints, statsTrace } from '../logique/gpx.js';
import { lienSortie } from './calendrier.js';

const HEURES_DEFAUT = { matin: '09:00', apres_midi: '14:00' };
const TAILLE_MAX_GPX = 5 * 1024 * 1024;

export function valeursParDefaut(date, creneau, moi, parametres) {
  const prenom = String(moi.nom || '').trim().split(/\s+/)[0];
  return { date, heure: HEURES_DEFAUT[creneau], point_rdv: parametres.point_rdv_defaut || '', titre: `Sortie de ${prenom}` };
}

export function sortiesMemeCreneau(cal, date, creneau) {
  const jour = cal.jours.find((j) => j.date === date);
  return jour ? jour.sorties.filter((s) => s.statut !== 'annulee' && creneauDe(s.heure) === creneau) : [];
}

function champ(nom, libelle, valeur, attributs = '') {
  return `<div><label for="f-${nom}">${libelle}</label><input id="f-${nom}" name="${nom}" value="${echapper(valeur || '')}" ${attributs}></div>`;
}

export function renderEncartCreneau(sorties) {
  if (!sorties.length) return '';
  return `<p class="encart">Même créneau : rejoindre ${sorties.map((s) => `<a href="${lienSortie(s.id)}">${echapper(s.titre)}</a>`).join(' ou ')} plutôt que créer une 2e sortie ?</p>`;
}

export function renderFormulaire({ mode, valeurs, personnes, sortiesMemeCreneau: memes, creneau }) {
  const creation = mode === 'creer';
  return `<section class="formulaire">
    <a class="retour" href="#/jour/${echapper(valeurs.date)}">‹ Retour</a>
    <h1 style="font-size:20px;margin:0">${creation ? '+ Créer une sortie' : '✎ Modifier la sortie'}</h1>
    <p class="mut" style="margin:4px 0 0">${echapper(libelleJour(valeurs.date))}</p>
    <form id="form-sortie">
      ${creation ? `<label>Quand ?</label>
      <div class="segment">
        <label><input type="radio" name="creneau" value="matin"${creneau === 'matin' ? ' checked' : ''}>Matin</label>
        <label><input type="radio" name="creneau" value="apres_midi"${creneau === 'apres_midi' ? ' checked' : ''}>Après-midi</label>
      </div>` : champ('date', 'Jour', valeurs.date, 'type="date" required')}
      <div id="encart-creneau">${creation ? renderEncartCreneau(memes) : ''}</div>
      <div class="ligne2">
        ${champ('heure', 'Heure de RDV', valeurs.heure, 'type="time" required')}
        ${champ('point_rdv', 'Point de RDV', valeurs.point_rdv, 'required maxlength="120"')}
      </div>
      ${champ('titre', 'Titre', valeurs.titre, 'required maxlength="80"')}
      ${creation && personnes.length ? `<label>Qui s'inscrit ?</label>
      <div class="choix-personnes">${personnes.map((p, i) => `<label><input type="checkbox" name="personne" value="${echapper(p.id)}"${i === 0 ? ' checked' : ''}> ${echapper(p.nom_affiche)}</label>`).join('')}</div>` : ''}
      <details class="plus"${creation ? '' : ' open'}>
        <summary>Ajouter des détails (km, D+, secteur, description, traces GPX)</summary>
        ${champ('lieu', 'Lieu / secteur', valeurs.lieu, 'maxlength="120"')}
        <div class="ligne2">
          ${champ('km', 'Distance prévue (km)', valeurs.km, 'inputmode="decimal" maxlength="6"')}
          ${champ('dplus', 'Dénivelé prévu (m)', valeurs.dplus, 'inputmode="numeric" maxlength="6"')}
        </div>
        <div><label for="f-description">Description</label><textarea id="f-description" name="description" maxlength="1000">${echapper(valeurs.description || '')}</textarea></div>
        <label for="f-gpx">Traces GPX (une ou plusieurs)</label>
        <input id="f-gpx" name="gpx" type="file" accept=".gpx,application/gpx+xml" multiple>
        <div id="stats-gpx"></div>
        <p class="avertissement">⚠ Évitez les traces qui partent de votre domicile.</p>
      </details>
      <button class="btn p" type="submit" style="width:100%;margin-top:14px">${creation ? 'Publier' : 'Enregistrer'}</button>
    </form>
  </section>`;
}

export function renderPersonnes(personnes) {
  return `<section class="personnes">
    <a class="retour" href="#/">‹ Calendrier</a>
    <h1 style="font-size:20px;margin:0">👪 Personnes de mon compte</h1>
    <p class="mut petit">Vous pouvez inscrire ces personnes en même temps que vous : famille, ami sans smartphone…</p>
    <form id="form-personnes">
      <div id="liste-personnes">${personnes.map((p) => ligneP(p.id, p.nom_affiche)).join('')}</div>
      <button class="btn o" type="button" data-action="ajouter" style="margin-top:10px">+ Ajouter une personne</button>
      <button class="btn p" type="submit" style="width:100%;margin-top:14px">Enregistrer</button>
    </form>
    <p style="margin-top:28px"><a class="btn o" href="#/deconnexion">Se déconnecter de cet appareil</a></p>
  </section>`;
}

function ligneP(id, nom) {
  return `<div class="personne" data-id="${echapper(id || '')}"><input name="nom" value="${echapper(nom || '')}" maxlength="60" placeholder="Prénom"><button class="btn o" type="button" data-action="retirer" title="Retirer">✕</button></div>`;
}

async function lireFichiers(fichiers) {
  const res = [];
  for (const f of fichiers) {
    if (f.size > TAILLE_MAX_GPX) throw new Error(`${f.name} : fichier trop gros (5 Mo maximum).`);
    const contenu = await f.text();
    let stats;
    try { stats = statsTrace(lirePoints(contenu)); } catch (e) { throw new Error(`${f.name} : fichier GPX illisible.`); }
    res.push({ nom: f.name, contenu, ...stats });
  }
  return res;
}

export function brancherFormulaire(racine, actions, { mode, sortie, cal }) {
  const form = racine.querySelector('#form-sortie');
  let traces = [];
  let heureTouchee = mode !== 'creer';
  form.heure.addEventListener('input', () => { heureTouchee = true; });
  form.querySelectorAll('[name="creneau"]').forEach((r) => r.addEventListener('change', () => {
    if (!heureTouchee) form.heure.value = HEURES_DEFAUT[r.value];
    racine.querySelector('#encart-creneau').innerHTML = renderEncartCreneau(sortiesMemeCreneau(cal, sortie.date, r.value));
  }));
  form.gpx.addEventListener('change', async () => {
    const zone = racine.querySelector('#stats-gpx');
    try {
      traces = await lireFichiers([...form.gpx.files]);
      zone.innerHTML = traces.map((t) => `<p class="stats-gpx">🗺 ${echapper(t.nom)} : 📏 ${t.km} km · ⛰ ${t.dplus} m D+ (calculé automatiquement)</p>`).join('');
      if (traces[0] && !form.km.value) form.km.value = String(Math.round(traces[0].km));
      if (traces[0] && !form.dplus.value) form.dplus.value = String(traces[0].dplus);
    } catch (e) {
      traces = [];
      form.gpx.value = '';
      zone.innerHTML = `<p class="erreur">${echapper(e.message)}</p>`;
    }
  });
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const bouton = form.querySelector('[type="submit"]');
    bouton.disabled = true;
    const champs = Object.fromEntries(['heure', 'point_rdv', 'titre', 'lieu', 'km', 'dplus', 'description'].map((c) => [c, form[c].value.trim()]));
    try {
      let id = sortie.id;
      if (mode === 'creer') {
        const personneIds = [...form.querySelectorAll('[name="personne"]:checked')].map((c) => c.value);
        id = (await actions.appeler('sortie_creer', { ...champs, date: sortie.date, personne_ids: personneIds })).id;
      } else {
        await actions.appeler('sortie_modifier', { sortie_id: id, ...champs, date: form.date.value });
      }
      let messageFin = mode === 'creer' ? 'Sortie publiée.' : 'Sortie modifiée.';
      // La sortie existe désormais : un échec d'envoi de trace ne doit pas inviter à la recréer.
      for (const t of traces) {
        try {
          await actions.appeler('trace_ajouter', { sortie_id: id, nom_fichier: t.nom, contenu: t.contenu, km: String(t.km), dplus: String(t.dplus) });
        } catch (e) {
          messageFin = `Sortie enregistrée, mais la trace ${t.nom} n'a pas pu être ajoutée : ${e.message}`;
        }
      }
      actions.toast(messageFin);
      await actions.rafraichir();
      actions.aller(lienSortie(id));
    } catch (e) {
      actions.toast(e.message);
    } finally {
      bouton.disabled = false;
    }
  });
}

export function brancherPersonnes(racine, actions) {
  const liste = racine.querySelector('#liste-personnes');
  racine.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-action]');
    if (!b) return;
    if (b.dataset.action === 'ajouter') {
      liste.insertAdjacentHTML('beforeend', ligneP('', ''));
      liste.lastElementChild.querySelector('input').focus();
    }
    if (b.dataset.action === 'retirer') b.closest('.personne').remove();
  });
  racine.querySelector('#form-personnes').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const personnes = [...liste.querySelectorAll('.personne')]
      .map((l) => ({ id: l.dataset.id || undefined, nom_affiche: l.querySelector('input').value.trim() }))
      .filter((p) => p.nom_affiche);
    try {
      await actions.appeler('personnes_enregistrer', { personnes });
      actions.toast('Personnes enregistrées.');
      await actions.rafraichir();
    } catch (e) {
      actions.toast(e.message);
    }
  });
}
